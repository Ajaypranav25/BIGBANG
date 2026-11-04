import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide, Color, type Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import { surfaceUniforms } from './uniforms'

export interface SkyUniforms {
  uTop: { value: Color }
  uHorizon: { value: Color }
  uGround: { value: Color }
  uSunDir: { value: Vector3 }
  uSunColor: { value: Color }
  /** 1 = small crisp disc; larger = bigger, hazier sun */
  uSunSize: { value: number }
  uHaze: { value: number }
  uStars: { value: number }
}

export function createSkyUniforms(init: {
  top: string
  horizon: string
  ground: string
  sunDir: readonly [number, number, number]
  sunColor: string
  sunSize?: number
  haze?: number
  stars?: number
}): SkyUniforms {
  return {
    uTop: { value: new Color(init.top) },
    uHorizon: { value: new Color(init.horizon) },
    uGround: { value: new Color(init.ground) },
    uSunDir: { value: new Vector3(...init.sunDir).normalize() },
    uSunColor: { value: new Color(init.sunColor) },
    uSunSize: { value: init.sunSize ?? 1 },
    uHaze: { value: init.haze ?? 1 },
    uStars: { value: init.stars ?? 0 },
  }
}

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunSize;
uniform float uHaze;
uniform float uStars;
uniform float uTime;
varying vec3 vDir;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0
    ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.5))
    : mix(uHorizon, uGround, pow(clamp(-h * 4.0, 0.0, 1.0), 0.6));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  float disc = smoothstep(1.0 - 0.00012 * uSunSize * uSunSize, 1.0 - 0.00004 * uSunSize * uSunSize, sd);
  col += uSunColor * (disc * 3.0 + pow(sd, 14.0) * 0.45 * uHaze + pow(sd, 3.0) * 0.12 * uHaze);
  if (uStars > 0.001 && h > -0.02) {
    vec3 g = d * 260.0;
    vec3 cell = floor(g);
    float r = hash13(cell);
    vec3 f = fract(g) - 0.5;
    float star = step(0.9955, r) * (1.0 - smoothstep(0.0, 0.32, length(f)));
    float tw = 0.65 + 0.35 * sin(uTime * (1.0 + r * 4.0) + r * 60.0);
    // a faint Milky Way band
    float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.55, -0.78))) * 3.2, 2.0));
    col += vec3(0.82, 0.88, 1.0) * (star * tw * 1.6 + band * 0.035) * uStars * smoothstep(-0.02, 0.12, h);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** Gradient sky dome with sun, haze and optional stars; follows the camera. */
export function SkyDome({ uniforms, radius = 340 }: { uniforms: SkyUniforms; radius?: number }) {
  const ref = useRef<Mesh>(null)
  const { geometry, material } = useMemo(() => {
    const geometry = new SphereGeometry(radius, 48, 24)
    const material = new ShaderMaterial({
      uniforms: { ...uniforms, uTime: surfaceUniforms.uTime },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
    return { geometry, material }
  }, [uniforms, radius])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position)
  })

  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-1000} frustumCulled={false} />
}
