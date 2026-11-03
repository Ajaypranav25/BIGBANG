import { describe, expect, test } from 'vitest'
import { CHAPTERS } from '../src/data/chapters'
import { AGE_OF_UNIVERSE_YEARS } from '../src/lib/constants'
import {
  CHAPTER_RANGES,
  calendarYear,
  chapterIndexAt,
  formatShort,
  formatTime,
  progressToTime,
  timeToProgress,
} from '../src/time/timeline'

describe('chapters', () => {
  test('are contiguous and run from the Big Bang to the present', () => {
    expect(CHAPTERS[0].fromYearsAgo).toBe(AGE_OF_UNIVERSE_YEARS)
    expect(CHAPTERS[CHAPTERS.length - 1].toYearsAgo).toBe(0)
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].fromYearsAgo).toBeCloseTo(CHAPTERS[i - 1].toYearsAgo, 0)
    }
  })

  test('have unique ids and surface chapters declare a biome', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length)
    for (const c of CHAPTERS) if (c.scene === 'surface') expect(c.biome).toBeDefined()
  })

  test('ranges tile the 0…1 scroll track', () => {
    expect(CHAPTER_RANGES[0].start).toBe(0)
    expect(CHAPTER_RANGES[CHAPTER_RANGES.length - 1].end).toBeCloseTo(1, 12)
  })
})

describe('progressToTime', () => {
  test('starts at the Planck time and ends in 2026', () => {
    const start = progressToTime(0)
    expect(start.sinceBigBang).toBeLessThan(1e-50)
    expect(start.chapterIndex).toBe(0)
    const end = progressToTime(1)
    expect(end.yearsAgo).toBeCloseTo(0, 6)
    expect(end.chapterIndex).toBe(CHAPTERS.length - 1)
  })

  test('clamps out-of-range input', () => {
    expect(progressToTime(-3).sinceBigBang).toBe(progressToTime(0).sinceBigBang)
    expect(progressToTime(7).yearsAgo).toBe(progressToTime(1).yearsAgo)
  })

  test('time moves forward monotonically as you scroll', () => {
    let prev = Infinity
    for (let p = 0; p <= 1; p += 0.0005) {
      const { yearsAgo } = progressToTime(p)
      expect(yearsAgo).toBeLessThanOrEqual(prev + 1e-3)
      prev = yearsAgo
    }
  })

  test('the first second gets a large share of the opening chapter (log time)', () => {
    const { start, end } = CHAPTER_RANGES[0]
    const oneSecondYears = 1 / 31_557_600
    let p = start
    while (progressToTime(p).sinceBigBang < oneSecondYears) p += 1e-5
    expect((p - start) / (end - start)).toBeGreaterThan(0.6)
  })
})

describe('timeToProgress', () => {
  test.each([13.5e9, 4.567e9, 2.4e9, 251.9e6, 66.04e6, 3.2e6, 70_000, 5000, 476, 57, 1])(
    'round-trips %d years ago',
    (yearsAgo) => {
      const back = progressToTime(timeToProgress(yearsAgo)).yearsAgo
      expect(Math.abs(back - yearsAgo) / yearsAgo).toBeLessThan(1e-6)
    },
  )

  test('handles the extremes', () => {
    expect(timeToProgress(AGE_OF_UNIVERSE_YEARS + 1)).toBe(0)
    expect(timeToProgress(0)).toBe(1)
    expect(timeToProgress(-5)).toBe(1)
  })

  test('points inside a chapter map inside its range', () => {
    const idx = CHAPTERS.findIndex((c) => c.id === 'dinosaurs')
    expect(chapterIndexAt(timeToProgress(150e6))).toBe(idx)
  })
})

describe('formatting', () => {
  test('calendar years handle the missing year zero', () => {
    expect(calendarYear(0)).toEqual({ year: 2026, era: 'CE' })
    expect(calendarYear(2025)).toEqual({ year: 1, era: 'CE' })
    expect(calendarYear(2026)).toEqual({ year: 1, era: 'BCE' })
    expect(calendarYear(2026 + 2999)).toEqual({ year: 3000, era: 'BCE' })
  })

  test('formatTime picks a sensible unit for every era', () => {
    expect(formatTime({ sinceBigBang: 1e-50, yearsAgo: AGE_OF_UNIVERSE_YEARS })).toMatch(/^10⁻[⁰¹²³⁴⁵⁶⁷⁸⁹]+ seconds after the Big Bang$/)
    expect(formatTime({ sinceBigBang: 3 / 525_960, yearsAgo: 0 })).toBe('3 minutes after the Big Bang')
    expect(formatTime({ sinceBigBang: 380_000, yearsAgo: 0 })).toBe('380,000 years after the Big Bang')
    expect(formatTime({ sinceBigBang: 4e8, yearsAgo: 0 })).toBe('400 million years after the Big Bang')
    expect(formatTime({ sinceBigBang: 9e9, yearsAgo: 4.567e9 })).toBe('4.567 billion years ago')
    expect(formatTime({ sinceBigBang: 1e10, yearsAgo: 66.04e6 })).toBe('66.0 million years ago')
    expect(formatTime({ sinceBigBang: 1e10, yearsAgo: 3.2e6 })).toBe('3.20 million years ago')
    expect(formatTime({ sinceBigBang: 1e10, yearsAgo: 300_000 })).toBe('300,000 years ago')
    expect(formatTime({ sinceBigBang: 1e10, yearsAgo: 5226 })).toBe('3201 BCE')
    expect(formatTime({ sinceBigBang: 1e10, yearsAgo: 57 })).toBe('1969 CE')
  })

  test('formatShort produces compact labels', () => {
    expect(formatShort(4.567e9)).toBe('4.57 Ga')
    expect(formatShort(251.9e6)).toBe('252 Ma')
    expect(formatShort(66.04e6)).toBe('66.0 Ma')
    expect(formatShort(300_000)).toBe('300 ka')
    expect(formatShort(57)).toBe('1969 CE')
  })
})

describe('chapter entry points', async () => {
  const { chapterEntryProgress, CHAPTER_RANGES: ranges, chapterIndexAt: at, CHAPTER_ENTRY } = await import('../src/time/timeline')
  test('land just inside each chapter, never on its boundary', () => {
    ranges.forEach((r, i) => {
      const p = chapterEntryProgress(i)
      expect(at(p)).toBe(i)
      const expected = r.start + Math.max((r.end - r.start) * CHAPTER_ENTRY, i === 0 ? 0 : 0.005)
      expect(p).toBeCloseTo(expected, 12)
      if (i > 0) expect(p - r.start).toBeGreaterThan(0.0045) // clear of the dip-to-black
    })
  })
  test('clamps out-of-range chapter numbers', () => {
    expect(chapterEntryProgress(-4)).toBe(chapterEntryProgress(0))
    expect(chapterEntryProgress(99)).toBe(chapterEntryProgress(ranges.length - 1))
  })
})
