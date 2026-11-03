import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  RingGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { smoothstep } from '../../lib/interpolate'
import { createRng, gaussian } from '../../lib/random'
import { NOISE_GLSL } from '../../shaders/noise'
import { useApp } from '../../time/store'
import { GlowSprites } from '../common/GlowSprites'
import { moment, orbit, rig } from '../rig'
import { PLANETS, SOLAR_MARKS, angularSpeed, visualRadius, type PlanetSpec } from './planets'

const DISK_COUNT = { low: 22_000, medium: 50_000, high: 90_000 } as const
const earthPos = new Vector3()
const SUN_GLOW_POS = new Float32Array(3)
const JET_SPRITES = 40

const diskVertex = /* glsl */ `
${NOISE_GLSL}
attribute vec4 aSeed;
attribute vec3 aCloud;
uniform float uTime;
uniform float uCollapse;
uniform float uGaps;
uniform float uClear;
uniform float uPixelRatio;
uniform float uGapR[8];
varying vec3 vColor;
varying float vAlpha;
void main(){
  float r = mix(1.2, 26.0, pow(aSeed.x, 0.8));
  float omega = 0.22 * pow(r/3.2, -1.5/0.55);
  float ang = aSeed.y*6.2831 + uTime*omega;
  float h = (aSeed.z-0.5) * 0.12 * r * (1.0 - 0.6*uCollapse);
  vec3 disk = vec3(cos(ang)*r, h, sin(ang)*r);
  // swirl the cloud as it falls in
  float swirl = uCollapse*uCollapse*3.0;
  vec3 c = aCloud;
  c = vec3(c.x*cos(swirl)-c.z*sin(swirl), c.y*(1.0-uCollapse*0.9), c.x*sin(swirl)+c.z*cos(swirl));
  vec3 p = mix(c, disk, smoothstep(aSeed.w*0.3, aSeed.w*0.3+0.7, uCollapse));

  float gap = 0.0;
  for (int i=0;i<8;i++){ gap = max(gap, 1.0 - smoothstep(0.0, 0.18 + uGapR[i]*0.03, abs(r-uGapR[i]))); }
  float n = snoise(vec3(p.xz*0.25, uTime*0.05));
  float temp = clamp(1.6/r, 0.0, 1.0);
  vec3 dust = mix(vec3(0.55,0.32,0.22), vec3(1.0,0.75,0.45), temp);
  vec3 cloud = mix(vec3(0.55,0.42,0.7), vec3(0.95,0.55,0.4), smoothstep(-0.4,0.6,n));
  vColor = mix(cloud, dust, uCollapse) * (0.85 + 0.45*n);
  vAlpha = (1.0 - uGaps*gap) * (1.0 - uClear*smoothstep(0.0,0.9,aSeed.w));

  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float bloat = mix(4.0, 1.4, uCollapse);
  gl_PointSize = clamp((0.7 + aSeed.w) * bloat * uPixelRatio * 34.0 / -mv.z, 0.6, 40.0);
  gl_Position = projectionMatrix * mv;
}`

const diskFragment = /* glsl */ `
uniform float uIntensity;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord*2.0-1.0;
  float d = dot(c,c);
  if (d>1.0) discard;
  float a = exp(-d*3.0)*vAlpha*uIntensity;
  gl_FragColor = vec4(vColor*a, a);
}`

/** HL Tau–style gas disk: bright rings with dark gaps carved by forming planets. */
const ringFragment = /* glsl */ `
${NOISE_GLSL}
uniform float uOpacity;
uniform float uGaps;
uniform float uTime;
uniform float uGapR[8];
varying vec2 vUv;
void main(){
  vec2 p = vUv*2.0-1.0;
  float r = length(p)*27.0;
  if (r > 27.0 || r < 1.0) discard;
  float gap = 0.0;
  for (int i=0;i<8;i++){ gap = max(gap, 1.0 - smoothstep(0.0, 0.22 + uGapR[i]*0.035, abs(r-uGapR[i]))); }
  float ang = atan(p.y, p.x);
  float swirl = snoise(vec3(r*0.35, ang*2.0 - uTime*0.05*pow(r,-0.8)*6.0, 0.0));
  float bright = exp(-r/7.5) * (0.85 + 0.25*swirl) * (1.0 - 0.92*uGaps*gap);
  bright *= smoothstep(1.0, 2.2, r) * (1.0 - smoothstep(22.0, 27.0, r));
  vec3 col = mix(vec3(1.0,0.48,0.2), vec3(1.0,0.8,0.55), exp(-r/3.0));
  float a = bright * uOpacity;
  gl_FragColor = vec4(col*a*1.6, a);
}`

const ringVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`

const sunFragment = /* glsl */ `
${NOISE_GLSL}
uniform sampler2D uMap;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vec3 tex = texture2D(uMap, vUv + vec2(uTime*0.004,0.0)).rgb;
  float n = fbm(vNormal*4.0 + uTime*0.08);
  vec3 proto = vec3(0.9,0.3,0.12) * (0.6 + 0.6*n);
  vec3 star = tex * vec3(1.6,1.25,0.85) * 1.6;
  float rim = pow(1.0 - max(dot(vNormal, vView),0.0), 2.0);
  vec3 col = mix(proto, star, uIgnite) + rim*vec3(1.0,0.6,0.25)*1.2;
  gl_FragColor = vec4(col * (0.6 + 1.4*uIgnite), 1.0);
}`

const sunVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vUv = uv;
  vNormal = normalize(normalMatrix*normal);
  vec4 mv = modelViewMatrix*vec4(position,1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`

const lavaFragment = /* glsl */ `
${NOISE_GLSL}
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
void main(){
  vec3 p = normalize(vNormal);
  float n = fbm(vec3(vUv*8.0, uTime*0.05));
  float cracks = (1.0 - smoothstep(0.0, 0.08, abs(n)));
  vec3 crust = vec3(0.12,0.05,0.04);
  vec3 lava = vec3(1.0,0.35,0.05)*2.2;
  vec3 col = mix(crust, lava, cracks + 0.25*smoothstep(0.2,0.6,n));
  gl_FragColor = vec4(col, 1.0);
}`

function makeDisk(count: number) {
  const rng = createRng(4567)
  const seed = new Float32Array(count * 4)
  const cloud = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    seed.set([rng(), rng(), rng(), rng()], i * 4)
    cloud.set([gaussian(rng) * 30, gaussian(rng) * 18, gaussian(rng) * 30], i * 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(cloud, 3))
  g.setAttribute('aSeed', new BufferAttribute(seed, 4))
  g.setAttribute('aCloud', new BufferAttribute(cloud, 3))
  return g
}

