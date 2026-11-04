import { BufferAttribute, type BufferGeometry, Color, PlaneGeometry, Vector3 } from 'three'

export interface TerrainSpec {
  readonly size: number
  readonly segments: number
  readonly height: (x: number, z: number) => number
  /** colour from position, height and slope (0 = flat, 1 = vertical) */
  readonly color: (x: number, z: number, h: number, slope: number) => Color
}

/** Height-field terrain on the XZ plane centred at the origin, with baked vertex colours. */
export function buildTerrain(spec: TerrainSpec): BufferGeometry {
  const g = new PlaneGeometry(spec.size, spec.size, spec.segments, spec.segments)
  g.rotateX(-Math.PI / 2)
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) p.setY(i, spec.height(p.getX(i), p.getZ(i)))
  g.computeVertexNormals()
  const n = g.getAttribute('normal')
  const colors = new Float32Array(p.count * 3)
  const normal = new Vector3()
  for (let i = 0; i < p.count; i++) {
    normal.fromBufferAttribute(n, i)
    const c = spec.color(p.getX(i), p.getZ(i), p.getY(i), 1 - normal.y)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  return g
}

export interface Area {
  readonly x0: number
  readonly x1: number
  readonly z0: number
  readonly z1: number
}

/** Rejection-sample up to `count` points in `area` that satisfy `accept`. */
export function scatter(rng: () => number, count: number, area: Area, accept: (x: number, z: number) => boolean = () => true): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const maxTries = count * 30
  for (let tries = 0; out.length < count && tries < maxTries; tries++) {
    const x = area.x0 + (area.x1 - area.x0) * rng()
    const z = area.z0 + (area.z1 - area.z0) * rng()
    if (accept(x, z)) out.push([x, z])
  }
  return out
}

/** Distance from (x, z) to a polyline in the XZ plane. */
export function distanceToPath(path: ReadonlyArray<readonly [number, number]>, x: number, z: number): number {
  let best = Infinity
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i]
    const [bx, bz] = path[i + 1]
    const dx = bx - ax
    const dz = bz - az
    const len2 = dx * dx + dz * dz || 1
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2))
    const px = ax + dx * t - x
    const pz = az + dz * t - z
    best = Math.min(best, Math.sqrt(px * px + pz * pz))
  }
  return best
}

export const hex = (h: string): Color => new Color(h)

/** Mix two colours into a new Color (inputs untouched). */
export const mixColor = (a: Color, b: Color, t: number): Color => a.clone().lerp(b, Math.min(1, Math.max(0, t)))
