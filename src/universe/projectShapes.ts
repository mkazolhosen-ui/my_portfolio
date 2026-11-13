import * as THREE from 'three'
import { SHAPE_COUNT } from './projectIdentity'

/** One silhouette: the solid geometry and its outline. Shared by every project that uses it. */
export interface ShapeKit {
  geometry: THREE.BufferGeometry
  edges: THREE.BufferGeometry
}

/*
 * Low polygon counts on purpose: eight projects should cost almost nothing to draw.
 * Sizes are tuned so every shape looks about equally big next to the others.
 */
const BUILDERS: (() => THREE.BufferGeometry)[] = [
  () => new THREE.IcosahedronGeometry(0.34, 1),
  () => new THREE.OctahedronGeometry(0.42, 0),
  () => new THREE.DodecahedronGeometry(0.36, 0),
  () => new THREE.BoxGeometry(0.46, 0.46, 0.46),
  () => new THREE.TetrahedronGeometry(0.46, 0),
  () => new THREE.TorusGeometry(0.28, 0.1, 10, 24),
  () => new THREE.CylinderGeometry(0.3, 0.3, 0.52, 6),
  () => new THREE.TorusKnotGeometry(0.22, 0.07, 56, 8, 2, 3),
  () => new THREE.ConeGeometry(0.32, 0.6, 4),
  () => new THREE.CapsuleGeometry(0.16, 0.3, 2, 8),
  () => new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16),
  () => new THREE.TorusGeometry(0.3, 0.09, 6, 3),
  () => new THREE.TorusKnotGeometry(0.2, 0.06, 72, 8, 3, 4),
  () => new THREE.BoxGeometry(0.28, 0.28, 0.62),
]

if (BUILDERS.length !== SHAPE_COUNT) {
  throw new Error('projectShapes.ts and SHAPE_COUNT in projectIdentity.ts disagree.')
}

/** Builds the geometry for one shape. The caller owns it and must dispose it. */
export function createShapeKit(shape: number): ShapeKit {
  const geometry = BUILDERS[shape % BUILDERS.length]()
  return { geometry, edges: new THREE.EdgesGeometry(geometry) }
}