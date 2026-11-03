/** A [x, y] anchor. Tables must be sorted by x ascending. */
export type Anchor = readonly [number, number]

/** Piecewise-linear interpolation, clamped at both ends. */
export function interpolate(table: readonly Anchor[], x: number): number {
  if (table.length === 0) throw new Error('interpolate: empty table')
  if (x <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (x >= last[0]) return last[1]
  let lo = 0
  let hi = table.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (table[mid][0] <= x) lo = mid
    else hi = mid
  }
  const [x0, y0] = table[lo]
  const [x1, y1] = table[hi]
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}

/** Interpolate in log-space of y (for quantities spanning orders of magnitude). */
export function interpolateLogY(table: readonly Anchor[], x: number): number {
  const logged = table.map(([a, b]) => [a, Math.log(b)] as const)
  return Math.exp(interpolate(logged, x))
}

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
