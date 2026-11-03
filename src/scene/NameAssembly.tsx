import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { computeNameTargets, type NameTargets } from './nameTargets'
import { loadNameFont, buildLetterShapes, LETTER_COLOR } from './nameFont'
import type { FontData } from 'three/addons/loaders/FontLoader.js'
import { finishIntro, introControl, introVisual, useIntroStatus } from './introState'

const ICE = new THREE.Color('#cfeaff')
const CYAN = new THREE.Color('#27e8ff')
const FLASH = new THREE.Color('#c8f7ff')

/* ---------- Timeline: seconds since the first piece appears. Change these to tune. ---------- */
const RELEASE_TIME = 2.2 // pieces start falling at random moments during this time
const CONVERGE_START = 3.4 // the first word (MD) starts lifting off
const WORD_GAP = 0.55 // each following word starts this much later: MD, then KAZOL, then HOSEN
const WORD_SWEEP = 0.85 // inside a word, the lift-off runs from its first letter to its last over this long
const CHARGE_TIME = 0.35 // a word's tiles glow this long just before they lift off
const ARRIVE_AFTER = 1.4 // roughly how long after lift-off a piece has arrived
const SWEEP_START = 7.0 // the band of light starts crossing the finished name
const SWEEP_TIME = 1.2 // ...and takes this long to cross it
const TURN_START = 7.2 // the finished name starts a slow, slight turn so its thickness catches the light
const GLIDE_START = 8.6 // the centred name starts gliding to where the HTML title sits
const GLIDE_TIME = 0.9 // ...and takes this long to get there
const HANDOFF_START = GLIDE_START + GLIDE_TIME // the pieces start dissolving and the core fades in
const HERO_DELAY = 0.25 // the real HTML title starts appearing this long after that
const DISSOLVE_STAGGER = 0.6 // pieces start dissolving at random moments within this time
const DISSOLVE_LIFE = 0.6 // how long one piece takes to dissolve
const LETTER_GROW_TIME = 0.8 // how long a letter's body takes to grow backward behind its tiles
const LETTER_FADE_IN = 0.45 // how long a letter takes to fade in
const LETTER_FRONT_GAP = 1.1 // how far (in tile radii) the front of each letter sits behind the tiles

/* ---------- Finishing touches: change these to tune ---------- */
const USE_3D_LETTERS = false // the solid 3D letters (and tile shadows) behind the tiles; false switches them off
const TURN_YAW = 0.12 // how far the finished name turns sideways (radians; 0.12 is about 7 degrees)
const TURN_PITCH = 0.05 // ...and up and down
const WORD_PULSE = 0.00 // a tiny "thump" each time a word locks in (0.006 = 0.6% size change); 0 = off
const SWEEP_GLOW = 0.8 // how bright the light sweep makes the tiles
const SWEEP_TILT = 0.2 // how far the tiles tilt as the light sweep passes (radians)
const TILE_SHADOW_OPACITY = 0.42 // darkness of the soft shadow under each tile (was 0.4); 0 turns it off
const SHADOW_DX = 0.35 // where the shadows fall, in tile radii (right and down: light from the upper left)
const SHADOW_DY = -0.45

/* ---------- Physics settings ---------- */
const TABLE_SIZE = 2048 // power of two for the spatial hash
const STEP = 1 / 120 // physics runs in steps of 1/120 second
const MAX_STEPS = 6 // never do more than this many steps in one frame
const GRAVITY = 8.5
const SPRING_OMEGA = 8
const SPRING_DAMPING = 1 // critical damping avoids oscillation as pieces settle
const FLOOR_BOUNCE = 0.55
const WALL_BOUNCE = 0.55
const PIECE_BOUNCE = 0.45
const SWIRL = 3.5 // how curved the flight paths are
const FLOOR_FRACTION = 0.12 // the floor is at least this fraction of the screen height above the bottom...
const FLOOR_CLEARANCE_PX = 110 // ...and never closer than this many CSS pixels, so the skip hint stays clear
const PILE_PULL = 1.5 // gently draws pieces resting on the floor toward the middle, forming a heap
const DESKTOP_PIECES = 680 // number of tiles on wide screens
const NARROW_PIECES = 480 // number of tiles on screens under 900 px wide
const WEAK_DEVICE_FACTOR = 0.75 // fewer tiles on devices reporting 4 or fewer CPU cores

