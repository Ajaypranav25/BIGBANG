import { create } from 'zustand'

export type Quality = 'low' | 'medium' | 'high'
export type Panel = 'none' | 'chapters' | 'about'

interface AppState {
  started: boolean
  chapterIndex: number
  autopilot: boolean
  quality: Quality
  panel: Panel
  /** chrome hidden for an unobstructed view */
  immersive: boolean
  start: () => void
  setChapterIndex: (i: number) => void
  setAutopilotFlag: (on: boolean) => void
  setQuality: (q: Quality) => void
  setPanel: (p: Panel) => void
  toggleImmersive: () => void
}

function detectQuality(): Quality {
  if (typeof navigator === 'undefined') return 'medium'
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency ?? 4
  if (mobile) return 'low'
  if (cores >= 8) return 'high'
  return 'medium'
}

export const useApp = create<AppState>((set) => ({
  started: false,
  chapterIndex: 0,
  autopilot: false,
  quality: detectQuality(),
  panel: 'none',
  immersive: false,
  start: () => set({ started: true }),
  setChapterIndex: (chapterIndex) => set({ chapterIndex }),
  setAutopilotFlag: (autopilot) => set({ autopilot }),
  setQuality: (quality) => set({ quality }),
  setPanel: (panel) => set({ panel }),
  toggleImmersive: () => set((s) => ({ immersive: !s.immersive })),
}))

export const PARTICLE_BUDGET: Record<Quality, number> = {
  low: 45_000,
  medium: 110_000,
  high: 200_000,
}

export const DPR_RANGE: Record<Quality, [number, number]> = {
  low: [0.75, 1],
  medium: [1, 1.5],
  high: [1, 2],
}
