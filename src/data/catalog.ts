import type { BeadMaterialId, BeadShape, Design, DesignItem, EndingStyle, JewelryType, KnotStyle, SegId } from './types'

/** Reusable component catalogue: everything the user can pick from the tray. */

export interface BeadShapeDef {
  id: BeadShape
  name: string
  zh: string
  /** Length along the cord relative to the diameter. */
  aspect: number
  defaultSize: number
}

export const BEAD_SHAPES: Record<BeadShape, BeadShapeDef> = {
  round: { id: 'round', name: 'Round', zh: '圆珠', aspect: 1, defaultSize: 8 },
  faceted: { id: 'faceted', name: 'Faceted', zh: '切面珠', aspect: 0.92, defaultSize: 8 },
  rondelle: { id: 'rondelle', name: 'Rondelle', zh: '算盘珠', aspect: 0.62, defaultSize: 7 },
  cube: { id: 'cube', name: 'Cube', zh: '方珠', aspect: 1, defaultSize: 6 },
  barrel: { id: 'barrel', name: 'Barrel', zh: '桶珠', aspect: 1.35, defaultSize: 7 },
  heishi: { id: 'heishi', name: 'Spacer', zh: '隔片', aspect: 0.3, defaultSize: 6 },
}

/** Fixed bead "SKUs" shown in the tray. Editing a bead on the piece never changes these. */
export interface BeadPreset {
  id: string
  name: string
  zh: string
  material: BeadMaterialId
  shape: BeadShape
  color: string
  size: number
}

export const BEAD_PRESETS: BeadPreset[] = [
  { id: 'glass', name: 'Clear glass', zh: '透明琉璃', material: 'glass', shape: 'round', color: '#5fc8bf', size: 8 },
  { id: 'frosted', name: 'Frosted glass', zh: '磨砂琉璃', material: 'frosted', shape: 'round', color: '#9fd6cf', size: 8 },
  { id: 'crystal', name: 'Cut crystal', zh: '切面水晶', material: 'crystal', shape: 'faceted', color: '#f3d9e6', size: 6 },
  { id: 'pearl', name: 'Pearl', zh: '珍珠', material: 'pearl', shape: 'round', color: '#f6eee3', size: 6 },
  { id: 'jade', name: 'Jade', zh: '玉石圆珠', material: 'jade', shape: 'round', color: '#7fb98a', size: 8 },
  { id: 'agate', name: 'Red agate', zh: '红玛瑙', material: 'agate', shape: 'round', color: '#b8352e', size: 8 },
  { id: 'ceramic', name: 'Blue ceramic', zh: '青瓷圆珠', material: 'ceramic', shape: 'round', color: '#3f6fb3', size: 8 },
  { id: 'ceramicCube', name: 'Ceramic cube', zh: '白瓷方珠', material: 'ceramic', shape: 'cube', color: '#eee5d6', size: 6 },
  { id: 'goldRondelle', name: 'Gold rondelle', zh: '金算盘珠', material: 'gold', shape: 'rondelle', color: '#e4c48e', size: 5 },
  { id: 'goldBarrel', name: 'Gold barrel', zh: '金色桶珠', material: 'gold', shape: 'barrel', color: '#e4c48e', size: 6 },
  { id: 'silverSpacer', name: 'Silver spacer', zh: '银隔片', material: 'silver', shape: 'heishi', color: '#d9d6d0', size: 6 },
  { id: 'wood', name: 'Sandal\u00ADwood', zh: '檀木桶珠', material: 'wood', shape: 'barrel', color: '#9a6a45', size: 8 },
]

export interface KnotStyleDef {
  id: KnotStyle
  name: string
  zh: string
  blurb: string
  blurbZh: string
  /** Length of one knot unit along the cord, in multiples of cord diameter. */
  unit: number
  /** Height of the knot centre (= cord height through it), in cord diameters. */
  radius: number
  defaultRepeat: number
  maxRepeat: number
  /** inline = tied around the cord; flat = decorative knot lying flat; hanging = tassel. */
  placement: 'inline' | 'flat' | 'hanging'
  /** How the 3D strand path was authored. */
  source: 'book-steps' | 'stylised'
  /** Step text from 《中国结一本通》 — the same data will drive the tutorial animation. */
  steps: string[]
}

