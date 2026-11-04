import { useEffect, useRef, useState } from 'react'
import { clock, onTick, type Clock } from '../time/clock'

/** Run a callback every animation frame (for direct DOM writes — no re-render). */
export function useTick(fn: (c: Clock, dt: number) => void): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => onTick((c, dt) => ref.current(c, dt)), [])
}

/**
 * Derive a value from the clock but only re-render when its key changes.
 * `select` runs every frame; keep it cheap.
 */
export function useClockSelector<T>(select: (c: Clock) => T, keyOf: (v: T) => string): T {
  const [value, setValue] = useState<T>(() => select(clock))
  const key = useRef(keyOf(value))
  useTick((c) => {
    const next = select(c)
    const k = keyOf(next)
    if (k !== key.current) {
      key.current = k
      setValue(next)
    }
  })
  return value
}
