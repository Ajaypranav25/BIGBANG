/**
 * Dispersal routes of Homo sapiens. Times are years ago; [lat, lon] waypoints are
 * archaeological anchor sites. Sources: Bae, Douka & Petraglia (2017) Science 358;
 * Clarkson et al. (2017) Nature 547 (Madjedbebe); Hublin et al. (2020) Nature 581 (Bacho Kiro);
 * Fu et al. (2014) Nature 514 (Ust'-Ishim); Sikora et al. (2019) Nature 570 (Yana RHS);
 * Bennett et al. (2021) Science 373 & Pigati et al. (2023) Science 382 (White Sands);
 * Dillehay et al. (2015) PLoS ONE (Monte Verde).
 */
export interface Route {
  readonly name: string
  readonly from: number
  readonly to: number
  readonly path: ReadonlyArray<readonly [number, number]>
}

export const ROUTES: readonly Route[] = [
  {
    name: 'Into the Levant',
    from: 130_000,
    to: 95_000,
    path: [
      [4.9, 35.9],
      [15.5, 32.5],
      [30.0, 32.5],
      [32.7, 35.0],
    ],
  },
  {
    name: 'Southern route to Sahul',
    from: 72_000,
    to: 50_000,
    path: [
      [9.0, 40.0],
      [12.6, 43.3],
      [17.0, 50.0],
      [21.0, 72.0],
      [16.0, 96.0],
      [2.0, 104.0],
      [-6.0, 115.0],
      [-12.6, 132.9],
    ],
  },
  {
    name: 'Into Europe',
    from: 55_000,
    to: 38_000,
    path: [
      [32.7, 35.0],
      [38.9, 33.0],
      [42.9, 25.6],
      [47.0, 15.0],
      [44.4, 2.0],
    ],
  },
  {
    name: 'East Asia',
    from: 55_000,
    to: 38_000,
    path: [
      [21.0, 72.0],
      [27.0, 88.0],
      [30.5, 104.0],
      [39.6, 115.9],
      [36.0, 138.0],
    ],
  },
  {
    name: 'Siberia & Beringia',
    from: 48_000,
    to: 26_000,
    path: [
      [40.0, 60.0],
      [57.6, 71.0],
      [62.0, 105.0],
      [70.7, 135.4],
      [66.0, 175.0],
    ],
  },
  {
    name: 'The Americas',
    from: 26_000,
    to: 14_500,
    path: [
      [66.0, 175.0],
      [64.0, -150.0],
      [55.0, -132.0],
      [45.0, -122.0],
      [32.9, -106.3],
      [15.0, -90.0],
      [-5.0, -80.0],
      [-41.5, -73.2],
    ],
  },
]
