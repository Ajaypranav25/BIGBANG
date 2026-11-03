/**
 * Physical "instrument" readouts for any moment in history.
 * Every curve is anchored to published values; between anchors we interpolate.
 */
import { AGE_OF_UNIVERSE_YEARS, SECONDS_PER_YEAR, SOLAR_SYSTEM_AGE_YEARS } from '../lib/constants'
import { interpolate, interpolateLogY, type Anchor } from '../lib/interpolate'

/* ------------------------------------------------------------------ */
/* Cosmology — flat ΛCDM, Planck 2018 VI (TT,TE,EE+lowE+lensing)        */
/* ------------------------------------------------------------------ */

const H0_KM_S_MPC = 67.36
const OMEGA_M = 0.3153
const OMEGA_R = 9.1e-5 // photons + 3 massless neutrino species
const OMEGA_L = 1 - OMEGA_M - OMEGA_R
const T_CMB_TODAY_K = 2.7255 // Fixsen 2009
const MPC_KM = 3.0857e19
const H0_PER_YEAR = (H0_KM_S_MPC / MPC_KM) * SECONDS_PER_YEAR

/** Table of [ln t(years), ln a] built by integrating the Friedmann equation. */
const SCALE_FACTOR_TABLE: readonly Anchor[] = (() => {
  const rows: Anchor[] = []
  const lnAMin = Math.log(1e-14)
  const steps = 2400
  let t = 0
  let prevA = 0
  for (let i = 0; i <= steps; i++) {
    const a = Math.exp(lnAMin + (-lnAMin * i) / steps)
    // dt = da / (a H(a)); radiation-dominated start: t(a0) = a0² / (2 H0 √Ωr)
    if (i === 0) t = (a * a) / (2 * H0_PER_YEAR * Math.sqrt(OMEGA_R))
    else {
      const mid = 0.5 * (a + prevA)
      const h = H0_PER_YEAR * Math.sqrt(OMEGA_R / mid ** 4 + OMEGA_M / mid ** 3 + OMEGA_L)
      t += (a - prevA) / (mid * h)
    }
    rows.push([Math.log(t), Math.log(a)])
    prevA = a
  }
  return rows
})()

/** Age of the universe implied by the integrated model (should be ≈ 13.79 Gyr). */
export const MODEL_AGE_YEARS = Math.exp(SCALE_FACTOR_TABLE[SCALE_FACTOR_TABLE.length - 1][0])

/** Cosmic scale factor a(t) (1 = today) at `tau` years after the Big Bang. */
export function scaleFactor(tauYears: number): number {
  const first = SCALE_FACTOR_TABLE[0]
  const lnT = Math.log(Math.max(tauYears, 1e-60))
  if (lnT < first[0]) {
    // radiation era: a ∝ t^½
    return Math.exp(first[1] + 0.5 * (lnT - first[0]))
  }
  // rescale so that a(age) = 1 exactly with the adopted age
  const lnTScaled = lnT + Math.log(MODEL_AGE_YEARS / AGE_OF_UNIVERSE_YEARS)
  return Math.exp(interpolate(SCALE_FACTOR_TABLE, lnTScaled))
}

/**
 * Radiation temperature of the universe in kelvin. T = T₀ / a.
 * (Ignores the small e± annihilation reheating before ~1 s, so early values are approximate.)
 */
export function universeTemperatureK(tauYears: number): number {
  return T_CMB_TODAY_K / scaleFactor(tauYears)
}

/** Redshift of light emitted at that moment and observed today. */
export function redshift(tauYears: number): number {
  return 1 / scaleFactor(tauYears) - 1
}

/* ------------------------------------------------------------------ */
/* The Sun — standard solar model approximation, Gough (1981)           */
/* ------------------------------------------------------------------ */

const SUN_ZAMS_DELAY_YEARS = 5e7 // the Sun reaches the main sequence ~50 Myr after CAIs

/** Solar luminosity relative to today, or null before the Sun formed. */
export function solarLuminosity(yearsAgo: number): number | null {
  const age = SOLAR_SYSTEM_AGE_YEARS - yearsAgo
  if (age < 0) return null
  const ageOfSunToday = SOLAR_SYSTEM_AGE_YEARS
  const mainSequenceAge = Math.max(age, SUN_ZAMS_DELAY_YEARS)
  return 1 / (1 + 0.4 * (1 - mainSequenceAge / ageOfSunToday))
}

