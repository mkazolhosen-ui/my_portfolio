import { contentCommands } from './contentCommands'
import { editDistance } from './parseInput'
import type { Command, OutputBlock } from './types'

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full',
  timeStyle: 'short',
})

/** Keeps echoed text short, so a very long input cannot flood the screen. */
const brief = (text: string, max = 60): string =>
  text.length > max ? `${text.slice(0, max)}…` : text

/** Every command the terminal understands, in the order "help" lists them. */
const COMMANDS: Command[] = [
  {
    name: 'help',
    summary: 'List available commands, or describe one',
    usage: 'help [command]',
    example: 'help projects',
    run: (args) => {
      const target = args[0]?.toLowerCase().replace(/^\/+/, '')

      if (!target) {
        return {
          blocks: [
            { kind: 'text', text: 'Available commands:' },
            { kind: 'commands', names: COMMANDS.map((command) => command.name) },
            {
              kind: 'text',
              tone: 'muted',
              spaced: true,
              text: 'Type "help <command>" for details. Use the up and down arrows to revisit earlier commands.',
            },
          ],
        }
      }

      const command = COMMANDS.find((candidate) => candidate.name === target)
      if (!command) {
        return {
          blocks: [
            { kind: 'error', text: `help: no help available for "${brief(target)}"` },
            { kind: 'text', tone: 'muted', text: 'Type "help" to list available commands.' },
          ],
        }
      }

      const blocks: OutputBlock[] = [
        { kind: 'text', tone: 'accent', text: command.name },
        { kind: 'text', text: command.summary },
        { kind: 'text', tone: 'muted', spaced: true, text: `Usage:   ${command.usage}` },
      ]
      if (command.example) {
        blocks.push({ kind: 'text', tone: 'muted', text: `Example: ${command.example}` })
      }
      return { blocks }
    },
  },
  ...contentCommands,
  {
    name: 'clear',
    summary: 'Clear the screen',
    usage: 'clear',
    run: () => ({ blocks: [], clear: true }),
  },
  {
    name: 'date',
    summary: 'Show the current date and time',
    usage: 'date',
    run: () => ({ blocks: [{ kind: 'text', text: dateFormat.format(new Date()) }] }),
  },
]

/**
 * Lookup by name. A Map is used on purpose: unlike a plain object, a visitor typing
 * "constructor" or "__proto__" can never match anything by accident.
 */
export const COMMAND_MAP: ReadonlyMap<string, Command> = new Map(
  COMMANDS.map((command) => [command.name, command]),
)

/** Command names in help order, used for Tab completion. */
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((command) => command.name)

/** The closest command name to what was typed, or null if nothing is close. */
function suggestCommand(name: string): string | null {
  const limit = name.length <= 3 ? 1 : 2
  let best: string | null = null
  let bestScore = Infinity

  for (const command of COMMANDS) {
    const score =
      name.length >= 2 && command.name.startsWith(name)
        ? 0
        : editDistance(name, command.name)
    if (score < bestScore) {
      best = command.name
      bestScore = score
    }
  }

  return bestScore <= limit ? best : null
}

/** The reply for a command that does not exist, in the style of a shell. */
export function unknownCommand(name: string): OutputBlock[] {
  const hint = suggestCommand(name)
  const blocks: OutputBlock[] = [{ kind: 'error', text: `${brief(name)}: command not found` }]
  if (hint) blocks.push({ kind: 'commands', lead: 'Did you mean:', names: [hint] })
  blocks.push({ kind: 'text', tone: 'muted', text: 'Type "help" to list available commands.' })
  return blocks
}
