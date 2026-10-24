import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shellVertex, shellFragment, filamentVertex, filamentFragment } from '../shaders/core'

/** Time used for the single static frame when reduced motion is on. */
const STATIC_TIME = 4

export function EnergyShell({ animate }: { animate: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => new THREE.SphereGeometry(1.42, 72, 72), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: STATIC_TIME },
      uColorA: { value: new THREE.Color('#1a6dff') },
      uColorB: { value: new THREE.Color('#27e8ff') },
      uIntensity: { value: 1.0 },
      uDisplace: { value: 0.07 },
    }),
    [],
  )

  useFrame((state) => {
    if (animate && material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={shellVertex}
        fragmentShader={shellFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

interface FilamentNetProps {
  geometry: THREE.BufferGeometry
  animate: boolean
}

export function FilamentNet({ geometry, animate }: FilamentNetProps) {
  const material = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: STATIC_TIME },
      uColor: { value: new THREE.Color('#27e8ff') },
      uBase: { value: 0.2 },
    }),
    [],
  )

  useFrame((state) => {
    if (animate && material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={filamentVertex}
        fragmentShader={filamentFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  )
}