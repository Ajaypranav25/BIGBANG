/** East African Plio-Pleistocene grassland flora: flat-topped acacias, grass, shrubs, boulders. */
import { type BufferGeometry, Color, IcosahedronGeometry, Vector3 } from 'three'
import { grassBlade, lumpy, mergeParts, paint, PART, tagPart } from '../shared/geometry'
import { createNoise2D } from '../shared/noise2d'
import { limb } from './common'

const TRUNK = new Color('#3f342a')
const CANOPY = new Color('#59662c')
const CANOPY_LIGHT = new Color('#7c8a3c')

/** Umbrella-thorn acacia (Vachellia tortilis–like): leaning trunk, spreading limbs, flat canopy. */
export function acacia(rng: () => number, seed: number): BufferGeometry {
  const n = createNoise2D(seed)
  const parts: BufferGeometry[] = []
  const lean = new Vector3((rng() - 0.5) * 0.4, 1, (rng() - 0.5) * 0.4).normalize()
  const trunkLen = 2.6 + rng() * 1.2
  parts.push(tagPart(paint(limb(new Vector3(0, 0, 0), lean, trunkLen, 0.26, 0.18, 8), TRUNK), PART.plain))
  const fork = lean.clone().multiplyScalar(trunkLen)
  const limbs = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng()
    const dir = new Vector3(Math.cos(a) * 0.85, 1, Math.sin(a) * 0.85).normalize()
    const len = 2.4 + rng() * 1.4
    parts.push(tagPart(paint(limb(fork, dir, len, 0.16, 0.07, 6), TRUNK), PART.plain))
    const tip = fork.clone().addScaledVector(dir, len)
    const pad = lumpy(new IcosahedronGeometry(1, 2), 0.25, (x, y, z) => n(x * 3 + i, z * 3 + y))
    pad.scale(2.2 + rng() * 1.2, 0.5 + rng() * 0.2, 2.2 + rng() * 1.2).translate(tip.x, tip.y + 0.25, tip.z)
    parts.push(tagPart(paint(pad, (_p, nn) => CANOPY.clone().lerp(CANOPY_LIGHT, Math.max(0, nn.y) * 0.8)), PART.foliage))
  }
  return mergeParts(parts)
}

export function savannaGrass(): BufferGeometry {
  const base = new Color('#5e4a22')
  const tip = new Color('#d8b766')
  const g = grassBlade(0.85, 0.055)
  return paint(g, (p) => base.clone().lerp(tip, Math.min(1, p.y / 0.85)))
}

export function boulder(seed: number): BufferGeometry {
  const n = createNoise2D(seed)
  const g = lumpy(new IcosahedronGeometry(1, 3), 0.3, (x, y, z) => n(x * 1.8 + z * 0.5, y * 1.8) * 0.7 + n(x * 5, z * 5) * 0.2)
  g.scale(1, 0.6, 0.9)
  return paint(g, (_p, nn) => new Color('#5d5852').lerp(new Color('#8a8379'), Math.max(0, nn.y)))
}
