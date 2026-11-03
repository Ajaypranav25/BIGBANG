/**
 * Touch gesture arbitration. A one-finger drag on the stage either rotates the camera
 * (mostly horizontal start) or travels through time (mostly vertical start); two fingers pinch-zoom.
 * The camera rig decides the mode on the first few pixels of movement; the time input obeys it.
 */
export type GestureMode = 'none' | 'rotate' | 'time' | 'pinch'

export const gesture = { mode: 'none' as GestureMode }

/** pixels of movement before a touch drag commits to an axis */
export const AXIS_LOCK_PX = 8

export function decideAxis(dx: number, dy: number): GestureMode {
  if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return 'none'
  return Math.abs(dx) >= Math.abs(dy) ? 'rotate' : 'time'
}
