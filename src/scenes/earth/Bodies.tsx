import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { smoothstep } from '../../lib/interpolate'
import { createRng } from '../../lib/random'
import { NOISE_GLSL } from '../../shaders/noise'
import { GlowSprites } from '../common/GlowSprites'
import { moment, rig } from '../rig'
import { CHICXULUB, THEIA, earthState } from './earthState'
import { latLonToVec3, PALEO_SITES } from './geo'

/** Moon orbit direction in the scene (slowly precessing for visual life). */
export function moonPosition(distance: number, elapsed: number, out: Vector3): Vector3 {
  const a = 2.2 + elapsed * 0.01
  return out.set(Math.cos(a) * distance, Math.sin(a * 0.7) * 0.25 * distance * 0.1, Math.sin(a) * distance)
}

const moonTmp = new Vector3()
const theiaStart = new Vector3(9, 1.2, -4)
const theiaContact = new Vector3(0.9, 0.15, -0.4).normalize().multiplyScalar(1.35)

export function Moon() {
  const map = useTexture('/textures/moon.jpg')
  map.colorSpace = SRGBColorSpace
  const ref = useRef<Mesh>(null)
  useFrame(() => {
    const m = moment()
    const s = earthState(m.yearsAgo, m.chapter.id, m.local)
    const mesh = ref.current
    if (!mesh) return
    // during the hadean chapter the Moon assembles from the impact debris
    const forming = m.chapter.id === 'hadean' ? smoothstep(THEIA.coalesce[0] + 0.05, THEIA.coalesce[1], m.local) : 1
    const visible = s.moonVisible * forming
    mesh.visible = visible > 0.01
    mesh.scale.setScalar(0.273 * Math.max(visible, 0.01))
    moonPosition(s.moonDistance, m.elapsed, mesh.position)
    mesh.rotation.y = m.elapsed * 0.02
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 64, 48]} />
      <meshStandardMaterial map={map} roughness={1} metalness={0} />
    </mesh>
  )
}

const molten = /* glsl */ `
${NOISE_GLSL}
uniform float uTime;
varying vec3 vN;
void main(){
  float n = fbm(vN*4.0 + uTime*0.05);
  vec3 c = mix(vec3(0.15,0.05,0.03), vec3(1.0,0.35,0.06)*2.0, smoothstep(0.0,0.45,n));
  gl_FragColor = vec4(c,1.0);
}`
const moltenVertex = /* glsl */ `
varying vec3 vN;
void main(){ vN = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`

