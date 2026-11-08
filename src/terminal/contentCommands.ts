import type { Project, SkillGroup } from '../config/site'
import { findMatches } from './lookup'
import { safeHref } from './safeHref'
import type { Command, OutputBlock } from './types'

const EMPTY: OutputBlock = {
  kind: 'text',
  tone: 'muted',
  text: 'Nothing is published here yet.',
}

/** Shortens text echoed back to the visitor so a long input cannot flood the screen. */
function shorten(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`

/** Clickable lines such as "2. Project name". The number is the item's position in the full list. */
function numberedChoices<T>(
  command: string,
  all: readonly T[],
  subset: readonly T[],
  label: (item: T) => string,
  note: (item: T) => string,
): OutputBlock {
  return {
    kind: 'choices',
    items: subset.map((item) => {
      const number = all.indexOf(item) + 1
      return { command: `${command} ${number}`, prefix: `${number}.`, label: label(item), note: note(item) }
    }),
  }
}

/* ---------- whoami / about ---------- */

const whoami: Command = {
  name: 'whoami',
  summary: 'Show who I am',
  usage: 'whoami',
  run: (_args, { content }) => {
    const blocks: OutputBlock[] = [{ kind: 'text', tone: 'accent', text: content.name }]
    if (content.intro) blocks.push({ kind: 'text', text: content.intro })
    if (content.tagline) blocks.push({ kind: 'text', tone: 'muted', text: content.tagline })
    return { blocks }
  },
}

const about: Command = {
  name: 'about',
  summary: 'My background and focus areas',
  usage: 'about',
  run: (_args, { content }) => {
    const { paragraphs, focus } = content.about
    if (paragraphs.length === 0 && focus.length === 0) return { blocks: [EMPTY] }

    const blocks: OutputBlock[] = paragraphs.map(
      (text, index): OutputBlock => ({ kind: 'text', text, spaced: index > 0 }),
    )
    if (focus.length > 0) {
      blocks.push({ kind: 'text', tone: 'accent', spaced: true, text: 'Focus areas:' })
      blocks.push({ kind: 'list', items: focus })
    }
    return { blocks }
  },
}

/* ---------- projects ---------- */

function projectBlocks(project: Project): OutputBlock[] {
  const blocks: OutputBlock[] = [{ kind: 'text', tone: 'accent', text: project.title }]
  if (project.kind) blocks.push({ kind: 'text', tone: 'muted', text: project.kind })
  if (project.description) blocks.push({ kind: 'text', spaced: true, text: project.description })
  if (project.tags.length > 0) {
    blocks.push({ kind: 'text', tone: 'muted', text: `Tags: ${project.tags.join(', ')}` })
  }

  const links: { label: string; href: string }[] = []
  const live = safeHref(project.liveUrl)
  if (live) links.push({ label: 'Live demo', href: live })
  const repo = safeHref(project.repoUrl)
  if (repo) links.push({ label: 'Source', href: repo })

  blocks.push(
    links.length > 0
      ? { kind: 'links', items: links }
      : { kind: 'text', tone: 'muted', text: 'No public links yet.' },
  )
  return blocks
}

const projects: Command = {
  name: 'projects',
  summary: 'List my projects, or show one',
  usage: 'projects [number|name]',
  example: 'projects 1',
  run: (args, { content }) => {
    const all = content.projects
    if (all.length === 0) return { blocks: [EMPTY] }

    const query = args.join(' ')
    const label = (project: Project) => project.title
    const note = (project: Project) => project.kind

    if (!query) {
      return {
        blocks: [
          { kind: 'text', text: `Found ${plural(all.length, 'project')}.` },
          numberedChoices('projects', all, all, label, note),
          { kind: 'text', tone: 'muted', text: 'Run "projects <number>" for details.' },
        ],
      }
    }

    const matches = findMatches(all, query, (project) => project.title)
    if (matches.length === 1) return { blocks: projectBlocks(matches[0]) }
    if (matches.length > 1) {
      return {
        blocks: [
          { kind: 'text', text: `${plural(matches.length, 'project')} match "${shorten(query)}":` },
          numberedChoices('projects', all, matches, label, note),
        ],
      }
    }
    return {
      blocks: [
        { kind: 'error', text: `projects: no project matches "${shorten(query)}"` },
        { kind: 'text', tone: 'muted', text: 'Run "projects" to list them.' },
      ],
    }
  },
}

/* ---------- skills ---------- */

function skillBlocks(group: SkillGroup, spaced: boolean): OutputBlock[] {
  const blocks: OutputBlock[] = [{ kind: 'text', tone: 'accent', spaced, text: group.title }]
  if (group.description) blocks.push({ kind: 'text', tone: 'muted', text: group.description })
  if (group.items.length > 0) blocks.push({ kind: 'list', items: group.items })
  return blocks
}

const skills: Command = {
  name: 'skills',
  summary: 'Show my skills, all groups or one',
  usage: 'skills [number|name]',
  example: 'skills 1',
  run: (args, { content }) => {
    const groups = content.skills
    if (groups.length === 0) return { blocks: [EMPTY] }

    const query = args.join(' ')
    if (!query) {
      const blocks: OutputBlock[] = []
      groups.forEach((group, index) => blocks.push(...skillBlocks(group, index > 0)))
      blocks.push({
        kind: 'text',
        tone: 'muted',
        spaced: true,
        text: 'Run "skills <number|name>" to show a single group.',
      })
      return { blocks }
    }

    const matches = findMatches(groups, query, (group) => group.title)
    if (matches.length === 1) return { blocks: skillBlocks(matches[0], false) }
    if (matches.length > 1) {
      return {
        blocks: [
          { kind: 'text', text: `${plural(matches.length, 'group')} match "${shorten(query)}":` },
          numberedChoices('skills', groups, matches, (group) => group.title, (group) => group.description),
        ],
      }
    }
    return {
      blocks: [
        { kind: 'error', text: `skills: no group matches "${shorten(query)}"` },
        { kind: 'text', tone: 'muted', text: 'Run "skills" to list them.' },
      ],
    }
  },
}

/* ---------- knowledge ---------- */

const knowledge: Command = {
  name: 'knowledge',
  summary: 'Browse the knowledge library by topic',
  usage: 'knowledge [topic]',
  example: 'knowledge cryptography',
  run: (args, { facts }) => {
    if (facts.length === 0) return { blocks: [EMPTY] }

    // Count the facts in each topic, keeping the order they first appear in.
    const counts = new Map<string, number>()
    for (const fact of facts) counts.set(fact.category, (counts.get(fact.category) ?? 0) + 1)
    const topics = [...counts]

    const topicChoices = (list: typeof topics): OutputBlock => ({
      kind: 'choices',
      items: list.map(([name, count]) => ({
        command: `knowledge ${name.toLowerCase()}`,
        label: name,
        note: plural(count, 'fact'),
      })),
    })

    const query = args.join(' ')
    if (!query) {
      return {
        blocks: [
          {
            kind: 'text',
            text: `Knowledge library: ${plural(facts.length, 'fact')} in ${plural(topics.length, 'topic')}.`,
          },
          {
            kind: 'text',
            tone: 'muted',
            text: 'Short facts from the CYBER // REALITY core, grouped by topic.',
          },
          topicChoices(topics),
          { kind: 'text', tone: 'muted', text: 'Run "knowledge <topic>" to read one.' },
        ],
      }
    }

    const matches = findMatches(topics, query, ([name]) => name)
    if (matches.length === 1) {
      const [name] = matches[0]
      return {
        blocks: [
          { kind: 'text', tone: 'accent', text: name },
          {
            kind: 'list',
            items: facts.filter((fact) => fact.category === name).map((fact) => fact.text),
          },
        ],
      }
    }
    if (matches.length > 1) {
      return {
        blocks: [
          { kind: 'text', text: `${plural(matches.length, 'topic')} match "${shorten(query)}":` },
          topicChoices(matches),
        ],
      }
    }
    return {
      blocks: [
        { kind: 'error', text: `knowledge: no topic matches "${shorten(query)}"` },
        { kind: 'text', tone: 'muted', text: 'Run "knowledge" to list the topics.' },
      ],
    }
  },
}

/* ---------- labs / education (from profileData.ts) ---------- */

const labs: Command = {
  name: 'labs',
  summary: 'Cybersecurity labs and learning progress',
  usage: 'labs',
  run: (_args, { profile }) => {
    if (profile.labs.length === 0) {
      return { blocks: [{ kind: 'text', tone: 'muted', text: 'No labs are published yet.' }] }
    }

    const blocks: OutputBlock[] = []
    profile.labs.forEach((lab, index) => {
      blocks.push({ kind: 'text', tone: 'accent', spaced: index > 0, text: lab.title })
      blocks.push({ kind: 'text', tone: 'muted', text: `${lab.source} · ${lab.status}` })
      if (lab.note) blocks.push({ kind: 'text', text: lab.note })
      const href = lab.url ? safeHref(lab.url) : null
      if (href) blocks.push({ kind: 'links', items: [{ label: 'Link', href }] })
    })
    return { blocks }
  },
}

const education: Command = {
  name: 'education',
  summary: 'My educational background',
  usage: 'education',
  run: (_args, { profile }) => {
    if (profile.education.length === 0) {
      return {
        blocks: [{ kind: 'text', tone: 'muted', text: 'No education details are published yet.' }],
      }
    }

    const blocks: OutputBlock[] = []
    profile.education.forEach((entry, index) => {
      blocks.push({ kind: 'text', tone: 'accent', spaced: index > 0, text: entry.institution })
      blocks.push({ kind: 'text', text: entry.program })
      blocks.push({ kind: 'text', tone: 'muted', text: entry.period })
      if (entry.note) blocks.push({ kind: 'text', tone: 'muted', text: entry.note })
    })
    return { blocks }
  },
}

/* ---------- contact ---------- */

/** A readable label for a link: an email without "mailto:", a web address without "https://". */
function displayOf(href: string): string {
  return /^mailto:/i.test(href)
    ? href.replace(/^mailto:/i, '').split('?')[0]
    : href.replace(/^https?:\/\//i, '')
}

const contact: Command = {
  name: 'contact',
  summary: 'How to reach me',
  usage: 'contact',
  run: (_args, { content }) => {
    const links = content.contact.links.flatMap((link) => {
      const href = safeHref(link.href)
      return href ? [{ label: link.label, href, display: link.display || displayOf(href) }] : []
    })

    const blocks: OutputBlock[] = []
    if (content.contact.message) blocks.push({ kind: 'text', text: content.contact.message })
    blocks.push(
      links.length > 0
        ? { kind: 'links', items: links }
        : { kind: 'text', tone: 'muted', text: 'No public contact links are published yet.' },
    )
    return { blocks }
  },
}

/** In the order "help" lists them. */
export const contentCommands: Command[] = [
  whoami,
  about,
  projects,
  skills,
  knowledge,
  labs,
  education,
  contact,
]