export const KNOT_STYLES: Record<KnotStyle, KnotStyleDef> = {
  flat: {
    id: 'flat', name: 'Square knot', zh: '双向平结', blurb: 'Flat ladder; the working cords swap the bump side every half knot. Used for sliding clasps.', blurbZh: '扁平如梯，左右两线每半个结交换耳翼一侧，常用作活扣。',
    unit: 1.8, radius: 1.05, defaultRepeat: 4, maxRepeat: 16, placement: 'inline', source: 'book-steps',
    steps: ['取两线对折，呈十字交叉叠放', 'a挑b，压垂线，穿过左圈', '将两线拉紧', 'b挑垂线', 'a挑b，压垂线，穿过右圈', '将左右两线拉紧', '重复步骤2～6'],
  },
  flatTwist: {
    id: 'flatTwist', name: 'Spiral square knot', zh: '单向平结', blurb: 'Half knots always tied the same way — the sinnet twists into a spiral.', blurbZh: '始终朝同一方向编半结，结体自然形成螺旋。',
    unit: 1.8, radius: 1.05, defaultRepeat: 6, maxRepeat: 20, placement: 'inline', source: 'book-steps',
    steps: ['将两根线分别对折后呈十字交叉叠放', 'b挑a，压垂线，穿过左圈', '把两线拉紧', 'b挑垂线', 'a挑b，压垂线，穿过左圈', '将左右两线拉紧', '重复编结，结体自然形成螺旋状'],
  },
  diamond: {
    id: 'diamond', name: 'Diamond knot', zh: '金刚结', blurb: 'Dense, firm and round. The classic red-string bracelet knot.', blurbZh: '厚实、紧密、圆润，红绳手链最经典的结。',
    unit: 2.0, radius: 1.45, defaultRepeat: 3, maxRepeat: 12, placement: 'inline', source: 'stylised',
    steps: ['两线一端烧黏对接', '蓝线绕一个圈', '橘线绕一个圈，从蓝线圈中穿出', '将两个线圈收小', '橘线逆时针绕穿入蓝线圈', '蓝线顺时针绕穿入橘线圈', '重复，编至合适长度'],
  },
  snake: {
    id: 'snake', name: 'Snake knot', zh: '蛇结', blurb: 'Springy chain of interlocking loops, like a snake’s spine.', blurbZh: '两线相互套连，形如蛇体，略有弹性。',
    unit: 1.5, radius: 1.4, defaultRepeat: 5, maxRepeat: 20, placement: 'inline', source: 'stylised',
    steps: ['b线从后往前绕a线，顺时针绕一个圈', 'a线逆时针绕一个圈，从b线圈中穿出', '拉紧a、b两线', '重复步骤1、2'],
  },
  snakeBelly: {
    id: 'snakeBelly', name: 'Snake-belly braid', zh: '蛇腹结', blurb: 'Four-strand round braid, scaled like a snake’s belly.', blurbZh: '四股圆辫，纹理如蛇腹鳞片。',
    unit: 1.2, radius: 1.25, defaultRepeat: 6, maxRepeat: 24, placement: 'inline', source: 'stylised',
    steps: ['准备四根线，上端固定', '左右两线交替向中间挑压', '拉紧后重复'],
  },
  doubleConnection: {
    id: 'doubleConnection', name: 'Double connection', zh: '双联结', blurb: 'Small, tight stopper knot that locks beads in place.', blurbZh: '小巧紧实，不易松散，用来固定珠子。',
    unit: 2.2, radius: 1.45, defaultRepeat: 1, maxRepeat: 3, placement: 'inline', source: 'stylised',
    steps: ['取一根线对折，形成a、b两段', 'a向右压b，再向左挑b绕出右圈', 'a穿过右圈', 'b顺时针绕出左圈，并向下穿出右圈', 'b再穿出左圈', '拉紧a、b即成'],
  },
  button: {
    id: 'button', name: 'Button knot', zh: '纽扣结', blurb: 'Diamond-shaped ball knot; starts and finishes pieces.', blurbZh: '形如钻石的球形结，常用于开头和收尾。',
    unit: 3.6, radius: 2.0, defaultRepeat: 1, maxRepeat: 4, placement: 'inline', source: 'stylised',
    steps: ['线绕过左手食指', '在大拇指上绕一个圈', '取出圈向外翻转，盖在食指线上', 'a线挑、压，从小圈中间的线下方穿过', '收小成立体双钱结（小花篮）', '两线各绕过提手，向下穿过中心', '拉紧并调整结形'],
  },
  doubleCoin: {
    id: 'doubleCoin', name: 'Double coin', zh: '双钱结', blurb: 'Two interlaced “coins” lying flat — a centrepiece symbol of good fortune.', blurbZh: '形似两枚古钱相连，平放作主饰，寓意好事成双。',
    unit: 6.5, radius: 1.0, defaultRepeat: 1, maxRepeat: 3, placement: 'flat', source: 'book-steps',
    steps: ['a压b，逆时针绕出右圈', 'b挑、压，顺时针绕出左圈', '调整好结体'],
  },
  cloverleaf: {
    id: 'cloverleaf', name: 'Cloverleaf', zh: '酢浆草结', blurb: 'Three petal loops around four interlocked rings.', blurbZh: '三个外耳围绕四个相扣的内圈。',
    unit: 5.5, radius: 1.0, defaultRepeat: 1, maxRepeat: 3, placement: 'flat', source: 'stylised',
    steps: ['用a做出内①和内②', '内②进到内①中，形成外①', '用b做出内③，形成外②', 'b穿过内③，形成外③，压a，再穿过外①', 'b从内③中穿出', '拉紧a、b，调整三个外圈'],
  },
  panchang: {
    id: 'panchang', name: 'Pan Chang (2-round)', zh: '二回盘长结', blurb: 'Woven lattice with six ears — the “endless knot”.', blurbZh: '经纬交织，六个耳翼，象征连绵不绝。',
    unit: 9, radius: 1.0, defaultRepeat: 1, maxRepeat: 1, placement: 'flat', source: 'book-steps',
    steps: ['用8根大头针插成方形', '先打一个双联结作为开头', 'a线走四行横线', 'b线挑第一、三行横线，走两条竖线（重复一次）', 'a线一来一回走两行竖线', 'b线挑2压1挑3压1挑1，一来一回走两行横线', '取出结体，拉出六个耳翼，下面打双联结固定'],
  },
  tassel: {
    id: 'tassel', name: 'Tassel', zh: '流苏', blurb: 'Folded silk fringe with a wrapped band. One per spot — duplicate to add more.', blurbZh: '流苏线对折，上端绕线固定；每处一个，可复制添加。',
    unit: 3, radius: 0.5, defaultRepeat: 1, maxRepeat: 1, placement: 'hanging', source: 'book-steps',
    steps: ['准备一束流苏线', '绳线穿过流苏线，细线在中间打结', '提起绳线，让流苏线自然下垂', '另一根线折成一长一短，放在流苏线上端', '用长线在上端绕圈', '缠到适当长度后穿过线圈', '拉紧短线，剪掉多余的线'],
  },
}

