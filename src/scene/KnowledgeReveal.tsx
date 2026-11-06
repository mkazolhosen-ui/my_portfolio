import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getKnowledgeFacts } from '../knowledge/knowledgeStore'
import KnowledgeEngine, { pickAnchors } from './knowledgeEngine'
import { KNOWLEDGE_DEBUG, startKnowledgeDebug } from './knowledgeDebug'
import '../styles/knowledge.css'

/** How many spots on the core can show a fact (only a few are visible at once). */
const SLOT_COUNT = 10

interface KnowledgeRevealProps {
  /** The geometry whose vertices are the glowing nodes (the core's outer net). */
  geometry: THREE.BufferGeometry
  /** False for reduced motion: nothing is created at all. */
  animate: boolean
}

/** Render this inside the core's rotating group so the nodes the facts emerge from follow the core. */
export default function KnowledgeReveal({ geometry, animate }: KnowledgeRevealProps) {
  const anchorGroup = useRef<THREE.Group>(null)
  const engine = useRef<KnowledgeEngine | null>(null)

  useEffect(() => {
    if (!animate) return

    // The labels live on their own layer above the page, so they are never hidden behind text.
    const instance = new KnowledgeEngine(
      document.body,
      pickAnchors(geometry, SLOT_COUNT),
      getKnowledgeFacts,
    )
    engine.current = instance

    let stopDebug: (() => void) | null = null
    if (KNOWLEDGE_DEBUG) {
      instance.keepOnOverlap = true
      stopDebug = startKnowledgeDebug(() => instance.debugInfo())
    }

    return () => {
      stopDebug?.()
      instance.dispose()
      engine.current = null
    }
  }, [animate, geometry])

  useFrame((state) => {
    const group = anchorGroup.current
    const instance = engine.current
    const camera = state.camera
    if (!group || !instance || !(camera instanceof THREE.PerspectiveCamera)) return

    instance.update({
      now: state.clock.elapsedTime,
      camera,
      width: state.size.width,
      height: state.size.height,
      group,
    })
  })

  return <group ref={anchorGroup} />
}