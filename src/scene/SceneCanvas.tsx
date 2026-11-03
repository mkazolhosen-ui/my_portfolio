import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import CyberCore from './CyberCore'
import ParticleField from './ParticleField'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import NameAssembly from './NameAssembly'

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function SceneCanvas() {
  const [webgl] = useState(supportsWebGL)
  const reducedMotion = usePrefersReducedMotion()

  // No WebGL: render nothing, the CSS backdrop remains.
  if (!webgl) return null

  return (
    <div className="scene">
      <Canvas
        frameloop={reducedMotion ? 'demand' : 'always'}
        camera={{ position: [0, 0, 6.5], fov: 40, near: 0.1, far: 50 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Procedural studio environment: no network request, rendered once */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3.5} color="#27e8ff" position={[-5, 2, -2]} scale={[8, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2.5} color="#9fd4ff" position={[5, -1, 2]} scale={[6, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 0]} scale={[10, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={2} color="#27e8ff" position={[0, 0, -6]} scale={5} target={[0, 0, 0]} />
        </Environment>

        <ParticleField animate={!reducedMotion} />
        <CyberCore animate={!reducedMotion} />
        <NameAssembly />
      </Canvas>
    </div>
  )
}