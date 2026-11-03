import { useEffect } from 'react'
import { chapterEntryProgress } from './timeline'
import { clock, nudgeTarget, setAutopilot, setTarget } from './clock'
import { gesture } from './gesture'
import { useApp } from './store'
import { resetView, zoomBy } from '../scenes/rig'

const WHEEL_SENSITIVITY = 1 / 70_000 // progress per wheel pixel
/** progress per pixel of vertical swipe: a full phone-height swipe travels ~1/8 of the journey */
const TOUCH_SENSITIVITY = 1 / 7_000
const KEY_STEP = 0.0035
const MAX_WHEEL_STEP = 0.004
const ZOOM_PER_PIXEL = 0.0025
const VIEW_KEYS = new Set(['+', '=', '-', 'r', 'h'])

function stopAutopilot(): void {
  setAutopilot(false)
  useApp.getState().setAutopilotFlag(false)
}

export function jumpToChapter(index: number): void {
  // land just inside the chapter so its title card and opening visuals are up
  setTarget(chapterEntryProgress(index))
}

function isTypingTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName))
}

/** Wheel, touch and keyboard all drive the time target. */
export function useTimeInput(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-scrollable]')) return
      e.preventDefault()
      const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY
      // Ctrl+wheel (and trackpad pinch, which browsers report as Ctrl+wheel) zooms the camera
      if (e.ctrlKey) {
        zoomBy(Math.exp(px * ZOOM_PER_PIXEL))
        return
      }
      const step = Math.max(-MAX_WHEEL_STEP, Math.min(MAX_WHEEL_STEP, px * WHEEL_SENSITIVITY))
      stopAutopilot()
      nudgeTarget(step)
    }

    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-scrollable],[data-no-drag]')) return
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      // the camera rig decides whether a drag rotates, pinches or travels in time
      if (touchY === null || gesture.mode !== 'time') {
        touchY = e.touches[0]?.clientY ?? touchY
        return
      }
      const y = e.touches[0]?.clientY ?? touchY
      stopAutopilot()
      nudgeTarget((touchY - y) * TOUCH_SENSITIVITY)
      touchY = y
    }
    const onTouchEnd = () => {
      touchY = null
    }

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const current = clock.time.chapterIndex
      const actions: Record<string, () => void> = {
        ArrowDown: () => nudgeTarget(KEY_STEP),
        PageDown: () => nudgeTarget(KEY_STEP * 4),
        ' ': () => nudgeTarget(KEY_STEP * 4),
        ArrowUp: () => nudgeTarget(-KEY_STEP),
        PageUp: () => nudgeTarget(-KEY_STEP * 4),
        ArrowRight: () => jumpToChapter(current + 1),
        ArrowLeft: () => jumpToChapter(clock.time.local < 0.08 ? current - 1 : current),
        Home: () => setTarget(0),
        End: () => setTarget(1),
        '+': () => zoomBy(1 / 1.15),
        '=': () => zoomBy(1 / 1.15),
        '-': () => zoomBy(1.15),
        r: () => resetView(),
        h: () => useApp.getState().toggleImmersive(),
      }
      const action = actions[e.key]
      if (!action) return
      e.preventDefault()
      // looking around never interrupts autopilot; moving through time does
      if (!VIEW_KEYS.has(e.key)) stopAutopilot()
      action()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [enabled])
}
