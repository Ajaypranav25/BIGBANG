import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type BufferGeometry, Color, CylinderGeometry, type Mesh, MeshBasicMaterial, type PointLight, SphereGeometry, Vector3 } from 'three'
import { smoothstep } from '../../../lib/interpolate'
import { createRng } from '../../../lib/random'
import { moment } from '../../rig'
import { ellipsoid, mergeParts, paint } from '../shared/geometry'
import { makeInstanced, type Placement } from '../shared/instancing'
import { patchedStandard, useInstances } from '../shared/layers'
import { Motes } from '../shared/Motes'
import { lifePatch } from '../shared/patch'

/* ------------------------------------------------------------------ */
/* Day cycle                                                            */
/* ------------------------------------------------------------------ */

interface SkyKey {
  u: number
  elev: number
  az: number
  top: string
  horizon: string
  sun: string
  sunI: number
  hemiSky: string
  hemiI: number
  fog: string
  fogD: number
  stars: number
  moon: number
}

/** Day → sunset → night (fire) → dawn across the chapter. */
const KEYS: readonly SkyKey[] = [
  { u: 0.0, elev: 58, az: -0.6, top: '#3a78c0', horizon: '#cfdde3', sun: '#fff4dc', sunI: 3.0, hemiSky: '#cfe3f5', hemiI: 0.9, fog: '#c8cdc2', fogD: 0.0065, stars: 0, moon: 0 },
  { u: 0.42, elev: 30, az: -1.2, top: '#4580be', horizon: '#e6dabb', sun: '#ffe7b8', sunI: 2.7, hemiSky: '#d9e2e6', hemiI: 0.8, fog: '#d6cdb2', fogD: 0.007, stars: 0, moon: 0 },
  { u: 0.57, elev: 4, az: -1.5, top: '#3a4c86', horizon: '#ff9548', sun: '#ff8a3a', sunI: 1.8, hemiSky: '#e3a37a', hemiI: 0.55, fog: '#d48a5c', fogD: 0.009, stars: 0, moon: 0 },
  { u: 0.65, elev: -7, az: -1.6, top: '#181f3e', horizon: '#6c3c55', sun: '#3a1408', sunI: 0.05, hemiSky: '#45385a', hemiI: 0.25, fog: '#2c2236', fogD: 0.012, stars: 0.45, moon: 0.12 },
  { u: 0.74, elev: -30, az: -1.6, top: '#03060f', horizon: '#0f1424', sun: '#000000', sunI: 0, hemiSky: '#1d2a48', hemiI: 0.16, fog: '#0b1020', fogD: 0.016, stars: 1, moon: 0.35 },
  { u: 0.86, elev: -18, az: 1.5, top: '#04070f', horizon: '#141a2c', sun: '#000000', sunI: 0, hemiSky: '#1d2a48', hemiI: 0.16, fog: '#0d1222', fogD: 0.015, stars: 1, moon: 0.3 },
  { u: 0.94, elev: -2, az: 1.4, top: '#26336a', horizon: '#e48a66', sun: '#ff9a62', sunI: 0.6, hemiSky: '#8a7aa0', hemiI: 0.4, fog: '#a07a74', fogD: 0.01, stars: 0.2, moon: 0.1 },
  { u: 1.0, elev: 11, az: 1.3, top: '#4a7cc0', horizon: '#f1c69c', sun: '#ffd2a0', sunI: 2.0, hemiSky: '#d6d6e0', hemiI: 0.7, fog: '#d9c3a6', fogD: 0.008, stars: 0, moon: 0 },
]

const COLORS = KEYS.map((k) => ({
  top: new Color(k.top),
  horizon: new Color(k.horizon),
  sun: new Color(k.sun),
  hemiSky: new Color(k.hemiSky),
  fog: new Color(k.fog),
}))

export interface DayState {
  sunDir: Vector3
  top: Color
  horizon: Color
  sun: Color
  sunI: number
  hemiSky: Color
  hemiI: number
  fog: Color
  fogD: number
  stars: number
  moon: number
}

export function createDayState(): DayState {
  return {
    sunDir: new Vector3(0, 1, 0),
    top: new Color(),
    horizon: new Color(),
    sun: new Color(),
    sunI: 1,
    hemiSky: new Color(),
    hemiI: 1,
    fog: new Color(),
    fogD: 0.01,
    stars: 0,
    moon: 0,
  }
}

/** Interpolate the day cycle at chapter-local `u` into `out` (no allocation). */
export function sampleDay(u: number, out: DayState): DayState {
  let i = 0
  while (i < KEYS.length - 2 && u > KEYS[i + 1].u) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = smoothstep(a.u, b.u, u)
  const lerp = (x: number, y: number) => x + (y - x) * t
  const elev = (lerp(a.elev, b.elev) * Math.PI) / 180
  const az = lerp(a.az, b.az)
  out.sunDir.set(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az))
  out.top.copy(COLORS[i].top).lerp(COLORS[i + 1].top, t)
  out.horizon.copy(COLORS[i].horizon).lerp(COLORS[i + 1].horizon, t)
  out.sun.copy(COLORS[i].sun).lerp(COLORS[i + 1].sun, t)
  out.hemiSky.copy(COLORS[i].hemiSky).lerp(COLORS[i + 1].hemiSky, t)
  out.fog.copy(COLORS[i].fog).lerp(COLORS[i + 1].fog, t)
  out.sunI = lerp(a.sunI, b.sunI)
  out.hemiI = lerp(a.hemiI, b.hemiI)
  out.fogD = lerp(a.fogD, b.fogD)
  out.stars = lerp(a.stars, b.stars)
  out.moon = lerp(a.moon, b.moon)
  return out
}

