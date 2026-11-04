import { describe, expect, test } from 'vitest'
import { Vector3 } from 'three'
import { applyUserView, type ViewInput } from '../src/scenes/viewMath'

const out = () => ({ position: new Vector3(), target: new Vector3(), appliedPitch: 0 })
const base = (over: Partial<ViewInput> = {}): ViewInput => ({
  position: new Vector3(0, 0, 10),
  target: new Vector3(0, 0, 0),
  pivot: 'target',
  yaw: 0,
  pitch: 0,
  zoom: 1,
  minDistance: 0.05,
  minElevation: -1.45,
  maxElevation: 1.45,
  ...over,
})

describe('applyUserView', () => {
  test('identity when the viewer has not moved', () => {
    const r = applyUserView(base(), out())
    expect(r.position.distanceTo(new Vector3(0, 0, 10))).toBeLessThan(1e-9)
    expect(r.target.length()).toBeLessThan(1e-9)
  })

  test('yaw is unlimited: a full turn returns to the start, a half turn reaches the far side', () => {
    const full = applyUserView(base({ yaw: Math.PI * 2 }), out())
    expect(full.position.distanceTo(new Vector3(0, 0, 10))).toBeLessThan(1e-6)
    const half = applyUserView(base({ yaw: Math.PI }), out())
    expect(half.position.z).toBeCloseTo(-10, 6)
    const many = applyUserView(base({ yaw: Math.PI * 7 }), out())
    expect(many.position.z).toBeCloseTo(-10, 5)
  })

  test('orbit keeps the distance to the pivot', () => {
    const r = applyUserView(base({ yaw: 1.3, pitch: 0.7 }), out())
    expect(r.position.length()).toBeCloseTo(10, 9)
    expect(r.position.y).toBeGreaterThan(0)
  })

  test('pitch is clamped short of the poles and reports what was applied', () => {
    const r = applyUserView(base({ pitch: 5 }), out())
    expect(r.appliedPitch).toBeCloseTo(1.45, 9)
    expect(Math.asin(r.position.y / r.position.length())).toBeCloseTo(1.45, 9)
  })

  test("'origin' pivot rotates the whole shot about the planet, preserving composition", () => {
    const input = base({ pivot: 'origin', position: new Vector3(0, 0, 3), target: new Vector3(0.5, 0, 0), yaw: Math.PI / 2 })
    const r = applyUserView(input, out())
    expect(r.position.length()).toBeCloseTo(3, 9)
    // the look-at offset rotates with the camera, so the planet stays on the same side of frame
    const before = new Vector3(0.5, 0, 0).sub(new Vector3(0, 0, 3))
    const after = r.target.clone().sub(r.position)
    expect(after.length()).toBeCloseTo(before.length(), 9)
  })

  test("'eye' pivot keeps the camera fixed and turns the view all the way round", () => {
    const input = base({ pivot: 'eye', position: new Vector3(5, 2, 5), target: new Vector3(5, 2, -5), yaw: Math.PI })
    const r = applyUserView(input, out())
    expect(r.position.distanceTo(new Vector3(5, 2, 5))).toBeLessThan(1e-9)
    expect(r.target.z).toBeCloseTo(15, 6)
  })

  test('zoom scales distance but never closer than minDistance', () => {
    expect(applyUserView(base({ zoom: 2 }), out()).position.length()).toBeCloseTo(20, 9)
    expect(applyUserView(base({ zoom: 0.01, minDistance: 1.3 }), out()).position.length()).toBeCloseTo(1.3, 9)
  })

  test('a shot already beyond the limits is left untouched when the viewer has not tilted', () => {
    // eye mode looking steeply down (−80°) with a −57° limit, as in a descent from the sky
    const input = base({ pivot: 'eye', position: new Vector3(0, 50, 0), target: new Vector3(0, 0, 8.8), minElevation: -1.0, maxElevation: 1.25 })
    const r = applyUserView(input, out())
    expect(r.appliedPitch).toBe(0)
    expect(r.target.distanceTo(new Vector3(0, 0, 8.8))).toBeLessThan(1e-9)
    // and the viewer can still tilt back toward the allowed range
    expect(applyUserView({ ...input, pitch: 0.3 }, out()).appliedPitch).toBeCloseTo(0.3, 9)
  })
})
