import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { decideAxis, gesture } from '../time/gesture'
import { framing, safeArea } from '../ui/safeArea'
import { RIG_DEFAULTS, resetView, rig, userView, zoomBy } from './rig'
import { applyUserView, type ViewOutput } from './viewMath'

const DRAG_SPEED = 0.0055 // radians per pixel
const INERTIA_DAMPING = 4 // 1/s
const EASE_RATE = 3.2
const PARALLAX = 0.03
const FOV_RANGE = [14, 95] as const

const smoothPos = new Vector3()
const smoothTarget = new Vector3()
const view: ViewOutput = { position: new Vector3(), target: new Vector3(), appliedPitch: 0 }
/** eased copies so the frame glides when chrome appears, hides or resizes */
const lens = { fov: 50, top: 0, bottom: 0, left: 0 }
const INSET_EASE = 6

interface Pointer {
  x: number
  y: number
  t: number
}

/**
 * Eases the camera toward the pose the active scene requests and layers the viewer's own
 * 360° rotation, zoom, pointer parallax and shake on top.
 *
 * Mouse: drag rotates in any direction, Ctrl+wheel / pinch zooms, double-click resets.
 * Touch: a mostly-horizontal drag rotates, a mostly-vertical one travels in time, two fingers zoom.
 */
export function CameraRig() {
  const { camera, gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, Pointer & { startX: number; startY: number; type: string }>()
    let parallaxX = 0
    let parallaxY = 0
    let pinchDistance = 0

    const rotateBy = (dx: number, dy: number, dtMs: number) => {
      const dYaw = -dx * DRAG_SPEED
      const dPitch = dy * DRAG_SPEED
      userView.yaw += dYaw
      userView.pitch += dPitch
      const dt = Math.max(dtMs, 8) / 1000
      userView.yawVelocity = dYaw / dt
      userView.pitchVelocity = dPitch / dt
    }

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, startX: e.clientX, startY: e.clientY, type: e.pointerType })
      userView.yawVelocity = 0
      userView.pitchVelocity = 0
      if (e.pointerType !== 'touch') gesture.mode = 'rotate'
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
        gesture.mode = 'pinch'
      }
      el.setPointerCapture?.(e.pointerId)
    }

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        parallaxX = (e.clientX / window.innerWidth) * 2 - 1
        parallaxY = (e.clientY / window.innerHeight) * 2 - 1
        rigParallax.x = parallaxX
        rigParallax.y = parallaxY
      }
      const p = pointers.get(e.pointerId)
      if (!p) return
      if (gesture.mode === 'pinch' && pointers.size === 2) {
        p.x = e.clientX
        p.y = e.clientY
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDistance > 0 && d > 0) zoomBy(pinchDistance / d)
        pinchDistance = d
        return
      }
      if (gesture.mode === 'none' && p.type === 'touch') gesture.mode = decideAxis(e.clientX - p.startX, e.clientY - p.startY)
      if (gesture.mode === 'rotate') rotateBy(e.clientX - p.x, e.clientY - p.y, e.timeStamp - p.t)
      p.x = e.clientX
      p.y = e.clientY
      p.t = e.timeStamp
    }

    const up = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      pointers.delete(e.pointerId)
      // a pause before release means no fling
      if (p && e.timeStamp - p.t > 80) {
        userView.yawVelocity = 0
        userView.pitchVelocity = 0
      }
      if (pointers.size === 0) gesture.mode = 'none'
    }

    const dbl = () => resetView()

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('dblclick', dbl)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('dblclick', dbl)
    }
  }, [gl])

  useFrame((state, dt) => {
    const cut = rig.cut
    const k = cut ? 1 : 1 - Math.exp(-EASE_RATE * dt)
    smoothPos.lerp(rig.position, k)
    smoothTarget.lerp(rig.target, k)
    if (cut) resetView() // a new scene starts from its own cinematic framing
    rig.cut = false

    // inertia after a fling
    if (gesture.mode !== 'rotate') {
      userView.yaw += userView.yawVelocity * dt
      userView.pitch += userView.pitchVelocity * dt
      const decay = Math.exp(-INERTIA_DAMPING * dt)
      userView.yawVelocity *= decay
      userView.pitchVelocity *= decay
    }

    const eye = rig.pivot === 'eye'
    applyUserView(
      {
        position: smoothPos,
        target: smoothTarget,
        pivot: rig.pivot,
        yaw: userView.yaw + rigParallax.x * PARALLAX,
        pitch: userView.pitch - rigParallax.y * PARALLAX * 0.6,
        zoom: eye ? 1 : userView.zoom,
        minDistance: rig.minDistance,
        minElevation: rig.minElevation,
        maxElevation: rig.maxElevation,
      },
      view,
    )
    // stop accumulating pitch past the clamp so reversing direction responds immediately
    const intended = userView.pitch - rigParallax.y * PARALLAX * 0.6
    if (Math.abs(view.appliedPitch - intended) > 1e-4) {
      userView.pitch = view.appliedPitch + rigParallax.y * PARALLAX * 0.6
      userView.pitchVelocity = 0
    }

    camera.position.copy(view.position)
    if (rig.shake > 0.001) {
      const amp = rig.shake * 0.012 * view.position.distanceTo(view.target)
      camera.position.x += (Math.random() - 0.5) * amp
      camera.position.y += (Math.random() - 0.5) * amp
      rig.shake *= Math.exp(-2.5 * dt)
    }
    camera.up.set(0, 1, 0)
    camera.lookAt(view.target)
    // scenes that only ever raise the flash (impacts) rely on this decay
    rig.flash *= Math.exp(-3 * dt)

    // lens: the scene's fov (and zoom, for look-around), then refit the shot into the free band
    // between the floating chrome so nothing important sits under the top bar or the HUD
    const cam = camera as PerspectiveCamera
    const fov = Math.min(FOV_RANGE[1], Math.max(FOV_RANGE[0], eye ? rig.fov * userView.zoom : rig.fov))
    lens.fov += (fov - lens.fov) * (cut ? 1 : 1 - Math.exp(-4 * dt))
    const ke = 1 - Math.exp(-INSET_EASE * dt)
    lens.top += (safeArea.top - lens.top) * ke
    lens.bottom += (safeArea.bottom - lens.bottom) * ke
    lens.left += (safeArea.left - lens.left) * ke
    const { width, height } = state.size
    const fit = framing(lens.fov, height, lens.top, lens.bottom, lens.left)
    cam.fov = fit.fov
    cam.setViewOffset(width, height, fit.offsetX, fit.offsetY, width, height)

    // per-frame scene settings fall back to defaults unless the scene sets them again
    rig.pivot = RIG_DEFAULTS.pivot
    rig.minDistance = RIG_DEFAULTS.minDistance
    rig.minElevation = RIG_DEFAULTS.minElevation
    rig.maxElevation = RIG_DEFAULTS.maxElevation
  })

  return null
}

const rigParallax = { x: 0, y: 0 }
