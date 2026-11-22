import * as THREE from 'three'
import { BEAD_SHAPES, KNOT_STYLES } from '../data/catalog'
import type { Design, DesignItem, JewelryType, SegId } from '../data/types'

/**
 * Turns design data into placement data:
 *   design (segment + t values, sizes) → cord paths, arc-length positions, heights.
 * Pure maths — no meshes are created here.
 */

export const mm = (v: number) => v / 10 // world units are centimetres

const UP = new THREE.Vector3(0, 1, 0)
const wrap = (x: number, L: number) => ((x % L) + L) % L
const smooth = (e0: number, e1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

// ---------------------------------------------------------------- paths

/** A cord centre-line lying on the mat (local space, mat surface at y = 0), arc-length parameterised. */
export interface JPath {
  readonly L: number
  readonly closed: boolean
  point(s: number, out?: THREE.Vector3): THREE.Vector3
  tangent(s: number, out?: THREE.Vector3): THREE.Vector3
  /** Horizontal normal: outside of a loop / the right-hand side of an open cord. */
  outward(s: number, out?: THREE.Vector3): THREE.Vector3
  /** Nearest arc-length position and squared distance (xz only). */
  nearest(p: THREE.Vector3): { s: number; d2: number }
}

abstract class BasePath implements JPath {
  abstract readonly L: number
  abstract readonly closed: boolean
  abstract point(s: number, out?: THREE.Vector3): THREE.Vector3
  tangent(s: number, out = new THREE.Vector3()) {
    const e = 0.01
    const a = this.point(this.closed ? s - e : Math.max(0, s - e))
    const b = this.point(this.closed ? s + e : Math.min(this.L, s + e))
    return out.subVectors(b, a).setY(0).normalize()
  }
  outward(s: number, out = new THREE.Vector3()) {
    const t = this.tangent(s)
    return out.crossVectors(UP, t).normalize().multiplyScalar(this.closed ? 1 : 1)
  }
  nearest(p: THREE.Vector3) {
    const tmp = new THREE.Vector3()
    const N = Math.max(80, Math.round(this.L * 20))
    let best = 0
    let bestD = Infinity
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * this.L
      this.point(s, tmp)
      const d = (tmp.x - p.x) ** 2 + (tmp.z - p.z) ** 2
      if (d < bestD) { bestD = d; best = s }
    }
    let step = this.L / N
    for (let k = 0; k < 12; k++) {
      step *= 0.5
      for (const cand of [best - step, best + step]) {
        const c = this.closed ? wrap(cand, this.L) : THREE.MathUtils.clamp(cand, 0, this.L)
        this.point(c, tmp)
        const d = (tmp.x - p.x) ** 2 + (tmp.z - p.z) ** 2
        if (d < bestD) { bestD = d; best = c }
      }
    }
    return { s: best, d2: bestD }
  }
}

/**
 * Closed loop (bracelet, necklace, ring): a symmetric ellipse. s = 0 sits at the
 * clasp — front-centre (+z, toward the viewer) or back-centre for necklaces.
 */
export class LoopPath extends BasePath {
  readonly closed = true
  readonly L: number
  private table: { s: number; a: number }[] = []
  constructor(L: number, private ax: number, private az: number, private claspAtBack = false, private teardrop = 0) {
    super()
    const N = 720
    let s = 0
    let prev = this.raw(0)
    this.table.push({ s: 0, a: 0 })
    for (let i = 1; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      const p = this.raw(a)
      s += p.distanceTo(prev)
      prev = p
      this.table.push({ s, a })
    }
    const scale = L / s
    this.ax *= scale
    this.az *= scale
    this.L = L
    for (const e of this.table) e.s *= scale
  }
  private raw(a: number, out = new THREE.Vector3()) {
    const ang = a + (this.claspAtBack ? -Math.PI / 2 : Math.PI / 2)
    const z = Math.sin(ang)
    // teardrop: front (+z) narrows a little, like a necklace pulled by its pendant
    const pinch = 1 - this.teardrop * Math.max(0, z) * Math.max(0, z)
    return out.set(Math.cos(ang) * this.ax * pinch, 0, z * this.az)
  }
  private angleAt(s: number) {
    s = wrap(s, this.L)
    const t = this.table
    let lo = 0
    let hi = t.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (t[mid].s < s) lo = mid
      else hi = mid
    }
    const f = (s - t[lo].s) / Math.max(1e-6, t[hi].s - t[lo].s)
    return t[lo].a + (t[hi].a - t[lo].a) * f
  }
  point(s: number, out = new THREE.Vector3()) {
    return this.raw(this.angleAt(s), out)
  }
  outward(s: number, out = new THREE.Vector3()) {
    // for a loop, "outward" points away from the centre
    const p = this.point(s)
    const t = this.tangent(s)
    out.crossVectors(UP, t).normalize()
    if (out.dot(p) < 0) out.multiplyScalar(-1)
    return out
  }
}

