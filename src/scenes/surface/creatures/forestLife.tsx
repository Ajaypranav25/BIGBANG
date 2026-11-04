import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { moment } from '../../rig'
import { ellipsoid, mergeParts, paint, variableTube } from '../shared/geometry'
import { countershade, skinMaterial } from './parts'

/* ------------------------------------------------------------------ */
/* Meganeura — griffinfly, ~70 cm wingspan (Late Carboniferous)         */
/* ------------------------------------------------------------------ */

export interface FlightPath {
  center: readonly [number, number, number]
  /** Lissajous radii x / y / z */
  radius: readonly [number, number, number]
  speed: number
  phase: number
}

export function Meganeura({ path }: { path: FlightPath }) {
  const parts = useMemo(() => {
    const body = mergeParts([
      countershade(ellipsoid(0.035, 0.035, 0.07, 10, 8), '#2c3d2e', '#6f8a5a'),
      countershade(variableTube([[0, 0, -0.05], [0, 0.005, -0.2], [0, 0.0, -0.38]], 14, 6, (t) => [0.016 - 0.008 * t, 0.016 - 0.008 * t]), '#24452f', '#5d8c63'),
      ...[-1, 1].map((s) => paint(ellipsoid(0.026, 0.026, 0.026, 10, 8).translate(s * 0.024, 0.012, 0.07), new Color('#1d3b4a'))),
    ])
    const wing = new CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(0.17, 1, 0.032).translate(0.17, 0, 0)
    const wingMat = new MeshPhysicalMaterial({
      color: new Color('#d8eee4'),
      transparent: true,
      opacity: 0.38,
      roughness: 0.25,
      iridescence: 1,
      iridescenceIOR: 1.35,
      side: DoubleSide,
      depthWrite: false,
    })
    return { body, wing, wingMat, skin: skinMaterial() }
  }, [])
  useEffect(
    () => () => {
      parts.body.dispose()
      parts.wing.dispose()
      parts.wingMat.dispose()
      parts.skin.dispose()
    },
    [parts],
  )
  const root = useRef<Group>(null)
  const wings = useRef<Array<Group | null>>([])
  const tmp = useMemo(() => ({ p: new Vector3(), q: new Vector3() }), [])
  const at = (t: number, out: Vector3) =>
    out.set(
      path.center[0] + Math.sin(t * path.speed + path.phase) * path.radius[0],
      path.center[1] + Math.sin(t * path.speed * 1.7 + path.phase * 2) * path.radius[1],
      path.center[2] + Math.sin(t * path.speed * 0.8 + path.phase * 0.5) * path.radius[2],
    )

  useFrame(() => {
    const t = moment().elapsed
    at(t, tmp.p)
    at(t + 0.05, tmp.q)
    if (root.current) {
      root.current.position.copy(tmp.p)
      root.current.lookAt(tmp.q)
    }
    const flap = Math.sin(t * 24 + path.phase) * 0.45
    wings.current.forEach((w, i) => {
      if (w) w.rotation.z = (i % 2 === 0 ? 1 : -1) * (flap * (i < 2 ? 1 : 0.85)) + (i % 2 === 0 ? 0.05 : -0.05)
    })
  })

  const mounts: Array<[number, number, number]> = [
    [1, 0.015, 0.03],
    [-1, 0.015, 0.03],
    [1, 0.015, -0.03],
    [-1, 0.015, -0.03],
  ]
  return (
    <group ref={root}>
      <mesh geometry={parts.body} material={parts.skin} />
      {mounts.map(([side, y, z], i) => (
        <group key={i} position={[side * 0.02, y, z]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <group ref={(el) => void (wings.current[i] = el)} rotation={[0, i < 2 ? -0.12 : 0.18, 0]}>
            <mesh geometry={parts.wing} material={parts.wingMat} />
          </group>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Arthropleura — giant myriapod, up to ~2.6 m (Carboniferous)          */
/* ------------------------------------------------------------------ */

const ARTHRO_SEGMENTS = 26
const SEG_SPACING = 0.095

export function Arthropleura({ center, radius, speed, groundY }: { center: readonly [number, number]; radius: number; speed: number; groundY: (x: number, z: number) => number }) {
  const meshes = useMemo(() => {
    const segGeo = countershade(ellipsoid(0.24, 0.06, 0.06, 12, 6), '#3d2f24', '#8a6e52')
    const legGeo = paint(new CylinderGeometry(0.012, 0.008, 0.16, 4).translate(0, -0.08, 0), new Color('#2b2119'))
    const mat = skinMaterial()
    const segs = new InstancedMesh(segGeo, mat, ARTHRO_SEGMENTS)
    const legs = new InstancedMesh(legGeo, mat, ARTHRO_SEGMENTS * 2)
    segs.frustumCulled = false
    legs.frustumCulled = false
    return { segs, legs, segGeo, legGeo, mat }
  }, [])
  useEffect(
    () => () => {
      meshes.segGeo.dispose()
      meshes.legGeo.dispose()
      meshes.mat.dispose()
      meshes.segs.dispose()
      meshes.legs.dispose()
    },
    [meshes],
  )
  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(1, 1, 1), up: new Vector3(0, 1, 0), lq: new Quaternion(), lm: new Matrix4() }), [])

  useFrame(() => {
    const t = moment().elapsed
    const head = t * speed
    for (let i = 0; i < ARTHRO_SEGMENTS; i++) {
      const s = head - i * SEG_SPACING
      const a = s / radius
      const wob = Math.sin(s * 1.3) * 0.6
      const x = center[0] + Math.cos(a) * (radius + wob)
      const z = center[1] + Math.sin(a) * (radius + wob)
      const heading = Math.atan2(-Math.sin(a), Math.cos(a)) // tangent direction
      const taper = i < 3 ? 0.75 + i * 0.08 : i > ARTHRO_SEGMENTS - 5 ? 1 - (i - (ARTHRO_SEGMENTS - 5)) * 0.12 : 1
      tmp.p.set(x, groundY(x, z) + 0.07, z)
      tmp.q.setFromAxisAngle(tmp.up, heading)
      tmp.s.setScalar(taper)
      meshes.segs.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
      for (const side of [0, 1]) {
        const sign = side === 0 ? 1 : -1
        const swing = Math.sin(t * 9 - i * 0.9 + side * Math.PI) * 0.5
        tmp.lq.setFromAxisAngle(tmp.up, heading)
        const off = new Vector3(sign * 0.2 * taper, 0, 0).applyQuaternion(tmp.lq)
        const legQ = tmp.lq.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), sign * 0.5)).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), swing))
        meshes.legs.setMatrixAt(i * 2 + side, tmp.lm.compose(tmp.p.clone().add(off), legQ, tmp.s))
      }
    }
    meshes.segs.instanceMatrix.needsUpdate = true
    meshes.legs.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive object={meshes.segs} />
      <primitive object={meshes.legs} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Tiktaalik roseae — ~375 Ma fishapod, up to ~2.7 m                     */
