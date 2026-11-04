import { type BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, OctahedronGeometry, Vector3 } from 'three'
import { aim, paint, type V3 } from '../shared/geometry'
import type { QuadSpec } from './Quadruped'

/** Generic long-necked sauropod (~24 m incl. tail), neck raised like a brachiosaurid. */
export const SAUROPOD: QuadSpec = {
  body: { size: [1.6, 2.0, 3.8], center: [0, 5.0, 0] },
  tail: {
    anchor: [0, 5.3, -3.0],
    points: [[0, 0, 0], [0, -0.5, -3.5], [0, -1.6, -7], [0, -2.6, -10.5], [0, -3.0, -13.5]],
    r0: 1.35,
    r1: 0.06,
  },
  neck: {
    anchor: [0, 5.7, 3.0],
    points: [[0, 0, 0], [0, 1.4, 1.9], [0, 3.4, 3.6], [0, 5.2, 4.8], [0, 6.2, 5.5]],
    r0: 1.15,
    r1: 0.32,
    head: [0.32, 0.36, 0.75],
    headOffset: [0, 0.05, 0.55],
  },
  front: { x: 1.05, y: 4.4, z: 2.3, length: 4.4, radius: 0.5 },
  hind: { x: 1.1, y: 4.6, z: -2.0, length: 4.6, radius: 0.58 },
  back: '#6d6658',
  belly: '#b8aa8c',
  stride: 0.32,
  swing: 0.26,
  graze: 0.45,
}

const PLATE_COLOR = new Color('#9a4a2c')
const SPIKE_COLOR = new Color('#d9ccb0')

function plate(h: number, x: number, y: number, z: number, lean: number): BufferGeometry {
  const g = new OctahedronGeometry(1, 0).scale(0.05, h, h * 0.78)
  g.rotateX(lean)
  g.translate(x, y + h * 0.55, z)
  return paint(g, PLATE_COLOR)
}

function spike(at: V3, dir: V3, length: number, radius: number, color: Color): BufferGeometry {
  const g = new ConeGeometry(radius, length, 10).translate(0, length / 2, 0)
  return paint(aim(g, new Vector3(...dir), at), color)
}

/** Stegosaurus (~8 m): two rows of alternating plates and a four-spike thagomizer. */
export const STEGOSAUR: QuadSpec = {
  body: { size: [0.95, 1.25, 2.3], center: [0, 2.3, -0.3] },
  tail: {
    anchor: [0, 2.4, -2.2],
    points: [[0, 0, 0], [0, 0.0, -1.5], [0, -0.4, -3.0], [0, -0.8, -4.2]],
    r0: 0.75,
    r1: 0.08,
  },
  neck: {
    anchor: [0, 2.0, 1.7],
    points: [[0, 0, 0], [0, -0.25, 0.7], [0, -0.55, 1.3]],
    r0: 0.5,
    r1: 0.28,
    head: [0.2, 0.22, 0.48],
    headOffset: [0, -0.05, 0.38],
  },
  front: { x: 0.6, y: 1.6, z: 1.3, length: 1.6, radius: 0.24 },
  hind: { x: 0.65, y: 2.3, z: -1.3, length: 2.3, radius: 0.33 },
  back: '#56653f',
  belly: '#c4b78f',
  stride: 0.5,
  swing: 0.3,
  graze: 0.35,
  extras: () => {
    const body: BufferGeometry[] = []
    // must match STEGOSAUR.body (centre y/z, radii y/z)
    const cy = 2.3
    const cz = -0.3
    const ry = 1.25
    const rz = 2.3
    const count = 11
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1)
      const z = 1.5 - u * 3.6
      const dz = (z - cz) / rz
      const top = cy + ry * Math.sqrt(Math.max(0, 1 - dz * dz))
      const h = 0.25 + 0.6 * Math.sin(Math.PI * (0.15 + u * 0.75))
      body.push(plate(h, i % 2 === 0 ? 0.13 : -0.13, top - 0.1, z, 0.12))
    }
    const tailCurve = new CatmullRomCurve3(
      [[0, 0, 0], [0, 0.0, -1.5], [0, -0.4, -3.0], [0, -0.8, -4.2]].map((p) => new Vector3(...(p as [number, number, number]))),
    )
    const tail: BufferGeometry[] = []
    for (let i = 0; i < 5; i++) {
      const t = 0.08 + i * 0.13
      const p = tailCurve.getPointAt(t)
      const r = 0.75 + (0.08 - 0.75) * Math.pow(t, 0.85)
      tail.push(plate(0.38 - i * 0.06, i % 2 === 0 ? 0.08 : -0.08, p.y + r * 0.9, p.z, 0.25))
    }
    const tip = tailCurve.getPointAt(0.88)
    for (const side of [-1, 1]) {
      tail.push(spike([side * 0.12, tip.y + 0.1, tip.z + 0.3], [side * 0.85, 0.45, -0.35], 0.75, 0.06, SPIKE_COLOR))
      tail.push(spike([side * 0.1, tip.y + 0.08, tip.z - 0.2], [side * 0.8, 0.5, -0.45], 0.65, 0.05, SPIKE_COLOR))
    }
    return { body, tail }
  },
}

const FRILL_COLOR = new Color('#8b4a2e')
const HORN_COLOR = new Color('#ddd2b6')

/** Triceratops horridus (~8.5 m): bony frill, two brow horns and a nasal horn. */
export const CERATOPSIAN: QuadSpec = {
  body: { size: [1.25, 1.45, 2.4], center: [0, 2.2, -0.2] },
  tail: {
    anchor: [0, 2.3, -2.3],
    points: [[0, 0, 0], [0, -0.3, -1.4], [0, -0.8, -2.8]],
    r0: 0.65,
    r1: 0.08,
  },
  neck: {
    anchor: [0, 2.25, 1.9],
    points: [[0, 0, 0], [0, -0.1, 0.6]],
    r0: 0.75,
    r1: 0.7,
    head: [0.7, 0.72, 1.15],
    headOffset: [0, -0.25, 0.9],
  },
  front: { x: 0.8, y: 1.5, z: 1.4, length: 1.5, radius: 0.3 },
  hind: { x: 0.85, y: 1.9, z: -1.4, length: 1.9, radius: 0.36 },
  back: '#6b5843',
  belly: '#c0a885',
  stride: 0.55,
  swing: 0.32,
  graze: 0.3,
  extras: () => {
    const frill = new CylinderGeometry(1.25, 1.1, 0.14, 28).rotateX(Math.PI / 2).rotateX(-0.55).translate(0, 0.55, 0.45)
    const neck: BufferGeometry[] = [paint(frill, FRILL_COLOR)]
    for (const side of [-1, 1]) {
      neck.push(spike([side * 0.32, 0.2, 1.55], [side * 0.12, 0.42, 1], 1.05, 0.11, HORN_COLOR))
    }
    neck.push(spike([0, -0.15, 2.45], [0, 0.65, 0.45], 0.38, 0.09, HORN_COLOR))
    return { neck }
  },
}
