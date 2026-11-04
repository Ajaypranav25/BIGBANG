import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Component, type ReactNode, Suspense, useEffect, useMemo } from 'react'
import { AnimationMixer, Box3, Group, Vector3 } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODEL_SPECS, type ModelKey, type ModelSpec, modelUrl } from './models'

interface CreatureProps {
  kind: ModelKey
  /** procedural stand-in, shown when no GLB exists, while loading, or if loading fails */
  fallback: ReactNode
  /** animation playback rate */
  speed?: number
}

/**
 * A creature that uses a Blender-prepared GLB when one is bundled, otherwise the procedural
 * fallback. The parent group owns placement/motion; this component only renders and animates.
 */
export function Creature({ kind, fallback, speed = 1 }: CreatureProps) {
  const url = modelUrl(kind)
  if (!url) return <>{fallback}</>
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfCreature url={url} spec={MODEL_SPECS[kind]} speed={speed} />
      </Suspense>
    </ModelBoundary>
  )
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const PREFERRED_CLIP = /walk|run|fly|swim|gallop|trot/i

function GltfCreature({ url, spec, speed }: { url: string; spec: ModelSpec; speed: number }) {
  const gltf = useGLTF(url)

  const { root, mixer } = useMemo(() => {
    const model = cloneSkinned(gltf.scene)
    model.updateMatrixWorld(true)
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const extent = spec.measure === 'height' ? size.y : spec.measure === 'span' ? size.x : size.z
    const s = extent > 1e-6 ? spec.meters / extent : 1
    const center = box.getCenter(new Vector3())
    // world point X maps to P + s·(X − P0); solve P so the feet sit on y = 0, centred on X/Z
    const p0 = model.position.clone()
    model.scale.multiplyScalar(s)
    model.position.set(-(center.x - p0.x) * s, -(box.min.y - p0.y) * s, -(center.z - p0.z) * s)
    const wrapper = new Group()
    wrapper.add(model)
    return { root: wrapper, mixer: new AnimationMixer(model) }
  }, [gltf, spec])

  useEffect(() => {
    const clips = gltf.animations
    if (clips.length === 0) return
    const clip = clips.find((c) => PREFERRED_CLIP.test(c.name)) ?? clips[0]
    const action = mixer.clipAction(clip)
    action.time = Math.random() * clip.duration
    action.play()
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(mixer.getRoot())
    }
  }, [gltf, mixer])

  useFrame((_, dt) => mixer.update(dt * speed))

  return <primitive object={root} />
}
