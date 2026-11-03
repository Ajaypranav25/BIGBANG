/**
 * Downloads and optimises planetary textures.
 *
 * Source: Solar System Scope (https://www.solarsystemscope.com/textures/), CC BY 4.0.
 * Their Earth maps are derived from NASA imagery (Blue Marble / Black Marble).
 */
import { mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..')
const CACHE = path.join(ROOT, '.cache', 'textures')
const OUT = path.join(ROOT, 'public', 'textures')
const BASE = 'https://www.solarsystemscope.com/textures/download/'
const REQUEST_TIMEOUT_MS = 180_000

/** [remote file, output name, output width, format] */
const TEXTURES = [
  ['8k_earth_daymap.jpg', 'earth-day.jpg', 4096, 'jpg'],
  ['8k_earth_nightmap.jpg', 'earth-night.jpg', 4096, 'jpg'],
  ['8k_earth_clouds.jpg', 'earth-clouds.jpg', 2048, 'jpg'],
  ['2k_moon.jpg', 'moon.jpg', 2048, 'jpg'],
  ['2k_sun.jpg', 'sun.jpg', 1024, 'jpg'],
  ['8k_stars_milky_way.jpg', 'milky-way.jpg', 4096, 'jpg'],
  ['2k_mercury.jpg', 'mercury.jpg', 1024, 'jpg'],
  ['2k_venus_atmosphere.jpg', 'venus.jpg', 1024, 'jpg'],
  ['2k_mars.jpg', 'mars.jpg', 1024, 'jpg'],
  ['2k_jupiter.jpg', 'jupiter.jpg', 2048, 'jpg'],
  ['2k_saturn.jpg', 'saturn.jpg', 1024, 'jpg'],
  ['8k_saturn_ring_alpha.png', 'saturn-ring.png', 1024, 'png'],
  ['2k_uranus.jpg', 'uranus.jpg', 1024, 'jpg'],
  ['2k_neptune.jpg', 'neptune.jpg', 1024, 'jpg'],
]

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function download(name) {
  const file = path.join(CACHE, name)
  if (await exists(file)) return file
  const res = await fetch(BASE + name, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await sharp(buf).toFile(file) // validates that it is an image
  return file
}

async function main() {
  await mkdir(CACHE, { recursive: true })
  await mkdir(OUT, { recursive: true })
  for (const [remote, local, width, format] of TEXTURES) {
    process.stdout.write(`${remote} → ${local}\n`)
    const src = await download(remote)
    const img = sharp(src).resize({ width, withoutEnlargement: true })
    const piped = format === 'png' ? img.png({ compressionLevel: 9 }) : img.jpeg({ quality: 84, mozjpeg: true })
    await piped.toFile(path.join(OUT, local))
  }
  console.log('textures ready in public/textures')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
