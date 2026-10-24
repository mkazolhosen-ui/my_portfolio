import { useCallback, type PointerEvent } from 'react'
import usePrefersReducedMotion from './usePrefersReducedMotion'

/** Maximum tilt in degrees. */
const MAX_TILT = 7

/**
 * Pointer handlers that write CSS variables (--mx, --my, --rx, --ry) onto a card.
 * The CSS decides what to do with them. Only mouse input is used, never touch.
 */
export default function useCardTilt() {
  const reduced = usePrefersReducedMotion()

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height

      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)

      if (!reduced) {
        el.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${(-(py - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`)
      }
    },
    [reduced],
  )

  const onPointerLeave = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }, [])

  return { onPointerMove, onPointerLeave }
}