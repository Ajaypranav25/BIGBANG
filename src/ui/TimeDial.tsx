import { useMemo, useRef, useState } from 'react'
import { EVENTS } from '../data/events'
import { GEO_UNITS } from '../data/geologicTimeScale'
import { setAutopilot, setTarget } from '../time/clock'
import { useApp } from '../time/store'
import { CHAPTER_RANGES, formatShort, progressToTime, timeToProgress } from '../time/timeline'
import { useTick } from './useTick'

const pct = (p: number) => `${(p * 100).toFixed(3)}%`

/** Scrubbable track: chapters, the ICS geologic periods (official colours), and headline events. */
export function TimeDial() {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null)
  const setFlag = useApp((s) => s.setAutopilotFlag)

  const periods = useMemo(
    () =>
      GEO_UNITS.filter((u) => u.rank === 'period').map((u) => ({
        ...u,
        a: timeToProgress(u.startMa * 1e6),
        b: timeToProgress(u.endMa * 1e6),
      })),
    [],
  )
  const headlines = useMemo(
    () => EVENTS.filter((e) => e.importance === 3).map((e) => ({ e, p: timeToProgress(e.yearsAgo) })),
    [],
  )

  useTick((c) => {
    if (thumb.current) thumb.current.style.left = pct(c.progress)
    if (fill.current) fill.current.style.width = pct(c.progress)
  })

  const progressAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  }

  const scrub = (clientX: number) => {
    setAutopilot(false)
    setFlag(false)
    setTarget(progressAt(clientX))
  }

  return (
    <div
      className="dial"
      ref={track}
      role="slider"
      aria-label="Time"
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={(e) => {
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        scrub(e.clientX)
      }}
      onPointerMove={(e) => {
        const p = progressAt(e.clientX)
        const r = track.current!.getBoundingClientRect()
        setTip({ x: e.clientX, y: r.top, label: formatShort(progressToTime(p).yearsAgo) })
        if (e.buttons & 1) scrub(e.clientX)
      }}
      onPointerLeave={() => setTip(null)}
    >
      <div className="dial-chapters">
        {CHAPTER_RANGES.map(({ chapter, start, end }) => (
          <div key={chapter.id} className="dial-chapter" style={{ left: pct(start), width: pct(end - start) }} title={`${chapter.numeral} · ${chapter.title}`}>
            <span>{chapter.numeral}</span>
          </div>
        ))}
      </div>
      <div className="dial-geo">
        {periods.map((u) => (
          <div key={u.name} className="dial-period" style={{ left: pct(u.a), width: pct(u.b - u.a), background: u.color }} title={`${u.name} · ${u.startMa}–${u.endMa} Ma`} />
        ))}
      </div>
      <div className="dial-track">
        <div className="dial-fill" ref={fill} />
        {headlines.map(({ e, p }) => (
          <span key={e.id} className="dial-event" style={{ left: pct(p) }} />
        ))}
      </div>
      <div className="dial-thumb" ref={thumb} />
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y - 40, transform: 'translateX(-50%)' }}>
          {tip.label}
        </div>
      )}
    </div>
  )
}
