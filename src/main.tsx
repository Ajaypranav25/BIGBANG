import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './design/app.css'
import './styles.css'
import { applyStoredTheme } from './design/theme'
import { setTarget, snapTo } from './time/clock'
import { timeToProgress } from './time/timeline'

if (import.meta.env.DEV) {
  // dev-only navigation hook for testing: __origins.go(66e6) jumps to 66 million years ago
  Object.assign(window, {
    __origins: { setTarget, snapTo, go: (yearsAgo: number) => snapTo(timeToProgress(yearsAgo)) },
  })
}

applyStoredTheme()

const root = document.getElementById('root')
if (!root) throw new Error('#root element missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
