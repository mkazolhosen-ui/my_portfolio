import { useEffect, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { dragState, MAX_PITCH } from './dragState'
import { introVisual } from './introState'

/** Radians of rotation per pixel of mouse travel. */
const SENSITIVITY = 0.008
/** Fastest spin a flick can start, in radians per second. */
const MAX_VELOCITY = 8
/** Grab area around the core's centre, in world units (the outer net is about 1.85). */
const HIT_RADIUS = 2.0
/** Releasing this long after the last movement counts as stopped, so the core won't coast. */
const STOP_AFTER_MS = 90

/** Presses on these never start a drag, so links, buttons, cards and the nav keep working. */
const IGNORE =
  'a, button, input, textarea, select, summary, label, [role="button"], [contenteditable="true"], .nav, .project, .skill, .skills__map, .signal__panel'

interface CoreDragControlsProps {
  /** The group that holds the whole core (the one CyberCore rotates). */
  target: RefObject<THREE.Group | null>
  /** False for reduced motion: no listeners are attached at all. */
  enabled: boolean
}

/**
 * Lets you grab and spin the core with the mouse. The 3D layer sits behind the page and ignores
 * pointer events, so this listens on the window and hit-tests against the core's projected outline.
 */
export default function CoreDragControls({ target, enabled }: CoreDragControlsProps) {
  const get = useThree((state) => state.get)

  useEffect(() => {
    if (!enabled) return

    const html = document.documentElement
    const world = new THREE.Vector3()
    const last = { x: 0, y: 0, t: 0 }
    const { clamp, lerp, degToRad } = THREE.MathUtils
    let activeId = -1
    let hovering = false

    const blocked = (t: EventTarget | null) =>
      t instanceof Element && t.closest(IGNORE) !== null

    /** Is this screen position inside the core's outline? The canvas fills the viewport from (0, 0). */
    const hitsCore = (x: number, y: number): boolean => {
      const group = target.current
      const { camera, size } = get()
      if (!group || !group.visible || !(camera instanceof THREE.PerspectiveCamera)) return false

      group.getWorldPosition(world)
      const distance = camera.position.distanceTo(world)
      if (distance <= 0.01) return false

      world.project(camera)
      const cx = (world.x * 0.5 + 0.5) * size.width
      const cy = (-world.y * 0.5 + 0.5) * size.height
      const pxPerUnit =
        size.height / (2 * Math.tan(degToRad(camera.fov) / 2) * distance)
      const radius = HIT_RADIUS * group.scale.x * pxPerUnit

      return Math.hypot(x - cx, y - cy) <= radius
    }

    const setHover = (value: boolean) => {
      if (value === hovering) return
      hovering = value
      html.classList.toggle('core-hover', value)
    }

    const endDrag = (timeStamp: number) => {
      if (!dragState.dragging) return
      dragState.dragging = false
      activeId = -1
      html.classList.remove('core-dragging')
      // If the pointer rested before release, don't coast.
      if (timeStamp - last.t > STOP_AFTER_MS) {
        dragState.velYaw = 0
        dragState.velPitch = 0
      }
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !e.isPrimary || e.button !== 0) return
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      // Not while the name intro is playing (a click there means "skip").
      if (introVisual.core < 1) return
      if (blocked(e.target) || !hitsCore(e.clientX, e.clientY)) return

      dragState.dragging = true
      dragState.velYaw = 0
      dragState.velPitch = 0
      activeId = e.pointerId
      last.x = e.clientX
      last.y = e.clientY
      last.t = e.timeStamp

      setHover(false)
      html.classList.add('core-dragging')
      window.getSelection()?.removeAllRanges()
    }

    const onMove = (e: PointerEvent) => {
      if (dragState.dragging) {
        if (e.pointerId !== activeId) return

        const dx = (e.clientX - last.x) * SENSITIVITY
        const dy = (e.clientY - last.y) * SENSITIVITY
        const dt = Math.max((e.timeStamp - last.t) / 1000, 0.001)

        dragState.yaw += dx
        dragState.pitch = clamp(dragState.pitch + dy, -MAX_PITCH, MAX_PITCH)
        // Smoothed speed, used for coasting after release.
        dragState.velYaw = lerp(dragState.velYaw, clamp(dx / dt, -MAX_VELOCITY, MAX_VELOCITY), 0.5)
        dragState.velPitch = lerp(
          dragState.velPitch,
          clamp(dy / dt, -MAX_VELOCITY, MAX_VELOCITY),
          0.5,
        )

        last.x = e.clientX
        last.y = e.clientY
        last.t = e.timeStamp
        return
      }

      if (e.pointerType === 'touch') return
      // No grab cursor while the name intro is playing.
      if (introVisual.core < 1) {
        setHover(false)
        return
      }
      setHover(!blocked(e.target) && hitsCore(e.clientX, e.clientY))
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId === activeId) endDrag(e.timeStamp)
    }

    const onBlur = () => endDrag(Infinity)

    // Stop the browser from selecting text while you drag across the headline.
    const onSelectStart = (e: Event) => {
      if (dragState.dragging) e.preventDefault()
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('selectstart', onSelectStart)

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('selectstart', onSelectStart)
      dragState.dragging = false
      html.classList.remove('core-dragging', 'core-hover')
    }
  }, [enabled, get, target])

  return null
}