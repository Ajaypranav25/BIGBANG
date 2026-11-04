import { useRef } from 'react'
import { useApp } from '../time/store'
import { measureSafeArea } from './safeArea'
import { useTick } from './useTick'

/** seconds between layout measurements; chrome sizes change rarely */
const MEASURE_INTERVAL = 0.25

/** Keeps `safeArea` in sync with the floating chrome so the camera frames around it. */
export function SafeAreaTracker() {
  const started = useApp((s) => s.started)
  const immersive = useApp((s) => s.immersive)
  const acc = useRef(MEASURE_INTERVAL)
  useTick((_, dt) => {
    acc.current += dt
    if (acc.current < MEASURE_INTERVAL) return
    acc.current = 0
    measureSafeArea(started && !immersive, !started)
  })
  return null
}
