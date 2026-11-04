/**
 * IX — Cambrian → Silurian sea floor (538.8–419.6 Ma).
 * Early: trilobites, archaeocyathid reefs (extinct by ~510 Ma) and Anomalocaris.
 * Later (Great Ordovician Biodiversification): orthocone nautiloids, crinoid meadows,
 * tabulate/rugose coral & stromatoporoid reefs, and the first armoured jawless fish.
 */
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, DoubleSide, FogExp2, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { createRng } from '../../../lib/random'
import { useApp } from '../../../time/store'
import { rig } from '../../rig'
import { Anomalocaris } from '../creatures/Anomalocaris'
import { coralCluster, crinoid, jawlessFish, orthocone, reefMound, trilobite, vaseSponge } from '../creatures/seaLife'
import { Beams } from '../shared/Beams'
import { useCinematicCamera, type CameraPlan } from '../shared/camera'
import { makeInstanced, type Placement, scaled } from '../shared/instancing'
import { Gate, patchedStandard, useInstances } from '../shared/layers'
import { useSceneLook } from '../shared/look'
import { Motes } from '../shared/Motes'
import { createNoise2D, fbm2 } from '../shared/noise2d'
import { causticsPatch, GUARDED_NOISE, lifePatch, swayPatch, wanderPatch } from '../shared/patch'
import { buildTerrain, hex, scatter } from '../shared/terrain'
import { surfaceUniforms } from '../shared/uniforms'

const SURFACE_Y = 16
const FOG = '#0a4452'
const FOG_DENSITY = 0.034
const noise = createNoise2D(538)

function floorY(x: number, z: number): number {
  const ripples = Math.sin(x * 1.1 + fbm2(noise, x * 0.05, z * 0.05) * 6) * 0.08
  const dunes = fbm2(noise, x * 0.03, z * 0.03, 4) * 2.2
  const walls = Math.pow(Math.max(0, Math.abs(x) - 26) / 30, 2) * 14
  return dunes + ripples + walls
}

const PLAN: CameraPlan = {
  path: [[0, 2.4, 34], [3, 1.7, 16], [-2.5, 2.1, 0], [2.5, 2.8, -16], [-1, 3.6, -34], [0, 4.5, -48]],
  look: [[0, 1.0, 18], [1, 0.6, 0], [-1, 1.0, -16], [1, 1.6, -32], [0, 2.4, -50], [0, 3, -64]],
  skyHeight: 11,
  fov: 55,
  drift: 0.18,
  ground: floorY,
}

const AREA = { x0: -24, x1: 24, z0: -62, z1: 40 }

