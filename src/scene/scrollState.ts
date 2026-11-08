export interface ScenePose {
  /** Position in world units (camera sits at z = 6.5). */
  x: number
  y: number
  z: number
  scale: number
  /** Extra Y rotation in radians, added to the pointer tilt. */
  spin: number
  /** Opacity of the whole 3D layer, 0 to 1. Keeps text readable. */
  dim: number
}

export const SECTION_POSES: { id: string; pose: ScenePose }[] = [
  { id: 'top', pose: { x: 2.1, y: 0, z: 0, scale: 1, spin: 0, dim: 1 } },
  { id: 'about', pose: { x: 2.7, y: -0.1, z: -0.5, scale: 0.8, spin: 1.1, dim: 0.7 } },
  { id: 'projects', pose: { x: 0, y: 0.2, z: -3, scale: 0.7, spin: 2.2, dim: 0.22 } },
  { id: 'skills', pose: { x: -2.8, y: 0, z: -1, scale: 0.85, spin: 3.4, dim: 0.5 } },
  { id: 'signal', pose: { x: 2.6, y: -0.2, z: -2, scale: 0.8, spin: 4.0, dim: 0.3 } },
  { id: 'contact', pose: { x: 2.4, y: 0.2, z: 0, scale: 1, spin: 4.6, dim: 0.75 } },
]

export function poseToState(p: ScenePose) {
  return { x: p.x, y: p.y, z: p.z, scale: p.scale, spin: p.spin }
}

/**
 * Mutable values that GSAP animates on scroll and the 3D scene reads every frame.
 * (`dim` is handled separately as a CSS variable on the page root.)
 */
export const scrollState = poseToState(SECTION_POSES[0].pose)