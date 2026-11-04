import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CatmullRomCurve3, Color, type Group, Vector3 } from 'three'
import { moment } from '../../rig'
import { ellipsoid, mergeParts, paint, variableTube } from '../shared/geometry'
import { countershade, skinMaterial } from './parts'

const SEGMENTS = 11

function buildAnomalocaris() {
  const back = '#a4523a'
  const belly = '#e3b79a'
  const segment = countershade(ellipsoid(0.12, 0.05, 0.07, 12, 8), back, belly)
  const flap = paint(ellipsoid(0.17, 0.012, 0.075, 12, 4).translate(0.15, 0, 0), new Color('#c7745a'))
  const appendage = (side: number) =>
    paint(
      variableTube(
        [[side * 0.05, -0.02, 0.1], [side * 0.08, -0.02, 0.24], [side * 0.07, -0.08, 0.33], [side * 0.05, -0.15, 0.3], [side * 0.03, -0.17, 0.22]],
        20,
        6,
        (t) => [0.03 * (1 - t) + 0.006, 0.03 * (1 - t) + 0.006],
      ),
      new Color('#b9623f'),
    )
  const head = mergeParts([
    countershade(ellipsoid(0.11, 0.07, 0.11, 14, 10).translate(0, 0, 0.06), back, belly),
    appendage(1),
    appendage(-1),
    ...[-1, 1].map((s) => paint(ellipsoid(0.035, 0.035, 0.035, 8, 6).translate(s * 0.14, 0.04, 0.05), new Color('#16100c'))),
    ...[-1, 1].map((s) => paint(ellipsoid(0.04, 0.008, 0.012, 6, 4).translate(s * 0.11, 0.04, 0.05), new Color('#a4523a'))),
  ])
  const tail = mergeParts(
    [-1, 1].flatMap((s) => [0, 1, 2].map((k) => paint(ellipsoid(0.03, 0.008, 0.11, 8, 4).rotateY(s * (0.3 + k * 0.25)).translate(s * 0.03, 0, -0.08), new Color('#c7745a')))),
  )
  return { segment, flap, head, tail, material: skinMaterial() }
}

/**
 * Anomalocaris canadensis (~0.4–0.5 m, Burgess Shale): segmented body with undulating lateral
 * flaps and spiny frontal appendages, cruising a looping path. Faces +Z in local space.
 */
export function Anomalocaris({ path, speed = 0.018, scale = 1.6 }: { path: ReadonlyArray<readonly [number, number, number]>; speed?: number; scale?: number }) {
  const parts = useMemo(buildAnomalocaris, [])
  const curve = useMemo(() => new CatmullRomCurve3(path.map((p) => new Vector3(...p)), true, 'centripetal'), [path])
  useEffect(
    () => () => {
      parts.segment.dispose()
      parts.flap.dispose()
      parts.head.dispose()
      parts.tail.dispose()
      parts.material.dispose()
    },
    [parts],
  )
  const root = useRef<Group>(null)
  const segs = useRef<Array<Group | null>>([])
  const flapsL = useRef<Array<Group | null>>([])
  const flapsR = useRef<Array<Group | null>>([])
  const tmp = useMemo(() => ({ p: new Vector3(), ahead: new Vector3() }), [])

  useFrame(() => {
    const t = moment().elapsed
    const u = (t * speed) % 1
    curve.getPointAt(u, tmp.p)
    curve.getPointAt((u + 0.004) % 1, tmp.ahead)
    if (root.current) {
      root.current.position.copy(tmp.p)
      root.current.lookAt(tmp.ahead)
    }
    for (let i = 0; i < SEGMENTS; i++) {
      const wave = Math.sin(t * 5.2 - i * 0.55)
      const s = segs.current[i]
      if (s) s.position.x = Math.sin(t * 2.6 - i * 0.4) * 0.008 * i
      const l = flapsL.current[i]
      const r = flapsR.current[i]
      if (l) l.rotation.z = wave * 0.5
      if (r) r.rotation.z = -wave * 0.5
    }
  })

  return (
    <group ref={root}>
      <group scale={scale}>
        <mesh geometry={parts.head} material={parts.material} position={[0, 0, 0.02]} />
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const z = -i * 0.055
          const k = 1 - i / (SEGMENTS + 3)
          return (
            <group key={i} position={[0, 0, z]} scale={[k, 1, 1]} ref={(el) => void (segs.current[i] = el)}>
              <mesh geometry={parts.segment} material={parts.material} />
              <group ref={(el) => void (flapsL.current[i] = el)}>
                <mesh geometry={parts.flap} material={parts.material} />
              </group>
              <group rotation={[0, Math.PI, 0]}>
                <group ref={(el) => void (flapsR.current[i] = el)}>
                  <mesh geometry={parts.flap} material={parts.material} />
                </group>
              </group>
            </group>
          )
        })}
        <mesh geometry={parts.tail} material={parts.material} position={[0, 0, -SEGMENTS * 0.055]} />
      </group>
    </group>
  )
}
