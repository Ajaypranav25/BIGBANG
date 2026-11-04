import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from 'three'
import type { Line2 } from 'three-stdlib'
import { EVENTS } from '../../data/events'
import { SETTLEMENTS } from '../../data/settlements'
import { worldPopulationMillions } from '../../data/telemetry'
import { interpolate, smoothstep, type Anchor } from '../../lib/interpolate'
import { createRng } from '../../lib/random'
import { clock } from '../../time/clock'
import { formatShort, timeToProgress } from '../../time/timeline'
import { moment } from '../rig'
import { earthSun } from './Globe'
import { greatCircle, latLonToVec3 } from './geo'
import { ROUTES } from './migrations'

/* ---------------------------------------------------------------- settlements */

const settlementVertex = /* glsl */ `
attribute float aFounded;
attribute float aWeight;
uniform float uYearsAgo;
uniform float uPop;
uniform vec3 uSunDir;
uniform float uPixelRatio;
varying float vA;
varying float vNight;
void main(){
  float age = aFounded - uYearsAgo;
  float on = step(0.0, age);
  float grow = smoothstep(0.0, 400.0, age);
  vec3 wn = normalize(mat3(modelMatrix)*position);
  vNight = 1.0 - smoothstep(-0.2, 0.1, dot(wn, normalize(uSunDir)));
  vA = on * (0.35 + 0.65*grow) * (0.5 + 0.25*aWeight) * uPop;
  vec4 mv = modelViewMatrix*vec4(position,1.0);
  gl_PointSize = clamp(uPixelRatio * (3.0 + aWeight*2.5) * (1.0 + grow) * 4.0 / -mv.z, 0.0, 26.0) * on;
  gl_Position = projectionMatrix*mv;
}`

const settlementFragment = /* glsl */ `
varying float vA;
varying float vNight;
void main(){
  vec2 c = gl_PointCoord*2.0-1.0; float d = dot(c,c); if (d>1.0) discard;
  float a = exp(-d*4.0) * vA * mix(0.25, 1.0, vNight);
  gl_FragColor = vec4(vec3(1.0,0.72,0.38)*a*1.6, a);
}`

