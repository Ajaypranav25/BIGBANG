import { describe, expect, test } from 'vitest'
import { interpolate, interpolateLogY, smoothstep } from '../src/lib/interpolate'
import {
  MODEL_AGE_YEARS,
  co2Ppm,
  dayLengthHours,
  moonDistanceKm,
  oxygenPercent,
  redshift,
  scaleFactor,
  solarLuminosity,
  universeTemperatureK,
  worldPopulationMillions,
} from '../src/data/telemetry'

describe('interpolate', () => {
  const table = [
    [0, 0],
    [10, 100],
    [20, 50],
  ] as const

  test('clamps and interpolates', () => {
    expect(interpolate(table, -5)).toBe(0)
    expect(interpolate(table, 5)).toBe(50)
    expect(interpolate(table, 15)).toBe(75)
    expect(interpolate(table, 99)).toBe(50)
  })

  test('throws on an empty table', () => {
    expect(() => interpolate([], 1)).toThrow()
  })

  test('log interpolation is geometric', () => {
    expect(interpolateLogY([[0, 1], [2, 100]], 1)).toBeCloseTo(10, 9)
  })

  test('smoothstep', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 0.5)).toBe(0.5)
    expect(smoothstep(0, 1, 2)).toBe(1)
  })
})

describe('cosmology (Planck 2018 ΛCDM)', () => {
  test('integrated model reproduces the age of the universe', () => {
    expect(MODEL_AGE_YEARS / 1e9).toBeGreaterThan(13.7)
    expect(MODEL_AGE_YEARS / 1e9).toBeLessThan(13.9)
  })

  test('scale factor is 1 today and grows monotonically', () => {
    expect(scaleFactor(13.787e9)).toBeCloseTo(1, 3)
    expect(scaleFactor(1e9)).toBeLessThan(scaleFactor(2e9))
  })

  test('recombination: ~3000 K at z ≈ 1100', () => {
    expect(universeTemperatureK(380_000)).toBeGreaterThan(2600)
    expect(universeTemperatureK(380_000)).toBeLessThan(3400)
    expect(redshift(380_000)).toBeGreaterThan(950)
    expect(redshift(380_000)).toBeLessThan(1250)
  })

  test('about ten billion kelvin one second in', () => {
    const t = universeTemperatureK(1 / 31_557_600)
    expect(t).toBeGreaterThan(3e9)
    expect(t).toBeLessThan(3e10)
  })

  test('today is the CMB temperature', () => {
    expect(universeTemperatureK(13.787e9)).toBeCloseTo(2.7255, 2)
  })
})

describe('Earth system', () => {
  test('faint young Sun: ~70% luminosity at formation, 100% today', () => {
    expect(solarLuminosity(4.6e9)).toBeNull()
    expect(solarLuminosity(4.5e9)!).toBeGreaterThan(0.68)
    expect(solarLuminosity(4.5e9)!).toBeLessThan(0.75)
    expect(solarLuminosity(0)).toBeCloseTo(1, 6)
  })

  test('days were shorter and the Moon closer in the past', () => {
    expect(dayLengthHours(0)).toBe(24)
    expect(dayLengthHours(620e6)).toBeCloseTo(21.9, 1)
    expect(dayLengthHours(5e9)).toBeNull()
    expect(moonDistanceKm(0)).toBe(384_400)
    expect(moonDistanceKm(4.0e9)!).toBeLessThan(moonDistanceKm(1e9)!)
    expect(moonDistanceKm(4.6e9)).toBeNull()
  })

  test('oxygen: trace before the GOE, Carboniferous peak, 21% today', () => {
    expect(oxygenPercent(3e9)!).toBeLessThan(0.001)
    expect(oxygenPercent(300e6)!).toBeGreaterThan(28)
    expect(oxygenPercent(0)).toBeCloseTo(20.95, 2)
    expect(oxygenPercent(4.2e9)).toBeNull()
  })

  test('CO₂ spans instrumental, ice-age and deep-time regimes', () => {
    expect(co2Ppm(0)!).toBeGreaterThan(420)
    expect(co2Ppm(2026 - 1960)!).toBeCloseTo(316.9, 1)
    expect(co2Ppm(21_000)!).toBeLessThan(220) // Last Glacial Maximum
    expect(co2Ppm(127_000)!).toBeGreaterThan(270) // Eemian
    expect(co2Ppm(5000)!).toBeGreaterThan(260)
    expect(co2Ppm(56e6)!).toBeGreaterThan(1000) // PETM
    expect(co2Ppm(600e6)).toBeNull()
  })

  test('world population milestones', () => {
    expect(worldPopulationMillions(20_000)).toBeNull()
    expect(worldPopulationMillions(2026 - 1)!).toBeCloseTo(232, 0)
    expect(worldPopulationMillions(2026 - 1927)!).toBeCloseTo(2000, 0)
    expect(worldPopulationMillions(0)!).toBeGreaterThan(8000)
  })
})

describe('superscript formatting', async () => {
  const { splitSuperscripts, sci } = await import('../src/ui/format')
  test('splits superscript runs into sup parts', () => {
    expect(splitSuperscripts('10⁻⁴³ seconds')).toEqual([
      { text: '10', sup: false },
      { text: '−43', sup: true },
      { text: ' seconds', sup: false },
    ])
    expect(splitSuperscripts('plain')).toEqual([{ text: 'plain', sup: false }])
  })
  test('sci uses × 10ⁿ above the plain threshold', () => {
    expect(sci(2725, 2, 1e5)).toBe('2,725')
    expect(sci(1.5e10)).toBe('1.5 × 10¹⁰')
  })
})
