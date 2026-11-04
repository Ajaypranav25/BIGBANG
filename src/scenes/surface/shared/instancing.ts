import {
  type BufferGeometry,
  Color,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  type Material,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'

export interface Placement {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotY?: number
  /** small lean, radians, applied around X then Z */
  readonly tilt?: readonly [number, number]
  readonly scale?: number
  /** non-uniform scale multiplier */
  readonly stretch?: readonly [number, number, number]
  /** (appearAt, vanishAt) in chapter-local progress — needs lifePatch */
  readonly life?: readonly [number, number]
  /** (radius, angular speed, phase, bob) — needs wanderPatch */
  readonly motion?: readonly [number, number, number, number]
  readonly color?: Color
}

const ALWAYS: readonly [number, number] = [-1, 2]

/**
 * Build an InstancedMesh from placements. An `aLife` attribute is always added, and `aMotion` when any
 * placement moves (the geometry must be exclusive to this mesh).
 */
export function makeInstanced(geometry: BufferGeometry, material: Material, list: readonly Placement[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, list.length))
  mesh.count = list.length
  const m = new Matrix4()
  const q = new Quaternion()
  const e = new Euler()
  const p = new Vector3()
  const s = new Vector3()
  const usesMotion = list.some((it) => it.motion)
  const life = new Float32Array(Math.max(1, list.length) * 2)
  const motion = new Float32Array(Math.max(1, list.length) * 4)

  list.forEach((it, i) => {
    const tilt = it.tilt ?? [0, 0]
    e.set(tilt[0], it.rotY ?? 0, tilt[1], 'YXZ')
    q.setFromEuler(e)
    const k = it.scale ?? 1
    const st = it.stretch ?? [1, 1, 1]
    s.set(k * st[0], k * st[1], k * st[2])
    p.set(it.x, it.y, it.z)
    mesh.setMatrixAt(i, m.compose(p, q, s))
    if (it.color) mesh.setColorAt(i, it.color)
    life.set(it.life ?? ALWAYS, i * 2)
    if (it.motion) motion.set(it.motion, i * 4)
  })

  // always present (defaults to "always visible") so any material may use lifePatch
  geometry.setAttribute('aLife', new InstancedBufferAttribute(life, 2))
  if (usesMotion) geometry.setAttribute('aMotion', new InstancedBufferAttribute(motion, 4))
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  // vertex shaders move instances (sway / wander), so CPU culling would be wrong
  mesh.frustumCulled = false
  return mesh
}

/** Dispose an instanced mesh together with its geometry and material(s). */
export function disposeMesh(mesh: InstancedMesh): void {
  mesh.geometry.dispose()
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const mat of mats) mat.dispose()
  mesh.dispose()
}

/** Instance-count multiplier per quality tier. */
export const DENSITY = { low: 0.3, medium: 0.6, high: 1 } as const

export const scaled = (base: number, quality: keyof typeof DENSITY): number => Math.max(1, Math.round(base * DENSITY[quality]))
