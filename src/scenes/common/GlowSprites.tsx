import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'

const scratch = new Matrix4()

const vertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uScale;
uniform float uTime;
varying vec2 vUv;
varying float vPhase;
void main(){
  vUv = uv;
  vPhase = aPhase;
  vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0);
  float pulse = 1.0 + 0.08*sin(uTime*1.7 + aPhase*6.2831);
  center.xy += position.xy * aSize * uScale * pulse;
  gl_Position = projectionMatrix * center;
}`

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFalloff;
uniform float uRing;
varying vec2 vUv;
varying float vPhase;
void main(){
  vec2 c = vUv*2.0-1.0;
  float d = length(c);
  if (d > 1.0) discard;
  float core = exp(-d*d*uFalloff);
  float ring = uRing * smoothstep(0.6,0.95,d) * (1.0-smoothstep(0.95,1.0,d));
  float a = (core + ring) * uIntensity * (1.0 - smoothstep(0.6, 1.0, d));
  gl_FragColor = vec4(uColor * a, a);
}`

export interface GlowHandle {
  material: ShaderMaterial
}

interface Props {
  positions: Float32Array
  sizes?: Float32Array
  color: string
  falloff?: number
  ring?: number
  /** called every frame to animate uniforms */
  onFrame?: (m: ShaderMaterial, elapsed: number) => void
  renderOrder?: number
  /** re-upload instance positions every frame (positions array mutated by caller) */
  dynamic?: boolean
}

/** Camera-facing additive glow quads, one per position. */
export function GlowSprites({ positions, sizes, color, falloff = 4, ring = 0, onFrame, renderOrder = 2, dynamic = false }: Props) {
  const count = positions.length / 3
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(2, 2)
    const s = sizes ?? new Float32Array(count).fill(1)
    const phase = new Float32Array(count).map((_, i) => (i * 0.618034) % 1)
    g.setAttribute('aSize', new InstancedBufferAttribute(s, 1))
    g.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1))
    return g
  }, [count, sizes])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uIntensity: { value: 1 },
          uScale: { value: 1 },
          uTime: { value: 0 },
          uFalloff: { value: falloff },
          uRing: { value: ring },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [color, falloff, ring],
  )

  const writeMatrices = () => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      scratch.makeTranslation(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      mesh.setMatrixAt(i, scratch)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(writeMatrices, [positions, count])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    onFrame?.(material, state.clock.elapsedTime)
    if (dynamic) writeMatrices()
  })

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={renderOrder}
    />
  )
}
