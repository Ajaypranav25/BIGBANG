/**
 * XV — East African savanna, 7 Ma → 300 ka (log timeline: u ↦ 7 Ma·(0.3/7)^u).
 *  u ≈ 0.10–0.36  Australopithecus afarensis walking the Laetoli ash (3.66 Ma ≈ u 0.21)
 *  u ≈ 0.40–0.64  Homo erectus (from ~1.9 Ma ≈ u 0.41) striding toward the sunset
 *  u ≈ 0.62–0.95  night camp around a fire (control of fire ~1 Ma ≈ u 0.62)
 * A full day passes across the chapter: midday → sunset → night → dawn.
 */
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type DirectionalLight, DoubleSide, FogExp2, type HemisphereLight, Mesh } from 'three'
import { createRng } from '../../../lib/random'
import { useApp } from '../../../time/store'
import { moment, rig } from '../../rig'
import { Creature } from '../Creature'
import { Hominin, type HomininPose } from '../creatures/Hominin'
import { acacia, boulder, savannaGrass } from '../flora/savanna'
import { useCinematicCamera, type CameraPlan } from '../shared/camera'
import { CloudLayer } from '../shared/Clouds'
import { makeInstanced, type Placement, scaled } from '../shared/instancing'
import { Gate, patchedStandard, useInstances, Walker } from '../shared/layers'
import { useSceneLook } from '../shared/look'
import { createNoise2D, fbm2 } from '../shared/noise2d'
import { swayPatch } from '../shared/patch'
import { createSkyUniforms, SkyDome } from '../shared/Sky'
import { buildTerrain, distanceToPath, hex, scatter } from '../shared/terrain'
import { Volcano } from '../shared/Volcano'
import { Campfire, createDayState, Footprints, sampleDay } from './savannaProps'

const noise = createNoise2D(366)
const TRAIL_FROM = [-4.2, 21] as const
const TRAIL_TO = [-1.2, -5] as const
const TRAIL: ReadonlyArray<readonly [number, number]> = [TRAIL_FROM, TRAIL_TO]
const FIRE = [11, -44] as const
const GLB_HEIGHT = 1.35

function groundY(x: number, z: number): number {
  const plain = fbm2(noise, x * 0.012, z * 0.012, 4) * 2.2 + fbm2(noise, x * 0.07, z * 0.07, 2) * 0.25
  const r = Math.hypot(x, z)
  const hills = Math.pow(Math.max(0, r - 130) / 70, 2) * 22
  const camp = -0.15 * Math.exp(-((x - FIRE[0]) ** 2 + (z - FIRE[1]) ** 2) / 30)
  return plain + hills + camp
}

const PLAN: CameraPlan = {
  path: [[2, 3, 52], [-0.5, 1.9, 26], [1.5, 1.7, 8], [8, 2.2, -16], [3, 1.9, -35], [-2, 3.5, -52]],
  look: [[-3, 0.2, 30], [-3, 0.1, 8], [-14, 1.6, -12], [-32, 3, -30], [11, 0.9, -44], [14, 4, -72]],
  skyHeight: 100,
  fov: 48,
  drift: 0.1,
  ground: groundY,
}
const PATH_XZ = PLAN.path.map(([x, , z]) => [x, z] as const)

const LOOPS = {
  afarensis: [[-4.5, 23], [-1.5, -6], [-0.6, -6.4], [-3.6, 23.4]] as ReadonlyArray<readonly [number, number]>,
  erectus: [[-14, -8], [-27, -22], [-19, -36], [-8, -19]] as ReadonlyArray<readonly [number, number]>,
}

/** A hominin of a given standing height: GLB when bundled, procedural silhouette otherwise. */
function Person({ height, pose = 'walk', phase = 0, speed = 1 }: { height: number; pose?: HomininPose; phase?: number; speed?: number }) {
  const fallback = (
    <group scale={GLB_HEIGHT}>
      <Hominin pose={pose} phase={phase} />
    </group>
  )
  return (
    <group scale={height / GLB_HEIGHT}>
      {pose === 'sit' ? fallback : <Creature kind="hominin" speed={speed} fallback={fallback} />}
    </group>
  )
}

