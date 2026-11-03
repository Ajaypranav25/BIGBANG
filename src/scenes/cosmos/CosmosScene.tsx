import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { PARTICLE_BUDGET, useApp } from '../../time/store'
import { moment, orbit, rig } from '../rig'
import { GlowSprites } from '../common/GlowSprites'
import { cosmosState, galaxySpin } from './choreography'
import { SUN_GALACTIC_RADIUS, generateCosmos } from './generate'
import { fogFragment, fogVertex, particleFragment, particleVertex } from './shaders'

const ORIGIN = new Float32Array([0, 0, 0])
const tmpTarget = new Vector3()

function useCosmosGeometry(count: number) {
  const data = useMemo(() => generateCosmos(PARTICLE_BUDGET.high), [])
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(data.ball, 3))
    g.setAttribute('aSeed', new BufferAttribute(data.seed, 4))
    g.setAttribute('aBall', new BufferAttribute(data.ball, 3))
    g.setAttribute('aWeb', new BufferAttribute(data.web, 3))
    g.setAttribute('aGal', new BufferAttribute(data.galaxy, 3))
    g.setAttribute('aKind', new BufferAttribute(data.kind, 1))
    return g
  }, [data])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    geometry.setDrawRange(0, count)
  }, [geometry, count])
  return { data, geometry }
}

export function CosmosScene() {
  const quality = useApp((s) => s.quality)
  const { scene, gl } = useThree()
  const { data, geometry } = useCosmosGeometry(PARTICLE_BUDGET[quality])

  const particles = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        uniforms: {
          uTime: { value: 0 },
          uBallRadius: { value: 0.04 },
          uTurb: { value: 0 },
          uHeat: { value: 1 },
          uCmb: { value: 0 },
          uDark: { value: 0 },
          uWebMix: { value: 0 },
          uGalMix: { value: 0 },
          uSpin: { value: 0 },
          uMerge: { value: 0 },
          uStars: { value: 0 },
          uReion: { value: 0 },
          uSize: { value: 1 },
          uIntensity: { value: 0.5 },
          uPixelRatio: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  const fog = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: fogVertex,
        fragmentShader: fogFragment,
        uniforms: { uTime: { value: 0 }, uHeat: { value: 1 }, uFog: { value: 0 }, uCmb: { value: 0 } },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  const fogGeometry = useMemo(() => new SphereGeometry(1, 64, 48), [])

  // first-star & reionization glows sit on the cosmic-web nodes
  const nodeSizes = useMemo(() => new Float32Array(data.nodeCount).map((_, i) => 0.6 + ((i * 7919) % 100) / 100), [data])

  useEffect(() => {
    const prev = scene.background
    scene.background = new Color('#000000')
    return () => {
      scene.background = prev
      particles.dispose()
      fog.dispose()
      fogGeometry.dispose()
    }
  }, [scene, particles, fog, fogGeometry])

  useFrame(() => {
    const m = moment()
    const s = cosmosState(m.chapter.id, m.local)
    const u = particles.uniforms
    const spin = galaxySpin(m.elapsed, m.chapter.id === 'galaxies' ? m.local : 0)
    u.uTime.value = m.elapsed
    u.uBallRadius.value = s.ballRadius
    u.uTurb.value = s.turbulence
    u.uHeat.value = s.heat
    u.uCmb.value = s.cmb
    u.uDark.value = s.dark
    u.uWebMix.value = s.webMix
    u.uGalMix.value = s.galMix
    u.uSpin.value = spin
    u.uMerge.value = s.merge
    u.uStars.value = s.stars
    u.uReion.value = s.reion
    u.uSize.value = s.size
    // keep additive brightness bounded while the whole universe fits in a few pixels
    u.uIntensity.value = s.intensity * Math.min(1, Math.max(2e-4, (s.ballRadius / 5) ** 2))
    u.uPixelRatio.value = gl.getPixelRatio()

    fog.uniforms.uTime.value = m.elapsed
    fog.uniforms.uHeat.value = s.heat
    fog.uniforms.uFog.value = s.fog
    fog.uniforms.uCmb.value = s.fogCmb

    // camera: orbit the origin, then dive toward the Sun's place in the disk
    const sun = tmpTarget.set(SUN_GALACTIC_RADIUS * Math.cos(spin), 0, SUN_GALACTIC_RADIUS * Math.sin(spin))
    rig.target.set(0, 0, 0).lerp(sun, s.cam.diveToSun)
    orbit(s.cam.distance * (1 - 0.94 * s.cam.diveToSun), s.cam.yaw, s.cam.pitch)
    rig.fov = s.cam.fov
    rig.shake = Math.max(rig.shake, s.shake)
    rig.flash = s.flash
    rig.bloom = 1
    rig.orbitLimit = 0.9
  })

  return (
    <group>
      <points geometry={geometry} material={particles} frustumCulled={false} />
      <FogShell geometry={fogGeometry} material={fog} />
      <GlowSprites
        positions={ORIGIN}
        color="#fff6e8"
        falloff={5}
        onFrame={(mat) => {
          const s = cosmosState(moment().chapter.id, moment().local)
          mat.uniforms.uIntensity.value = s.core * 1.6
          mat.uniforms.uScale.value = 0.6 + s.core * 1.4
        }}
      />
      <GlowSprites
        positions={data.nodes}
        sizes={nodeSizes}
        color="#7da2ff"
        falloff={2.2}
        ring={0.25}
        onFrame={(mat) => {
          const m = moment()
          const s = cosmosState(m.chapter.id, m.local)
          mat.uniforms.uIntensity.value = s.stars * 0.35 + s.reion * 0.35
          mat.uniforms.uScale.value = 0.8 + s.reion * 6
        }}
      />
      <NurseryGlow />
    </group>
  )
}

function FogShell({ geometry, material }: { geometry: SphereGeometry; material: ShaderMaterial }) {
  useFrame(({ scene }) => {
    const s = cosmosState(moment().chapter.id, moment().local)
    const mesh = scene.getObjectByName('cosmos-fog')
    if (mesh) mesh.scale.setScalar(Math.max(s.ballRadius * 1.05, 0.05))
  })
  return <mesh name="cosmos-fog" geometry={geometry} material={material} renderOrder={1} />
}

/** The stellar nursery we dive into at the end of the galaxy chapter. */
function NurseryGlow() {
  const pos = useMemo(() => new Float32Array(3), [])
  return (
    <GlowSprites
      positions={pos}
      dynamic
      color="#ff8fb8"
      falloff={2.4}
      onFrame={(mat) => {
        const m = moment()
        const s = cosmosState(m.chapter.id, m.local)
        const spin = galaxySpin(m.elapsed, m.chapter.id === 'galaxies' ? m.local : 0)
        mat.uniforms.uIntensity.value = s.nursery * s.nursery * 0.7
        mat.uniforms.uScale.value = 0.08 + s.nursery * 0.45
        pos[0] = SUN_GALACTIC_RADIUS * Math.cos(spin)
        pos[2] = SUN_GALACTIC_RADIUS * Math.sin(spin)
      }}
    />
  )
}
