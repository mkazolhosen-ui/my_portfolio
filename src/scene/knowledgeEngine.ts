import * as THREE from 'three'
import type { KnowledgeFact } from '../knowledge/fallbackFacts'
import { introVisual } from './introState'

/** Shown in the debug panel and on <html data-k-engine>, so you can tell which file is running. */
export const ENGINE_VERSION = 'follow-v3'

/* ---------- Tuning ---------- */
/** Facts only appear on screens at least this wide (the core sits behind the text below it). */
const MIN_WIDTH = 900
/** Facts hide when the scene is dimmed below this (the Projects and Skills poses). */
const MIN_DIM = 0.55
/** The most facts on screen at once. */
const MAX_VISIBLE = 3
/** A node must face the viewer at least this much to start a reveal (1 = straight on). */
const START_FACING = 0.6
/** A label fades out as its node turns away: gone at FADE_LOW, fully visible above FADE_HIGH. */
const FADE_LOW = 0.05
const FADE_HIGH = 0.3
/** How tightly a label follows its node (higher = tighter, lower = floatier). */
const FOLLOW_RATE = 30

/** Reading time = DWELL_BASE + DWELL_PER_WORD x words (+ up to 1.5 s), kept between MIN and MAX. */
const DWELL_BASE = 5
const DWELL_PER_WORD = 0.4
const DWELL_MIN = 9
const DWELL_MAX = 16
/** Seconds. */
const FADE_OUT = 1.2
const LEAVE_TIME = 0.8
/** Gap before the next reveal may start anywhere. */
const START_GAP_MIN = 2
const START_GAP_MAX = 4
/** Rest time for a spot after it hides. */
const COOLDOWN_MIN = 2
const COOLDOWN_MAX = 5
/** Pause after the scene becomes eligible before the first reveal. */
const FIRST_DELAY = 1.5
/** Minimum time between attempts to start a reveal (each attempt measures the page). */
const ATTEMPT_GAP = 0.25
const BLOCKED_RETRY = 1
const KEEP_REFRESH = 0.3

/* ---------- Placement ---------- */
/** Distances, in pixels, from the node at which a label may be placed. */
const RADII = [50, 80]
/** How many directions are tried around the node. */
const ANGLE_STEPS = 12
/** A label may never come closer than this to its own node. */
const NODE_CLEAR = 14
/** Smallest distance between a label and the window edge when it starts. */
const MARGIN = 16
/** Clearance from text and objects required when a label starts. */
const KEEP_PAD = 14
/** Clearance required at the spot the label is predicted to drift to. */
const PREDICT_PAD = 8
/** How far ahead, in seconds, to check that the label's path is free. */
const PREDICT_S = 3.5
/** A label leaves if it comes this close to text or an object while showing. */
const LEAVE_PAD = 4
/** Space kept between two labels. */
const CHIP_GAP = 12

/* ---------- Emergence effect timing (seconds) ---------- */
/** The node beacon fades in. */
const NODE_FADE = 0.3
/** The tether draws out from the node. */
const LINE_DRAW = 0.55
/** The label starts appearing this long after the node, and fades in over CHIP_FADE. */
const CHIP_DELAY = 0.3
const CHIP_FADE = 0.5
/** How many times per second the spark travels from the node to the label. */
const SPARK_SPEED = 0.55

/** Whole objects a label must never cover. */
const BOX_SELECTORS =
  '.nav, .btn, .chip, .project, .skill, .skills__map, .hero__scroll, .contact__links a'
/** Text a label must never cover. It is measured line by line, so only the letters are protected. */
const TEXT_SELECTORS =
  '.eyebrow, .hero__word, .hero__tagline, .hero__intro, .section__title, .about__text p, .contact__message, .contact__email, .contact__empty, .footer p'

