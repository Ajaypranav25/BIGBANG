/**
 * The part of the screen not covered by floating chrome, in CSS pixels from each edge.
 * The camera rig shifts and widens the 3D view so every scene is framed inside this area
 * instead of under the top bar, the HUD or the landing page's glass panel.
 */
export const safeArea = { top: 0, bottom: 0, left: 0 }

/** Extra breathing room between the chrome and the framed content. */
const GAP = 10
/** landing framing: shift the centre right by half of this fraction of the width */
const LANDING_SHIFT = 0.22
/** landing framing: lift the centre by half of this fraction of the height */
const LANDING_LIFT = 0.1
/** landing framing on phones: push the centre down by half of this fraction of the height */
const LANDING_PHONE_DROP = 0.42

const edge = (name: string) => document.querySelector<HTMLElement>(`[data-safe="${name}"]`)

/**
 * `chrome`: the journey's top bar / HUD are showing. `landing`: the landing page is showing,
 * whose left glass panel covers the left of the screen on wide layouts.
 */
export function measureSafeArea(chrome: boolean, landing: boolean): void {
  const h = window.innerHeight
  const w = window.innerWidth
  if (landing) {
    // the landing galaxy sits a little right of centre and reaches about halfway into the
    // left glass panel, seen through it; on the single-panel mobile layout it stays centred
    const wide = (edge('left')?.getBoundingClientRect().width ?? w) < w * 0.8
    // phones: sink the galaxy behind the lower half so the headline sits over darker glass
    safeArea.top = wide ? 0 : h * LANDING_PHONE_DROP
    safeArea.bottom = wide ? h * LANDING_LIFT : 0
    safeArea.left = wide ? w * LANDING_SHIFT : 0
    return
  }
  const top = chrome ? edge('top') : null
  const bottom = chrome ? edge('bottom') : null
  safeArea.top = top ? Math.max(0, top.getBoundingClientRect().bottom + GAP) : 0
  safeArea.bottom = bottom ? Math.max(0, h - bottom.getBoundingClientRect().top + GAP) : 0
  safeArea.left = 0
}

/**
 * Vertical field of view that shows the scene's intended framing inside the free area, and the
 * projection offsets (px) that centre it there. Pure, for testing.
 */
export function framing(
  fovDeg: number,
  height: number,
  top: number,
  bottom: number,
  left = 0,
): { fov: number; offsetX: number; offsetY: number } {
  const free = Math.max(height * 0.35, height - top - bottom)
  const k = height / free
  const half = (fovDeg * Math.PI) / 360
  const fov = Math.min(120, (Math.atan(Math.tan(half) * k) * 360) / Math.PI)
  const centre = top + free / 2
  return { fov, offsetX: -left / 2, offsetY: height / 2 - centre }
}
