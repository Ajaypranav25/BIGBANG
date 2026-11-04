import { MeshReflectorMaterial } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Color, MeshStandardMaterial, PlaneGeometry } from 'three'
import type { Quality } from '../../../time/store'

export interface WaterProps {
  size: number
  y: number
  color: string
  quality: Quality
  position?: readonly [number, number]
}

const REFLECTION_RES: Record<Quality, number> = { low: 0, medium: 256, high: 512 }

/**
 * Still water. Medium/high quality use a blurred planar reflection; low uses a glossy
 * standard material (no extra render pass).
 */
export function Water({ size, y, color, quality, position = [0, 0] }: WaterProps) {
  const geometry = useMemo(() => new PlaneGeometry(size, size).rotateX(-Math.PI / 2), [size])
  const fallback = useMemo(
    () => new MeshStandardMaterial({ color: new Color(color), roughness: 0.12, metalness: 0.7 }),
    [color],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      fallback.dispose()
    },
    [geometry, fallback],
  )

  const res = REFLECTION_RES[quality]
  const at: [number, number, number] = [position[0], y, position[1]]
  if (res === 0) return <mesh geometry={geometry} material={fallback} position={at} />
  return (
    <mesh geometry={geometry} position={at}>
      <MeshReflectorMaterial
        resolution={res}
        blur={[220, 70]}
        mixBlur={0.9}
        mixStrength={0.85}
        mirror={0.6}
        depthScale={0.6}
        minDepthThreshold={0.6}
        maxDepthThreshold={1.2}
        roughness={0.85}
        metalness={0.4}
        color={color}
      />
    </mesh>
  )
}
