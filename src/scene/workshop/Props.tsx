import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { BeadMaterialId, BeadShape } from '../../data/types'
import { cordBump, woodTextures } from '../../lib/textures'
import { beadGeometry } from '../../three/beadGeometry'
import { beadMaterial, cordMaterial, scaleTubeUVs } from '../../three/materialFactory'



function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/** A heap of identical beads: one InstancedMesh per cell. */
function BeadHeap({ shape, material, color, size, count, w, d, seed, position }: {
  shape: BeadShape; material: BeadMaterialId; color: string; size: number; count: number; w: number; d: number; seed: number; position: [number, number, number]
}) {
  const mesh = useMemo(() => {
    const geo = beadGeometry(shape)
    const inst = new THREE.InstancedMesh(geo, beadMaterial(material, color), count)
    const rnd = seeded(seed)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const placed: THREE.Vector3[] = []
    const r = size / 2
    let n = 0
    for (let tries = 0; n < count && tries < 600; tries++) {
      const p = new THREE.Vector3((rnd() - 0.5) * (w - size), 0, (rnd() - 0.5) * (d - size))
      // stack: find height above beads already there
      let y = r
      for (const o of placed) {
        const dx = Math.hypot(o.x - p.x, o.z - p.z)
        if (dx < size * 0.95) y = Math.max(y, o.y + Math.sqrt(Math.max(0, size * size - dx * dx)) * 0.92)
      }
      if (y > r + size * 1.6) continue
      p.y = y
      placed.push(p)
      q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6))
      m.compose(p, q, new THREE.Vector3(size, size, size))
      inst.setMatrixAt(n++, m)
    }
    inst.count = n
    inst.castShadow = true
    inst.receiveShadow = true
    return inst
  }, [shape, material, color, size, count, w, d, seed])
  return <primitive object={mesh} position={position} />
}

/** Small wooden storage box with six compartments of beads. */
export function CompartmentBox({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 8.6, D = 12.4, H = 1.7, t = 0.32
  const mat = useMemo(() => {
    const wood = woodTextures('box', '#f1dcc0', '#d9b88f')
    return new THREE.MeshPhysicalMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: 0.4, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 })
  }, [])
  const cols = 2, rows = 3
  const cw = (W - t * (cols + 1)) / cols
  const cd = (D - t * (rows + 1)) / rows
  const fills: { shape: BeadShape; material: BeadMaterialId; color: string; size: number; count: number }[] = [
    { shape: 'round', material: 'glass', color: '#5fc8bf', size: 0.8, count: 16 },
    { shape: 'faceted', material: 'crystal', color: '#f1c4d3', size: 0.6, count: 22 },
    { shape: 'round', material: 'pearl', color: '#f6eee3', size: 0.6, count: 24 },
    { shape: 'rondelle', material: 'gold', color: '#e4c48e', size: 0.5, count: 30 },
    { shape: 'round', material: 'jade', color: '#86bf93', size: 0.8, count: 14 },
    { shape: 'round', material: 'agate', color: '#b8352e', size: 0.75, count: 16 },
  ]
  return (
    <group position={position} rotation-y={rotation}>
      <mesh material={mat} position-y={0.15} castShadow receiveShadow>
        <boxGeometry args={[W, 0.3, D]} />
      </mesh>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <mesh key={'c' + i} material={mat} position={[-W / 2 + t / 2 + i * (cw + t), H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, H, D]} />
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <mesh key={'r' + i} material={mat} position={[0, H / 2, -D / 2 + t / 2 + i * (cd + t)]} castShadow receiveShadow>
          <boxGeometry args={[W, i === 0 || i === rows ? H : H * 0.82, t]} />
        </mesh>
      ))}
      {fills.map((f, i) => {
        const c = i % cols
        const r = Math.floor(i / cols)
        const x = -W / 2 + t + cw / 2 + c * (cw + t)
        const z = -D / 2 + t + cd / 2 + r * (cd + t)
        return <BeadHeap key={i} {...f} w={cw} d={cd} seed={11 + i * 7} position={[x, 0.3, z]} />
      })}
    </group>
  )
}

