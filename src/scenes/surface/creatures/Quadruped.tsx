import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type BufferGeometry, Color, type Group } from 'three'
import { createRng } from '../../../lib/random'
import { moment } from '../../rig'
import { column, ellipsoid, mergeParts, paint, type V3, variableTube } from '../shared/geometry'
import { countershade, skinMaterial } from './parts'

export interface LegSpec {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly length: number
  readonly radius: number
}

export interface Extras {
  body?: BufferGeometry[]
  neck?: BufferGeometry[]
  tail?: BufferGeometry[]
}

export interface QuadSpec {
  readonly body: { readonly size: V3; readonly center: V3 }
  readonly tail: { readonly anchor: V3; readonly points: readonly V3[]; readonly r0: number; readonly r1: number }
  readonly neck: {
    readonly anchor: V3
    readonly points: readonly V3[]
    readonly r0: number
    readonly r1: number
    readonly head: V3
    readonly headOffset: V3
  }
  readonly front: LegSpec
  readonly hind: LegSpec
  readonly back: string
  readonly belly: string
  /** strides per second while walking */
  readonly stride: number
  /** leg swing amplitude, radians */
  readonly swing: number
  /** how far the neck dips while grazing, radians */
  readonly graze: number
  /** extra pre-painted geometry (plates, horns, frills) in part-local coordinates */
  readonly extras?: (rng: () => number) => Extras
}

/** Lateral-sequence walk: LH → LF → RH → RF, a quarter cycle apart (as in elephants and sauropod trackways). */
const LEG_PHASE = [Math.PI / 2, (3 * Math.PI) / 2, 0, Math.PI] // LF, RF, LH, RH

function buildQuadruped(spec: QuadSpec, seed: number) {
  const rng = createRng(seed)
  const extras = spec.extras?.(rng) ?? {}
  const { size, center } = spec.body
  const body = mergeParts([
    countershade(ellipsoid(size[0], size[1], size[2], 24, 16).translate(center[0], center[1], center[2]), spec.back, spec.belly),
    ...(extras.body ?? []),
  ])
  const tailR = (t: number) => {
    const r = spec.tail.r0 + (spec.tail.r1 - spec.tail.r0) * Math.pow(t, 0.85)
    return [r, r * 1.12] as const
  }
  const tail = mergeParts([
    countershade(variableTube(spec.tail.points, 28, 12, tailR), spec.back, spec.belly),
    ...(extras.tail ?? []),
  ])
  const n = spec.neck
  const last = n.points[n.points.length - 1]
  const neckR = (t: number) => {
    const r = n.r0 + (n.r1 - n.r0) * Math.pow(t, 0.7)
    return [r, r * 1.1] as const
  }
  const neck = mergeParts([
    countershade(variableTube(n.points, 26, 12, neckR), spec.back, spec.belly),
    countershade(
      ellipsoid(n.head[0], n.head[1], n.head[2], 18, 12).translate(last[0] + n.headOffset[0], last[1] + n.headOffset[1], last[2] + n.headOffset[2]),
      spec.back,
      spec.belly,
    ),
    ...(extras.neck ?? []),
  ])
  const legColor = new Color(spec.back).multiplyScalar(0.8)
  const leg = (l: LegSpec) =>
    mergeParts([
      paint(column(l.radius, l.radius * 0.82, l.length, 10, 3, true), legColor),
      paint(ellipsoid(l.radius * 1.15, l.radius * 0.35, l.radius * 1.25, 12, 6).translate(0, -l.length + l.radius * 0.2, l.radius * 0.15), legColor),
    ])
  return { body, tail, neck, frontLeg: leg(spec.front), hindLeg: leg(spec.hind), material: skinMaterial() }
}

export interface QuadrupedProps {
  spec: QuadSpec
  /** 0 = standing / grazing, 1 = walking */
  gait?: number
  phase?: number
  seed?: number
}

export function Quadruped({ spec, gait = 1, phase = 0, seed = 1 }: QuadrupedProps) {
  const parts = useMemo(() => buildQuadruped(spec, seed), [spec, seed])
  useEffect(
    () => () => {
      parts.body.dispose()
      parts.tail.dispose()
      parts.neck.dispose()
      parts.frontLeg.dispose()
      parts.hindLeg.dispose()
      parts.material.dispose()
    },
    [parts],
  )

  const bodyRef = useRef<Group>(null)
  const neckRef = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const legRefs = useRef<Array<Group | null>>([])

  useFrame(() => {
    const t = moment().elapsed
    const ph = t * spec.stride * Math.PI * 2 + phase
    legRefs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(ph + LEG_PHASE[i]) * spec.swing * gait
    })
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.cos(ph * 2) * 0.035 * spec.front.length * gait
      bodyRef.current.rotation.z = Math.sin(ph) * 0.012 * gait
    }
    if (neckRef.current) {
      const grazing = 1 - gait
      neckRef.current.rotation.x = spec.graze * grazing * (0.75 + 0.25 * Math.sin(t * 0.5 + phase)) + Math.sin(ph * 2) * 0.02 * gait
      neckRef.current.rotation.y = Math.sin(t * 0.23 + phase) * 0.14
    }
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * (0.7 + gait * 0.9) + phase) * 0.09
  })

  // facing +Z, the creature's left is +X. Order matches LEG_PHASE: LF, RF, LH, RH.
  const legs: Array<[number, LegSpec, BufferGeometry]> = [
    [1, spec.front, parts.frontLeg],
    [-1, spec.front, parts.frontLeg],
    [1, spec.hind, parts.hindLeg],
    [-1, spec.hind, parts.hindLeg],
  ]

  return (
    <group>
      <group ref={bodyRef}>
        <mesh geometry={parts.body} material={parts.material} />
        <group ref={tailRef} position={spec.tail.anchor}>
          <mesh geometry={parts.tail} material={parts.material} />
        </group>
        <group ref={neckRef} position={spec.neck.anchor}>
          <mesh geometry={parts.neck} material={parts.material} />
        </group>
      </group>
      {legs.map(([side, l, g], i) => (
        <group
          key={i}
          position={[side * l.x, l.y, l.z]}
          ref={(el) => {
            legRefs.current[i] = el
          }}
        >
          <mesh geometry={g} material={parts.material} />
        </group>
      ))}
    </group>
  )
}
