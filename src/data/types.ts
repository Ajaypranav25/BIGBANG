/**
 * Shared data contract for the timeline.
 *
 * Time convention: every timestamp is expressed as `yearsAgo` — years before
 * 2026.0 CE (the "present" of this experience). A calendar year Y CE maps to
 * `2026 - Y`; Y BCE maps to `2026 + Y - 1` (there is no year 0).
 */

export type EventCategory =
  | 'cosmic'
  | 'stellar'
  | 'planetary'
  | 'geologic'
  | 'climate'
  | 'life'
  | 'extinction'
  | 'human'
  | 'civilization'
  | 'science'
  | 'technology'
  | 'exploration'
  | 'conflict'

export interface GeoPoint {
  readonly lat: number
  readonly lon: number
  readonly name: string
}

export interface TimelineEvent {
  /** kebab-case, unique */
  readonly id: string
  /** years before 2026.0 CE */
  readonly yearsAgo: number
  /** ± years (reported uncertainty or half-width of the accepted range) */
  readonly uncertainty?: number
  /** ≤ 48 characters */
  readonly title: string
  /** 1–2 factual sentences, ≤ 220 characters */
  readonly summary: string
  readonly category: EventCategory
  /** 3 = headline moment, 2 = notable, 1 = detail */
  readonly importance: 1 | 2 | 3
  /** present-day coordinates, when the event has a place on Earth */
  readonly location?: GeoPoint
  /** short citation, e.g. "Planck 2018 VI (A&A 641, A6)" */
  readonly source: string
}

export interface Settlement {
  readonly name: string
  readonly lat: number
  readonly lon: number
  /** years before 2026 when continuously settled / founded */
  readonly foundedYearsAgo: number
  /** 1 = town, 2 = major city, 3 = world city of its age */
  readonly weight: 1 | 2 | 3
}

export type GeoUnitRank = 'eon' | 'era' | 'period' | 'epoch'

export interface GeoUnit {
  readonly name: string
  readonly rank: GeoUnitRank
  /** base (older boundary) in Ma */
  readonly startMa: number
  /** top (younger boundary) in Ma */
  readonly endMa: number
  /** official ICS colour, #rrggbb */
  readonly color: string
}
