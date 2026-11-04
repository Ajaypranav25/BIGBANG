/**
 * Procedural Paleozoic marine fauna & reef builders. All geometries face +Z, sit on y = 0 where
 * relevant, and carry vertex colours (tinted further by instance colours).
 */
import { type BufferGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, LatheGeometry, Vector2, Vector3 } from 'three'
import { aim, ellipsoid, lumpy, mergeParts, paint, variableTube } from '../shared/geometry'
import { createNoise2D } from '../shared/noise2d'

const shellNoise = createNoise2D(91)

/** Trilobite ≈ 1.6 units long: domed cephalon with eyes and genal spines, segmented thorax, pygidium. */
export function trilobite(): BufferGeometry {
  const shell = new Color('#8a6a48')
  const ridge = new Color('#5b4330')
  const eye = new Color('#2a221c')
  const parts: BufferGeometry[] = [
    paint(ellipsoid(0.5, 0.12, 0.72, 18, 8).translate(0, 0.08, -0.05), shell),
    paint(ellipsoid(0.15, 0.17, 0.72, 10, 8).translate(0, 0.12, -0.05), ridge),
    paint(ellipsoid(0.56, 0.16, 0.36, 18, 8).translate(0, 0.09, 0.45), shell),
    paint(ellipsoid(0.17, 0.2, 0.25, 10, 8).translate(0, 0.14, 0.52), ridge),
    paint(ellipsoid(0.26, 0.09, 0.2, 12, 6).translate(0, 0.07, -0.72), shell),
  ]
  for (let i = 0; i < 9; i++) {
    const z = 0.22 - i * 0.095
    const w = 0.5 * Math.sqrt(Math.max(0.05, 1 - Math.pow((z + 0.05) / 0.75, 2)))
    parts.push(paint(new CylinderGeometry(0.028, 0.028, w * 2, 6).rotateZ(Math.PI / 2).translate(0, 0.14, z), ridge))
  }
  for (const s of [-1, 1]) {
    parts.push(paint(ellipsoid(0.06, 0.06, 0.06, 8, 6).translate(s * 0.22, 0.22, 0.5), eye))
    parts.push(paint(aim(new ConeGeometry(0.04, 0.55, 6).translate(0, 0.275, 0), new Vector3(s * 0.25, -0.05, -1), [s * 0.52, 0.06, 0.32]), shell))
  }
  return mergeParts(parts)
}

/** Orthocone nautiloid (straight-shelled cephalopod) ≈ 2 units: banded cone shell + tentacles, facing +Z. */
export function orthocone(): BufferGeometry {
  const shell = new ConeGeometry(0.16, 1.7, 16, 24, true).rotateX(-Math.PI / 2).translate(0, 0, -0.85 + 0.1)
  const light = new Color('#d8c3a0')
  const band = new Color('#7a4a2e')
  paint(shell, (p) => (Math.sin(p.z * 26 + shellNoise(p.z * 3, 0.5) * 2) > 0.35 ? band : light))
  const body = new Color('#b7836a')
  const parts: BufferGeometry[] = [shell, paint(ellipsoid(0.15, 0.15, 0.2, 14, 10).translate(0, 0, 0.18), body)]
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const dir = new Vector3(Math.cos(a) * 0.35, Math.sin(a) * 0.35 - 0.1, 1)
    parts.push(paint(aim(new ConeGeometry(0.018, 0.45, 5).translate(0, 0.225, 0), dir, [Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.3]), body))
  }
  for (const s of [-1, 1]) parts.push(paint(ellipsoid(0.035, 0.035, 0.035, 8, 6).translate(s * 0.13, 0.05, 0.22), new Color('#1c1612')))
  return mergeParts(parts)
}

