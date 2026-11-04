import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  LinearFilter,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { moment } from '../rig'
import { earthState } from './earthState'
import { PALEO_COLS, PALEO_ROWS, latLonToVec3, paleoFrames, PALEO_SITES } from './geo'
import {
  atmosphereFragment,
  atmosphereVertex,
  cloudFragment,
  globeFragment,
  globeVertex,
} from './globeShader'

export const earthSun = { dir: new Vector3(1, 0.2, 0.4).normalize() }

const impactDir = latLonToVec3(...PALEO_SITES.chicxulub66)
const trapsDir = new Vector3()

export function Globe() {
  const [atlas, day, night, clouds] = useTexture([
    '/textures/paleo-atlas.jpg',
    '/textures/earth-day.jpg',
    '/textures/earth-night.jpg',
    '/textures/earth-clouds.jpg',
  ])
  useMemo(() => {
    atlas.generateMipmaps = false
    atlas.minFilter = LinearFilter
    atlas.magFilter = LinearFilter
    atlas.needsUpdate = true
    day.colorSpace = SRGBColorSpace
    night.colorSpace = SRGBColorSpace
    day.anisotropy = 8
  }, [atlas, day, night])

  const sphere = useMemo(() => new SphereGeometry(1, 192, 128), [])
  const globe = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: globeVertex,
        fragmentShader: globeFragment,
        uniforms: {
          uAtlas: { value: atlas },
          uDay: { value: day },
          uNight: { value: night },
          uCols: { value: PALEO_COLS },
          uRows: { value: PALEO_ROWS },
          uFrameA: { value: 0 },
          uFrameB: { value: 0 },
          uFrameMix: { value: 0 },
          uPaleo: { value: 1 },
          uProtoLand: { value: 0 },
          uModern: { value: 1 },
          uMagma: { value: 0 },
          uOcean: { value: 1 },
          uArchean: { value: 0 },
          uIceNorth: { value: 90 },
          uIceSouth: { value: 90 },
          uVegetation: { value: 1 },
          uNightLights: { value: 0 },
          uDust: { value: 0 },
          uFire: { value: 0 },
          uRing: { value: 0 },
          uImpactDir: { value: impactDir },
          uTraps: { value: 0 },
          uTrapsDir: { value: trapsDir },
          uSunDir: { value: earthSun.dir },
          uTime: { value: 0 },
        },
      }),
    [atlas, day, night],
  )
  const atmosphere = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uSunDir: { value: earthSun.dir },
          uHaze: { value: 0 },
          uDust: { value: 0 },
          uMagma: { value: 0 },
          uStrength: { value: 1.3 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  const cloudMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: globeVertex,
        fragmentShader: cloudFragment,
        uniforms: {
          uClouds: { value: clouds },
          uSunDir: { value: earthSun.dir },
          uModern: { value: 1 },
          uTime: { value: 0 },
          uCover: { value: 0.5 },
          uDust: { value: 0 },
        },
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
      }),
    [clouds],
  )

  useEffect(
    () => () => {
      sphere.dispose()
      globe.dispose()
      atmosphere.dispose()
      cloudMat.dispose()
    },
    [sphere, globe, atmosphere, cloudMat],
  )

  useFrame(() => {
    const m = moment()
    const s = earthState(m.yearsAgo, m.chapter.id, m.local)
    const f = paleoFrames(m.yearsAgo / 1e6)
    const g = globe.uniforms
    g.uFrameA.value = f.a
    g.uFrameB.value = f.b
    g.uFrameMix.value = f.mix
    g.uPaleo.value = s.paleo
    g.uProtoLand.value = s.protoLand
    g.uModern.value = s.modern
    g.uMagma.value = s.magma
    g.uOcean.value = s.ocean
    g.uArchean.value = s.archean
    g.uIceNorth.value = s.iceNorth
    g.uIceSouth.value = s.iceSouth
    g.uVegetation.value = s.vegetation
    g.uNightLights.value = s.nightLights
    g.uDust.value = s.dust
    g.uFire.value = s.fire
    g.uRing.value = s.impactRing
    g.uTraps.value = s.traps
    latLonToVec3(s.trapsSite[0], s.trapsSite[1], 1, trapsDir)
    g.uTime.value = m.elapsed

    atmosphere.uniforms.uHaze.value = s.haze
    atmosphere.uniforms.uDust.value = s.dust
    atmosphere.uniforms.uMagma.value = s.magma

    cloudMat.uniforms.uModern.value = s.modern
    cloudMat.uniforms.uTime.value = m.elapsed
    cloudMat.uniforms.uCover.value = 0.38 + 0.08 * s.haze + 0.4 * s.dust - 0.3 * s.magma
    cloudMat.uniforms.uDust.value = s.dust
  })

  return (
    <group>
      <mesh geometry={sphere} material={globe} />
      <mesh geometry={sphere} material={cloudMat} scale={1.012} renderOrder={2} />
      <mesh geometry={sphere} material={atmosphere} scale={1.045} renderOrder={3} />
    </group>
  )
}
