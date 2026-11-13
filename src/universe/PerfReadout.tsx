import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface PerfReadoutProps {
  /** A short word describing what the stage is doing, shown in the readout. */
  state: string
}

/**
 * A tiny measurement overlay (only with ?perf=1). It counts page frames, so it shows the combined
 * cost of everything on screen, including both WebGL canvases. It writes straight into the element,
 * so it does not cause React re-renders.
 */
export default function PerfReadout({ state }: PerfReadoutProps) {
  const output = useRef<HTMLPreElement>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let handle = 0
    let last = performance.now()
    let windowStart = last
    let frames = 0
    let worst = 0

    function tick(now: number) {
      const delta = now - last
      last = now
      // A huge gap means the tab was in the background, so it says nothing about speed.
      if (delta < 1000) {
        frames += 1
        if (delta > worst) worst = delta
      }
      if (now - windowStart >= 1000) {
        const fps = (frames * 1000) / (now - windowStart)
        if (output.current) {
          output.current.textContent =
            `fps    ${fps.toFixed(0)}\nworst  ${worst.toFixed(0)} ms\nstage  ${stateRef.current}`
        }
        frames = 0
        worst = 0
        windowStart = now
      }
      handle = requestAnimationFrame(tick)
    }

    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [])

  return createPortal(
    <pre ref={output} className="universe__perf" aria-hidden="true">
      measuring…
    </pre>,
    document.body,
  )
}
