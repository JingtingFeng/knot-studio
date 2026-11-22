import * as THREE from 'three'
import type { JPath } from '../../lib/layout'

const UP = new THREE.Vector3(0, 1, 0)
const m = new THREE.Matrix4()
const t = new THREE.Vector3()
const z = new THREE.Vector3()

/** Position + orientation (x = along the cord, y = up, z = outward) at arc-length s. */
export function frameAt(path: JPath, s: number, height: number) {
  const position = path.point(s).addScaledVector(UP, height)
  path.tangent(s, t)
  z.crossVectors(t, UP).normalize()
  m.makeBasis(t, UP, z)
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(m)
  return { position, quaternion }
}
