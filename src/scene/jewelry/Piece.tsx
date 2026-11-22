import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CORD_MATERIALS } from '../../data/materials'
import type { CordSpec, DesignItem, KnotItem } from '../../data/types'
import { mm, type Placed, type SegLayout } from '../../lib/layout'
import { useStudio } from '../../state/store'
import { beadGeometry } from '../../three/beadGeometry'
import { knotStrands, strandsGeometry } from '../../three/knotGeometry'
import { beadMaterial, cordMaterial } from '../../three/materialFactory'
import { buildTassel, tasselHeadRadius } from '../../three/tasselGeometry'
import { radialTexture } from '../../lib/textures'
import { frameAt } from './frame'

function KnotBody({ item, cord }: { item: KnotItem; cord: CordSpec }) {
  const matId = item.material ?? cord.material
  const d = mm(cord.diameter)
  const geo = useMemo(
    () => strandsGeometry(knotStrands(item.style, item.repeat), d, CORD_MATERIALS[matId].density),
    [item.style, item.repeat, d, matId],
  )
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={cordMaterial(matId, item.color ?? cord.color)} castShadow receiveShadow />
}

function BeadBody({ item }: { item: Extract<DesignItem, { kind: 'bead' }> }) {
  return <mesh geometry={beadGeometry(item.shape)} material={beadMaterial(item.material, item.color)} scale={mm(item.size)} castShadow receiveShadow />
}

/** A tassel hangs off the cord: outward on a loop, along the cord at the end of an open cord. */
function TasselBody({ item, cord, dir, hanging }: { item: KnotItem; cord: CordSpec; dir: THREE.Vector3; hanging: boolean }) {
  const obj = useMemo(
    () => buildTassel({ length: item.length ?? 4, color: item.color ?? cord.color, accent: item.accent ?? '#d8b46e', cordColor: cord.color, d: mm(cord.diameter), hanging }),
    [item.length, item.color, item.accent, cord.color, cord.diameter, hanging],
  )
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().setY(0).normalize()), [dir])
  return <primitive object={obj} quaternion={q} />
}

const halo = () => radialTexture('rgba(255,236,196,0.95)', 'rgba(255,236,196,0)')

/** One bead or knot on the piece, with hover / select / drag behaviour. */
export function Piece({ placed, seg, cord, interactive }: { placed: Placed; seg: SegLayout; cord: CordSpec; interactive: boolean }) {
  const { item, s, radius } = placed
  const selected = useStudio((st) => st.selectedId === item.id)
  const hovered = useStudio((st) => st.hoveredId === item.id)
  const dragging = useStudio((st) => st.draggingId === item.id)
  const lift = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const isTassel = item.kind === 'knot' && item.style === 'tassel'
  const tasselLen = item.kind === 'knot' ? item.length ?? 4 : 0
  const frame = useMemo(() => frameAt(seg.path, s, isTassel ? tasselHeadRadius(tasselLen) : radius), [seg.path, s, radius, isTassel, tasselLen])
  const tasselDir = useMemo(() => {
    if (!isTassel) return new THREE.Vector3(1, 0, 0)
    // on a loop: lie outward; at the very end of an open cord: continue along it
    const nearEnd = !seg.path.closed && s > seg.path.L * 0.7
    const w = nearEnd ? seg.path.tangent(s) : seg.path.outward(s)
    // into the frame's local space
    return w.applyQuaternion(frame.quaternion.clone().invert())
  }, [isTassel, seg.path, s, frame])

  useFrame((_, dt) => {
    const target = dragging ? 0.45 : selected ? 0.14 : hovered && interactive ? 0.07 : 0
    if (lift.current) lift.current.position.y = THREE.MathUtils.damp(lift.current.position.y, target, 10, dt)
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = THREE.MathUtils.damp(mat.opacity, selected ? 0.85 : hovered && interactive ? 0.4 : 0, 8, dt)
      haloRef.current.visible = mat.opacity > 0.01
    }
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || e.button !== 0) return
    e.stopPropagation()
    const st = useStudio.getState()
    st.select(item.id)
    st.record(true)
    st.setDragging(item.id)
  }

  const size = isTassel ? 2.2 : Math.max(placed.len, radius * 2) * 1.9
  const hangingTassel = false

  return (
    <group>
      {/* soft warm halo on the mat under the selected piece */}
      <mesh ref={haloRef} position={[frame.position.x, 0.01, frame.position.z]} rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={halo()} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <group position={frame.position} quaternion={frame.quaternion}>
        <group
          ref={lift}
          onPointerDown={onDown}
          onPointerOver={(e) => { if (!interactive) return; e.stopPropagation(); useStudio.getState().hover(item.id); document.body.style.cursor = 'grab' }}
          onPointerOut={() => { if (useStudio.getState().hoveredId === item.id) useStudio.getState().hover(null); document.body.style.cursor = '' }}
        >
          {item.kind === 'bead' ? (
            <BeadBody item={item} />
          ) : isTassel ? (
            <TasselBody item={item} cord={cord} dir={tasselDir} hanging={hangingTassel} />
          ) : (
            <KnotBody item={item} cord={cord} />
          )}
        </group>
      </group>
    </group>
  )
}
