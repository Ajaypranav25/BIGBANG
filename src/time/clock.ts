import { CHAPTERS } from '../data/chapters'
import { progressToTime, type TimePoint } from './timeline'

/**
 * The frame-rate clock. Deliberately a plain mutable object (not React state): it is read by
 * every scene and HUD element 60×/s, and pushing that through React would re-render the tree.
 * Discrete changes (chapter switches) are mirrored into the zustand store.
 */
export interface Clock {
  /** where input wants us to be (0…1) */
  target: number
  /** eased progress actually rendered */
  progress: number
  /** progress units per second, signed */
  velocity: number
  time: TimePoint
  /** seconds since start, for animation */
  elapsed: number
}

export const clock: Clock = {
  target: 0,
  progress: 0,
  velocity: 0,
  time: progressToTime(0),
  elapsed: 0,
}

type Listener = (c: Clock, dt: number) => void
const listeners = new Set<Listener>()

export function onTick(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const EASE_RATE = 2.6 // 1/s — higher is snappier
const AUTOPILOT_CHAPTER_SECONDS = 26

let running = false
let last = 0
let autopilot = false
let chapterListener: ((index: number) => void) | null = null
let lastChapter = -1

export function setAutopilot(on: boolean): void {
  autopilot = on
}

export function isAutopilot(): boolean {
  return autopilot
}

export function setChapterListener(fn: (index: number) => void): void {
  chapterListener = fn
}

export function setTarget(p: number): void {
  clock.target = Math.min(1, Math.max(0, p))
}

export function nudgeTarget(delta: number): void {
  setTarget(clock.target + delta)
}

/** Jump instantly (used for restart) — no easing sweep through history. */
export function snapTo(p: number): void {
  setTarget(p)
  clock.progress = clock.target
}

function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000 || 0)
  last = now
  clock.elapsed += dt

  if (autopilot) {
    const perSecond = 1 / (CHAPTERS.length * AUTOPILOT_CHAPTER_SECONDS)
    setTarget(clock.target + perSecond * dt)
    if (clock.target >= 1) autopilot = false
  }

  const prev = clock.progress
  const k = 1 - Math.exp(-EASE_RATE * dt)
  clock.progress += (clock.target - clock.progress) * k
  if (Math.abs(clock.target - clock.progress) < 1e-7) clock.progress = clock.target
  clock.velocity = dt > 0 ? (clock.progress - prev) / dt : 0
  clock.time = progressToTime(clock.progress)

  if (clock.time.chapterIndex !== lastChapter) {
    lastChapter = clock.time.chapterIndex
    chapterListener?.(lastChapter)
  }
  for (const fn of listeners) fn(clock, dt)
  requestAnimationFrame(frame)
}

export function startClock(): void {
  if (running) return
  running = true
  last = performance.now()
  requestAnimationFrame(frame)
}