/* ------------------------------------------------------------------ */
/* Earth–Moon system                                                     */
/* ------------------------------------------------------------------ */

/**
 * Length of day (hours) vs. Ma. Sources: Williams (2000) Rev. Geophys. 38 (620 Ma, 2450 Ma);
 * Mitchell & Kirscher (2023) Nat. Geosci. (≈19 h plateau 2.0–1.0 Ga);
 * Eulenfeld & Heubeck (2023) JGR Planets (≈13 h, 3.2 Ga); Wells (1963) Devonian corals;
 * de Winter et al. (2020) Paleoceanogr. (Campanian rudist, 23.5 h). Earliest value is a model estimate.
 */
const DAY_LENGTH_HOURS: readonly Anchor[] = [
  [0, 24],
  [70, 23.5],
  [400, 22.0],
  [620, 21.9],
  [1000, 19.0],
  [2000, 19.0],
  [2450, 17.1],
  [3200, 13.0],
  [4500, 6.0],
]

export function dayLengthHours(yearsAgo: number): number | null {
  const ma = yearsAgo / 1e6
  if (ma > 4510) return null
  return interpolate(DAY_LENGTH_HOURS, ma)
}

/**
 * Earth–Moon mean distance (km) vs. Ma. Today 384,400 km, receding 3.8 cm/yr (LLR).
 * Williams (2000): 0.965 a₀ at 620 Ma, 0.906 a₀ at 2450 Ma; Eulenfeld & Heubeck (2023) ≈ 280,000 km at 3.2 Ga.
 * The post-impact value (~25,000 km, a few Earth radii) is a giant-impact model estimate.
 */
const MOON_DISTANCE_KM: readonly Anchor[] = [
  [0, 384_400],
  [620, 370_900],
  [2450, 348_300],
  [3200, 280_000],
  [4300, 120_000],
  [4510, 25_000],
]

export function moonDistanceKm(yearsAgo: number): number | null {
  const ma = yearsAgo / 1e6
  if (ma > 4510) return null
  return interpolate(MOON_DISTANCE_KM, ma)
}

/* ------------------------------------------------------------------ */
/* Atmosphere                                                            */
/* ------------------------------------------------------------------ */

/**
 * Atmospheric O₂ (% by volume) vs. Ma. Archean: < 10⁻⁵ PAL (Pavlov & Kasting 2002, MIF-S);
 * Proterozoic ≈ 0.1–1% (Lyons et al. 2014 Nature 506); Phanerozoic after Berner (2009) GEOCARBSULF
 * and Krause et al. (2018) Nat. Commun. (Carboniferous–Permian peak ≈ 30%).
 */
const OXYGEN_PERCENT: readonly Anchor[] = [
  [0, 20.95],
  [50, 21],
  [100, 22],
  [200, 18],
  [250, 15],
  [300, 30],
  [360, 22],
  [420, 16],
  [540, 12],
  [600, 8],
  [800, 1],
  [1800, 0.4],
  [2300, 0.2],
  [2450, 0.0002],
  [4000, 0.0002],
]

export function oxygenPercent(yearsAgo: number): number | null {
  const ma = yearsAgo / 1e6
  if (ma > 4000) return null
  return interpolateLogY(OXYGEN_PERCENT, ma)
}

/**
 * Atmospheric CO₂ (ppm).
 *  - Phanerozoic: Foster, Royer & Lunt (2017) Nat. Commun. 8 14845 compilation (smoothed).
 *  - Cenozoic: Rae et al. (2021) Annu. Rev. Earth Planet. Sci.
 *  - Last 800 kyr: EPICA Dome C / Vostok glacial cycles (Lüthi et al. 2008), 180–300 ppm.
 *  - Instrumental: Scripps/NOAA Mauna Loa annual means; 2026 extrapolated.
 */