export function SolarScene() {
  const quality = useApp((s) => s.quality)
  const { scene, gl } = useThree()
  const geometry = useMemo(() => makeDisk(DISK_COUNT.high), [])
  useEffect(() => {
    geometry.setDrawRange(0, DISK_COUNT[quality])
  }, [geometry, quality])
  const [sunMap, milky] = useTexture(['/textures/sun.jpg', '/textures/milky-way.jpg'])
  sunMap.colorSpace = SRGBColorSpace
  milky.colorSpace = SRGBColorSpace

  const disk = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: diskVertex,
        fragmentShader: diskFragment,
        uniforms: {
          uTime: { value: 0 },
          uCollapse: { value: 0 },
          uGaps: { value: 0 },
          uClear: { value: 0 },
          uIntensity: { value: 0.55 },
          uPixelRatio: { value: 1 },
          uGapR: { value: PLANETS.map((p) => visualRadius(p.au)) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  const ring = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uOpacity: { value: 0 },
          uGaps: { value: 0 },
          uTime: { value: 0 },
          uGapR: { value: PLANETS.map((p) => visualRadius(p.au)) },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    [],
  )
  const sun = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sunVertex,
        fragmentShader: sunFragment,
        uniforms: { uMap: { value: sunMap }, uTime: { value: 0 }, uIgnite: { value: 0 } },
      }),
    [sunMap],
  )

  useEffect(() => {
    const prev = scene.background
    scene.background = new Color('#000000')
    return () => {
      scene.background = prev
      geometry.dispose()
      disk.dispose()
      ring.dispose()
      sun.dispose()
    }
  }, [scene, geometry, disk, ring, sun])

  const sunRef = useRef<Mesh>(null)

  useFrame(() => {
    const m = moment()
    const u = m.chapter.id === 'sun' ? m.local : 1
    const collapse = smoothstep(SOLAR_MARKS.collapse[0] - 0.3, SOLAR_MARKS.collapse[1], u)
    const ignite = smoothstep(...SOLAR_MARKS.ignition, u)
    const dive = smoothstep(...SOLAR_MARKS.diveToEarth, u)

    disk.uniforms.uTime.value = m.elapsed
    disk.uniforms.uCollapse.value = collapse
    disk.uniforms.uGaps.value = smoothstep(0.56, 0.7, u)
    disk.uniforms.uClear.value = smoothstep(...SOLAR_MARKS.diskClears, u)
    disk.uniforms.uPixelRatio.value = gl.getPixelRatio()
    disk.uniforms.uIntensity.value = 0.9
    ring.uniforms.uOpacity.value = smoothstep(0.42, 0.56, u) * (1 - smoothstep(...SOLAR_MARKS.diskClears, u)) * 0.55
    ring.uniforms.uGaps.value = smoothstep(0.56, 0.7, u)
    ring.uniforms.uTime.value = m.elapsed
    sun.uniforms.uTime.value = m.elapsed
    sun.uniforms.uIgnite.value = ignite
    sunRef.current?.scale.setScalar(0.25 + 0.5 * smoothstep(0.3, 0.55, u))

    // Earth position (same Kepler phase as <Planet/>) for the final dive
    const earthR = visualRadius(1)
    const earthAng = m.elapsed * angularSpeed(1)
    earthPos.set(Math.cos(earthAng) * earthR, 0, Math.sin(earthAng) * earthR)

    rig.target.set(0, 0, 0).lerp(earthPos, smoothstep(0, 0.5, dive))
    const distance = 70 - 40 * smoothstep(0.1, 0.5, u) - 8 * smoothstep(0.5, 0.75, u) - 21.3 * dive
    orbit(distance, 0.6 + u * 1.3, 0.75 - 0.35 * smoothstep(0.3, 0.8, u) - 0.25 * dive)
    rig.fov = 48
    rig.flash = Math.max(0, 1 - Math.abs(u - SOLAR_MARKS.supernova) / 0.012) * 0.35
    rig.shake = Math.max(rig.shake, Math.max(0, 1 - Math.abs(u - SOLAR_MARKS.supernova) / 0.03) * 0.4)
    rig.bloom = 1
    rig.orbitLimit = 0.8
  })

  return (
    <group>
      <mesh scale={400} renderOrder={-1}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial map={milky} side={BackSide} color="#555" depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={60} decay={1.2} color="#ffe2b0" />
      <ambientLight intensity={0.04} />
      <points geometry={geometry} material={disk} frustumCulled={false} />
      <mesh material={ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[54, 54, 1, 1]} />
      </mesh>
      <mesh ref={sunRef} material={sun}>
        <sphereGeometry args={[1.4, 64, 48]} />
      </mesh>
      <GlowSprites
        positions={SUN_GLOW_POS}
        color="#ffb35a"
        falloff={2.5}
        onFrame={(mat) => {
          const m = moment()
          const u = m.chapter.id === 'sun' ? m.local : 1
          mat.uniforms.uIntensity.value = 0.25 + 0.75 * smoothstep(...SOLAR_MARKS.ignition, u)
          mat.uniforms.uScale.value = 1.2 + 1.4 * smoothstep(0.3, 0.6, u)
        }}
      />
      <Jets />
      <Nebula />
      <Supernova />
      {PLANETS.map((p) => (
        <Planet key={p.name} spec={p} />
      ))}
    </group>
  )
}

/** Bipolar T-Tauri outflow while the protostar accretes. */
function Jets() {
  const positions = useMemo(() => {
    const a = new Float32Array(JET_SPRITES * 2 * 3)
    for (let i = 0; i < JET_SPRITES * 2; i++) {
      const s = i < JET_SPRITES ? 1 : -1
      a[i * 3 + 1] = s * (1.4 + (i % JET_SPRITES) * 0.3)
    }
    return a
  }, [])
  const sizes = useMemo(() => new Float32Array(JET_SPRITES * 2).map((_, i) => 0.35 + (i % JET_SPRITES) * 0.02), [])
  return (
    <GlowSprites
      positions={positions}
      sizes={sizes}
      color="#9fc4ff"
      falloff={3}
      onFrame={(mat) => {
        const m = moment()
        const u = m.chapter.id === 'sun' ? m.local : 1
        mat.uniforms.uIntensity.value = 0.09 * smoothstep(0.45, 0.55, u) * (1 - smoothstep(0.62, 0.72, u))
        mat.uniforms.uScale.value = 1
      }}
    />
  )
}