/** Theia — a Mars-sized protoplanet — and the debris disk that becomes the Moon. */
export function Theia() {
  const ref = useRef<Mesh>(null)
  const mat = useMemo(
    () => new ShaderMaterial({ vertexShader: moltenVertex, fragmentShader: molten, uniforms: { uTime: { value: 0 } } }),
    [],
  )
  const debris = useMemo(() => {
    const count = 7000
    const rng = createRng(4510)
    const seed = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) seed.set([rng(), rng(), rng(), rng()], i * 4)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 4))
    return g
  }, [])
  const debrisMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: /* glsl */ `
          attribute vec4 aSeed;
          uniform float uT; uniform float uTime; uniform vec3 uMoon; uniform float uPixelRatio;
          varying float vA;
          void main(){
            float r = mix(1.25, 3.6, aSeed.x);
            float ang = aSeed.y*6.2831 + uTime*0.6*pow(r,-1.5);
            vec3 ringP = vec3(cos(ang)*r, (aSeed.z-0.5)*0.12, sin(ang)*r);
            vec3 burst = normalize(vec3(aSeed.x-0.5, aSeed.z-0.5, aSeed.w-0.5)+vec3(0.6,0.1,-0.3)) * (1.4 + aSeed.x*2.0);
            float settle = smoothstep(0.0, 0.35, uT);
            vec3 p = mix(burst, ringP, settle);
            p = mix(p, uMoon + (vec3(aSeed.xyz)-0.5)*0.4, smoothstep(0.55, 1.0, uT) * smoothstep(0.2,1.0,aSeed.w+0.3));
            vA = (1.0 - smoothstep(0.8, 1.0, uT)) * step(0.0001, uT);
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_PointSize = clamp(uPixelRatio*18.0/-mv.z*(0.6+aSeed.w), 0.5, 10.0);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main(){
            vec2 c = gl_PointCoord*2.0-1.0; float d = dot(c,c); if(d>1.0) discard;
            float a = exp(-d*3.0)*vA;
            gl_FragColor = vec4(vec3(1.0,0.55,0.25)*a, a);
          }`,
        uniforms: { uT: { value: 0 }, uTime: { value: 0 }, uMoon: { value: new Vector3() }, uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  useEffect(
    () => () => {
      mat.dispose()
      debris.dispose()
      debrisMat.dispose()
    },
    [mat, debris, debrisMat],
  )

  useFrame((state) => {
    const m = moment()
    const active = m.chapter.id === 'hadean'
    const u = active ? m.local : 1
    const approach = smoothstep(THEIA.approach[0], THEIA.approach[1], u)
    const mesh = ref.current
    if (mesh) {
      mesh.visible = active && u < THEIA.strike + 0.004
      mesh.position.copy(theiaStart).lerp(theiaContact, approach * approach)
    }
    mat.uniforms.uTime.value = m.elapsed
    const t = active ? smoothstep(THEIA.strike, THEIA.coalesce[1], u) : 0
    debrisMat.uniforms.uT.value = t
    debrisMat.uniforms.uTime.value = m.elapsed
    debrisMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    const s = earthState(m.yearsAgo, m.chapter.id, m.local)
    moonPosition(s.moonDistance, m.elapsed, moonTmp)
    debrisMat.uniforms.uMoon.value.copy(moonTmp)
    if (active) {
      const hit = Math.max(0, 1 - Math.abs(u - THEIA.strike) / 0.02)
      rig.flash = Math.max(rig.flash, hit * 0.9)
      rig.shake = Math.max(rig.shake, hit)
    }
  })

  return (
    <group>
      <mesh ref={ref} material={mat}>
        <sphereGeometry args={[0.53, 48, 32]} />
      </mesh>
      <points geometry={debris} material={debrisMat} frustumCulled={false} />
    </group>
  )
}

const asteroidStart = new Vector3()
const asteroidHit = latLonToVec3(...PALEO_SITES.chicxulub66, 1.0)

/** The Chicxulub impactor: ~10 km across, ~20 km/s, shown hugely exaggerated. */
export function Asteroid() {
  const group = useRef<Group>(null)
  const glowPos = useMemo(() => new Float32Array(3), [])
  useMemo(() => {
    asteroidStart.copy(asteroidHit).multiplyScalar(9).add(new Vector3(3, 2.5, 1))
  }, [])
  useFrame(() => {
    const m = moment()
    const active = m.chapter.id === 'impact'
    const u = active ? m.local : 1
    const t = smoothstep(CHICXULUB.approach[0], CHICXULUB.approach[1], u)
    const g = group.current
    if (!g) return
    g.visible = active && u > CHICXULUB.approach[0] && u < CHICXULUB.strike
    g.position.copy(asteroidStart).lerp(asteroidHit, t * t * t)
    glowPos.set([g.position.x, g.position.y, g.position.z])
    if (active) {
      const hit = Math.max(0, 1 - Math.abs(u - CHICXULUB.strike) / 0.025)
      rig.flash = Math.max(rig.flash, hit)
      rig.shake = Math.max(rig.shake, hit * 1.2)
    }
  })
  return (
    <>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[0.035, 1]} />
          <meshBasicMaterial color="#ffd2a0" />
        </mesh>
      </group>
      <GlowSprites
        positions={glowPos}
        dynamic
        color="#ff9a4a"
        falloff={2.6}
        onFrame={(mat) => {
          const m = moment()
          const on = m.chapter.id === 'impact' && m.local < CHICXULUB.strike && m.local > CHICXULUB.approach[0]
          const t = smoothstep(CHICXULUB.approach[0], CHICXULUB.approach[1], m.local)
          mat.uniforms.uIntensity.value = on ? 0.6 + t * 1.6 : 0
          mat.uniforms.uScale.value = 0.08 + t * 0.25
        }}
      />
    </>
  )
}
