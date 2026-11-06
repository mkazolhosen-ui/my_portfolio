import type { KnowledgeDebugInfo } from './knowledgeEngine'

/** True only when the page address contains ?kdebug=1. */
export const KNOWLEDGE_DEBUG =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('kdebug')

function syncPool(pool: HTMLDivElement[], count: number, className: string, host: HTMLElement) {
  while (pool.length < count) {
    const el = document.createElement('div')
    el.className = className
    host.appendChild(el)
    pool.push(el)
  }
  while (pool.length > count) pool.pop()?.remove()
}

function place(el: HTMLDivElement, left: number, top: number, w: number, h: number) {
  el.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
  el.style.width = `${w.toFixed(1)}px`
  el.style.height = `${h.toFixed(1)}px`
}

/**
 * Draws what the knowledge engine protects (red) and where each label is (yellow), plus a small
 * info panel. Returns a function that removes it again.
 */
export function startKnowledgeDebug(read: () => KnowledgeDebugInfo): () => void {
  const layer = document.createElement('div')
  layer.className = 'core-facts-debug'
  const hud = document.createElement('pre')
  hud.className = 'core-facts-debug__hud'
  layer.appendChild(hud)
  document.body.appendChild(layer)

  const keepBoxes: HTMLDivElement[] = []
  const labelBoxes: HTMLDivElement[] = []
  const starts = new Map<number, { x: number; y: number }>()
  let raf = 0
  let lastHud = 0

  const tick = (time: number) => {
    const info = read()

    syncPool(keepBoxes, info.keepOut.length, 'core-facts-debug__keep', layer)
    info.keepOut.forEach((r, i) =>
      place(keepBoxes[i], r.left, r.top, r.right - r.left, r.bottom - r.top),
    )

    const showing = info.slots.filter((s) => s.showing)
    syncPool(labelBoxes, showing.length, 'core-facts-debug__label', layer)
    showing.forEach((s, i) => place(labelBoxes[i], s.px, s.py, s.w, s.h))

    for (const s of info.slots) {
      if (!s.showing) starts.delete(s.index)
      else if (!starts.has(s.index)) starts.set(s.index, { x: s.px, y: s.py })
    }

    if (time - lastHud > 120) {
      lastHud = time
      const lines = [
        `engine ${info.version}   window ${info.vw} x ${info.vh}   scene brightness ${info.dim.toFixed(2)}`,
        `protected areas: ${info.keepOut.length}   labels showing: ${showing.length}`,
      ]
      for (const s of showing) {
        const start = starts.get(s.index)
        const moved = start ? Math.hypot(s.px - start.x, s.py - start.y) : 0
        lines.push(
          `label ${s.index}: at ${s.px.toFixed(0)},${s.py.toFixed(0)}  moved ${moved.toFixed(0)}px  node speed ${s.speed.toFixed(0)}px/s  facing ${s.facing.toFixed(2)}`,
        )
      }
      hud.textContent = lines.join('\n')
    }

    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    layer.remove()
  }
}