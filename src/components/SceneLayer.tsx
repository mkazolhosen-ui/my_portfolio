import { lazy, Suspense } from 'react'

// Loaded lazily so the text appears immediately and Three.js loads separately.
const SceneCanvas = lazy(() => import('../scene/SceneCanvas'))

/**
 * Fixed, full-viewport background for the whole page.
 * The CSS backdrop is shown instantly and remains the fallback if WebGL is unavailable.
 */
export default function SceneLayer() {
  return (
    <div className="scene-layer" aria-hidden="true">
      <div className="hero__backdrop" />
      <div className="scene-layer__canvas">
        <Suspense fallback={null}>
          <SceneCanvas />
        </Suspense>
      </div>
    </div>
  )
}