export function Savanna() {
  const quality = useApp((s) => s.quality)
  const day = useMemo(createDayState, [])
  const background = useMemo(() => new Color('#c8cdc2'), [])
  const fog = useMemo(() => new FogExp2('#c8cdc2', 0.007), [])
  useSceneLook(background, fog)
  useCinematicCamera(PLAN)

  const sky = useMemo(
    () => createSkyUniforms({ top: '#3a78c0', horizon: '#cfdde3', ground: '#6b5a3c', sunDir: [0, 1, 0], sunColor: '#fff4dc', sunSize: 1.4, haze: 1.2 }),
    [],
  )
  const sun = useRef<DirectionalLight>(null)
  const moon = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)

  useFrame(() => {
    sampleDay(moment().local, day)
    sky.uTop.value.copy(day.top)
    sky.uHorizon.value.copy(day.horizon)
    sky.uSunColor.value.copy(day.sun)
    sky.uSunDir.value.copy(day.sunDir)
    sky.uStars.value = day.stars
    background.copy(day.fog)
    fog.color.copy(day.fog)
    fog.density = day.fogD
    if (sun.current) {
      sun.current.position.copy(day.sunDir).multiplyScalar(120)
      sun.current.color.copy(day.sun)
      sun.current.intensity = day.sunI
    }
    if (moon.current) moon.current.intensity = day.moon
    if (hemi.current) {
      hemi.current.color.copy(day.hemiSky)
      hemi.current.intensity = day.hemiI
    }
    rig.bloom = 0.7 + day.stars * 0.4
  })

  const terrain = useMemo(() => {
    const gold = hex('#a3864a')
    const dry = hex('#86703f')
    const ash = hex('#9a958a')
    const geo = buildTerrain({
      size: 420,
      segments: quality === 'low' ? 130 : 210,
      height: groundY,
      color: (x, z) => {
        const base = gold.clone().lerp(dry, 0.5 + 0.5 * noise(x * 0.04, z * 0.04))
        const ashK = Math.max(0, 1 - Math.max(0, distanceToPath(TRAIL, x, z) - 0.8) / 2.5)
        const campK = Math.max(0, 1 - Math.hypot(x - FIRE[0], z - FIRE[1]) / 4)
        return base.lerp(ash, ashK).lerp(hex('#5d4f3c'), campK * 0.7)
      },
    })
    return new Mesh(geo, patchedStandard([], { roughness: 1 }))
  }, [quality])
  useEffect(() => () => {
    terrain.geometry.dispose()
    terrain.material.dispose()
  }, [terrain])

  const grass = useInstances(() => {
    const rng = createRng(61)
    const accept = (x: number, z: number) =>
      distanceToPath(TRAIL, x, z) > 1.6 && Math.hypot(x - FIRE[0], z - FIRE[1]) > 3.5 && distanceToPath(PATH_XZ, x, z) > 0.8
    const list: Placement[] = scatter(rng, scaled(70_000, quality), { x0: -45, x1: 45, z0: -80, z1: 60 }, accept).map(([x, z]) => ({
      x,
      y: groundY(x, z) - 0.02,
      z,
      rotY: rng() * 6.28,
      tilt: [(rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3],
      scale: 0.55 + rng() * 0.95,
      color: new Color().setHSL(0.1 + rng() * 0.04, 0.4 + rng() * 0.2, 0.42 + rng() * 0.22),
    }))
    return makeInstanced(savannaGrass(), patchedStandard([swayPatch(0.2, 1.7, 0.85)], { side: DoubleSide, roughness: 0.95 }), list)
  }, [quality])

  const trees = useInstances(() => {
    const rng = createRng(62)
    const list: Placement[] = scatter(rng, scaled(55, quality), { x0: -120, x1: 120, z0: -150, z1: 100 }, (x, z) => distanceToPath(PATH_XZ, x, z) > 9 && distanceToPath(TRAIL, x, z) > 6).map(([x, z]) => ({
      x,
      y: groundY(x, z) - 0.1,
      z,
      rotY: rng() * 6.28,
      scale: 0.8 + rng() * 0.6,
    }))
    return makeInstanced(acacia(rng, 63), patchedStandard([swayPatch(0.12, 0.6, 7)], { roughness: 0.9 }), list)
  }, [quality])

  const rocks = useInstances(() => {
    const rng = createRng(64)
    const list: Placement[] = scatter(rng, scaled(70, quality), { x0: -80, x1: 80, z0: -110, z1: 70 }, (x, z) => distanceToPath(PATH_XZ, x, z) > 4).map(([x, z]) => {
      const scale = 0.3 + Math.pow(rng(), 2) * 1.6
      return { x, y: groundY(x, z) - scale * 0.2, z, rotY: rng() * 6.28, scale }
    })
    // seats around the fire
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4
      const x = FIRE[0] + Math.cos(a) * 1.9
      const z = FIRE[1] + Math.sin(a) * 1.9
      list.push({ x, y: groundY(x, z) - 0.05, z, rotY: a, scale: 0.32 })
    }
    return makeInstanced(boulder(65), patchedStandard([], { roughness: 0.95 }), list)
  }, [quality])

  const seated = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.4
        const x = FIRE[0] + Math.cos(a) * 1.9
        const z = FIRE[1] + Math.sin(a) * 1.9
        return { x, y: groundY(x, z) + 0.06, z, face: Math.atan2(FIRE[0] - x, FIRE[1] - z) }
      }),
    [],
  )
  const fireY = groundY(FIRE[0], FIRE[1])

  return (
    <>
      <SkyDome uniforms={sky} />
      <hemisphereLight ref={hemi} args={['#cfe3f5', '#5a4a30', 0.9]} />
      <directionalLight ref={sun} intensity={3} color="#fff4dc" />
      <directionalLight ref={moon} position={[40, 90, 50]} intensity={0} color="#8fa6d8" />
      <primitive object={terrain} />
      <primitive object={grass} />
      <primitive object={trees} />
      <primitive object={rocks} />
      <Volcano position={[120, groundY(120, -260) - 6, -260]} radius={75} height={52} rock="#4a4440" ash="#7c766c" smoke="#9a948a" puffs={14} />
      <Footprints from={TRAIL_FROM} to={TRAIL_TO} groundY={groundY} appear={0.19} />

      <Gate from={0.1} to={0.36} shrink={false}>
        {[0, 0.012, 0.02].map((offset, i) => (
          <Walker key={i} points={LOOPS.afarensis} speed={1.0} offset={offset} groundY={groundY}>
            <Person height={[1.45, 1.15, 1.25][i]} phase={i * 1.7} />
          </Walker>
        ))}
      </Gate>

      <Gate from={0.4} to={0.64} shrink={false}>
        {[0, 0.025, 0.045, 0.07].map((offset, i) => (
          <Walker key={i} points={LOOPS.erectus} speed={1.35} offset={offset} groundY={groundY}>
            <Person height={[1.75, 1.6, 1.7, 1.4][i]} phase={i * 1.1} />
          </Walker>
        ))}
      </Gate>

      <Campfire position={[FIRE[0], fireY, FIRE[1]]} from={0.6} to={0.95} />
      <Gate from={0.62} to={0.95} shrink={false}>
        {seated.map((s, i) => (
          <group key={i} position={[s.x, s.y, s.z]} rotation={[0, s.face, 0]}>
            <Person height={1.65} pose="sit" phase={i} />
          </group>
        ))}
        <group position={[FIRE[0] + 2.6, groundY(FIRE[0] + 2.6, FIRE[1] - 1.2), FIRE[1] - 1.2]} rotation={[0, -1.9, 0]}>
          <Person height={1.75} pose="stand" speed={0} />
        </group>
      </Gate>

      <Gate from={-1} to={0.5} shrink={false}>
        <CloudLayer count={quality === 'low' ? 14 : 30} spread={260} height={85} thickness={14} size={70} color="#ffffff" shade="#aab3bd" opacity={0.85} />
      </Gate>
      <Gate from={0.9} to={1.2} shrink={false}>
        <CloudLayer count={quality === 'low' ? 14 : 30} spread={260} height={85} thickness={14} size={70} color="#ffd9c0" shade="#8a7c8e" opacity={0.8} seed={8} />
      </Gate>
    </>
  )
}
