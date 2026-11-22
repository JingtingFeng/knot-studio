import type { BeadMaterialId, BeadShape, CordMaterialId } from './types'

/**
 * Material Library.
 * Every entry is plain data (PBR parameters + UI metadata). The three.js material
 * objects are built from these in `three/materialFactory.ts`, so the same bead
 * geometry can look like glass, pearl or jade purely by swapping the definition.
 */

export interface BeadMaterialDef {
  id: BeadMaterialId
  name: string
  zh: string
  defaultColor: string
  /** MeshPhysicalMaterial parameters (colour is applied separately). */
  pbr: {
    roughness: number
    metalness?: number
    transmission?: number
    thickness?: number
    ior?: number
    clearcoat?: number
    clearcoatRoughness?: number
    sheen?: number
    sheenRoughness?: number
    sheenColor?: string
    iridescence?: number
    iridescenceIOR?: number
    dispersion?: number
    specularIntensity?: number
    envMapIntensity?: number
    /** Tints light travelling through the bead (for translucent stones). */
    attenuationDistance?: number
  }
  /** Optional procedural surface detail. */
  texture?: 'speckle' | 'woodgrain' | 'marble' | 'cloud'
  /** Faceted materials are rendered flat-shaded. */
  flat?: boolean
  /** UI swatch rendering hint. */
  swatch: 'glass' | 'matte' | 'pearl' | 'metal' | 'stone' | 'gloss'
  /** Shapes this material comes in. Omitted = any shape. */
  shapes?: BeadShape[]
  defaultShape: BeadShape
}

export const BEAD_MATERIALS: Record<BeadMaterialId, BeadMaterialDef> = {
  glass: {
    defaultShape: 'round',
    id: 'glass', name: 'Clear glass', zh: '透明琉璃', defaultColor: '#5fc8bf', swatch: 'glass',
    pbr: { roughness: 0.04, transmission: 1, thickness: 0.55, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.2, attenuationDistance: 1.8 },
  },
  frosted: {
    defaultShape: 'round',
    id: 'frosted', name: 'Frosted glass', zh: '磨砂琉璃', defaultColor: '#9fd6cf', swatch: 'glass',
    pbr: { roughness: 0.42, transmission: 1, thickness: 0.6, ior: 1.5, envMapIntensity: 0.9, attenuationDistance: 1.1 },
  },
  crystal: {
    defaultShape: 'faceted', shapes: ['faceted'],
    id: 'crystal', name: 'Cut crystal', zh: '切面水晶', defaultColor: '#f3d9e6', swatch: 'glass', flat: true,
    pbr: { roughness: 0.0, transmission: 1, thickness: 0.5, ior: 2.0, dispersion: 4, iridescence: 0.35, iridescenceIOR: 1.6, specularIntensity: 1, envMapIntensity: 1.6, attenuationDistance: 1.6 },
  },
  pearl: {
    defaultShape: 'round', shapes: ['round'],
    id: 'pearl', name: 'Pearl', zh: '珍珠', defaultColor: '#f6eee3', swatch: 'pearl',
    pbr: { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 1, sheenRoughness: 0.35, sheenColor: '#ffd9e4', iridescence: 0.55, iridescenceIOR: 1.35, envMapIntensity: 1.1 },
  },
  jade: {
    defaultShape: 'round',
    id: 'jade', name: 'Jade', zh: '玉石', defaultColor: '#7fb98a', swatch: 'stone', texture: 'cloud',
    pbr: { roughness: 0.2, transmission: 0.55, thickness: 0.9, ior: 1.62, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 1, attenuationDistance: 0.35 },
  },
  ceramic: {
    defaultShape: 'round',
    id: 'ceramic', name: 'Glazed ceramic', zh: '陶瓷', defaultColor: '#3f6fb3', swatch: 'gloss', texture: 'speckle',
    pbr: { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1 },
  },
  agate: {
    defaultShape: 'round',
    id: 'agate', name: 'Red agate', zh: '玛瑙', defaultColor: '#b8352e', swatch: 'stone', texture: 'marble',
    pbr: { roughness: 0.12, transmission: 0.35, thickness: 0.8, ior: 1.54, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1, attenuationDistance: 0.25 },
  },
  gold: {
    defaultShape: 'rondelle',
    id: 'gold', name: 'Champagne gold', zh: '香槟金', defaultColor: '#e4c48e', swatch: 'metal',
    // Softer, rougher than real polished gold → cosy, not "jewellery advert".
    pbr: { roughness: 0.3, metalness: 1, envMapIntensity: 0.9 },
  },
  silver: {
    defaultShape: 'heishi',
    id: 'silver', name: 'Brushed silver', zh: '银', defaultColor: '#d9d6d0', swatch: 'metal',
    pbr: { roughness: 0.34, metalness: 1, envMapIntensity: 0.85 },
  },
  wood: {
    defaultShape: 'barrel',
    id: 'wood', name: 'Sandalwood', zh: '檀木', defaultColor: '#9a6a45', swatch: 'matte', texture: 'woodgrain',
    pbr: { roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6, sheenColor: '#f1cda3', envMapIntensity: 0.6 },
  },
}

