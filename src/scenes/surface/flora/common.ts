import { type BufferGeometry, Color, CylinderGeometry, Vector3 } from 'three'
import { aim, mergeParts, paint, PART, rosette, tagPart } from '../shared/geometry'

/** A tapered cylinder from `from` along `dir`. */
export function limb(from: Vector3, dir: Vector3, length: number, r0: number, r1: number, radial = 8): BufferGeometry {
  const g = new CylinderGeometry(r1, r0, length, radial, 1).translate(0, length / 2, 0)
  return aim(g, dir, from)
}

/**
 * Recursive forking (dichotomous branching, as in lycopsids). `tip` receives each terminal
 * position and direction so callers can add foliage there.
 */
export function dichotomous(
  out: BufferGeometry[],
  from: Vector3,
  dir: Vector3,
  length: number,
  radius: number,
  depth: number,
  spread: number,
  color: Color,
  tip: (at: Vector3, dir: Vector3) => void,
  rng: () => number,
): void {
  const end = from.clone().addScaledVector(dir, length)
  out.push(tagPart(paint(limb(from, dir, length, radius, radius * 0.72, 7), color), PART.plain))
  if (depth === 0) {
    tip(end, dir)
    return
  }
  // fork in a plane rotated randomly around the parent axis
  const side = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), rng() * Math.PI * 2)
  side.addScaledVector(dir, -side.dot(dir)).normalize()
  for (const s of [-1, 1]) {
    const child = dir.clone().applyAxisAngle(side.clone().cross(dir).normalize(), s * spread).normalize()
    child.y = Math.max(child.y, 0.15)
    dichotomous(out, end, child.normalize(), length * 0.78, radius * 0.72, depth - 1, spread * 0.95, color, tip, rng)
  }
}

/** Low fern: a rosette of drooping fronds (foliage part). */
export function groundFern(rng: () => number, size = 0.9, color = '#3f6128'): BufferGeometry {
  const c = new Color(color)
  const dark = c.clone().multiplyScalar(0.55)
  const fronds = rosette(7, size, size * 0.18, 0.6, 0.55, rng).map((g) =>
    tagPart(
      paint(g, (p) => dark.clone().lerp(c, Math.min(1, Math.sqrt(p.x * p.x + p.z * p.z) / size))),
      PART.foliage,
    ),
  )
  return mergeParts(fronds)
}

export const green = (h: string) => new Color(h)
