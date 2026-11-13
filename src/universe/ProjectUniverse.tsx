import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Project } from '../config/site'
import ProjectDetail from './ProjectDetail'
import { getProjectIdentities } from './projectIdentity'
import { decideStageClick } from './stageClick'
import UniverseStage from './UniverseStage'
import useUniverseCapable from './useUniverseCapable'

/** The address if it is a proper http(s) link, otherwise "" (so it can never open anything unsafe). */
function safeHttpUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

/** How long the small "live version coming soon" message stays on screen. */
const NOTICE_MS = 3000

interface ProjectUniverseProps {
  /** The same published projects the cards use. No second data source. */
  projects: Project[]
  /** The id of the card list below, so the "skip" link can jump to it. */
  listId: string
}

/**
 * The project explorer: a 3D stage on the left (decorative) and the selector + detail panel
 * on the right (the real, accessible content). Selecting a project updates both.
 * Renders nothing on phones, without WebGL, or when there are no projects.
 */
export default function ProjectUniverse({ projects, listId }: ProjectUniverseProps) {
  const capable = useUniverseCapable()
  const [selected, setSelected] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const [touched, setTouched] = useState(false)
  const [notice, setNotice] = useState('')
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  // Click bookkeeping for the 3D stage (see stageClick.ts): when the selection was made, and when a live site was last opened.
  const selectedAt = useRef(0)
  const openedAt = useRef(-10000)
  const noticeTimer = useRef<number | undefined>(undefined)
  // Each project's 3D look, from its stable key. It does not depend on the list order.
  const identities = useMemo(() => getProjectIdentities(projects), [projects])
  const titles = useMemo(() => projects.map((project) => project.title), [projects])
  // Checked once here, so the click, the tooltip and the "coming soon" message all agree.
  const liveUrls = useMemo(() => projects.map((project) => safeHttpUrl(project.liveUrl)), [projects])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const total = projects.length
  if (!capable || total === 0) return null

  // Stay safe if the list ever gets shorter than the stored numbers.
  const active = selected !== null && selected < total ? selected : null
  const tabStop = Math.min(focusIndex, total - 1)

  function select(index: number) {
    selectedAt.current = performance.now()
    setSelected(index)
    setFocusIndex(index)
    setTouched(true)
  }

  function showNotice(message: string) {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), NOTICE_MS)
  }

  function showOverview(moveFocus = true) {
    const previous = active
    setSelected(null)
    setTouched(true)
    // Put the keyboard focus back on the project that was open (not for clicks in the 3D stage).
    if (moveFocus && previous !== null) buttons.current[previous]?.focus()
  }

  // Clicks in the 3D stage. The rules live in stageClick.ts:
  //  - a first click, or a click on a different project, selects it (like the list does);
  //  - clicking the selected project again opens its live version in a new tab;
  //  - if it has no live version, nothing opens and a small message says so;
  //  - a too-quick second click (a double-click) or a repeat right after opening is ignored.
  function onStageSelect(index: number) {
    const now = performance.now()
    const action = decideStageClick({
      selected: active,
      index,
      liveUrl: liveUrls[index],
      now,
      selectedAt: selectedAt.current,
      openedAt: openedAt.current,
    })
    if (action === 'select') {
      select(index)
    } else if (action === 'open') {
      openedAt.current = now
      window.open(liveUrls[index], '_blank', 'noopener,noreferrer')
    } else if (action === 'notice') {
      showNotice('Live version coming soon')
    }
  }

  function onStageOverview() {
    if (active !== null) showOverview(false)
  }

  function step(delta: number) {
    if (active !== null) select((active + delta + total) % total)
  }

  function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    let next: number
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (tabStop + 1) % total
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (tabStop - 1 + total) % total
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = total - 1
        break
      default:
        return
    }
    e.preventDefault()
    setFocusIndex(next)
    buttons.current[next]?.focus()
  }

  function onRegionKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && active !== null) {
      e.preventDefault()
      showOverview()
    }
  }

  // Read out by screen readers. The small "coming soon" message is announced too.
  const announcement = notice
    ? active !== null
      ? `${projects[active].title}: ${notice}`
      : notice
    : active !== null
      ? `Showing project ${active + 1} of ${total}: ${projects[active].title}`
      : touched
        ? 'Overview. No project selected.'
        : ''

  return (
    <div
      className="universe"
      role="region"
      aria-label="Interactive project explorer"
      onKeyDown={onRegionKeyDown}
    >
      <a className="universe__skip" href={`#${listId}`}>
        Skip to the full project list
      </a>

      {/* The 3D stage. Decorative, so hidden from assistive tech: the panel has all the content. */}
      <div className="universe__stage" aria-hidden="true">
        <div className="universe__grid" />
        <UniverseStage
          identities={identities}
          selected={active}
          titles={titles}
          liveUrls={liveUrls}
          notice={notice}
          onSelect={onStageSelect}
          onOverview={onStageOverview}
        />
      </div>

      <div className="universe__panel">
        <ul className="universe__list" role="list" aria-label="Projects" onKeyDown={onListKeyDown}>
          {projects.map((project, i) => (
            <li key={`${i}-${project.title}`}>
              <button
                type="button"
                ref={(el) => {
                  buttons.current[i] = el
                }}
                className="universe__item"
                aria-pressed={active === i}
                tabIndex={i === tabStop ? 0 : -1}
                onFocus={() => setFocusIndex(i)}
                onClick={() => (active === i ? showOverview() : select(i))}
              >
                <span className="universe__item-index" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="universe__item-title">{project.title}</span>
                {project.kind && <span className="universe__item-kind">{project.kind}</span>}
              </button>
            </li>
          ))}
        </ul>

        {active === null ? (
          <div className="universe__detail">
            <div className="universe__detail-body">
              <p className="universe__hint">Choose a project to see its details.</p>
            </div>
          </div>
        ) : (
          <ProjectDetail
            project={projects[active]}
            index={active}
            total={total}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            onBack={() => showOverview()}
          />
        )}
      </div>

      <p className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  )
}