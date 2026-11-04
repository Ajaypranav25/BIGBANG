import { resetView, rig } from '../scenes/rig'
import { setAutopilot, snapTo, startClock } from '../time/clock'
import { useApp } from '../time/store'
import { chapterEntryProgress, timeToProgress } from '../time/timeline'

/** What plays behind the landing page: the young Milky Way, ~8.5 billion years ago. */
export const ATTRACT_YEARS_AGO = 8.5e9
/** Slow auto-orbit of the attract loop, radians per second. */
export const ATTRACT_ORBIT_SPEED = 0.05
/** Closer than the chapter's own framing, so the disc spans the seam between the panels. */
export const ATTRACT_ZOOM = 0.7

export function enterAttractMode(): void {
  startClock()
  snapTo(timeToProgress(ATTRACT_YEARS_AGO))
  rig.cut = true
}

/** Leave the landing page and start the journey at the Big Bang, or cut straight to a chapter. */
export function beginJourney({ autopilot = false, chapter }: { autopilot?: boolean; chapter?: number } = {}): void {
  const app = useApp.getState()
  startClock()
  // cut (not ease) so the camera does not sweep through history to get there
  snapTo(chapterEntryProgress(chapter ?? 0))
  resetView()
  rig.cut = true
  setAutopilot(autopilot)
  app.setAutopilotFlag(autopilot)
  app.start()
}
