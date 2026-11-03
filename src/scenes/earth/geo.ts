import { Vector3 } from 'three'
import frames from '../../data/paleoFrames.json'

/**
 * Lat/lon → unit vector matching three.js SphereGeometry UVs
 * (u = (lon + 180) / 360, v = (lat + 90) / 180, north up).
 */
export function latLonToVec3(lat: number, lon: number, radius = 1, out = new Vector3()): Vector3 {
  const phi = ((lon + 180) / 360) * Math.PI * 2
  const th = (lat * Math.PI) / 180
  return out.set(-Math.cos(phi) * Math.cos(th) * radius, Math.sin(th) * radius, Math.sin(phi) * Math.cos(th) * radius)
}

/** Spherical interpolation between two lat/lon points (great-circle path). */
export function greatCircle(a: [number, number], b: [number, number], steps: number, radius = 1): Vector3[] {
  const va = latLonToVec3(a[0], a[1])
  const vb = latLonToVec3(b[0], b[1])
  const omega = Math.acos(Math.min(1, Math.max(-1, va.dot(vb))))
  const out: Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (omega < 1e-6) {
      out.push(va.clone().multiplyScalar(radius))
      continue
    }
    const s0 = Math.sin((1 - t) * omega) / Math.sin(omega)
    const s1 = Math.sin(t * omega) / Math.sin(omega)
    // lift the arc slightly off the surface in the middle
    const lift = 1 + 0.035 * Math.sin(Math.PI * t) * Math.min(1, omega)
    out.push(va.clone().multiplyScalar(s0).add(vb.clone().multiplyScalar(s1)).normalize().multiplyScalar(radius * lift))
  }
  return out
}

export const PALEO_MODEL = frames.model
export const PALEO_COLS = frames.cols
export const PALEO_ROWS = frames.rows
export const PALEO_FRAME_MA: readonly number[] = frames.frameMa

/** Which two atlas frames bracket `ma`, and how far between them. */
export function paleoFrames(ma: number): { a: number; b: number; mix: number } {
  const f = PALEO_FRAME_MA
  if (ma <= f[0]) return { a: 0, b: 0, mix: 0 }
  const last = f.length - 1
  if (ma >= f[last]) return { a: last, b: last, mix: 0 }
  let i = 0
  while (i < last && f[i + 1] < ma) i++
  return { a: i, b: i + 1, mix: (ma - f[i]) / (f[i + 1] - f[i]) }
}

/**
 * Paleo-positions reconstructed with the GPlates Web Service (MERDITH2021 model).
 * [lat, lon] in the model's reference frame at the given age.
 */
export const PALEO_SITES = {
  chicxulub66: [25.05, -62.12] as [number, number],
  deccan66: [-26.54, 61.31] as [number, number],
  siberianTraps252: [61.86, 35.49] as [number, number],
}
