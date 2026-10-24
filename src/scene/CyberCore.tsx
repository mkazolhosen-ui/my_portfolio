import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import usePointer from '../hooks/usePointer'
import { EnergyShell, FilamentNet } from './CoreShaders'
import { scrollState } from './scrollState'

const CYAN = '#27e8ff'
const ICE = '#9fd4ff'

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

    // Targets come from the scroll choreography (see scrollState.ts).
    // On narrow screens the core is centred, lifted and smaller so it sits behind the text.
    const wide = state.size.width >= 900
    const s = scrollState
    const targetX = wide ? s.x : 0
    const targetY = wide ? s.y : s.y + 0.8
    const targetZ = s.z
    const targetScale = s.scale * (wide ? 1 : 0.72)

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

    // Pointer-responsive tilt plus the scroll-driven spin (damped so it never snaps)
    group.rotation.y = damp(group.rotation.y, pointer.current.x * 0.5 + s.spin, 2.5, d)
    group.rotation.x = damp(group.rotation.x, pointer.current.y * 0.3, 2.5, d)

    // Slow idle rotation
    inner.rotation.y += d * 0.15
    inner.rotation.x += d * 0.05

    if (ringA.current) ringA.current.rotation.z += d * 0.2
    if (ringB.current) ringB.current.rotation.z -= d * 0.14
    if (ringC.current) ringC.current.rotation.z += d * 0.09
  })

  return (
    <>
      {/* Lighting: key lights in cyan and icy blue, plus a soft fill */}
      <ambientLight intensity={0.15} />
      <pointLight position={[4, 3, 4]} color={CYAN} intensity={70} distance={20} />
      <pointLight position={[-5, -2, 3]} color={ICE} intensity={45} distance={20} />
      <directionalLight position={[0, 4, -4]} color="#ffffff" intensity={1.2} />

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