const SURFACE_VERT = /* glsl */ `
varying vec3 vW;
varying float vDist;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mv = viewMatrix * w;
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const SURFACE_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uFog;
uniform float uDensity;
varying vec3 vW;
varying float vDist;
${GUARDED_NOISE}
void main() {
  float n = snoise(vec3(vW.xz * 0.11, uTime * 0.12)) * 0.6 + snoise(vec3(vW.xz * 0.37, uTime * 0.21)) * 0.3;
  float bright = smoothstep(0.05, 0.7, n);
  vec3 col = mix(vec3(0.05, 0.26, 0.31), vec3(0.55, 0.85, 0.9), bright);
  // match the scene's FogExp2 so the far ceiling melts into the same haze as the floor
  float f = vDist * uDensity;
  col = mix(col, uFog, 1.0 - exp(-f * f));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

function life(rng: () => number, from: number, spread: number, to = 2): [number, number] {
  return [from + rng() * spread, to]
}

export function PaleozoicSea() {
  const quality = useApp((s) => s.quality)
  const background = useMemo(() => new Color(FOG), [])
  const fog = useMemo(() => new FogExp2(FOG, FOG_DENSITY), [])
  useSceneLook(background, fog)
  useCinematicCamera(PLAN)
  useFrame(() => {
    rig.bloom = 0.95
  })

  const terrain = useMemo(() => {
    const sand = hex('#8d8668')
    const silt = hex('#6b6a58')
    const geo = buildTerrain({
      size: 220,
      segments: quality === 'low' ? 110 : 180,
      height: floorY,
      color: (x, z, h, slope) => silt.clone().lerp(sand, 0.5 + 0.5 * noise(x * 0.08, z * 0.08)).multiplyScalar(0.85 + 0.25 * Math.min(1, h / 4) - slope * 0.3),
    })
    const mat = patchedStandard([causticsPatch(1.0, 0.32)], { roughness: 1 })
    return new Mesh(geo, mat)
  }, [quality])
  useEffect(() => () => {
    terrain.geometry.dispose()
    terrain.material.dispose()
  }, [terrain])

  const ceiling = useMemo(() => {
    const geo = new PlaneGeometry(400, 400).rotateX(Math.PI / 2)
    const mat = new ShaderMaterial({
      uniforms: { uTime: surfaceUniforms.uTime, uFog: { value: new Color(FOG) }, uDensity: { value: FOG_DENSITY } },
      vertexShader: SURFACE_VERT,
      fragmentShader: SURFACE_FRAG,
      side: DoubleSide,
      fog: false,
    })
    const m = new Mesh(geo, mat)
    m.position.y = SURFACE_Y
    return m
  }, [])
  useEffect(() => () => {
    ceiling.geometry.dispose()
    ceiling.material.dispose()
  }, [ceiling])

  const trilobites = useInstances(() => {
    const rng = createRng(1)
    const list: Placement[] = scatter(rng, scaled(320, quality), AREA).map(([x, z]) => {
      const scale = 0.09 + Math.pow(rng(), 3) * 0.3
      return {
        x,
        y: floorY(x, z) + 0.01,
        z,
        scale,
        life: rng() < 0.55 ? [-1, 0.55 + rng() * 0.25] : [-1, 2],
        motion: [(0.3 + rng() * 1.2) / scale, (rng() < 0.5 ? -1 : 1) * (0.05 + rng() * 0.12), rng() * 6.28, 0],
        color: new Color().setHSL(0.07 + rng() * 0.05, 0.35, 0.45 + rng() * 0.25),
      }
    })
    return makeInstanced(trilobite(), patchedStandard([lifePatch, wanderPatch(0, 1, 1), causticsPatch(1.2, 0.32)], { roughness: 0.55 }), list)
  }, [quality])

  const nautiloids = useInstances(() => {
    const rng = createRng(2)
    const list: Placement[] = Array.from({ length: scaled(18, quality) }, () => {
      const scale = 0.8 + rng() * 1.1
      const x = (rng() - 0.5) * 30
      const z = -50 + rng() * 80
      return {
        x,
        y: floorY(x, z) + 3 + rng() * 6,
        z,
        scale,
        life: life(rng, 0.38, 0.15),
        motion: [(7 + rng() * 9) / scale, (rng() < 0.5 ? -1 : 1) * (0.025 + rng() * 0.03), rng() * 6.28, 0.5],
      }
    })
    return makeInstanced(orthocone(), patchedStandard([lifePatch, wanderPatch(0.01, 6, 3), causticsPatch(0.8, 0.32)], { roughness: 0.45 }), list)
  }, [quality])

  const fish = useInstances(() => {
    const rng = createRng(3)
    const list: Placement[] = []
    const schools = scaled(7, quality)
    for (let s = 0; s < schools; s++) {
      const cx = (rng() - 0.5) * 30
      const cz = -45 + rng() * 75
      const cy = floorY(cx, cz) + 1.5 + rng() * 5
      const radius = 4 + rng() * 6
      const speed = (rng() < 0.5 ? -1 : 1) * (0.18 + rng() * 0.12)
      const phase = rng() * 6.28
      const appear = 0.58 + rng() * 0.2
      for (let i = 0; i < 26; i++) {
        const scale = 0.85 + rng() * 0.4
        list.push({
          x: cx + (rng() - 0.5) * 1.6,
          y: cy + (rng() - 0.5) * 1.2,
          z: cz + (rng() - 0.5) * 1.6,
          scale,
          life: [appear, 2],
          motion: [radius / scale, speed, phase + (rng() - 0.5) * 0.25, 0.25],
        })
      }
    }
    return makeInstanced(jawlessFish(), patchedStandard([lifePatch, wanderPatch(0.025, 16, 11), causticsPatch(0.7, 0.32)], { roughness: 0.4 }), list)
  }, [quality])

  const crinoids = useInstances(() => {
    const rng = createRng(4)
    const palette = ['#d9a3c9', '#e8c87a', '#f2efe6', '#c97a6a', '#9fc3d6']
    const list: Placement[] = []
    // meadows: clustered patches
    const patches = scatter(rng, 14, AREA)
    for (const [px, pz] of patches) {
      const n = Math.round(scaled(560, quality) / 14)
      const appear = 0.4 + rng() * 0.22
      for (let i = 0; i < n; i++) {
        const x = px + (rng() - 0.5) * 7
        const z = pz + (rng() - 0.5) * 7
        list.push({ x, y: floorY(x, z), z, rotY: rng() * 6.28, tilt: [(rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2], scale: 0.7 + rng() * 1.1, life: [appear + rng() * 0.05, 2], color: new Color(palette[Math.floor(rng() * palette.length)]) })
      }
    }
    return makeInstanced(crinoid(), patchedStandard([lifePatch, swayPatch(0.07, 0.9, 1.1), causticsPatch(1.0, 0.32)], { roughness: 0.6 }), list)
  }, [quality])

  const sponges = useInstances(() => {
    const rng = createRng(5)
    const list: Placement[] = scatter(rng, scaled(130, quality), AREA).map(([x, z]) => ({
      x,
      y: floorY(x, z) - 0.02,
      z,
      rotY: rng() * 6.28,
      scale: 0.5 + rng() * 1.3,
      color: new Color().setHSL(0.1 + rng() * 0.05, 0.4, 0.55 + rng() * 0.2),
    }))
    return makeInstanced(vaseSponge(0.55, 0.2), patchedStandard([lifePatch, causticsPatch(1.0, 0.32)], { side: DoubleSide, roughness: 0.9 }), list)
  }, [quality])

  const archaeocyaths = useInstances(() => {
    const rng = createRng(6)
    const list: Placement[] = []
    for (const [px, pz] of scatter(rng, 12, AREA)) {
      const n = Math.round(scaled(16, quality))
      for (let i = 0; i < n; i++) {
        const x = px + (rng() - 0.5) * 3
        const z = pz + (rng() - 0.5) * 3
        list.push({ x, y: floorY(x, z) - 0.02, z, rotY: rng() * 6.28, scale: 0.6 + rng(), life: [-1, 0.18 + rng() * 0.08], color: new Color().setHSL(0.04 + rng() * 0.04, 0.5, 0.6) })
      }
    }
    return makeInstanced(vaseSponge(0.2, 0.07), patchedStandard([lifePatch, causticsPatch(1.0, 0.32)], { side: DoubleSide, roughness: 0.9 }), list)
  }, [quality])

  const mounds = useInstances(() => {
    const rng = createRng(7)
    const list: Placement[] = scatter(rng, scaled(46, quality), AREA, (x) => Math.abs(x) > 3).map(([x, z]) => {
      const scale = 0.8 + rng() * 2.2
      return { x, y: floorY(x, z) - scale * 0.25, z, rotY: rng() * 6.28, scale, life: life(rng, 0.48, 0.22) }
    })
    return makeInstanced(reefMound(11), patchedStandard([lifePatch, causticsPatch(1.3, 0.32)], { roughness: 0.95 }), list)
  }, [quality])

  const corals = useInstances(() => {
    const rng = createRng(8)
    const list: Placement[] = scatter(rng, scaled(150, quality), AREA).map(([x, z]) => ({
      x,
      y: floorY(x, z) - 0.03,
      z,
      rotY: rng() * 6.28,
      scale: 0.6 + rng() * 1.2,
      life: life(rng, 0.5, 0.25),
      color: new Color().setHSL(0.02 + rng() * 0.08, 0.55, 0.55 + rng() * 0.15),
    }))
    return makeInstanced(coralCluster(), patchedStandard([lifePatch, causticsPatch(1.0, 0.32)], { roughness: 0.8 }), list)
  }, [quality])

  const anomaloPath = useMemo<Array<[number, number, number]>>(
    () => [[-6, 3.2, 20], [4, 2.4, 8], [7, 3.0, -6], [0, 3.8, -16], [-8, 3.0, -4], [-9, 2.6, 10]],
    [],
  )

  return (
    <>
      <hemisphereLight args={['#8fd0e0', '#25352f', 0.85]} />
      <directionalLight position={[12, 40, 6]} intensity={1.1} color="#d6f3ff" />
      <ambientLight intensity={0.15} color="#5fb4c4" />
      <primitive object={terrain} />
      <primitive object={ceiling} />
      <primitive object={sponges} />
      <primitive object={archaeocyaths} />
      <primitive object={mounds} />
      <primitive object={corals} />
      <primitive object={crinoids} />
      <primitive object={trilobites} />
      <primitive object={nautiloids} />
      <primitive object={fish} />
      <Gate from={-1} to={0.46} shrink={false}>
        <Anomalocaris path={anomaloPath} />
      </Gate>
      <Beams count={quality === 'low' ? 6 : 12} spread={50} top={SURFACE_Y} length={20} width={2.6} lean={[0.16, 0.1]} color="#9fe9ff" opacity={0.1} center={[0, -8]} />
      <Motes count={scaled(2200, quality)} box={[50, 16, 100]} position={[0, 8, -8]} color="#dff6ff" size={0.55} fall={0.06} drift={0.5} opacity={0.6} />
    </>
  )
}