const SVG_NS = 'http://www.w3.org/2000/svg'
const { clamp, damp, lerp, smoothstep } = THREE.MathUtils
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  className: string,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  node.setAttribute('class', className)
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value)
  return node
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Straight-line distance between a box and a rectangle (0 if they touch or overlap). */
function rectGap(left: number, top: number, w: number, h: number, r: Rect): number {
  const dx = Math.max(r.left - (left + w), left - r.right, 0)
  const dy = Math.max(r.top - (top + h), top - r.bottom, 0)
  return Math.hypot(dx, dy)
}

interface Slot {
  anchor: THREE.Vector3
  chip: HTMLDivElement
  panel: HTMLDivElement
  tag: HTMLSpanElement
  body: HTMLSpanElement
  /** The glowing marker on the node: halo, ripples, rotating ring and a bright core. */
  beacon: SVGGElement
  glow: SVGLineElement
  line: SVGLineElement
  spark: SVGCircleElement
  state: 'idle' | 'showing'
  fact: KnowledgeFact | null
  startedAt: number
  dwell: number
  leaveAt: number | null
  cooldownUntil: number
  /** Offsets the spark so the labels' sparks are not all in step. */
  phase: number
  /** The label's current (smoothed) top-left corner on screen. */
  px: number
  py: number
  /** The label's fixed offset from its node, chosen when it appears. */
  ox: number
  oy: number
  /** Where the tether meets the label, measured from its top-left corner (fixed when it appears). */
  tu: number
  tv: number
  w: number
  h: number
  /** The node's recent movement on screen, in pixels per second. */
  vx: number
  vy: number
  lastNx: number
  lastNy: number
  lastFacing: number
  hasLast: boolean
}

/** What the debug overlay reads (see knowledgeDebug.ts). */
export interface KnowledgeDebugInfo {
  version: string
  vw: number
  vh: number
  dim: number
  keepOut: { left: number; top: number; right: number; bottom: number }[]
  slots: {
    index: number
    showing: boolean
    px: number
    py: number
    w: number
    h: number
    facing: number
    speed: number
  }[]
}

export interface EngineFrame {
  /** Seconds, from the scene clock. */
  now: number
  camera: THREE.PerspectiveCamera
  /** Canvas size in CSS pixels. */
  width: number
  height: number
  /** A group at the origin of the core's rotating group. */
  group: THREE.Object3D
}

/**
 * Picks `count` well-spread points among the unique vertices of a geometry
 * (farthest-point sampling), so labels are distributed evenly around the sphere.
 */
export function pickAnchors(geometry: THREE.BufferGeometry, count: number): THREE.Vector3[] {
  const position = geometry.getAttribute('position')
  const seen = new Map<string, THREE.Vector3>()
  for (let i = 0; i < position.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(position, i)
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
    if (!seen.has(key)) seen.set(key, v)
  }

  const unique = [...seen.values()]
  if (unique.length <= count) return unique

  const chosen = [unique[0]]
  const minDist = unique.map((v) => v.distanceToSquared(unique[0]))
  while (chosen.length < count) {
    let best = 0
    let bestDist = -1
    for (let i = 0; i < unique.length; i++) {
      if (minDist[i] > bestDist) {
        bestDist = minDist[i]
        best = i
      }
    }
    chosen.push(unique[best])
    for (let i = 0; i < unique.length; i++) {
      minDist[i] = Math.min(minDist[i], unique[i].distanceToSquared(unique[best]))
    }
  }
  return chosen
}

/**
 * Shows short facts that emerge from the core's nodes.
 * Each label is attached to its node at a fixed offset and follows it smoothly as the core
 * rotates, staying upright and readable. Labels only start in free space and fade out if they
 * would touch text or another object. The engine owns a small DOM layer and updates it directly
 * each frame, so React never re-renders while the scene runs.
 */
export default class KnowledgeEngine {
  private readonly root: HTMLDivElement
  private readonly slots: Slot[]
  private readonly getFacts: () => readonly KnowledgeFact[]

