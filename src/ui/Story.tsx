import { useRef } from 'react'
import { CHAPTERS } from '../data/chapters'
import { EVENTS } from '../data/events'
import type { EventCategory } from '../data/types'
import { Icon, type IconName } from '../design/icons'
import { useApp } from '../time/store'
import { formatShort, timeToProgress } from '../time/timeline'
import { useClockSelector, useTick } from './useTick'

/** Title card that opens each chapter and dissolves as you travel into it. */
export function ChapterCard() {
  const chapterIndex = useApp((s) => s.chapterIndex)
  const chapter = CHAPTERS[chapterIndex]
  const ref = useRef<HTMLElement>(null)

  useTick((c) => {
    const el = ref.current
    if (!el) return
    const u = c.time.local
    const fadeIn = Math.min(1, u / 0.02)
    const fadeOut = 1 - Math.min(1, Math.max(0, (u - 0.13) / 0.08))
    const a = c.time.chapterIndex === chapterIndex ? fadeIn * fadeOut : 0
    el.style.opacity = a.toFixed(3)
    el.style.transform = `translateY(${((1 - fadeOut) * -16).toFixed(1)}px)`
    el.style.visibility = a < 0.01 ? 'hidden' : 'visible'
  })

  return (
    <section className="card chapter-card" ref={ref} key={chapter.id}>
      <div className="card-head">
        <span className="badge plain">Chapter {chapter.numeral}</span>
        <span className="small muted">{chapter.kicker}</span>
      </div>
      <div className="card-body">
        <h1 className="chapter-title">{chapter.title}</h1>
        <p className="chapter-narration">{chapter.narration}</p>
      </div>
    </section>
  )
}

const INDEXED = EVENTS.map((e) => ({ e, p: timeToProgress(e.yearsAgo) }))
/** an event card stays up for this much scroll after its moment */
const LINGER = 0.011
const LEAD = 0.0006
const MAX_CARDS = 3

const CATEGORY: Record<EventCategory, { label: string; icon: IconName; tone?: 'red' | 'green' | 'orange' }> = {
  cosmic: { label: 'Cosmos', icon: 'sparkle' },
  stellar: { label: 'Stars', icon: 'sun' },
  planetary: { label: 'Planets', icon: 'orbit' },
  geologic: { label: 'Earth', icon: 'globe' },
  climate: { label: 'Climate', icon: 'trend', tone: 'orange' },
  life: { label: 'Life', icon: 'leaf', tone: 'green' },
  extinction: { label: 'Extinction', icon: 'alert', tone: 'red' },
  human: { label: 'Humans', icon: 'person' },
  civilization: { label: 'Civilization', icon: 'building' },
  science: { label: 'Science', icon: 'search' },
  technology: { label: 'Technology', icon: 'bolt' },
  exploration: { label: 'Exploration', icon: 'map' },
  conflict: { label: 'Conflict', icon: 'shield' },
}

/** Real events surface as you pass them. */
export function EventFeed() {
  const events = useClockSelector(
    (c) =>
      INDEXED.filter(({ p }) => c.progress >= p - LEAD && c.progress - p < LINGER)
        .sort((a, b) => b.p - a.p)
        .slice(0, MAX_CARDS)
        .map(({ e }) => e),
    (list) => list.map((e) => e.id).join('|'),
  )

  return (
    <aside className="feed" aria-live="polite">
      {[...events].reverse().map((e, i, list) => {
        const cat = CATEGORY[e.category]
        // only the newest card is shown in full; earlier ones collapse to a one-line chip
        if (i < list.length - 1) {
          return (
            <article key={e.id} className="card event event-mini">
              <span className="tag num">{formatShort(e.yearsAgo)}</span>
              <span className="event-mini-title">{e.title}</span>
              <span className={`badge ${cat.tone ? `tone-${cat.tone}` : ''}`}>{cat.label}</span>
            </article>
          )
        }
        return (
          <article key={e.id} className={`card event ${e.importance === 3 ? 'event-headline' : ''}`}>
            <div className="event-top">
              <span className="tag num">
                {formatShort(e.yearsAgo)}
                {e.uncertainty ? ` ± ${formatUncertainty(e.uncertainty)}` : ''}
              </span>
              <span className={`badge ${cat.tone ? `tone-${cat.tone}` : ''}`}>{cat.label}</span>
              <span className="spacer" />
              <span className="app-icon" style={{ width: 28, height: 28 }}>
                <Icon name={cat.icon} size={15} />
              </span>
            </div>
            <h3>{e.title}</h3>
            <p className="event-summary">{e.summary}</p>
            <div className="event-foot small muted">
              {e.location && (
                <span className="row event-place">
                  <Icon name="map" size={13} />
                  {e.location.name}
                </span>
              )}
              <cite>{e.source}</cite>
            </div>
          </article>
        )
      })}
    </aside>
  )
}

function formatUncertainty(years: number): string {
  if (years >= 1e9) return `${+(years / 1e9).toFixed(2)} Gyr`
  if (years >= 1e6) return `${+(years / 1e6).toFixed(1)} Myr`
  if (years >= 1e3) return `${+(years / 1e3).toFixed(1)} kyr`
  return `${Math.round(years)} yr`
}
