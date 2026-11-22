import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CORD_MATERIALS } from '../data/materials'
import type { BeadMaterialId, BeadShape, CordMaterialId, KnotStyle } from '../data/types'
import { beadGeometry } from '../three/beadGeometry'
import { knotStrands, strandsGeometry } from '../three/knotGeometry'
import { beadMaterial, cordMaterial } from '../three/materialFactory'
import { buildTassel } from '../three/tasselGeometry'

/**
 * Real 3D thumbnails for the tray, rendered once with the same materials as the
 * scene (so a pearl looks like a pearl, not a tinted glass ball) and cached.
 */

const SIZE = 128
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
const cache = new Map<string, string>()

function ensure() {
  if (renderer) return renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SIZE, SIZE)
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.05
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#ffffff')
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.85
  const key = new THREE.DirectionalLight('#fff1dd', 2.2)
  key.position.set(-2, 3, 3)
  scene.add(key)
  scene.add(new THREE.HemisphereLight('#fffaf2', '#e7d6bd', 0.7))
  // a soft cream disc behind, so clear glass has something to refract
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#f1e6d6' }))
  disc.position.z = -3
  disc.scale.setScalar(1.6)
  disc.name = 'backdisc'
  scene.add(disc)
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50)
  return renderer
}

function render(key: string, obj: THREE.Object3D, tilt = 0.5): string {
  const hit = cache.get(key)
  if (hit) return hit
  const r = ensure()
  const holder = new THREE.Group()
  holder.add(obj)
  holder.rotation.set(tilt, -0.45, 0)
  scene.add(holder)
  const box = new THREE.Box3().setFromObject(holder)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  holder.position.sub(sphere.center)
  const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(15))) * (obj.userData.tight ? 0.8 : 0.92)
  camera.position.set(0, 0, dist)
  camera.lookAt(0, 0, 0)
  const disc = scene.getObjectByName('backdisc')!
  disc.position.z = -sphere.radius * 1.2
  disc.scale.setScalar(sphere.radius * 1.05)
  r.render(scene, camera)
  const url = r.domElement.toDataURL('image/png')
  scene.remove(holder)
  holder.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.userData.ownGeo) (o as THREE.Mesh).geometry.dispose() })
  cache.set(key, url)
  return url
}

export function beadThumb(material: BeadMaterialId, shape: BeadShape, color: string) {
  const key = `bead|${material}|${shape}|${color}`
  const hit = cache.get(key)
  if (hit) return hit
  const m = new THREE.Mesh(beadGeometry(shape), beadMaterial(material, color))
  // threading axis horizontal; a short cord shows the hole
  const g = new THREE.Group()
  g.add(m)
  g.userData.tight = true
  return render(key, g, 0.35)
}

export function knotThumb(style: KnotStyle, color = '#b4262c', material: CordMaterialId = 'satin') {
  const key = `knot|${style}|${color}|${material}`
  const hit = cache.get(key)
  if (hit) return hit
  const g = new THREE.Group()
  if (style === 'tassel') {
    const t = buildTassel({ length: 3, color, accent: '#d8b46e', cordColor: color, d: 0.2, hanging: true })
    t.rotation.z = -Math.PI / 2
    g.add(t)
    return render(key, g, 0.05)
  }
  const flat = ['doubleCoin', 'cloverleaf', 'panchang'].includes(style)
  const reps = ['diamond', 'snake'].includes(style) ? 2 : ['flat', 'flatTwist', 'snakeBelly'].includes(style) ? 2 : 1
  const mesh = new THREE.Mesh(strandsGeometry(knotStrands(style, reps), 0.2, CORD_MATERIALS[material].density), cordMaterial(material, color))
  mesh.userData.ownGeo = true
  g.add(mesh)
  mesh.userData.tight = true
  g.userData.tight = true
  if (!flat) {
    // just a short stub of cord either side, so the knot itself fills the thumbnail
    mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox!
    const len = bb.max.x - bb.min.x + 0.35
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 12).rotateZ(Math.PI / 2), cordMaterial(material, color))
    core.userData.ownGeo = true
    g.add(core)
  }
  return render(key, g, flat ? 1.05 : 0.45)
}

/** React hook: thumbnails are produced after first paint so the tray opens instantly. */
export function useThumb(make: () => string, deps: unknown[]) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const id = requestAnimationFrame(() => {
      try {
        const u = make()
        if (alive) setUrl(u)
      } catch {
        /* no WebGL for thumbnails — CSS fallback stays */
      }
    })
    return () => { alive = false; cancelAnimationFrame(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return url
}
