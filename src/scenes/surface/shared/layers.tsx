import { useFrame } from '@react-three/fiber'
import { type DependencyList, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { CatmullRomCurve3, type Group, type InstancedMesh, MeshStandardMaterial, type MeshStandardMaterialParameters, Vector3 } from 'three'
import { smoothstep } from '../../../lib/interpolate'
import { moment } from '../../rig'
import { disposeMesh } from './instancing'
import { patchMaterial, type ShaderPatch } from './patch'

/** Lit vertex-coloured material with GPU patches applied. */
export function patchedStandard(patches: readonly ShaderPatch[], params: MeshStandardMaterialParameters = {}): MeshStandardMaterial {
  return patchMaterial(new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, ...params }), patches)
}

/** Memoise an instanced layer and dispose its GPU resources on unmount / rebuild. */
export function useInstances(factory: () => InstancedMesh, deps: DependencyList): InstancedMesh {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mesh = useMemo(factory, deps)
  useEffect(() => () => disposeMesh(mesh), [mesh])
  return mesh
}

/**
 * Show children only between chapter-local `from` and `to`. With `shrink` (default) they grow and
 * shrink at the edges — place the Gate at the creature's own origin. Use `shrink={false}` for
 * children that position themselves in world space.
 */
export function Gate({ from, to, fade = 0.04, shrink = true, children }: { from: number; to: number; fade?: number; shrink?: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const u = moment().local
    const k = smoothstep(from, from + fade, u) * (1 - smoothstep(to - fade, to, u))
    if (!ref.current) return
    ref.current.visible = k > 0.001
    if (shrink) ref.current.scale.setScalar(Math.max(k, 0.001))
  })
  return <group ref={ref}>{children}</group>
}

export type GroundFn = (x: number, z: number) => number

interface WalkerProps {
  points: ReadonlyArray<readonly [number, number]>
  /** metres per second */
  speed: number
  /** 0…1 starting offset along the loop */
  offset?: number
  groundY: GroundFn
  /** extra height (e.g. wading creatures) */
  lift?: number
  scale?: number
  children: ReactNode
}

/** Moves its children along a closed ground loop, facing the direction of travel. */
export function Walker({ points, speed, offset = 0, groundY, lift = 0, scale = 1, children }: WalkerProps) {
  const ref = useRef<Group>(null)
  const curve = useMemo(() => new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)), true, 'centripetal'), [points])
  const length = useMemo(() => curve.getLength(), [curve])
  const tmp = useMemo(() => ({ p: new Vector3(), a: new Vector3() }), [])
  useFrame(() => {
    const u = (((moment().elapsed * speed) / length + offset) % 1 + 1) % 1
    curve.getPointAt(u, tmp.p)
    curve.getPointAt((u + 0.003) % 1, tmp.a)
    if (!ref.current) return
    ref.current.position.set(tmp.p.x, groundY(tmp.p.x, tmp.p.z) + lift, tmp.p.z)
    ref.current.rotation.y = Math.atan2(tmp.a.x - tmp.p.x, tmp.a.z - tmp.p.z)
  })
  return (
    <group ref={ref} scale={scale}>
      {children}
    </group>
  )
}

interface OrbiterProps {
  center: readonly [number, number, number]
  radius: number
  /** radians per second (negative = clockwise) */
  speed: number
  phase?: number
  bob?: number
  scale?: number
  children: ReactNode
}

/** Circles its children around a point, banking into the turn (soaring flyers, swimmers). */
export function Orbiter({ center, radius, speed, phase = 0, bob = 0, scale = 1, children }: OrbiterProps) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const t = moment().elapsed
    const a = t * speed + phase
    if (!ref.current) return
    ref.current.position.set(center[0] + Math.cos(a) * radius, center[1] + Math.sin(t * 0.4 + phase) * bob, center[2] + Math.sin(a) * radius)
    const dir = Math.sign(speed) || 1
    ref.current.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), 0)
    ref.current.rotateZ(-0.35 * dir)
  })
  return (
    <group ref={ref} scale={scale}>
      {children}
    </group>
  )
}
