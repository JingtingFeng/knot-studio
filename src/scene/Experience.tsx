import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CameraRig, snapCamera } from './CameraRig'
import { Effects } from './Effects'
import { Bracelet } from './jewelry/Bracelet'
import { LAMP_HEAD, Lighting, SUN_DIR } from './Lighting'
import { ShowcaseBackdrop } from './ShowcaseBackdrop'
import { CompartmentBox, Dish, Lamp, LooseCord, Scatter, Scissors, Spool, Teacup } from './workshop/Props'
import { DustMotes, LightShafts, Room, ShadowCasters } from './workshop/Room'
import { Tray, TRAY } from './workshop/Tray'
import { useStudio } from '../state/store'
import { sceneRefs } from './refs'

const F = TRAY.base

function Workshop() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.visible = sceneRefs.backdrop < 0.35 })
  return (
    <group ref={ref}>
      <Room />
      <Tray />
      <CompartmentBox position={[11.3, F, -3.6]} rotation={0.0} />
      <Dish position={[11.0, F, 6.6]} />
      <Spool position={[-13.2, F + 1.75, -7.4]} rotation={0.35} color="#b4262c" />
      <Spool position={[-13.6, F + 1.75, 7.2]} rotation={-0.25} color="#e3cc9f" material="jadeLine" />
      <LooseCord
        color="#b4262c"
        points={[[-12.4, F + 3.0, -6.6], [-11.6, F + 1.0, -4.9], [-12.6, F + 0.12, -2.4], [-13.8, F + 0.1, 0.4], [-12.9, F + 0.1, 2.9], [-11.7, F + 0.1, 3.6]]}
      />
      <LooseCord
        color="#d7a7b4" diameter={0.12} material="jadeLine"
        points={[[16.5, 0.06, 13.2], [19.0, 0.06, 12.4], [21.5, 0.06, 14.2], [20.0, 0.06, 16.5], [17.5, 0.06, 15.8], [18.3, 0.06, 14.0], [22.5, 0.06, 11.0], [25, 0.06, 10.4]]}
      />
      <Scatter
        items={[
          { p: [4.3, F, -8.6], shape: 'round', mat: 'glass', color: '#5fc8bf', size: 0.8 },
          { p: [5.3, F, -9.3], shape: 'faceted', mat: 'crystal', color: '#f1c4d3', size: 0.6 },
          { p: [6.0, F, 9.2], shape: 'rondelle', mat: 'gold', color: '#e4c48e', size: 0.5 },
          { p: [20.5, 0, 8.0], shape: 'round', mat: 'jade', color: '#86bf93', size: 0.8 },
          { p: [-20.0, 0, 13.5], shape: 'round', mat: 'agate', color: '#b8352e', size: 0.75 },
          { p: [-18.6, 0, 14.6], shape: 'faceted', mat: 'crystal', color: '#cfe9f2', size: 0.6 },
        ]}
      />
      <Scissors position={[22.5, 0, 4.5]} rotation={-0.9} />
      <Teacup position={[26, 0, -14]} />
      <Lamp base={[-23, 0, -26]} head={LAMP_HEAD} />
      <ShadowCasters sunDir={SUN_DIR} />
      <LightShafts sunDir={SUN_DIR} />
      <DustMotes />
    </group>
  )
}

/** Automation hooks: identical-angle screenshots, state inspection. */
function Automation() {
  const { camera, controls, gl } = useThree() as unknown as { camera: THREE.Camera; controls: { target: THREE.Vector3; update: () => void } | null; gl: THREE.WebGLRenderer }
  useEffect(() => {
    ;(window as any).__snap = (view: 'intro' | 'workshop' | 'inspect' | 'showcase') => {
      useStudio.setState({ view })
      // wait for the new design to lay out before framing it
      requestAnimationFrame(() => requestAnimationFrame(() => { if (controls) snapCamera(view, camera, controls) }))
    }
    ;(window as any).__gl = gl
  }, [camera, controls, gl])
  return null
}

export function Experience({ quality }: { quality: 'high' | 'low' }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={quality === 'high' ? [1, 1.75] : 1}
      camera={{ fov: 30, near: 0.5, far: 600, position: sceneRefs.rest.clone().add(new THREE.Vector3(14, 19.5, 28.5)).toArray() }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.0
        ;(window as any).__ready = true
      }}
    >
      <color attach="background" args={['#efe4d3']} />
      <fog attach="fog" args={['#efe4d3', 90, 220]} />
      <Suspense fallback={null}>
        <Lighting />
        <Workshop />
        <Bracelet />
        <ShowcaseBackdrop />
        <Effects quality={quality} />
      </Suspense>
      <CameraRig />
      <Automation />
    </Canvas>
  )
}