/** Knots shown in the tray, in order. */
export const KNOT_ORDER: KnotStyle[] = ['diamond', 'flat', 'flatTwist', 'snake', 'snakeBelly', 'doubleConnection', 'tassel']

export interface EndingDef {
  id: EndingStyle
  name: string
  zh: string
  blurb: string
  blurbZh: string
}

export const ENDINGS: Record<EndingStyle, EndingDef> = {
  slidingKnot: { id: 'slidingKnot', name: 'Sliding knot clasp', zh: '平结活扣', blurb: 'Square-knot sleeve over both ends; the free tails can carry beads.', blurbZh: '平结套住两端，可调松紧；两侧尾线可以加珠子。' },
  buttonLoop: { id: 'buttonLoop', name: 'Button knot & loop', zh: '纽扣结 + 线圈', blurb: 'A ball-shaped button knot hooks through a cord loop.', blurbZh: '球形纽扣结扣进线圈。' },
  sealed: { id: 'sealed', name: 'Sealed joint', zh: '烧黏对接', blurb: 'Ends fused together and hidden under a small double connection knot.', blurbZh: '两端烧黏对接，用小双联结盖住接口。' },
  hangLoop: { id: 'hangLoop', name: 'Hanging loop', zh: '挂绳圈', blurb: 'A loop and double connection knot at the top for hanging.', blurbZh: '顶部线圈和双联结，用于悬挂。' },
}

export interface JewelryTypeDef {
  id: JewelryType
  name: string
  zh: string
  lengthLabel: string
  lengthLabelZh: string
  min: number
  max: number
  step: number
  endings: EndingStyle[]
}

export const JEWELRY_TYPES: Record<JewelryType, JewelryTypeDef> = {
  bracelet: { id: 'bracelet', name: 'Bracelet', zh: '手链', lengthLabel: 'Wrist size', lengthLabelZh: '手围', min: 14, max: 21, step: 0.5, endings: ['slidingKnot', 'buttonLoop'] },
  necklace: { id: 'necklace', name: 'Necklace', zh: '项链', lengthLabel: 'Necklace length', lengthLabelZh: '项链长度', min: 38, max: 48, step: 1, endings: ['slidingKnot', 'buttonLoop'] },
  pendant: { id: 'pendant', name: 'Pendant / charm', zh: '挂饰', lengthLabel: 'Drop length', lengthLabelZh: '挂饰长度', min: 6, max: 13, step: 0.5, endings: ['hangLoop'] },
  ring: { id: 'ring', name: 'Ring', zh: '戒指', lengthLabel: 'Ring size', lengthLabelZh: '戒圈周长', min: 4.6, max: 7, step: 0.1, endings: ['sealed', 'slidingKnot'] },
}

