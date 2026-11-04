import { describe, expect, test } from 'vitest'
import { ORIGIN_MARKS, cosmosState } from '../src/scenes/cosmos/choreography'
import { generateCosmos, KIND } from '../src/scenes/cosmos/generate'
import { earthState } from '../src/scenes/earth/earthState'
import { earthView } from '../src/scenes/earth/earthCamera'
import { greatCircle, latLonToVec3, paleoFrames, PALEO_FRAME_MA } from '../src/scenes/earth/geo'
import { ROUTES } from '../src/scenes/earth/migrations'
import { PLANETS, angularSpeed, visualRadius } from '../src/scenes/solar/planets'

describe('cosmos choreography', () => {
  test('inflation expands the universe by orders of magnitude', () => {
    const before = cosmosState('origin', ORIGIN_MARKS.inflationStart - 0.01).ballRadius
    const after = cosmosState('origin', ORIGIN_MARKS.inflationEnd + 0.01).ballRadius
    expect(after / before).toBeGreaterThan(100)
  })

  test('the plasma fog clears at recombination (start of Cosmic Dawn)', () => {
    expect(cosmosState('origin', 0.9).fog).toBeGreaterThan(0.8)
    expect(cosmosState('dawn', 0.1).fog).toBe(0)
  })

  test('first stars ignite late in the dawn chapter and galaxies form after', () => {
    expect(cosmosState('dawn', 0.3).stars).toBe(0)
    expect(cosmosState('dawn', 0.9).stars).toBeGreaterThan(0.9)
    expect(cosmosState('galaxies', 0.5).galMix).toBe(1)
    expect(cosmosState('galaxies', 1).cam.diveToSun).toBe(1)
  })

  test('every state is finite', () => {
    for (const id of ['origin', 'dawn', 'galaxies']) {
      for (let u = 0; u <= 1; u += 0.05) {
        const s = cosmosState(id, u)
        for (const v of Object.values(s)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
      }
    }
  })
})

describe('cosmos generator', () => {
  test('is deterministic and fills every buffer', () => {
    const a = generateCosmos(2000)
    const b = generateCosmos(2000)
    expect(a.galaxy).toEqual(b.galaxy)
    expect(a.ball.length).toBe(6000)
    expect(a.seed.length).toBe(8000)
    expect(Array.from(a.galaxy).every(Number.isFinite)).toBe(true)
  })

  test('produces every particle role', () => {
    const { kind } = generateCosmos(5000)
    for (const k of Object.values(KIND)) expect(Array.from(kind)).toContain(k)
  })

  test('ball positions lie inside the unit sphere', () => {
    const { ball } = generateCosmos(1000)
    for (let i = 0; i < 1000; i++) {
      expect(Math.hypot(ball[i * 3], ball[i * 3 + 1], ball[i * 3 + 2])).toBeLessThanOrEqual(1.000001)
    }
  })
})

describe('earth state', () => {
  test('Hadean magma ocean gives way to oceans', () => {
    expect(earthState(4.5e9, 'hadean', 0.1).magma).toBe(1)
    expect(earthState(4.5e9, 'hadean', 0.1).ocean).toBe(0)
    expect(earthState(4.1e9, 'hadean', 0.8).magma).toBe(0)
    expect(earthState(4.1e9, 'hadean', 0.8).ocean).toBe(1)
  })

  test('Snowball Earth freezes to the equator; Cretaceous is ice-free', () => {
    const sturtian = earthState(690e6, 'snowball', 0.5)
    expect(sturtian.iceNorth).toBe(0)
    expect(sturtian.iceSouth).toBe(0)
    expect(earthState(90e6, 'dinosaurs', 0.5).iceSouth).toBe(90)
  })

  test('Antarctic ice appears after 34 Ma; Last Glacial Maximum pushes northern ice south', () => {
    expect(earthState(20e6, 'mammals', 0.5).iceSouth).toBeLessThan(70)
    expect(earthState(21_000, 'sapiens', 0.9).iceNorth).toBeLessThan(earthState(5_000, 'civilization', 0.5).iceNorth)
  })

  test('land plants green the continents from the Ordovician–Devonian', () => {
    expect(earthState(500e6, 'seas', 0.2).vegetation).toBe(0)
    expect(earthState(200e6, 'pangaea', 0.9).vegetation).toBe(1)
  })

  test('Chicxulub sequence: ring, fire and dust only after the strike', () => {
    expect(earthState(66.05e6, 'impact', 0.2).impactRing).toBe(0)
    const after = earthState(66.0e6, 'impact', 0.45)
    expect(after.impactRing).toBeGreaterThan(0)
    expect(after.dust).toBeGreaterThan(0.5)
  })

  test('Siberian Traps glow at the end-Permian', () => {
    expect(earthState(251.9e6, 'pangaea', 0.5).traps).toBeGreaterThan(0.9)
    expect(earthState(230e6, 'pangaea', 0.7).traps).toBe(0)
  })
})

describe('earth camera', () => {
  test('returns finite views for all earth chapters', () => {
    const cases: Array<[string, number]> = [
      ['hadean', 4.3e9], ['life', 3e9], ['oxygen', 2e9], ['snowball', 7e8], ['pangaea', 2.5e8],
      ['impact', 66e6], ['mammals', 3e7], ['sapiens', 5e4], ['civilization', 3000], ['modern', 200], ['now', 10],
    ]
    for (const [id, y] of cases) {
      for (let u = 0; u <= 1; u += 0.25) {
        const v = earthView(id, u, y)
        expect(Object.values(v).every(Number.isFinite)).toBe(true)
      }
    }
  })
})

describe('earth camera keyframes', () => {
  test('time-keyed chapters interpolate between the bracketing keyframes', () => {
    // sapiens keys: 50 ka → (0°, 115°E), 40 ka → (40°, 70°E)
    const v = earthView('sapiens', 0.5, 45_000)
    expect(v.lon).toBeGreaterThan(70)
    expect(v.lon).toBeLessThan(115)
    expect(v.lat).toBeGreaterThan(0)
    expect(v.lat).toBeLessThan(40)
  })

  test('time-keyed chapters hit their end keyframes exactly', () => {
    expect(earthView('civilization', 0, 11_700).lon).toBeCloseTo(44, 6)
    expect(earthView('civilization', 1, 576).lon).toBeCloseTo(-60, 6)
    expect(earthView('sapiens', 0, 300_000).lon).toBeCloseTo(10, 6)
  })
})

describe('geo helpers', () => {
  test('latLonToVec3 returns unit vectors with north up', () => {
    const north = latLonToVec3(90, 0)
    expect(north.y).toBeCloseTo(1, 9)
    expect(latLonToVec3(12, 77).length()).toBeCloseTo(1, 9)
  })

  test('great circles stay near the sphere and hit both ends', () => {
    const arc = greatCircle([0, 0], [0, 90], 10)
    expect(arc).toHaveLength(11)
    expect(arc[0].distanceTo(latLonToVec3(0, 0))).toBeLessThan(1e-9)
    expect(arc[10].distanceTo(latLonToVec3(0, 90))).toBeLessThan(1e-9)
    for (const p of arc) expect(p.length()).toBeLessThan(1.05)
  })

  test('paleo frames bracket the requested age', () => {
    const f = paleoFrames(255)
    expect(PALEO_FRAME_MA[f.a]).toBeLessThanOrEqual(255)
    expect(PALEO_FRAME_MA[f.b]).toBeGreaterThanOrEqual(255)
    expect(f.mix).toBeGreaterThanOrEqual(0)
    expect(f.mix).toBeLessThanOrEqual(1)
    expect(paleoFrames(-1)).toEqual({ a: 0, b: 0, mix: 0 })
    expect(paleoFrames(5000).a).toBe(PALEO_FRAME_MA.length - 1)
  })

  test('migration routes run forward in time with valid coordinates', () => {
    for (const r of ROUTES) {
      expect(r.from).toBeGreaterThan(r.to)
      for (const [lat, lon] of r.path) {
        expect(Math.abs(lat)).toBeLessThanOrEqual(90)
        expect(Math.abs(lon)).toBeLessThanOrEqual(180)
      }
    }
  })
})

describe('solar system', () => {
  test('planet order and Kepler speeds are preserved by the visual mapping', () => {
    const byAu = [...PLANETS].sort((a, b) => a.au - b.au)
    for (let i = 1; i < byAu.length; i++) {
      expect(visualRadius(byAu[i].au)).toBeGreaterThan(visualRadius(byAu[i - 1].au))
      expect(angularSpeed(byAu[i].au)).toBeLessThan(angularSpeed(byAu[i - 1].au))
    }
    // Neptune's period / Earth's ≈ 164.8 yr
    expect(angularSpeed(1) / angularSpeed(30.07)).toBeCloseTo(164.9, 0)
  })
})
