import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import usePointer from '../hooks/usePointer'
import { EnergyShell, FilamentNet } from './CoreShaders'
import { scrollState } from './scrollState'
import { introVisual } from './introState'
import CoreDragControls from './CoreDragControls'
import { dragState, MAX_PITCH } from './dragState'
import KnowledgeReveal from './KnowledgeReveal'

const CYAN = '#27e8ff'
const ICE = '#9fd4ff'

/** How quickly a released spin slows down (higher stops sooner). */
const DRAG_FRICTION = 3.2
/** How much the core leans toward the mouse pointer: 0 = not at all, 1 = the original amount. */
const MOUSE_TILT = 1
/** The core's own slow spin, in radians per second (about 0.3 is a turn every 21 seconds). */
const IDLE_SPIN_Y = 0.2
const IDLE_SPIN_X = 0.05
/** Orbit-ring tumble speeds, in radians per second (negative tumbles the other way). */
const RING_SPIN = { a: 0.22, b: -0.16, c: 0.12 }

interface CyberCoreProps {
  /** When false (reduced motion), the core is placed once and never moves. */
  animate: boolean
}

export default function CyberCore({ animate }: CyberCoreProps) {
  const root = useRef<THREE.Group>(null)
  const core = useRef<THREE.Group>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const ringC = useRef<THREE.Mesh>(null)
  const pointer = usePointer()
  /** 1 = mouse-position tilt fully on, 0 = off (while dragging). */
  const tiltMix = useRef(1)
  // Fades the core in after the name intro (0 = hidden, 1 = visible).
  const reveal = useRef(introVisual.core)

  const coreGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.2, 1), [])
  const shellGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.85, 2), [])
  const coreEdges = useMemo(() => new THREE.EdgesGeometry(coreGeometry), [coreGeometry])
  const shellEdges = useMemo(() => new THREE.EdgesGeometry(shellGeometry), [shellGeometry])

  useEffect(() => {
    return () => {
      coreGeometry.dispose()
      shellGeometry.dispose()
      coreEdges.dispose()
      shellEdges.dispose()
    }
  }, [coreGeometry, shellGeometry, coreEdges, shellEdges])

  useFrame((state, delta) => {
    const group = root.current
    const inner = core.current
    if (!group || !inner) return
    reveal.current = THREE.MathUtils.damp(reveal.current, introVisual.core, 1.6, Math.min(delta, 0.05))
    group.visible = reveal.current > 0.01

    // Targets come from the scroll choreography (see scrollState.ts).
    // On narrow screens the core is centred, lifted and smaller so it sits behind the text.
    const wide = state.size.width >= 900
    const s = scrollState
    const targetX = wide ? s.x : 0
    const targetY = wide ? s.y : s.y + 0.8
    const targetZ = s.z
    const targetScale = s.scale * (wide ? 1 : 0.72) * reveal.current

    if (!animate) {
      group.position.set(targetX, targetY, targetZ)
      group.scale.setScalar(targetScale)
      return
    }

    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const { damp } = THREE.MathUtils

    // Smooth follow + gentle float
    group.position.x = damp(group.position.x, targetX, 3, d)
    group.position.y = damp(group.position.y, targetY + Math.sin(t * 0.8) * 0.1, 3, d)
    group.position.z = damp(group.position.z, targetZ, 3, d)
    group.scale.setScalar(damp(group.scale.x, targetScale, 3, d))

    // Drag-to-spin: coast after release, then add the drag offset to the usual tilt and spin.
    if (!dragState.dragging) {
      dragState.yaw += dragState.velYaw * d
      dragState.pitch = THREE.MathUtils.clamp(
        dragState.pitch + dragState.velPitch * d,
        -MAX_PITCH,
        MAX_PITCH,
      )
      if (Math.abs(dragState.pitch) >= MAX_PITCH) dragState.velPitch = 0

      const friction = Math.exp(-d * DRAG_FRICTION)
      dragState.velYaw *= friction
      dragState.velPitch *= friction
      if (Math.abs(dragState.velYaw) < 0.001) dragState.velYaw = 0
      if (Math.abs(dragState.velPitch) < 0.001) dragState.velPitch = 0
    }

    // The mouse-position tilt fades out while dragging so the two motions don't fight.
    tiltMix.current = damp(tiltMix.current, dragState.dragging ? 0 : 1, 6, d)
    // Follow the cursor tightly while dragging, smoothly otherwise.
    const follow = dragState.dragging ? 22 : 2.5

    group.rotation.y = damp(
      group.rotation.y,
      pointer.current.x * 0.5 * MOUSE_TILT * tiltMix.current + s.spin + dragState.yaw,
      follow,
      d,
    )
    group.rotation.x = damp(
      group.rotation.x,
      pointer.current.y * 0.3 * MOUSE_TILT * tiltMix.current + dragState.pitch,
      follow,
      d,
    )

    // Idle rotation
    inner.rotation.y += d * IDLE_SPIN_Y
    inner.rotation.x += d * IDLE_SPIN_X

    // The rings tumble open and closed (spinning a smooth ring about its own axis looks unchanged)
    if (ringA.current) ringA.current.rotation.x += d * RING_SPIN.a
    if (ringB.current) ringB.current.rotation.x += d * RING_SPIN.b
    if (ringC.current) ringC.current.rotation.x += d * RING_SPIN.c
  })

  return (
    <>
      {/* Lighting: key lights in cyan and icy blue, plus a soft fill */}
      <ambientLight intensity={0.15} />
      <pointLight position={[4, 3, 4]} color={CYAN} intensity={70} distance={20} />
      <pointLight position={[-5, -2, 3]} color={ICE} intensity={45} distance={20} />
      <directionalLight position={[0, 4, -4]} color="#ffffff" intensity={1.2} />

      <CoreDragControls target={root} enabled={animate} />
      <group ref={root}>
        <group ref={core} rotation={[0.4, 0.6, 0]}>
          {/* Faceted chrome core */}
          <mesh geometry={coreGeometry}>
            <meshPhysicalMaterial
              color="#dff3ff"
              metalness={1}
              roughness={0.14}
              clearcoat={1}
              clearcoatRoughness={0.1}
              flatShading
              envMapIntensity={1.3}
            />
          </mesh>

          {/* Fine luminous filaments around the core */}
          <lineSegments geometry={coreEdges} scale={1.002}>
            <lineBasicMaterial color={CYAN} transparent opacity={0.9} toneMapped={false} />
          </lineSegments>

          {/* Outer geodesic network with travelling light pulses (custom shader) */}
          <FilamentNet geometry={shellEdges} animate={animate} />

          {/* Network nodes at the shell vertices */}
          <points geometry={shellGeometry}>
            <pointsMaterial
              color={ICE}
              size={0.05}
              sizeAttenuation
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </points>

          {/* Short facts that appear beside the nodes as they turn toward the viewer */}
          <KnowledgeReveal geometry={shellGeometry} animate={animate} />
        </group>

        {/* Noise-displaced energy shell with fresnel rim (custom shader) */}
        <EnergyShell animate={animate} />

        {/* Orbiting rings */}
        <mesh ref={ringA} rotation={[Math.PI / 2.2, 0.2, 0]}>
          <torusGeometry args={[2.35, 0.006, 8, 200]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.7} toneMapped={false} />
        </mesh>
        <mesh ref={ringB} rotation={[Math.PI / 2, 0.7, 0.5]}>
          <torusGeometry args={[2.7, 0.004, 8, 200]} />
          <meshBasicMaterial color={ICE} transparent opacity={0.45} toneMapped={false} />
        </mesh>
        <mesh ref={ringC} rotation={[Math.PI / 3, -0.6, 0.2]}>
          <torusGeometry args={[3.05, 0.003, 8, 220]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.28} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}