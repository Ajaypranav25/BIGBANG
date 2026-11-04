import { Suspense, useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import { CHAPTERS } from '../data/chapters'
import { useApp } from '../time/store'
import { CosmosScene } from './cosmos/CosmosScene'
import { EarthScene } from './earth/EarthScene'
import { rig } from './rig'
import { SolarScene } from './solar/SolarScene'
import { SurfaceScene } from './surface/SurfaceScene'

const PRELOAD = [
  '/textures/milky-way.jpg',
  '/textures/sun.jpg',
  '/textures/moon.jpg',
  '/textures/paleo-atlas.jpg',
  '/textures/earth-day.jpg',
  '/textures/earth-night.jpg',
  '/textures/earth-clouds.jpg',
  '/textures/mercury.jpg',
  '/textures/venus.jpg',
  '/textures/mars.jpg',
  '/textures/jupiter.jpg',
  '/textures/saturn.jpg',
  '/textures/saturn-ring.png',
  '/textures/uranus.jpg',
  '/textures/neptune.jpg',
]
PRELOAD.forEach((url) => useTexture.preload(url))

/** Mounts exactly one scene: the one the current chapter belongs to. */
export function Director() {
  const chapterIndex = useApp((s) => s.chapterIndex)
  const chapter = CHAPTERS[chapterIndex]
  const key = chapter.scene === 'surface' ? `surface-${chapter.biome}` : chapter.scene

  useEffect(() => {
    rig.cut = true
  }, [key])

  return (
    <Suspense fallback={null}>
      {chapter.scene === 'cosmos' && <CosmosScene key={key} />}
      {chapter.scene === 'solar' && <SolarScene key={key} />}
      {chapter.scene === 'earth' && <EarthScene key={key} />}
      {chapter.scene === 'surface' && chapter.biome && <SurfaceScene key={key} biome={chapter.biome} />}
    </Suspense>
  )
}
