import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** What the stage is doing during a measurement. */
export type BenchMode = 'normal' | 'paused' | 'off'

interface BenchPanelProps {
  /** True while the stage is on screen. The benchmark is only meaningful then. */
  stageVisible: boolean
  /** Asks the stage to switch mode. */
  onMode: (mode: BenchMode) => void
}

interface Summary {
  frames: number
  fps: number
  median: number
  p95: number
  worst: number
}

/** Time given to settle after each switch (the canvas may need to start up), then time measured. */
const WARMUP_MS = 1500
const SAMPLE_MS = 6000

/** The first and last phases are the same on purpose: they show how much the numbers drift by chance. */
const PHASES: { label: string; mode: BenchMode }[] = [
  { label: 'stage drawing', mode: 'normal' },
  { label: 'stage paused', mode: 'paused' },
  { label: 'stage removed', mode: 'off' },
  { label: 'stage drawing (2nd)', mode: 'normal' },
]

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function summarize(deltas: number[]): Summary {
  const sorted = [...deltas].sort((a, b) => a - b)
  const total = deltas.reduce((sum, value) => sum + value, 0)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  return {
    frames: deltas.length,
    fps: (deltas.length * 1000) / total,
    median: at(0.5),
    p95: at(0.95),
    worst: sorted[sorted.length - 1],
  }
}

/** Counts page frames for `ms` milliseconds (everything on screen counts, both canvases included). */
function sample(ms: number): Promise<Summary> {
  return new Promise((resolve) => {
    const deltas: number[] = []
    const start = performance.now()
    let last = start

    function tick(now: number) {
      const delta = now - last
      last = now
      // A huge gap means the tab was in the background, which says nothing about speed.
      if (delta < 1000) deltas.push(delta)
      if (now - start >= ms) {
        resolve(summarize(deltas))
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function formatRow(label: string, r: Summary) {
  return (
    `${label.padEnd(20)}` +
    `${r.fps.toFixed(1).padStart(6)} fps` +
    `  median ${r.median.toFixed(1)} ms` +
    `  p95 ${r.p95.toFixed(1)} ms` +
    `  worst ${r.worst.toFixed(0)} ms`
  )
}

const INTRO_TEXT =
  'Scroll until the stage fills the view, then press Run.\nDo not move the mouse or scroll for about 30 seconds.'

/**
 * Measures the same page four ways in one session: stage drawing, stage paused (still loaded),
 * stage removed entirely, and stage drawing again. The comparison shows what the stage costs,
 * separately from everything else on the page.
 */
export default function BenchPanel({ stageVisible, onMode }: BenchPanelProps) {
  const [text, setText] = useState(INTRO_TEXT)
  const [running, setRunning] = useState(false)
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false
    return () => {
      stopped.current = true
    }
  }, [])

  async function run() {
    if (running) return
    if (!stageVisible) {
      setText('The stage is not in view. Scroll to it first, then press Run again.')
      return
    }

    setRunning(true)
    const rows: string[] = []
    const results: Summary[] = []

    for (const phase of PHASES) {
      if (stopped.current) return
      setText(`Measuring: ${phase.label} ... (${rows.length + 1} of ${PHASES.length})`)
      onMode(phase.mode)
      await wait(WARMUP_MS)
      const result = await sample(SAMPLE_MS)
      results.push(result)
      rows.push(formatRow(phase.label, result))
    }

    onMode('normal')
    if (stopped.current) return

    const drawing = (results[0].fps + results[3].fps) / 2
    const removed = results[2].fps
    const header =
      `window ${window.innerWidth}x${window.innerHeight}  pixel ratio ${window.devicePixelRatio}` +
      `  cores ${navigator.hardwareConcurrency}`
    const summary =
      `stage costs ${(Math.max(0, 1 - drawing / removed) * 100).toFixed(0)}% of the frame rate ` +
      `(drawing ${drawing.toFixed(1)} vs removed ${removed.toFixed(1)} fps)`

    setText([header, ...rows, summary].join('\n'))
    setRunning(false)
  }

  function copy() {
    void navigator.clipboard?.writeText(text)
  }

  return createPortal(
    <div className="universe__bench">
      <div className="universe__bench-buttons">
        <button type="button" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run benchmark'}
        </button>
        <button type="button" onClick={copy} disabled={running}>
          Copy results
        </button>
      </div>
      <pre>{text}</pre>
    </div>,
    document.body,
  )
}