let idCounter = 0
export const newId = (prefix = 'it') => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`

const bead = (seg: SegId, t: number, p: Partial<DesignItem> & { material: BeadMaterialId; shape: BeadShape; color: string; size: number }): DesignItem => ({ id: newId(), kind: 'bead', seg, t, ...p }) as DesignItem
const knot = (seg: SegId, t: number, style: KnotStyle, repeat: number, extra: Partial<DesignItem> = {}): DesignItem =>
  ({ id: newId(), kind: 'knot', seg, t, style, repeat, color: null, material: null, ...extra }) as DesignItem

const goldTailBeads = () => [
  bead('tailL', 0.78, { material: 'gold', shape: 'round', color: '#e4c48e', size: 5 }),
  bead('tailR', 0.78, { material: 'gold', shape: 'round', color: '#e4c48e', size: 5 }),
]

/** A fresh, empty piece of the chosen type. */
export function blankDesign(type: JewelryType): Design {
  switch (type) {
    case 'necklace':
      return { name: '新项链 · New necklace', type, length: 44, cord: { material: 'jadeLine', color: '#3e6b73', diameter: 1.4, strands: 2 }, ending: 'slidingKnot', endingColor: null, tailLength: 4.5, items: goldTailBeads() }
    case 'pendant':
      return { name: '新挂饰 · New pendant', type, length: 9, cord: { material: 'satin', color: '#b4262c', diameter: 2, strands: 2 }, ending: 'hangLoop', endingColor: null, tailLength: 0, items: [] }
    case 'ring':
      return { name: '新戒指 · New ring', type, length: 5.6, cord: { material: 'jadeLine', color: '#b4262c', diameter: 1.0, strands: 2 }, ending: 'sealed', endingColor: null, tailLength: 1.6, items: [] }
    case 'bracelet':
    default:
      return { name: '新手链 · New bracelet', type: 'bracelet', length: 17, cord: { material: 'satin', color: '#b4262c', diameter: 1.8, strands: 2 }, ending: 'slidingKnot', endingColor: null, tailLength: 2.5, items: goldTailBeads() }
  }
}

/** Starter designs. */
export function makePresets(): Design[] {
  // 1. 彩色手链 — teal glass with pink & champagne gold, alternating, symmetric about the front.
  const items1: DesignItem[] = []
  const pattern1 = [
    { material: 'glass', color: '#5fc8bf', shape: 'round', size: 8 },
    { material: 'gold', color: '#e4c48e', shape: 'rondelle', size: 5 },
    { material: 'crystal', color: '#f1c4d3', shape: 'faceted', size: 6 },
    { material: 'gold', color: '#e4c48e', shape: 'rondelle', size: 5 },
  ] as const
  const n1 = 13
  for (let i = 0; i < n1; i++) {
    const p = pattern1[i % pattern1.length]
    items1.push(bead('main', 0.3 + (i / (n1 - 1)) * 0.4, { ...p }))
  }
  items1.push(knot('main', 0.21, 'diamond', 2), knot('main', 0.79, 'diamond', 2))
  items1.push(
    bead('tailL', 0.8, { material: 'crystal', shape: 'faceted', color: '#f1c4d3', size: 5 }),
    bead('tailR', 0.8, { material: 'crystal', shape: 'faceted', color: '#f1c4d3', size: 5 }),
  )

  // 2. 红绳金刚结 — red cord, diamond knots, gold & agate.
  const items2: DesignItem[] = [
    knot('main', 0.2, 'diamond', 4),
    bead('main', 0.32, { shape: 'barrel', material: 'gold', color: '#e4c48e', size: 6 }),
    knot('main', 0.41, 'snake', 4),
    bead('main', 0.5, { shape: 'round', material: 'agate', color: '#b8352e', size: 9 }),
    knot('main', 0.59, 'snake', 4),
    bead('main', 0.68, { shape: 'barrel', material: 'gold', color: '#e4c48e', size: 6 }),
    knot('main', 0.8, 'diamond', 4),
    ...goldTailBeads(),
  ]

  return [
    { name: '彩色手链 · Lagoon', type: 'bracelet', length: 17.5, cord: { material: 'satin', color: '#d98f9f', diameter: 1.6, strands: 2 }, ending: 'slidingKnot', endingColor: null, tailLength: 2.5, items: items1 },
    { name: '红绳金刚结 · Red Thread', type: 'bracelet', length: 17, cord: { material: 'goldFleck', color: '#b4262c', diameter: 2.0, strands: 2 }, ending: 'slidingKnot', endingColor: null, tailLength: 2.5, items: items2 },
  ]
}
