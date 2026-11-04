import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type V3 = readonly [number, number, number]

const WORLD_UP = new Vector3(0, 1, 0)

/** Part ids understood by `barkPatch`. */
export const PART = { lycopsid: 0, foliage: 1, ribbed: 2, plain: 3 } as const

/**
 * A tube along a smooth curve whose cross-section is an ellipse that can vary along its length.
 * `radius(t)` returns [width, height] half-axes. The cross-section's width axis stays horizontal,
 * which suits necks, tails and bodies modelled in the YZ plane.
 */
export function variableTube(
  points: readonly V3[],
  segments: number,
  radial: number,
  radius: (t: number) => readonly [number, number],
): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'centripetal')
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const P = new Vector3()
  const T = new Vector3()
  const side = new Vector3()
  const up = new Vector3()
  const n = new Vector3()
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    curve.getPointAt(t, P)
    curve.getTangentAt(t, T)
    side.crossVectors(T, WORLD_UP)
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
    side.normalize()
    up.crossVectors(side, T).normalize()
    const [rw, rh] = radius(t)
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      pos.push(P.x + side.x * c * rw + up.x * s * rh, P.y + side.y * c * rw + up.y * s * rh, P.z + side.z * c * rw + up.z * s * rh)
      n.copy(side).multiplyScalar(c / Math.max(rw, 1e-4)).addScaledVector(up, s / Math.max(rh, 1e-4)).normalize()
      nor.push(n.x, n.y, n.z)
      uv.push(j / radial, t)
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j
      const b = (i + 1) * (radial + 1) + j
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  orientOutward(pos, nor, idx)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** Flip triangle winding if the faces point against the supplied vertex normals. */
function orientOutward(pos: number[], nor: number[], idx: number[]): void {
  let score = 0
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const f = new Vector3()
  const sample = Math.min(idx.length / 3, 64)
  for (let t = 0; t < sample; t++) {
    const k = Math.floor((t / sample) * (idx.length / 3)) * 3
    a.fromArray(pos, idx[k] * 3)
    b.fromArray(pos, idx[k + 1] * 3)
    c.fromArray(pos, idx[k + 2] * 3)
    f.subVectors(b, a).cross(c.sub(a))
    score += f.dot(new Vector3().fromArray(nor, idx[k] * 3))
  }
  if (score < 0) {
    for (let k = 0; k < idx.length; k += 3) {
      const tmp = idx[k + 1]
      idx[k + 1] = idx[k + 2]
      idx[k + 2] = tmp
    }
  }
}

export function ellipsoid(rx: number, ry: number, rz: number, w = 16, h = 12): BufferGeometry {
  return new SphereGeometry(1, w, h).scale(rx, ry, rz)
}

/** Cylinder standing on y = 0 (or hanging below y = 0 when `hang`). */
export function column(rTop: number, rBottom: number, height: number, radial = 10, rows = 1, hang = false): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, height, radial, rows)
  return g.translate(0, hang ? -height / 2 : height / 2, 0)
}

/** Orient a +Y-pointing geometry along `dir` and move it to `at`. */
export function aim(g: BufferGeometry, dir: Vector3, at: Vector3 | V3): BufferGeometry {
  const q = new Quaternion().setFromUnitVectors(WORLD_UP, dir.clone().normalize())
  const p = at instanceof Vector3 ? at : new Vector3(...at)
  return g.applyMatrix4(new Matrix4().compose(p, q, new Vector3(1, 1, 1)))
}

export function place(g: BufferGeometry, at: V3, rot: V3 = [0, 0, 0]): BufferGeometry {
  g.rotateX(rot[0]).rotateY(rot[1]).rotateZ(rot[2])
  return g.translate(at[0], at[1], at[2])
}

/** Vertex colours: a flat colour or a function of position and normal. */
export function paint(g: BufferGeometry, color: Color | ((p: Vector3, n: Vector3) => Color)): BufferGeometry {
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  const out = new Float32Array(pos.count * 3)
  const p = new Vector3()
  const n = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    const c =
      typeof color === 'function'
        ? color(p.fromBufferAttribute(pos, i), nor ? n.fromBufferAttribute(nor, i) : n.set(0, 1, 0))
        : color
    out[i * 3] = c.r
    out[i * 3 + 1] = c.g
    out[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(out, 3))
  return g
}