  private readonly world = new THREE.Vector3()
  private readonly center = new THREE.Vector3()
  private readonly normal = new THREE.Vector3()
  private readonly view = new THREE.Vector3()
  private readonly projected = new THREE.Vector3()

  private bag: number[] = []
  private bagFor: readonly KnowledgeFact[] | null = null
  private lastIndex = -1
  private nextStartAt = 0
  private nextAttemptAt = 0
  private lastNow = -1
  private wasEnabled = false
  private keepOut: Rect[] = []
  private keepOutAt = -Infinity

  /** Window size without the scrollbar. */
  private vw = 0
  private vh = 0
  private readonly onResize = () => this.readViewport()

  /** Debug only: when true, labels do not leave when they touch text, so overlaps can be inspected. */
  keepOnOverlap = false

  constructor(
    host: HTMLElement,
    anchors: THREE.Vector3[],
    getFacts: () => readonly KnowledgeFact[],
  ) {
    this.getFacts = getFacts
    this.readViewport()
    window.addEventListener('resize', this.onResize)
    document.documentElement.dataset.kEngine = ENGINE_VERSION

    this.root = document.createElement('div')
    this.root.className = 'core-facts'
    this.root.setAttribute('aria-hidden', 'true')

    const svg = svgEl('svg', 'core-facts__svg', { focusable: 'false' })
    this.root.appendChild(svg)

    this.slots = anchors.map((anchor): Slot => {
      const glow = svgEl('line', 'core-facts__glow', { opacity: '0' })
      const line = svgEl('line', 'core-facts__line', { opacity: '0' })
      const spark = svgEl('circle', 'core-facts__spark', { r: '2.6', opacity: '0' })

      const beacon = svgEl('g', 'core-facts__beacon', { opacity: '0' })
      beacon.append(
        svgEl('circle', 'core-facts__halo', { r: '14' }),
        svgEl('circle', 'core-facts__ring', { r: '6' }),
        svgEl('circle', 'core-facts__ring core-facts__ring--late', { r: '6' }),
        svgEl('circle', 'core-facts__reticle', { r: '10' }),
        svgEl('circle', 'core-facts__dot', { r: '3.6' }),
      )
      svg.append(glow, line, spark, beacon)

      const chip = document.createElement('div')
      chip.className = 'core-fact'
      const panel = document.createElement('div')
      panel.className = 'core-fact__panel'
      const tag = document.createElement('span')
      tag.className = 'core-fact__tag'
      const body = document.createElement('span')
      body.className = 'core-fact__text'
      panel.append(tag, body)
      chip.appendChild(panel)
      this.root.appendChild(chip)

      return {
        anchor,
        chip,
        panel,
        tag,
        body,
        beacon,
        glow,
        line,
        spark,
        state: 'idle',
        fact: null,
        startedAt: 0,
        dwell: 0,
        leaveAt: null,
        cooldownUntil: 0,
        phase: 0,
        px: 0,
        py: 0,
        ox: 0,
        oy: 0,
        tu: 0,
        tv: 0,
        w: 0,
        h: 0,
        vx: 0,
        vy: 0,
        lastNx: 0,
        lastNy: 0,
        lastFacing: 0,
        hasLast: false,
      }
    })

    host.appendChild(this.root)
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    delete document.documentElement.dataset.kEngine
    this.root.remove()
  }

