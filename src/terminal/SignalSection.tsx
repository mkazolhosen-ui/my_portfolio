import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Section from '../components/Section'

// The console is its own chunk. It is only requested when the visitor scrolls near it.
const Terminal = lazy(() => import('./Terminal'))

/** Start loading this far (in pixels) before the panel scrolls into view. */
const LOAD_MARGIN = '600px 0px'

function Standby() {
  return (
    <p className="signal__standby" role="status">
      Initialising console…
    </p>
  )
}

export default function SignalSection() {
  const panelRef = useRef<HTMLDivElement>(null)
  // A browser without IntersectionObserver simply loads the console straight away.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || near) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: LOAD_MARGIN },
    )
    observer.observe(panel)
    return () => observer.disconnect()
  }, [near])

  return (
    <Section id="signal" eyebrow="04 / Signal" title="Talk to the system.">
      <div
        ref={panelRef}
        className="signal__panel"
        role="region"
        aria-label="SIGNAL interactive terminal"
      >
        <div className="signal__grid" aria-hidden="true" />

        <div className="signal__bar">
          <span className="signal__dot" aria-hidden="true" />
          <span className="signal__title">SIGNAL // UPLINK</span>
          <span className="signal__meta">SIMULATED · PUBLIC DATA</span>
        </div>

        <div className="signal__body">
          {near ? (
            <Suspense fallback={<Standby />}>
              <Terminal />
            </Suspense>
          ) : (
            <Standby />
          )}
        </div>
      </div>
    </Section>
  )
}