function Settlements() {
  const geometry = useMemo(() => {
    const pos = new Float32Array(SETTLEMENTS.length * 3)
    const founded = new Float32Array(SETTLEMENTS.length)
    const weight = new Float32Array(SETTLEMENTS.length)
    const v = new Vector3()
    SETTLEMENTS.forEach((s, i) => {
      latLonToVec3(s.lat, s.lon, 1.003, v)
      pos.set([v.x, v.y, v.z], i * 3)
      founded[i] = s.foundedYearsAgo
      weight[i] = s.weight
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aFounded', new BufferAttribute(founded, 1))
    g.setAttribute('aWeight', new BufferAttribute(weight, 1))
    return g
  }, [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: settlementVertex,
        fragmentShader: settlementFragment,
        uniforms: {
          uYearsAgo: { value: 0 },
          uPop: { value: 0 },
          uSunDir: { value: earthSun.dir },
          uPixelRatio: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  useFrame((state) => {
    const m = moment()
    const pop = worldPopulationMillions(m.yearsAgo) ?? 0
    material.uniforms.uYearsAgo.value = m.yearsAgo
    // brightness tracks log(population): ~0.45 at 5 M people, 1.0 at 8 billion
    material.uniforms.uPop.value = pop > 0 ? 0.45 + 0.55 * smoothstep(Math.log(5), Math.log(8000), Math.log(pop)) : 0
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
  })
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />
}

/* ---------------------------------------------------------------- migrations */

function MigrationRoute({ index }: { index: number }) {
  const route = ROUTES[index]
  const points = useMemo(() => {
    const pts: Vector3[] = []
    for (let i = 0; i < route.path.length - 1; i++) {
      const seg = greatCircle([...route.path[i]] as [number, number], [...route.path[i + 1]] as [number, number], 24, 1.006)
      pts.push(...(i === 0 ? seg : seg.slice(1)))
    }
    return pts
  }, [route])
  const ref = useRef<Line2>(null)
  useFrame(() => {
    const line = ref.current
    if (!line) return
    const y = moment().yearsAgo
    const t = smoothstep(route.from, route.to, y)
    const segments = points.length - 1
    line.geometry.instanceCount = Math.max(0, Math.floor(segments * t))
    line.visible = y < route.from && y > 9_000
  })
  return <Line ref={ref} points={points} color="#ffd38a" lineWidth={2.2} transparent opacity={0.9} />
}

/* ---------------------------------------------------------------- satellites */

/** Active satellites (approximate) — UCS Satellite Database & J. McDowell's GCAT. */
const ACTIVE_SATELLITES: readonly Anchor[] = [
  [1957, 0],
  [1958, 2],
  [1965, 150],
  [1980, 600],
  [2000, 850],
  [2015, 1400],
  [2019, 2200],
  [2021, 4800],
  [2023, 8000],
  [2026, 12000],
]
const MAX_SATS = 12_000

function Satellites() {
  const geometry = useMemo(() => {
    const rng = createRng(1957)
    const params = new Float32Array(MAX_SATS * 4)
    for (let i = 0; i < MAX_SATS; i++) {
      const shell = rng()
      // ~85% LEO, ~8% MEO (navigation), ~7% GEO ring
      const radius = shell < 0.85 ? 1.05 + rng() * 0.12 : shell < 0.93 ? 1.55 : 1.95
      const incl = shell < 0.93 ? (rng() * 1.6 - 0.8) * 1.2 : 0
      params.set([radius, incl, rng() * Math.PI * 2, rng() * Math.PI * 2], i * 4)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(MAX_SATS * 3), 3))
    g.setAttribute('aOrbit', new BufferAttribute(params, 4))
    return g
  }, [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: /* glsl */ `
          attribute vec4 aOrbit;
          uniform float uTime; uniform float uCount; uniform float uPixelRatio; uniform float uFade;
          varying float vOn;
          void main(){
            float id = float(gl_VertexID);
            vOn = step(id, uCount) * step(0.01, uFade);
            float r = aOrbit.x;
            float speed = 0.35 * pow(r, -1.5);
            float a = aOrbit.w + uTime*speed;
            vec3 p = vec3(cos(a)*r, 0.0, sin(a)*r);
            float ci = cos(aOrbit.y), si = sin(aOrbit.y);
            p = vec3(p.x, p.z*si, p.z*ci);
            float cr = cos(aOrbit.z), sr = sin(aOrbit.z);
            p = vec3(cr*p.x - sr*p.z, p.y, sr*p.x + cr*p.z);
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_PointSize = vOn * clamp(uPixelRatio*5.0/-mv.z, 0.8, 3.0);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vOn;
          uniform float uFade;
          void main(){ if (vOn < 0.5) discard; gl_FragColor = vec4(vec3(0.75,0.9,1.0)*0.9*uFade, 0.9*uFade); }`,
        uniforms: { uTime: { value: 0 }, uCount: { value: 0 }, uPixelRatio: { value: 1 }, uFade: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  useFrame((state) => {
    const m = moment()
    const year = 2026 - m.yearsAgo
    material.uniforms.uTime.value = m.elapsed
    material.uniforms.uCount.value = year < 1957.75 ? 0 : interpolate(ACTIVE_SATELLITES, year)
    // at pale-blue-dot distances thousands of 1-px points read as glitter; let them fade away
    material.uniforms.uFade.value = 1 - smoothstep(5, 12, state.camera.position.length())
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* ---------------------------------------------------------------- event pins */

const PINNED = EVENTS.filter((e) => e.location && e.yearsAgo < 320_000).map((e) => ({
  event: e,
  progress: timeToProgress(e.yearsAgo),
  position: latLonToVec3(e.location!.lat, e.location!.lon, 1.01),
}))

/** How long (in scroll progress) a pin stays up after its moment passes. */
const PIN_WINDOW = 0.006
const MAX_PINS = 4
const PINS_OFF_AFTER = 0.9965

function EventPins() {
  const [active, setActive] = useState<string[]>([])
  const last = useRef('')
  useFrame(() => {
    const p = clock.progress
    // clear the stage for the final pull-back to the pale blue dot
    const ids = (p > PINS_OFF_AFTER ? [] : PINNED)
      .filter((x) => p >= x.progress - 0.0008 && p - x.progress < PIN_WINDOW)
      .sort((a, b) => b.event.importance - a.event.importance || b.progress - a.progress)
      .slice(0, MAX_PINS)
      .map((x) => x.event.id)
    const key = ids.join('|')
    if (key !== last.current) {
      last.current = key
      setActive(ids)
    }
  })
  return (
    <>
      {PINNED.filter((x) => active.includes(x.event.id)).map(({ event, position }) => (
        <Html key={event.id} position={position} center zIndexRange={[20, 10]} occlude={false}>
          <div className={`pin ${event.category === 'extinction' ? 'tone-red' : ''}`}>
            <span className="pin-dot" />
            <span className="pin-name">{event.location!.name}</span>
            <span className="pin-when num">{formatShort(event.yearsAgo)}</span>
          </div>
        </Html>
      ))}
    </>
  )
}

/* ---------------------------------------------------------------- composite */

export function HumanLayer() {
  const [visible, setVisible] = useState(false)
  useFrame(() => {
    const on = moment().yearsAgo < 330_000
    if (on !== visible) setVisible(on)
  })
  if (!visible) return null
  return (
    <group>
      <Settlements />
      {ROUTES.map((r, i) => (
        <MigrationRoute key={r.name} index={i} />
      ))}
      <Satellites />
      <EventPins />
    </group>
  )
}
