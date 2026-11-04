import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Color, Fog, FogExp2 } from 'three'

/**
 * Install a background colour and fog for the lifetime of the biome, restoring the
 * previous values on unmount. Pass memoised objects; mutate them per frame to animate.
 */
export function useSceneLook(background: Color, fog: Fog | FogExp2): void {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const prevBackground = scene.background
    const prevFog = scene.fog
    scene.background = background
    scene.fog = fog
    return () => {
      scene.background = prevBackground
      scene.fog = prevFog
    }
  }, [scene, background, fog])
}
