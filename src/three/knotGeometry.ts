import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { KNOT_STYLES } from '../data/catalog'
import type { KnotStyle } from '../data/types'

/**
 * Knots as strand data.
 * Every knot is a set of strand centre-lines in units of cord diameter
 * (threading axis = +X, up = +Y, outward = +Z). Strands built from the book's
 * steps carry `step` tags per control point, so the tutorial can later draw the
 * same path progressively (draw-on, slow-mo, reverse) — one source for both the
 * finished shape and the animation.
 */

export interface Strand {
  pts: THREE.Vector3[]
  closed: boolean
  /** Tube radius in cord diameters (0.5 = the cord itself). */
  radius: number
  /** Optional: tutorial step index for each control point. */
  step?: number[]
  /** Which working cord this is (a / b / core) — for colour-coded tutorials. */
  role?: 'a' | 'b' | 'core'
}

const TAU = Math.PI * 2
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function torusKnot(p: number, q: number, R: number, r: number, stretch: number, cx: number, rot: number, n = 160) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU
    const rho = R + r * Math.cos(q * t)
    pts.push(V(cx + r * stretch * Math.sin(q * t), rho * Math.cos(p * t + rot), rho * Math.sin(p * t + rot)))
  }
  return pts
}

/**
 * 平结 from the book's steps. Two working cords (a, b) around a flat core of two
 * strands. In every half knot:
 *   a 挑 b, 压垂线 — a crosses OVER the core (the visible diagonal bar),
 *   b goes UNDER the core and up through a's loop (the side bump).
 * Two-direction (双向) flips left/right each half knot so the bumps alternate
 * and the sinnet stays flat; one-direction (单向) never flips, so it spirals.
 */
function squareKnot(halves: number, pitch: number, twist: boolean): Strand[] {
  const W = 1.45 // cords pass just outside the core (core = 2 strands side by side)
  const h = 1.0 // over / under the core
  const L = halves * pitch
  const x0 = -L / 2
  // cord a stays on the front: it zig-zags across as the bars (a 挑 b, 压垂线 → over the core);
  // cord b stays behind and, at every edge, wraps forward over a's turn and back through the
  // loop (穿过左圈 / 穿过右圈) — those wraps are the knotted edge of the sinnet.
  const a: THREE.Vector3[] = []
  const b: THREE.Vector3[] = []
  const sa: number[] = []
  const sb: number[] = []
  let e = -1 // a starts on the left
  // trimmed ends are tucked into the core (烧黏 / 剪掉多余的线)
  a.push(V(x0 - 0.3, 0.15, -0.55)); sa.push(1)
  b.push(V(x0 - 0.3, -0.15, 0.55)); sb.push(1)
  for (let k = 0; k < halves; k++) {
    const xk = x0 + (k + 0.5) * pitch
    const step = (k % 2) * 3 + 2 // half 1 ↔ steps 2–3, half 2 ↔ steps 5–6
    const P = (dx: number, y: number, z: number) => V(xk + dx * pitch, y, z)
    // a: the front bar, edge to edge
    a.push(P(-0.32, 0.45 * h, e * W), P(-0.1, h, e * 0.55 * W), P(0.05, h, -e * 0.55 * W), P(0.28, 0.45 * h, -e * W))
    sa.push(step, step, step, step)
    // b: over a's turn at the far edge, round the outside, behind the core, out through the near loop
    b.push(
      P(-0.2, 0.8 * h, -e * (W + 0.2)),
      P(0.0, 0.05, -e * (W + 0.6)),
      P(0.2, -h, -e * 0.5 * W),
      P(0.25, -h, e * 0.5 * W),
      P(0.38, 0.0, e * (W + 0.6)),
    )
    sb.push(step + 1, step + 1, step + 1, step + 1, step + 1)
    e = -e
  }
  a.push(V(-x0 + 0.3, 0.15, e * 0.55)); sa.push(sa[sa.length - 1])
  b.push(V(-x0 + 0.3, -0.15, -e * 0.55)); sb.push(sb[sb.length - 1])
  const out: Strand[] = [
    { pts: a, closed: false, radius: 0.5, step: sa, role: 'a' },
    { pts: b, closed: false, radius: 0.5, step: sb, role: 'b' },
  ]
  if (twist) {
    // single-direction half knots rotate the sinnet: ~180° every 6 half knots
    for (const s of out) for (const p of s.pts) {
      const ang = ((p.x - x0) / (6 * pitch)) * Math.PI
      const y = p.y * Math.cos(ang) - p.z * Math.sin(ang)
      const z = p.y * Math.sin(ang) + p.z * Math.cos(ang)
      p.y = y
      p.z = z
    }
  }
  return out
}

