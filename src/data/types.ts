// Design data: a pure, serialisable description of a piece of jewellery.
// Nothing in here knows about three.js — geometry is derived from it at render time.

export type JewelryType = 'bracelet' | 'necklace' | 'pendant' | 'ring'

/** Cord segments an item can sit on. Tails only exist with a sliding-knot clasp. */
export type SegId = 'main' | 'tailL' | 'tailR'

export type BeadShape = 'round' | 'faceted' | 'rondelle' | 'cube' | 'barrel' | 'heishi'

export type BeadMaterialId =
  | 'glass'
  | 'frosted'
  | 'crystal'
  | 'pearl'
  | 'jade'
  | 'ceramic'
  | 'agate'
  | 'gold'
  | 'silver'
  | 'wood'

export type CordMaterialId = 'satin' | 'jadeLine' | 'waxed' | 'cotton' | 'goldThread' | 'goldFleck'

export type KnotStyle =
  | 'diamond'
  | 'flat'
  | 'flatTwist'
  | 'snake'
  | 'snakeBelly'
  | 'doubleConnection'
  | 'button'
  | 'doubleCoin'
  | 'cloverleaf'
  | 'panchang'
  | 'tassel'

/**
 * slidingKnot — square-knot sleeve, two free tails (bracelet / necklace / ring)
 * buttonLoop  — 纽扣结 + loop (bracelet / necklace)
 * sealed      — ends fused and hidden under a small 双联结 (ring)
 * hangLoop    — hanging loop at the top of a pendant (挂饰)
 */
export type EndingStyle = 'slidingKnot' | 'buttonLoop' | 'sealed' | 'hangLoop'

export type ViewMode = 'intro' | 'workshop' | 'inspect' | 'showcase'

interface ItemBase {
  id: string
  /** Which cord segment the item is threaded on. */
  seg: SegId
  /** Position along that segment, 0..1. For closed loops 0 = the clasp. */
  t: number
}

export interface BeadItem extends ItemBase {
  kind: 'bead'
  shape: BeadShape
  material: BeadMaterialId
  color: string
  /** Diameter in millimetres. */
  size: number
}

export interface KnotItem extends ItemBase {
  kind: 'knot'
  style: KnotStyle
  /** How many knot units are tied in a row (always 1 for tassels). */
  repeat: number
  /** null → follow the main cord colour. */
  color: string | null
  /** null → follow the main cord material. */
  material: CordMaterialId | null
  /** Tassel only: fringe length in cm. */
  length?: number
  /** Tassel only: colour of the wrapped band (绕线). */
  accent?: string
}

export type DesignItem = BeadItem | KnotItem

export interface CordSpec {
  material: CordMaterialId
  color: string
  /** Diameter in millimetres (0.8 – 3.0). */
  diameter: number
  strands: 1 | 2
}

export interface Design {
  name: string
  type: JewelryType
  /** Wearable length in cm: wrist (bracelet), chain length (necklace), ring size (ring), drop (pendant). */
  length: number
  cord: CordSpec
  ending: EndingStyle
  endingColor: string | null
  /** Length of each free tail for the sliding knot, cm. */
  tailLength: number
  items: DesignItem[]
}
