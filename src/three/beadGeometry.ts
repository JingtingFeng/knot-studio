import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { BeadShape } from '../data/types'

/**
 * Unit bead geometries: diameter 1, threading axis along +X.
 * Slightly exaggerated, smooth silhouettes (stylised realism) with a
 * small countersunk hole where the cord enters.
 */

const cache = new Map<BeadShape, THREE.BufferGeometry>()

function lathe(profile: [number, number][], segments: number) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y))
  const g = new THREE.LatheGeometry(pts, segments)
  g.rotateZ(-Math.PI / 2) // lathe axis (y) → x
  g.computeVertexNormals()
  return g
}

/** Smooth profile helper: samples a superellipse so ends are rounded but not ball-like. */
function superProfile(halfLen: number, r: number, hole: number, exp: number, n = 40): [number, number][] {
  const out: [number, number][] = [[hole, -halfLen + 0.02], [hole + 0.03, -halfLen]]
  for (let i = 1; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    const c = Math.cos(a), s = Math.sin(a)
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / exp) * r
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / exp) * halfLen
    if (x > hole + 0.03) out.push([x, y])
  }
  out.push([hole + 0.03, halfLen], [hole, halfLen - 0.02])
  return out
}

export function beadGeometry(shape: BeadShape): THREE.BufferGeometry {
  const hit = cache.get(shape)
  if (hit) return hit
  let g: THREE.BufferGeometry
  switch (shape) {
    case 'round':
      g = lathe(superProfile(0.5, 0.5, 0.07, 2, 48), 64)
      break
    case 'faceted': {
      // classic faceted rondelle: crown + girdle + pavilion
      const prof: [number, number][] = [
        [0.08, -0.46], [0.24, -0.46], [0.43, -0.28], [0.5, -0.06], [0.5, 0.06], [0.43, 0.28], [0.24, 0.46], [0.08, 0.46],
      ]
      g = lathe(prof, 10)
      g = g.toNonIndexed()
      g.computeVertexNormals()
      break
    }
    case 'rondelle':
      g = lathe(superProfile(0.31, 0.5, 0.08, 2.6, 48), 64)
      break
    case 'barrel': {
      const prof: [number, number][] = [[0.07, -0.66], [0.12, -0.675]]
      for (let i = 0; i <= 30; i++) {
        const y = -0.66 + (i / 30) * 1.32
        const r = 0.41 + 0.09 * Math.cos((y / 0.66) * Math.PI / 2)
        prof.push([r, y])
      }
      prof.push([0.12, 0.675], [0.07, 0.66])
      g = lathe(prof, 56)
      break
    }
    case 'heishi':
      g = lathe(superProfile(0.15, 0.5, 0.1, 5, 32), 56)
      break
    case 'cube':
    default: {
      g = new RoundedBoxGeometry(0.88, 0.88, 0.88, 5, 0.14)
      break
    }
  }
  cache.set(shape, g)
  return g
}
