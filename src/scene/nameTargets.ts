/** One spot where a 3D piece will land. */
export interface NameTarget {
  /** Position in CSS pixels, measured from the top-left of the browser window. */
  x: number
  y: number
  /** Which word this point belongs to: 0 = MD, 1 = KAZOL, 2 = HOSEN. */
  word: number
}

/** One letter of the real title, measured on the page. */
export interface NameGlyph {
  ch: string
  /** Left edge of the letter, in CSS pixels from the left of the window (includes kerning and letter-spacing). */
  x: number
  /** The line the letter sits on, in CSS pixels from the top of the window. */
  baseline: number
  /** Which word the letter belongs to (same numbering as NameTarget.word). */
  word: number
}

export interface NameTargets {
  points: NameTarget[]
  /** Average distance between neighbouring points, in CSS pixels. */
  spacing: number
  viewportWidth: number
  viewportHeight: number
  /** Every letter of the title, for the optional 3D letters. */
  glyphs: NameGlyph[]
  /** Font size of the title, in CSS pixels. */
  fontPx: number
}

/** Extra empty border around each word, so letter edges are never cut off. */
const PAD = 8

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

/** The hero only mounts after the content has loaded, so wait for its words to exist. */
async function waitForWords(timeoutMs = 10000): Promise<HTMLElement[]> {
  const start = performance.now()
  while (performance.now() - start < timeoutMs) {
    const words = Array.from(document.querySelectorAll<HTMLElement>('.hero__word'))
    if (words.length > 0) return words
    await nextFrame()
  }
  return []
}

/** Make sure the real title font (Space Grotesk) is loaded before we draw with it. */
async function waitForFont(word: HTMLElement) {
  const cs = getComputedStyle(word)
  try {
    await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`)
    await document.fonts.ready
  } catch {
    // If font loading fails we still continue with the fallback font.
  }
}

interface Raster {
  data: Uint8ClampedArray
  width: number
  height: number
  /** Where this small canvas sits on the screen (CSS pixels). */
  originX: number
  originY: number
}

/** Draws one word onto a hidden canvas, exactly as the browser draws the real title. */
function rasterizeWord(el: HTMLElement): Raster | null {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null

  const cs = getComputedStyle(el)
  const width = Math.ceil(rect.width) + PAD * 2
  const height = Math.ceil(rect.height) + PAD * 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing

  // CSS centres the text inside its line box; we copy that to find the baseline.
  const metrics = ctx.measureText('Hg')
  const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent
  const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent
  const baseline = PAD + (rect.height - (ascent + descent)) / 2 + ascent

  ctx.fillText(el.textContent ?? '', PAD, baseline)

  return {
    data: ctx.getImageData(0, 0, width, height).data,
    width,
    height,
    originX: rect.left - PAD,
    originY: rect.top - PAD,
  }
}

/** Reads where the browser has put every letter of every word (so kerning and letter-spacing are exact). */
function measureGlyphs(words: HTMLElement[]): NameGlyph[] {
  const glyphs: NameGlyph[] = []
  const range = document.createRange()

  words.forEach((word, wordIndex) => {
    const node = word.firstChild
    if (!node || node.nodeType !== Node.TEXT_NODE) return
    const text = node.textContent ?? ''

    // Left edge of every letter.
    const found: { ch: string; x: number }[] = []
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      found.push({ ch: text[i], x: range.getBoundingClientRect().left })
    }

    // The baseline: an empty zero-size box sits exactly on it. It is removed again straight away.
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0;'
    word.appendChild(probe)
    const baseline = probe.getBoundingClientRect().bottom
    word.removeChild(probe)

    for (const f of found) glyphs.push({ ch: f.ch, x: f.x, baseline, word: wordIndex })
  })

  return glyphs
}

/** Counts how many pixels of the word are filled in (used to size the spacing). */
function filledArea(raster: Raster): number {
  let count = 0
  for (let i = 3; i < raster.data.length; i += 4) {
    if (raster.data[i] > 128) count++
  }
  return count
}

/** Lays a staggered (hexagon-style) grid over every word and keeps the points inside letters. */
function samplePoints(rasters: (Raster | null)[], spacing: number): NameTarget[] {
  const points: NameTarget[] = []
  const rowHeight = spacing * 0.866

  rasters.forEach((raster, word) => {
    if (!raster) return
    let row = 0
    for (let y = spacing / 2; y < raster.height; y += rowHeight, row++) {
      const offset = row % 2 === 1 ? spacing / 2 : 0
      for (let x = spacing / 2 + offset; x < raster.width; x += spacing) {
        const px = Math.round(x)
        const py = Math.round(y)
        if (px >= raster.width || py >= raster.height) continue
        const alpha = raster.data[(py * raster.width + px) * 4 + 3]
        if (alpha > 128) {
          points.push({ x: raster.originX + x, y: raster.originY + y, word })
        }
      }
    }
  })

  return points
}

/**
 * Reads the real hero title from the page and returns about `targetCount`
 * evenly spaced points that fill the letters of "MD KAZOL HOSEN".
 */
export async function computeNameTargets(targetCount: number): Promise<NameTargets | null> {
  const words = await waitForWords()
  if (words.length === 0) return null

  await waitForFont(words[0])
  await nextFrame() // let the page re-layout after the font swap
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

  const glyphs = measureGlyphs(words)
  const fontPx = parseFloat(getComputedStyle(words[0]).fontSize)
  const rasters = words.map(rasterizeWord)
  const area = rasters.reduce((sum, r) => sum + (r ? filledArea(r) : 0), 0)
  if (area === 0) return null

  // Guess a spacing, then nudge it a few times until we land close to targetCount.
  let spacing = Math.sqrt(area / (0.866 * targetCount))
  let points = samplePoints(rasters, spacing)
  for (let i = 0; i < 6; i++) {
    if (Math.abs(points.length - targetCount) / targetCount < 0.04) break
    spacing *= Math.sqrt(Math.max(points.length, 1) / targetCount)
    points = samplePoints(rasters, spacing)
  }

  return {
    points,
    spacing,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    glyphs,
    fontPx,
  }
}