import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BackSide, Color, SRGBColorSpace, Vector3 } from 'three'
import { moment, rig } from '../rig'
import { Asteroid, Moon, Theia } from './Bodies'
import { earthSun, Globe } from './Globe'
import { HumanLayer } from './HumanLayer'
import { earthView } from './earthCamera'
import { latLonToVec3 } from './geo'

const camDir = new Vector3()
const right = new Vector3()
const UP = new Vector3(0, 1, 0)
const sunLight = new Vector3()

export function EarthScene() {
  const { scene } = useThree()
  const milky = useTexture('/textures/milky-way.jpg')
  milky.colorSpace = SRGBColorSpace

  useEffect(() => {
    const prev = scene.background
    scene.background = new Color('#000000')
    return () => {
      scene.background = prev
    }
  }, [scene])

  useFrame(() => {
    const m = moment()
    const view = earthView(m.chapter.id, m.local, m.yearsAgo)
    latLonToVec3(view.lat, view.lon, 1, camDir)
    // composition: aim to the side of the globe so it sits off-centre
    right.crossVectors(UP, camDir).normalize()
    rig.target.copy(right).multiplyScalar(-view.shift * (view.distance / 3.2))
    rig.position.copy(camDir).multiplyScalar(view.distance)
    rig.fov = 40
    rig.bloom = 0.85
    // 360° drags orbit the planet itself (not the off-centre aim point); never inside the atmosphere
    rig.pivot = 'origin'
    rig.minDistance = 1.35
    // Sun: rotate the camera direction about the polar axis by sunAngle, keep a little tilt
    const c = Math.cos(view.sunAngle)
    const s = Math.sin(view.sunAngle)
    sunLight.set(camDir.x * c + camDir.z * s, 0.25, -camDir.x * s + camDir.z * c).normalize()
    earthSun.dir.copy(sunLight)
  })

  return (
    <group>
      <mesh scale={300} renderOrder={-1}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial map={milky} side={BackSide} color="#6a6a6a" depthWrite={false} />
      </mesh>
      <ambientLight intensity={0.03} />
      <SunLight />
      <Globe />
      <Moon />
      <Theia />
      <Asteroid />
      <HumanLayer />
    </group>
  )
}

/** Directional light following the shared Sun direction (lights the Moon and bodies). */
function SunLight() {
  const { scene } = useThree()
  useFrame(() => {
    const light = scene.getObjectByName('earth-sun')
    if (light) light.position.copy(earthSun.dir).multiplyScalar(20)
  })
  return <directionalLight name="earth-sun" intensity={2.2} color="#fff3e0" />
}