/** Shallow celadon dish holding a few loose pearls. */
export function Dish({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = []
    const prof: [number, number][] = [[0, 0.12], [2.2, 0.12], [2.6, 0.05], [2.75, 0.0], [2.95, 0.15], [3.15, 0.55], [3.25, 0.68], [3.15, 0.72], [3.0, 0.6], [2.75, 0.3], [2.3, 0.22], [0, 0.22]]
    for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y))
    const g = new THREE.LatheGeometry(pts, 96)
    g.computeVertexNormals()
    return g
  }, [])
  const pearls = useMemo(() => {
    const rnd = seeded(91)
    return Array.from({ length: 9 }, () => {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 1.7
      return [Math.cos(a) * rr, 0.22 + 0.3 + rnd() * 0.05, Math.sin(a) * rr] as [number, number, number]
    })
  }, [])
  return (
    <group position={position}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial color="#cfe0cf" roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} sheen={0.2} side={THREE.DoubleSide} />
      </mesh>
      {pearls.map((p, i) => (
        <mesh key={i} geometry={beadGeometry('round')} material={beadMaterial('pearl', i % 3 === 0 ? '#f3dfe0' : '#f6eee3')} position={p} scale={0.6} rotation={[i, i * 2, 0]} castShadow receiveShadow />
      ))}
    </group>
  )
}

/** Wooden spool wound with cord, lying on its side. */
export function Spool({ position, rotation = 0, color, material = 'satin' as const }: { position: [number, number, number]; rotation?: number; color: string; material?: 'satin' | 'jadeLine' | 'goldThread' }) {
  const L = 3.2, R = 1.35, F = 1.75
  const { body, flange } = useMemo(() => {
    const wood = woodTextures('lamp', '#d6b48a', '#b48a5c')
    const flangeMat = new THREE.MeshPhysicalMaterial({ map: wood.map, roughness: 0.5, clearcoat: 0.3 })
    // winding: cord texture runs around the circumference
    const bump = cordBump('braid').clone()
    bump.repeat.set(R * Math.PI * 2 * 3, L * 6)
    bump.rotation = 0
    bump.needsUpdate = true
    const base = cordMaterial(material, color)
    const m = base.clone()
    m.bumpMap = bump
    m.bumpScale = 1.2
    return { body: m, flange: flangeMat }
  }, [color, material])
  return (
    <group position={position} rotation={[0, rotation, Math.PI / 2]}>
      <mesh material={body} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, L - 0.3, 64, 1, true]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={flange} position-y={(s * L) / 2} castShadow receiveShadow>
          <cylinderGeometry args={[F, F, 0.28, 64]} />
        </mesh>
      ))}
      <mesh material={flange}>
        <cylinderGeometry args={[0.35, 0.35, L + 0.05, 24]} />
      </mesh>
    </group>
  )
}

/** A length of cord unspooled across the tray. */
export function LooseCord({ points, color, diameter = 0.2, material = 'satin' as const }: { points: [number, number, number][]; color: string; diameter?: number; material?: 'satin' | 'jadeLine' | 'cotton' | 'goldThread' }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal')
    const g = new THREE.TubeGeometry(c, 220, diameter / 2, 12, false)
    return scaleTubeUVs(g, c.getLength(), 7)
  }, [points, diameter])
  return <mesh geometry={geo} material={cordMaterial(material, color)} castShadow receiveShadow />
}

/** Embroidery scissors in brushed brass. */
export function Scissors({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const { blade, ring } = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, -0.28)
    s.quadraticCurveTo(3.2, -0.42, 6.4, 0.0)
    s.quadraticCurveTo(3.2, 0.12, 0, 0.3)
    s.lineTo(0, -0.28)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.06, bevelSegments: 3 })
    g.rotateX(-Math.PI / 2)
    const r = new THREE.TorusGeometry(0.9, 0.17, 16, 48)
    r.rotateX(-Math.PI / 2)
    r.scale(1, 1, 0.72)
    return { blade: g, ring: r }
  }, [])
  const metal = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#dcbf86', metalness: 1, roughness: 0.28 }), [])
  return (
    <group position={position} rotation-y={rotation}>
      {[-1, 1].map((s) => (
        <group key={s} rotation-y={s * 0.09} position-y={s > 0 ? 0.22 : 0.1}>
          <mesh geometry={blade} material={metal} position={[0, 0, 0]} castShadow receiveShadow />
          <mesh geometry={ring} material={metal} position={[-1.2, 0.05, s * 1.0]} castShadow receiveShadow />
          <mesh material={metal} position={[-0.25, 0.05, s * 0.5]} rotation-y={s * 1.0} castShadow>
            <boxGeometry args={[1.2, 0.18, 0.32]} />
          </mesh>
        </group>
      ))}
      <mesh material={metal} position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.18, 20]} />
      </mesh>
    </group>
  )
}

/** Small loose beads scattered for life. */
export function Scatter({ items }: { items: { p: [number, number, number]; shape: BeadShape; mat: BeadMaterialId; color: string; size: number }[] }) {
  return (
    <group>
      {items.map((b, i) => (
        <mesh key={i} geometry={beadGeometry(b.shape)} material={beadMaterial(b.mat, b.color)} position={[b.p[0], b.p[1] + b.size / 2, b.p[2]]} rotation={[i * 1.3, i * 0.7, i * 2.1]} scale={b.size} castShadow receiveShadow />
      ))}
    </group>
  )
}

