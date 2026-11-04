import { describe, expect, test } from 'vitest'
import { framing } from '../src/ui/safeArea'

describe('framing', () => {
  test('no chrome: unchanged fov and no offset', () => {
    const f = framing(40, 800, 0, 0)
    expect(f.fov).toBeCloseTo(40, 9)
    expect(f.offsetY).toBe(0)
  })

  test('chrome widens the fov so the shot fits the free band', () => {
    const f = framing(40, 800, 80, 160)
    // tan(fov'/2) = tan(20°) · 800/560
    expect(Math.tan((f.fov * Math.PI) / 360)).toBeCloseTo(Math.tan((20 * Math.PI) / 180) * (800 / 560), 9)
  })

  test('a taller bottom panel moves the content up (positive view offset)', () => {
    const f = framing(40, 800, 80, 160)
    // free band centre = 80 + 560/2 = 360; screen centre 400 → offset +40
    expect(f.offsetY).toBe(40)
    expect(framing(40, 800, 160, 80).offsetY).toBe(-40)
  })

  test('a left panel shifts the content right, centring it in the remaining width', () => {
    expect(framing(40, 800, 0, 0, 600).offsetX).toBe(-300)
    expect(framing(40, 800, 0, 0).offsetX).toBe(-0)
  })

  test('degenerate insets are bounded', () => {
    const f = framing(40, 800, 500, 500)
    expect(Number.isFinite(f.fov)).toBe(true)
    expect(f.fov).toBeLessThanOrEqual(120)
  })
})
