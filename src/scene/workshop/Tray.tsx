import { useMemo } from 'react'
import * as THREE from 'three'
import { clothTextures, woodTextures } from '../../lib/textures'
import { cordMaterial } from '../../three/materialFactory'
import { MAT_CENTER } from '../refs'
import { useStudio } from '../../state/store'

export const TRAY = { w: 34, d: 24, r: 3.2, rim: 1.15, base: 0.8, height: 2.5 }

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Planar UVs from world x/z so the grain runs continuously across base and rim. */
function planarUV(geo: THREE.BufferGeometry, scale: number, rotate = false) {
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i), b = pos.getZ(i), c = pos.getY(i)
    uv[i * 2] = (rotate ? b : a) * scale + c * 0.05
    uv[i * 2 + 1] = (rotate ? a : b) * scale * 0.35 + c * scale
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

/** Light-coloured wooden tray with softly bevelled rim and a linen design mat. */
export function Tray() {
  const { base, rim, mat } = useMemo(() => {
    const { w, d, r, rim: rw, base: bh, height } = TRAY
    const outer = roundedRect(w, d, r)
    const bevel = { bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 4, curveSegments: 24 }
    const baseGeo = new THREE.ExtrudeGeometry(outer, { depth: bh - 0.36, ...bevel })
    baseGeo.rotateX(-Math.PI / 2)
    baseGeo.translate(0, 0.18, 0)
    planarUV(baseGeo, 1 / 30)
    baseGeo.computeVertexNormals()

    const ring = roundedRect(w, d, r)
    ring.holes.push(roundedRect(w - rw * 2, d - rw * 2, r - rw * 0.8) as unknown as THREE.Path)
    const rimGeo = new THREE.ExtrudeGeometry(ring, { depth: height - 0.5, ...bevel, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 6 })
    rimGeo.rotateX(-Math.PI / 2)
    rimGeo.translate(0, 0.25, 0)
    planarUV(rimGeo, 1 / 30)
    rimGeo.computeVertexNormals()

    const wood = woodTextures('tray', '#f4e8d4', '#dcc3a0')
    const woodMat = new THREE.MeshPhysicalMaterial({
      map: wood.map, bumpMap: wood.bump, bumpScale: 0.6,
      roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.25, sheenColor: new THREE.Color('#fff2dc'),
    })

    const cloth = clothTextures('mat', '#dfe2d0', 1)
    const m = cloth.map.clone()
    m.repeat.set(6, 6)
    m.needsUpdate = true
    const b = cloth.bump.clone()
    b.repeat.set(6, 6)
    b.needsUpdate = true
    const matMat = new THREE.MeshPhysicalMaterial({ map: m, bumpMap: b, bumpScale: 0.9, roughness: 0.95, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color('#f6f7ec') })
    return { base: { geo: baseGeo, mat: woodMat }, rim: { geo: rimGeo, mat: woodMat }, mat: matMat }
  }, [])

  const piping = cordMaterial('satin', '#d8b98a')
  // the linen design mat grows for necklaces
  const R = useStudio((st) => (st.design.type === 'necklace' ? 8.7 : 7.6))

  return (
    <group>
      <mesh geometry={base.geo} material={base.mat} receiveShadow castShadow />
      <mesh geometry={rim.geo} material={rim.mat} receiveShadow castShadow />
      {/* round linen design mat — the "design area" */}
      <group position={[MAT_CENTER.x, TRAY.base, MAT_CENTER.z]}>
        <mesh material={mat} receiveShadow position-y={0.125}>
          <cylinderGeometry args={[R, R + 0.1, 0.25, 128]} />
        </mesh>
        <mesh material={piping} rotation-x={-Math.PI / 2} position-y={0.14} receiveShadow castShadow>
          <torusGeometry args={[R + 0.02, 0.09, 12, 160]} />
        </mesh>
      </group>
    </group>
  )
}
