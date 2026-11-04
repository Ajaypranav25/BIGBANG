import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, ConeGeometry, type Group, Vector3 } from 'three'
import { moment } from '../../rig'
import { aim, column, ellipsoid, mergeParts, paint, variableTube } from '../shared/geometry'
import { countershade, skinMaterial } from './parts'

export interface TheropodLook {
  readonly back: string
  readonly belly: string
  /** optional stripe/accent colour for a crest of feather-like quills (dromaeosaurs) */
  readonly quills?: string
}

export const TYRANNOSAUR_LOOK: TheropodLook = { back: '#4d4836', belly: '#a99b7b' }
export const ALLOSAUR_LOOK: TheropodLook = { back: '#6a5136', belly: '#c2a77f' }
export const RAPTOR_LOOK: TheropodLook = { back: '#5b4a3a', belly: '#cdbb98', quills: '#2f2a25' }

/** Rest pose of the three leg segments (thigh forward, shin back, metatarsus vertical). */
const THIGH = 1.7
const SHIN = 1.5
const META = 0.7
const REST = { thigh: -0.35, shin: 0.7, meta: -0.35 }

function buildTheropod(look: TheropodLook) {
  const { back, belly } = look
  const body = mergeParts([
    countershade(ellipsoid(0.95, 1.25, 2.3, 24, 16).rotateX(0.08).translate(0, 3.95, 0.1), back, belly),
    // tiny two-fingered forelimbs
    ...[-1, 1].map((s) =>
      countershade(aim(column(0.11, 0.08, 0.9, 6, 1), new Vector3(s * 0.15, -0.6, 1), [s * 0.55, 3.6, 1.6]), back, belly),
    ),
  ])
  const tail = countershade(
    variableTube([[0, 0, 0], [0, -0.1, -2.0], [0, -0.6, -4.2], [0, -1.2, -6.4]], 28, 12, (t) => {
      const r = 0.95 + (0.05 - 0.95) * Math.pow(t, 0.8)
      return [r * 0.9, r * 1.1]
    }),
    back,
    belly,
  )
  const eye = new Color('#140d08')
  const neck = mergeParts([
    countershade(variableTube([[0, 0, 0], [0, 0.55, 0.55], [0, 0.75, 1.1]], 12, 12, (t) => [0.75 - 0.12 * t, 0.8 - 0.1 * t]), back, belly),
    countershade(ellipsoid(0.5, 0.6, 0.95, 18, 12).translate(0, 0.9, 1.85), back, belly),
    countershade(ellipsoid(0.42, 0.22, 0.85, 14, 8).translate(0, 0.4, 1.9), back, belly),
    ...[-1, 1].map((s) => paint(ellipsoid(0.07, 0.07, 0.07, 8, 6).translate(s * 0.42, 1.15, 2.0), eye)),
    ...(look.quills
      ? [0, 1, 2, 3, 4].map((i) =>
          paint(new ConeGeometry(0.05, 0.5, 6).rotateX(-0.9).translate(0, 1.35 - i * 0.12, 1.4 - i * 0.35), new Color(look.quills)),
        )
      : []),
  ])
  const legColor = new Color(back).multiplyScalar(0.85)
  const thigh = countershade(column(0.5, 0.32, THIGH, 12, 2, true), back, belly)
  const shin = paint(column(0.3, 0.2, SHIN, 10, 2, true), legColor)
  const meta = mergeParts([
    paint(column(0.18, 0.15, META, 8, 1, true), legColor),
    paint(ellipsoid(0.3, 0.12, 0.55, 10, 6).translate(0, -META, 0.3), legColor),
  ])
  return { body, tail, neck, thigh, shin, meta, material: skinMaterial() }
}

export interface TheropodProps {
  look?: TheropodLook
  gait?: number
  phase?: number
  /** strides per second */
  stride?: number
}

/** Bipedal theropod at Tyrannosaurus scale (~12 m, hip 3.7 m). Scale the parent group for others. */
export function Theropod({ look = TYRANNOSAUR_LOOK, gait = 1, phase = 0, stride = 0.6 }: TheropodProps) {
  const parts = useMemo(() => buildTheropod(look), [look])
  useEffect(
    () => () => {
      for (const g of [parts.body, parts.tail, parts.neck, parts.thigh, parts.shin, parts.meta]) g.dispose()
      parts.material.dispose()
    },
    [parts],
  )
  const bodyRef = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const neckRef = useRef<Group>(null)
  const thighs = useRef<Array<Group | null>>([])
  const shins = useRef<Array<Group | null>>([])
  const metas = useRef<Array<Group | null>>([])

  useFrame(() => {
    const t = moment().elapsed
    const ph = t * stride * Math.PI * 2 + phase
    for (let i = 0; i < 2; i++) {
      const p = ph + i * Math.PI
      const lift = Math.max(0, Math.sin(p + 1.2))
      const th = thighs.current[i]
      const sh = shins.current[i]
      const mt = metas.current[i]
      if (th) th.rotation.x = REST.thigh + Math.sin(p) * 0.42 * gait
      if (sh) sh.rotation.x = REST.shin + lift * 0.6 * gait
      if (mt) mt.rotation.x = REST.meta - lift * 0.3 * gait
    }
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.abs(Math.cos(ph)) * 0.08 * gait
      bodyRef.current.rotation.z = Math.sin(ph) * 0.025 * gait
    }
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(ph) * 0.07 * gait + Math.sin(t * 0.6 + phase) * 0.04
    if (neckRef.current) {
      neckRef.current.rotation.x = Math.sin(ph * 2) * 0.03 * gait + (1 - gait) * Math.sin(t * 0.4 + phase) * 0.06
      neckRef.current.rotation.y = Math.sin(t * 0.31 + phase) * 0.18
    }
  })

  return (
    <group>
      <group ref={bodyRef}>
        <mesh geometry={parts.body} material={parts.material} />
        <group ref={tailRef} position={[0, 4.0, -1.9]}>
          <mesh geometry={parts.tail} material={parts.material} />
        </group>
        <group ref={neckRef} position={[0, 4.4, 2.0]}>
          <mesh geometry={parts.neck} material={parts.material} />
        </group>
        {[1, -1].map((side, i) => (
          <group
            key={side}
            position={[side * 0.7, 3.7, -0.1]}
            ref={(el) => {
              thighs.current[i] = el
            }}
          >
            <mesh geometry={parts.thigh} material={parts.material} />
            <group
              position={[0, -THIGH, 0]}
              ref={(el) => {
                shins.current[i] = el
              }}
            >
              <mesh geometry={parts.shin} material={parts.material} />
              <group
                position={[0, -SHIN, 0]}
                ref={(el) => {
                  metas.current[i] = el
                }}
              >
                <mesh geometry={parts.meta} material={parts.material} />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}
