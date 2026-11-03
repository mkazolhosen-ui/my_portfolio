import * as THREE from 'three'
import { Font, type FontData } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import type { NameGlyph } from './nameTargets'

/* ---------- Look of the 3D letters: change these to tune ---------- */
export const LETTER_COLOR = '#7f9fb3' // body colour (a gunmetal blue-grey, darker than the ice-white tiles)
const LETTER_DEPTH = 0.10 // thickness of the letters, as a fraction of the font size
const LETTER_BEVEL_THICKNESS = 0.012 // how much the front edge is rounded off (depth)
const LETTER_BEVEL_SIZE = 0.009 // ...and (width)

const FONT_URL = `${import.meta.env.BASE_URL}fonts/space-grotesk-700-name.typeface.json`

/**
 * Downloads the small letter-shape file (about 4 KB). Gives back null if it is missing or slow,
 * so the intro simply runs with tiles only.
 */
export async function loadNameFont(timeoutMs = 2000): Promise<FontData | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(FONT_URL, { signal: controller.signal })
    if (!response.ok) return null
    return (await response.json()) as FontData
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

export interface LetterShape {
  geometry: THREE.BufferGeometry
  /** Thin lines along the letter's edges. */
  edges: THREE.BufferGeometry
}

/**
 * Builds one 3D shape per different letter of the title. `em` is the font size in world units.
 * The front face of every shape sits at z = 0 and the body extends backward (negative z).
 * Gives back null if the font file lacks any letter of the title (for example after the name
 * was edited), so the caller falls back to tiles only.
 */
export function buildLetterShapes(
  data: FontData,
  glyphs: NameGlyph[],
  em: number,
): Map<string, LetterShape> | null {
  if (glyphs.length === 0 || glyphs.some((g) => !(g.ch in data.glyphs))) return null

  const font = new Font(data)
  const shapes = new Map<string, LetterShape>()
  for (const glyph of glyphs) {
    if (shapes.has(glyph.ch)) continue
    const geometry = new TextGeometry(glyph.ch, {
      font,
      size: em,
      depth: em * LETTER_DEPTH,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: em * LETTER_BEVEL_THICKNESS,
      bevelSize: em * LETTER_BEVEL_SIZE,
      bevelSegments: 2,
    })
    geometry.computeBoundingBox()
    geometry.translate(0, 0, -(geometry.boundingBox?.max.z ?? 0))
    shapes.set(glyph.ch, { geometry, edges: new THREE.EdgesGeometry(geometry, 35) })
  }
  return shapes
}