/** Teacup on a saucer — the quiet companion of every craft table. */
export function Teacup({ position }: { position: [number, number, number] }) {
  const { cup, saucer, tea } = useMemo(() => {
    const cp: THREE.Vector2[] = []
    const prof: [number, number][] = [[0, 0.0], [1.3, 0.0], [1.45, 0.15], [1.9, 1.0], [2.35, 2.7], [2.45, 3.1], [2.35, 3.12], [2.22, 2.75], [1.8, 1.1], [1.25, 0.35], [0, 0.35]]
    for (const [r, y] of prof) cp.push(new THREE.Vector2(r, y))
    const cup = new THREE.LatheGeometry(cp, 80)
    cup.computeVertexNormals()
    const sp: THREE.Vector2[] = []
    for (const [r, y] of [[0, 0], [2.4, 0], [3.6, 0.25], [4.1, 0.5], [4.15, 0.6], [4.0, 0.62], [3.5, 0.4], [2.5, 0.22], [0, 0.22]] as [number, number][]) sp.push(new THREE.Vector2(r, y))
    const saucer = new THREE.LatheGeometry(sp, 80)
    saucer.computeVertexNormals()
    return { cup, saucer, tea: new THREE.CircleGeometry(2.25, 64) }
  }, [])
  const glaze = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f5efe6', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide }), [])
  return (
    <group position={position}>
      <mesh geometry={saucer} material={glaze} castShadow receiveShadow />
      <group position-y={0.22}>
        <mesh geometry={cup} material={glaze} castShadow receiveShadow />
        <mesh geometry={tea} rotation-x={-Math.PI / 2} position-y={2.55}>
          <meshPhysicalMaterial color="#9a5a22" roughness={0.05} clearcoat={1} transmission={0.2} />
        </mesh>
        <mesh position={[2.3, 1.75, 0]} rotation-z={0.2} castShadow material={glaze}>
          <torusGeometry args={[0.75, 0.17, 16, 40, Math.PI * 1.3]} />
        </mesh>
      </group>
    </group>
  )
}

/** Warm desk lamp: ceramic dome shade, brass arm. Lights are added in Lighting. */
export function Lamp({ base, head }: { base: [number, number, number]; head: [number, number, number] }) {
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (glow.current) glow.current.color.set('#ffcf8a').multiplyScalar(3.0 + Math.sin(clock.elapsedTime * 0.7) * 0.05)
  })
  const parts = useMemo(() => {
    const b = new THREE.Vector3(...base)
    const h = new THREE.Vector3(...head)
    const elbow = new THREE.Vector3(b.x - 1.5, b.y + 17, b.z - 2)
    const arm = new THREE.CatmullRomCurve3([b.clone().setY(b.y + 1.2), elbow, h.clone().add(new THREE.Vector3(-1.6, 2.4, -1.0))], false, 'catmullrom', 0.1)
    const armGeo = new THREE.TubeGeometry(arm, 80, 0.3, 14, false)
    const shadeProf: [number, number][] = [[0.6, 3.1], [1.6, 3.0], [2.9, 2.3], [3.9, 1.0], [4.3, 0.0], [4.15, -0.05], [3.75, 0.95], [2.8, 2.15], [1.6, 2.8], [0.6, 2.9]]
    const shade = new THREE.LatheGeometry(shadeProf.map(([r, y]) => new THREE.Vector2(r, y)), 80)
    shade.computeVertexNormals()
    const dir = h.clone().sub(elbow).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dir.x * 0.6, 1, -dir.z * 0.6).normalize())
    return { armGeo, shade, q }
  }, [base, head])
  const brass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#cfae78', metalness: 1, roughness: 0.32 }), [])
  return (
    <group>
      <mesh position={[base[0], base[1] + 0.6, base[2]]} castShadow receiveShadow>
        <cylinderGeometry args={[4.6, 5.0, 1.2, 64]} />
        <meshPhysicalMaterial color="#efe4d2" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.15} />
      </mesh>
      <mesh geometry={parts.armGeo} material={brass} castShadow />
      <group position={head} quaternion={parts.q}>
        <mesh geometry={parts.shade} castShadow>
          <meshPhysicalMaterial color="#f2e6d0" roughness={0.35} clearcoat={0.6} side={THREE.DoubleSide} />
        </mesh>
        {/* warm inner glow */}
        <mesh position-y={1.2} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[1.25, 32, 16]} />
          <meshBasicMaterial ref={glow} color="#ffd59a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
