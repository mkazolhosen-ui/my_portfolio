import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import usePointer from '../hooks/usePointer'
import { particleVertex, particleFragment } from '../shaders/particles'

interface LayerConfig {
  count: number
  /** Base point size in CSS pixels at distance 6 from the camera. */
  size: number
  speed: number
  parallax: number
  opacity: number
  /** Width and height of the box the particles live in. */
  box: [number, number]
  /** Min and max depth (camera sits at z = 6.5). */
  z: [number, number]
}

const LAYERS: LayerConfig[] = [
  // Far: fine dust
  { count: 700, size: 7, speed: 0.25, parallax: 0.25, opacity: 0.7, box: [28, 16], z: [-12, -6] },
  // Mid: main atmosphere
  { count: 320, size: 9, speed: 0.4, parallax: 0.6, opacity: 0.85, box: [17, 10], z: [-6, 0] },
  // Near: sparse soft bokeh
  { count: 50, size: 10, speed: 0.6, parallax: 1.3, opacity: 0.35, box: [8, 5.5], z: [0.5, 3] },
]

/** Small deterministic PRNG so the layout is identical on every load. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildGeometry(config: LayerConfig, count: number, seed: number) {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 4)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() - 0.5) * config.box[0]
    positions[i * 3 + 1] = (rand() - 0.5) * config.box[1]
    positions[i * 3 + 2] = config.z[0] + rand() * (config.z[1] - config.z[0])
    for (let j = 0; j < 4; j++) randoms[i * 4 + j] = rand()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 4))
  return geometry
}

interface LayerProps {
  config: LayerConfig
  count: number
  seed: number
  animate: boolean
  pointer: RefObject<{ x: number; y: number }>
}

function ParticleLayer({ config, count, seed, animate, pointer }: LayerProps) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const smooth = useRef({ x: 0, y: 0 })

  const geometry = useMemo(() => buildGeometry(config, count, seed), [config, count, seed])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 3 },
      uPixelRatio: { value: 1 },
      uSize: { value: config.size },
      uSpeed: { value: config.speed },
      uParallax: { value: config.parallax },
      uOpacity: { value: config.opacity },
      uBox: { value: new THREE.Vector2(config.box[0], config.box[1]) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color('#27e8ff') },
      uColorB: { value: new THREE.Color('#9fd4ff') },
    }),
    [config],
  )

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return

    mat.uniforms.uPixelRatio.value = state.viewport.dpr
    if (!animate) return

    const d = Math.min(delta, 0.05)
    const { damp } = THREE.MathUtils
    smooth.current.x = damp(smooth.current.x, pointer.current.x, 2, d)
    smooth.current.y = damp(smooth.current.y, pointer.current.y, 2, d)

    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uPointer.value.set(smooth.current.x, smooth.current.y)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export default function ParticleField({ animate }: { animate: boolean }) {
  const pointer = usePointer()
  // Fewer particles on narrow (mostly mobile) screens
  const small = useThree((state) => state.size.width) < 900

  return (
    <group>
      {LAYERS.map((config, i) => (
        <ParticleLayer
          key={i}
          config={config}
          count={Math.round(config.count * (small ? 0.5 : 1))}
          seed={1000 + i * 97}
          animate={animate}
          pointer={pointer}
        />
      ))}
    </group>
  )
}