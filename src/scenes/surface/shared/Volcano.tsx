import { useEffect, useMemo } from 'react'
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
} from 'three'
import { createRng } from '../../../lib/random'
import { createNoise2D } from './noise2d'
import { GUARDED_NOISE } from './patch'
import { surfaceUniforms } from './uniforms'
import { paint } from './geometry'

const PLUME_VERT = /* glsl */ `
attribute vec2 aPuff; // seed, size
uniform float uTime;
uniform float uHeight;
uniform float uWind;
varying vec2 vUv;
varying float vT;
varying float vSeed;
void main() {
  float t = fract(uTime * 0.012 + aPuff.x);
  vec4 base = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  base.y += t * uHeight;
  base.x += t * t * uWind + sin(aPuff.x * 40.0 + uTime * 0.1) * uHeight * 0.04 * t;
  vec4 mv = viewMatrix * base;
  mv.xy += position.xy * aPuff.y * (0.35 + t * 1.6);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vT = t;
  vSeed = aPuff.x;
}`

const PLUME_FRAG = /* glsl */ `
uniform vec3 uSmoke;
uniform vec3 uGlow;
uniform float uTime;
varying vec2 vUv;
varying float vT;
varying float vSeed;
${GUARDED_NOISE}
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  float n = snoise(vec3(c * 1.8 + vSeed * 11.0, uTime * 0.05 + vSeed * 3.0)) * 0.5
          + snoise(vec3(c * 3.7 - vSeed * 5.0, uTime * 0.08)) * 0.25;
  float a = (1.0 - smoothstep(0.1, 1.0, length(c) + n * 0.5)) * sin(3.14159 * vT) * 0.55;
  if (a < 0.004) discard;
  vec3 col = mix(uSmoke * 0.55, uSmoke, clamp(0.5 + c.y * 0.5 + n * 0.3, 0.0, 1.0));
  col += uGlow * (1.0 - smoothstep(0.0, 0.2, vT)) * 2.0;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export interface VolcanoProps {
  position: readonly [number, number, number]
  radius: number
  height: number
  rock: string
  ash: string
  smoke: string
  /** crater glow colour; omit for a dormant volcano */
  glow?: string
  puffs?: number
  seed?: number
}

/** A distant stratovolcano with a drifting smoke plume. */
export function Volcano({ position, radius, height, rock, ash, smoke, glow, puffs = 26, seed = 3 }: VolcanoProps) {
  const parts = useMemo(() => {
    const noise = createNoise2D(seed)
    const profile: Vector2[] = []
    const steps = 22
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      // concave flanks rising to a crater rim
      const r = 0.1 + 0.9 * Math.pow(1 - t, 1.7)
      profile.push(new Vector2(r, t))
    }
    profile.push(new Vector2(0.07, 0.94), new Vector2(0.0, 0.9))
    const cone = new LatheGeometry(profile, 72)
    const p = cone.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const z = p.getZ(i)
      const ang = Math.atan2(z, x)
      const gully = 1 + 0.07 * noise(ang * 6, y * 3) * (1 - y)
      p.setXYZ(i, x * gully * radius, y * height, z * gully * radius)
    }
    cone.computeVertexNormals()
    const rockC = new Color(rock)
    const ashC = new Color(ash)
    paint(cone, (v) => rockC.clone().lerp(ashC, Math.min(1, Math.max(0, v.y / height - 0.45) * 1.8)))
    const coneMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: DoubleSide })

    const rng = createRng(seed + 1)
    const puffGeo = new PlaneGeometry(1, 1)
    const attr = new Float32Array(puffs * 2)
    for (let i = 0; i < puffs; i++) attr.set([i / puffs + rng() * 0.02, radius * (0.22 + rng() * 0.14)], i * 2)
    puffGeo.setAttribute('aPuff', new InstancedBufferAttribute(attr, 2))
    const plumeMat = new ShaderMaterial({
      uniforms: {
        uTime: surfaceUniforms.uTime,
        uHeight: { value: height * 2.6 },
        uWind: { value: radius * 1.4 },
        uSmoke: { value: new Color(smoke) },
        uGlow: { value: new Color(glow ?? '#000000') },
      },
      vertexShader: PLUME_VERT,
      fragmentShader: PLUME_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
    })
    const plume = new InstancedMesh(puffGeo, plumeMat, puffs)
    const m = new Matrix4().makeTranslation(0, height * 0.92, 0)
    for (let i = 0; i < puffs; i++) plume.setMatrixAt(i, m)
    plume.frustumCulled = false

    const glowGeo = new SphereGeometry(radius * 0.06, 16, 8)
    const glowMat = new MeshBasicMaterial({ color: new Color(glow ?? '#000000').multiplyScalar(3), toneMapped: false })
    return { cone, coneMat, plume, glowGeo, glowMat }
  }, [radius, height, rock, ash, smoke, glow, puffs, seed])

  useEffect(
    () => () => {
      parts.cone.dispose()
      parts.coneMat.dispose()
      parts.plume.geometry.dispose()
      ;(parts.plume.material as ShaderMaterial).dispose()
      parts.plume.dispose()
      parts.glowGeo.dispose()
      parts.glowMat.dispose()
    },
    [parts],
  )

  return (
    <group position={position}>
      <mesh geometry={parts.cone} material={parts.coneMat} />
      <primitive object={parts.plume} />
      {glow && <mesh geometry={parts.glowGeo} material={parts.glowMat} position={[0, height * 0.9, 0]} />}
    </group>
  )
}