const PUFFS = 70

/** The molecular cloud: large soft puffs that fall inward and fade as the disk forms. */
function Nebula() {
  const { home, sizes } = useMemo(() => {
    const rng = createRng(4600)
    const h = new Float32Array(PUFFS * 3)
    for (let i = 0; i < PUFFS; i++) h.set([gaussian(rng) * 22, gaussian(rng) * 9, gaussian(rng) * 22], i * 3)
    return { home: h, sizes: new Float32Array(PUFFS).map(() => 5 + rng() * 9) }
  }, [])
  const pos = useMemo(() => new Float32Array(home), [home])
  return (
    <GlowSprites
      positions={pos}
      sizes={sizes}
      dynamic
      color="#b08ad8"
      falloff={2.2}
      onFrame={(mat) => {
        const m = moment()
        const u = m.chapter.id === 'sun' ? m.local : 1
        const fall = smoothstep(0.3, 0.55, u)
        for (let i = 0; i < pos.length; i++) pos[i] = home[i] * (1 - 0.85 * fall)
        mat.uniforms.uIntensity.value = 0.16 * (1 - smoothstep(0.45, 0.6, u))
        mat.uniforms.uScale.value = 1 - 0.6 * fall
      }}
    />
  )
}

/** A nearby supernova shock, the leading hypothesis for short-lived ²⁶Al in early solids. */
function Supernova() {
  const pos = useMemo(() => new Float32Array([-60, 12, -90]), [])
  return (
    <GlowSprites
      positions={pos}
      color="#cfe3ff"
      falloff={1.8}
      ring={0.6}
      onFrame={(mat) => {
        const m = moment()
        const u = m.chapter.id === 'sun' ? m.local : 1
        const t = smoothstep(SOLAR_MARKS.supernova - 0.01, SOLAR_MARKS.supernova + 0.1, u)
        mat.uniforms.uIntensity.value = t > 0 && t < 1 ? 1.4 * (1 - t) : 0
        mat.uniforms.uScale.value = 2 + 50 * t
      }}
    />
  )
}

function Planet({ spec }: { spec: PlanetSpec }) {
  const group = useRef<Group>(null)
  const isEarth = spec.name === 'Earth'
  const tex = useTexture(isEarth ? '/textures/moon.jpg' : spec.texture)
  tex.colorSpace = SRGBColorSpace
  const ringTex = useTexture('/textures/saturn-ring.png')
  const lava = useMemo(
    () =>
      isEarth
        ? new ShaderMaterial({
            vertexShader: sunVertex,
            fragmentShader: lavaFragment,
            uniforms: { uTime: { value: 0 } },
          })
        : null,
    [isEarth],
  )
  const ringGeom = useMemo(() => {
    if (!spec.ring) return null
    const g = new RingGeometry(spec.radius * 1.25, spec.radius * 2.3, 96, 1)
    // remap UVs radially so the strip texture reads inner → outer
    const pos = g.attributes.position
    const uv = g.attributes.uv
    const v = new Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      uv.setXY(i, (v.length() - spec.radius * 1.25) / (spec.radius * 1.05), 0.5)
    }
    return g
  }, [spec])
  useEffect(() => () => {
    lava?.dispose()
    ringGeom?.dispose()
  }, [lava, ringGeom])

  useFrame(() => {
    const m = moment()
    const u = m.chapter.id === 'sun' ? m.local : 1
    const grow = smoothstep(spec.forms[0], spec.forms[1], u)
    const g = group.current
    if (!g) return
    const r = visualRadius(spec.au)
    const ang = m.elapsed * angularSpeed(spec.au)
    g.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r)
    g.scale.setScalar(Math.max(grow, 0.0001))
    g.visible = grow > 0.001
    g.rotation.y = m.elapsed * 0.3
    if (lava) lava.uniforms.uTime.value = m.elapsed
  })

  return (
    <group ref={group}>
      <group rotation={[0, 0, (spec.tilt * Math.PI) / 180]}>
        <mesh material={lava ?? undefined}>
          <sphereGeometry args={[spec.radius, 48, 32]} />
          {!lava && <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />}
        </mesh>
        {ringGeom && (
          <mesh geometry={ringGeom} rotation={[-Math.PI / 2, 0, 0]}>
            <meshBasicMaterial map={ringTex} alphaMap={ringTex} transparent side={DoubleSide} color="#d9c7a0" depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  )
}