/** Jawless armoured fish (arandaspid-like) ≈ 0.5 units, facing +Z. */
export function jawlessFish(): BufferGeometry {
  const armor = new Color('#7d8a8c')
  const belly = new Color('#d6dad2')
  const body = variableTube([[0, 0, 0.22], [0, 0, 0.05], [0, 0, -0.12], [0, 0.01, -0.26]], 12, 10, (t) => {
    const r = t < 0.4 ? 0.07 : 0.07 * (1 - (t - 0.4) / 0.6) + 0.008
    return [r * 0.85, r]
  })
  paint(body, (_p, n) => (n.y > -0.2 ? armor : belly))
  const tail = new ConeGeometry(0.07, 0.14, 4).scale(0.15, 1, 1).rotateX(Math.PI / 2).translate(0, 0.01, -0.31)
  const eyes = [-1, 1].map((s) => paint(ellipsoid(0.014, 0.014, 0.014, 6, 4).translate(s * 0.045, 0.02, 0.17), new Color('#101010')))
  return mergeParts([body, paint(tail, armor), ...eyes])
}

/** Crinoid "sea lily": beaded stalk, cup-shaped calyx and ten feathery arms opening upward. */
export function crinoid(): BufferGeometry {
  const stalk = new CylinderGeometry(0.012, 0.016, 0.9, 6, 18).translate(0, 0.45, 0)
  paint(stalk, (p) => new Color(Math.sin(p.y * 160) > 0 ? '#e0d6c2' : '#b8a993'))
  const calyx = paint(new ConeGeometry(0.05, 0.09, 10).rotateX(Math.PI).translate(0, 0.94, 0), new Color('#e8dccb'))
  const parts: BufferGeometry[] = [stalk, calyx]
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const out = new Vector3(Math.cos(a), 0, Math.sin(a))
    const pts = [0, 1, 2, 3].map((k) => {
      const t = k / 3
      return [out.x * (0.03 + t * 0.14), 0.97 + t * 0.2 - t * t * 0.06, out.z * (0.03 + t * 0.14)] as const
    })
    parts.push(paint(variableTube(pts, 8, 5, (t) => [0.012 * (1 - t) + 0.004, 0.02 * (1 - t) + 0.004]), new Color('#f2ece0')))
  }
  return mergeParts(parts)
}

/** Vase sponge / archaeocyathid cup (open-topped lathe). */
export function vaseSponge(height: number, flare: number): BufferGeometry {
  const pts: Vector2[] = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    pts.push(new Vector2(0.05 + flare * Math.pow(t, 1.4) + 0.02 * Math.sin(t * 12), t * height))
  }
  const g = new LatheGeometry(pts, 18)
  paint(g, (p) => new Color('#e2c88f').multiplyScalar(0.75 + 0.25 * Math.sin(p.y * 40 + Math.atan2(p.z, p.x) * 6)))
  return g
}

/** Low reef mound (stromatoporoid / tabulate-coral head) with polyp speckles. */
export function reefMound(seed: number): BufferGeometry {
  const n = createNoise2D(seed)
  const g = lumpy(new IcosahedronGeometry(1, 4), 0.35, (x, y, z) => n(x * 2.2 + z, y * 2.2 - z) * 0.6 + n(x * 6, z * 6) * 0.2)
  g.scale(1, 0.55, 1)
  const base = new Color('#b98f6b')
  const tip = new Color('#e6c9a4')
  return paint(g, (p, nn) => base.clone().lerp(tip, Math.max(0, nn.y)).multiplyScalar(0.85 + 0.25 * (n(p.x * 18, p.z * 18) > 0.4 ? 1 : 0)))
}

/** Branching tabulate/rugose coral cluster: a fan of short tapering horns. */
export function coralCluster(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const lean = new Vector3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5)
    const h = 0.25 + 0.2 * Math.abs(Math.sin(i * 2.3))
    parts.push(paint(aim(new CylinderGeometry(0.05, 0.02, h, 8).translate(0, h / 2, 0), lean, [Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05]), new Color('#d58a6a')))
  }
  return mergeParts(parts)
}
