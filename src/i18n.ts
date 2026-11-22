import { create } from 'zustand'

/**
 * Language: 简体中文 or English, never mixed on screen.
 * Data entries carry both (`zh` / `name`); UI strings live in the table below.
 */
export type Lang = 'zh' | 'en'

const saved = (() => {
  try {
    const v = localStorage.getItem('knot-studio-lang')
    return v === 'en' || v === 'zh' ? v : null
  } catch {
    return null
  }
})()

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: saved ?? (navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  setLang: (lang) => {
    try { localStorage.setItem('knot-studio-lang', lang) } catch { /* private mode */ }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    set({ lang })
  },
}))

const STRINGS = {
  brandSub: { zh: '结艺工坊 · 温馨的中国结饰品工作台', en: 'Cozy Chinese-knot jewellery studio' },
  workshop: { zh: '工作台', en: 'Workshop' },
  inspect: { zh: '端详', en: 'Inspect' },
  showcase: { zh: '展示', en: 'Showcase' },
  newPiece: { zh: '＋ 新建', en: '＋ New' },
  newTitle: { zh: '新建一条手链', en: 'Start a new bracelet' },
  langToggle: { zh: 'English', en: '中文' },
  langTitle: { zh: 'Switch to English', en: '切换到简体中文' },
  snapshot: { zh: '快照', en: 'Snapshot' },
  snapshotTitle: { zh: '保存当前画面的快照', en: 'Save a snapshot of this view' },
  snapshots: { zh: '方案快照', en: 'Snapshots' },
  snapSaved: { zh: '已保存快照', en: 'Snapshot saved' },
  snapEmpty: { zh: '还没有快照。点击“快照”保存当前画面。', en: 'No snapshots yet. Press Snapshot to keep this view.' },
  snapDownload: { zh: '下载图片', en: 'Download image' },
  snapDelete: { zh: '删除', en: 'Delete' },
  snapNoDownload: { zh: '这里无法直接下载，已打开大图，可右键“图片另存为”', en: 'Direct download is not available here — the image is open: right-click → Save image' },
  snapDownloaded: { zh: '图片已保存', en: 'Image saved' },
  snapDeclined: { zh: '已取消下载', en: 'Download cancelled' },
  snapFailed: { zh: '截图失败，请稍后再试', en: 'Could not capture — try again' },
  snapPreview: { zh: '查看大图', en: 'View larger' },
  snapSaveHint: { zh: '右键（或长按）图片即可保存 · 点击空白处关闭', en: 'Right-click (or long-press) the image to save it · click outside to close' },
  recenter: { zh: '重新取景', en: 'Re-frame the camera' },
  loading: { zh: '正在摆好托盘…', en: 'Setting out the tray…' },
  dragTurn: { zh: '拖动旋转', en: 'Drag to turn' },
  hintOrbit: { zh: '拖动|旋转视角', en: 'Drag|to orbit' },
  hintZoom: { zh: '滚轮|缩放', en: 'Scroll|to zoom' },
  hintClick: { zh: '点击|珠子或绳结进行编辑', en: 'Click|a bead or knot to edit' },
  hintSlide: { zh: '拖动|沿绳移动或移到尾线', en: 'Drag|a piece along the cord or onto a tail' },
  // library
  tabBeads: { zh: '珠子', en: 'Beads' },
  tabKnots: { zh: '绳结', en: 'Knots' },
  tabCord: { zh: '绳线', en: 'Cord' },
  tabFinish: { zh: '收尾', en: 'Finish' },
  beadTray: { zh: '珠子托盘', en: 'Bead tray' },
  beadHint: { zh: '点击即可穿到绳上，也可以拖到手链（包括尾线）上的指定位置。', en: 'Click to thread one onto the cord, or drag it onto the piece — tails included — to place it exactly.' },
  knotLib: { zh: '绳结组件库', en: 'Knot components' },
  knotHint: { zh: '绳结默认使用主线的颜色和线种。选中绳结后可查看《中国结一本通》中的编法步骤。', en: 'Knots use the main cord unless you give them their own colour. Select a knot to see its steps from 《中国结一本通》.' },
  thread: { zh: '线种', en: 'Thread' },
  colour: { zh: '颜色', en: 'Colour' },
  customColour: { zh: '自定义颜色', en: 'Custom colour' },
  thickness: { zh: '粗细', en: 'Thickness' },
  strands: { zh: '股数', en: 'Strands' },
  single: { zh: '单股', en: 'Single' },
  double: { zh: '双股', en: 'Double' },
  finish: { zh: '收尾方式', en: 'Clasp & finish' },
  tailLength: { zh: '尾线长度', en: 'Tail length' },
  tailBeads: { zh: '尾珠', en: 'Tail beads' },
  tailHint: { zh: '尾线和中段一样：点击尾珠可修改，可沿尾线拖动，也可以把托盘里的珠子拖到尾线上。', en: 'Each tail works like the middle of the cord: click a tail bead to change it, drag it along the tail, or drop any bead from the tray onto a tail.' },
  leftTail: { zh: '左尾线', en: 'Left tail' },
  rightTail: { zh: '右尾线', en: 'Right tail' },
  addPair: { zh: '两侧各加一颗', en: 'Add a pair' },
  tasselMoved: { zh: '流苏在“绳结”栏中，可以放在任意位置并复制。', en: 'Tassels live in the Knots tab, so you can place one anywhere and duplicate it.' },
  // inspector
  material: { zh: '材质', en: 'Material' },
  shape: { zh: '形状', en: 'Shape' },
  shapeLocked: { zh: '形状由材质决定', en: 'Shape set by material' },
  size: { zh: '尺寸', en: 'Size' },
  knotStyle: { zh: '结式', en: 'Knot style' },
  repeat: { zh: '重复次数', en: 'Repeat' },
  maxN: { zh: '最多', en: 'max' },
  fringe: { zh: '流苏长度', en: 'Fringe length' },
  tasselOne: { zh: '每处只能放一个流苏，需要更多请用“复制”。', en: 'A tassel is a single piece (repeat 1). Use Duplicate to add another.' },
  band: { zh: '绕线颜色', en: 'Band colour' },
  silk: { zh: '流苏颜色', en: 'Silk colour' },
  matchCord: { zh: '同主线', en: 'Match cord' },
  steps: { zh: '编法步骤', en: 'Book steps' },
  stepsBook: { zh: '走线按步骤构建', en: 'path built from these' },
  stepsStyl: { zh: '造型为风格化', en: 'shape stylised' },
  duplicate: { zh: '复制', en: 'Duplicate' },
  remove: { zh: '移除', en: 'Remove' },
  deselect: { zh: '取消选择', en: 'Deselect' },
  type: { zh: '类别', en: 'Type' },
  mainCord: { zh: '主线', en: 'Main cord' },
  cordCut: { zh: '用线（约）', en: 'Cord to cut (approx.)' },
  knots: { zh: '绳结', en: 'Knots' },
  beadList: { zh: '材料清单', en: 'Bead list' },
  noBeads: { zh: '还没有珠子，从托盘里挑几颗吧。', en: 'No beads yet — pick some from the tray.' },
  tutorial: { zh: '生成教程', en: 'Generate Tutorial' },
  soon: { zh: '即将推出', en: 'SOON' },
  segMain: { zh: '主线', en: 'Main cord' },
  segL: { zh: '左尾线', en: 'Left tail' },
  segR: { zh: '右尾线', en: 'Right tail' },
} satisfies Record<string, { zh: string; en: string }>

export type StrKey = keyof typeof STRINGS

export function useT() {
  const lang = useLang((s) => s.lang)
  const t = (k: StrKey) => STRINGS[k][lang]
  /** Pick the right language from a data entry that has `zh` + `name`. */
  const n = (o: { zh: string; name: string }) => (lang === 'zh' ? o.zh : o.name)
  return { t, n, lang }
}

/** "彩色手链 · Lagoon" → the half for the current language. */
export function pickName(name: string, lang: Lang) {
  const [zh, en] = name.split('·').map((x) => x.trim())
  return (lang === 'zh' ? zh : en) || zh || name
}

/** "中国红 China red" → one language. */
export function pickPalette(name: string, lang: Lang) {
  const i = name.indexOf(' ')
  return i < 0 ? name : lang === 'zh' ? name.slice(0, i) : name.slice(i + 1)
}
;(globalThis as any).__lang = useLang
