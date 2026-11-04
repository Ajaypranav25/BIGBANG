/**
 * XII — Jurassic → Cretaceous (201.4–66.1 Ma; chapter-local u ↦ 201.4 − 135.3·u Ma).
 *  u 0.00–1.00  sauropod herd (diplodocids/brachiosaurids → titanosaurs) and pterosaurs throughout
 *  u 0.10–0.52  stegosaurs (Late Jurassic, ~155–145 Ma ≈ u 0.34–0.42, shown generously)
 *  u 0.15–0.55  large Jurassic theropod (allosaur-sized)
 *  u ≥ 0.56     flowering plants (earliest angiosperms ~125 Ma ≈ u 0.56, e.g. Archaefructus)
 *  u ≥ 0.55     dromaeosaurid pack (Cretaceous)
 *  u ≥ 0.80     tyrannosaurid + ceratopsians — strictly T. rex / Triceratops are 68–66 Ma (u ≈ 0.99);
 *               they enter during the final descent/ascent so the viewer actually sees them.
 */
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, DoubleSide, FogExp2, Mesh } from 'three'
import { createRng } from '../../../lib/random'
import { useApp } from '../../../time/store'
import { rig } from '../../rig'
import { Creature } from '../Creature'
import { Pterosaur } from '../creatures/Pterosaur'
import { Quadruped } from '../creatures/Quadruped'
import { CERATOPSIAN, SAUROPOD, STEGOSAUR } from '../creatures/quadSpecs'
import { ALLOSAUR_LOOK, RAPTOR_LOOK, Theropod } from '../creatures/Theropod'
import { groundFern } from '../flora/common'
import { araucaria, blossom, conifer, cycad, shrub } from '../flora/mesozoic'
import { useCinematicCamera, type CameraPlan } from '../shared/camera'
import { CloudLayer } from '../shared/Clouds'
import { makeInstanced, type Placement, scaled } from '../shared/instancing'
import { Gate, Orbiter, patchedStandard, useInstances, Walker } from '../shared/layers'
import { useSceneLook } from '../shared/look'
import { Motes } from '../shared/Motes'
import { createNoise2D, fbm2 } from '../shared/noise2d'
import { barkPatch, lifePatch, swayPatch } from '../shared/patch'
import { createSkyUniforms, SkyDome } from '../shared/Sky'
import { buildTerrain, distanceToPath, hex, scatter } from '../shared/terrain'
import { Volcano } from '../shared/Volcano'
import { Water } from '../shared/Water'

type Loop = ReadonlyArray<readonly [number, number]>

const noise = createNoise2D(145)
const RIVER: Loop = [[-25, 140], [-8, 60], [2, 20], [-6, -20], [4, -60], [-4, -140]]
const WATER_Y = -0.9

function groundY(x: number, z: number): number {
  const hills = fbm2(noise, x * 0.012, z * 0.012, 4) * 7
  const detail = fbm2(noise, x * 0.06 + 3, z * 0.06, 3) * 0.6
  const river = distanceToPath(RIVER, x, z)
  const carve = 4.2 * Math.exp(-(river * river) / 70)
  const r = Math.sqrt(x * x + z * z)
  const ranges = Math.pow(Math.max(0, r - 150) / 60, 2) * 30
  return hills + detail - carve + ranges + 0.8
}

const PLAN: CameraPlan = {
  path: [[34, 4.5, 72], [27, 3.6, 44], [30, 3.8, 14], [23, 4.2, -18], [30, 5.2, -46], [21, 9, -76]],
  look: [[2, 6, 40], [-2, 5, 14], [-2, 5, -12], [-4, 5, -36], [-2, 6, -64], [-10, 9, -100]],
  skyHeight: 110,
  fov: 50,
  drift: 0.2,
  ground: (x, z) => Math.max(groundY(x, z), WATER_Y),
}
const PATH_XZ = PLAN.path.map(([x, , z]) => [x, z] as const)

const LOOPS = {
  sauropods: [[10, 48], [12, 10], [6, -26], [-4, -6], [-2, 30]] as Loop,
  stegosaurs: [[44, 32], [48, 10], [41, -4], [37, 16]] as Loop,
  allosaur: [[-20, 12], [-27, -20], [-15, -42], [-10, -12]] as Loop,
  // late-Cretaceous cast sits across the river, in the sightline of the final dolly
  trex: [[-16, -100], [-28, -118], [-40, -106], [-28, -92]] as Loop,
  ceratopsians: [[-14, -70], [-22, -92], [-34, -86], [-26, -66]] as Loop,
  raptors: [[26, -56], [16, -70], [10, -60], [18, -48]] as Loop,
}
const ALL_LOOPS = Object.values(LOOPS)
const AREA = { x0: -110, x1: 110, z0: -150, z1: 110 }

