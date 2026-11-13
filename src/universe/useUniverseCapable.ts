import { useSyncExternalStore } from 'react'

/** The stage and its panel sit side by side, so they need a tablet-landscape width or more. */
const QUERY = '(min-width: 900px)'

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

let webglSupported: boolean | undefined

/** Checked once and remembered. The test context is released straight away. */
function hasWebGL(): boolean {
  if (webglSupported !== undefined) return webglSupported
  let ok = false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    ok = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    // Some browsers throw when WebGL is blocked. That simply means "not supported".
  }
  webglSupported = ok
  return ok
}

/**
 * True when the interactive project explorer may be shown:
 * a wide enough screen and a browser with WebGL. Phones and old browsers keep the plain cards.
 */
export default function useUniverseCapable(): boolean {
  const wide = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return wide && hasWebGL()
}