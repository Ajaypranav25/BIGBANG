import { useEffect, useRef, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { EVENTS } from '../data/events'
import { SETTLEMENTS } from '../data/settlements'
import { Icon } from '../design/icons'
import { isViewModified, rig } from '../scenes/rig'
import { setAutopilot, snapTo } from '../time/clock'
import { useApp } from '../time/store'
import { CHAPTER_RANGES, chapterEntryProgress } from '../time/timeline'
import { jumpToChapter } from '../time/useInput'
import { beginJourney } from './journey'
import { useTick } from './useTick'

/** Scene-change boundaries (in progress) where we dip to black. */
const CUTS = CHAPTER_RANGES.slice(1)
  .filter(({ chapter }, i) => {
    const prev = CHAPTERS[i]
    return chapter.scene !== prev.scene || chapter.biome !== prev.biome
  })
  .map(({ start }) => start)
const CUT_HALF_WIDTH = 0.0045
/** the end card fades in over the last ~half-year of the journey, after the pull-back */
const END_CARD_START = 0.9993
/** how long the 360° hint stays up after the journey starts, seconds */
const HINT_SECONDS = 9

export function Transitions() {
  const black = useRef<HTMLDivElement>(null)
  const white = useRef<HTMLDivElement>(null)
  useTick((c) => {
    let dip = 0
    for (const cut of CUTS) dip = Math.max(dip, 1 - Math.abs(c.progress - cut) / CUT_HALF_WIDTH)
    if (black.current) black.current.style.opacity = Math.max(0, dip).toFixed(3)
    if (white.current) white.current.style.opacity = Math.min(1, rig.flash * 0.85).toFixed(3)
  })
  return (
    <>
      <div className="veil veil-black" ref={black} />
      <div className="veil veil-white" ref={white} />
    </>
  )
}

/** A one-time nudge that the scene can be rotated all the way round. */
export function RotateHint() {
  const started = useApp((s) => s.started)
  const ref = useRef<HTMLDivElement>(null)
  const shownAt = useRef<number | null>(null)
  const [done, setDone] = useState(false)
  useTick((c) => {
    if (!started || done || !ref.current) return
    shownAt.current ??= c.elapsed
    const age = c.elapsed - shownAt.current
    const a = Math.min(1, age / 0.6) * (1 - Math.min(1, Math.max(0, (age - HINT_SECONDS) / 0.8)))
    ref.current.style.opacity = isViewModified() ? '0' : a.toFixed(3)
    if (age > HINT_SECONDS + 1 || isViewModified()) setDone(true)
  })
  if (!started || done) return null
  return (
    <div className="toast rotate-hint" ref={ref} role="status">
      <span className="t-icon">
        <Icon name="hand" size={17} />
      </span>
      <span>Drag anywhere to look around — every scene turns a full 360°</span>
    </div>
  )
}

export function EndCard() {
  const ref = useRef<HTMLDivElement>(null)
  useTick((c) => {
    const el = ref.current
    if (!el) return
    const a = Math.max(0, Math.min(1, (c.progress - END_CARD_START) / (1 - END_CARD_START)))
    el.style.opacity = a.toFixed(3)
    el.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
  })
  return (
    <div className="endcard" ref={ref} data-no-drag>
      <div className="card endcard-card">
        <span className="badge plain">2026</span>
        <h1>You are here.</h1>
        <p>
          Every atom in you was made in the Big Bang or forged inside stars. Every cell descends from life that began
          more than 3.5 billion years ago. The story keeps going.
        </p>
      </div>
      <button
        className="btn btn-primary btn-lg endcard-again"
        onClick={() => {
          setAutopilot(false)
          snapTo(chapterEntryProgress(0))
          rig.cut = true
        }}
      >
        <Icon name="refresh" size={18} />
        Begin again
      </button>
    </div>
  )
}

export function Panels() {
  const panel = useApp((s) => s.panel)
  const setPanel = useApp((s) => s.setPanel)
  const chapterIndex = useApp((s) => s.chapterIndex)
  useEffect(() => {
    if (panel === 'none') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel('none')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, setPanel])
  if (panel === 'none') return null
  const close = () => setPanel('none')
  return (
    <div className="modal-backdrop" onClick={close} data-no-drag>
      <div className="modal" onClick={(e) => e.stopPropagation()} data-scrollable role="dialog" aria-modal>
        <div className="modal-head">
          <div>
            <h2>{panel === 'chapters' ? 'Chapters' : 'About this journey'}</h2>
            <p className="small muted">
              {panel === 'chapters' ? `${CHAPTERS.length} chapters · 13.787 billion years` : 'How it works, and where the numbers come from'}
            </p>
          </div>
          <button className="close-btn" onClick={close} aria-label="Close">
            <Icon name="xmark" size={16} />
          </button>
        </div>
        <div className="modal-body">
          {panel === 'chapters' ? (
            <div className="report-list chapter-list">
              {CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  className={`report-item ${i === chapterIndex ? 'on' : ''}`}
                  onClick={() => {
                    close()
                    // from the landing page, cut straight into the chapter; mid-journey, travel there
                    if (!useApp.getState().started) return beginJourney({ chapter: i })
                    setAutopilot(false)
                    jumpToChapter(i)
                  }}
                >
                  <div className="t">
                    {c.numeral} · {c.title}
                  </div>
                  <div className="c">{c.kicker}</div>
                </button>
              ))}
            </div>
          ) : (
            <About />
          )}
        </div>
      </div>
    </div>
  )
}

function About() {
  return (
    <div className="stack about">
      <p>
        Time flows at a varying rate. The first chapter advances evenly in the <em>logarithm</em> of time, so the first
        second after the Big Bang gets as much room as the next 380,000 years. The dial shows where you are, with the
        official ICS geologic periods in their standard colours.
      </p>
      <div className="callout info">
        <Icon name="rotate360" />
        Drag to turn any scene a full 360°, pinch or Ctrl + scroll to zoom, double-click or press R to reset the view.
      </div>
      <h3>Data</h3>
      <ul>
        <li>{EVENTS.length} dated events and {SETTLEMENTS.length} settlements, each with a source citation.</li>
        <li>Cosmology: Planck 2018 ΛCDM parameters. Temperature and scale come from integrating the Friedmann equation live.</li>
        <li>Continents 0–1000 Ma: GPlates Web Service, plate model MERDITH2021 (Merdith et al. 2021, Earth-Science Reviews).</li>
        <li>Geologic time: ICS International Chronostratigraphic Chart v2024/12.</li>
        <li>Climate: Foster, Royer &amp; Lunt 2017 (CO₂); EPICA/Vostok ice cores; NOAA/Scripps Mauna Loa; oxygen after Berner and Lyons et al. 2014.</li>
        <li>Earth–Moon: Williams 2000; Mitchell &amp; Kirscher 2023; lunar laser ranging.</li>
        <li>People: HYDE 3.2 and UN World Population Prospects 2024.</li>
      </ul>
      <h3>Imagery</h3>
      <ul>
        <li>Planet, Sun, Moon and Milky Way textures: Solar System Scope (CC BY 4.0), based on NASA imagery.</li>
        <li>Creature models: built for this project in Blender. Everything else is procedural, rendered in real time.</li>
      </ul>
      <p className="small muted">
        Values between published anchor points are interpolated. Very early or deep-time numbers carry large uncertainties,
        and the cards say so where the science is debated.
      </p>
    </div>
  )
}