/** Repeatable "random" number from 0 to 1. Different `channel` numbers give different values. */
function hash(i: number, channel = 0) {
  const s = Math.sin(i * 127.1 + channel * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Small seeded random generator for effects that happen while the simulation runs. */
function makeRng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth 0-to-1 ramp: starts slowly, ends slowly. */
function smooth(x: number) {
  const t = Math.min(Math.max(x, 0), 1)
  return t * t * (3 - 2 * t)
}

/** Turns a grid cell (3 whole numbers) into a slot number in the lookup table. */
function cellHash(ix: number, iy: number, iz: number) {
  return (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) & (TABLE_SIZE - 1)
}

/** Everything the simulation needs to remember, stored in fast number arrays. */
interface Sim {
  n: number
  pos: Float32Array // x, y, z for each piece
  vel: Float32Array // velocity x, y, z
  quat: Float32Array // rotation (4 numbers per piece)
  ang: Float32Array // spin speed around x, y, z
  delay: Float32Array // seconds before each piece starts falling
  launch: Float32Array // seconds before each piece lifts off toward the name
  popped: Uint8Array // 1 once a piece has received its lift-off pop
  target: Float32Array // x, y where each piece lands while the name is centred on screen
  glide: Float32Array // x, y each piece travels to get from there to the HTML title position
  base: Float32Array // each piece's own colour (r, g, b)
  phase: Float32Array // random starting points for the settle drift
  grid: Int32Array
  next: Int32Array
  radius: number // visual size of a tile
  rho: number // collision size (a bit smaller than the tile)
  halfW: number // half the visible width
  floorY: number
  zMax: number // half the thickness of the slab the pieces live in
  minX: number // left and right edges of the finished name (centred)
  maxX: number
  upp: number // world units per CSS pixel
  wordMin: Map<number, number> // left edge of each word at the HTML title position
  wordSpan: Map<number, number> // ...and its width
  wordLock: Float32Array // when the last tile of each word has landed
  wordDx: Map<number, number> // how far each word was shifted to centre it
  centreDy: number // how far the whole name was shifted up or down to centre it
  dissolveAt: number // when the pieces start dissolving (moves earlier if the visitor skips)
  heroShown: boolean // true once the real HTML title has been told to appear
  retired: boolean // true once the animation is completely finished
  time: number
  acc: number
  rng: () => number
}

/** How far to shift each line of the name so the whole name sits in the middle of the screen. */
interface Centring {
  /** Horizontal shift per word (every word on the same line gets the same shift). */
  wordDx: Map<number, number>
  /** Vertical shift for the whole name. */
  dy: number
}

function computeCentring(targets: NameTargets, width: number, height: number, upp: number): Centring {
  // Bounding box of every word, in world units (y points up).
  const boxes = new Map<number, { minX: number; maxX: number; minY: number; maxY: number }>()
  for (const p of targets.points) {
    const x = (p.x - width / 2) * upp
    const y = -(p.y - height / 2) * upp
    const b = boxes.get(p.word)
    if (!b) {
      boxes.set(p.word, { minX: x, maxX: x, minY: y, maxY: y })
    } else {
      b.minX = Math.min(b.minX, x)
      b.maxX = Math.max(b.maxX, x)
      b.minY = Math.min(b.minY, y)
      b.maxY = Math.max(b.maxY, y)
    }
  }

  // Words that sit on the same row make up one line (on phones the title wraps onto several lines).
  const lines: { words: number[]; minX: number; maxX: number; minY: number; maxY: number }[] = []
  const ordered = [...boxes.entries()].sort((a, b) => a[0] - b[0])
  for (const [word, b] of ordered) {
    const last = lines[lines.length - 1]
    if (last && Math.abs((b.minY + b.maxY) / 2 - (last.minY + last.maxY) / 2) < (b.maxY - b.minY) * 0.5) {
      last.words.push(word)
      last.minX = Math.min(last.minX, b.minX)
      last.maxX = Math.max(last.maxX, b.maxX)
      last.minY = Math.min(last.minY, b.minY)
      last.maxY = Math.max(last.maxY, b.maxY)
    } else {
      lines.push({ words: [word], ...b })
    }
  }

  const wordDx = new Map<number, number>()
  let minY = Infinity
  let maxY = -Infinity
  for (const line of lines) {
    const dx = -(line.minX + line.maxX) / 2 // centre this line horizontally
    for (const word of line.words) wordDx.set(word, dx)
    minY = Math.min(minY, line.minY)
    maxY = Math.max(maxY, line.maxY)
  }
  return { wordDx, dy: -(minY + maxY) / 2 } // centre the whole block vertically
}

function createSim(
  targets: NameTargets,
  width: number,
  height: number,
  fov: number,
  camZ: number,
): Sim {
  const n = targets.points.length
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * camZ
  const upp = visibleHeight / height // world units per CSS pixel
  const radius = targets.spacing * upp * 0.54
  const rho = radius * 0.85
  const halfW = (width * upp) / 2
  const topY = visibleHeight / 2
  // The floor stays well above the bottom edge so the fallen pieces never cover the skip hint.
  const floorY = -topY + Math.max(visibleHeight * FLOOR_FRACTION, FLOOR_CLEARANCE_PX * upp)
  const zMax = rho * 2.5

  const sim: Sim = {
    n,
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    quat: new Float32Array(n * 4),
    ang: new Float32Array(n * 3),
    delay: new Float32Array(n),
    launch: new Float32Array(n),
    popped: new Uint8Array(n),
    target: new Float32Array(n * 2),
    glide: new Float32Array(n * 2),
    base: new Float32Array(n * 3),
    phase: new Float32Array(n * 3),
    grid: new Int32Array(TABLE_SIZE),
    next: new Int32Array(n),
    radius,
    rho,
    halfW,
    floorY,
    zMax,
    minX: 0,
    maxX: 0,
    upp,
    wordMin: new Map(),
    wordSpan: new Map(),
    wordLock: new Float32Array(0),
    wordDx: new Map(),
    centreDy: 0,
    dissolveAt: HANDOFF_START,
    heroShown: false,
    retired: false,
    time: 0,
    acc: 0,
    rng: makeRng(2026),
  }

  // The name assembles centred on screen, then glides to where the HTML title really sits.
  const centring = computeCentring(targets, width, height, upp)
  sim.wordDx = centring.wordDx
  sim.centreDy = centring.dy
  const homeX = new Float32Array(n) // x of each piece at the HTML title position
  const wordLo = new Map<number, number>() // left and right edge of every word at the HTML title position
  const wordHi = new Map<number, number>()
  let minC = Infinity // x range of the centred name
  let maxC = -Infinity
  for (let i = 0; i < n; i++) {
    const p = targets.points[i]
    const hx = (p.x - width / 2) * upp
    const hy = -(p.y - height / 2) * upp
    const ox = centring.wordDx.get(p.word) ?? 0
    homeX[i] = hx
    sim.target[i * 2] = hx + ox
    sim.target[i * 2 + 1] = hy + centring.dy
    sim.glide[i * 2] = -ox
    sim.glide[i * 2 + 1] = -centring.dy
    wordLo.set(p.word, Math.min(wordLo.get(p.word) ?? hx, hx))
    wordHi.set(p.word, Math.max(wordHi.get(p.word) ?? hx, hx))
    minC = Math.min(minC, hx + ox)
    maxC = Math.max(maxC, hx + ox)
  }
  sim.minX = minC
  sim.maxX = maxC
  for (const [word, lo] of wordLo) {
    sim.wordMin.set(word, lo)
    sim.wordSpan.set(word, ((wordHi.get(word) ?? lo) - lo) || 1)
  }
  // When the last tile of each word has landed (used for the little thump).
  sim.wordLock = new Float32Array(Math.max(...wordLo.keys()) + 1)
  for (const word of wordLo.keys()) {
    sim.wordLock[word] = CONVERGE_START + word * WORD_GAP + WORD_SWEEP + 0.3 + ARRIVE_AFTER
  }
  const nameHalf = Math.max((maxC - minC) / 2, 0.5)

  const euler = new THREE.Euler()
  const q = new THREE.Quaternion()
  const color = new THREE.Color()

  for (let i = 0; i < n; i++) {
    const tx = sim.target[i * 2]
    const k = i * 3

    // Start above the screen, mostly near the middle, so the fallen pieces form a heap, not a strip.
    const wide = (hash(i, 3) - 0.5) * 2 * nameHalf * 0.25
    sim.pos[k] = THREE.MathUtils.lerp(tx, wide, 0.8)
    sim.pos[k + 1] = topY + 0.3 + hash(i, 4) * 1.2
    sim.pos[k + 2] = (hash(i, 5) - 0.5) * zMax * 1.6

    sim.vel[k] = (hash(i, 6) - 0.5) * 1.6
    sim.vel[k + 1] = -hash(i, 7) * 1.5
    sim.vel[k + 2] = (hash(i, 8) - 0.5) * 0.4

    euler.set(hash(i, 9) * Math.PI * 2, hash(i, 10) * Math.PI * 2, hash(i, 11) * Math.PI * 2)
    q.setFromEuler(euler)
    sim.quat[i * 4] = q.x
    sim.quat[i * 4 + 1] = q.y
    sim.quat[i * 4 + 2] = q.z
    sim.quat[i * 4 + 3] = q.w

    sim.ang[k] = (hash(i, 12) - 0.5) * 12
    sim.ang[k + 1] = (hash(i, 13) - 0.5) * 12
    sim.ang[k + 2] = (hash(i, 14) - 0.5) * 12

    // Pieces start falling in waves; most go early.
    sim.delay[i] = Math.pow(hash(i, 15), 1.6) * RELEASE_TIME

    // The words lift off one after another (MD, KAZOL, HOSEN); inside a word, from its first letter to its last.
    const word = targets.points[i].word
    const u = (homeX[i] - (sim.wordMin.get(word) ?? 0)) / (sim.wordSpan.get(word) ?? 1)
    sim.launch[i] = CONVERGE_START + word * WORD_GAP + u * WORD_SWEEP + hash(i, 16) * 0.3

    // Mostly ice-white, with roughly 1 in 8 pieces tinted cyan.
    const tint = hash(i, 1) > 0.88 ? CYAN : ICE
    color.copy(tint).multiplyScalar(0.75 + hash(i, 2) * 0.35)
    sim.base[k] = color.r
    sim.base[k + 1] = color.g
    sim.base[k + 2] = color.b

    sim.phase[k] = hash(i, 17) * Math.PI * 2
    sim.phase[k + 1] = hash(i, 18) * Math.PI * 2
    sim.phase[k + 2] = hash(i, 19) * Math.PI * 2
  }

  return sim
}

/** Pushes two overlapping pieces apart and makes them bounce off each other. */
function resolvePair(s: Sim, i: number, j: number, diameter: number) {
  const { pos, vel, ang } = s
  const a = i * 3
  const b = j * 3

  const dx = pos[b] - pos[a]
  const dy = pos[b + 1] - pos[a + 1]
  const dz = pos[b + 2] - pos[a + 2]
  const distSq = dx * dx + dy * dy + dz * dz
  if (distSq >= diameter * diameter) return

  const dist = Math.sqrt(distSq)
  let nx = 0
  let ny = 1
  let nz = 0
  if (dist > 1e-6) {
    nx = dx / dist
    ny = dy / dist
    nz = dz / dist
  }

  // Separate them so they no longer overlap.
  const push = (diameter - dist) * 0.4
  pos[a] -= nx * push
  pos[a + 1] -= ny * push
  pos[a + 2] -= nz * push
  pos[b] += nx * push
  pos[b + 1] += ny * push
  pos[b + 2] += nz * push

  // How fast are they moving toward each other?
  const closing =
    (vel[a] - vel[b]) * nx + (vel[a + 1] - vel[b + 1]) * ny + (vel[a + 2] - vel[b + 2]) * nz
  if (closing <= 0) return

  // Gentle contacts do not bounce, which keeps a resting pile calm.
  const bounce = closing > 0.6 ? PIECE_BOUNCE : 0
  const impulse = (1 + bounce) * closing * 0.5
  vel[a] -= nx * impulse
  vel[a + 1] -= ny * impulse
  vel[a + 2] -= nz * impulse
  vel[b] += nx * impulse
  vel[b + 1] += ny * impulse
  vel[b + 2] += nz * impulse

  // Hard hits make both pieces spin.
  if (closing > 0.5) {
    const kick = Math.min(closing, 4) * 2
    for (let c = 0; c < 3; c++) {
      ang[a + c] += (s.rng() - 0.5) * kick
      ang[b + c] += (s.rng() - 0.5) * kick
    }
  }
}

/** Moves the whole simulation forward by `dt` seconds. */
function stepSim(s: Sim, dt: number) {
  const { n, pos, vel, ang, rho, delay, launch, popped, target, grid, next } = s
  const time = s.time
  const drag = 1 - 0.1 * dt

  // 1. Movement: free falling pieces use gravity, lifted-off pieces follow a spring to their spot.
  for (let i = 0; i < n; i++) {
    if (delay[i] > time) continue
    const k = i * 3

    if (time < launch[i]) {
      vel[k + 1] -= GRAVITY * dt
      vel[k] *= drag
      vel[k + 1] *= drag
      vel[k + 2] *= drag
    } else {
      // The lift-off pop: a small upward kick, once.
      if (!popped[i]) {
        popped[i] = 1
        vel[k] += (s.rng() - 0.5) * 0.8
        vel[k + 1] += 1.2 + s.rng() * 0.8
        vel[k + 2] *= 0.3
      }

      // Over the first 0.7 s the spring fades in and gravity fades out.
      const blend = smooth((time - launch[i]) / 0.7)
      const omega = SPRING_OMEGA * blend
      const stiffness = omega * omega
      const damping = 2 * SPRING_DAMPING * omega
      const dx = target[i * 2] - pos[k]
      const dy = target[i * 2 + 1] - pos[k + 1]
      const dz = -pos[k + 2]
      const swirl = SWIRL * (1 - blend) // sideways push that bends the flight path

      vel[k] += (stiffness * dx - damping * vel[k] - dy * swirl) * dt
      vel[k + 1] += (stiffness * dy - damping * vel[k + 1] + dx * swirl - GRAVITY * (1 - blend)) * dt
      vel[k + 2] += (stiffness * dz - damping * vel[k + 2]) * dt
    }

    pos[k] += vel[k] * dt
    pos[k + 1] += vel[k + 1] * dt
    pos[k + 2] += vel[k + 2] * dt
  }

  // 2. Sort the still-falling pieces into a grid, so each piece only checks its neighbours
  grid.fill(-1)
  const cell = rho * 2
  for (let i = 0; i < n; i++) {
    if (delay[i] > time || launch[i] <= time) continue
    const k = i * 3
    const h = cellHash(
      Math.floor(pos[k] / cell),
      Math.floor(pos[k + 1] / cell),
      Math.floor(pos[k + 2] / cell),
    )
    next[i] = grid[h]
    grid[h] = i
  }

  // 3. Collisions between pieces
  const diameter = rho * 2
  for (let i = 0; i < n; i++) {
    if (delay[i] > time || launch[i] <= time) continue
    const k = i * 3
    const cx = Math.floor(pos[k] / cell)
    const cy = Math.floor(pos[k + 1] / cell)
    const cz = Math.floor(pos[k + 2] / cell)
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        for (let oz = -1; oz <= 1; oz++) {
          let j = grid[cellHash(cx + ox, cy + oy, cz + oz)]
          while (j !== -1) {
            if (j > i) resolvePair(s, i, j, diameter)
            j = next[j]
          }
        }
      }
    }
  }

  // 4. Floor, walls and the thin front-to-back slab
  const minX = -s.halfW + rho
  const maxX = s.halfW - rho
  const minY = s.floorY + rho
  for (let i = 0; i < n; i++) {
    if (delay[i] > time || launch[i] <= time) continue
    const k = i * 3

    if (pos[k] < minX) {
      pos[k] = minX
      if (vel[k] < 0) vel[k] = -vel[k] * WALL_BOUNCE
    } else if (pos[k] > maxX) {
      pos[k] = maxX
      if (vel[k] > 0) vel[k] = -vel[k] * WALL_BOUNCE
    }

    if (pos[k + 1] < minY) {
      pos[k + 1] = minY
      const impact = -vel[k + 1]
      if (impact > 0) {
        // Small impacts stop dead; big impacts bounce, scatter sideways and spin.
        vel[k + 1] = impact > 0.5 ? impact * FLOOR_BOUNCE : 0
        if (impact > 1) {
          vel[k] += (s.rng() - 0.5) * impact * 0.35
          ang[k] += (s.rng() - 0.5) * impact
          ang[k + 1] += (s.rng() - 0.5) * impact
          ang[k + 2] += (s.rng() - 0.5) * impact
        }
      }
      vel[k] -= pos[k] * PILE_PULL * dt // draws resting pieces toward the middle, forming a heap
      vel[k] *= 1 - 6 * dt // floor friction
      ang[k] *= 1 - 5 * dt
      ang[k + 1] *= 1 - 5 * dt
      ang[k + 2] *= 1 - 5 * dt
    }

    if (pos[k + 2] < -s.zMax) {
      pos[k + 2] = -s.zMax
      if (vel[k + 2] < 0) vel[k + 2] = -vel[k + 2] * 0.3
    } else if (pos[k + 2] > s.zMax) {
      pos[k + 2] = s.zMax
      if (vel[k + 2] > 0) vel[k + 2] = -vel[k + 2] * 0.3
    }
    vel[k + 2] *= 1 - 2 * dt
  }
}

