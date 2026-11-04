/**
 * X — Devonian → Carboniferous (419.6–298.9 Ma).
 * Early: bare shores with leafless rhyniophytes, then Archaeopteris forests and Tiktaalik (~375 Ma)
 * in the shallows. Later: coal-swamp forests of Lepidodendron, Sigillaria, Calamites and tree
 * ferns; Arthropleura on the ground and Meganeura (~300 Ma) in the air.
 */
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { type BufferGeometry, Color, DoubleSide, FogExp2, Mesh } from 'three'
import { createRng } from '../../../lib/random'
import { useApp } from '../../../time/store'
import { rig } from '../../rig'
import { Arthropleura, Meganeura, Tiktaalik } from '../creatures/forestLife'
import { groundFern } from '../flora/common'
import { archaeopteris, calamites, lepidodendron, psilophyteClump, sigillaria, treeFern } from '../flora/carboniferous'
import { Beams } from '../shared/Beams'
import { useCinematicCamera, type CameraPlan } from '../shared/camera'
import { CloudLayer } from '../shared/Clouds'
import { makeInstanced, type Placement, scaled } from '../shared/instancing'
import { Gate, patchedStandard, useInstances, Walker } from '../shared/layers'
import { useSceneLook } from '../shared/look'
import { Motes } from '../shared/Motes'
import { createNoise2D, fbm2 } from '../shared/noise2d'
import { barkPatch, lifePatch, swayPatch } from '../shared/patch'
import { createSkyUniforms, SkyDome } from '../shared/Sky'
import { buildTerrain, distanceToPath, hex, scatter } from '../shared/terrain'
import { Water } from '../shared/Water'

const noise = createNoise2D(359)

function groundY(x: number, z: number): number {
  const base = fbm2(noise, x * 0.018, z * 0.018, 4) * 3.2 + 0.35
  const detail = fbm2(noise, x * 0.09 + 7, z * 0.09, 3) * 0.5
  const lake = -2.4 * Math.exp(-((x + 7) ** 2 + (z - 30) ** 2) / 220)
  return base + detail + lake
}

const PLAN: CameraPlan = {
  path: [[2, 1.9, 44], [-2, 1.6, 26], [3, 2.0, 8], [-2, 2.6, -12], [4, 3.4, -30], [0, 5.5, -48]],
  look: [[-4, 0.6, 28], [-5, 0.8, 12], [0, 2.5, -8], [2, 4, -28], [0, 6, -46], [0, 8, -64]],
  skyHeight: 95,
  fov: 52,
  ground: (x, z) => Math.max(groundY(x, z), 0),
}
const PATH_XZ = PLAN.path.map(([x, , z]) => [x, z] as const)
const AREA = { x0: -70, x1: 70, z0: -95, z1: 60 }

const onLand = (min: number) => (x: number, z: number) => groundY(x, z) > min && distanceToPath(PATH_XZ, x, z) > 3.2

interface FloraLayer {
  build: (rng: () => number) => BufferGeometry
  count: number
  accept: (x: number, z: number) => boolean
  scale: [number, number]
  life: (rng: () => number) => [number, number]
  sway: [number, number, number]
  seed: number
}

const LAYERS: readonly FloraLayer[] = [
  { build: psilophyteClump, count: 1100, accept: onLand(-0.1), scale: [0.8, 1.6], life: (r) => [0.0 + r() * 0.08, 0.6 + r() * 0.25], sway: [0.04, 1.4, 0.5], seed: 21 },
  { build: (r) => groundFern(r, 0.95), count: 2000, accept: onLand(0.05), scale: [0.6, 1.5], life: (r) => [0.22 + r() * 0.3, 2], sway: [0.08, 1.2, 0.8], seed: 22 },
  { build: archaeopteris, count: 80, accept: onLand(0.3), scale: [0.7, 1.15], life: (r) => [0.2 + r() * 0.14, 0.5 + r() * 0.1], sway: [0.25, 0.5, 14], seed: 23 },
  { build: calamites, count: 240, accept: (x, z) => groundY(x, z) > -0.5 && groundY(x, z) < 1.0 && distanceToPath(PATH_XZ, x, z) > 2.5, scale: [0.7, 1.3], life: (r) => [0.4 + r() * 0.18, 2], sway: [0.25, 0.7, 11], seed: 24 },
  { build: lepidodendron, count: 140, accept: onLand(0.2), scale: [0.8, 1.35], life: (r) => [0.48 + r() * 0.24, 2], sway: [0.35, 0.35, 30], seed: 25 },
  { build: sigillaria, count: 80, accept: onLand(0.2), scale: [0.8, 1.3], life: (r) => [0.54 + r() * 0.22, 2], sway: [0.3, 0.4, 20], seed: 26 },
  { build: treeFern, count: 120, accept: onLand(0.1), scale: [0.7, 1.3], life: (r) => [0.55 + r() * 0.25, 2], sway: [0.3, 0.6, 9], seed: 27 },
]

