import { smoothstep } from '../../lib/interpolate'
import { PALEO_SITES } from './geo'

/**
 * Where the camera looks on the globe. Keyframes are keyed by chapter-local progress (`u`)
 * or by real time (`y`, years ago); longitudes are pre-unwrapped so interpolation never
 * swings the long way round.
 */
export interface EarthView {
  lat: number
  lon: number
  distance: number
  /** angle (rad) between camera and Sun around the globe: 0 = full day, π = full night */
  sunAngle: number
  /** horizontal composition shift (in globe radii) — negative moves the Earth left */
  shift: number
}

type Key = readonly [number, number, number, number, number, number] // at, lat, lon, distance, sunAngle, shift

/** `descending`: keys are listed oldest-first by years-ago; negating makes them ascending. */
function sample(keys: readonly Key[], at: number, descending = false): EarthView {
  const k = keys
  const x = descending ? -at : at
  const xs = k.map((key) => (descending ? -key[0] : key[0]))
  if (x <= xs[0]) return toView(k[0])
  if (x >= xs[xs.length - 1]) return toView(k[k.length - 1])
  let i = 0
  while (i < xs.length - 2 && xs[i + 1] < x) i++
  const t = smoothstep(xs[i], xs[i + 1], x)
  const a = k[i]
  const b = k[i + 1]
  return {
    lat: a[1] + (b[1] - a[1]) * t,
    lon: a[2] + (b[2] - a[2]) * t,
    distance: a[3] + (b[3] - a[3]) * t,
    sunAngle: a[4] + (b[4] - a[4]) * t,
    shift: a[5] + (b[5] - a[5]) * t,
  }
}

const toView = (k: Key): EarthView => ({ lat: k[1], lon: k[2], distance: k[3], sunAngle: k[4], shift: k[5] })

const [cxLat, cxLon] = PALEO_SITES.chicxulub66

const BY_CHAPTER: Record<string, readonly Key[]> = {
  hadean: [
    [0, 10, 20, 11, 0.9, 0],
    [0.056, 12, 25, 7, 0.9, 0],
    [0.2, 15, 45, 5.5, 0.8, -0.35],
    [0.5, 12, 70, 3.8, 0.75, -0.45],
    [1, 10, 90, 3.5, 0.7, -0.45],
  ],
  life: [
    [0, 15, 90, 3.6, 0.7, -0.45],
    [1, 25, 170, 3.3, 0.6, -0.45],
  ],
  oxygen: [
    [0, 25, 170, 3.3, 0.6, -0.45],
    [1, -10, 260, 3.4, 0.8, -0.45],
  ],
  snowball: [
    [0, -10, 260, 3.4, 0.8, -0.45],
    [0.45, 25, 330, 3.2, 0.6, -0.45],
    [1, 5, 380, 3.3, 0.7, -0.45],
  ],
  pangaea: [
    [0, 5, 20, 3.4, 0.6, -0.45],
    [0.4, 40, 32, 3.0, 0.6, -0.4],
    [0.49, 52, 36, 2.7, 0.55, -0.35], // Siberian Traps, end-Permian (251.9 Ma)
    [0.62, 20, 40, 3.1, 0.7, -0.4],
    [1, 10, 60, 3.3, 0.7, -0.45],
  ],
  impact: [
    [0, cxLat + 10, cxLon + 40, 5.5, 0.6, 0],
    [0.27, cxLat + 5, cxLon + 12, 2.9, 0.55, 0],
    [0.45, cxLat, cxLon, 4.2, 0.6, 0],
    [1, cxLat - 5, cxLon + 50, 3.5, 0.7, -0.4],
  ],
  mammals: [
    [0, 20, -10, 3.5, 0.7, -0.45],
    [0.6, 20, 70, 3.2, 0.6, -0.45],
    [1, 5, 30, 3.2, 0.7, -0.45],
  ],
  now: [
    [0, 40, 15, 3.0, 2.0, -0.4],
    [0.3, 35, -70, 3.2, 1.9, -0.4],
    [0.6, 30, 100, 3.0, 2.1, -0.4],
    [0.88, 20, 40, 3.4, 1.4, -0.35],
    [1, 15, 20, 26, 0.9, 0],
  ],
}

/** Keyed by years ago — the camera tours where history is happening. */
const BY_TIME: Record<string, readonly Key[]> = {
  sapiens: [
    [300_000, 15, 10, 3.2, 0.9, -0.4],
    [130_000, 10, 30, 3.0, 1.0, -0.4],
    [70_000, 15, 55, 3.1, 1.1, -0.4],
    [50_000, 0, 115, 3.1, 1.2, -0.4],
    [40_000, 40, 70, 3.2, 1.2, -0.4],
    [28_000, 55, 160, 3.1, 1.3, -0.4],
    [14_000, 15, 230, 3.3, 1.4, -0.4],
  ],
  civilization: [
    [11_700, 33, 44, 2.7, 1.9, -0.35],
    [6_000, 30, 35, 2.6, 2.0, -0.35],
    [4_500, 27, 68, 2.7, 2.0, -0.35],
    [3_300, 35, 105, 2.8, 2.0, -0.35],
    [2_100, 38, 20, 2.7, 2.0, -0.35],
    [1_300, 33, 50, 2.8, 2.0, -0.35],
    [900, 15, -75, 2.9, 2.0, -0.35],
    [576, -5, -60, 2.9, 2.0, -0.35],
  ],
  modern: [
    [576, 30, -30, 3.0, 2.0, -0.35],
    [500, 20, -45, 3.2, 1.9, -0.35],
    [300, 50, 0, 2.8, 2.0, -0.35],
    [150, 40, -40, 2.9, 2.0, -0.35],
    [81, 45, 20, 3.0, 2.0, -0.35],
  ],
}

export function earthView(chapterId: string, u: number, yearsAgo: number): EarthView {
  const byTime = BY_TIME[chapterId]
  if (byTime) return sample(byTime, yearsAgo, true)
  return sample(BY_CHAPTER[chapterId] ?? BY_CHAPTER.life, u)
}
