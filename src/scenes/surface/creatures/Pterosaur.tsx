import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, type Group } from 'three'
import { moment } from '../../rig'
import { ellipsoid, mergeParts, paint, variableTube } from '../shared/geometry'
import { countershade, membraneMaterial, skinMaterial } from './parts'

/** Membrane from the body to the wing finger tip (+X side); mirrored for the left wing. */
function wingGeometry(span: number): BufferGeometry {
  const rootF: [number, number, number] = [0, 0, 0.22]
  const rootB: [number, number, number] = [0, 0, -0.32]
  const elbow: [number, number, number] = [span * 0.38, 0.05, 0.28]
  const wrist: [number, number, number] = [span * 0.55, 0.06, 0.18]
  const tip: [number, number, number] = [span, 0.12, -0.3]
  const trail: [number, number, number] = [span * 0.5, 0, -0.45]
  const pos = [...rootF, ...elbow, ...trail, ...elbow, ...wrist, ...trail, ...wrist, ...tip, ...trail, ...rootF, ...trail, ...rootB]
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

function buildPterosaur() {
  const back = '#4a3b33'
  const belly = '#d8ccb6'
  const body = mergeParts([
    countershade(ellipsoid(0.16, 0.18, 0.5, 14, 10), back, belly),
    countershade(variableTube([[0, 0.05, 0.4], [0, 0.18, 0.7], [0, 0.22, 0.95]], 10, 8, (t) => [0.08 - 0.03 * t, 0.09 - 0.03 * t]), back, belly),
    countershade(ellipsoid(0.07, 0.09, 0.2, 10, 8).translate(0, 0.24, 1.05), back, belly),
    paint(new ConeGeometry(0.05, 0.9, 8).rotateX(Math.PI / 2).translate(0, 0.2, 1.55), new Color('#cdb88f')),
    paint(new ConeGeometry(0.07, 0.75, 6).rotateX(-Math.PI / 2 - 0.35).scale(0.4, 1, 1).translate(0, 0.42, 0.75), new Color('#b5482d')),
  ])
  const right = wingGeometry(2.9)
  const left = right.clone().scale(-1, 1, 1)
  left.computeVertexNormals()
  return { body, right, left, skin: skinMaterial(), membrane: membraneMaterial('#6e5546') }
}

/** Pteranodon-like pterosaur (~6 m span), mostly soaring with occasional deep flaps. */
export function Pterosaur({ phase = 0 }: { phase?: number }) {
  const parts = useMemo(buildPterosaur, [])
  useEffect(
    () => () => {
      parts.body.dispose()
      parts.right.dispose()
      parts.left.dispose()
      parts.skin.dispose()
      parts.membrane.dispose()
    },
    [parts],
  )
  const rightRef = useRef<Group>(null)
  const leftRef = useRef<Group>(null)
  useFrame(() => {
    const t = moment().elapsed + phase
    const flapping = Math.max(0, Math.sin(t * 0.35)) > 0.75 ? 1 : 0.12
    const a = Math.sin(t * 5.5) * 0.55 * flapping + 0.06
    if (rightRef.current) rightRef.current.rotation.z = a
    if (leftRef.current) leftRef.current.rotation.z = -a
  })
  return (
    <group>
      <mesh geometry={parts.body} material={parts.skin} />
      <group ref={rightRef} position={[0.1, 0.08, 0.1]}>
        <mesh geometry={parts.right} material={parts.membrane} />
      </group>
      <group ref={leftRef} position={[-0.1, 0.08, 0.1]}>
        <mesh geometry={parts.left} material={parts.membrane} />
      </group>
    </group>
  )
}
