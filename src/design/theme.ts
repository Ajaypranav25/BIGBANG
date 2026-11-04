// Light / dark theme, ported from Queue-Management/public/js/theme.js. Follows the system until
// the user picks one; the choice is a per-browser convenience kept in localStorage.
import { useSyncExternalStore } from 'react'

const KEY = 'origins-theme'
export type Theme = 'light' | 'dark'

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null // storage blocked (private mode) - fall back to the system theme
  }
}

export function currentTheme(): Theme {
  const explicit = document.documentElement.getAttribute('data-theme')
  if (explicit === 'light' || explicit === 'dark') return explicit
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyStoredTheme(): void {
  const theme = stored()
  if (theme) document.documentElement.setAttribute('data-theme', theme)
}

const listeners = new Set<() => void>()

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // not persisted; the theme still applies for this page view
  }
  listeners.forEach((l) => l())
  return next
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', cb)
  return () => {
    listeners.delete(cb)
    mq.removeEventListener('change', cb)
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'dark')
}

/** Icon name for the button: shows what you will switch to. */
export const themeIconName = (theme: Theme) => (theme === 'dark' ? 'sun' : 'moon') as 'sun' | 'moon'