/* ------------------------------------------------------------------ */

const TIK_SEGMENTS = 8

export function Tiktaalik() {
  const parts = useMemo(() => {
    const back = '#4d5a3b'
    const belly = '#b9b08a'
    const segment = countershade(ellipsoid(0.2, 0.13, 0.19, 12, 8), back, belly)
    const head = mergeParts([
      countershade(ellipsoid(0.24, 0.1, 0.32, 14, 8).translate(0, 0, 0.15), back, belly),
      ...[-1, 1].map((s) => paint(ellipsoid(0.03, 0.03, 0.03, 6, 4).translate(s * 0.09, 0.09, 0.22), new Color('#141414'))),
    ])
    const fin = countershade(ellipsoid(0.2, 0.03, 0.08, 10, 4).translate(0.17, 0, 0), back, belly)
    return { segment, head, fin, material: skinMaterial() }
  }, [])
  useEffect(
    () => () => {
      parts.segment.dispose()
      parts.head.dispose()
      parts.fin.dispose()
      parts.material.dispose()
    },
    [parts],
  )
  const segs = useRef<Array<Group | null>>([])
  const fins = useRef<Array<Group | null>>([])
  useFrame(() => {
    const t = moment().elapsed
    segs.current.forEach((s, i) => {
      if (!s) return
      s.position.x = Math.sin(t * 1.6 - i * 0.7) * 0.025 * i
      s.rotation.y = Math.cos(t * 1.6 - i * 0.7) * 0.12
    })
    fins.current.forEach((f, i) => {
      if (f) f.rotation.y = Math.sin(t * 1.6 + (i % 2) * Math.PI) * 0.45 - (i % 2 === 0 ? 0.3 : -0.3)
    })
  })
  return (
    <group>
      <mesh geometry={parts.head} material={parts.material} position={[0, 0.02, 0.2]} />
      {[1, -1].map((side, i) => (
        <group key={side} position={[side * 0.16, -0.06, 0.05]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <group ref={(el) => void (fins.current[i] = el)}>
            <mesh geometry={parts.fin} material={parts.material} />
          </group>
        </group>
      ))}
      {Array.from({ length: TIK_SEGMENTS }, (_, i) => {
        const k = 1 - i / (TIK_SEGMENTS + 1)
        return (
          <group key={i} position={[0, 0, -i * 0.22]} scale={[k, k, 1]} ref={(el) => void (segs.current[i] = el)}>
            <mesh geometry={parts.segment} material={parts.material} />
          </group>
        )
      })}
    </group>
  )
}
