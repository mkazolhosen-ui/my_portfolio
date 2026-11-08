import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useSiteContent } from '../content/contentContext'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import { getKnowledgeFacts } from '../knowledge/knowledgeStore'
import { COMMAND_MAP, COMMAND_NAMES, unknownCommand } from './commands'
import { completeCommand } from './complete'
import EntryView from './EntryView'
import { MAX_INPUT_LENGTH, parseInput } from './parseInput'
import { profile } from './profileData'
import type { CommandContext, Entry, OutputBlock } from './types'

/** Scrollback: the newest entries stay on screen, older ones drop off. */
const MAX_ENTRIES = 200
/** Commands remembered for the up and down arrows. */
const MAX_HISTORY = 50
/** Time between boot lines. Three lines plus the prompt take under a second. */
const BOOT_STEP_MS = 280

// Every boot line is a true statement: the session is simulated and the data is public.
const BOOT_LINES: OutputBlock[] = [
  { kind: 'text', tone: 'muted', text: 'Initialising simulated session...' },
  { kind: 'text', tone: 'muted', text: 'Public portfolio data only.' },
  { kind: 'text', tone: 'accent', text: 'SIGNAL // UPLINK established.' },
]
const START_HINT: OutputBlock = { kind: 'commands', lead: 'Start with:', names: ['help'] }

/** waiting: not on screen yet. booting: lines are appearing. ready: the prompt is live. */
type Phase = 'waiting' | 'booting' | 'ready'

