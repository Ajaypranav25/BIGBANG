/**
 * Late Devonian – Carboniferous flora (all sizes in metres):
 *  - Lepidodendron: arborescent lycopsid, up to ~40 m, diamond leaf cushions, forked crown.
 *  - Sigillaria: ~20–30 m, ribbed trunk, brush-like leaf tufts.
 *  - Calamites: giant horsetail, ~10–20 m, jointed stems with whorled branches.
 *  - Psaronius: marattialean tree fern, ~8–10 m.
 *  - Archaeopteris: the first true tree (Late Devonian, ~385–359 Ma), fern-like leafy branches.
 *  - Rhyniophyte/psilophyte clumps: leafless Devonian pioneer plants.
 */
import { type BufferGeometry, Color, ConeGeometry, CylinderGeometry, Vector3 } from 'three'
import { aim, ellipsoid, frond, mergeParts, paint, PART, rosette, scaleUv, tagPart } from '../shared/geometry'
import { dichotomous, limb } from './common'

const BARK = new Color('#7a6d55')
const BARK_DARK = new Color('#4d4535')
const LEAF = new Color('#3b6a2a')
const LEAF_LIGHT = new Color('#6c9a3c')

function trunk(rTop: number, rBottom: number, height: number, part: number, flare = 0.6): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, height, 14, 16).translate(0, height / 2, 0)
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const k = 1 + Math.max(0, 1.5 - y) * flare
    p.setX(i, p.getX(i) * k)
    p.setZ(i, p.getZ(i) * k)
  }
  g.computeVertexNormals()
  scaleUv(g, 1, height / (Math.PI * (rTop + rBottom)))
  return tagPart(paint(g, (q) => BARK_DARK.clone().lerp(BARK, Math.min(1, q.y / 3))), part)
}

function tuft(at: Vector3, dir: Vector3, length: number, blades: number, rng: () => number): BufferGeometry[] {
  const out: BufferGeometry[] = []
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + rng()
    const d = dir.clone().multiplyScalar(0.7).add(new Vector3(Math.cos(a), 0.2, Math.sin(a)).multiplyScalar(0.75)).normalize()
    const g = new ConeGeometry(0.045, length * (0.7 + rng() * 0.5), 4).translate(0, (length * 0.85) / 2, 0)
    out.push(tagPart(paint(aim(g, d, at), LEAF.clone().lerp(LEAF_LIGHT, rng())), PART.foliage))
  }
  return out
}

export function lepidodendron(rng: () => number): BufferGeometry {
  const h = 24
  const parts: BufferGeometry[] = [trunk(0.42, 0.72, h, PART.lycopsid)]
  dichotomous(parts, new Vector3(0, h - 0.2, 0), new Vector3(0, 1, 0), 3.2, 0.36, 3, 0.55, BARK, (at, dir) => {
    parts.push(...tuft(at, dir, 1.5, 10, rng))
    parts.push(tagPart(paint(ellipsoid(0.1, 0.32, 0.1, 6, 4).translate(at.x, at.y - 0.35, at.z), new Color('#6b5233')), PART.plain))
  }, rng)
  return mergeParts(parts)
}

export function sigillaria(rng: () => number): BufferGeometry {
  const h = 17
  const parts: BufferGeometry[] = [trunk(0.48, 0.68, h, PART.ribbed, 0.4)]
  for (const s of [-1, 1]) {
    const dir = new Vector3(s * 0.45, 1, (rng() - 0.5) * 0.3).normalize()
    const from = new Vector3(0, h - 0.1, 0)
    parts.push(tagPart(paint(limb(from, dir, 2.4, 0.4, 0.3), BARK), PART.ribbed))
    parts.push(...tuft(from.clone().addScaledVector(dir, 2.4), dir, 2.6, 22, rng))
  }
  return mergeParts(parts)
}

export function calamites(rng: () => number): BufferGeometry {
  const h = 11
  const stem = new CylinderGeometry(0.15, 0.26, h, 10, 12).translate(0, h / 2, 0)
  scaleUv(stem, 1, h / (Math.PI * 0.4))
  const parts: BufferGeometry[] = [tagPart(paint(stem, new Color('#6a6a3e')), PART.ribbed)]
  for (let y = 3.5; y < h; y += 0.95) {
    const len = 1.3 * (1 - (y - 3.5) / (h - 2)) + 0.35
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + y
      const dir = new Vector3(Math.cos(a), 0.65, Math.sin(a)).normalize()
      const g = new ConeGeometry(0.022, len, 4).translate(0, len / 2, 0)
      parts.push(tagPart(paint(aim(g, dir, [0, y, 0]), LEAF_LIGHT.clone().lerp(LEAF, rng())), PART.foliage))
    }
  }
  return mergeParts(parts)
}

export function treeFern(rng: () => number): BufferGeometry {
  const h = 6.5
  const parts: BufferGeometry[] = [tagPart(paint(new CylinderGeometry(0.22, 0.5, h, 10, 6).translate(0, h / 2, 0), new Color('#3e3326')), PART.plain)]
  for (const f of rosette(12, 3.2, 0.42, 0.55, 0.45, rng)) {
    f.translate(0, h, 0)
    parts.push(tagPart(paint(f, (p) => LEAF.clone().lerp(LEAF_LIGHT, Math.min(1, (p.y - h + 1.5) / 2))), PART.foliage))
  }
  return mergeParts(parts)
}

export function archaeopteris(rng: () => number): BufferGeometry {
  const h = 14
  const parts: BufferGeometry[] = [trunk(0.22, 0.45, h, PART.plain, 0.3)]
  for (let y = 4.5; y < h; y += 1.3) {
    const len = 3.6 * (1 - (y - 4.5) / (h - 3)) + 0.9
    for (let i = 0; i < 4; i++) {
      const f = frond(len, len * 0.16, 0.08, 10, 14)
      f.rotateX(-0.1).rotateY((i / 4) * Math.PI * 2 + y * 1.7).translate(0, y, 0)
      parts.push(tagPart(paint(f, LEAF.clone().lerp(LEAF_LIGHT, rng() * 0.6)), PART.foliage))
    }
  }
  return mergeParts(parts)
}

/** Leafless forking stems with sporangia — the Devonian pioneers of land. */
export function psilophyteClump(rng: () => number): BufferGeometry {
  const parts: BufferGeometry[] = []
  const stem = new Color('#6f7a35')
  for (let i = 0; i < 9; i++) {
    const base = new Vector3((rng() - 0.5) * 0.25, 0, (rng() - 0.5) * 0.25)
    const dir = new Vector3((rng() - 0.5) * 0.4, 1, (rng() - 0.5) * 0.4).normalize()
    const len = 0.18 + rng() * 0.2
    parts.push(tagPart(paint(limb(base, dir, len, 0.01, 0.008, 4), stem), PART.foliage))
    const top = base.clone().addScaledVector(dir, len)
    for (const s of [-1, 1]) {
      const d2 = dir.clone().add(new Vector3(s * 0.5, 0, 0)).normalize()
      parts.push(tagPart(paint(limb(top, d2, len * 0.6, 0.008, 0.006, 4), stem), PART.foliage))
      const tip = top.clone().addScaledVector(d2, len * 0.6)
      parts.push(tagPart(paint(ellipsoid(0.014, 0.022, 0.014, 6, 4).translate(tip.x, tip.y, tip.z), new Color('#a88b3a')), PART.foliage))
    }
  }
  return mergeParts(parts)
}
