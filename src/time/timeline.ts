import { CHAPTERS, type Chapter } from '../data/chapters'
import { AGE_OF_UNIVERSE_YEARS, PRESENT_YEAR, SECONDS_PER_YEAR } from '../lib/constants'

export interface TimePoint {
  /** years before 2026 */
  readonly yearsAgo: number
  /** years since the Big Bang — exact even for sub-second times */
  readonly sinceBigBang: number
  readonly chapterIndex: number
  /** 0…1 progress inside the chapter */
  readonly local: number
}

interface ChapterRange {
  readonly chapter: Chapter
  readonly start: number
  readonly end: number
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

function buildRanges(chapters: readonly Chapter[]): readonly ChapterRange[] {
  const total = chapters.reduce((s, c) => s + c.weight, 0)
  let acc = 0
  return chapters.map((chapter) => {
    const start = acc / total
    acc += chapter.weight
    return { chapter, start, end: acc / total }
  })
}

export const CHAPTER_RANGES: readonly ChapterRange[] = buildRanges(CHAPTERS)

/** Where a chapter is entered: just inside it, so its title card and opening visuals are already up. */
export const CHAPTER_ENTRY = 0.025

/** past the half-width of the dip-to-black at scene cuts (see ui/Overlays CUT_HALF_WIDTH) */
const MIN_ENTRY_OFFSET = 0.005

export function chapterEntryProgress(index: number): number {
  const i = Math.max(0, Math.min(CHAPTER_RANGES.length - 1, index))
  const r = CHAPTER_RANGES[i]
  const offset = Math.max((r.end - r.start) * CHAPTER_ENTRY, i === 0 ? 0 : MIN_ENTRY_OFFSET)
  return r.start + offset
}

export function chapterIndexAt(progress: number): number {
  const p = clamp01(progress)
  for (let i = CHAPTER_RANGES.length - 1; i >= 0; i--) {
    if (p >= CHAPTER_RANGES[i].start) return i
  }
  return 0
}

function localToTime(chapter: Chapter, u: number): { yearsAgo: number; sinceBigBang: number } {
  if (chapter.scale === 'tau' && chapter.tau) {
    const [a, b] = chapter.tau
    const tau = Math.exp(lerp(Math.log(a), Math.log(b), u))
    return { yearsAgo: AGE_OF_UNIVERSE_YEARS - tau, sinceBigBang: tau }
  }
  const yearsAgo =
    chapter.scale === 'log' && chapter.toYearsAgo > 0
      ? Math.exp(lerp(Math.log(chapter.fromYearsAgo), Math.log(chapter.toYearsAgo), u))
      : lerp(chapter.fromYearsAgo, chapter.toYearsAgo, u)
  return { yearsAgo, sinceBigBang: AGE_OF_UNIVERSE_YEARS - yearsAgo }
}

function timeToLocal(chapter: Chapter, yearsAgo: number): number {
  if (chapter.scale === 'tau' && chapter.tau) {
    const [a, b] = chapter.tau
    const tau = Math.max(AGE_OF_UNIVERSE_YEARS - yearsAgo, a)
    return clamp01((Math.log(tau) - Math.log(a)) / (Math.log(b) - Math.log(a)))
  }
  if (chapter.scale === 'log' && chapter.toYearsAgo > 0) {
    const y = Math.max(yearsAgo, chapter.toYearsAgo)
    const la = Math.log(chapter.fromYearsAgo)
    return clamp01((la - Math.log(y)) / (la - Math.log(chapter.toYearsAgo)))
  }
  return clamp01((chapter.fromYearsAgo - yearsAgo) / (chapter.fromYearsAgo - chapter.toYearsAgo))
}

/** Map scroll progress (0…1) to a moment in cosmic history. */
export function progressToTime(progress: number): TimePoint {
  const p = clamp01(progress)
  const chapterIndex = chapterIndexAt(p)
  const { chapter, start, end } = CHAPTER_RANGES[chapterIndex]
  const local = clamp01((p - start) / (end - start))
  return { ...localToTime(chapter, local), chapterIndex, local }
}

/** Inverse of progressToTime: where on the scroll track a given moment lives. */
export function timeToProgress(yearsAgo: number): number {
  if (yearsAgo >= AGE_OF_UNIVERSE_YEARS) return 0
  if (yearsAgo <= 0) return 1
  const idx = CHAPTER_RANGES.findIndex(
    ({ chapter }) => yearsAgo <= chapter.fromYearsAgo && yearsAgo >= chapter.toYearsAgo,
  )
  const range = CHAPTER_RANGES[idx === -1 ? CHAPTER_RANGES.length - 1 : idx]
  return lerp(range.start, range.end, timeToLocal(range.chapter, yearsAgo))
}

/** Calendar year for recent times. Returns e.g. { year: 3200, era: 'BCE' }. */
export function calendarYear(yearsAgo: number): { year: number; era: 'BCE' | 'CE' } {
  const y = Math.round(PRESENT_YEAR - yearsAgo)
  return y <= 0 ? { year: 1 - y, era: 'BCE' } : { year: y, era: 'CE' }
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}
const superscript = (n: number): string => String(n).split('').map((c) => SUPERSCRIPT[c] ?? c).join('')

const fmt = (n: number, digits: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function formatSinceBigBang(tauYears: number): string {
  const seconds = tauYears * SECONDS_PER_YEAR
  if (seconds < 1e-3) return `10${superscript(Math.floor(Math.log10(seconds)))} seconds after the Big Bang`
  if (seconds < 1) return `${fmt(seconds * 1000, 0)} milliseconds after the Big Bang`
  if (seconds < 120) return `${fmt(seconds, seconds < 10 ? 1 : 0)} seconds after the Big Bang`
  if (seconds < 7200) return `${fmt(seconds / 60, 0)} minutes after the Big Bang`
  if (seconds < 2 * 86400) return `${fmt(seconds / 3600, 0)} hours after the Big Bang`
  if (tauYears < 2) return `${fmt(seconds / 86400, 0)} days after the Big Bang`
  if (tauYears < 1e6) return `${fmt(Math.round(tauYears / (tauYears < 1e3 ? 1 : 1e3)) * (tauYears < 1e3 ? 1 : 1e3), 0)} years after the Big Bang`
  if (tauYears < 1e9) return `${fmt(tauYears / 1e6, 0)} million years after the Big Bang`
  return `${fmt(tauYears / 1e9, 2)} billion years after the Big Bang`
}

/** Headline readout for the time dial. */
export function formatTime(t: Pick<TimePoint, 'yearsAgo' | 'sinceBigBang'>): string {
  if (t.sinceBigBang < 1e9) return formatSinceBigBang(t.sinceBigBang)
  const y = t.yearsAgo
  if (y >= 1e9) return `${fmt(y / 1e9, 3)} billion years ago`
  if (y >= 1e7) return `${fmt(y / 1e6, 1)} million years ago`
  if (y >= 1e6) return `${fmt(y / 1e6, 2)} million years ago`
  if (y >= 12_000) return `${fmt(Math.round(y / 100) * 100, 0)} years ago`
  const { year, era } = calendarYear(y)
  return era === 'BCE' ? `${year} BCE` : `${year} CE`
}

/** Compact label for dial ticks and event cards. */
export function formatShort(yearsAgo: number): string {
  if (yearsAgo >= 1e9) return `${fmt(yearsAgo / 1e9, 2)} Ga`
  if (yearsAgo >= 1e6) return `${fmt(yearsAgo / 1e6, yearsAgo >= 1e8 ? 0 : 1)} Ma`
  if (yearsAgo >= 12_000) return `${fmt(yearsAgo / 1e3, 0)} ka`
  const { year, era } = calendarYear(yearsAgo)
  return `${year} ${era}`
}
