import { useEffect, useMemo } from 'react'
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial } from 'three'
import { createRng } from '../../../lib/random'
import { GUARDED_NOISE } from './patch'
import { surfaceUniforms } from './uniforms'

const VERT = /* glsl */ `
attribute vec4 aCloud; // size, seed, opacity, unused
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vAlpha;
void main() {
  vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  center.x += sin(uTime * 0.02 + aCloud.y * 6.28) * 6.0;
  vec4 mv = viewMatrix * center;
  mv.xy += position.xy * aCloud.x;
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vSeed = aCloud.y;
  float depth = -mv.z;
  vAlpha = aCloud.z * smoothstep(1.0, max(aCloud.x * 0.6, 1.01), depth);
}`

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShade;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vAlpha;
${GUARDED_NOISE}
float cloudNoise(vec3 p) {
  return snoise(p) * 0.55 + snoise(p * 2.07) * 0.28 + snoise(p * 4.13) * 0.17;
}
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  float r = length(c);
  float n = cloudNoise(vec3(c * 1.6 + vSeed * 13.0, vSeed * 7.0 + uTime * 0.015));
  float a = (1.0 - smoothstep(0.15, 1.0, r + n * 0.55)) * vAlpha * uOpacity;
  if (a < 0.003) discard;
  vec3 col = mix(uShade, uColor, clamp(0.55 + c.y * 0.45 + n * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export interface CloudProps {
  count: number
  /** horizontal extent (square, centred on origin) */
  spread: number
  height: number
  thickness: number
  size: number
  color: string
  shade: string
  opacity?: number
  seed?: number
}

/** Soft billboard clouds the camera can fly through during the descent. */
export function CloudLayer({ count, spread, height, thickness, size, color, shade, opacity = 0.85, seed = 7 }: CloudProps) {
  const mesh = useMemo(() => {
    const rng = createRng(seed)
    const geometry = new PlaneGeometry(1, 1)
    const material = new ShaderMaterial({
      uniforms: {
        uTime: surfaceUniforms.uTime,
        uColor: { value: new Color(color) },
        uShade: { value: new Color(shade) },
        uOpacity: { value: opacity },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
    })
    const im = new InstancedMesh(geometry, material, count)
    const attr = new Float32Array(count * 4)
    const m = new Matrix4()
    for (let i = 0; i < count; i++) {
      m.makeTranslation((rng() - 0.5) * spread, height + (rng() - 0.5) * thickness, (rng() - 0.5) * spread)
      im.setMatrixAt(i, m)
      attr.set([size * (0.6 + rng() * 0.8), rng(), 0.55 + rng() * 0.45, 0], i * 4)
    }
    geometry.setAttribute('aCloud', new InstancedBufferAttribute(attr, 4))
    im.frustumCulled = false
    im.renderOrder = 5
    return im
  }, [count, spread, height, thickness, size, color, shade, opacity, seed])

  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as ShaderMaterial).dispose()
      mesh.dispose()
    },
    [mesh],
  )

  return <primitive object={mesh} />
}