/** One 3D letter of the name (optional: only when the font file loaded). */
interface Letter {
  group: THREE.Group // positions the letter; its z scale grows the body backward
  material: THREE.MeshStandardMaterial
  lineMaterial: THREE.LineBasicMaterial
  homeX: number // where the letter sits at the HTML title position (world units)
  homeY: number // ...its baseline
  offX: number // how far it is shifted while the name is centred
  offY: number
  sweepX: number // where the light sweep meets it
  revealAt: number // when its body starts to grow (just after its tiles have landed)
  fadeDelay: number // so the letters do not all dissolve at the same instant
}

interface Letters {
  root: THREE.Group
  items: Letter[]
  dispose: () => void
}

/** Builds the 3D letters, placed on the real title and shifted like the tiles so they stay together. */
function createLetters(data: FontData, targets: NameTargets, sim: Sim, width: number, height: number): Letters | null {
  const em = targets.fontPx * sim.upp // font size in world units
  const shapes = buildLetterShapes(data, targets.glyphs, em)
  if (!shapes) {
    if (import.meta.env.DEV) console.warn('[intro] 3D letters skipped: the font file lacks a letter of the title.')
    return null
  }

  const root = new THREE.Group()
  const items: Letter[] = []
  const bodyBase = new THREE.MeshStandardMaterial({
    color: LETTER_COLOR,
    metalness: 0.9,
    roughness: 0.3,
    envMapIntensity: 1.1,
    emissive: CYAN,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,
  })
  const lineBase = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0, toneMapped: false })
  const materials: THREE.Material[] = [bodyBase, lineBase]

  targets.glyphs.forEach((glyph, i) => {
    const shape = shapes.get(glyph.ch)
    if (!shape) return

    const material = bodyBase.clone()
    const lineMaterial = lineBase.clone()
    materials.push(material, lineMaterial)

    const group = new THREE.Group()
    group.visible = false
    group.add(new THREE.Mesh(shape.geometry, material), new THREE.LineSegments(shape.edges, lineMaterial))
    root.add(group)

    const homeX = (glyph.x - width / 2) * sim.upp
    const homeY = -(glyph.baseline - height / 2) * sim.upp
    const offX = sim.wordDx.get(glyph.word) ?? 0
    const centreX = homeX + 0.3 * em // roughly the middle of the letter
    const wordLeft = sim.wordMin.get(glyph.word) ?? homeX
    const u = THREE.MathUtils.clamp((centreX - wordLeft) / (sim.wordSpan.get(glyph.word) ?? 1), 0, 1)

    items.push({
      group,
      material,
      lineMaterial,
      homeX,
      homeY,
      offX,
      offY: sim.centreDy,
      sweepX: centreX + offX,
      // The letter grows once the lift-off wave has reached it and its tiles have landed.
      revealAt: CONVERGE_START + glyph.word * WORD_GAP + u * WORD_SWEEP + ARRIVE_AFTER + 0.1,
      fadeDelay: hash(i, 30) * DISSOLVE_STAGGER,
    })
  })

  let disposed = false
  return {
    root,
    items,
    dispose: () => {
      if (disposed) return
      disposed = true
      shapes.forEach((shape) => {
        shape.geometry.dispose()
        shape.edges.dispose()
      })
      materials.forEach((material) => material.dispose())
    },
  }
}

