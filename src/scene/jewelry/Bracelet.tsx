import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { JewelryType } from '../../data/types'
import { computeLayout, type Layout } from '../../lib/layout'
import { useStudio, type Spot } from '../../state/store'
import { sceneRefs } from '../refs'
import { Cord } from './Cord'
import { Ending } from './Ending'
import { Piece } from './Piece'

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()
const ndc = new THREE.Vector2()
const ray = new THREE.Raycaster()

let currentLayout: Layout | null = null
export const getCurrentLayout = () => currentLayout

/** Project a client-space pointer onto the nearest cord segment → { seg, t }. */
export function pointerToSpot(clientX: number, clientY: number, el: HTMLElement, layout: Layout | null = currentLayout): Spot | null {
  const g = sceneRefs.bracelet
  const cam = sceneRefs.camera
  if (!g || !cam || !layout) return null
  const rect = el.getBoundingClientRect()
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  ray.setFromCamera(ndc, cam)
  plane.constant = -g.getWorldPosition(hit).y
  if (!ray.ray.intersectPlane(plane, hit)) return null
  g.worldToLocal(hit)
  let best: Spot | null = null
  let bestD = Infinity
  for (const seg of layout.segs) {
    const n = seg.path.nearest(hit)
    if (n.d2 < bestD) { bestD = n.d2; best = { seg: seg.id, t: n.s / seg.path.L } }
  }
  return best
}

/** Slides the grabbed piece along the cord (and across onto the tails) while the pointer moves. */
function DragController() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const move = (e: PointerEvent) => {
      const st = useStudio.getState()
      if (!st.draggingId) return
      const spot = pointerToSpot(e.clientX, e.clientY, el)
      if (spot) st.updateItem(st.draggingId, spot)
    }
    const up = () => {
      const st = useStudio.getState()
      if (!st.draggingId) return
      st.commitLayout()
      st.setDragging(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])
  return null
}

/** How each kind of piece is "held up" in showcase: bracelets tilt toward you, pendants hang. */
const HELD_TILT: Record<JewelryType, number> = { bracelet: 1.18, necklace: 1.25, ring: 1.0, pendant: Math.PI / 2 }

export function Bracelet() {
  const design = useStudio((s) => s.design)
  const draggingId = useStudio((s) => s.draggingId)
  const view = useStudio((s) => s.view)
  const group = useRef<THREE.Group>(null)

  const layout = useMemo(() => computeLayout(design, draggingId), [design, draggingId])
  currentLayout = layout
  sceneRefs.extent = layout.extent
  sceneRefs.type = design.type

  const qRest = useMemo(() => new THREE.Quaternion(), [])
  const qHeld = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(HELD_TILT[design.type], 0, 0)), [design.type])

  useEffect(() => {
    sceneRefs.bracelet = group.current
  }, [])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const held = view === 'showcase'
    const target = held ? sceneRefs.held : sceneRefs.rest
    g.position.x = THREE.MathUtils.damp(g.position.x, target.x, 3.2, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, target.z, 3.2, dt)
    g.position.y = THREE.MathUtils.damp(g.position.y, target.y, held ? 2.4 : 3.4, dt)
    g.quaternion.slerp(held ? qHeld : qRest, 1 - Math.exp(-3 * dt))
    sceneRefs.focus.copy(g.position)
  })

  const interactive = view === 'workshop' || view === 'inspect'

  return (
    <group ref={group} position={sceneRefs.rest.toArray()} onPointerMissed={() => useStudio.getState().select(null)}>
      {layout.segs.map((seg) => (
        <Cord key={seg.id} seg={seg} cordR={layout.cordR} cord={design.cord} />
      ))}
      {layout.segs.flatMap((seg) =>
        seg.placed.map((p) => <Piece key={p.item.id} placed={p} seg={seg} cord={design.cord} interactive={interactive} />),
      )}
      <Ending design={design} layout={layout} />
      <DragController />
    </group>
  )
}
