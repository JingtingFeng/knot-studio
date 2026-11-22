import * as THREE from 'three'
import { cordBump } from '../lib/textures'
import { knotStrands, strandsGeometry } from './knotGeometry'

/**
 * 流苏, following the book's method: a bundle of 流苏线 folded over a hanging
 * cord (→ the rounded head), bound just below the fold with wrapped thread
 * (绕线, here a gold band), and the fringe falling free. Lying on the tray the
 * fringe fans out softly.
 *
 * Built along +X from the attachment point (origin), resting on y = 0.
 */
export interface TasselSpec {
  /** fringe length, cm */
  length: number
  color: string
  accent: string
  /** colour of the hanging cord */
  cordColor: string
  /** cord diameter, cm */
  d: number
  /** stand upright (hanging) instead of lying on the mat */
  hanging?: boolean
}

const silkCache = new Map<string, THREE.MeshPhysicalMaterial>()
function silk(color: string) {
  let m = silkCache.get(color)
  if (!m) {
    const bump = cordBump('fineTwist').clone()
    bump.repeat.set(1, 18)
    bump.needsUpdate = true
    m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.38, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#fff6ea'), 0.45),
      anisotropy: 0.8, bumpMap: bump, bumpScale: 0.6, envMapIntensity: 0.7,
    })
    silkCache.set(color, m)
  }
  return m
}

const accentCache = new Map<string, THREE.MeshPhysicalMaterial>()
function wrapThread(color: string) {
  let m = accentCache.get(color)
  if (!m) {
    const bump = cordBump('twist').clone()
    bump.repeat.set(14, 1)
    bump.needsUpdate = true
    const metallic = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).s < 0.6 && /^#(d|e|c)/i.test(color)
    m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, metalness: metallic ? 0.75 : 0.1, bumpMap: bump, bumpScale: 1.2, sheen: metallic ? 0 : 0.8 })
    accentCache.set(color, m)
  }
  return m
}

export function buildTassel(spec: TasselSpec): THREE.Group {
  const g = new THREE.Group()
  const len = THREE.MathUtils.clamp(spec.length, 1.5, 10)
  const headR = 0.26 + len * 0.028
  const headLen = headR * 1.7
  const bandLen = 0.2 + len * 0.012
  const hangLen = 0.45

  // hanging cord + tiny 双联结 where it meets the head
  const hangerMat = new THREE.MeshPhysicalMaterial({ color: spec.cordColor, roughness: 0.45, sheen: 0.8 })
  const hanger = new THREE.Mesh(new THREE.CylinderGeometry(spec.d * 0.48, spec.d * 0.48, hangLen, 10).rotateZ(-Math.PI / 2).translate(hangLen / 2, 0, 0), hangerMat)
  g.add(hanger)
  const dc = new THREE.Mesh(strandsGeometry(knotStrands('doubleConnection', 1), spec.d * 0.8, 6), hangerMat)
  dc.position.x = hangLen * 0.55
  g.add(dc)

  const body = new THREE.Group()
  body.position.x = hangLen
  g.add(body)

  // head: the fold of the thread bundle, a soft bulb
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 40, 28), silk(spec.color))
  head.scale.set(headLen / (2 * headR), 1, 1)
  head.position.x = headLen / 2
  body.add(head)

  // band: wrapped binding thread (绕线)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.05, headR * 1.05, bandLen, 40).rotateZ(-Math.PI / 2), wrapThread(spec.accent))
  band.position.x = headLen * 0.82 + bandLen / 2
  body.add(band)

  // fringe: fine threads fanning out
  const count = 110
  const thread = new THREE.CylinderGeometry(0.016, 0.013, 1, 5, 1).rotateZ(-Math.PI / 2).translate(0.5, 0, 0)
  const fringe = new THREE.InstancedMesh(thread, silk(spec.color), count)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const startX = headLen * 0.82 + bandLen
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2
    const rr = Math.sqrt(rnd()) * headR * 0.95
    const start = new THREE.Vector3(startX, Math.sin(a) * rr, Math.cos(a) * rr)
    const l = len * (0.94 + rnd() * 0.08)
    let end: THREE.Vector3
    if (spec.hanging) {
      // hanging: a slim, slightly flared skirt
      end = new THREE.Vector3(startX + l, start.y * 1.6, start.z * 1.6)
    } else {
      // resting on the mat: fan out sideways, fall to the surface
      const spread = (rnd() - 0.5) * 2
      end = new THREE.Vector3(startX + l * (1 - 0.05 * spread * spread), -headR + 0.03 + rnd() * 0.04, spread * (headR * 1.1 + l * 0.18) + start.z * 0.5)
    }
    const dir = end.clone().sub(start)
    q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize())
    m.compose(start, q, new THREE.Vector3(dir.length(), 1, 1))
    fringe.setMatrixAt(i, m)
  }
  fringe.castShadow = true
  fringe.receiveShadow = true
  body.add(fringe)

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true }
  })
  // rest the head on the mat (origin is the attachment height = head centre)
  return g
}

export function tasselHeadRadius(length: number) {
  return 0.26 + THREE.MathUtils.clamp(length, 1.5, 10) * 0.028
}