export default function Terminal() {
  const { content } = useSiteContent()
  // Everything the commands may read: the same published content the page shows,
  // the same knowledge library the 3D core uses, and the small local profile file.
  const context = useMemo<CommandContext>(
    () => ({ content, facts: getKnowledgeFacts(), profile }),
    [content],
  )

  const reduced = usePrefersReducedMotion()
  // No boot animation for reduced motion, or where the browser cannot tell when the panel is visible.
  const [phase, setPhase] = useState<Phase>(() =>
    reduced || typeof IntersectionObserver === 'undefined' ? 'ready' : 'waiting',
  )
  const [entries, setEntries] = useState<Entry[]>(() =>
    phase === 'ready' ? [{ id: 0, input: null, blocks: [...BOOT_LINES, START_HINT] }] : [],
  )
  const [value, setValue] = useState('')

  const screenRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  // Earlier commands (oldest first). Kept in memory only, never stored. "clear" does not erase it.
  const history = useRef<string[]>([])
  // Which history item is shown while pressing up/down. -1 means "not browsing".
  const historyPos = useRef(-1)
  // What was being typed before the visitor started browsing history.
  const draft = useRef('')
  // Boot bookkeeping: how many lines are already printed, and whether the boot was skipped.
  const bootIndex = useRef(0)
  const bootSkipped = useRef(false)
  // The text for which Tab already found several matches (a second Tab then lists them).
  const tabValue = useRef('')

  // Scroll the screen itself (never the page) so the newest output and the prompt stay in view.
  const scrollToEnd = useCallback(() => {
    const screen = screenRef.current
    if (screen) screen.scrollTop = screen.scrollHeight
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [entries, scrollToEnd])

  const show = useCallback((input: string | null, blocks: OutputBlock[]) => {
    const id = nextId.current++
    setEntries((previous) => [...previous, { id, input, blocks }].slice(-MAX_ENTRIES))
  }, [])

  /* ---------- Boot sequence ---------- */

  // Wait until at least 40% of the screen is visible, then start the boot (once).
  useEffect(() => {
    if (phase !== 'waiting') return
    const screen = screenRef.current
    if (!screen) return

    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setPhase('booting')
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(screen)
    return () => observer.disconnect()
  }, [phase])

  // Print the boot lines one by one, then the hint, then hand over to the prompt.
  useEffect(() => {
    if (phase !== 'booting') return

    const timers: number[] = []
    BOOT_LINES.forEach((block, index) => {
      timers.push(
        window.setTimeout(() => {
          if (bootSkipped.current) return
          bootIndex.current = index + 1
          show(null, [block])
        }, index * BOOT_STEP_MS),
      )
    })
    timers.push(
      window.setTimeout(() => {
        if (bootSkipped.current) return
        show(null, [START_HINT])
        setPhase('ready')
      }, BOOT_LINES.length * BOOT_STEP_MS),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [phase, show])

  // Jump straight to the finished state: print whatever is still missing.
  const skipBoot = useCallback(() => {
    bootSkipped.current = true
    const rest = [...BOOT_LINES.slice(bootIndex.current), START_HINT]
    bootIndex.current = BOOT_LINES.length
    show(null, rest)
    setPhase('ready')
  }, [show])

  // While the boot plays, Esc or Enter skips it. The listener exists only during those few moments.
  useEffect(() => {
    if (phase !== 'booting') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') skipBoot()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, skipBoot])

  /* ---------- Running commands ---------- */

  const run = useCallback(
    (raw: string) => {
      const shown = raw.trim().slice(0, MAX_INPUT_LENGTH)
      const parsed = parseInput(raw)

      if (!parsed) {
        // A bare Enter just starts a new prompt line, like a real terminal.
        show(shown, [])
        return
      }

      const past = history.current
      if (past[past.length - 1] !== shown) {
        past.push(shown)
        if (past.length > MAX_HISTORY) past.shift()
      }
      historyPos.current = -1

      const command = COMMAND_MAP.get(parsed.name)
      if (!command) {
        show(shown, unknownCommand(parsed.name))
        return
      }

      const result = command.run(parsed.args, context)
      if (result.clear) {
        setEntries([])
        return
      }
      show(shown, result.blocks)
    },
    [show, context],
  )

  // Clicking a command name runs it. On a mouse, the prompt gets focus back so typing can continue;
  // on a touch screen it does not, so the keyboard does not pop up by surprise.
  const runFromClick = useCallback(
    (command: string) => {
      run(command)
      if (window.matchMedia('(pointer: fine)').matches) {
        inputRef.current?.focus({ preventScroll: true })
      }
    },
    [run],
  )

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    run(value)
    setValue('')
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    // Do not react while a phone keyboard is still composing a word.
    if (event.nativeEvent.isComposing) return

    // Ctrl+L clears the screen, as in a Linux terminal.
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      setEntries([])
      return
    }

    // The arrow keys belong to command history, so Page Up/Down scroll the screen instead.
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const screen = screenRef.current
      if (screen) {
        const direction = event.key === 'PageUp' ? -1 : 1
        screen.scrollBy({ top: direction * screen.clientHeight * 0.85 })
      }
      return
    }

    // Tab completes a half-typed command name. In every other case Tab keeps its normal job
    // (moving focus), so the keyboard is never trapped.
    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (/\s/.test(value)) return
      const result = completeCommand(value, COMMAND_NAMES)
      if (result.kind === 'none') return

      event.preventDefault()
      historyPos.current = -1

      if (result.kind === 'single') {
        setValue(`${result.name} `)
        tabValue.current = ''
        return
      }

      const typed = value.replace(/^\/+/, '')
      if (result.common.length > typed.length) {
        setValue(result.common)
        tabValue.current = ''
        return
      }

      // Several matches and no further progress: the second Tab lists them, like bash.
      if (tabValue.current === value) {
        show(value, [{ kind: 'commands', names: result.matches }])
        tabValue.current = ''
      } else {
        tabValue.current = value
      }
      return
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    const past = history.current
    if (past.length === 0) return
    event.preventDefault()

    if (event.key === 'ArrowUp') {
      if (historyPos.current === -1) {
        draft.current = value
        historyPos.current = past.length - 1
      } else if (historyPos.current > 0) {
        historyPos.current -= 1
      }
      setValue(past[historyPos.current])
    } else if (historyPos.current !== -1) {
      if (historyPos.current < past.length - 1) {
        historyPos.current += 1
        setValue(past[historyPos.current])
      } else {
        historyPos.current = -1
        setValue(draft.current)
      }
    }
  }

  // Clicking empty space on the screen focuses the prompt, unless the visitor is selecting text.
  function onScreenClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target
    if (target instanceof Element && target.closest('a, button, input')) return
    if (window.getSelection()?.toString()) return
    inputRef.current?.focus({ preventScroll: true })
  }

  // A click or tap anywhere on the screen skips the boot.
  function onScreenPointerDown() {
    if (phase === 'booting') skipBoot()
  }

  return (
    <div className="signal__console">
      <div
        ref={screenRef}
        className="signal__screen"
        onClick={onScreenClick}
        onPointerDown={onScreenPointerDown}
      >
        <div className="signal__transcript" role="log" aria-label="Terminal output">
          {entries.map((entry) => (
            <EntryView key={entry.id} entry={entry} onRun={runFromClick} />
          ))}
        </div>

        {phase === 'booting' && (
          <p className="signal__skip" aria-hidden="true">
            Tap or press Esc to skip
          </p>
        )}

        {phase === 'ready' && (
          // A real form, so Enter and the phone keyboard's "go" key both submit reliably.
          <form className="signal__promptrow" autoComplete="off" onSubmit={onSubmit}>
            <span className="signal__prompt" aria-hidden="true">
              <span className="signal__host">visitor@cyber-reality:~</span>$
            </span>
            <span className="signal__inputwrap">
              <input
                ref={inputRef}
                className="signal__input"
                type="text"
                value={value}
                maxLength={MAX_INPUT_LENGTH}
                placeholder=" "
                aria-label="Terminal command input"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                onChange={(event) => {
                  setValue(event.target.value)
                  historyPos.current = -1
                  tabValue.current = ''
                }}
                onKeyDown={onKeyDown}
                onFocus={scrollToEnd}
              />
              {/* A block cursor shown while the prompt is idle and not focused. */}
              <span className="signal__idle" aria-hidden="true" />
            </span>
          </form>
        )}
      </div>
    </div>
  )
}