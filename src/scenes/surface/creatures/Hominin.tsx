import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CapsuleGeometry, Color, type Group, MeshStandardMaterial } from 'three'
import { moment } from '../../rig'
import { ellipsoid, mergeParts, paint } from '../shared/geometry'

export type HomininPose = 'walk' | 'stand' | 'sit'

/** Proportions as fractions of standing height (australopith-like: long arms, short legs). */
const P = {
  hip: 0.5,
  thigh: 0.25,
  shin: 0.23,
  shoulder: 0.8,
  upperArm: 0.2,
  foreArm: 0.19,
  limb: 0.035,
}

function capsule(radius: number, length: number): CapsuleGeometry {
  // hangs below its pivot
  return new CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 4, 8).translate(0, -length / 2, 0) as CapsuleGeometry
}

function buildHominin(color: string) {
  const c = new Color(color)
  const torso = mergeParts([
    paint(new CapsuleGeometry(0.085, 0.2, 4, 10).translate(0, P.hip + 0.16, 0), c),
    paint(ellipsoid(0.12, 0.07, 0.07, 12, 8).translate(0, P.shoulder - 0.02, 0), c),
    paint(ellipsoid(0.065, 0.075, 0.07, 12, 10).translate(0, 0.9, 0.02), c),
    paint(ellipsoid(0.045, 0.04, 0.05, 10, 8).translate(0, 0.875, 0.065), c),
    paint(ellipsoid(0.03, 0.03, 0.03, 8, 6).translate(0, 0.83, 0.0), c),
  ])
  return {
    torso,
    thigh: paint(capsule(P.limb * 1.25, P.thigh), c),
    shin: paint(capsule(P.limb, P.shin), c),
    upper: paint(capsule(P.limb * 0.9, P.upperArm), c),
    fore: paint(capsule(P.limb * 0.8, P.foreArm), c),
    material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  }
}

export interface HomininProps {
  pose?: HomininPose
  phase?: number
  /** strides per second while walking */
  cadence?: number
  color?: string
}

/**
 * Stylised hominin (1 unit tall — scale the parent group to the species' height). Reads best as a
 * backlit silhouette; used when no `hominin` GLB is bundled.
 */
export function Hominin({ pose = 'walk', phase = 0, cadence = 0.9, color = '#2b1d15' }: HomininProps) {
  const parts = useMemo(() => buildHominin(color), [color])
  useEffect(
    () => () => {
      for (const g of [parts.torso, parts.thigh, parts.shin, parts.upper, parts.fore]) g.dispose()
      parts.material.dispose()
    },
    [parts],
  )
  const root = useRef<Group>(null)
  const thighs = useRef<Array<Group | null>>([])
  const shins = useRef<Array<Group | null>>([])
  const uppers = useRef<Array<Group | null>>([])
  const fores = useRef<Array<Group | null>>([])

  useFrame(() => {
    const t = moment().elapsed
    const ph = t * cadence * Math.PI * 2 + phase
    for (let i = 0; i < 2; i++) {
      const p = ph + i * Math.PI
      const th = thighs.current[i]
      const sh = shins.current[i]
      const up = uppers.current[i]
      const fo = fores.current[i]
      if (pose === 'walk') {
        if (th) th.rotation.x = -Math.sin(p) * 0.45
        if (sh) sh.rotation.x = Math.max(0, Math.sin(p - 1.3)) * 0.85
        if (up) up.rotation.x = Math.sin(p) * 0.35
        if (fo) fo.rotation.x = -0.25 - Math.max(0, Math.sin(p)) * 0.2
      } else if (pose === 'sit') {
        if (th) th.rotation.x = -1.45
        if (sh) sh.rotation.x = 1.45
        if (up) up.rotation.x = -0.65 + Math.sin(t * 0.7 + phase + i) * 0.05
        if (fo) fo.rotation.x = -0.75
      } else {
        if (th) th.rotation.x = 0
        if (sh) sh.rotation.x = 0
        if (up) up.rotation.x = Math.sin(t * 0.5 + phase + i) * 0.04
        if (fo) fo.rotation.x = -0.15
      }
    }
    if (root.current) {
      root.current.position.y = pose === 'sit' ? -(P.hip - P.shin - 0.02) : pose === 'walk' ? Math.abs(Math.cos(ph)) * 0.02 : 0
      root.current.rotation.x = pose === 'sit' ? 0.18 : pose === 'walk' ? 0.05 : 0
    }
  })

  return (
    <group ref={root}>
      <mesh geometry={parts.torso} material={parts.material} />
      {[1, -1].map((side, i) => (
        <group key={side}>
          <group position={[side * 0.06, P.hip, 0]} ref={(el) => void (thighs.current[i] = el)}>
            <mesh geometry={parts.thigh} material={parts.material} />
            <group position={[0, -P.thigh, 0]} ref={(el) => void (shins.current[i] = el)}>
              <mesh geometry={parts.shin} material={parts.material} />
            </group>
          </group>
          <group position={[side * 0.13, P.shoulder, 0]} ref={(el) => void (uppers.current[i] = el)}>
            <mesh geometry={parts.upper} material={parts.material} />
            <group position={[0, -P.upperArm, 0]} ref={(el) => void (fores.current[i] = el)}>
              <mesh geometry={parts.fore} material={parts.material} />
            </group>
          </group>
        </group>
      ))}
    </group>
  )
}
