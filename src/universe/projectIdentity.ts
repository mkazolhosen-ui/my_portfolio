import type { Project } from '../config/site'

/*
 * A project's 3D look comes from its own stable key, never from its position in the list.
 * Reordering, publishing or unpublishing other projects therefore never changes it.
 *
 * This file must not import Three.js: it lives in the main bundle, and the 3D code is loaded later.
 */

/** How many different shapes exist. Must match the shape list in projectShapes.ts. */
export const SHAPE_COUNT = 14
/**
 * When true, projects that would end up with the same shape are given different ones
 * (as long as there are enough shapes). See getProjectIdentities below for how this stays stable.
 */
const AVOID_SHAPE_REPEATS = true
/** How many colour tints exist (all within the cyan and ice palette). */
export const TINT_COUNT = 3

export interface ProjectIdentity {
  /** The stable text this identity was built from. */
  key: string
  /** Which silhouette to use (0 to SHAPE_COUNT - 1). */
  shape: number
  /** Which tint to use (0 to TINT_COUNT - 1). */
  tint: number
  /** Number of thin orbit rings around the project (0, 1 or 2). */
  rings: 0 | 1 | 2
  /** Starting orientation, in radians. */
  tiltX: number
  tiltY: number
  /** Slow spin, in radians per second. Can be negative (spins the other way). */
  spin: number
}

/** FNV-1a: turns any text into the same 32-bit number every time. */
function hashText(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32: a small repeatable sequence of numbers between 0 and 1, from a seed. */
function sequence(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The text a project's look is built from: its database id when it has one,
 * otherwise its title (only the built-in fallback projects have no id).
 */
export function projectKey(project: Project): string {
  return project.id ? `id:${project.id}` : `title:${project.title.trim().toLowerCase()}`
}

/** One project's look on its own: its preferred shape, tint, rings, tilt and spin. */
export function getProjectIdentity(project: Project): ProjectIdentity {
  const key = projectKey(project)
  // Each property takes its own value from the sequence, so two projects that share a shape
  // still tend to differ in tint, rings, tilt and spin.
  const next = sequence(hashText(key))

  const shape = Math.floor(next() * SHAPE_COUNT)
  const tint = Math.floor(next() * TINT_COUNT)
  const rings = Math.floor(next() * 3) as 0 | 1 | 2
  const tiltX = next() * Math.PI
  const tiltY = next() * Math.PI
  const spin = (0.15 + next() * 0.3) * (next() < 0.5 ? -1 : 1)

  return { key, shape, tint, rings, tiltX, tiltY, spin }
}

/**
 * The look of every project in the list, in list order.
 *
 * Each project has a preferred shape from its own key. If two projects prefer the same shape, the
 * one with the lower priority moves to the next free shape. Priority comes from the projects' keys,
 * never from their position in the list, so:
 *  - reordering the list never changes anyone's look;
 *  - a project's look only depends on projects with a higher priority than its own, so adding or
 *    removing a project can only change the look of projects that collided with it.
 */
export function getProjectIdentities(projects: Project[]): ProjectIdentity[] {
  const preferred = projects.map(getProjectIdentity)
  if (!AVOID_SHAPE_REPEATS) return preferred

  const order = preferred
    .map((_, index) => index)
    .sort((a, b) => {
      const byHash = hashText(preferred[a].key) - hashText(preferred[b].key)
      if (byHash !== 0) return byHash
      if (preferred[a].key !== preferred[b].key) return preferred[a].key < preferred[b].key ? -1 : 1
      return a - b
    })

  const result = preferred.slice()
  const taken = new Set<number>()
  for (const index of order) {
    // With more projects than shapes, repeats are unavoidable: start a fresh round.
    if (taken.size >= SHAPE_COUNT) taken.clear()
    let shape = preferred[index].shape
    while (taken.has(shape)) shape = (shape + 1) % SHAPE_COUNT
    taken.add(shape)
    result[index] = { ...preferred[index], shape }
  }
  return result
}