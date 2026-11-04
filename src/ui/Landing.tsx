import { useEffect } from 'react'
import { ArrowRight, BookOpen, Database, Globe, Menu, Plus, Sparkles, Telescope, Wand2 } from 'lucide-react'
import { CHAPTERS } from '../data/chapters'
import { EVENTS } from '../data/events'
import { SETTLEMENTS } from '../data/settlements'
import { OriginsMark } from '../design/OriginsMark'
import { userView } from '../scenes/rig'
import { useApp } from '../time/store'
import { ATTRACT_ORBIT_SPEED, ATTRACT_ZOOM, beginJourney, enterAttractMode } from './journey'
import { useTick } from './useTick'
import './landing.css'

const PANGAEA = CHAPTERS.findIndex((c) => c.id === 'pangaea')

/**
 * Full-screen hero. Liquid-glass panels float over the live 3D scene, which plays as an
 * attract loop (the young Milky Way, slowly orbiting) in place of a background video.
 */
export function Landing() {
  const started = useApp((s) => s.started)
  const setPanel = useApp((s) => s.setPanel)

  useEffect(() => {
    if (!started) enterAttractMode()
  }, [started])

  // one continuous orbit for as long as the page is open: never reset, never looped
  useTick((_, dt) => {
    if (started) return
    userView.yaw += ATTRACT_ORBIT_SPEED * dt
    userView.zoom = ATTRACT_ZOOM
  })

  if (started) return null

  return (
    <div className="landing">
      <section className="landing-left" data-safe="left" data-no-drag>
        <div className="liquid-glass-strong landing-left-glass" aria-hidden="true" />

        <nav className="landing-nav">
          <a className="landing-logo" href="#" onClick={(e) => e.preventDefault()} aria-label="Origins">
            <OriginsMark size={32} />
            <span>origins</span>
          </a>
          <button className="liquid-glass landing-menu lg-hover" onClick={() => setPanel('chapters')}>
            <Menu size={16} />
            Menu
          </button>
        </nav>

        <div className="landing-hero">
          <OriginsMark size={80} />
          <h1>
            Travel through
            <br />
            <em>13.8 billion years</em>
          </h1>
          <p className="landing-lede">
            From the first instant of the Big Bang to 2026: galaxies, a molten Earth, drifting continents, dinosaurs
            and us, in one continuous journey built on real data.
          </p>
          <button className="liquid-glass-strong landing-cta lg-hover" onClick={() => beginJourney()}>
            Begin the journey
            <span className="landing-cta-icon">
              <ArrowRight size={15} />
            </span>
          </button>
          <div className="landing-pills">
            <span className="liquid-glass landing-pill">Real scientific data</span>
            <span className="liquid-glass landing-pill">Full 360° scenes</span>
            <span className="liquid-glass landing-pill">{CHAPTERS.length} chapters</span>
          </div>
        </div>

        <figure className="landing-quote">
          <figcaption className="landing-quote-label">Cosmos, 1980</figcaption>
          <blockquote>
            We are made of <em>star-stuff.</em>
          </blockquote>
          <div className="landing-author">
            <span className="landing-rule" />
            Carl Sagan
            <span className="landing-rule" />
          </div>
        </figure>
      </section>

      <section className="landing-right">
        <div className="landing-topbar">
          <button className="liquid-glass landing-sources lg-hover" onClick={() => setPanel('about')} aria-label="Data sources">
            <Telescope size={16} />
            <Globe size={16} />
            <Database size={16} />
            <ArrowRight size={16} />
          </button>
          <button className="liquid-glass landing-account lg-hover" onClick={() => beginJourney({ autopilot: true })}>
            <span className="landing-icon-wrap">
              <Sparkles size={15} />
            </span>
            Watch on autopilot
          </button>
        </div>

        <button className="liquid-glass landing-community lg-hover" onClick={() => setPanel('chapters')}>
          <h3>Nineteen chapters</h3>
          <p>From the Planck epoch to 2026. Jump straight into any moment.</p>
        </button>

        <div className="liquid-glass landing-features">
          <div className="landing-feature-row">
            <div className="liquid-glass landing-feature">
              <span className="landing-icon-wrap">
                <Wand2 size={15} />
              </span>
              <h3>Live physics</h3>
              <p>The universe's temperature and size, integrated from the Friedmann equation as you travel.</p>
            </div>
            <div className="liquid-glass landing-feature">
              <span className="landing-icon-wrap">
                <BookOpen size={15} />
              </span>
              <h3>Cited archive</h3>
              <p>
                {EVENTS.length} events and {SETTLEMENTS.length} settlements, every one with a source.
              </p>
            </div>
          </div>
          <div className="liquid-glass landing-feature-wide">
            <div className="landing-thumb" role="img" aria-label="Pangaea, 250 million years ago, from plate reconstructions" />
            <div className="landing-feature-text">
              <h3>Drifting continents</h3>
              <p>A billion years of plate motion from GPlates reconstructions. Start at Pangaea.</p>
            </div>
            <button className="liquid-glass landing-plus lg-hover" onClick={() => beginJourney({ chapter: PANGAEA })} aria-label="Start at Pangaea">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