/** Moves, grows, lights and fades every 3D letter. Runs once per frame. */
function updateLetters(
  letters: Letters,
  sim: Sim,
  time: number,
  dissolveAt: number,
  glide: number,
  sweepActive: boolean,
  sweepFront: number,
  sweepWidth: number,
) {
  const z = -LETTER_FRONT_GAP * sim.radius // just behind the tiles, so the tiles always stay in front
  for (const letter of letters.items) {
    const fadeIn = smooth((time - letter.revealAt) / LETTER_FADE_IN)
    const fadeOut = smooth((time - dissolveAt - letter.fadeDelay) / DISSOLVE_LIFE)
    const alpha = fadeIn * (1 - fadeOut)

    letter.group.visible = alpha > 0.002
    if (!letter.group.visible) continue

    // Glide together with the tiles, from the centred position to the HTML title position.
    letter.group.position.set(
      letter.homeX + (1 - glide) * letter.offX,
      letter.homeY + (1 - glide) * letter.offY,
      z,
    )
    // The body grows backward from its front face.
    letter.group.scale.z = Math.max(smooth((time - letter.revealAt) / LETTER_GROW_TIME), 0.001)

    // Light sweep: the letter brightens and its edges glint as the band of light passes.
    let glow = 0
    if (sweepActive) {
      const d = (letter.sweepX - sweepFront) / sweepWidth
      glow = Math.exp(-d * d)
    }
    letter.material.opacity = alpha
    letter.material.emissiveIntensity = glow * 0.35
    letter.lineMaterial.opacity = alpha * (0.8 + 0.2 * glow)
  }
}

