import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial } from 'three'
import { createRng } from '../../../lib/random'
import { surfaceUniforms } from './uniforms'

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uSize;
uniform float uFall;
uniform float uDrift;
uniform float uPixelRatio;
uniform vec3 uBox;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y = mod(p.y - uTime * uFall * (0.5 + aSeed.x) + uBox.y * 0.5, uBox.y) - uBox.y * 0.5;
  p.x += sin(uTime * 0.31 * (0.5 + aSeed.y) + aSeed.z * 6.283) * uDrift;
  p.z += cos(uTime * 0.23 * (0.5 + aSeed.x) + aSeed.w * 6.283) * uDrift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * uPixelRatio * (0.4 + aSeed.w) * (60.0 / max(-mv.z, 0.5));
  gl_Position = projectionMatrix * mv;
  float edge = 1.0 - smoothstep(0.42, 0.5, max(abs(position.x / uBox.x), abs(position.z / uBox.z)));
  vAlpha = (0.45 + 0.55 * sin(uTime * (0.6 + aSeed.y) + aSeed.x * 20.0)) * edge * smoothstep(0.3, 2.0, -mv.z);
}`

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(c, c) * 3.5) * vAlpha * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export interface MotesProps {
  count: number
  box: readonly [number, number, number]
  position?: readonly [number, number, number]
  color: string
  size?: number
  fall?: number
  drift?: number
  opacity?: number
  additive?: boolean
  seed?: number
  /** optional external uniform so a biome can fade the motes (e.g. fireflies at night) */
  opacityUniform?: { value: number }
}

/** Drifting particles: marine snow, pollen, dust motes, embers. */
export function Motes(props: MotesProps) {
  const { count, box, position = [0, 0, 0], color, size = 1, fall = 0.05, drift = 0.4, opacity = 0.8, additive = true, seed = 11, opacityUniform } = props
  const dpr = useThree((s) => s.viewport.dpr)
  const points = useMemo(() => {
    const rng = createRng(seed)
    const pos = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      pos.set([(rng() - 0.5) * box[0], (rng() - 0.5) * box[1], (rng() - 0.5) * box[2]], i * 3)
      seeds.set([rng(), rng(), rng(), rng()], i * 4)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(pos, 3))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    const material = new ShaderMaterial({
      uniforms: {
        uTime: surfaceUniforms.uTime,
        uSize: { value: size },
        uFall: { value: fall },
        uDrift: { value: drift },
        uPixelRatio: { value: 1 },
        uBox: { value: [box[0], box[1], box[2]] },
        uColor: { value: new Color(color) },
        uOpacity: opacityUniform ?? { value: opacity },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
      fog: false,
    })
    const pts = new Points(geometry, material)
    pts.frustumCulled = false
    return pts
  }, [count, box, color, size, fall, drift, opacity, additive, seed, opacityUniform])

  useEffect(() => {
    ;(points.material as ShaderMaterial).uniforms.uPixelRatio.value = dpr
  }, [points, dpr])

  useEffect(
    () => () => {
      points.geometry.dispose()
      ;(points.material as ShaderMaterial).dispose()
    },
    [points],
  )

  return <primitive object={points} position={position} />
}
