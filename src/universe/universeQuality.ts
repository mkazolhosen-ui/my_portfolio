import type { QualityTier } from './universeState'

/** Frames are judged in windows this long (seconds). */
const WINDOW_SECONDS = 1.5
/** A window counts as slow when its typical (median) frame takes longer than this: about 36 fps. */
const SLOW_FRAME_SECONDS = 0.028
/** This many slow windows in a row are needed before quality drops, so a brief stutter changes nothing. */
const SLOW_WINDOWS_NEEDED = 2
/** After starting, and after every change, the scene is given this long to settle before judging again. */
const SETTLE_SECONDS = 3

/**
 * Watches how long the stage's frames take and decides when to lower its quality:
 *   tier 0: full quality
 *   tier 1: lower pixel ratio (skipped on screens that already render at 1)
 *   tier 2: calm: no idle motion, and the stage only draws when something changes
 * It only ever steps down, so quality never flips back and forth. A reload starts fresh.
 *
 * Kept free of Three.js and React so it can be tested on its own.
 */
export function createQualityGovernor(startTier: QualityTier) {
  let tier: QualityTier = startTier
  let startedAt = -1
  let windowStart = 0
  let samples: number[] = []
  let slowWindows = 0

  function restart(now: number) {
    startedAt = now
    windowStart = now
    samples = []
    slowWindows = 0
  }

  return {
    /**
     * Call once for every frame the stage draws.
     * `now` and `delta` are in seconds. Returns the new tier when quality should drop, otherwise null.
     */
    update(now: number, delta: number, canLowerPixelRatio: boolean): QualityTier | null {
      if (tier >= 2) return null
      if (startedAt < 0) startedAt = now

      // A long gap means the stage was paused or the tab was hidden. Nothing to learn: settle again.
      if (delta > 1) {
        restart(now)
        return null
      }
      if (now - startedAt < SETTLE_SECONDS) {
        windowStart = now
        return null
      }

      samples.push(delta)
      if (now - windowStart < WINDOW_SECONDS) return null

      samples.sort((a, b) => a - b)
      const median = samples[Math.floor(samples.length / 2)]
      samples = []
      windowStart = now
      slowWindows = median > SLOW_FRAME_SECONDS ? slowWindows + 1 : 0
      if (slowWindows < SLOW_WINDOWS_NEEDED) return null

      tier = tier === 0 && canLowerPixelRatio ? 1 : 2
      restart(now)
      return tier
    },
  }
}