/** A short bump (about 0 to 1) around the moment each word has landed. */
function wordPulse(locks: Float32Array, time: number) {
  let pulse = 0
  for (let w = 0; w < locks.length; w++) {
    const x = (time - locks[w]) / 0.14
    pulse += Math.exp(-x * x)
  }
  return pulse
}

/** The slow turn of the finished name: zero before it starts and exactly zero again when the dissolve begins. */
function turnProgress(time: number) {
  return THREE.MathUtils.clamp((time - TURN_START) / (HANDOFF_START - TURN_START), 0, 1)
}
const turnYaw = (time: number) => TURN_YAW * Math.sin(Math.PI * turnProgress(time))
const turnPitch = (time: number) => TURN_PITCH * Math.sin(2 * Math.PI * turnProgress(time))

/* Reusable helpers, so we do not create new objects every frame */
const DUMMY = new THREE.Object3D()
const AXIS = new THREE.Vector3()
const DQ = new THREE.Quaternion()
const Q = new THREE.Quaternion()
const IDENTITY_Q = new THREE.Quaternion() // "facing the camera, perfectly flat"
const DRIFT_E = new THREE.Euler()
const COLOR = new THREE.Color()

export default function NameAssembly() {
  const intro = useIntroStatus()
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const shadowMesh = useRef<THREE.InstancedMesh>(null)
  const simRef = useRef<Sim | null>(null)
  const fontRef = useRef<FontData | null>(null)
  const lettersRef = useRef<Letters | null>(null)
  const [targets, setTargets] = useState<NameTargets | null>(null)
  const [retired, setRetired] = useState(false)

  // A stable function that reads the current canvas size and camera without re-running effects.
  const get = useThree((state) => state.get)

  // One hexagon tile, flat to the camera. Radius 1; each piece is scaled to size later.
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 1, 0.5, 6)
    g.rotateX(Math.PI / 2)
    return g
  }, [])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0.55,
        roughness: 0.3,
        emissive: '#0a3a4a',
        envMapIntensity: 1,
      }),
    [],
  )

  // A flat, dark copy of each tile that sits on the letter behind it: the soft shadow under the tile.
  const shadowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#02050b',
        transparent: true,
        opacity: TILE_SHADOW_OPACITY,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
      shadowMaterial.dispose()
    }
  }, [geometry, material, shadowMaterial])

  // Read the real hero title from the page and get the landing spots for the pieces.
  useEffect(() => {
    if (intro !== 'playing') return
    let cancelled = false
    const small = get().size.width < 900
    // Fewer tiles on devices that report few CPU cores.
    const weak = (navigator.hardwareConcurrency || 8) <= 4
    const count = Math.round((small ? NARROW_PIECES : DESKTOP_PIECES) * (weak ? WEAK_DEVICE_FACTOR : 1))
    // The font file is only downloaded when the 3D letters are switched on.
    const fontRequest = USE_3D_LETTERS ? loadNameFont() : Promise.resolve<FontData | null>(null)
    void Promise.all([computeNameTargets(count), fontRequest]).then(([result, fontData]) => {
      if (cancelled) return
      fontRef.current = fontData // null if switched off or the font file is missing: the intro then runs with tiles only
      if (USE_3D_LETTERS && !fontData && import.meta.env.DEV) {
        console.warn('[intro] 3D letters skipped: the font file could not be loaded.')
      }
      setTargets(result)
    })
    return () => {
      cancelled = true
    }
  }, [intro, get])

  // Create the simulation (and the optional 3D letters) once the landing spots are known.
  useLayoutEffect(() => {
    const parent = group.current
    if (!mesh.current || !parent || !targets) return
    const { size, camera, gl, scene } = get()
    const cam = camera as THREE.PerspectiveCamera
    const sim = createSim(targets, size.width, size.height, cam.fov, cam.position.z)
    simRef.current = sim
    introControl.started = true

    const letters =
      USE_3D_LETTERS && fontRef.current
        ? createLetters(fontRef.current, targets, sim, size.width, size.height)
        : null
    lettersRef.current = letters
    if (letters) {
      parent.add(letters.root)
      // Compile the letters' shaders now, in the background. Otherwise the browser does it the
      // moment the first letter appears, which shows up as a short freeze while the tiles merge.
      void gl.compileAsync(scene, camera).catch(() => {})
    }

    return () => {
      if (letters) {
        parent.remove(letters.root)
        letters.dispose()
      }
      lettersRef.current = null
    }
  }, [targets, get])

  // Once everything has dissolved, free the memory used by the 3D letters.
  useEffect(() => {
    if (retired) lettersRef.current?.dispose()
  }, [retired])

  useFrame((_, delta) => {
    const m = mesh.current
    const sim = simRef.current
    if (!m || !sim) return

    const frameDt = Math.min(delta, 0.05)

    // Development only: report any frame that took long enough to be seen as a stutter.
    if (import.meta.env.DEV && delta > 0.09 && sim.time > 0.2) {
      console.warn(`[intro] slow frame: ${Math.round(delta * 1000)} ms at ${sim.time.toFixed(2)} s`)
    }

    // Run the physics in small fixed steps.
    sim.acc += frameDt
    let steps = 0
    while (sim.acc >= STEP && steps < MAX_STEPS) {
      stepSim(sim, STEP)
      sim.acc -= STEP
      sim.time += STEP
      steps++
    }
    if (steps === MAX_STEPS) sim.acc = 0

    const time = sim.time

    // If the visitor asked to skip, start the dissolve right now.
    if (introControl.skip && sim.dissolveAt > time) sim.dissolveAt = time
    const dissolveAt = sim.dissolveAt

    // As the pieces dissolve, the core fades in and the real title starts to appear.
    if (time >= dissolveAt) introVisual.core = 1
    if (!sim.heroShown && time >= dissolveAt + HERO_DELAY) {
      sim.heroShown = true
      finishIntro()
    }

    // Slow push-in: the name starts a little farther away and ends exactly at z = 0,
    // the depth where it lines up perfectly with the HTML title.
    const g = group.current
    if (g) {
      const p = THREE.MathUtils.clamp((time - 1) / 5.5, 0, 1)
      g.position.z = -0.4 * Math.pow(1 - p, 3)

      // While the finished name is held it turns very slightly, so its thickness and bevels catch the light.
      // The turn starts and ends at zero, so the name is square-on again when it docks on the HTML title.
      g.rotation.y = turnYaw(time)
      g.rotation.x = turnPitch(time)
      // Each word locking in gives the whole name a tiny thump.
      g.scale.setScalar(1 + WORD_PULSE * wordPulse(sim.wordLock, time))
    }

    // The finished name glides from the middle of the screen to where the HTML title sits.
    // (If the visitor skips, the glide freezes where it is while the pieces dissolve.)
    const glide = smooth((Math.min(time, dissolveAt) - GLIDE_START) / GLIDE_TIME)

    // The band of light that crosses the finished name from left to right.
    const sweepU = (time - SWEEP_START) / SWEEP_TIME
    const sweepActive = sweepU > 0 && sweepU < 1
    const span = sim.maxX - sim.minX || 1
    const sweepFront = sim.minX - span * 0.15 + span * 1.3 * sweepU
    const sweepWidth = span * 0.09

    const spinFade = Math.exp(-0.3 * frameDt)
    const flightSpinFade = Math.exp(-4 * frameDt)

    // Tile shadows only make sense when there is a 3D letter behind the tiles to receive them.
    const shadow = lettersRef.current && TILE_SHADOW_OPACITY > 0 ? shadowMesh.current : null
    const shadowZ = (0.06 - LETTER_FRONT_GAP) * sim.radius // just in front of the letters' front face

    for (let i = 0; i < sim.n; i++) {
      const k = i * 3

      // How far through its dissolve is this piece? (0 = not started, 1 = gone)
      const dissolve = smooth(
        (time - dissolveAt - hash(i, 20) * DISSOLVE_STAGGER) / DISSOLVE_LIFE,
      )

      // Not started falling yet, or already dissolved: keep the piece invisible.
      if (sim.delay[i] > time || dissolve >= 1) {
        DUMMY.position.set(0, 0, 0)
        DUMMY.quaternion.identity()
        DUMMY.scale.setScalar(0)
        DUMMY.updateMatrix()
        m.setMatrixAt(i, DUMMY.matrix)
        if (shadow) shadow.setMatrixAt(i, DUMMY.matrix)
        continue
      }

      const flight = time - sim.launch[i] // negative until the piece lifts off
      const flying = flight > 0
      const blend = flying ? smooth(flight / 0.7) : 0

      // Turn the piece by its spin speed.
      const q = i * 4
      Q.set(sim.quat[q], sim.quat[q + 1], sim.quat[q + 2], sim.quat[q + 3])
      const wx = sim.ang[k]
      const wy = sim.ang[k + 1]
      const wz = sim.ang[k + 2]
      const speed = Math.sqrt(wx * wx + wy * wy + wz * wz)
      if (speed > 1e-4) {
        AXIS.set(wx / speed, wy / speed, wz / speed)
        DQ.setFromAxisAngle(AXIS, speed * frameDt)
        Q.premultiply(DQ).normalize()
      }
      // Flying pieces lose their spin quickly and turn flat to face the camera.
      if (flying) Q.slerp(IDENTITY_Q, 1 - Math.exp(-(1.5 + 7 * blend) * frameDt))
      sim.quat[q] = Q.x
      sim.quat[q + 1] = Q.y
      sim.quat[q + 2] = Q.z
      sim.quat[q + 3] = Q.w
      const fade = flying ? flightSpinFade : spinFade
      sim.ang[k] *= fade
      sim.ang[k + 1] *= fade
      sim.ang[k + 2] *= fade

      // Light sweep: how strongly is the band of light hitting this piece right now?
      let sweepGlow = 0
      if (sweepActive) {
        const d = (sim.target[i * 2] - sweepFront) / sweepWidth
        sweepGlow = Math.exp(-d * d)
      }

      // After arriving, every piece keeps a tiny drift and tilt.
      let px = sim.pos[k] + glide * sim.glide[i * 2]
      let py = sim.pos[k + 1] + glide * sim.glide[i * 2 + 1]
      let pz = sim.pos[k + 2]
      DUMMY.quaternion.copy(Q)
      const settle = smooth((flight - ARRIVE_AFTER) / 1.2)
      if (settle > 0 || sweepGlow > 0.01) {
        const a = sim.radius * 0.35 * settle
        px += Math.sin(time * 0.9 + sim.phase[k]) * a * 0.6
        py += Math.sin(time * 0.7 + sim.phase[k + 1]) * a * 0.6
        pz += Math.sin(time * 1.1 + sim.phase[k + 2]) * a * 2
        // Pieces tilt a little as the light passes, so they catch it.
        DRIFT_E.set(
          Math.sin(time * 0.8 + sim.phase[k + 1]) * 0.09 * settle,
          Math.sin(time * 0.6 + sim.phase[k + 2]) * 0.09 * settle + sweepGlow * SWEEP_TILT,
          0,
        )
        DQ.setFromEuler(DRIFT_E)
        DUMMY.quaternion.multiply(DQ)
      }

      // Dissolve: pieces shrink into sparks that drift up and toward the camera.
      if (dissolve > 0) {
        px += (hash(i, 21) - 0.5) * 0.5 * dissolve
        py += (0.15 + hash(i, 22) * 0.3) * dissolve
        pz += 0.4 * dissolve
      }

      DUMMY.position.set(px, py, pz)
      DUMMY.scale.setScalar(sim.radius * (1 - dissolve))
      DUMMY.updateMatrix()
      m.setMatrixAt(i, DUMMY.matrix)

      // The shadow grows as the tile settles onto its letter and shrinks as the tile dissolves.
      if (shadow) {
        const grow = smooth((flight - ARRIVE_AFTER - 0.1) / 0.5) * (1 - dissolve)
        DUMMY.position.set(px + SHADOW_DX * sim.radius, py + SHADOW_DY * sim.radius, shadowZ)
        DUMMY.quaternion.identity()
        DUMMY.scale.set(sim.radius * 1.05 * grow, sim.radius * 1.05 * grow, sim.radius * 0.05)
        DUMMY.updateMatrix()
        shadow.setMatrixAt(i, DUMMY.matrix)
      }

      // Glow: a short "charge" just before the tile lifts off (so each word visibly wakes up in turn),
      // a flash when it arrives, the light sweep, and a spark-like glow while dissolving.
      const charge = flying ? 0 : smooth((flight + CHARGE_TIME) / CHARGE_TIME)
      const x = (flight - ARRIVE_AFTER) / 0.45
      const glow = Math.exp(-x * x) + sweepGlow * SWEEP_GLOW + dissolve * 0.8 + charge * 0.5
      COLOR.setRGB(sim.base[k], sim.base[k + 1], sim.base[k + 2])
      if (glow > 0.01) COLOR.lerp(FLASH, Math.min(glow, 1) * 0.8).multiplyScalar(1 + glow * 1.2)
      m.setColorAt(i, COLOR)
    }

    const letters = lettersRef.current
    if (letters) updateLetters(letters, sim, time, dissolveAt, glide, sweepActive, sweepFront, sweepWidth)

    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    if (shadow) shadow.instanceMatrix.needsUpdate = true

    // Everything has dissolved: remove the pieces from the scene.
    if (!sim.retired && time >= dissolveAt + DISSOLVE_STAGGER + DISSOLVE_LIFE + 0.1) {
      sim.retired = true
      setRetired(true)
    }
  })

  if (retired || !targets) return null

  return (
    <group ref={group}>
      {USE_3D_LETTERS && (
        <instancedMesh
          ref={shadowMesh}
          args={[geometry, shadowMaterial, targets.points.length]}
          frustumCulled={false}
          renderOrder={1}
        />
      )}
      <instancedMesh
        ref={mesh}
        args={[geometry, material, targets.points.length]}
        frustumCulled={false}
      />
    </group>
  )
}