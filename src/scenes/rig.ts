import { Vector3 } from 'three'
import { CHAPTERS, type Chapter } from '../data/chapters'
import { clock } from '../time/clock'

/**
 * Shared camera intent. Each scene writes where the camera *should* be every frame;
 * <CameraRig/> eases toward it and layers user orbit, parallax and shake on top.
 */
export const rig = {
  position: new Vector3(0, 0, 10),
  target: new Vector3(0, 0, 0),
  fov: 50,
  /** 0…1 transient camera shake */
  shake: 0,
  /** set true by a scene on its first frame to cut instead of ease */
  cut: true,
  /** extra post-processing drive (0…1) for flashes, written by scenes */
  flash: 0,
  bloom: 1,
  /** legacy: scenes may still write it; user rotation is no longer limited */
  orbitLimit: 0.6,
  /**
   * What the user's 360° drag rotates around (scenes set this every frame; it resets to
   * 'target' after each frame so a scene that does not care gets the default):
   *  - 'target' — orbit the look-at point
   *  - 'origin' — orbit the world origin (the planet), keeping the shot's composition
   *  - 'eye'    — stand still and look around (landscapes)
   */
  pivot: 'target' as RigPivot,
  /** closest the camera may get to the pivot when zooming (orbit modes) */
  minDistance: 0.05,
  /** elevation limits for the rotated arm, radians */
  minElevation: -1.45,
  maxElevation: 1.45,
}

export type RigPivot = 'target' | 'origin' | 'eye'

export const RIG_DEFAULTS = {
  pivot: 'target' as RigPivot,
  minDistance: 0.05,
  minElevation: -1.45,
  maxElevation: 1.45,
} as const

/**
 * The viewer's own camera offset, layered on top of the cinematic path. Rotation is unlimited
 * in yaw (full 360°); pitch is clamped by the scene's elevation limits.
 */
export const userView = {
  yaw: 0,
  pitch: 0,
  zoom: 1,
  /** angular velocity for inertia after a drag, rad/s */
  yawVelocity: 0,
  pitchVelocity: 0,
}

export const ZOOM_RANGE = [0.35, 3] as const

export function resetView(): void {
  userView.yaw = 0
  userView.pitch = 0
  userView.zoom = 1
  userView.yawVelocity = 0
  userView.pitchVelocity = 0
}

export function zoomBy(factor: number): void {
  userView.zoom = Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], userView.zoom * factor))
}

export function isViewModified(): boolean {
  return Math.abs(userView.yaw) > 0.02 || Math.abs(userView.pitch) > 0.02 || Math.abs(userView.zoom - 1) > 0.02
}

/** Spherical helper: write the rig position as orbit around the target. */
export function orbit(distance: number, yaw: number, pitch: number, target?: Vector3): void {
  const t = target ?? rig.target
  rig.position.set(
    t.x + distance * Math.cos(pitch) * Math.sin(yaw),
    t.y + distance * Math.sin(pitch),
    t.z + distance * Math.cos(pitch) * Math.cos(yaw),
  )
}

export interface SceneMoment {
  chapter: Chapter
  /** 0…1 within chapter */
  local: number
  yearsAgo: number
  sinceBigBang: number
  elapsed: number
}

export function moment(): SceneMoment {
  const t = clock.time
  return {
    chapter: CHAPTERS[t.chapterIndex],
    local: t.local,
    yearsAgo: t.yearsAgo,
    sinceBigBang: t.sinceBigBang,
    elapsed: clock.elapsed,
  }
}
