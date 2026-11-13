import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { ProjectIdentity } from './projectIdentity'
import { createShapeKit, type ShapeKit } from './projectShapes'
import { LOW_POWER } from './universeFlags'
import { FOCUS_DAMPING, FOCUS_PUSH, getFocusOffset } from './universeFocus'
import { LAYOUT_HALF_WIDTH, getNodePositions } from './universeLayout'
import { createQualityGovernor } from './universeQuality'
import { universeState, type QualityTier } from './universeState'

const CYAN = '#27e8ff'
const ICE = '#9fd4ff'
/** The tints a project can have, all inside the cyan and ice palette. Order matches `identity.tint`. */
const TINTS = [CYAN, ICE, '#6fa8ff']

const CAMERA_Z = 8
const FOV = 38
/** Half the visible height at the hub's distance, used to fit the scene into narrow frames. */
const HALF_HEIGHT = CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
const SELECTED_SCALE = 1.35
const HOVER_SCALE = 1.15
/** At the start of the scroll entrance the nodes sit this fraction of the way out from the hub. */
const ENTRANCE_SPREAD_START = 0.35
/** At the start of the scroll entrance the whole scene is this far behind its final place. */
const ENTRANCE_PULLBACK = 1.2

/** Starts quickly and settles gently. */
function easeOutCubic(p: number) {
  const q = 1 - Math.min(Math.max(p, 0), 1)
  return 1 - q * q * q
}

/** Orientations of the thin orbit rings a project can have (first ring, second ring). */
const RING_ROTATIONS: [number, number, number][] = [
  [Math.PI / 2.2, 0.3, 0],
  [Math.PI / 3, -0.8, 0.4],
]

interface SceneProps {
  /** One identity per project, in list order. */
  identities: ProjectIdentity[]
  /** Index of the selected project, or null. */
  selected: number | null
  /** True when the visitor prefers reduced motion: nothing moves on its own. */
  reducedMotion: boolean
  /** Called when a project node is clicked or tapped. */
  onSelect: (index: number) => void
  /** Called when empty stage space is clicked or tapped. */
  onOverview: () => void
  /** Called when the mouse enters a node (its index) or leaves it (null). */
  onHover: (index: number | null) => void
}

