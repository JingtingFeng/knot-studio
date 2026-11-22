import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStudio } from '../state/store'
import { sceneRefs } from './refs'

export const SUN_DIR = new THREE.Vector3(-0.78, 0.6, 0.22).normalize()
export const LAMP_HEAD: [number, number, number] = [-15, 15.5, -16]

/**
 * Lighting recipe (warm sun + soft ambient):
 *  • key: low warm "late-afternoon" sun from the left window, soft shadows
 *  • fill: cream hemisphere bounce from the wall / table
 *  • practical: the desk lamp, a warm pool on the tray
 *  • reflections: an in-scene Lightformer environment (window softbox, ceiling
 *    bounce, warm rim) → beads get believable highlights with no HDR download
 *  • showcase: a studio key/fill pair fades in as the piece is lifted
 */
export function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null)
  const lamp = useRef<THREE.SpotLight>(null)
  const keyL = useRef<THREE.DirectionalLight>(null)
  const fillL = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const view = useStudio((s) => s.view)

  const target = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (lamp.current) {
      lamp.current.target.position.set(-6, 1, 0)
      lamp.current.target.updateMatrixWorld()
    }
    if (sun.current) {
      sun.current.target = target
      target.position.set(-2, 0, 0)
      target.updateMatrixWorld()
    }
  }, [target])

  useFrame((_, dt) => {
    const show = view === 'showcase' ? 1 : 0
    const k = 1 - Math.exp(-3 * dt)
    if (keyL.current) {
      keyL.current.intensity += (show * 2.2 - keyL.current.intensity) * k
      keyL.current.position.copy(sceneRefs.focus).add(new THREE.Vector3(-8, 10, 12))
      keyL.current.target.position.copy(sceneRefs.focus)
      keyL.current.target.updateMatrixWorld()
    }
    if (fillL.current) {
      fillL.current.intensity += (show * 0.9 - fillL.current.intensity) * k
      fillL.current.position.copy(sceneRefs.focus).add(new THREE.Vector3(10, 2, 6))
      fillL.current.target.position.copy(sceneRefs.focus)
      fillL.current.target.updateMatrixWorld()
    }
    if (hemi.current) hemi.current.intensity += ((show ? 0.9 : 0.6) - hemi.current.intensity) * k
  })

  const sunPos = SUN_DIR.clone().multiplyScalar(80)

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff3e0', '#d8c3a2', 0.6]} />
      <directionalLight
        ref={sun}
        position={sunPos}
        color="#ffe8cc"
        intensity={1.85}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={6}
        shadow-camera-near={10}
        shadow-camera-far={170}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <spotLight
        ref={lamp}
        position={[LAMP_HEAD[0] + 0.4, LAMP_HEAD[1] - 0.2, LAMP_HEAD[2] + 0.3]}
        color="#ffb366"
        intensity={700}
        distance={0}
        decay={2}
        angle={0.72}
        penumbra={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-radius={8}
      />
      <pointLight position={[LAMP_HEAD[0], LAMP_HEAD[1] + 0.8, LAMP_HEAD[2]]} color="#ffbe7a" intensity={60} decay={2} distance={0} />
      {/* showcase studio lights */}
      <directionalLight ref={keyL} color="#fff1df" intensity={0} />
      <directionalLight ref={fillL} color="#ffe7d6" intensity={0} />

      <Environment resolution={256} frames={1} environmentIntensity={0.5}>
        <color attach="background" args={['#ece0cc']} />
        {/* window softbox (warm, from the left) */}
        <Lightformer form="rect" intensity={5} color="#ffe6c4" position={[-12, 6, 2]} rotation-y={Math.PI / 2} scale={[14, 9, 1]} />
        {/* window mullion bars give glass beads a recognisable reflection */}
        <Lightformer form="rect" intensity={-1} color="#000000" position={[-11.9, 6, 2]} rotation-y={Math.PI / 2} scale={[0.5, 9, 1]} />
        {/* ceiling bounce */}
        <Lightformer form="rect" intensity={1.6} color="#fff8ee" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        {/* lamp glow */}
        <Lightformer form="circle" intensity={6} color="#ffc27a" position={[-6, 7, -8]} scale={2.5} target={[0, 0, 0]} />
        {/* warm rim from the right */}
        <Lightformer form="rect" intensity={1.2} color="#ffd9b0" position={[12, 3, -4]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        {/* table bounce */}
        <Lightformer form="rect" intensity={0.8} color="#f0d9b5" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>
    </>
  )
}
