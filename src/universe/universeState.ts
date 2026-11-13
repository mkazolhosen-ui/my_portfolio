/**
 * Shared between the page's scroll trigger and the 3D scene (the same pattern as scrollState.ts).
 * The scroll trigger writes it, and the scene reads it every frame, so scrolling never re-renders React.
 */
export const universeState = {
  /**
   * How far the stage has entered the screen: 0 while it is still below the visible area,
   * 1 once it is comfortably in view. It follows the scroll position in both directions.
   * It starts at 1 (fully in place), so the stage is correct even if no scroll trigger runs.
   */
  entrance: 1,
}

/**
 * How much the stage is currently holding back to keep the page smooth:
 * 0 = full quality, 1 = lower pixel ratio, 2 = calm (no idle motion, draws only when something changes).
 */
export type QualityTier = 0 | 1 | 2