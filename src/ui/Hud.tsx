import { useRef, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { Icon } from '../design/icons'
import { OriginsMark } from '../design/OriginsMark'
import { themeIconName, toggleTheme, useTheme } from '../design/theme'
import { isViewModified, resetView } from '../scenes/rig'
import { isAutopilot, setAutopilot } from '../time/clock'
import { useApp } from '../time/store'
import { formatTime } from '../time/timeline'
import { splitSuperscripts, writeRich } from './format'
import { readouts } from './telemetryReadouts'
import { TimeDial } from './TimeDial'
import { useClockSelector, useTick } from './useTick'

export function TopBar() {
  const chapterIndex = useApp((s) => s.chapterIndex)
  const autopilot = useApp((s) => s.autopilot)
  const setFlag = useApp((s) => s.setAutopilotFlag)
  const setPanel = useApp((s) => s.setPanel)
  const toggleImmersive = useApp((s) => s.toggleImmersive)
  const theme = useTheme()
  const [viewModified, setViewModified] = useState(false)
  const chapter = CHAPTERS[chapterIndex]

  useTick(() => {
    const m = isViewModified()
    if (m !== viewModified) setViewModified(m)
  })

  const toggleAutopilot = () => {
    const next = !isAutopilot()
    setAutopilot(next)
    setFlag(next)
  }

  return (
    <div className="topbar-wrap" data-no-drag data-safe="top">
      <header className="topbar brand-pill">
        <span className="brand-logo">
          <OriginsMark size={34} />
        </span>
        <div className="brand-text">
          <div className="brand-name">Origins</div>
          <div className="brand-sub">
            {chapter.numeral} · {chapter.title}
          </div>
        </div>
      </header>
      <nav className="topbar actions-pill" aria-label="Controls">
        {autopilot && <span className="live-pill">Autopilot</span>}
        <button
          className={`btn btn-sm autopilot-btn ${autopilot ? '' : 'btn-primary'}`}
          onClick={toggleAutopilot}
          aria-pressed={autopilot}
          aria-label={autopilot ? 'Pause autopilot' : 'Autopilot'}
        >
          <Icon name={autopilot ? 'pause' : 'play'} size={14} />
          <span className="btn-label">{autopilot ? 'Pause' : 'Autopilot'}</span>
        </button>
        {viewModified && (
          <button className="icon-btn" onClick={resetView} aria-label="Reset view" title="Reset view (R)">
            <Icon name="rotate360" size={17} />
          </button>
        )}
        <button className="icon-btn" onClick={() => setPanel('chapters')} aria-label="Chapters" title="Chapters">
          <Icon name="list" size={17} />
        </button>
        <button className="icon-btn" onClick={toggleImmersive} aria-label="Hide interface" title="Hide interface (H)">
          <Icon name="eyeOff" size={17} />
        </button>
        <button className="icon-btn" onClick={() => setPanel('about')} aria-label="About and sources" title="About and sources">
          <Icon name="info" size={17} />
        </button>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle light or dark" title="Appearance">
          <Icon name={themeIconName(theme)} size={17} />
        </button>
      </nav>
    </div>
  )
}

/** Visible only in immersive mode: one small button to bring the interface back. */
export function ShowChrome() {
  const immersive = useApp((s) => s.immersive)
  const toggleImmersive = useApp((s) => s.toggleImmersive)
  if (!immersive) return null
  return (
    <button className="icon-btn glass show-chrome" onClick={toggleImmersive} aria-label="Show interface" title="Show interface (H)" data-no-drag>
      <Icon name="eye" size={17} />
    </button>
  )
}

export function BottomHud() {
  const timeRef = useRef<HTMLDivElement>(null)
  const chapterIndex = useApp((s) => s.chapterIndex)
  const chapter = CHAPTERS[chapterIndex]

  useTick((c) => {
    if (timeRef.current) writeRich(timeRef.current, formatTime(c.time))
  })

  const panel = useClockSelector(
    (c) => readouts(c.time, CHAPTERS[c.time.chapterIndex].scene),
    (r) => r.map((x) => x.value).join('|'),
  )

  return (
    <footer className="card hud" data-no-drag data-safe="bottom">
      <div className="hud-row">
        <div className="hud-when">
          <div className="hud-time num" ref={timeRef} />
          <div className="hud-sub">
            <Icon name="clock" size={14} />
            {chapter.kicker}
          </div>
        </div>
        <div className="hud-stats">
          {panel.map((r) => (
            <div className="stat" key={r.label} title={r.hint}>
              <div className="v">
                {splitSuperscripts(r.value).map((p, i) => (p.sup ? <sup key={i}>{p.text}</sup> : <span key={i}>{p.text}</span>))}
              </div>
              <div className="k">{r.label}</div>
            </div>
          ))}
        </div>
      </div>
      <TimeDial />
    </footer>
  )
}
