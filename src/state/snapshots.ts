import { create } from 'zustand'
import type { Design } from '../data/types'

/** 方案快照: a picture of the current view, kept in this browser (localStorage). */
export interface Snapshot {
  id: string
  time: number
  name: string
  image: string // JPEG data URL
}

const KEY = 'knot-studio-snapshots'
const MAX = 12

function load(): Snapshot[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Snapshot[]) : []
  } catch {
    return []
  }
}

const storageOk = (() => {
  try {
    localStorage.setItem('__ks_probe', '1')
    localStorage.removeItem('__ks_probe')
    return true
  } catch {
    return false
  }
})()

/** Save to localStorage when possible; without storage the list still lives for this visit. */
function persist(list: Snapshot[]) {
  if (!storageOk) return list
  // drop the oldest from storage until it fits the quota — but keep all of them on screen
  for (let n = list.length; n >= 0; n--) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, n)))
      return list
    } catch {
      /* quota: try fewer */
    }
  }
  return list
}

/** Grab the rendered frame (no UI) at up to `maxW` pixels wide. */
function grabCanvas(maxW = 1600) {
  const src = document.querySelector('.stage canvas') as HTMLCanvasElement | null
  if (!src) return null
  const scale = Math.min(1, maxW / src.width)
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * scale)
  c.height = Math.round(src.height * scale)
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.88)
}

export const useSnapshots = create<{
  list: Snapshot[]
  flash: number
  take: (design: Design) => Snapshot | null
  remove: (id: string) => void
}>((set, get) => ({
  list: load(),
  flash: 0,
  take: (design) => {
    const image = grabCanvas()
    if (!image) return null
    const snap: Snapshot = { id: 's' + Date.now().toString(36), time: Date.now(), name: design.name, image }
    const list = persist([snap, ...get().list].slice(0, MAX))
    set({ list, flash: get().flash + 1 })
    return snap
  },
  remove: (id) => set((s) => ({ list: persist(s.list.filter((x) => x.id !== id)) })),
}))

type Downloads = { save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null
let downloadsPromise: Promise<Downloads> | null = null

/** Published page: the platform's downloads capability. Local dev: a plain <a download>. */
/** data: URL → Blob without fetch() (the published page's CSP may block fetching data: URLs). */
function dataUrlToBlob(url: string) {
  const [head, b64] = url.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function downloadSnapshot(s: Snapshot): Promise<'saved' | 'declined' | 'unavailable'> {
  let blob: Blob
  try {
    blob = dataUrlToBlob(s.image)
  } catch {
    return 'unavailable'
  }
  const stamp = new Date(s.time).toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const filename = `knot-studio-${stamp}.jpg`
  const claude = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude
  if (claude?.use) {
    downloadsPromise ??= claude.use('downloads').then((d) => (d as Downloads) ?? null).catch(() => null)
    const dl = await downloadsPromise
    if (dl) {
      try {
        await dl.save({ filename, data: blob })
        return 'saved'
      } catch (e) {
        const code = (e as { code?: string })?.code
        return code === 'declined' ? 'declined' : 'unavailable'
      }
    }
    return 'unavailable'
  }
  try {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    return 'saved'
  } catch {
    return 'unavailable'
  }
}
