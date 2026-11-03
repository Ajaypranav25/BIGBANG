/**
 * Planet data — semi-major axes from NASA JPL planetary fact sheets.
 * Formation windows are expressed as chapter-local progress (chapter `sun`: 4.600 → 4.540 Ga,
 * so u = (4600 − Ma)/60). Jupiter's core formed within ~1 Myr of CAIs and reached ~50 M⊕
 * within ~3–5 Myr (Kruijer et al. 2017, PNAS); Mars within ~2–4 Myr (Dauphas & Pourmand 2011,
 * Nature); Earth's main growth spans tens of Myr.
 */
export interface PlanetSpec {
  readonly name: string
  readonly au: number
  readonly radius: number // visual
  readonly texture: string
  readonly forms: readonly [number, number]
  readonly tilt: number // axial tilt, degrees
  readonly ring?: boolean
}

export const PLANETS: readonly PlanetSpec[] = [
  { name: 'Mercury', au: 0.387, radius: 0.09, texture: '/textures/mercury.jpg', forms: [0.68, 0.8], tilt: 0.03 },
  { name: 'Venus', au: 0.723, radius: 0.16, texture: '/textures/venus.jpg', forms: [0.7, 0.85], tilt: 177.4 },
  { name: 'Earth', au: 1.0, radius: 0.17, texture: '', forms: [0.7, 0.92], tilt: 23.4 },
  { name: 'Mars', au: 1.524, radius: 0.11, texture: '/textures/mars.jpg', forms: [0.58, 0.64], tilt: 25.2 },
  { name: 'Jupiter', au: 5.203, radius: 0.62, texture: '/textures/jupiter.jpg', forms: [0.55, 0.61], tilt: 3.1 },
  { name: 'Saturn', au: 9.537, radius: 0.52, texture: '/textures/saturn.jpg', forms: [0.58, 0.66], tilt: 26.7, ring: true },
  { name: 'Uranus', au: 19.19, radius: 0.32, texture: '/textures/uranus.jpg', forms: [0.62, 0.74], tilt: 97.8 },
  { name: 'Neptune', au: 30.07, radius: 0.31, texture: '/textures/neptune.jpg', forms: [0.64, 0.76], tilt: 28.3 },
]

/** Compress 0.4–30 AU into a viewable radius while keeping order and spacing ratios readable. */
export const visualRadius = (au: number): number => 3.2 * Math.pow(au, 0.55)

/** Kepler's third law: angular speed ∝ a^-1.5 (Earth = 0.22 rad/s visually). */
export const angularSpeed = (au: number): number => 0.22 * Math.pow(au, -1.5)

export const SOLAR_MARKS = {
  supernova: 0.38,
  collapse: [0.4, 0.54] as const,
  cai: 0.545,
  ignition: [0.54, 0.6] as const,
  diskClears: [0.66, 0.86] as const,
  diveToEarth: [0.86, 1] as const,
}
