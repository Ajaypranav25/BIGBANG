import { useFrame } from '@react-three/fiber'
import { moment } from '../../rig'

/**
 * Uniform objects shared by every patched surface material. A single object instance is
 * referenced from all shaders, so updating `.value` once per frame animates everything.
 */
export const surfaceUniforms = {
  uTime: { value: 0 },
  /** chapter-local progress 0…1 — drives what grows, appears and vanishes */
  uLocal: { value: 0 },
}

export function useSurfaceClock(): void {
  useFrame(() => {
    const m = moment()
    surfaceUniforms.uTime.value = m.elapsed
    surfaceUniforms.uLocal.value = m.local
  })
}
