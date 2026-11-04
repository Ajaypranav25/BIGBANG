import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect } from 'postprocessing'
import { Vector2 } from 'three'
import type { Quality } from '../time/store'
import { LiquidGlassEffect, syncGlass } from './liquidGlass'
import { rig } from './rig'

const BASE_BLOOM = 1.15
const aberration = new Vector2(0.0004, 0.0004)

export function Effects({ quality }: { quality: Quality }) {
  const bloom = useRef<BloomEffect>(null)
  const chroma = useRef<ChromaticAberrationEffect>(null)
  const glass = useMemo(() => new LiquidGlassEffect(), [])
  useEffect(() => () => glass.dispose(), [glass])

  useFrame((state) => {
    if (bloom.current) bloom.current.intensity = BASE_BLOOM * rig.bloom * (1 + rig.flash * 2.5)
    const a = 0.0004 + rig.shake * 0.004 + rig.flash * 0.002
    aberration.set(a, a)
    if (chroma.current) chroma.current.offset = aberration
    syncGlass(glass, state.size.width, state.size.height, state.clock.elapsedTime)
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        ref={bloom}
        mipmapBlur
        intensity={BASE_BLOOM}
        luminanceThreshold={0.16}
        luminanceSmoothing={0.35}
        radius={quality === 'low' ? 0.6 : 0.82}
        levels={quality === 'low' ? 5 : 8}
      />
      <ChromaticAberration ref={chroma} offset={aberration} radialModulation modulationOffset={0.35} />
      {/* EffectComposer bypasses the renderer's tone mapping; grain must blend in display range */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* refracts the finished frame through the page's liquid-glass shapes */}
      <primitive object={glass} dispose={null} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.22} />
      <Vignette offset={0.22} darkness={0.78} />
    </EffectComposer>
  )
}
