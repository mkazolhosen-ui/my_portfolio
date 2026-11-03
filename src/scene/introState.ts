import { useSyncExternalStore } from 'react'

export type IntroStatus = 'playing' | 'done'

const SEEN_KEY = 'cr-intro-seen'

/** Values shared between the skip controls and the 3D scene. */
export const introControl = {
  /** Becomes true once the 3D pieces exist. */
  started: false,
  /** Becomes true when the visitor asks to skip. */
  skip: false,
}

/** The cyber core fades toward this value: 0 = hidden, 1 = visible. */
export const introVisual = { core: 1 }

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** The intro is skipped for reduced motion, no WebGL, or (in production) repeat visits. */
function shouldPlay(): boolean {
  if (typeof window === 'undefined') return false
  // Never run the public intro on the admin dashboard.
  if (/^\/admin(\/|$)/.test(window.location.pathname)) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (!webglAvailable()) return false
  if (import.meta.env.PROD) {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return false
    } catch {
      // Storage can be blocked; just play the intro.
    }
  }
  return true
}

let status: IntroStatus = shouldPlay() ? 'playing' : 'done'
const listeners = new Set<() => void>()
let removeGuards: (() => void) | null = null

/** Ends the intro right away (used by the Skip controls). */
export function requestSkip() {
  if (status === 'done') return
  introControl.skip = true
  // The 3D pieces do not exist yet, so there is nothing to dissolve: just show the hero.
  if (!introControl.started) finishIntro()
}

/** While the intro plays: block scrolling and listen for skip requests. */
function installGuards(): () => void {
  const stopScroll = (event: Event) => event.preventDefault()
  const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home']
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === ' ') {
      event.preventDefault()
      requestSkip()
    } else if (scrollKeys.includes(event.key)) {
      event.preventDefault()
    }
  }
  const onPointer = () => requestSkip()

  window.addEventListener('wheel', stopScroll, { passive: false })
  window.addEventListener('touchmove', stopScroll, { passive: false })
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)

  return () => {
    window.removeEventListener('wheel', stopScroll)
    window.removeEventListener('touchmove', stopScroll)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPointer)
  }
}

export function finishIntro() {
  if (status === 'done') return
  status = 'done'
  introVisual.core = 1 // make sure the core is visible, however the intro ended
  removeGuards?.()
  removeGuards = null
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Ignore blocked storage.
  }
  listeners.forEach((listener) => listener())
}

function subscribeIntro(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React hook: re-renders the component when the intro finishes. */
export function useIntroStatus(): IntroStatus {
  return useSyncExternalStore(
    subscribeIntro,
    () => status,
    () => 'done',
  )
}

if (status === 'playing') {
  // While the intro plays, CSS hides the hero text (see scene.css).
  document.documentElement.dataset.intro = 'playing'
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  introVisual.core = 0
  removeGuards = installGuards()

  // Safety net 1: if the 3D scene never starts (slow network, error), show the hero anyway.
  window.setTimeout(() => {
    if (!introControl.started) finishIntro()
  }, 7000)
  // Safety net 2: the hero must never stay hidden, whatever happens.
  window.setTimeout(finishIntro, 20000)
}