function Scene({ identities, selected, reducedMotion, onSelect, onHover }: Omit<SceneProps, 'onOverview'>) {
  const invalidate = useThree((state) => state.invalidate)
  const root = useRef<THREE.Group>(null)
  const hub = useRef<THREE.LineSegments>(null)
  const links = useRef<THREE.LineSegments>(null)
  const nodes = useRef<(THREE.Group | null)[]>([])
  const spinners = useRef<(THREE.Group | null)[]>([])
  const [hovered, setHovered] = useState<number | null>(null)
  // Which node the mouse is over right now, kept in step with `hovered` but safe to read in handlers.
  const hoverRef = useRef<number | null>(null)

  const count = identities.length
  const positions = useMemo(() => getNodePositions(count), [count])

  // Only the shapes that projects actually use are built, and each is shared by all projects using it.
  const kits = useMemo(() => {
    const map = new Map<number, ShapeKit>()
    for (const identity of identities) {
      if (!map.has(identity.shape)) map.set(identity.shape, createShapeKit(identity.shape))
    }
    return map
  }, [identities])

  const hubGeometry = useMemo(() => new THREE.OctahedronGeometry(0.6, 0), [])
  const hubEdges = useMemo(() => new THREE.EdgesGeometry(hubGeometry), [hubGeometry])
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(0.62, 0.008, 6, 72), [])
  // A bigger invisible ball around each node, so small nodes are easy to hit with the mouse or a finger.
  const hitGeometry = useMemo(() => new THREE.SphereGeometry(0.62, 8, 6), [])
  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), [])

  // All the links from the hub to the nodes, drawn as one object.
  const linkGeometry = useMemo(() => {
    const points: number[] = []
    for (const p of positions) points.push(0, 0, 0, p[0], p[1], p[2])
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [positions])

  // A small fixed set of materials, shared by every project (one per tint, plus one for "selected").
  const idleMaterials = useMemo(
    () =>
      TINTS.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color: '#dff3ff',
            metalness: 0.3,
            roughness: 0.4,
            flatShading: true,
            emissive: color,
            emissiveIntensity: 0.18,
          }),
      ),
    [],
  )
  const selectedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0.3,
        roughness: 0.35,
        flatShading: true,
        emissive: CYAN,
        emissiveIntensity: 0.9,
      }),
    [],
  )
  const hoverMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eaffff',
        metalness: 0.3,
        roughness: 0.35,
        flatShading: true,
        emissive: CYAN,
        emissiveIntensity: 0.55,
      }),
    [],
  )
  const edgeMaterials = useMemo(
    () =>
      TINTS.map(
        (color) =>
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
      ),
    [],
  )
  const ringMaterials = useMemo(
    () =>
      TINTS.map(
        (color) =>
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, toneMapped: false }),
      ),
    [],
  )
  const linkMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.3, toneMapped: false }),
    [],
  )

  // Free GPU memory when the stage goes away (for example when the window gets narrow).
  useEffect(() => {
    return () => {
      kits.forEach((kit) => {
        kit.geometry.dispose()
        kit.edges.dispose()
      })
    }
  }, [kits])
  useEffect(() => {
    return () => {
      hubGeometry.dispose()
      hubEdges.dispose()
      ringGeometry.dispose()
      hitGeometry.dispose()
      hitMaterial.dispose()
      hoverMaterial.dispose()
      idleMaterials.forEach((material) => material.dispose())
      selectedMaterial.dispose()
      edgeMaterials.forEach((material) => material.dispose())
      ringMaterials.forEach((material) => material.dispose())
      linkMaterial.dispose()
    }
  }, [
    hubGeometry,
    hubEdges,
    ringGeometry,
    hitGeometry,
    hitMaterial,
    hoverMaterial,
    idleMaterials,
    selectedMaterial,
    edgeMaterials,
    ringMaterials,
    linkMaterial,
  ])
  useEffect(() => {
    return () => linkGeometry.dispose()
  }, [linkGeometry])

  // With reduced motion the canvas only draws on request, so ask for a frame on every change.
  useEffect(() => {
    invalidate()
  }, [selected, hovered, identities, invalidate])

  function handleOver(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    // Fingers do not hover: a tap selects instead.
    if (event.nativeEvent.pointerType === 'touch') return
    hoverRef.current = index
    setHovered(index)
    onHover(index)
  }

  function handleOut(index: number) {
    // Ignore a late "out" from a node the mouse has already left for another one.
    if (hoverRef.current !== index) return
    hoverRef.current = null
    setHovered(null)
    onHover(null)
  }

  function handleClick(event: ThreeEvent<MouseEvent>, index: number) {
    event.stopPropagation()
    onSelect(index)
  }

  useFrame((state, delta) => {
    const group = root.current
    if (!group) return
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime

    // Keep the whole arrangement inside the frame, even when the frame is narrow.
    const aspect = state.size.width / Math.max(state.size.height, 1)
    const fit = Math.min(1, (aspect * HALF_HEIGHT) / LAYOUT_HALF_WIDTH)
    group.scale.setScalar(fit)

    // Scroll entrance (1 = fully in place; always 1 with reduced motion).
    const entrance = reducedMotion ? 1 : easeOutCubic(universeState.entrance)
    const spread = ENTRANCE_SPREAD_START + (1 - ENTRANCE_SPREAD_START) * entrance
    const pullback = (1 - entrance) * ENTRANCE_PULLBACK

    // Camera focus: bring the selected project toward the camera (no travel with reduced motion).
    const focusNode = selected !== null && !reducedMotion ? positions[selected] : undefined
    const [fx, fy, fz] = focusNode ? getFocusOffset(focusNode, fit) : [0, 0, 0]
    if (reducedMotion) {
      group.position.set(0, 0, 0)
    } else {
      group.position.x = THREE.MathUtils.damp(group.position.x, fx, FOCUS_DAMPING, d)
      group.position.y = THREE.MathUtils.damp(group.position.y, fy, FOCUS_DAMPING, d)
      group.position.z = THREE.MathUtils.damp(group.position.z, fz - pullback, FOCUS_DAMPING, d)
    }

    if (!reducedMotion) {
      // The gentle sway fades out as the scene moves in, so the focused project stays centred.
      const sway = 1 - Math.min(1, Math.abs(group.position.z + pullback) / FOCUS_PUSH)
      group.rotation.y = Math.sin(t * 0.25) * 0.12 * sway
      if (hub.current) {
        hub.current.rotation.y += d * 0.4
        hub.current.rotation.x += d * 0.15
      }
    }
    // The hub and its links grow outward together with the nodes.
    hub.current?.scale.setScalar(0.5 + 0.5 * entrance)
    links.current?.scale.setScalar(spread)

    nodes.current.forEach((node, i) => {
      const base = positions[i]
      if (!node || !base) return
      const target =
        (selected === i ? SELECTED_SCALE : hovered === i ? HOVER_SCALE : 1) * (0.6 + 0.4 * entrance)
      if (reducedMotion) {
        node.scale.setScalar(target)
        node.position.set(base[0], base[1], base[2])
      } else {
        node.scale.setScalar(THREE.MathUtils.damp(node.scale.x, target, 6, d))
        node.position.set(
          base[0] * spread,
          base[1] * spread + Math.sin(t * 0.8 + i * 1.7) * 0.08,
          base[2] * spread,
        )
      }
    })

    // Each project turns slowly at its own speed (still with reduced motion).
    if (!reducedMotion) {
      spinners.current.forEach((spinner, i) => {
        const identity = identities[i]
        if (spinner && identity) spinner.rotation.y += identity.spin * d
      })
    }
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 3, 5]} color={CYAN} intensity={60} distance={25} />
      <pointLight position={[-5, -2, 4]} color={ICE} intensity={40} distance={25} />

      <group ref={root}>
        <lineSegments ref={hub} geometry={hubEdges} material={edgeMaterials[0]} />
        <lineSegments ref={links} geometry={linkGeometry} material={linkMaterial} />

        {positions.map((position, i) => {
          const identity = identities[i]
          const kit = identity ? kits.get(identity.shape) : undefined
          if (!identity || !kit) return null
          return (
            <group
              key={`${i}-${identity.key}`}
              ref={(el) => {
                nodes.current[i] = el
              }}
              position={position}
              onPointerOver={(event) => handleOver(event, i)}
              onPointerOut={() => handleOut(i)}
              onClick={(event) => handleClick(event, i)}
            >
              <mesh visible={false} geometry={hitGeometry} material={hitMaterial} />
              <group
                ref={(el) => {
                  spinners.current[i] = el
                }}
                rotation={[identity.tiltX, identity.tiltY, 0]}
              >
                <mesh
                  geometry={kit.geometry}
                  material={
                    selected === i
                      ? selectedMaterial
                      : hovered === i
                        ? hoverMaterial
                        : idleMaterials[identity.tint]
                  }
                />
                <lineSegments
                  geometry={kit.edges}
                  material={edgeMaterials[identity.tint]}
                  scale={1.003}
                />
                {RING_ROTATIONS.slice(0, identity.rings).map((rotation, r) => (
                  <mesh
                    key={r}
                    geometry={ringGeometry}
                    material={ringMaterials[identity.tint]}
                    rotation={rotation}
                  />
                ))}
              </group>
            </group>
          )
        })}
      </group>
    </>
  )
}

