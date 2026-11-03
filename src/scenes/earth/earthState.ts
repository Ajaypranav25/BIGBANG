import { glacialIndex, moonDistanceKm } from '../../data/telemetry'
import { interpolate, smoothstep, type Anchor } from '../../lib/interpolate'
import { PALEO_SITES } from './geo'

/**
 * Appearance of the globe as a function of real time (`yearsAgo`) plus chapter-local
 * choreography (camera, impact sequence). Geological windows cite ICS / standard reviews.
 */
export interface EarthState {
  /** 0 = procedural Precambrian cratons, 1 = GPlates reconstruction */
  paleo: number
  /** land fraction for procedural continents */
  protoLand: number
  /** blend toward the modern Blue Marble texture */
  modern: number
  magma: number
  ocean: number
  /** iron-rich green Archean ocean tint */
  archean: number
  /** orange organic haze (Archean methane) */
  haze: number
  /** equatorward edge of polar ice, degrees */
  iceNorth: number
  iceSouth: number
  vegetation: number
  /** night-side city lights (Black Marble) */
  nightLights: number
  settlements: number
  impactRing: number
  fire: number
  dust: number
  traps: number
  trapsSite: [number, number]
  moonVisible: number
  /** Earth radii, compressed for display */
  moonDistance: number
}

const NO_ICE = 90

/** [Ma, latitude of ice edge] — negative-going windows for each glaciation. */
function iceEdge(ma: number): { north: number; south: number } {
  const windows: Array<[number, number, number]> = [
    // [start Ma, end Ma, ice edge latitude]
    [2900, 2850, 55], // Pongola
    [2450, 2220, 15], // Huronian (possible snowball)
    [717, 660, 0], // Sturtian snowball (ICS Cryogenian)
    [650, 635, 0], // Marinoan snowball
    [581, 579, 55], // Gaskiers
    [445.2, 443.8, 50], // Hirnantian
  ]
  let north = NO_ICE
  let south = NO_ICE
  for (const [start, end, edge] of windows) {
    const ramp = Math.min(3, (start - end) * 0.15)
    const k = smoothstep(start, start - ramp, ma) * smoothstep(end - ramp, end, ma)
    north = Math.min(north, NO_ICE - (NO_ICE - edge) * k)
    south = Math.min(south, NO_ICE - (NO_ICE - edge) * k)
  }
  // Late Paleozoic Ice Age (Gondwana, southern polar) ~ 340–285 Ma
  const lpia = smoothstep(345, 330, ma) * smoothstep(280, 295, ma)
  south = Math.min(south, NO_ICE - 35 * lpia)
  // Antarctic ice sheet since the Eocene–Oligocene transition, 33.9 Ma
  const antarctic = smoothstep(34.5, 33.5, ma)
  south = Math.min(south, NO_ICE - 25 * antarctic)
  // Northern Hemisphere glaciation intensifies ~2.7 Ma
  const nhg = smoothstep(3.0, 2.6, ma)
  north = Math.min(north, NO_ICE - 18 * nhg)
  return { north, south }
}

const PROTO_LAND: readonly Anchor[] = [
  [1000, 0.28],
  [1800, 0.24],
  [2500, 0.16],
  [3500, 0.06],
  [4300, 0.02],
  [4540, 0],
]

const VEGETATION: readonly Anchor[] = [
  [0, 1],
  [300, 1],
  [360, 0.9],
  [420, 0.25],
  [470, 0.05],
  [480, 0],
]

function moonDisplayRadii(yearsAgo: number): number {
  const km = moonDistanceKm(yearsAgo) ?? 384_400
  return 2.4 + (km / 384_400) * 7.5
}

export function earthState(yearsAgo: number, chapterId: string, u: number): EarthState {
  const ma = yearsAgo / 1e6
  const ice = iceEdge(ma)
  const glacial = glacialIndex(yearsAgo)
  const iceNorth = Math.min(ice.north, NO_ICE - (18 + 30 * glacial) * smoothstep(3.0, 2.6, ma))
  const year = 2026 - yearsAgo

  const impact = chapterId === 'impact'
  const strike = 0.285
  const sinceStrike = impact ? u - strike : -1

  return {
    paleo: smoothstep(1100, 1000, ma),
    protoLand: interpolate(PROTO_LAND, ma),
    modern: 1 - smoothstep(0.4, 12, ma),
    magma: smoothstep(4350, 4460, ma),
    ocean: smoothstep(4440, 4300, ma),
    archean: smoothstep(1800, 2600, ma),
    haze: smoothstep(3600, 3300, ma) * smoothstep(2380, 2460, ma),
    iceNorth,
    iceSouth: ice.south,
    vegetation: interpolate(VEGETATION, ma),
    nightLights: smoothstep(1880, 2020, year),
    settlements: smoothstep(11_000, 9_000, yearsAgo),
    impactRing: sinceStrike >= 0 ? Math.min(1, sinceStrike / 0.18) : 0,
    fire: sinceStrike >= 0 ? smoothstep(0, 0.04, sinceStrike) * (1 - smoothstep(0.12, 0.3, sinceStrike)) : 0,
    dust: impact ? smoothstep(0.06, 0.22, sinceStrike) * (1 - smoothstep(0.4, 0.7, sinceStrike)) : 0,
    traps: Math.max(
      smoothstep(253.5, 252.2, ma) * smoothstep(250.5, 251.6, ma),
      smoothstep(66.6, 66.2, ma) * smoothstep(65.4, 65.8, ma),
    ),
    trapsSite: ma > 150 ? PALEO_SITES.siberianTraps252 : PALEO_SITES.deccan66,
    moonVisible: smoothstep(4510, 4490, ma),
    moonDistance: moonDisplayRadii(yearsAgo),
  }
}

/** Chapter-local beats for the Theia impact (chapter `hadean`). */
export const THEIA = { approach: [0, 0.056] as const, strike: 0.056, coalesce: [0.065, 0.22] as const }
/** Chapter-local beats for Chicxulub (chapter `impact`). */
export const CHICXULUB = { approach: [0.05, 0.285] as const, strike: 0.285 }