export function tagPart(g: BufferGeometry, part: number): BufferGeometry {
  g.setAttribute('aPart', new BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(part), 1))
  return g
}

/** Scale UVs (e.g. so bark patterns keep their aspect on tall trunks). */
export function scaleUv(g: BufferGeometry, su: number, sv: number): BufferGeometry {
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
  return g
}

const KEEP = ['position', 'normal', 'uv', 'color', 'aPart'] as const

/**
 * Merge heterogeneous pieces into one geometry. Each piece is de-indexed and given the same
 * attribute set (missing colour → white, missing part → plain). Inputs are disposed.
 */
export function mergeParts(pieces: readonly BufferGeometry[]): BufferGeometry {
  const prepared = pieces.map((src) => {
    const g = src.index ? src.toNonIndexed() : src.clone()
    const count = g.getAttribute('position').count
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    if (!g.getAttribute('uv')) g.setAttribute('uv', new BufferAttribute(new Float32Array(count * 2), 2))
    if (!g.getAttribute('color')) g.setAttribute('color', new BufferAttribute(new Float32Array(count * 3).fill(1), 3))
    if (!g.getAttribute('aPart')) tagPart(g, PART.plain)
    for (const name of Object.keys(g.attributes)) {
      if (!(KEEP as readonly string[]).includes(name)) g.deleteAttribute(name)
    }
    g.morphAttributes = {}
    return g
  })
  const merged = mergeGeometries(prepared, false)
  for (const g of prepared) g.dispose()
  for (const g of pieces) g.dispose()
  if (!merged) throw new Error('mergeParts: incompatible geometries')
  return merged
}

/**
 * A fern/cycad frond: a drooping strip along +Z with a zig-zag leaflet edge.
 * Double-sided material recommended.
 */
export function frond(length: number, width: number, droop: number, segments = 14, leaflets = 9): BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  const uv: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const z = length * t
    const y = length * (0.4 * t - droop * t * t)
    const zig = 0.55 + 0.45 * Math.abs(Math.sin(t * leaflets * Math.PI))
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(t * 1.08, 1)), 0.7) * zig
    pos.push(-w, y - w * 0.18, z, 0, y + width * 0.05, z, w, y - w * 0.18, z)
    uv.push(0, t, 0.5, t, 1, t)
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 3
    const b = (i + 1) * 3
    idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** A rosette of fronds radiating from the origin, tilted up by `lift` radians. */
export function rosette(count: number, length: number, width: number, droop: number, lift: number, jitter: () => number): BufferGeometry[] {
  const out: BufferGeometry[] = []
  for (let i = 0; i < count; i++) {
    const f = frond(length * (0.8 + 0.4 * jitter()), width, droop)
    f.rotateX(-lift - 0.25 * jitter())
    f.rotateY((i / count) * Math.PI * 2 + jitter() * 0.4)
    out.push(f)
  }
  return out
}

/** A single grass blade standing on y = 0, tapering and curving toward +Z. */
export function grassBlade(height: number, width: number): BufferGeometry {
  const g = new PlaneGeometry(width, height, 1, 4).translate(0, height / 2, 0)
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    // clamp: float error leaves the base at -1e-17, and a negative base to a fractional power is NaN
    const y = Math.min(1, Math.max(0, p.getY(i) / height))
    p.setX(i, p.getX(i) * (1 - Math.pow(y, 1.4) * 0.92))
    p.setZ(i, y * y * height * 0.22)
  }
  g.computeVertexNormals()
  return g
}

/**
 * Lumpy blob (rocks, canopies, coral mounds): a sphere-ish geometry radially displaced by noise.
 * Vertices are welded first so the result shades smoothly. The input is disposed.
 */
export function lumpy(base: BufferGeometry, amount: number, noise: (x: number, y: number, z: number) => number): BufferGeometry {
  const stripped = base.clone()
  stripped.deleteAttribute('normal')
  stripped.deleteAttribute('uv')
  const g = mergeVertices(stripped)
  stripped.dispose()
  base.dispose()
  const p = g.getAttribute('position')
  const v = new Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    v.multiplyScalar(1 + amount * noise(v.x, v.y, v.z))
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}
