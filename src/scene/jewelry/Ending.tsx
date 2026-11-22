import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { KNOT_STYLES } from '../../data/catalog'
import { CORD_MATERIALS } from '../../data/materials'
import type { Design } from '../../data/types'
import { mm, type Layout } from '../../lib/layout'
import { knotStrands, strandsGeometry, type Strand } from '../../three/knotGeometry'
import { cordMaterial, scaleTubeUVs } from '../../three/materialFactory'
import { frameAt } from './frame'

function Tube({ pts, r, closed, material, density }: { pts: THREE.Vector3[]; r: number; closed: boolean; material: THREE.Material; density: number }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(pts, closed, 'centripetal')
    const g = new THREE.TubeGeometry(c, 72, r, 10, closed)
    return scaleTubeUVs(g, c.getLength(), density)
  }, [pts, r, closed, density])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={material} castShadow receiveShadow />
}

function KnotAt({ strands, d, density, material, position, quaternion }: { strands: Strand[]; d: number; density: number; material: THREE.Material; position: THREE.Vector3; quaternion: THREE.Quaternion }) {
  const geo = useMemo(() => strandsGeometry(strands, d, density), [strands, d, density])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={material} position={position} quaternion={quaternion} castShadow receiveShadow />
}

/** Clasp / finishing details that are part of the ending style rather than placed items. */
export function Ending({ design, layout }: { design: Design; layout: Layout }) {
  const { cord, ending } = design
  const d = mm(cord.diameter)
  const r = layout.cordR
  const color = design.endingColor ?? cord.color
  const material = cordMaterial(cord.material, color)
  const density = CORD_MATERIALS[cord.material].density
  const main = layout.main.path

  const parts = useMemo(() => {
    const out: { key: string; strands: Strand[]; frame: ReturnType<typeof frameAt> }[] = []
    const tubes: { key: string; pts: THREE.Vector3[]; closed: boolean }[] = []
    const dcH = KNOT_STYLES.doubleConnection.radius * d
    if (ending === 'slidingKnot' && main.closed) {
      const reps = Math.max(2, Math.floor(layout.claspLen / (KNOT_STYLES.flat.unit * d)))
      out.push({ key: 'sleeve', strands: knotStrands('flat', reps), frame: frameAt(main, 0, KNOT_STYLES.flat.radius * d) })
    }
    if (ending === 'sealed') {
      out.push({ key: 'seal', strands: knotStrands('doubleConnection', 1), frame: frameAt(main, 0, dcH) })
    }
    if (ending === 'buttonLoop') {
      const ballH = KNOT_STYLES.button.radius * d * 1.1
      out.push({ key: 'button', strands: knotStrands('button', 1), frame: frameAt(main, 0.35, ballH) })
      const c = main.point(0.35)
      const t = main.tangent(0.35)
      const o = main.outward(0.35)
      const loop: THREE.Vector3[] = []
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        const q = c.clone().addScaledVector(t, Math.cos(a) * (2.4 * d + 0.25) - 0.3).addScaledVector(o, Math.sin(a) * (2.1 * d + 0.12))
        q.y = r * 1.1 + 0.08 * Math.max(0, Math.cos(a))
        loop.push(q)
      }
      tubes.push({ key: 'loop', pts: loop, closed: true })
    }
    if (ending === 'hangLoop' && !main.closed) {
      // hanging loop above the top double connection knot
      const top = main.point(0)
      const back = main.tangent(0).multiplyScalar(-1)
      const side = main.outward(0)
      const R = 0.85
      const center = top.clone().addScaledVector(back, R + 0.05)
      const loop: THREE.Vector3[] = []
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        const q = center.clone().addScaledVector(back, -Math.cos(a) * R).addScaledVector(side, Math.sin(a) * R * 0.78)
        q.y = r
        loop.push(q)
      }
      tubes.push({ key: 'hang', pts: loop, closed: true })
      out.push({ key: 'top', strands: knotStrands('doubleConnection', 1), frame: frameAt(main, 0.18, dcH) })
      out.push({ key: 'end', strands: knotStrands('doubleConnection', 1), frame: frameAt(main, main.L - 0.15, dcH * 0.9) })
    }
    // finishing knots at the tips of the tails
    for (const seg of layout.segs) {
      if (seg.id === 'main') continue
      out.push({ key: 'tip-' + seg.id, strands: knotStrands('doubleConnection', 1), frame: frameAt(seg.path, seg.path.L - 0.12, dcH * 0.9) })
    }
    return { knots: out, tubes }
  }, [ending, main, layout, d, r])

  return (
    <group>
      {parts.knots.map((k) => (
        <KnotAt key={k.key} strands={k.strands} d={d} density={density} material={material} position={k.frame.position} quaternion={k.frame.quaternion} />
      ))}
      {parts.tubes.map((t) => (
        <Tube key={t.key} pts={t.pts} r={r * 0.97} closed={t.closed} material={material} density={density} />
      ))}
    </group>
  )
}
