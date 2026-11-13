export type Vec3 = [number, number, number]

/**
 * Half the width of the whole arrangement in world units, including a node's radius.
 * The canvas scales the scene down to keep this inside narrow frames.
 */
export const LAYOUT_HALF_WIDTH = 3.7

const RADIUS_X = 3.0
const RADIUS_Y = 1.55
/** How far nodes sit in front of or behind the hub, for depth. */
const DEPTH = 0.6
/** Spreads the depth values evenly, with no visible pattern. */
const GOLDEN_ANGLE = 2.399963
/** Where the first node sits on the ellipse (radians). */
const START_ANGLE = Math.PI * 0.85
/** Above this many projects, every second node moves to a smaller inner ring. */
const SINGLE_RING_MAX = 6
const INNER_RING = 0.62

/**
 * Positions for `count` project nodes around a hub at the origin.
 * The order follows the project list, and the result only depends on `count`.
 */
export function getNodePositions(count: number): Vec3[] {
  if (count <= 0) return []
  if (count === 1) return [[2.2, 0.5, 0.3]]

  return Array.from({ length: count }, (_, i): Vec3 => {
    const angle = START_ANGLE + (i / count) * Math.PI * 2
    const ring = count > SINGLE_RING_MAX && i % 2 === 1 ? INNER_RING : 1
    return [
      Math.cos(angle) * RADIUS_X * ring,
      Math.sin(angle) * RADIUS_Y * ring,
      Math.sin(i * GOLDEN_ANGLE) * DEPTH,
    ]
  })
}
