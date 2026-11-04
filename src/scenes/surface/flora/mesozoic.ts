/**
 * Mesozoic flora: araucarian conifers (monkey-puzzle relatives, abundant through the Jurassic),
 * cycads, generic podocarp-like conifers, ferns, and — from ~125 Ma — small flowering shrubs.
 */
import { type BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Vector3 } from 'three'
import { aim, ellipsoid, lumpy, mergeParts, paint, PART, rosette, scaleUv, tagPart } from '../shared/geometry'
import { createNoise2D } from '../shared/noise2d'
import { limb } from './common'

const BARK = new Color('#5a4634')
const NEEDLE = new Color('#22402a')
const NEEDLE_LIGHT = new Color('#3d6236')

export function araucaria(rng: () => number): BufferGeometry {
  const h = 26
  const trunk = new CylinderGeometry(0.3, 0.6, h, 10, 8).translate(0, h / 2, 0)
  scaleUv(trunk, 1, h / 2.8)
  const parts: BufferGeometry[] = [tagPart(paint(trunk, BARK), PART.plain)]
  const tiers = 7
  for (let k = 0; k < tiers; k++) {
    const y = 16.5 + k * 1.45
    const len = 4.6 - k * 0.32
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + k * 0.7 + rng() * 0.3
      const dir = new Vector3(Math.cos(a), 0.22 - k * 0.02, Math.sin(a)).normalize()
      const from = new Vector3(0, y, 0)
      parts.push(tagPart(paint(limb(from, dir, len, 0.13, 0.05, 6), BARK), PART.plain))
      const foliage = new CapsuleGeometry(0.42, len * 0.75, 3, 8).translate(0, len * 0.5, 0)
      parts.push(tagPart(paint(aim(foliage, dir, from.clone().addScaledVector(dir, len * 0.2)), NEEDLE.clone().lerp(NEEDLE_LIGHT, rng() * 0.6)), PART.foliage))
      const tip = from.clone().addScaledVector(dir, len)
      parts.push(tagPart(paint(ellipsoid(0.45, 0.6, 0.45, 8, 6).translate(tip.x, tip.y + 0.35, tip.z), NEEDLE_LIGHT), PART.foliage))
    }
  }
  parts.push(tagPart(paint(ellipsoid(1.4, 0.9, 1.4, 10, 8).translate(0, h + 0.2, 0), NEEDLE), PART.foliage))
  return mergeParts(parts)
}

export function cycad(rng: () => number): BufferGeometry {
  const h = 1.3
  const trunk = new CylinderGeometry(0.28, 0.36, h, 10, 4).translate(0, h / 2, 0)
  scaleUv(trunk, 1, h / 2)
  const parts: BufferGeometry[] = [tagPart(paint(trunk, new Color('#6b5a3c')), PART.lycopsid)]
  for (const f of rosette(16, 1.7, 0.26, 0.45, 0.6, rng)) {
    f.translate(0, h, 0)
    parts.push(tagPart(paint(f, new Color('#46692b').lerp(new Color('#5e7f33'), rng())), PART.foliage))
  }
  parts.push(tagPart(paint(ellipsoid(0.17, 0.33, 0.17, 10, 8).translate(0, h + 0.18, 0), new Color('#a8813f')), PART.plain))
  return mergeParts(parts)
}

export function conifer(rng: () => number): BufferGeometry {
  const h = 17
  const parts: BufferGeometry[] = [tagPart(paint(new CylinderGeometry(0.22, 0.45, h, 8, 4).translate(0, h / 2, 0), BARK), PART.plain)]
  for (let k = 0; k < 7; k++) {
    const r = 3.3 - k * 0.38
    const y = 4 + k * 1.75
    parts.push(tagPart(paint(new ConeGeometry(r, 3.8, 11).translate(0, y + 1.9, 0), NEEDLE.clone().lerp(NEEDLE_LIGHT, rng() * 0.4 + k * 0.05)), PART.foliage))
  }
  return mergeParts(parts)
}

/** Flowering shrub body (angiosperms appear ~125 Ma, e.g. Archaefructus); blossoms are instanced separately. */
export function shrub(seed: number): BufferGeometry {
  const n = createNoise2D(seed)
  const g = lumpy(new IcosahedronGeometry(1, 3), 0.28, (x, y, z) => n(x * 2.5 + z, y * 2.5))
  g.scale(1, 0.75, 1).translate(0, 0.6, 0)
  return tagPart(paint(g, (_p, nn) => new Color('#36552a').lerp(new Color('#5b7d38'), Math.max(0, nn.y))), PART.foliage)
}

/** A five-petalled blossom ~10 cm across (white vertex colour, tinted per instance). */
export function blossom(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    parts.push(paint(ellipsoid(0.045, 0.01, 0.026, 8, 4).translate(0.04, 0, 0).rotateY(a), new Color('#ffffff')))
  }
  parts.push(paint(ellipsoid(0.018, 0.018, 0.018, 6, 4).translate(0, 0.01, 0), new Color('#ffd84a')))
  return mergeParts(parts)
}
