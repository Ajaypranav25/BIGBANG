/**
 * Bakes plate-tectonic reconstructions into a texture atlas.
 *
 * Source: GPlates Web Service (https://gws.gplates.org), model MERDITH2021
 *   Merdith et al. (2021) "Extending full-plate tectonic models into deep time:
 *   Linking the Neoproterozoic and the Phanerozoic", Earth-Science Reviews 214.
 *
 * Output:
 *   public/textures/paleo-atlas.jpg  — 8×8 grid of 512×256 equirectangular land masks
 *   src/data/paleoFrames.json        — the reconstruction age (Ma) of each atlas cell
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..')
const CACHE = path.join(ROOT, '.cache', 'paleo')
const MODEL = 'MERDITH2021'
const FRAME_W = 512
const FRAME_H = 256
const COLS = 8
const ROWS = 8
const BLUR_SIGMA = 1.6
const REQUEST_TIMEOUT_MS = 60_000

/** Dense sampling through the dinosaur era, coarser in deep time. ≤ 64 frames. */
const FRAMES = [
  ...Array.from({ length: 31 }, (_, i) => i * 10), // 0 … 300 Ma
  ...Array.from({ length: 28 }, (_, i) => 325 + i * 25), // 325 … 1000 Ma
]

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function fetchCoastlines(ma) {
  const file = path.join(CACHE, `${MODEL}-${ma}.json`)
  if (await exists(file)) return JSON.parse(await readFile(file, 'utf8'))
  const url = `https://gws.gplates.org/reconstruct/coastlines_low/?time=${ma}&model=${MODEL}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!Array.isArray(json.features)) throw new Error('unexpected payload: no features array')
      await writeFile(file, JSON.stringify(json))
      return json
    } catch (err) {
      console.warn(`  ${ma} Ma attempt ${attempt} failed: ${err.message}`)
      if (attempt === 3) throw new Error(`Could not fetch ${ma} Ma reconstruction: ${err.message}`)
    }
  }
}

/** Unwrap a lon/lat ring so it is continuous across the antimeridian. */
function unwrapRing(ring) {
  const out = []
  let offset = 0
  let prev = null
  for (const [lon, lat] of ring) {
    if (prev !== null) {
      const d = lon - prev
      if (d > 180) offset -= 360
      else if (d < -180) offset += 360
    }
    out.push([lon + offset, lat])
    prev = lon
  }
  // A ring that winds around a pole does not close after unwrapping: close it through the pole.
  const drift = out[out.length - 1][0] - out[0][0]
  if (Math.abs(drift) > 180) {
    const meanLat = out.reduce((s, p) => s + p[1], 0) / out.length
    const pole = meanLat < 0 ? -90 : 90
    const last = out[out.length - 1][0]
    out.push([last, pole], [out[0][0], pole])
  }
  return out
}

function ringToPath(ring, shiftX) {
  return (
    ring
      .map(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * FRAME_W + shiftX
        const y = ((90 - lat) / 180) * FRAME_H
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join('') + 'Z'
  )
}

function featureRings(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

function toSvg(collection) {
  const paths = []
  for (const feature of collection.features) {
    for (const ring of featureRings(feature.geometry)) {
      if (ring.length < 3) continue
      const unwrapped = unwrapRing(ring)
      for (const shift of [-FRAME_W, 0, FRAME_W]) paths.push(ringToPath(unwrapped, shift))
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}">
<rect width="100%" height="100%" fill="#000"/>
<path fill="#fff" fill-rule="nonzero" d="${paths.join('')}"/>
</svg>`
}

async function main() {
  await mkdir(CACHE, { recursive: true })
  await mkdir(path.join(ROOT, 'public', 'textures'), { recursive: true })
  if (FRAMES.length > COLS * ROWS) throw new Error('too many frames for atlas')

  const tiles = []
  for (const [i, ma] of FRAMES.entries()) {
    process.stdout.write(`frame ${i + 1}/${FRAMES.length}: ${ma} Ma\n`)
    const collection = await fetchCoastlines(ma)
    const png = await sharp(Buffer.from(toSvg(collection)))
      .resize(FRAME_W, FRAME_H)
      .blur(BLUR_SIGMA)
      .greyscale()
      .png()
      .toBuffer()
    tiles.push({ input: png, left: (i % COLS) * FRAME_W, top: Math.floor(i / COLS) * FRAME_H })
  }

  await sharp({
    create: { width: FRAME_W * COLS, height: FRAME_H * ROWS, channels: 3, background: '#000' },
  })
    .composite(tiles)
    .greyscale()
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(ROOT, 'public', 'textures', 'paleo-atlas.jpg'))

  const meta = { model: MODEL, cols: COLS, rows: ROWS, frameMa: FRAMES }
  await writeFile(path.join(ROOT, 'src', 'data', 'paleoFrames.json'), JSON.stringify(meta, null, 2))
  console.log('wrote public/textures/paleo-atlas.jpg and src/data/paleoFrames.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