  update(f: EngineFrame): void {
    const { now, camera, width, height, group } = f

    const dt = this.lastNow < 0 ? 0 : clamp(now - this.lastNow, 0, 0.05)
    this.lastNow = now

    const dim = this.readDim()
    const enabled = width >= MIN_WIDTH && introVisual.core >= 1 && dim >= MIN_DIM
    if (enabled && !this.wasEnabled) this.nextStartAt = now + FIRST_DELAY
    this.wasEnabled = enabled

    let showing = 0
    for (const s of this.slots) if (s.state === 'showing') showing++
    if (!enabled && showing === 0) {
      for (const s of this.slots) s.hasLast = false
      return
    }

    group.updateWorldMatrix(true, false)
    group.getWorldPosition(this.center)
    this.projected.copy(this.center).project(camera)
    const cx = (this.projected.x * 0.5 + 0.5) * width
    const cy = (-this.projected.y * 0.5 + 0.5) * height

    if (showing > 0) this.refreshKeepOut(now, KEEP_REFRESH)

    for (const slot of this.slots) {
      this.world.copy(slot.anchor)
      group.localToWorld(this.world)

      // How directly this node faces the camera (1 = straight on, 0 = edge, negative = behind).
      this.normal.copy(this.world).sub(this.center).normalize()
      this.view.copy(camera.position).sub(this.world).normalize()
      const facing = this.normal.dot(this.view)

      this.projected.copy(this.world).project(camera)
      const nx = (this.projected.x * 0.5 + 0.5) * width
      const ny = (-this.projected.y * 0.5 + 0.5) * height

      // Track how the node moves on screen, and whether it is turning toward the viewer.
      if (slot.hasLast && dt > 0) {
        slot.vx = lerp(slot.vx, clamp((nx - slot.lastNx) / dt, -400, 400), 0.15)
        slot.vy = lerp(slot.vy, clamp((ny - slot.lastNy) / dt, -400, 400), 0.15)
      } else {
        slot.vx = 0
        slot.vy = 0
      }
      const approaching = !slot.hasLast || facing >= slot.lastFacing - 0.0005
      slot.lastNx = nx
      slot.lastNy = ny
      slot.lastFacing = facing
      slot.hasLast = true

      if (slot.state === 'idle') {
        if (!enabled || showing >= MAX_VISIBLE) continue
        if (now < this.nextStartAt || now < this.nextAttemptAt) continue
        if (now < slot.cooldownUntil || facing < START_FACING || !approaching) continue

        this.nextAttemptAt = now + ATTEMPT_GAP
        if (this.tryStart(slot, now, nx, ny, cx, cy)) showing++
        else slot.cooldownUntil = now + BLOCKED_RETRY
        continue
      }

      // Showing: follow the node at a fixed offset, smoothly.
      slot.px = damp(slot.px, nx + slot.ox, FOLLOW_RATE, dt)
      slot.py = damp(slot.py, ny + slot.oy, FOLLOW_RATE, dt)

      // Leave if the label would touch text or an object, run off the screen, or hit an older label.
      if (slot.leaveAt === null) {
        const offScreen =
          slot.px < 4 ||
          slot.py < 4 ||
          slot.px + slot.w > this.vw - 4 ||
          slot.py + slot.h > this.vh - 4
        if (
          !enabled ||
          offScreen ||
          (!this.keepOnOverlap && this.hits(slot.px, slot.py, slot.w, slot.h, LEAVE_PAD)) ||
          this.coveredByOlder(slot)
        ) {
          slot.leaveAt = now
        }
      }

      const age = now - slot.startedAt

      // Fades: out at the end of the reading time, as the node turns away, and with the scene brightness.
      let base =
        clamp((slot.startedAt + slot.dwell - now) / FADE_OUT, 0, 1) *
        smoothstep(facing, FADE_LOW, FADE_HIGH) *
        dim
      if (slot.leaveAt !== null) {
        base *= clamp(1 - (now - slot.leaveAt) / LEAVE_TIME, 0, 1)
      }

      const expired = now >= slot.startedAt + slot.dwell
      if (base <= 0.01 && (slot.leaveAt !== null || expired || facing < FADE_LOW)) {
        this.end(slot, now)
        continue
      }

      // The node appears first, then the tether draws out, then the label unfolds.
      const nodeAlpha = base * clamp(age / NODE_FADE, 0, 1)
      const chipAlpha = base * clamp((age - CHIP_DELAY) / CHIP_FADE, 0, 1)
      const draw = easeOut(clamp(age / LINE_DRAW, 0, 1))

      // The tether meets the label at the same fixed point all the time, so the line never jumps.
      const ax = slot.px + slot.tu
      const ay = slot.py + slot.tv
      const tx = nx + (ax - nx) * draw
      const ty = ny + (ay - ny) * draw
      const x1 = nx.toFixed(1)
      const y1 = ny.toFixed(1)
      const x2 = tx.toFixed(1)
      const y2 = ty.toFixed(1)

      slot.glow.setAttribute('x1', x1)
      slot.glow.setAttribute('y1', y1)
      slot.glow.setAttribute('x2', x2)
      slot.glow.setAttribute('y2', y2)
      slot.glow.setAttribute('opacity', (nodeAlpha * 0.3).toFixed(3))

      slot.line.setAttribute('x1', x1)
      slot.line.setAttribute('y1', y1)
      slot.line.setAttribute('x2', x2)
      slot.line.setAttribute('y2', y2)
      slot.line.setAttribute('opacity', (nodeAlpha * 0.95).toFixed(3))

      slot.beacon.setAttribute('transform', `translate(${x1} ${y1})`)
      slot.beacon.setAttribute('opacity', nodeAlpha.toFixed(3))

      // Once the tether has connected, a spark runs along it from the node to the label.
      if (draw >= 1) {
        const t = (now * SPARK_SPEED + slot.phase) % 1
        slot.spark.setAttribute('cx', (nx + (ax - nx) * t).toFixed(1))
        slot.spark.setAttribute('cy', (ny + (ay - ny) * t).toFixed(1))
        slot.spark.setAttribute('opacity', (nodeAlpha * Math.sin(Math.PI * t)).toFixed(3))
      } else {
        slot.spark.setAttribute('opacity', '0')
      }

      slot.chip.style.transform = `translate3d(${slot.px.toFixed(2)}px, ${slot.py.toFixed(2)}px, 0)`
      slot.chip.style.opacity = chipAlpha.toFixed(3)
    }
  }

