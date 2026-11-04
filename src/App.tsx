import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Icon } from './design/icons'
import { CameraRig } from './scenes/CameraRig'
import { Director } from './scenes/Director'
import { Effects } from './scenes/Effects'
import { setChapterListener, startClock } from './time/clock'
import { DPR_RANGE, useApp, type Quality } from './time/store'
import { useTimeInput } from './time/useInput'
import { BottomHud, ShowChrome, TopBar } from './ui/Hud'
import { SafeAreaTracker } from './ui/SafeAreaTracker'
import { Landing } from './ui/Landing'
import { EndCard, Panels, RotateHint, Transitions } from './ui/Overlays'
import { ChapterCard, EventFeed } from './ui/Story'

/** dev-only: expose renderer state for debugging from the console */
function DevHandle() {
  const state = useThree()
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __three: state })
  }, [state])
  return null
}

const DOWNGRADE: Record<Quality, Quality> = { high: 'medium', medium: 'low', low: 'low' }

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

export default function App() {
  const started = useApp((s) => s.started)
  const quality = useApp((s) => s.quality)
  const setQuality = useApp((s) => s.setQuality)
  const setChapterIndex = useApp((s) => s.setChapterIndex)
  const immersive = useApp((s) => s.immersive)
  const [webgl] = useState(hasWebGL2)

  useEffect(() => {
    setChapterListener(setChapterIndex)
    startClock()
  }, [setChapterIndex])
  useTimeInput(started)

  if (!webgl) {
    return (
      <div className="auth">
        <div className="card empty">
          <span className="e-icon">
            <Icon name="display" size={24} />
          </span>
          <h2>Origins needs WebGL 2</h2>
          <p>Please open it in a recent version of Chrome, Edge, Firefox or Safari.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Canvas
        className="stage"
        dpr={DPR_RANGE[quality]}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        camera={{ fov: 45, near: 0.01, far: 2000, position: [0, 0, 10] }}
      >
        <PerformanceMonitor onDecline={() => setQuality(DOWNGRADE[quality])} flipflops={2} />
        <AdaptiveDpr pixelated={false} />
        {import.meta.env.DEV && <DevHandle />}
        <CameraRig />
        <Suspense fallback={null}>
          <Director />
        </Suspense>
        <Effects quality={quality} />
      </Canvas>
      <div className={`ui ${started ? 'ui--live' : ''} ${immersive ? 'ui--immersive' : ''}`}>
        <TopBar />
        <ChapterCard />
        <EventFeed />
        <BottomHud />
        <EndCard />
        <RotateHint />
      </div>
      <ShowChrome />
      <SafeAreaTracker />
      <Transitions />
      <Panels />
      <Landing />
    </>
  )
}
