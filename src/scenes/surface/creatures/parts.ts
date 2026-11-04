import { type BufferGeometry, Color, DoubleSide, MeshStandardMaterial } from 'three'
import { paint } from '../shared/geometry'
import { createNoise2D } from '../shared/noise2d'

const mottleNoise = createNoise2D(4242)

/**
 * Countershading (dark back, pale belly) with soft mottling — the colouring pattern most
 * reconstructions infer for large dinosaurs (e.g. Psittacosaurus, Borealopelta pigment studies).
 */
export function countershade(g: BufferGeometry, back: string, belly: string, mottle = 0.16): BufferGeometry {
  const b = new Color(back)
  const w = new Color(belly)
  const out = new Color()
  return paint(g, (p, n) => {
    const t = Math.min(1, Math.max(0, (n.y + 0.35) / 0.9))
    const m = 1 + mottle * mottleNoise(p.x * 1.7 + p.y * 0.6, p.z * 1.7 - p.y * 0.4)
    return out.copy(w).lerp(b, t * t * (3 - 2 * t)).multiplyScalar(m)
  })
}

export function skinMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 })
}

export function membraneMaterial(color: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(color), roughness: 0.7, metalness: 0, side: DoubleSide })
}
