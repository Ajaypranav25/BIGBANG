import { AGE_OF_UNIVERSE_YEARS, SECONDS_PER_YEAR } from '../lib/constants'

export type SceneId = 'cosmos' | 'solar' | 'earth' | 'surface'

/**
 * How time advances with scroll inside a chapter:
 *  - `linear` — evenly in years
 *  - `log`    — evenly in log(yearsAgo): lingers on the recent end
 *  - `tau`    — evenly in log(time since the Big Bang): lingers on the first instants
 */
export type TimeScale = 'linear' | 'log' | 'tau'

export type Biome = 'paleozoic-sea' | 'coal-forest' | 'mesozoic' | 'savanna'

export interface Chapter {
  readonly id: string
  readonly numeral: string
  readonly title: string
  readonly kicker: string
  readonly narration: string
  readonly scene: SceneId
  readonly biome?: Biome
  readonly fromYearsAgo: number
  readonly toYearsAgo: number
  /** for `tau` chapters: [start, end] of the chapter in years since the Big Bang */
  readonly tau?: readonly [number, number]
  readonly scale: TimeScale
  /** relative share of the scroll track */
  readonly weight: number
  /** accent colour for typography / UI glow */
  readonly accent: string
}

const PLANCK_TIME_YEARS = 5.39e-44 / SECONDS_PER_YEAR
const RECOMBINATION_TAU = 380_000
const COSMIC_DAWN_END_TAU = 1.0e9

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'origin',
    numeral: 'I',
    title: 'The First Moments',
    kicker: '13.787 billion years ago',
    narration:
      'All of space, energy and time begin in a state hotter and denser than anything since. In a trillionth of a trillionth of a second, inflation stretches a subatomic patch into the seed of everything we can see.',
    scene: 'cosmos',
    fromYearsAgo: AGE_OF_UNIVERSE_YEARS,
    toYearsAgo: AGE_OF_UNIVERSE_YEARS - RECOMBINATION_TAU,
    tau: [PLANCK_TIME_YEARS, RECOMBINATION_TAU],
    scale: 'tau',
    weight: 1.7,
    accent: '#ffd59a',
  },
  {
    id: 'dawn',
    numeral: 'II',
    title: 'Cosmic Dawn',
    kicker: '380,000 years after the Big Bang',
    narration:
      'Atoms form and light breaks free — the afterglow we still detect as the cosmic microwave background. Then darkness, until gravity gathers hydrogen into the first stars, a hundred times the mass of the Sun.',
    scene: 'cosmos',
    fromYearsAgo: AGE_OF_UNIVERSE_YEARS - RECOMBINATION_TAU,
    toYearsAgo: AGE_OF_UNIVERSE_YEARS - COSMIC_DAWN_END_TAU,
    tau: [RECOMBINATION_TAU, COSMIC_DAWN_END_TAU],
    scale: 'tau',
    weight: 1.3,
    accent: '#9ec8ff',
  },
  {
    id: 'galaxies',
    numeral: 'III',
    title: 'The Age of Galaxies',
    kicker: '12.8 – 4.6 billion years ago',
    narration:
      'Galaxies collide and merge along a cosmic web of dark matter. Our Milky Way grows by swallowing smaller galaxies, while generations of stars forge the carbon, oxygen and iron that will one day build us.',
    scene: 'cosmos',
    fromYearsAgo: AGE_OF_UNIVERSE_YEARS - COSMIC_DAWN_END_TAU,
    toYearsAgo: 4.6e9,
    scale: 'linear',
    weight: 1.3,
    accent: '#c7b4ff',
  },
  {
    id: 'sun',
    numeral: 'IV',
    title: 'A Star Is Born',
    kicker: '4.6 billion years ago',
    narration:
      'A cloud of gas and dust collapses. At its heart the Sun ignites; around it, a spinning disk of debris clumps into planetesimals, then planets. The oldest solids in the Solar System date to 4,567.3 million years ago.',
    scene: 'solar',
    fromYearsAgo: 4.6e9,
    toYearsAgo: 4.54e9,
    scale: 'linear',
    weight: 1.4,
    accent: '#ffb347',
  },
  {
    id: 'hadean',
    numeral: 'V',
    title: 'Hadean Fire',
    kicker: '4.54 – 4.0 billion years ago',
    narration:
      'A Mars-sized world called Theia strikes the young Earth, and the debris becomes the Moon. The surface is a magma ocean under a sky of rock vapour — yet within 150 million years, liquid water collects.',
    scene: 'earth',
    fromYearsAgo: 4.54e9,
    toYearsAgo: 4.0e9,
    scale: 'linear',
    weight: 1.2,
    accent: '#ff6a3d',
  },
  {
    id: 'life',
    numeral: 'VI',
    title: 'The Spark of Life',
    kicker: '4.0 – 2.5 billion years ago',
    narration:
      'In a world of ocean and volcanic islands, chemistry becomes biology. Microbial mats build stromatolites, and some learn to split water with sunlight — releasing a waste gas that will change everything: oxygen.',
    scene: 'earth',
    fromYearsAgo: 4.0e9,
    toYearsAgo: 2.5e9,
    scale: 'linear',
    weight: 1.0,
    accent: '#5fd3c4',
  },
  {
    id: 'oxygen',
    numeral: 'VII',
    title: 'The Great Oxidation',
    kicker: '2.5 – 1.0 billion years ago',
    narration:
      'Oxygen floods the atmosphere, rusting the seas and triggering global glaciation. Complex cells with nuclei appear, then sex, then the first multicellular algae — during a long, quiet "Boring Billion".',
    scene: 'earth',
    fromYearsAgo: 2.5e9,
    toYearsAgo: 1.0e9,
    scale: 'linear',
    weight: 0.9,
    accent: '#8fd1ff',
  },
  {
    id: 'snowball',
    numeral: 'VIII',
    title: 'Rodinia & Snowball Earth',
    kicker: '1 billion – 539 million years ago',
    narration:
      'The supercontinent Rodinia assembles and tears apart. Twice the planet freezes almost pole to pole. When the ice retreats, the strange soft-bodied Ediacaran creatures appear on the sea floor.',
    scene: 'earth',
    fromYearsAgo: 1.0e9,
    toYearsAgo: 538.8e6,
    scale: 'linear',
    weight: 1.1,
    accent: '#d9f2ff',
  },
  {
    id: 'seas',
    numeral: 'IX',
    title: 'Cambrian Seas',
    kicker: '538.8 – 419 million years ago',
    narration:
      'In a geological instant, almost every animal body plan appears: eyes, shells, legs, jaws. Trilobites crawl the shelves, nautiloids hunt in the water column and the first vertebrates swim among reefs.',
    scene: 'surface',
    biome: 'paleozoic-sea',
    fromYearsAgo: 538.8e6,
    toYearsAgo: 419.6e6,
    scale: 'linear',
    weight: 1.5,
    accent: '#4fd1ff',
  },
  {
    id: 'land',
    numeral: 'X',
    title: 'Forests of Coal',
    kicker: '419 – 299 million years ago',
    narration:
      'Plants, then animals, climb onto land. Fish with fingers crawl into the shallows. In Carboniferous swamps, 40-metre club-moss trees bury so much carbon that oxygen climbs past 30% and dragonflies grow wings 70 cm across.',
    scene: 'surface',
    biome: 'coal-forest',
    fromYearsAgo: 419.6e6,
    toYearsAgo: 298.9e6,
    scale: 'linear',
    weight: 1.5,
    accent: '#9be36b',
  },
  {
    id: 'pangaea',
    numeral: 'XI',
    title: 'Pangaea & The Great Dying',
    kicker: '299 – 201 million years ago',
    narration:
      'Every continent fuses into Pangaea. Then Siberia erupts: the end-Permian extinction erases roughly 90% of marine species. From the survivors rise the first dinosaurs and the first mammals.',
    scene: 'earth',
    fromYearsAgo: 298.9e6,
    toYearsAgo: 201.4e6,
    scale: 'linear',
    weight: 1.2,
    accent: '#ff9b5e',
  },
  {
    id: 'dinosaurs',
    numeral: 'XII',
    title: 'The Age of Dinosaurs',
    kicker: '201 – 66 million years ago',
    narration:
      'For 135 million years, dinosaurs rule every continent — from 30-metre sauropods to feathered raptors. Birds take flight, flowers bloom for the first time, and Pangaea splits as the Atlantic opens.',
    scene: 'surface',
    biome: 'mesozoic',
    fromYearsAgo: 201.4e6,
    toYearsAgo: 66.1e6,
    scale: 'linear',
    weight: 1.8,
    accent: '#ffcf5e',
  },
  {
    id: 'impact',
    numeral: 'XIII',
    title: 'Impact',
    kicker: '66.04 million years ago',
    narration:
      'A 10-kilometre asteroid strikes the Yucatán at about 20 km/s. Fire, darkness and a years-long winter follow. Three quarters of all species vanish — including every non-avian dinosaur.',
    scene: 'earth',
    fromYearsAgo: 66.1e6,
    toYearsAgo: 65.9e6,
    scale: 'linear',
    weight: 1.1,
    accent: '#ff4d2e',
  },
  {
    id: 'mammals',
    numeral: 'XIV',
    title: 'Rise of the Mammals',
    kicker: '66 – 7 million years ago',
    narration:
      'Small survivors inherit an empty world. Mammals diversify into whales, bats, horses and primates. India slams into Asia raising the Himalaya, Antarctica freezes over, and grasslands spread.',
    scene: 'earth',
    fromYearsAgo: 65.9e6,
    toYearsAgo: 7e6,
    scale: 'log',
    weight: 1.1,
    accent: '#e8c27a',
  },
  {
    id: 'hominins',
    numeral: 'XV',
    title: 'Our Ancestors',
    kicker: '7 million – 300,000 years ago',
    narration:
      'In Africa, apes begin to walk upright. Stone tools, then fire. Homo erectus spreads across Asia. By 300,000 years ago, at Jebel Irhoud in Morocco, people with faces like ours are alive.',
    scene: 'surface',
    biome: 'savanna',
    fromYearsAgo: 7e6,
    toYearsAgo: 300_000,
    scale: 'log',
    weight: 1.5,
    accent: '#f0a868',
  },
  {
    id: 'sapiens',
    numeral: 'XVI',
    title: 'One Species, Every Continent',
    kicker: '300,000 – 11,700 years ago',
    narration:
      'Homo sapiens leaves Africa and reaches Australia, Europe and finally the Americas, through an ice age that lowers the seas by 120 metres. Our cousins — Neanderthals, Denisovans — fade away.',
    scene: 'earth',
    fromYearsAgo: 300_000,
    toYearsAgo: 11_700,
    scale: 'log',
    weight: 1.3,
    accent: '#bfe3ff',
  },
  {
    id: 'civilization',
    numeral: 'XVII',
    title: 'Civilization',
    kicker: '9700 BCE – 1450 CE',
    narration:
      'The ice retreats. People farm, settle, write, build. Cities light up across the Fertile Crescent, the Nile, the Indus, the Yellow River, Mesoamerica and the Andes — and empires rise and fall.',
    scene: 'earth',
    fromYearsAgo: 11_700,
    toYearsAgo: 2026 - 1450,
    scale: 'log',
    weight: 1.6,
    accent: '#ffd27f',
  },
  {
    id: 'modern',
    numeral: 'XVIII',
    title: 'A Connected World',
    kicker: '1450 – 1945',
    narration:
      'The printing press, ocean voyages, the scientific revolution, steam and electricity. Population doubles and doubles again — and two world wars show the cost of what we have learned to build.',
    scene: 'earth',
    fromYearsAgo: 2026 - 1450,
    toYearsAgo: 2026 - 1945,
    scale: 'linear',
    weight: 1.3,
    accent: '#ffe2a8',
  },
  {
    id: 'now',
    numeral: 'XIX',
    title: 'The Accelerating Present',
    kicker: '1945 – 2026',
    narration:
      'We split the atom, read DNA, walk on the Moon and wire the planet into one network. Eight billion people, thousands of satellites, a warming climate — and machines that are beginning to think.',
    scene: 'earth',
    fromYearsAgo: 2026 - 1945,
    toYearsAgo: 0,
    scale: 'linear',
    weight: 1.6,
    accent: '#7fe0ff',
  },
]
