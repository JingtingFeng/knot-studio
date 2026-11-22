import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ViewMode } from '../data/types'
import { useStudio } from '../state/store'
import { sceneRefs } from './refs'

interface Shot {
  /** Camera offset from the anchor (scaled by the piece's size where `scale` is set). */
  offset: THREE.Vector3
  look: THREE.Vector3
  /** Scale offset with the size of the piece (inspect / showcase). */
  scale: boolean
  minDistance: number
  maxDistance: number
  minPolar: number
  maxPolar: number
  autoRotate: boolean
  /** Fly-to speed. */
  speed: number
}

/**
 * Views. Workshop and Inspect look straight down the table (camera yaw = 0) so the
 * tray's front and back rails stay horizontal — like sitting square at the desk.
 */
export const SHOTS: Record<ViewMode, Shot> = {
  // loading shot: a soft three-quarter glance across the tray
  intro: { offset: new THREE.Vector3(14, 19.5, 28.5), look: new THREE.Vector3(2.2, -0.6, -0.6), scale: false, minDistance: 9, maxDistance: 75, minPolar: 0.1, maxPolar: 1.32, autoRotate: false, speed: 2.6 },
  // seated at the desk, looking down over the tray
  workshop: { offset: new THREE.Vector3(0, 42, 25), look: new THREE.Vector3(0, -0.4, 0.3), scale: false, minDistance: 9, maxDistance: 75, minPolar: 0.0, maxPolar: 1.32, autoRotate: false, speed: 1.35 },
  // lean in: same straight-on direction, framed on the piece
  inspect: { offset: new THREE.Vector3(0, 5.6, 3.6), look: new THREE.Vector3(0, 0, 0.42), scale: true, minDistance: 3, maxDistance: 40, minPolar: 0.0, maxPolar: 1.45, autoRotate: false, speed: 2.4 },
  // held up against a bright backdrop, perfectly face-on
  showcase: { offset: new THREE.Vector3(0, 0.55, 6.6), look: new THREE.Vector3(0, -0.25, 0), scale: true, minDistance: 5, maxDistance: 60, minPolar: 0.05, maxPolar: Math.PI - 0.05, autoRotate: true, speed: 2.2 },
}

function goal(view: ViewMode, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const shot = SHOTS[view]
  const anchor = view === 'showcase' ? sceneRefs.held : sceneRefs.rest
  // pieces of every size fill a similar part of the frame
  const k = shot.scale ? Math.max(1.4, sceneRefs.extent + 0.6) : 1
  outPos.copy(anchor).addScaledVector(shot.offset, k)
  outLook.copy(anchor).addScaledVector(shot.look, k)
  // a held necklace hangs from its clasp: give the tails at the top some headroom
  if (view === 'showcase' && sceneRefs.type === 'necklace') { outLook.y += 0.3 * k; outPos.y += 0.3 * k; outPos.z += 0.12 * k }
}

/**
 * Orbit camera with smooth "fly-to" transitions between views.
 * Any user drag cancels the fly-to so manual control always wins.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const view = useStudio((s) => s.view)
  const nonce = useStudio((s) => s.cameraNonce)
  const dragging = useStudio((s) => s.draggingId)
  const flying = useRef(true)
  const goalPos = useRef(new THREE.Vector3())
  const goalLook = useRef(new THREE.Vector3())

  useEffect(() => { sceneRefs.camera = camera }, [camera])
  useEffect(() => { flying.current = true }, [nonce, view])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => { flying.current = false }
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const shot = SHOTS[view]
    goal(view, goalPos.current, goalLook.current)
    c.minPolarAngle = shot.minPolar
    c.maxPolarAngle = shot.maxPolar
    c.autoRotate = shot.autoRotate && !flying.current
    if (flying.current) {
      // ease-out glide; slow and cinematic for the intro → desk move
      const k = 1 - Math.exp(-shot.speed * Math.min(dt, 0.1))
      camera.position.lerp(goalPos.current, k)
      c.target.lerp(goalLook.current, k)
      c.minDistance = 0.1
      c.maxDistance = 1000
      if (camera.position.distanceTo(goalPos.current) < 0.03 && c.target.distanceTo(goalLook.current) < 0.02) flying.current = false
    } else {
      c.minDistance = shot.minDistance
      c.maxDistance = shot.maxDistance
      if (view === 'showcase') c.target.lerp(goalLook.current, 1 - Math.exp(-4 * dt))
    }
    c.enabled = !dragging && view !== 'intro'
    c.update()
  })

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
      autoRotateSpeed={0.5}
      enablePan={false}
    />
  )
}

/** Imperatively place the camera at an exact view (used for identical-angle screenshots). */
export function snapCamera(view: ViewMode, cam: THREE.Camera, controls: { target: THREE.Vector3; update: () => void }) {
  const p = new THREE.Vector3()
  const l = new THREE.Vector3()
  goal(view, p, l)
  cam.position.copy(p)
  controls.target.copy(l)
  controls.update()
}
