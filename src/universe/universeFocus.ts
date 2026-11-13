import type { Vec3 } from './universeLayout'

/** How far the selected project is brought toward the camera, in world units. */
export const FOCUS_PUSH = 3
/** Lifts the focused project a touch so it sits in the middle of the view (the camera looks slightly down). */
const FOCUS_LIFT = 0.19
/**
 * How quickly the scene settles on a new focus. Higher is faster.
 * 4.5 reaches about 98% of the move in 0.9 seconds, the same pace as the page's reveal animations,
 * and it can be redirected mid-move without a jump.
 */
export const FOCUS_DAMPING = 4.5

/**
 * Where the whole scene group must sit so that `node` ends up in front of the camera.
 * The group is scaled by `scale` (it shrinks in narrow frames), and `node` is in the group's own units.
 * With a node at the group origin the offset is (0, lift, push): straight toward the camera.
 */
export function getFocusOffset(node: Vec3, scale: number): Vec3 {
  return [-node[0] * scale, -node[1] * scale + FOCUS_LIFT, -node[2] * scale + FOCUS_PUSH]
}