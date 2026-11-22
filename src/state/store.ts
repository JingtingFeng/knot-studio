import { create } from 'zustand'
import { BEAD_MATERIALS } from '../data/materials'
import { BEAD_SHAPES, JEWELRY_TYPES, KNOT_STYLES, blankDesign, makePresets, newId } from '../data/catalog'
import type { BeadItem, BeadShape, CordSpec, Design, DesignItem, EndingStyle, JewelryType, KnotItem, SegId, ViewMode } from '../data/types'
import { computeLayout } from '../lib/layout'

export type NewItemSpec =
  | { kind: 'bead'; shape: BeadShape; material: BeadItem['material']; color?: string; size?: number }
  | { kind: 'knot'; style: KnotItem['style']; repeat?: number }

export interface Spot { seg: SegId; t: number }

interface StudioState {
  presets: Design[]
  /** index into presets, or -1 for a user-created piece */
  presetIndex: number
  design: Design
  past: Design[]
  future: Design[]
  selectedId: string | null
  hoveredId: string | null
  draggingId: string | null
  view: ViewMode
  /** Bumped whenever the camera should fly to the current view's framing. */
  cameraNonce: number

  /** Save an undo point. Calls within ~0.6 s merge (slider drags), unless forced. */
  record: (force?: boolean) => void
  undo: () => void
  redo: () => void

  loadPreset: (i: number) => void
  newDesign: (type: JewelryType) => void
  select: (id: string | null) => void
  hover: (id: string | null) => void
  setDragging: (id: string | null) => void
  setView: (v: ViewMode) => void
  recenter: () => void

  setCord: (patch: Partial<CordSpec>) => void
  setEnding: (e: EndingStyle) => void
  setLength: (cm: number) => void
  setTailLength: (cm: number) => void
  updateItem: (id: string, patch: Partial<BeadItem> | Partial<KnotItem>) => void
  addItem: (spec: NewItemSpec, at?: Spot) => string
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  /** Bake the resolved (overlap-free) positions back into the design data. */
  commitLayout: () => void
}

const presets = makePresets()
let lastRecord = 0

/** Centre of the largest free stretch of the main cord. */
function largestGap(design: Design): Spot {
  const lay = computeLayout(design)
  const seg = lay.main
  const pts = [seg.lo, ...seg.placed.flatMap((p) => [p.s - p.len / 2, p.s + p.len / 2]), seg.hi]
  // prefer the front-centre (t = 0.5 on loops) when it is free
  let best = 0.5, bestLen = -1
  for (let i = 0; i < pts.length - 1; i += 2) {
    const a = pts[i], b = pts[i + 1]
    if (b - a > bestLen + 1e-3) { bestLen = b - a; best = (a + b) / 2 / seg.path.L }
  }
  return { seg: 'main', t: best }
}

/** Material dictates shape for some beads (pearls are round, crystal is faceted). */
export function constrainShape(material: BeadItem['material'], shape: BeadShape): BeadShape {
  const def = BEAD_MATERIALS[material]
  return def.shapes && !def.shapes.includes(shape) ? def.defaultShape : shape
}

