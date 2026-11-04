import type { SceneId } from '../data/chapters'
import {
  co2Ppm,
  dayLengthHours,
  moonDistanceKm,
  oxygenPercent,
  redshift,
  scaleFactor,
  solarLuminosity,
  universeTemperatureK,
  worldPopulationMillions,
} from '../data/telemetry'
import type { TimePoint } from '../time/timeline'
import { population, sci } from './format'

export interface Readout {
  label: string
  value: string
  hint: string
}

/** The instrument panel: which readouts make sense for this moment, already formatted. */
export function readouts(t: TimePoint, scene: SceneId): Readout[] {
  if (scene === 'cosmos') {
    const a = scaleFactor(t.sinceBigBang)
    return [
      { label: 'Temperature', value: `${sci(universeTemperatureK(t.sinceBigBang), 2, 1e5)} K`, hint: 'T = 2.7255 K / a(t), Planck 2018 ΛCDM' },
      { label: 'Size vs. today', value: a < 0.5 ? `1 / ${sci(1 / a, 2, 1e6)}` : `${(a * 100).toFixed(0)}%`, hint: 'cosmic scale factor a(t)' },
      { label: 'Redshift', value: `z = ${sci(redshift(t.sinceBigBang), 3, 1e6)}`, hint: 'light from this moment arrives stretched by 1 + z' },
    ]
  }

  const out: Readout[] = []
  const lum = solarLuminosity(t.yearsAgo)
  if (lum !== null && (scene === 'solar' || t.yearsAgo > 5e8)) {
    out.push({ label: 'Sun brightness', value: `${(lum * 100).toFixed(1)}%`, hint: 'faint young Sun, Gough (1981)' })
  }
  const day = dayLengthHours(t.yearsAgo)
  if (day !== null) out.push({ label: 'Length of day', value: `${day.toFixed(1)} h`, hint: 'tidal braking by the Moon' })
  const moon = moonDistanceKm(t.yearsAgo)
  if (moon !== null && t.yearsAgo > 1e6) {
    out.push({ label: 'Moon distance', value: `${(Math.round(moon / 100) * 100).toLocaleString('en-US')} km`, hint: 'receding ~3.8 cm per year' })
  }
  const o2 = oxygenPercent(t.yearsAgo)
  if (o2 !== null) out.push({ label: 'Oxygen', value: o2 < 0.01 ? 'trace' : `${o2.toFixed(o2 < 1 ? 2 : 1)}%`, hint: 'atmospheric O₂ by volume' })
  const co2 = co2Ppm(t.yearsAgo)
  if (co2 !== null) out.push({ label: 'CO₂', value: `${Math.round(co2).toLocaleString('en-US')} ppm`, hint: 'proxy reconstructions; Mauna Loa since 1958' })
  const pop = worldPopulationMillions(t.yearsAgo)
  if (pop !== null) out.push({ label: 'People', value: population(pop), hint: 'HYDE 3.2 / UN World Population Prospects' })
  return out.slice(-4)
}