interface UniverseCanvasProps extends SceneProps {
  /** False while the stage is off screen: the canvas stops drawing and costs nothing. */
  active: boolean
  /** Called when the stage lowers its own quality because frames are consistently slow. */
  onQuality: (tier: QualityTier) => void
}

/** Feeds every drawn frame to the quality governor, which decides when to hold back. */
function QualityMonitor({
  governor,
  onTier,
}: {
  governor: ReturnType<typeof createQualityGovernor>
  onTier: (tier: QualityTier) => void
}) {
  useFrame((state, delta) => {
    const next = governor.update(state.clock.elapsedTime, delta, state.viewport.dpr > 1)
    if (next !== null) onTier(next)
  })
  return null
}

const START_TIER: QualityTier = LOW_POWER ? 2 : 0

/** The 3D stage. Loaded lazily, and only drawn while it is on screen. */
export default function UniverseCanvas({
  identities,
  selected,
  reducedMotion,
  active,
  onSelect,
  onOverview,
  onHover,
  onQuality,
}: UniverseCanvasProps) {
  const [tier, setTier] = useState<QualityTier>(START_TIER)
  const governor = useMemo(() => createQualityGovernor(START_TIER), [])
  // Calm mode behaves like reduced motion: still, instant changes, and it only draws when needed.
  const still = reducedMotion || tier >= 2

  function lowerQuality(next: QualityTier) {
    setTier(next)
    onQuality(next)
  }

  return (
    <Canvas
      frameloop={still ? 'demand' : active ? 'always' : 'never'}
      camera={{ position: [0, 0.5, CAMERA_Z], fov: FOV, near: 0.1, far: 40 }}
      dpr={tier >= 1 ? 1 : [1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      onPointerMissed={onOverview}
    >
      <Scene
        identities={identities}
        selected={selected}
        reducedMotion={still}
        onSelect={onSelect}
        onHover={onHover}
      />
      <QualityMonitor governor={governor} onTier={lowerQuality} />
    </Canvas>
  )
}