function useFloraLayer(layer: FloraLayer, quality: 'low' | 'medium' | 'high') {
  return useInstances(() => {
    const rng = createRng(layer.seed)
    const list: Placement[] = scatter(rng, scaled(layer.count, quality), AREA, layer.accept).map(([x, z]) => ({
      x,
      y: Math.max(groundY(x, z), -0.4) - 0.05,
      z,
      rotY: rng() * 6.28,
      tilt: [(rng() - 0.5) * 0.08, (rng() - 0.5) * 0.08],
      scale: layer.scale[0] + rng() * (layer.scale[1] - layer.scale[0]),
      life: layer.life(rng),
    }))
    const [amp, freq, height] = layer.sway
    const mat = patchedStandard([lifePatch, swayPatch(amp, freq, height), barkPatch(16)], { side: DoubleSide, roughness: 0.9 })
    return makeInstanced(layer.build(rng), mat, list)
  }, [layer, quality])
}

const TIK_LOOP: ReadonlyArray<readonly [number, number]> = [[-9, 25], [-4, 27], [-5, 32], [-10, 31]]

export function CoalForest() {
  const quality = useApp((s) => s.quality)
  const background = useMemo(() => new Color('#5a6550'), [])
  const fog = useMemo(() => new FogExp2('#5a6550', 0.014), [])
  useSceneLook(background, fog)
  useCinematicCamera(PLAN)
  useFrame(() => {
    rig.bloom = 0.8
  })

  const sky = useMemo(
    () => createSkyUniforms({ top: '#6f7f74', horizon: '#a9b195', ground: '#3b3a2c', sunDir: [0.45, 0.42, -0.6], sunColor: '#fff1c9', sunSize: 2.2, haze: 1.8 }),
    [],
  )

  const terrain = useMemo(() => {
    const peat = hex('#4a3d28')
    const moss = hex('#5a6b32')
    const mud = hex('#4d4433')
    const geo = buildTerrain({
      size: 300,
      segments: quality === 'low' ? 120 : 200,
      height: groundY,
      color: (x, z, h) => (h < 0.15 ? mud : peat.clone().lerp(moss, 0.5 + 0.5 * noise(x * 0.06, z * 0.06))).clone().multiplyScalar(0.9 + 0.2 * noise(x * 0.4, z * 0.4)),
    })
    return new Mesh(geo, patchedStandard([], { roughness: 1 }))
  }, [quality])
  useEffect(() => () => {
    terrain.geometry.dispose()
    terrain.material.dispose()
  }, [terrain])

  const l0 = useFloraLayer(LAYERS[0], quality)
  const l1 = useFloraLayer(LAYERS[1], quality)
  const l2 = useFloraLayer(LAYERS[2], quality)
  const l3 = useFloraLayer(LAYERS[3], quality)
  const l4 = useFloraLayer(LAYERS[4], quality)
  const l5 = useFloraLayer(LAYERS[5], quality)
  const l6 = useFloraLayer(LAYERS[6], quality)

  const dragonflies = useMemo(() => {
    const rng = createRng(31)
    return Array.from({ length: quality === 'low' ? 3 : 7 }, (_, i) => ({
      center: [(rng() - 0.5) * 14, 2.5 + rng() * 3, 10 - i * 7] as const,
      radius: [3 + rng() * 4, 0.8 + rng(), 3 + rng() * 4] as const,
      speed: 0.35 + rng() * 0.25,
      phase: rng() * 6.28,
    }))
  }, [quality])

  return (
    <>
      <SkyDome uniforms={sky} />
      <hemisphereLight args={['#d2dcb9', '#4a4230', 1.3]} />
      <directionalLight position={[45, 60, -55]} intensity={2.6} color="#ffe9c0" />
      <primitive object={terrain} />
      <Water size={300} y={0} color="#121a14" quality={quality} />
      <primitive object={l0} />
      <primitive object={l1} />
      <primitive object={l2} />
      <primitive object={l3} />
      <primitive object={l4} />
      <primitive object={l5} />
      <primitive object={l6} />
      <Gate from={0.18} to={0.52} shrink={false}>
        <Walker points={TIK_LOOP} speed={0.35} groundY={() => 0} lift={-0.06}>
          <Tiktaalik />
        </Walker>
      </Gate>
      <Gate from={0.6} to={1.2} shrink={false}>
        <Arthropleura center={[5, -6]} radius={7} speed={0.45} groundY={groundY} />
      </Gate>
      <Gate from={0.74} to={1.2} shrink={false}>
        {dragonflies.map((d, i) => (
          <Meganeura key={i} path={d} />
        ))}
      </Gate>
      <CloudLayer count={quality === 'low' ? 18 : 36} spread={220} height={72} thickness={18} size={70} color="#e3e6d5" shade="#8b917d" opacity={0.85} />
      <CloudLayer count={quality === 'low' ? 14 : 30} spread={120} height={1.6} thickness={2.5} size={24} color="#c9cfb8" shade="#848a76" opacity={0.32} seed={9} />
      <Beams count={quality === 'low' ? 4 : 9} spread={70} top={42} length={50} width={4.5} lean={[0.38, -0.22]} color="#fff1c4" opacity={0.055} center={[0, -10]} />
      <Motes count={scaled(1600, quality)} box={[70, 18, 120]} position={[0, 8, -6]} color="#f4f0c4" size={0.4} fall={0.02} drift={0.6} opacity={0.5} />
    </>
  )
}