export interface CordMaterialDef {
  id: CordMaterialId
  name: string
  zh: string
  note: string
  noteZh: string
  /** Surface pattern used for the bump map. */
  weave: 'braid' | 'twist' | 'fineTwist' | 'smooth' | 'fuzzy'
  /** Pattern repeats per cm of cord. */
  density: number
  bump: number
  roughness: number
  metalness: number
  sheen: number
  anisotropy: number
  /** Flecks of metallic thread woven in. */
  goldFleck?: boolean
  defaultColor: string
}

export const CORD_MATERIALS: Record<CordMaterialId, CordMaterialDef> = {
  satin: {
    id: 'satin', name: 'Chinese knot cord', zh: '中国结线 (5号/72号)', note: 'Braided satin rattail. Soft sheen, holds knot shape.', noteZh: '编织缎面线，柔和光泽，结形挺括。',
    weave: 'braid', density: 7, bump: 0.6, roughness: 0.42, metalness: 0, sheen: 0.9, anisotropy: 0.55, defaultColor: '#b4262c',
  },
  jadeLine: {
    id: 'jadeLine', name: 'Jade thread', zh: '玉线 (A/B/C)', note: 'Fine twisted nylon. Crisp, slightly glossy.', noteZh: '细捻尼龙线，挺括，略有光泽。',
    weave: 'fineTwist', density: 11, bump: 0.45, roughness: 0.36, metalness: 0, sheen: 0.6, anisotropy: 0.4, defaultColor: '#c23a3a',
  },
  waxed: {
    id: 'waxed', name: 'Waxed cord', zh: '蜡线', note: 'Coated polyester. Smooth with a waxy highlight.', noteZh: '涂蜡涤纶线，顺滑，带蜡质高光。',
    weave: 'twist', density: 5, bump: 0.25, roughness: 0.3, metalness: 0, sheen: 0.2, anisotropy: 0.2, defaultColor: '#6b4a32',
  },
  cotton: {
    id: 'cotton', name: 'Cotton cord', zh: '棉线', note: 'Matte, soft, a little fuzzy.', noteZh: '哑光柔软，微有绒感。',
    weave: 'fuzzy', density: 4, bump: 0.7, roughness: 0.92, metalness: 0, sheen: 1, anisotropy: 0, defaultColor: '#efe6d6',
  },
  goldThread: {
    id: 'goldThread', name: 'Gold thread', zh: '金线', note: 'Metallic wrapped thread for accents.', noteZh: '金属包芯线，用于点缀。',
    weave: 'twist', density: 9, bump: 0.5, roughness: 0.34, metalness: 0.85, sheen: 0, anisotropy: 0.6, defaultColor: '#d8b46e',
  },
  goldFleck: {
    id: 'goldFleck', name: 'Gold-fleck cord', zh: '加金线', note: 'Knot cord with a gold filament braided in.', noteZh: '中国结线中编入一缕金线。',
    weave: 'braid', density: 7, bump: 0.55, roughness: 0.4, metalness: 0, sheen: 0.8, anisotropy: 0.5, goldFleck: true, defaultColor: '#a8212b',
  },
}

/** Traditional Chinese colour names, tuned to read well under warm light. */
export const CORD_PALETTE: { name: string; hex: string }[] = [
  { name: '中国红 China red', hex: '#b4262c' },
  { name: '胭脂 Rouge', hex: '#c8505f' },
  { name: '藕荷 Lotus root', hex: '#d7a7b4' },
  { name: '杏黄 Apricot', hex: '#e2a64b' },
  { name: '香槟 Champagne', hex: '#e3cc9f' },
  { name: '月白 Moon white', hex: '#eef0ea' },
  { name: '竹青 Bamboo', hex: '#6f9a72' },
  { name: '黛青 Ink teal', hex: '#3e6b73' },
  { name: '靛蓝 Indigo', hex: '#33467a' },
  { name: '檀褐 Sandal', hex: '#6b4a32' },
  { name: '墨 Ink', hex: '#2c2a2b' },
]

export const BEAD_PALETTE: string[] = [
  '#5fc8bf', '#8fd3e8', '#3f6fb3', '#a7c7a0', '#7fb98a', '#f3d9e6', '#e89aac', '#c8505f',
  '#b8352e', '#e2a64b', '#e4c48e', '#f6eee3', '#d9d6d0', '#9a6a45', '#6c5a8a', '#2c2a2b',
]