export const useStudio = create<StudioState>((set, get) => ({
  presets,
  presetIndex: 0,
  design: structuredClone(presets[0]),
  past: [],
  future: [],
  selectedId: null,
  hoveredId: null,
  draggingId: null,
  view: 'intro',
  cameraNonce: 0,

  record: (force) => {
    const now = performance.now()
    if (!force && now - lastRecord < 600) { lastRecord = now; return }
    lastRecord = now
    set((s) => ({ past: [...s.past.slice(-79), structuredClone(s.design)], future: [] }))
  },
  undo: () => {
    const { past, design, future, selectedId } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    lastRecord = 0
    set({
      past: past.slice(0, -1), future: [design, ...future].slice(0, 80), design: prev,
      selectedId: prev.items.some((i) => i.id === selectedId) ? selectedId : null,
    })
  },
  redo: () => {
    const { past, design, future, selectedId } = get()
    if (!future.length) return
    const next = future[0]
    lastRecord = 0
    set({
      past: [...past, design], future: future.slice(1), design: next,
      selectedId: next.items.some((i) => i.id === selectedId) ? selectedId : null,
    })
  },

  loadPreset: (i) => {
    get().record(true)
    set((s) => ({ presetIndex: i, design: structuredClone(s.presets[i]), selectedId: null, cameraNonce: s.cameraNonce + 1 }))
  },
  newDesign: (type) => {
    get().record(true)
    set((s) => ({ presetIndex: -1, design: blankDesign(type), selectedId: null, view: s.view === 'intro' ? 'workshop' : s.view, cameraNonce: s.cameraNonce + 1 }))
  },
  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),
  setDragging: (id) => set({ draggingId: id }),
  setView: (v) => set((s) => ({ view: v, cameraNonce: s.cameraNonce + 1 })),
  recenter: () => set((s) => ({ cameraNonce: s.cameraNonce + 1 })),

  setCord: (patch) => { get().record(); set((s) => ({ design: { ...s.design, cord: { ...s.design.cord, ...patch } } })) },
  setEnding: (e) => {
    get().record(true)
    set((s) => ({ design: { ...s.design, ending: JEWELRY_TYPES[s.design.type].endings.includes(e) ? e : s.design.ending } }))
  },
  setLength: (cm) => { get().record(); set((s) => ({ design: { ...s.design, length: cm } })) },
  setTailLength: (cm) => { get().record(); set((s) => ({ design: { ...s.design, tailLength: cm } })) },

  updateItem: (id, patch) => {
    if (!get().draggingId) get().record()
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) => {
          if (it.id !== id) return it
          const next = { ...it, ...patch } as DesignItem
          if (next.kind === 'bead') next.shape = constrainShape(next.material, next.shape)
          if (next.kind === 'knot') next.repeat = Math.max(1, Math.min(next.repeat, KNOT_STYLES[next.style].maxRepeat))
          return next
        }),
      },
    }))
  },

  addItem: (spec, at) => {
    get().record(true)
    const id = newId()
    const spot = at ?? largestGap(get().design)
    let item: DesignItem
    if (spec.kind === 'bead') {
      item = {
        id, kind: 'bead', seg: spot.seg, t: spot.t, shape: constrainShape(spec.material, spec.shape), material: spec.material,
        color: spec.color ?? BEAD_MATERIALS[spec.material].defaultColor,
        size: spec.size ?? BEAD_SHAPES[spec.shape].defaultSize,
      }
    } else {
      item = {
        id, kind: 'knot', seg: spot.seg, t: spot.t, style: spec.style, repeat: spec.repeat ?? KNOT_STYLES[spec.style].defaultRepeat, color: null, material: null,
        ...(spec.style === 'tassel' ? { length: 4, accent: '#d8b46e' } : {}),
      }
    }
    set((s) => ({ design: { ...s.design, items: [...s.design.items, item] }, selectedId: id }))
    get().commitLayout()
    return id
  },

  removeItem: (id) => {
    get().record(true)
    set((s) => ({ design: { ...s.design, items: s.design.items.filter((i) => i.id !== id) }, selectedId: s.selectedId === id ? null : s.selectedId }))
  },

  duplicateItem: (id) => {
    const src = get().design.items.find((i) => i.id === id)
    if (!src) return
    get().record(true)
    const copy = { ...src, id: newId(), t: src.t + 0.02 } as DesignItem
    set((s) => ({ design: { ...s.design, items: [...s.design.items, copy] }, selectedId: copy.id }))
    get().commitLayout()
  },

  commitLayout: () => {
    const { design, draggingId } = get()
    const lay = computeLayout(design, draggingId)
    const pos = new Map<string, Spot>()
    for (const seg of lay.segs) for (const p of seg.placed) pos.set(p.item.id, { seg: seg.id, t: p.s / seg.path.L })
    set({ design: { ...design, items: design.items.map((i) => ({ ...i, ...(pos.get(i.id) ?? {}) })) } })
  },
}))

// handy for automation / screenshots
;(globalThis as any).__studio = useStudio