const clear = (minRiver: number, minPath: number) => (x: number, z: number) =>
  distanceToPath(RIVER, x, z) > minRiver &&
  distanceToPath(PATH_XZ, x, z) > minPath &&
  ALL_LOOPS.every((loop) => distanceToPath([...loop, loop[0]], x, z) > 6)

export function Mesozoic() {
  const quality = useApp((s) => s.quality)
  const background = useMemo(() => new Color('#d8b48b'), [])
  const fog = useMemo(() => new FogExp2('#d4b08a', 0.0065), [])
  useSceneLook(background, fog)
  useCinematicCamera(PLAN)
  useFrame(() => {
    rig.bloom = 0.75
  })

  const sky = useMemo(
    () => createSkyUniforms({ top: '#3e6ea6', horizon: '#f1c08a', ground: '#5c4a38', sunDir: [-0.5, 0.17, -0.85], sunColor: '#ffcc84', sunSize: 1.6, haze: 1.0 }),
    [],
  )

  const terrain = useMemo(() => {
    const grass = hex('#5d6a33')
    const soil = hex('#7a6040')
    const rock = hex('#7d7266')
    const geo = buildTerrain({
      size: 420,
      segments: quality === 'low' ? 130 : 220,
      height: groundY,
      color: (x, z, h, slope) =>
        (h < 0.2 ? soil : grass.clone().lerp(soil, 0.35 + 0.35 * noise(x * 0.05, z * 0.05))).clone().lerp(rock, Math.min(1, slope * 2.2 + Math.max(0, h - 12) / 20)),
    })
    return new Mesh(geo, patchedStandard([], { roughness: 1 }))
  }, [quality])
  useEffect(() => () => {
    terrain.geometry.dispose()
    terrain.material.dispose()
  }, [terrain])

  const flora = (seed: number, count: number, accept: (x: number, z: number) => boolean, geo: (r: () => number) => ReturnType<typeof cycad>, scale: [number, number], sway: [number, number, number], lifeFrom = -1) => () => {
    const rng = createRng(seed)
    const list: Placement[] = scatter(rng, scaled(count, quality), AREA, accept).map(([x, z]) => ({
      x,
      y: groundY(x, z) - 0.1,
      z,
      rotY: rng() * 6.28,
      tilt: [(rng() - 0.5) * 0.06, (rng() - 0.5) * 0.06],
      scale: scale[0] + rng() * (scale[1] - scale[0]),
      life: lifeFrom < 0 ? [-1, 2] : [lifeFrom + rng() * 0.08, 2],
    }))
    return makeInstanced(geo(rng), patchedStandard([lifePatch, swayPatch(sway[0], sway[1], sway[2]), barkPatch(14)], { side: DoubleSide, roughness: 0.9 }), list)
  }

  const araucarias = useInstances(flora(41, 240, clear(10, 6), araucaria, [0.75, 1.25], [0.3, 0.35, 28]), [quality])
  const conifers = useInstances(flora(42, 140, clear(10, 6), conifer, [0.7, 1.2], [0.25, 0.4, 18]), [quality])
  const cycads = useInstances(flora(43, 340, clear(6, 3), cycad, [0.7, 1.4], [0.12, 0.9, 2.5]), [quality])
  const ferns = useInstances(flora(44, 2800, clear(4, 1.5), (r) => groundFern(r, 1.1, '#4a6a2a'), [0.6, 1.6], [0.1, 1.2, 0.9]), [quality])

  const flowering = useMemo(() => {
    const rng = createRng(45)
    const shrubs: Placement[] = scatter(rng, scaled(280, quality), AREA, clear(5, 3)).map(([x, z]) => ({
      x,
      y: groundY(x, z) - 0.1,
      z,
      rotY: rng() * 6.28,
      scale: 0.6 + rng() * 0.9,
      life: [0.55 + rng() * 0.12, 2],
    }))
    const palette = ['#fff4f0', '#ff9ec4', '#ffd34a', '#d77bff', '#ff7a5c']
    const blooms: Placement[] = shrubs.flatMap((s) =>
      Array.from({ length: quality === 'low' ? 4 : 9 }, () => {
        const a = rng() * Math.PI * 2
        const up = 0.25 + rng() * 0.75
        const k = s.scale ?? 1
        return {
          x: s.x + Math.cos(a) * Math.sqrt(1 - up * up) * k * 1.05,
          y: s.y + (0.6 + up * 0.8) * k,
          z: s.z + Math.sin(a) * Math.sqrt(1 - up * up) * k * 1.05,
          rotY: rng() * 6.28,
          tilt: [(rng() - 0.5) * 0.6, (rng() - 0.5) * 0.6] as const,
          scale: 0.8 + rng() * 0.8,
          life: s.life,
          color: new Color(palette[Math.floor(rng() * palette.length)]),
        }
      }),
    )
    return { shrubs, blooms }
  }, [quality])
  const shrubMesh = useInstances(() => makeInstanced(shrub(46), patchedStandard([lifePatch, swayPatch(0.06, 1, 1.4)], { roughness: 0.9 }), flowering.shrubs), [flowering])
  const bloomMesh = useInstances(
    () => makeInstanced(blossom(), patchedStandard([lifePatch], { roughness: 0.6, emissive: new Color('#2a1a10') }), flowering.blooms),
    [flowering],
  )

  return (
    <>
      <SkyDome uniforms={sky} />
      <hemisphereLight args={['#bcd3ee', '#5a4630', 0.85]} />
      <directionalLight position={[-60, 34, -100]} intensity={3} color="#ffd093" />
      <primitive object={terrain} />
      <Water size={420} y={WATER_Y} color="#2c4a52" quality={quality} />
      <primitive object={araucarias} />
      <primitive object={conifers} />
      <primitive object={cycads} />
      <primitive object={ferns} />
      <primitive object={shrubMesh} />
      <primitive object={bloomMesh} />
      <Volcano position={[-150, groundY(-150, -250) - 4, -250]} radius={80} height={62} rock="#3b3532" ash="#6d655c" smoke="#8b8178" glow="#ff6a2a" />

      {[0, 0.13, 0.27, 0.42, 0.58].map((offset, i) => (
        <Walker key={i} points={LOOPS.sauropods} speed={1.1} offset={offset} groundY={groundY} scale={0.85 + (i % 3) * 0.08}>
          <Creature kind="sauropod" fallback={<Quadruped spec={SAUROPOD} phase={i * 1.3} seed={i + 1} />} />
        </Walker>
      ))}

      <Gate from={0.1} to={0.52} shrink={false}>
        {[0, 0.33, 0.66].map((offset, i) => (
          <Walker key={i} points={LOOPS.stegosaurs} speed={0.7} offset={offset} groundY={groundY}>
            <Creature kind="stegosaurus" speed={0.6} fallback={<Quadruped spec={STEGOSAUR} phase={i * 2} seed={10 + i} />} />
          </Walker>
        ))}
      </Gate>

      <Gate from={0.15} to={0.55} shrink={false}>
        <Walker points={LOOPS.allosaur} speed={1.8} groundY={groundY}>
          {/* allosaur-sized (~8.5 m) large theropod */}
          <group scale={0.7}>
            <Creature kind="trex" fallback={<Theropod look={ALLOSAUR_LOOK} stride={0.65} />} />
          </group>
        </Walker>
      </Gate>

      <Gate from={0.55} to={1.2} shrink={false}>
        {[0, 0.05, 0.1].map((offset, i) => (
          <Walker key={i} points={LOOPS.raptors} speed={4.2} offset={offset} groundY={groundY}>
            <Creature kind="raptor" speed={1.2} fallback={<group scale={3.3 / 12}><Theropod look={RAPTOR_LOOK} stride={2.2} phase={i} /></group>} />
          </Walker>
        ))}
      </Gate>

      <Gate from={0.8} to={1.2} shrink={false}>
        <Walker points={LOOPS.trex} speed={1.5} groundY={groundY}>
          <Creature kind="trex" fallback={<Theropod />} />
        </Walker>
        {[0, 0.2, 0.4].map((offset, i) => (
          <Walker key={i} points={LOOPS.ceratopsians} speed={0.9} offset={offset} groundY={groundY}>
            <Creature kind="triceratops" speed={0.8} fallback={<Quadruped spec={CERATOPSIAN} phase={i} seed={20 + i} />} />
          </Walker>
        ))}
      </Gate>

      {[
        [0, 38, -10, 32, 0.11],
        [12, 46, -30, 44, -0.09],
        [-14, 54, 10, 56, 0.07],
      ].map(([x, y, z, r, s], i) => (
        <Orbiter key={i} center={[x, y, z]} radius={r} speed={s} phase={i * 2.1} bob={2}>
          <Creature kind="pterosaur" fallback={<Pterosaur phase={i * 3} />} />
        </Orbiter>
      ))}

      <CloudLayer count={quality === 'low' ? 16 : 34} spread={260} height={88} thickness={20} size={80} color="#fff1dc" shade="#c99f7a" opacity={0.85} />
      <Motes count={scaled(1300, quality)} box={[80, 20, 140]} position={[18, 9, -6]} color="#ffe0a3" size={0.45} fall={0.015} drift={0.8} opacity={0.55} />
    </>
  )
}
