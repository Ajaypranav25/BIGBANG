import { createRng, gaussian } from '../../lib/random'

/** Particle roles inside the galaxy stage. */
export const KIND = { bulge: 0, arm: 1, disk: 2, halo: 3, satellite: 4, nebula: 5, field: 6 } as const

export const WEB_RADIUS = 34
export const GALAXY_RADIUS = 13
/** Sun's galactocentric radius ≈ 8.2 kpc of a ≈ 15 kpc stellar disk (GRAVITY 2019) */
export const SUN_GALACTIC_RADIUS = (8.2 / 15) * GALAXY_RADIUS

export interface CosmosBuffers {
  count: number
  seed: Float32Array // vec4
  ball: Float32Array // vec3
  web: Float32Array // vec3
  galaxy: Float32Array // vec3
  kind: Float32Array // float
  nodes: Float32Array // vec3 × nodeCount
  nodeCount: number
}

const NODE_COUNT = 72
const NEIGHBOURS = 3
const FIELD_FRACTION = 0.22
const ARM_COUNT = 4
const ARM_PITCH_DEG = 12.5
const DISK_SCALE_LENGTH = 2.7

function makeNodes(rng: () => number): Float32Array {
  const nodes = new Float32Array(NODE_COUNT * 3)
  for (let i = 0; i < NODE_COUNT; i++) {
    // keep the first node at the centre: that is where our galaxy will form
    const r = i === 0 ? 0 : WEB_RADIUS * Math.cbrt(rng())
    const th = rng() * Math.PI * 2
    const ph = Math.acos(2 * rng() - 1)
    nodes[i * 3] = r * Math.sin(ph) * Math.cos(th)
    nodes[i * 3 + 1] = r * Math.cos(ph) * 0.8
    nodes[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
  }
  return nodes
}

function makeEdges(nodes: Float32Array): Array<[number, number]> {
  const edges: Array<[number, number]> = []
  const seen = new Set<string>()
  for (let i = 0; i < NODE_COUNT; i++) {
    const dists: Array<[number, number]> = []
    for (let j = 0; j < NODE_COUNT; j++) {
      if (i === j) continue
      const dx = nodes[i * 3] - nodes[j * 3]
      const dy = nodes[i * 3 + 1] - nodes[j * 3 + 1]
      const dz = nodes[i * 3 + 2] - nodes[j * 3 + 2]
      dists.push([dx * dx + dy * dy + dz * dz, j])
    }
    dists.sort((a, b) => a[0] - b[0])
    for (const [, j] of dists.slice(0, NEIGHBOURS)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([i, j])
      }
    }
  }
  return edges
}

function webPoint(rng: () => number, nodes: Float32Array, edges: Array<[number, number]>, field: boolean): [number, number, number] {
  const roll = rng()
  if (field || roll < 0.32) {
    // halo around a node; field particles cluster tighter (they become distant galaxies)
    const n = Math.floor(rng() * NODE_COUNT)
    const s = field ? 0.55 : 1.4
    return [nodes[n * 3] + gaussian(rng) * s, nodes[n * 3 + 1] + gaussian(rng) * s, nodes[n * 3 + 2] + gaussian(rng) * s]
  }
  if (roll < 0.9) {
    const [a, b] = edges[Math.floor(rng() * edges.length)]
    const t = rng()
    const s = 0.55
    return [
      nodes[a * 3] + (nodes[b * 3] - nodes[a * 3]) * t + gaussian(rng) * s,
      nodes[a * 3 + 1] + (nodes[b * 3 + 1] - nodes[a * 3 + 1]) * t + gaussian(rng) * s,
      nodes[a * 3 + 2] + (nodes[b * 3 + 2] - nodes[a * 3 + 2]) * t + gaussian(rng) * s,
    ]
  }
  // sparse voids
  return [(rng() * 2 - 1) * WEB_RADIUS, (rng() * 2 - 1) * WEB_RADIUS * 0.8, (rng() * 2 - 1) * WEB_RADIUS]
}