/** 双钱结 (Carrick mat): a flattened 3-lead × 4-bight Turk's head, stretched into two "coins". */
function doubleCoin(count: number): Strand[] {
  const out: Strand[] = []
  for (let c = 0; c < count; c++) {
    const pts: THREE.Vector3[] = []
    const N = 240
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU
      const rho = 1.55 + 1.15 * Math.cos(4 * t)
      const ang = 3 * t
      pts.push(V(Math.cos(ang) * rho * 1.25 + c * 5.5 - (count - 1) * 2.75, 0.42 * Math.sin(4 * t), Math.sin(ang) * rho * 0.9))
    }
    out.push({ pts, closed: true, radius: 0.48 })
  }
  return out
}

/** 酢浆草结: three outer petals (外①②③) around small inner rings, lying flat. */
function cloverleaf(count: number): Strand[] {
  const out: Strand[] = []
  for (let c = 0; c < count; c++) {
    const pts: THREE.Vector3[] = []
    const N = 260
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU
      // limaçon-like rose: big petals + small inner loops
      const r = 0.7 + 2.3 * Math.cos(3 * t)
      const ang = t + Math.PI / 2
      pts.push(V(Math.cos(ang) * r + c * 4.8 - (count - 1) * 2.4, 0.45 * Math.sin(5 * t), Math.sin(ang) * r * 0.95))
    }
    out.push({ pts, closed: true, radius: 0.47 })
  }
  return out
}

/**
 * 二回盘长结: four "a" rows and four "b" columns woven over/under on a pin board
 * (挑2压1挑3压1挑1 gives the alternating pattern), closed by ears (耳翼) on every
 * side, then turned 45° so it hangs as a diamond.
 */
function panchang(): Strand[] {
  const s = 1.25 // lattice spacing
  const n = 4
  const e = 1.4 // ear reach
  const h = 0.42
  const out: Strand[] = []
  const lines = (horizontal: boolean) => {
    for (let k = 0; k < n; k += 2) {
      const pts: THREE.Vector3[] = []
      const vA = (k - (n - 1) / 2) * s
      const vB = (k + 1 - (n - 1) / 2) * s
      const span = ((n - 1) / 2) * s + 0.55
      // one "一来一回" pass = a closed racetrack: out along row k, ear, back along row k+1, ear
      const N = 60
      const pushRow = (v: number, dir: 1 | -1) => {
        for (let i = 0; i <= N; i++) {
          const u = -span + (2 * span * i) / N
          const uu = dir > 0 ? u : -u
          const cross = Math.cos(((uu + ((n - 1) / 2) * s) / s) * Math.PI + (horizontal ? 0 : Math.PI) + k * Math.PI * 0.5)
          pts.push(horizontal ? V(uu, h * cross, v) : V(v, -h * cross, uu))
        }
      }
      const ear = (u: number, v0: number, v1: number, big: boolean) => {
        const r = (Math.abs(v1 - v0) / 2) * (big ? 1.25 : 1)
        const c = (v0 + v1) / 2
        for (let i = 1; i < 14; i++) {
          const a = (i / 14) * Math.PI
          const uu = u + Math.sign(u) * Math.sin(a) * (big ? e * 1.25 : e * 0.75)
          const vv = c + Math.cos(a) * r * Math.sign(v0 - v1)
          pts.push(horizontal ? V(uu, 0, vv) : V(vv, 0, uu))
        }
      }
      pushRow(vA, 1)
      ear(span, vA, vB, k === 0)
      pushRow(vB, -1)
      ear(-span, vB, vA, k === 0)
      out.push({ pts, closed: true, radius: 0.46 })
    }
  }
  lines(true)
  lines(false)
  // rotate 45° in the mat plane so it reads as the classic diamond
  const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 4)
  for (const st of out) for (const p of st.pts) p.applyQuaternion(q)
  return out
}

