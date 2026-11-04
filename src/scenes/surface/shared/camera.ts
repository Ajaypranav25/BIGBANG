import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'
import { smoothstep } from '../../../lib/interpolate'
import { moment, rig } from '../../rig'
import type { V3 } from './geometry'

export interface CameraPlan {
  /** dolly path, walked from local ≈ 0.08 to 0.9 */
  readonly path: readonly V3[]
  /** look-at path, same parameterisation */
  readonly look: readonly V3[]
  /** how far above the path the descent starts / the ascent ends */
  readonly skyHeight: number
  readonly fov?: number
  /** degrees of user orbit freedom */
  readonly orbitLimit?: number
  /** gentle handheld drift amplitude, metres */
  readonly drift?: number
  /** when given, path and look heights are relative to this ground (never below it) */
  readonly ground?: (x: number, z: number) => number
}

const MIN_CLEARANCE = 0.9

const DESCENT_END = 0.13
const PATH_START = 0.06
const PATH_END = 0.9

/**
 * Cinematic crane: drop from the sky (or water surface) during local 0–0.13, dolly along
 * `path` until 0.9, then rise back up — so chapter transitions read as dives from the globe.
 */
export function useCinematicCamera(plan: CameraPlan): void {
  const curves = useMemo(
    () => ({
      pos: new CatmullRomCurve3(plan.path.map((p) => new Vector3(...p)), false, 'centripetal'),
      look: new CatmullRomCurve3(plan.look.map((p) => new Vector3(...p)), false, 'centripetal'),
    }),
    [plan],
  )
  const tmp = useMemo(() => ({ p: new Vector3(), l: new Vector3(), ground: new Vector3() }), [])

  useFrame(() => {
    const m = moment()
    const u = m.local
    const s = Math.min(1, Math.max(0, (u - PATH_START) / (PATH_END - PATH_START)))
    curves.pos.getPoint(s, tmp.p)
    curves.look.getPoint(s, tmp.l)
    if (plan.ground) {
      const gp = plan.ground(tmp.p.x, tmp.p.z)
      tmp.p.y = Math.max(tmp.p.y + gp, gp + MIN_CLEARANCE)
      tmp.l.y += plan.ground(tmp.l.x, tmp.l.z)
    }

    const down = 1 - smoothstep(0, DESCENT_END, u)
    const up = smoothstep(PATH_END, 1, u)
    const lift = Math.max(down * down * (3 - 2 * down), up * up)
    const amp = plan.drift ?? 0.12
    tmp.p.x += Math.sin(m.elapsed * 0.21) * amp
    tmp.p.y += Math.sin(m.elapsed * 0.33 + 1.3) * amp * 0.6 + plan.skyHeight * lift
    tmp.p.z += Math.cos(m.elapsed * 0.17) * amp

    // while high up, look steeply down at the ground ahead instead of along the path
    tmp.ground.set(tmp.p.x + (tmp.l.x - tmp.p.x) * 0.25, tmp.l.y, tmp.p.z + (tmp.l.z - tmp.p.z) * 0.25 + 6)
    tmp.l.lerp(tmp.ground, lift * 0.85)

    rig.position.copy(tmp.p)
    rig.target.copy(tmp.l)
    rig.fov = plan.fov ?? 50
    rig.orbitLimit = ((plan.orbitLimit ?? 25) * Math.PI) / 180
    // in a landscape, 360° means standing still and looking all around
    rig.pivot = 'eye'
    rig.minElevation = -1.0
    rig.maxElevation = 1.25
  })
}
