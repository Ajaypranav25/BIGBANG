import { Quaternion, Vector3 } from 'three'
import type { RigPivot } from './rig'

export interface ViewInput {
  position: Vector3
  target: Vector3
  pivot: RigPivot
  yaw: number
  pitch: number
  zoom: number
  minDistance: number
  minElevation: number
  maxElevation: number
}

export interface ViewOutput {
  position: Vector3
  target: Vector3
  /** pitch actually applied after clamping (lets the caller stop accumulating past a limit) */
  appliedPitch: number
}

const Y = new Vector3(0, 1, 0)
const ORIGIN = new Vector3()
const arm = new Vector3()
const axis = new Vector3()
const qYaw = new Quaternion()
const qPitch = new Quaternion()
const q = new Quaternion()

const elevationOf = (v: Vector3): number => Math.asin(Math.max(-1, Math.min(1, v.y / (v.length() || 1))))

/**
 * Rotate a cinematic shot by the viewer's yaw (unlimited — full 360°) and pitch (clamped),
 * as one rigid rotation about the pivot, so the composition of the shot is preserved.
 *  - 'target' / 'origin': the camera orbits the pivot; zoom scales the distance to it.
 *  - 'eye': the camera stays put and the view direction turns; zoom is handled as FOV by the caller.
 */
export function applyUserView(input: ViewInput, out: ViewOutput): ViewOutput {
  const eye = input.pivot === 'eye'
  const pivot = eye ? input.position : input.pivot === 'origin' ? ORIGIN : input.target
  arm.copy(eye ? input.target : input.position).sub(pivot)
  if (arm.lengthSq() < 1e-12) arm.set(0, 0, 1)

  const elev0 = elevationOf(arm)
  // the limits constrain the viewer's own tilt only: a cinematic shot that already looks past a
  // limit (e.g. a steep descent from the sky) is left exactly as the scene framed it
  const lo = Math.min(input.minElevation, elev0)
  const hi = Math.max(input.maxElevation, elev0)
  const elev = Math.max(lo, Math.min(hi, elev0 + input.pitch))
  const appliedPitch = elev - elev0

  qYaw.setFromAxisAngle(Y, input.yaw)
  arm.applyQuaternion(qYaw)
  axis.crossVectors(arm, Y)
  if (axis.lengthSq() < 1e-12) axis.set(1, 0, 0)
  qPitch.setFromAxisAngle(axis.normalize(), appliedPitch)
  q.multiplyQuaternions(qPitch, qYaw)

  if (eye) {
    out.position.copy(input.position)
    out.target.copy(input.target).sub(pivot).applyQuaternion(q).add(pivot)
  } else {
    const p = out.position.copy(input.position).sub(pivot).applyQuaternion(q)
    const dist = Math.max(input.minDistance, p.length() * input.zoom)
    p.setLength(dist).add(pivot)
    out.target.copy(input.target).sub(pivot).applyQuaternion(q).add(pivot)
  }
  out.appliedPitch = appliedPitch
  return out
}