export function knotStrands(style: KnotStyle, repeat: number): Strand[] {
  const def = KNOT_STYLES[style]
  const n = Math.max(1, Math.min(repeat, def.maxRepeat))
  const U = def.unit
  const L = U * n
  const out: Strand[] = []

  switch (style) {
    case 'flat':
      return squareKnot(n * 2, 0.9, false)
    case 'flatTwist':
      return squareKnot(n * 2, 0.9, true)
    case 'diamond': {
      // each unit: two interlaced strands that cross twice around the core —
      // tight enough that the lobes press together like a real 金刚结 run
      for (let i = 0; i < n; i++) {
        const cx = (i - (n - 1) / 2) * U
        for (let k = 0; k < 2; k++) {
          const pts: THREE.Vector3[] = []
          const N = 96
          for (let j = 0; j < N; j++) {
            const a = (j / N) * TAU
            const th = a + k * Math.PI + i * 0.5
            const rho = 0.72 + 0.25 * Math.cos(2 * a)
            pts.push(V(cx + 0.75 * Math.sin(2 * a + k * Math.PI), rho * Math.cos(th), rho * Math.sin(th)))
          }
          out.push({ pts, closed: true, radius: 0.5, role: k ? 'b' : 'a' })
        }
      }
      return out
    }
    case 'doubleConnection': {
      for (let i = 0; i < n; i++) {
        const cx = (i - (n - 1) / 2) * U
        out.push({ pts: torusKnot(2, 5, 0.85, 0.48, 1.4, cx, i, 220), closed: true, radius: 0.45 })
      }
      return out
    }
    case 'button': {
      for (let i = 0; i < n; i++) {
        const cx = (i - (n - 1) / 2) * U
        out.push({ pts: torusKnot(3, 4, 1.0, 0.78, 1.0, cx, i * 0.4, 260), closed: true, radius: 0.47 })
      }
      return out
    }
    case 'snake': {
      // two strands spiralling tightly with a chevron pinch
      for (let k = 0; k < 2; k++) {
        const pts: THREE.Vector3[] = [V(-L / 2 - 0.7, 0, 0)]
        const N = 48 * n
        for (let i = 0; i <= N; i++) {
          const u = (i / N) * n
          const th = u * TAU + k * Math.PI
          const rho = 0.68 + 0.16 * Math.cos(2 * th)
          pts.push(V(-L / 2 + u * U + 0.22 * Math.cos(th), rho * Math.cos(th), rho * Math.sin(th) * 1.15))
        }
        pts.push(V(L / 2 + 0.7, 0, 0))
        out.push({ pts, closed: false, radius: 0.5, role: k ? 'b' : 'a' })
      }
      return out
    }
    case 'snakeBelly': {
      // four-strand round braid: two strands spiral each way, over-under
      for (let k = 0; k < 4; k++) {
        const dir = k % 2 ? -1 : 1
        const phi = (k >> 1) * Math.PI
        const pts: THREE.Vector3[] = [V(-L / 2 - 0.5, 0, 0)]
        const N = 40 * n
        for (let i = 0; i <= N; i++) {
          const u = (i / N) * n
          const th = dir * u * TAU * 0.5 + phi
          const rho = 0.62 + 0.14 * Math.sin(2 * u * TAU + (k % 2) * Math.PI)
          pts.push(V(-L / 2 + u * U, rho * Math.cos(th), rho * Math.sin(th)))
        }
        pts.push(V(L / 2 + 0.5, 0, 0))
        out.push({ pts, closed: false, radius: 0.46 })
      }
      return out
    }
    case 'doubleCoin':
      return doubleCoin(n)
    case 'cloverleaf':
      return cloverleaf(n)
    case 'panchang':
      return panchang()
    case 'tassel':
    default:
      return []
  }
}

/** Ball-shaped 纽扣结 used by the button-and-loop clasp. */
export function buttonKnotStrands(): Strand[] {
  return knotStrands('button', 1)
}

/** Tube meshes for strands, merged into one geometry. Units: cord diameters → scaled by `d`. */
export function strandsGeometry(strands: Strand[], d: number, density: number, radial = 10) {
  const geos = strands.map((s) => {
    const curve = new THREE.CatmullRomCurve3(s.pts, s.closed, 'centripetal')
    const len = curve.getLength()
    const segs = Math.max(24, Math.round(len * 10))
    const g = new THREE.TubeGeometry(curve, segs, s.radius, radial, s.closed)
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len * d * density)
    return g
  })
  const merged = mergeGeometries(geos, false)!
  geos.forEach((g) => g.dispose())
  merged.scale(d, d, d)
  merged.computeBoundingSphere()
  return merged
}
