import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import { useIntroStatus } from '../scene/introState'
import BenchPanel, { type BenchMode } from './BenchPanel'
import PerfReadout from './PerfReadout'
import type { ProjectIdentity } from './projectIdentity'
import StageErrorBoundary from './StageErrorBoundary'
import { BENCH_ENABLED, LOW_POWER, PERF_ENABLED, STAGE_OFF } from './universeFlags'
import { universeState, type QualityTier } from './universeState'

gsap.registerPlugin(ScrollTrigger)

// The 3D code is its own chunk. It is only requested when the stage scrolls near the screen.
const UniverseCanvas = lazy(() => import('./UniverseCanvas'))

/** Start loading this far (in pixels) before the stage scrolls into view. */
const LOAD_MARGIN = '600px 0px'

interface UniverseStageProps {
  /** One identity (shape, tint, rings...) per project, in list order. */
  identities: ProjectIdentity[]
  /** Index of the selected project, or null. */
  selected: number | null
  /** Project titles in list order, for the hover tooltip. */
  titles: string[]
  /** Live demo address per project ("" when it has none), so the tooltip can say what a click does. */
  liveUrls: string[]
  /** A short message to show on the stage (for example "Live version coming soon"), or "". */
  notice: string
  /** A project node was clicked or tapped in the 3D stage. */
  onSelect: (index: number) => void
  /** Empty stage space was clicked or tapped. */
  onOverview: () => void
}

function Message({ children }: { children: string }) {
  return (
    <div className="universe__message">
      <p className="universe__stage-note">{children}</p>
    </div>
  )
}

/**
 * Fills the stage frame. Loads the 3D canvas lazily (and never during the name intro),
 * and only lets it draw while the frame is on screen.
 */
export default function UniverseStage({
  identities,
  selected,
  titles,
  liveUrls,
  notice,
  onSelect,
  onOverview,
}: UniverseStageProps) {
  const frame = useRef<HTMLDivElement>(null)
  const intro = useIntroStatus()
  const reducedMotion = usePrefersReducedMotion()
  // A browser without IntersectionObserver simply loads and draws straight away.
  const noObserver = typeof IntersectionObserver === 'undefined'
  const [near, setNear] = useState(noObserver)
  const [visible, setVisible] = useState(noObserver)
  const [hovered, setHovered] = useState<number | null>(null)
  // Only ever changed by the benchmark (?bench=1): normal, paused (still loaded) or removed.
  const [benchMode, setBenchMode] = useState<BenchMode>('normal')
  // How much the stage is holding back (see universeQuality.ts). Shown in the ?perf=1 readout.
  const [quality, setQuality] = useState<QualityTier>(LOW_POWER ? 2 : 0)
  const tip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = frame.current
    if (!element || noObserver || STAGE_OFF) return

    // One observer decides when to load (early), the other when to draw (only while visible).
    const loader = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          loader.disconnect()
        }
      },
      { rootMargin: LOAD_MARGIN },
    )
    const viewer = new IntersectionObserver((entries) => {
      setVisible(entries[entries.length - 1].isIntersecting)
    })

    loader.observe(element)
    viewer.observe(element)
    return () => {
      loader.disconnect()
      viewer.disconnect()
    }
  }, [noObserver])

  // Scroll entrance: while the stage scrolls up into view, its progress (0 to 1) follows the scroll
  // position in both directions. No pinning, and the page keeps scrolling normally.
  useEffect(() => {
    const element = frame.current
    if (!element || STAGE_OFF) return
    if (reducedMotion) {
      universeState.entrance = 1
      return
    }

    universeState.entrance = 0
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top bottom',
      end: 'top 40%',
      onRefresh: (self) => {
        universeState.entrance = self.progress
      },
      onUpdate: (self) => {
        universeState.entrance = self.progress
      },
    })

    return () => {
      trigger.kill()
      universeState.entrance = 1
    }
  }, [reducedMotion])

  // The stage waits until the name intro is finished, so the two never compete.
  const mounted = !STAGE_OFF && near && intro === 'done' && benchMode !== 'off'
  const drawing = visible && benchMode !== 'paused'

  const stageState = STAGE_OFF
    ? 'off'
    : !mounted
      ? 'not loaded'
      : !drawing
        ? 'paused'
        : reducedMotion
          ? 'still'
          : quality === 2
            ? LOW_POWER
              ? 'calm (forced)'
              : 'calm (auto)'
            : quality === 1
              ? 'drawing (low res)'
              : 'drawing'

  // The tooltip follows the mouse. It is moved directly, so moving the mouse never re-renders anything.
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const element = frame.current
    const tooltip = tip.current
    if (!element || !tooltip || event.pointerType === 'touch') return
    const rect = element.getBoundingClientRect()
    const x = Math.min(event.clientX - rect.left + 14, rect.width - tooltip.offsetWidth - 8)
    const y = Math.min(event.clientY - rect.top + 18, rect.height - tooltip.offsetHeight - 8)
    tooltip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`
  }

  return (
    <>
      {(PERF_ENABLED || BENCH_ENABLED) && <PerfReadout state={stageState} />}
      {BENCH_ENABLED && <BenchPanel stageVisible={visible} onMode={setBenchMode} />}
      <div
        ref={frame}
        className={`universe__frame${hovered !== null ? ' is-hover' : ''}`}
        onPointerMove={onPointerMove}
      >
        {STAGE_OFF ? (
          <Message>3D stage switched off (?stage=off)</Message>
        ) : mounted ? (
          <StageErrorBoundary
            fallback={<Message>3D view unavailable. The project list shows everything.</Message>}
          >
            <Suspense fallback={null}>
              <UniverseCanvas
                identities={identities}
                selected={selected}
                active={drawing}
                reducedMotion={reducedMotion}
                onSelect={onSelect}
                onOverview={onOverview}
                onHover={setHovered}
                onQuality={setQuality}
              />
            </Suspense>
          </StageErrorBoundary>
        ) : null}
        {notice && <div className="universe__notice">{notice}</div>}
        <div ref={tip} className="universe__tip" hidden={hovered === null}>
          {hovered === null
            ? ''
            : hovered === selected
              ? liveUrls[hovered]
                ? `${titles[hovered]} · open live site ↗`
                : `${titles[hovered]} · live version coming soon`
              : titles[hovered]}
        </div>
      </div>
    </>
  )
}