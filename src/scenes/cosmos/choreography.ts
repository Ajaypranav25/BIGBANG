import { smoothstep } from '../../lib/interpolate'

/**
 * Visual state of the early universe as a pure function of (chapter, local progress).
 *
 * Chapter `origin` advances evenly in log(time since the Big Bang), from the Planck time
 * (5.4×10⁻⁴⁴ s) to recombination (380 kyr). The epoch boundaries below sit at their log-time
 * positions in that chapter: u = (log10 τ[s] + 43.27) / 56.35.
 */
export const ORIGIN_MARKS = {
  /** GUT epoch ends / inflation begins ≈ 10⁻³⁶ s */
  inflationStart: 0.129,
  /** inflation ends ≈ 10⁻³² s */
  inflationEnd: 0.2,
  /** quark–hadron transition ≈ 10⁻⁶ s */
  hadrons: 0.661,
  /** nucleosynthesis ≈ 3 min */
  nucleosynthesis: 0.808,
} as const

/** Chapter `dawn`: log τ from 380 kyr to 1 Gyr. u = (log10 τ[yr] − 5.58) / 3.42 */
export const DAWN_MARKS = {
  firstStars: 0.69, // ~ 100 Myr
  reionization: 0.79, // ~ 200 Myr onward
} as const

export interface CosmosState {
  ballRadius: number
  turbulence: number
  heat: number
  cmb: number
  dark: number
  webMix: number
  galMix: number
  merge: number
  stars: number
  reion: number
  fog: number
  fogCmb: number
  core: number
  size: number
  intensity: number
  flash: number
  shake: number
  nursery: number
  cam: { distance: number; yaw: number; pitch: number; fov: number; diveToSun: number }
}

const bump = (x: number, a: number, peak: number, b: number): number =>
  x < a || x > b ? 0 : x < peak ? (x - a) / (peak - a) : 1 - (x - peak) / (b - peak)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

function origin(u: number): CosmosState {
  const { inflationStart: i0, inflationEnd: i1, hadrons } = ORIGIN_MARKS
  const inflating = smoothstep(i0, i1, u)
  // exponential growth reads best when interpolated in log-radius
  const radius =
    u < i1 ? Math.exp(lerp(Math.log(0.04), Math.log(7), inflating)) : lerp(7, 14, smoothstep(i1, 1, u))
  return {
    ballRadius: radius,
    turbulence: smoothstep(i1 - 0.02, i1 + 0.08, u) * (1 - 0.6 * smoothstep(0.8, 1, u)),
    heat: 1 - 0.45 * smoothstep(hadrons, 1, u),
    cmb: 0,
    dark: 0,
    webMix: 0,
    galMix: 0,
    merge: 0,
    stars: 0,
    reion: 0,
    fog: 0.9 * smoothstep(i1 - 0.03, i1 + 0.1, u),
    fogCmb: 0,
    core: smoothstep(0, 0.04, u) * (1 - smoothstep(i0 + 0.03, i1 + 0.02, u)),
    size: lerp(0.5, 0.75, smoothstep(i1, 1, u)),
    intensity: 0.5,
    flash: bump(u, i0 + 0.02, i1 - 0.01, i1 + 0.08),
    shake: bump(u, i0, i1 - 0.02, i1 + 0.06),
    nursery: 0,
    cam: {
      distance: lerp(10, 5.5, smoothstep(i0, i1, u)),
      yaw: u * 1.2,
      pitch: 0.12,
      fov: lerp(42, 62, smoothstep(i0, i1 + 0.05, u)),
      diveToSun: 0,
    },
  }
}

function dawn(u: number): CosmosState {
  const { firstStars, reionization } = DAWN_MARKS
  const stars = smoothstep(firstStars - 0.04, firstStars + 0.06, u)
  const reion = smoothstep(reionization, 1, u)
  return {
    ballRadius: lerp(14, 22, smoothstep(0, 0.35, u)),
    turbulence: 0.4 * (1 - smoothstep(0, 0.2, u)),
    heat: lerp(0.55, 0.12, smoothstep(0, 0.25, u)),
    cmb: (1 - smoothstep(0.12, 0.3, u)) * smoothstep(0, 0.02, u),
    dark: 0.85 * smoothstep(0.12, 0.35, u) * (1 - 0.7 * stars),
    webMix: smoothstep(0.15, 0.72, u),
    galMix: 0,
    merge: 0,
    stars,
    reion,
    fog: 0.9 * (1 - smoothstep(0, 0.06, u)),
    fogCmb: smoothstep(0, 0.015, u),
    core: 0,
    size: lerp(0.75, 1.0, smoothstep(0.1, 0.6, u)),
    intensity: 0.5,
    flash: bump(u, 0, 0.012, 0.06) * 0.8 + bump(u, firstStars - 0.02, firstStars + 0.01, firstStars + 0.06) * 0.25,
    shake: 0,
    nursery: 0,
    cam: {
      distance: lerp(5.5, 62, smoothstep(0.02, 0.5, u)),
      yaw: 1.2 + u * 1.4,
      pitch: lerp(0.12, 0.38, smoothstep(0.1, 0.6, u)),
      fov: lerp(62, 50, smoothstep(0, 0.4, u)),
      diveToSun: 0,
    },
  }
}

function galaxies(u: number): CosmosState {
  const dive = smoothstep(0.84, 1, u)
  return {
    ballRadius: 22,
    turbulence: 0,
    heat: 0.12,
    cmb: 0,
    dark: 0.25 * (1 - smoothstep(0, 0.2, u)),
    webMix: 1,
    galMix: smoothstep(0.02, 0.26, u),
    merge: smoothstep(0.24, 0.5, u),
    stars: 1 - smoothstep(0.05, 0.2, u),
    reion: 1 - smoothstep(0, 0.18, u),
    fog: 0,
    fogCmb: 0,
    core: 0,
    size: 1,
    intensity: 0.55,
    flash: dive > 0.97 ? (dive - 0.97) / 0.03 : 0,
    shake: 0,
    nursery: smoothstep(0.78, 1, u),
    cam: {
      distance: lerp(lerp(62, 30, smoothstep(0, 0.25, u)), 23, smoothstep(0.3, 0.7, u)),
      yaw: 2.6 + u * 2.2,
      pitch: lerp(0.38, lerp(0.62, 0.3, smoothstep(0.5, 0.85, u)), smoothstep(0, 0.4, u)),
      fov: lerp(50, 38, dive),
      diveToSun: dive,
    },
  }
}

export function cosmosState(chapterId: string, u: number): CosmosState {
  if (chapterId === 'origin') return origin(u)
  if (chapterId === 'dawn') return dawn(u)
  return galaxies(u)
}

/** Galaxy rotation angle (radians) shared by the shader and the camera's dive to the Sun. */
export function galaxySpin(elapsed: number, u: number): number {
  return elapsed * 0.035 + u * 3.5
}