const CO2_PPM_MA: readonly Anchor[] = [
  [0.0002, 280],
  [3, 400],
  [10, 350],
  [20, 400],
  [34, 700],
  [50, 1400],
  [56, 1800],
  [66, 900],
  [100, 1100],
  [150, 1200],
  [200, 1600],
  [252, 2500],
  [300, 400],
  [350, 1000],
  [400, 2000],
  [450, 3000],
  [500, 4000],
]

/** [calendar year, ppm] */
const CO2_PPM_INSTRUMENTAL: readonly Anchor[] = [
  [1750, 278],
  [1850, 285],
  [1900, 296],
  [1950, 311],
  [1960, 316.9],
  [1970, 325.7],
  [1980, 338.9],
  [1990, 354.4],
  [2000, 369.7],
  [2010, 389.9],
  [2020, 414.2],
  [2024, 424.6],
  [2026, 429.5],
]

/** Interglacial peaks (ka) of the last 800 kyr — MIS 1, 5e, 7, 9, 11, 13, 15, 17, 19. */
const INTERGLACIALS_KA = [0, 127, 243, 330, 410, 500, 580, 690, 780]

const DEGLACIATION_KYR = 12
const INTERGLACIAL_PPM = 285
const GLACIAL_DROP_PPM = 100

/**
 * Sawtooth through each glacial cycle: CO₂ declines slowly from an interglacial peak (older)
 * to a glacial minimum, then rises rapidly during deglaciation into the next interglacial (younger).
 */
function iceAgeCo2(ka: number): number {
  const olderIdx = INTERGLACIALS_KA.findIndex((p) => p > ka)
  if (olderIdx <= 0) return INTERGLACIAL_PPM
  const younger = INTERGLACIALS_KA[olderIdx - 1]
  const older = INTERGLACIALS_KA[olderIdx]
  if (ka - younger < DEGLACIATION_KYR) {
    return INTERGLACIAL_PPM - GLACIAL_DROP_PPM * ((ka - younger) / DEGLACIATION_KYR)
  }
  const descent = (older - ka) / (older - younger - DEGLACIATION_KYR)
  return INTERGLACIAL_PPM - GLACIAL_DROP_PPM * descent
}

/** 0 = interglacial, 1 = glacial maximum, for the last 800 kyr; 0 otherwise. */
export function glacialIndex(yearsAgo: number): number {
  if (yearsAgo < 11_700 || yearsAgo >= 800_000) return 0
  return (INTERGLACIAL_PPM - iceAgeCo2(yearsAgo / 1000)) / GLACIAL_DROP_PPM
}

export function co2Ppm(yearsAgo: number): number | null {
  const calendar = 2026 - yearsAgo
  if (calendar >= 1750) return interpolate(CO2_PPM_INSTRUMENTAL, calendar)
  const ma = yearsAgo / 1e6
  if (ma > 500) return null
  if (yearsAgo < 11_700) return 278 - (2 * yearsAgo) / 11_700 // Holocene: ~260–280 ppm
  if (yearsAgo < 800_000) return iceAgeCo2(yearsAgo / 1000)
  return interpolate(CO2_PPM_MA, ma)
}

/* ------------------------------------------------------------------ */
/* People                                                                */
/* ------------------------------------------------------------------ */

/**
 * World population (millions) by calendar year.
 * HYDE 3.2 (Klein Goldewijk et al. 2017) before 1950; UN WPP 2024 from 1950.
 */
const POPULATION_MILLIONS: readonly Anchor[] = [
  [-10000, 4.4],
  [-5000, 5],
  [-3000, 14],
  [-2000, 27],
  [-1000, 50],
  [-500, 100],
  [1, 232],
  [500, 210],
  [1000, 295],
  [1200, 393],
  [1340, 443],
  [1400, 375],
  [1500, 461],
  [1600, 554],
  [1700, 603],
  [1800, 990],
  [1850, 1262],
  [1900, 1650],
  [1927, 2000],
  [1950, 2499],
  [1960, 3019],
  [1974, 4000],
  [1987, 5000],
  [1999, 6000],
  [2011, 7000],
  [2022, 8000],
  [2026, 8270],
]

export function worldPopulationMillions(yearsAgo: number): number | null {
  const calendar = 2026 - yearsAgo
  if (calendar < -10000) return null
  return interpolateLogY(POPULATION_MILLIONS, calendar)
}