/* ------------------------------------------------------------------ */
/* Campfire — earliest widely accepted controlled fire ~1 Ma            */
/* (Wonderwerk Cave, South Africa; Berna et al. 2012)                   */
/* ------------------------------------------------------------------ */

export function Campfire({ position, from, to }: { position: readonly [number, number, number]; from: number; to: number }) {
  const light = useRef<PointLight>(null)
  const flameOpacity = useMemo(() => ({ value: 0 }), [])
  const emberOpacity = useMemo(() => ({ value: 0 }), [])
  const parts = useMemo(() => {
    const rng = createRng(77)
    const logs: BufferGeometry[] = []
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      logs.push(paint(new CylinderGeometry(0.06, 0.07, 1.0, 6).rotateZ(Math.PI / 2 - 0.35).rotateY(a).translate(Math.cos(a) * 0.18, 0.12, Math.sin(a) * 0.18), new Color('#2a1c12')))
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      logs.push(paint(ellipsoid(0.13, 0.09, 0.12, 8, 6).translate(Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62), new Color('#4d4842').multiplyScalar(0.8 + rng() * 0.4)))
    }
    const geo = mergeParts(logs)
    const core = new SphereGeometry(0.16, 12, 8)
    const coreMat = new MeshBasicMaterial({ color: new Color('#ff8c2a').multiplyScalar(4), toneMapped: false, transparent: true })
    return { geo, mat: patchedStandard([], { roughness: 0.95 }), core, coreMat }
  }, [])
  useEffect(
    () => () => {
      parts.geo.dispose()
      parts.mat.dispose()
      parts.core.dispose()
      parts.coreMat.dispose()
    },
    [parts],
  )
  const coreRef = useRef<Mesh>(null)

  useFrame(() => {
    const m = moment()
    const k = smoothstep(from, from + 0.03, m.local) * (1 - smoothstep(to - 0.03, to, m.local))
    const flicker = 0.75 + 0.15 * Math.sin(m.elapsed * 13) + 0.1 * Math.sin(m.elapsed * 23.7 + 1.3)
    if (light.current) light.current.intensity = 45 * k * flicker
    flameOpacity.value = 0.95 * k
    emberOpacity.value = 0.9 * k
    if (coreRef.current) {
      coreRef.current.visible = k > 0.01
      coreRef.current.scale.setScalar(0.6 + 0.4 * flicker)
      parts.coreMat.opacity = k
    }
  })

  return (
    <group position={position}>
      <mesh geometry={parts.geo} material={parts.mat} />
      <mesh ref={coreRef} geometry={parts.core} material={parts.coreMat} position={[0, 0.18, 0]} />
      <pointLight ref={light} position={[0, 0.6, 0]} color="#ff9a48" intensity={0} distance={28} decay={2} />
      <Motes count={240} box={[0.55, 1.3, 0.55]} position={[0, 0.75, 0]} color="#ff9a3c" size={2.4} fall={-0.9} drift={0.06} opacityUniform={flameOpacity} seed={3} />
      <Motes count={90} box={[2.4, 5, 2.4]} position={[0, 2.6, 0]} color="#ffb766" size={0.45} fall={-0.55} drift={0.5} opacityUniform={emberOpacity} seed={4} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Laetoli footprints — ~3.66 Ma, Tanzania (Leakey & Hay 1979)           */
/* ------------------------------------------------------------------ */

function footprint(): BufferGeometry {
  const dark = new Color('#3e3a33')
  const parts = [paint(ellipsoid(0.055, 0.012, 0.11, 10, 4), dark), paint(ellipsoid(0.03, 0.01, 0.03, 6, 3).translate(-0.022, 0, 0.1), dark)]
  for (let i = 0; i < 4; i++) parts.push(paint(ellipsoid(0.013, 0.008, 0.016, 5, 3).translate(0.008 + i * 0.013, 0, 0.105 - i * 0.008), dark))
  return mergeParts(parts)
}

/**
 * Two parallel hominin trails (as at Laetoli Site G) pressed into volcanic ash. Prints appear
 * progressively around u ≈ 0.2 — when 3.66 Ma passes in this chapter's log timeline.
 */
export function Footprints({ from, to, groundY, appear }: { from: readonly [number, number]; to: readonly [number, number]; groundY: (x: number, z: number) => number; appear: number }) {
  const mesh = useInstances(() => {
    const dx = to[0] - from[0]
    const dz = to[1] - from[1]
    const len = Math.hypot(dx, dz)
    const dir = [dx / len, dz / len] as const
    const side = [-dir[1], dir[0]] as const
    const heading = Math.atan2(dx, dz)
    const list: Placement[] = []
    const step = 0.47
    for (const [trail, offset] of [[0, 0], [1, 0.32]] as const) {
      const n = Math.floor(len / step)
      for (let i = 0; i < n; i++) {
        const along = i * step + trail * 0.2
        const lr = i % 2 === 0 ? -1 : 1
        const lateral = offset + lr * 0.08
        const x = from[0] + dir[0] * along + side[0] * lateral
        const z = from[1] + dir[1] * along + side[1] * lateral
        list.push({
          x,
          y: groundY(x, z) + 0.004,
          z,
          rotY: heading + lr * 0.05,
          stretch: [lr, 1, 1],
          scale: trail === 0 ? 1.0 : 1.1,
          life: [appear + (along / len) * 0.035, 2],
        })
      }
    }
    return makeInstanced(footprint(), patchedStandard([lifePatch], { roughness: 1 }), list)
  }, [from, to, groundY, appear])
  return <primitive object={mesh} />
}
