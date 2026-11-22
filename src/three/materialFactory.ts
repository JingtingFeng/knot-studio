import * as THREE from 'three'
import { BEAD_MATERIALS, CORD_MATERIALS } from '../data/materials'
import type { BeadMaterialId, CordMaterialId } from '../data/types'
import { beadDetail, cordBump, goldFleckMap, goldFleckMetal } from '../lib/textures'

/**
 * Builds (and caches) three.js materials from Material Library definitions.
 * Identical definitions share one material instance, so a bracelet of 30 beads
 * costs only a handful of shader programs.
 */

const beadCache = new Map<string, THREE.MeshPhysicalMaterial>()
const cordCache = new Map<string, THREE.MeshPhysicalMaterial>()

export function beadMaterial(id: BeadMaterialId, color: string) {
  const key = `${id}|${color}`
  const hit = beadCache.get(key)
  if (hit) return hit
  const def = BEAD_MATERIALS[id]
  const p = def.pbr
  const c = new THREE.Color(color)
  const m = new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: p.roughness,
    metalness: p.metalness ?? 0,
    transmission: p.transmission ?? 0,
    thickness: p.thickness ?? 0,
    ior: p.ior ?? 1.5,
    clearcoat: p.clearcoat ?? 0,
    clearcoatRoughness: p.clearcoatRoughness ?? 0,
    sheen: p.sheen ?? 0,
    sheenRoughness: p.sheenRoughness ?? 0.5,
    sheenColor: new THREE.Color(p.sheenColor ?? '#ffffff'),
    iridescence: p.iridescence ?? 0,
    iridescenceIOR: p.iridescenceIOR ?? 1.3,
    dispersion: p.dispersion ?? 0,
    specularIntensity: p.specularIntensity ?? 1,
    envMapIntensity: p.envMapIntensity ?? 1,
    flatShading: !!def.flat,
  })
  if (p.transmission) {
    // light travelling through tinted glass/stone picks up its colour
    // clear glass/crystal: tint lightly so the cord inside still shows its colour;
    // stones: deep tint for a milky, glowing body
    const clear = (p.transmission ?? 0) >= 1
    m.attenuationColor = c.clone().lerp(new THREE.Color('#ffffff'), clear ? 0.55 : 0.15)
    m.attenuationDistance = p.attenuationDistance ?? 1
    // keep a bit of body colour so glass never looks empty against the cream background
    m.color = c.clone().lerp(new THREE.Color('#ffffff'), 0.3)
  }
  if (def.texture) m.map = beadDetail(def.texture)
  beadCache.set(key, m)
  return m
}

export function cordMaterial(id: CordMaterialId, color: string) {
  const key = `${id}|${color}`
  const hit = cordCache.get(key)
  if (hit) return hit
  const def = CORD_MATERIALS[id]
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: def.roughness,
    metalness: def.metalness,
    sheen: def.sheen,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#fff4e6'), 0.3),
    bumpMap: cordBump(def.weave),
    bumpScale: def.bump * 1.6,
    anisotropy: def.anisotropy,
    envMapIntensity: def.metalness > 0.5 ? 0.9 : 0.55,
  })
  if (def.goldFleck) {
    m.color.set('#ffffff')
    m.map = goldFleckMap(color)
    const mr = goldFleckMetal()
    m.metalnessMap = mr
    m.roughnessMap = mr
    m.metalness = 1
  }
  cordCache.set(key, m)
  return m
}

/**
 * Rescale tube UVs so the cord texture tiles at a constant physical density
 * (u along the cord, v around it).
 */
export function scaleTubeUVs(geo: THREE.BufferGeometry, length: number, density: number) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * length * density)
  uv.needsUpdate = true
  return geo
}
