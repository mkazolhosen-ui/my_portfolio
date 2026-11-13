/** What a click or tap on a project node in the 3D stage should do. */
export type StageClickAction = 'select' | 'open' | 'notice' | 'ignore'

/**
 * A second click sooner than this after a project was selected is treated as part of a double-click
 * (the visitor clicking twice quickly), never as a decision to leave the page.
 */
const OPEN_DELAY_MS = 600
/** After a live site has been opened, further clicks are ignored for this long, so tabs never double up. */
const OPEN_COOLDOWN_MS = 1500

interface StageClickInput {
  /** The currently selected project, or null. */
  selected: number | null
  /** The project that was clicked. */
  index: number
  /** That project's live address, already checked as safe, or "" when it has none. */
  liveUrl: string
  /** Times in milliseconds from performance.now(). */
  now: number
  /** When the current selection was made. */
  selectedAt: number
  /** When a live site was last opened. */
  openedAt: number
}

/**
 * - 'select': choose this project (first click, or clicking a different project).
 * - 'open': open the selected project's live site in a new tab.
 * - 'notice': the selected project has no live site yet, so say so and do nothing else.
 * - 'ignore': too soon after the last action, so do nothing.
 */
export function decideStageClick(input: StageClickInput): StageClickAction {
  if (input.selected !== input.index) return 'select'
  if (input.now - input.selectedAt < OPEN_DELAY_MS) return 'ignore'
  if (input.now - input.openedAt < OPEN_COOLDOWN_MS) return 'ignore'
  return input.liveUrl ? 'open' : 'notice'
}