/** Open cord (pendant drop, sliding-knot tails) through control points. */
export class CurvePath extends BasePath {
  readonly closed = false
  readonly L: number
  private curve: THREE.CatmullRomCurve3
  constructor(points: THREE.Vector3[]) {
    super()
    this.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    this.L = this.curve.getLength()
  }
  point(s: number, out = new THREE.Vector3()) {
    return out.copy(this.curve.getPointAt(THREE.MathUtils.clamp(s / this.L, 0, 1)))
  }
}

// ---------------------------------------------------------------- layout

export interface Placed {
  item: DesignItem
  /** Arc-length position of the item centre along its segment (cm). */
  s: number
  /** Length the item occupies along the cord (cm). */
  len: number
  /** Radius of the item body (cm) — also its centre height above the mat. */
  radius: number
}

export interface SegLayout {
  id: SegId
  path: JPath
  lo: number
  hi: number
  placed: Placed[]
  /** Gathered zones (strands together, e.g. inside the clasp) as [s0, s1]. */
  joins: [number, number][]
}

export interface Layout {
  type: JewelryType
  cordR: number
  claspLen: number
  /** Rough bounding radius of the whole piece on the mat (cm) — drives camera framing. */
  extent: number
  segs: SegLayout[]
  main: SegLayout
}

export function itemExtent(item: DesignItem, cordD: number) {
  if (item.kind === 'bead') {
    const shape = BEAD_SHAPES[item.shape]
    const d = mm(item.size)
    return { len: d * shape.aspect, radius: d / 2 }
  }
  const def = KNOT_STYLES[item.style]
  if (item.style === 'tassel') return { len: 0.45, radius: cordD * 0.55 }
  const reps = Math.min(item.repeat, def.maxRepeat)
  const unit = def.placement === 'flat' ? def.unit * cordD + (reps - 1) * def.unit * cordD * 0.85 : def.unit * cordD * reps
  return { len: unit, radius: def.radius * cordD }
}

/** Shape of the main cord for each type. */
export function mainPath(design: Design): JPath {
  const L = design.type === 'bracelet' ? design.length + 1.2 : design.length
  switch (design.type) {
    case 'necklace':
      return new LoopPath(L, 1.25, 1.0, true, 0.12)
    case 'ring':
      return new LoopPath(L, 1, 1)
    case 'pendant': {
      const z0 = -L / 2 + 0.6
      return new CurvePath([new THREE.Vector3(0, 0, z0), new THREE.Vector3(0, 0, z0 + L * 0.5), new THREE.Vector3(0, 0, z0 + L)])
    }
    case 'bracelet':
    default:
      return new LoopPath(L, 1.12, 0.92)
  }
}

export function claspLength(design: Design) {
  if (design.type === 'pendant') return 0
  if (design.ending === 'sealed') return 0.45
  if (design.ending === 'buttonLoop') return 1.5
  return Math.min(2.0, 1.1 + design.cord.diameter * 0.45)
}

/** The two free tails of a sliding-knot clasp: they leave the sleeve and splay outward symmetrically. */
function tailPaths(main: JPath, half: number, tailLen: number): [JPath, JPath] {
  const make = (s: number, dir: 1 | -1) => {
    const start = main.point(s)
    const t = main.tangent(s).multiplyScalar(dir)
    const o = main.outward(s)
    const pts = [
      start.clone(),
      start.clone().addScaledVector(t, 0.55).addScaledVector(o, 0.12),
      start.clone().addScaledVector(t, 0.95).addScaledVector(o, tailLen * 0.4),
      start.clone().addScaledVector(t, 1.05).addScaledVector(o, tailLen * 0.75),
      start.clone().addScaledVector(t, 0.95).addScaledVector(o, tailLen * 1.0),
    ]
    return new CurvePath(pts)
  }
  // s increases toward the viewer's left on a front-clasp loop
  return [make(half, 1), make(-half, -1)]
}

