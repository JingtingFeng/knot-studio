import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { CORD_MATERIALS } from '../../data/materials'
import type { CordSpec } from '../../data/types'
import { cordHeight, gather, type SegLayout } from '../../lib/layout'
import { cordMaterial, scaleTubeUVs } from '../../three/materialFactory'

/**
 * One cord segment: one or two strands that lie side by side on the mat, then
 * gather and rise to pass through the centre of every bead and knot.
 */
export function Cord({ seg, cordR, cord, color }: { seg: SegLayout; cordR: number; cord: CordSpec; color?: string }) {
  const geometries = useMemo(() => {
    const path = seg.path
    const N = Math.max(40, Math.round(path.L * 34))
    const up = new THREE.Vector3(0, 1, 0)
    const strands = cord.strands === 2 ? [-1, 1] : [0]
    const p = new THREE.Vector3()
    const o = new THREE.Vector3()
    return strands.map((side) => {
      const pts: THREE.Vector3[] = []
      const count = path.closed ? N : N + 1
      for (let i = 0; i < count; i++) {
        const s = (i / N) * path.L
        const g = gather(s, seg)
        const h = cordHeight(s, seg, cordR)
        path.point(s, p)
        path.outward(s, o)
        // strands spread to touch when free, overlap when gathered;
        // a tiny vertical offset keeps them from z-fighting inside beads
        const lat = side * cordR * 0.98 * (1 - g)
        pts.push(p.clone().addScaledVector(o, lat).addScaledVector(up, h + side * 0.002 * g))
      }
      const curve = new THREE.CatmullRomCurve3(pts, path.closed, 'centripetal')
      const geo = new THREE.TubeGeometry(curve, count * 2, cordR * 0.97, 12, path.closed)
      scaleTubeUVs(geo, curve.getLength(), CORD_MATERIALS[cord.material].density)
      return geo
    })
  }, [seg, cordR, cord.strands, cord.material])

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])

  const material = cordMaterial(cord.material, color ?? cord.color)

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={material} castShadow receiveShadow />
      ))}
    </group>
  )
}