function armPoint(rng: () => number, tight: boolean): [number, number, number] {
  const tanPitch = Math.tan((ARM_PITCH_DEG * Math.PI) / 180)
  const r = Math.min(GALAXY_RADIUS, 1.6 + -Math.log(Math.max(rng(), 1e-6)) * DISK_SCALE_LENGTH)
  const arm = Math.floor(rng() * ARM_COUNT)
  // major arms (0, 2: Scutum–Centaurus, Perseus) are denser than minor arms
  const major = arm % 2 === 0 || rng() < 0.35
  const base = Math.log(r / 1.6) / tanPitch + (arm * Math.PI * 2) / ARM_COUNT
  const spread = (tight ? 0.05 : major ? 0.22 : 0.32) * (1 + 0.4 * rng())
  const th = base + gaussian(rng) * spread
  const thick = 0.12 * Math.exp(-r / 9) + 0.04
  return [r * Math.cos(th), gaussian(rng) * thick, r * Math.sin(th)]
}

function galaxyPoint(rng: () => number, kind: number): [number, number, number] {
  switch (kind) {
    case KIND.bulge: {
      if (rng() < 0.55) {
        // the bar: ~5 kpc long, tilted ~27° to the Sun–centre line
        const x = gaussian(rng) * 1.7
        const z = gaussian(rng) * 0.55
        const a = 0.47
        return [x * Math.cos(a) - z * Math.sin(a), gaussian(rng) * 0.35, x * Math.sin(a) + z * Math.cos(a)]
      }
      return [gaussian(rng) * 0.9, gaussian(rng) * 0.65, gaussian(rng) * 0.9]
    }
    case KIND.arm:
      return armPoint(rng, false)
    case KIND.nebula:
      return armPoint(rng, true)
    case KIND.disk: {
      const r = Math.min(GALAXY_RADIUS, -Math.log(Math.max(rng(), 1e-6)) * DISK_SCALE_LENGTH * 1.2)
      const th = rng() * Math.PI * 2
      return [r * Math.cos(th), gaussian(rng) * 0.18, r * Math.sin(th)]
    }
    default: {
      // halo (and where merged satellite stars end up)
      const r = GALAXY_RADIUS * 1.1 * Math.cbrt(rng())
      const th = rng() * Math.PI * 2
      const ph = Math.acos(2 * rng() - 1)
      return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)]
    }
  }
}

function pickKind(r: number): number {
  if (r < 0.16) return KIND.bulge
  if (r < 0.62) return KIND.arm
  if (r < 0.8) return KIND.disk
  if (r < 0.86) return KIND.halo
  if (r < 0.93) return KIND.satellite
  return KIND.nebula
}

export function generateCosmos(count: number, seed = 1377): CosmosBuffers {
  const rng = createRng(seed)
  const nodes = makeNodes(rng)
  const edges = makeEdges(nodes)
  const out: CosmosBuffers = {
    count,
    seed: new Float32Array(count * 4),
    ball: new Float32Array(count * 3),
    web: new Float32Array(count * 3),
    galaxy: new Float32Array(count * 3),
    kind: new Float32Array(count),
    nodes,
    nodeCount: NODE_COUNT,
  }
  for (let i = 0; i < count; i++) {
    const s = [rng(), rng(), rng(), rng()]
    out.seed.set(s, i * 4)

    const r = Math.cbrt(rng())
    const th = rng() * Math.PI * 2
    const ph = Math.acos(2 * rng() - 1)
    out.ball.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3)

    const field = s[3] < FIELD_FRACTION
    out.web.set(webPoint(rng, nodes, edges, field), i * 3)

    const kind = field ? KIND.field : pickKind(rng())
    out.kind[i] = kind
    out.galaxy.set(galaxyPoint(rng, kind === KIND.satellite ? KIND.halo : kind), i * 3)
  }
  return out
}
