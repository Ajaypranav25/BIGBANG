/**
 * Geologic time scale: all eons, all eras, the Phanerozoic periods and the
 * Cenozoic epochs, oldest first within each rank.
 *
 * Boundary ages (Ma) follow the ICS International Chronostratigraphic Chart
 * v2024/12 (Cohen et al. 2013; updated). The Hadean base is the ICS value of
 * 4567 Ma and the present is 0. Colours are the official CGMW/ICS RGB values.
 */
import type { GeoUnit } from './types'

export const GEO_UNITS: readonly GeoUnit[] = [
  // ── Eons ──────────────────────────────────────────────────────────────
  { name: 'Hadean', rank: 'eon', startMa: 4567, endMa: 4031, color: '#AE027E' },
  { name: 'Archean', rank: 'eon', startMa: 4031, endMa: 2500, color: '#F0047F' },
  { name: 'Proterozoic', rank: 'eon', startMa: 2500, endMa: 538.8, color: '#F73563' },
  { name: 'Phanerozoic', rank: 'eon', startMa: 538.8, endMa: 0, color: '#9AD9DD' },

  // ── Eras ──────────────────────────────────────────────────────────────
  { name: 'Eoarchean', rank: 'era', startMa: 4031, endMa: 3600, color: '#DA037F' },
  { name: 'Paleoarchean', rank: 'era', startMa: 3600, endMa: 3200, color: '#F4449F' },
  { name: 'Mesoarchean', rank: 'era', startMa: 3200, endMa: 2800, color: '#F768A9' },
  { name: 'Neoarchean', rank: 'era', startMa: 2800, endMa: 2500, color: '#F99BC1' },
  { name: 'Paleoproterozoic', rank: 'era', startMa: 2500, endMa: 1600, color: '#F74370' },
  { name: 'Mesoproterozoic', rank: 'era', startMa: 1600, endMa: 1000, color: '#FDB462' },
  { name: 'Neoproterozoic', rank: 'era', startMa: 1000, endMa: 538.8, color: '#FEB342' },
  { name: 'Paleozoic', rank: 'era', startMa: 538.8, endMa: 251.902, color: '#99C08D' },
  { name: 'Mesozoic', rank: 'era', startMa: 251.902, endMa: 66.0, color: '#67C5CA' },
  { name: 'Cenozoic', rank: 'era', startMa: 66.0, endMa: 0, color: '#F2F91D' },

  // ── Phanerozoic periods ───────────────────────────────────────────────
  { name: 'Cambrian', rank: 'period', startMa: 538.8, endMa: 486.85, color: '#7FA056' },
  { name: 'Ordovician', rank: 'period', startMa: 486.85, endMa: 443.1, color: '#009270' },
  { name: 'Silurian', rank: 'period', startMa: 443.1, endMa: 419.62, color: '#B3E1B6' },
  { name: 'Devonian', rank: 'period', startMa: 419.62, endMa: 358.86, color: '#CB8C37' },
  { name: 'Carboniferous', rank: 'period', startMa: 358.86, endMa: 298.9, color: '#67A599' },
  { name: 'Permian', rank: 'period', startMa: 298.9, endMa: 251.902, color: '#F04028' },
  { name: 'Triassic', rank: 'period', startMa: 251.902, endMa: 201.4, color: '#812B92' },
  { name: 'Jurassic', rank: 'period', startMa: 201.4, endMa: 143.1, color: '#34B2C9' },
  { name: 'Cretaceous', rank: 'period', startMa: 143.1, endMa: 66.0, color: '#7FC64E' },
  { name: 'Paleogene', rank: 'period', startMa: 66.0, endMa: 23.04, color: '#FD9A52' },
  { name: 'Neogene', rank: 'period', startMa: 23.04, endMa: 2.58, color: '#FFE619' },
  { name: 'Quaternary', rank: 'period', startMa: 2.58, endMa: 0, color: '#F9F97F' },

  // ── Cenozoic epochs ───────────────────────────────────────────────────
  { name: 'Paleocene', rank: 'epoch', startMa: 66.0, endMa: 56.0, color: '#FDA75F' },
  { name: 'Eocene', rank: 'epoch', startMa: 56.0, endMa: 33.9, color: '#FDB46C' },
  { name: 'Oligocene', rank: 'epoch', startMa: 33.9, endMa: 23.04, color: '#FDC07A' },
  { name: 'Miocene', rank: 'epoch', startMa: 23.04, endMa: 5.333, color: '#FFFF00' },
  { name: 'Pliocene', rank: 'epoch', startMa: 5.333, endMa: 2.58, color: '#FFFF99' },
  { name: 'Pleistocene', rank: 'epoch', startMa: 2.58, endMa: 0.0117, color: '#FFF2AE' },
  { name: 'Holocene', rank: 'epoch', startMa: 0.0117, endMa: 0, color: '#FEF2E0' },
]
