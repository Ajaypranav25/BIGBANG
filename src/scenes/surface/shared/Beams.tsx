import { useEffect, useMemo } from 'react'
import { AdditiveBlending, type BufferGeometry, Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../../../lib/random'
import { surfaceUniforms } from './uniforms'

const VERT = /* glsl */ `
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFade = smoothstep(0.5, 6.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
varying float vFade;
void main() {
  float across = sin(3.14159 * vUv.x);
  float along = pow(vUv.y, 1.6);
  float flicker = 0.7 + 0.3 * sin(uTime * 0.6 + uSeed * 17.0 + vUv.y * 3.0);
  float a = across * across * along * flicker * uOpacity * vFade;
  gl_FragColor = vec4(uColor * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export interface BeamsProps {
  count: number
  /** square area the beams start over */
  spread: number
  top: number
  length: number
  width: number
  /** lean of the light, radians around X and Z */
  lean: readonly [number, number]
  color: string
  opacity: number
  center?: readonly [number, number]
  seed?: number
  opacityUniform?: { value: number }
}

/** Crepuscular light shafts / underwater god rays as crossed additive planes. */
export function Beams({ count, spread, top, length, width, lean, color, opacity, center = [0, 0], seed = 5, opacityUniform }: BeamsProps) {
  const group = useMemo(() => {
    const rng = createRng(seed)
    const a = new PlaneGeometry(1, 1).translate(0, -0.5, 0)
    const b = a.clone().rotateY(Math.PI / 2)
    const cross = mergeGeometries([a, b])
    a.dispose()
    b.dispose()
    if (!cross) throw new Error('Beams: could not build beam geometry')
    const g = new Group()
    const shared = opacityUniform ?? { value: opacity }
    for (let i = 0; i < count; i++) {
      const mat = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(color) },
          uOpacity: shared,
          uTime: surfaceUniforms.uTime,
          uSeed: { value: rng() },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        fog: false,
      })
      const mesh = new Mesh(cross, mat)
      const w = width * (0.5 + rng())
      mesh.scale.set(w, length * (0.7 + rng() * 0.5), w)
      mesh.position.set(center[0] + (rng() - 0.5) * spread, top, center[1] + (rng() - 0.5) * spread)
      mesh.rotation.set(lean[0] + (rng() - 0.5) * 0.08, rng() * Math.PI, lean[1] + (rng() - 0.5) * 0.08)
      mesh.renderOrder = 10
      g.add(mesh)
    }
    g.userData.geometry = cross
    return g
  }, [count, spread, top, length, width, lean, color, opacity, center, seed, opacityUniform])

  useEffect(
    () => () => {
      ;(group.userData.geometry as BufferGeometry).dispose()
      group.children.forEach((c) => ((c as Mesh).material as ShaderMaterial).dispose())
    },
    [group],
  )

  return <primitive object={group} />
}