  /** Debug only: what the engine currently protects and where each label is. */
  debugInfo(): KnowledgeDebugInfo {
    this.refreshKeepOut(this.lastNow, KEEP_REFRESH)
    return {
      version: ENGINE_VERSION,
      vw: this.vw,
      vh: this.vh,
      dim: this.readDim(),
      keepOut: this.keepOut,
      slots: this.slots.map((s, index) => ({
        index,
        showing: s.state === 'showing',
        px: s.px,
        py: s.py,
        w: s.w,
        h: s.h,
        facing: s.lastFacing,
        speed: Math.hypot(s.vx, s.vy),
      })),
    }
  }

  private readViewport(): void {
    const el = document.documentElement
    this.vw = el.clientWidth
    this.vh = el.clientHeight
  }

  /** The scene brightness that GSAP sets on <html> for each section (1 = full). */
  private readDim(): number {
    const raw = parseFloat(document.documentElement.style.getPropertyValue('--scene-dim'))
    return Number.isFinite(raw) ? raw : 1
  }

  /** Measures everything a label must stay clear of: whole objects, and text line by line. */
  private refreshKeepOut(now: number, maxAge: number): void {
    if (now - this.keepOutAt < maxAge) return
    this.keepOutAt = now

    const rects: Rect[] = []
    const push = (r: DOMRect) => {
      if (r.width < 1 || r.height < 1) return
      if (r.right < 0 || r.bottom < 0 || r.left > this.vw || r.top > this.vh) return
      rects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })
    }

    document.querySelectorAll(BOX_SELECTORS).forEach((el) => push(el.getBoundingClientRect()))

    // A range over an element's contents returns one rectangle per line of text.
    const range = document.createRange()
    document.querySelectorAll(TEXT_SELECTORS).forEach((el) => {
      range.selectNodeContents(el)
      const lines = range.getClientRects()
      for (let i = 0; i < lines.length; i++) push(lines[i])
    })

    this.keepOut = rects
  }

  /** Does this box come within `pad` pixels of any text or object? */
  private hits(left: number, top: number, w: number, h: number, pad: number): boolean {
    return this.keepOut.some(
      (r) =>
        left < r.right + pad &&
        left + w > r.left - pad &&
        top < r.bottom + pad &&
        top + h > r.top - pad,
    )
  }

  /** Distance from this box to the nearest text or object, capped at 160 pixels. */
  private clearance(left: number, top: number, w: number, h: number): number {
    let best = 160
    for (const r of this.keepOut) best = Math.min(best, rectGap(left, top, w, h, r))
    return best
  }

  /** Does this box overlap any label that is currently showing (other than `self`)? */
  private overlapsLabels(self: Slot, left: number, top: number, w: number, h: number): boolean {
    for (const o of this.slots) {
      if (o === self || o.state !== 'showing') continue
      if (
        left < o.px + o.w + CHIP_GAP &&
        left + w + CHIP_GAP > o.px &&
        top < o.py + o.h + CHIP_GAP &&
        top + h + CHIP_GAP > o.py
      ) {
        return true
      }
    }
    return false
  }

  /** Is this label overlapping a label that appeared before it? The newer one gives way. */
  private coveredByOlder(slot: Slot): boolean {
    for (const o of this.slots) {
      if (o === slot || o.state !== 'showing' || o.startedAt > slot.startedAt) continue
      if (
        slot.px < o.px + o.w + 4 &&
        slot.px + slot.w + 4 > o.px &&
        slot.py < o.py + o.h + 4 &&
        slot.py + slot.h + 4 > o.py
      ) {
        return true
      }
    }
    return false
  }

  /** Is this box fully inside the window, clear of text and objects, and clear of other labels? */
  private fits(slot: Slot, left: number, top: number, pad: number): boolean {
    const { w, h } = slot
    if (left < MARGIN || top < MARGIN || left + w > this.vw - MARGIN || top + h > this.vh - MARGIN) {
      return false
    }
    if (this.hits(left, top, w, h, pad)) return false
    return !this.overlapsLabels(slot, left, top, w, h)
  }

  /**
   * Looks around the node for a free spot for the label. A spot must be free now and also where the
   * label will have drifted to, following its node, a few seconds from now.
   */
  private findSpot(slot: Slot, nx: number, ny: number, cx: number, cy: number) {
    const outward = Math.atan2(ny - cy, nx - cx)
    let best: { left: number; top: number } | null = null
    let bestScore = -Infinity

    for (const r of RADII) {
      for (let i = 0; i < ANGLE_STEPS; i++) {
        const a = (i / ANGLE_STEPS) * Math.PI * 2
        const c = Math.cos(a)
        const s = Math.sin(a)
        const ax = nx + c * r
        const ay = ny + s * r
        // The label sits just beyond this point, on the side facing away from the node.
        const left = ax - (slot.w * (1 - c)) / 2
        const top = ay - (slot.h * (1 - s)) / 2

        const gapToNode = Math.hypot(
          nx - clamp(nx, left, left + slot.w),
          ny - clamp(ny, top, top + slot.h),
        )
        if (gapToNode < NODE_CLEAR) continue
        if (!this.fits(slot, left, top, KEEP_PAD)) continue
        if (!this.fits(slot, left + slot.vx * PREDICT_S, top + slot.vy * PREDICT_S, PREDICT_PAD)) {
          continue
        }

        // Prefer roomy spots, close to the node, on the outer side of the core.
        const score =
          this.clearance(left, top, slot.w, slot.h) - r * 0.3 + Math.cos(a - outward) * 20
        if (score > bestScore) {
          bestScore = score
          best = { left, top }
        }
      }
    }
    return best
  }

  private tryStart(
    slot: Slot,
    now: number,
    nx: number,
    ny: number,
    cx: number,
    cy: number,
  ): boolean {
    const picked = this.pickFact()
    if (!picked) return false

    // Set the text first, then measure, so placement uses the real size.
    slot.tag.textContent = picked.fact.category
    slot.body.textContent = picked.fact.text
    slot.w = slot.chip.offsetWidth
    slot.h = slot.chip.offsetHeight

    this.refreshKeepOut(now, 0.1)
    const spot = this.findSpot(slot, nx, ny, cx, cy)
    if (!spot) {
      // Nothing is free: put the fact back at the far end of the bag so it is tried later.
      this.bag.unshift(picked.index)
      return false
    }

    // Attach the label to the node at this fixed offset.
    slot.px = spot.left
    slot.py = spot.top
    slot.ox = spot.left - nx
    slot.oy = spot.top - ny
    // The tether always meets the label at this point.
    slot.tu = clamp(nx, spot.left, spot.left + slot.w) - spot.left
    slot.tv = clamp(ny, spot.top, spot.top + slot.h) - spot.top
    slot.chip.style.transform = `translate3d(${Math.round(spot.left)}px, ${Math.round(spot.top)}px, 0)`

    // Reading time grows with the length of the fact.
    const words = picked.fact.text.trim().split(/\s+/).length
    slot.dwell = clamp(DWELL_BASE + words * DWELL_PER_WORD + rand(0, 1.5), DWELL_MIN, DWELL_MAX)

    slot.state = 'showing'
    slot.fact = picked.fact
    slot.startedAt = now
    slot.leaveAt = null
    slot.phase = Math.random()
    this.lastIndex = picked.index
    this.nextStartAt = now + rand(START_GAP_MIN, START_GAP_MAX)

    // The label unfolds from the side that faces its node. Restart the CSS animation.
    slot.chip.dataset.side = nx < spot.left + slot.w / 2 ? 'right' : 'left'
    slot.panel.classList.remove('is-new')
    slot.panel.getBoundingClientRect() // forces a reflow so the animation restarts
    slot.panel.classList.add('is-new')
    return true
  }

  private end(slot: Slot, now: number): void {
    slot.state = 'idle'
    slot.fact = null
    slot.leaveAt = null
    slot.cooldownUntil = now + rand(COOLDOWN_MIN, COOLDOWN_MAX)
    slot.panel.classList.remove('is-new')
    slot.chip.style.opacity = '0'
    slot.beacon.setAttribute('opacity', '0')
    slot.glow.setAttribute('opacity', '0')
    slot.line.setAttribute('opacity', '0')
    slot.spark.setAttribute('opacity', '0')
  }

  /** Draws the next fact from a shuffled bag: no repeats until every fact has been used. */
  private pickFact(): { fact: KnowledgeFact; index: number } | null {
    const facts = this.getFacts()
    if (facts.length === 0) return null

    if (this.bagFor !== facts || this.bag.length === 0) {
      this.bagFor = facts
      this.bag = facts.map((_, i) => i)
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
    }

    const onScreen: KnowledgeFact[] = []
    for (const s of this.slots) if (s.fact) onScreen.push(s.fact)

    const skipped: number[] = []
    let found: { fact: KnowledgeFact; index: number } | null = null

    for (let attempt = 0; attempt < 8 && this.bag.length > 0; attempt++) {
      const index = this.bag.pop() as number
      const fact = facts[index]
      const sameText = onScreen.some((f) => f.text === fact.text)
      // Prefer a different topic from what is already visible, but only for the first few tries.
      const sameTopic = attempt < 4 && onScreen.some((f) => f.category === fact.category)
      if (index === this.lastIndex || sameText || sameTopic) {
        skipped.push(index)
        continue
      }
      found = { fact, index }
      break
    }

    // Skipped facts go back to the far end of the bag so they are used later.
    this.bag.unshift(...skipped)
    return found
  }
}