function relax(placed: Placed[], lo: number, hi: number, pinnedId: string | null | undefined, gap = 0.02) {
  placed.sort((a, b) => a.s - b.s)
  const clampAll = () => {
    for (const p of placed) p.s = Math.min(Math.max(p.s, lo + p.len / 2), Math.max(lo + p.len / 2, hi - p.len / 2))
  }
  clampAll()
  for (let iter = 0; iter < 60; iter++) {
    let moved = false
    for (let i = 0; i < placed.length - 1; i++) {
      const a = placed[i]
      const b = placed[i + 1]
      const need = (a.len + b.len) / 2 + gap
      const have = b.s - a.s
      if (have < need - 1e-4) {
        const push = need - have
        const aPinned = a.item.id === pinnedId
        const bPinned = b.item.id === pinnedId
        if (aPinned && !bPinned) b.s += push
        else if (bPinned && !aPinned) a.s -= push
        else { a.s -= push / 2; b.s += push / 2 }
        moved = true
      }
    }
    clampAll()
    if (!moved) break
  }
}

export function computeLayout(design: Design, pinnedId?: string | null): Layout {
  const cordD = mm(design.cord.diameter)
  const main = mainPath(design)
  const claspLen = claspLength(design)
  const hasTails = design.ending === 'slidingKnot' && design.type !== 'pendant'
  const segs: SegLayout[] = []

  const mainSeg: SegLayout =
    design.type === 'pendant'
      ? { id: 'main', path: main, lo: 0.6, hi: main.L - 0.4, placed: [], joins: [[0, 0.45], [main.L - 0.3, main.L]] }
      : { id: 'main', path: main, lo: claspLen / 2 + 0.1, hi: main.L - claspLen / 2 - 0.1, placed: [], joins: [[-claspLen / 2, claspLen / 2]] }
  segs.push(mainSeg)

  if (hasTails) {
    const [a, b] = tailPaths(main, claspLen / 2, Math.max(1, design.tailLength))
    for (const [id, path] of [['tailL', a], ['tailR', b]] as [SegId, JPath][]) {
      segs.push({ id, path, lo: 0.55, hi: path.L - 0.3, placed: [], joins: [[0, 0.35], [path.L - 0.3, path.L]] })
    }
  }

  for (const seg of segs) {
    const mine = design.items.filter((i) => (i.seg ?? 'main') === seg.id || (seg.id === 'main' && !segs.some((s) => s.id === i.seg)))
    seg.placed = mine.map((item) => ({ item, s: THREE.MathUtils.clamp(item.t, 0, 1) * seg.path.L, ...itemExtent(item, cordD) }))
    relax(seg.placed, seg.lo, seg.hi, pinnedId)
  }

  // bounding radius for camera framing
  let extent = 0
  const tmp = new THREE.Vector3()
  for (let i = 0; i <= 60; i++) extent = Math.max(extent, mainSeg.path.point((i / 60) * mainSeg.path.L, tmp).length())
  // a pendant also carries its hanging loop above and (often) a tassel below
  if (design.type === 'pendant') extent += 1.6

  return { type: design.type, cordR: cordD / 2, claspLen, extent, segs, main: mainSeg }
}

const segDist = (a: number, b: number, seg: SegLayout) => {
  if (!seg.path.closed) return Math.abs(a - b)
  const d = Math.abs(a - b) % seg.path.L
  return Math.min(d, seg.path.L - d)
}

/** Height of the cord centre at s: rises into beads/knots so it threads through their middle. */
export function cordHeight(s: number, seg: SegLayout, cordR: number) {
  let h = cordR
  for (const p of seg.placed) {
    if (p.item.kind === 'knot' && p.item.style === 'tassel') continue
    const d = segDist(s, p.s, seg)
    const half = p.len / 2
    const ramp = Math.max(0.35, p.radius * 1.4)
    const w = 1 - smooth(half * 0.6, half + ramp, d)
    h = Math.max(h, cordR + (p.radius - cordR) * w)
  }
  return h
}

/** 0 → strands lie side by side, 1 → gathered (inside beads / knots / clasp). */
export function gather(s: number, seg: SegLayout) {
  let g = 0
  for (const p of seg.placed) {
    const d = segDist(s, p.s, seg)
    g = Math.max(g, 1 - smooth(p.len / 2 - 0.02, p.len / 2 + 0.55, d))
  }
  for (const [a, b] of seg.joins) {
    const mid = (a + b) / 2
    const d = segDist(s, seg.path.closed ? wrap(mid, seg.path.L) : mid, seg)
    g = Math.max(g, 1 - smooth((b - a) / 2, (b - a) / 2 + 0.6, d))
  }
  return g
}
