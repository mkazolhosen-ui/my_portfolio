/** Maximum up/down tilt from dragging, in radians (about 69 degrees). */
export const MAX_PITCH = 1.2

/**
 * Shared drag state. CoreDragControls writes it from mouse events;
 * CyberCore reads it every frame and adds it to the core's rotation.
 */
export const dragState = {
  /** Extra left/right rotation from dragging, in radians. */
  yaw: 0,
  /** Extra up/down rotation from dragging, in radians. */
  pitch: 0,
  /** Coasting speed after release, in radians per second. */
  velYaw: 0,
  velPitch: 0,
  dragging: false,
}