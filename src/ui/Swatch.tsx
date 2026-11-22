import type { CSSProperties } from 'react'
import * as THREE from 'three'
import { BEAD_MATERIALS } from '../data/materials'
import type { BeadMaterialId, BeadShape, CordMaterialId, KnotStyle } from '../data/types'
import { beadThumb, knotThumb, useThumb } from './thumbs'

const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString()
const tint = (hex: string, k: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString()

/** CSS "mini render" of a bead material, so the library reads at a glance. */
export function beadSwatchStyle(mat: BeadMaterialId, color: string): CSSProperties {
  const kind = BEAD_MATERIALS[mat].swatch
  switch (kind) {
    case 'glass':
      return {
        background: `radial-gradient(circle at 32% 28%, #fff 0 7%, ${tint(color, 0.55)}cc 14%, ${color}aa 48%, ${shade(color, 0.55)}dd 92%),
                     radial-gradient(circle at 68% 76%, ${tint(color, 0.7)} 0 10%, transparent 30%)`,
        boxShadow: `inset 0 0 0 1px ${tint(color, 0.6)}, 0 4px 8px -4px rgba(60,30,10,.4)`,
      }
    case 'pearl':
      return { background: `radial-gradient(circle at 34% 30%, #fff 0 10%, ${color} 38%, #ecd9d4 70%, ${shade(color, 0.78)} 100%)` }
    case 'metal':
      return { background: `radial-gradient(circle at 34% 28%, #fffaf0 0 9%, ${tint(color, 0.3)} 22%, ${color} 46%, ${shade(color, 0.5)} 78%, ${tint(color, 0.2)} 100%)` }
    case 'stone':
      return { background: `radial-gradient(circle at 35% 30%, ${tint(color, 0.7)} 0 8%, ${tint(color, 0.15)} 24%, ${color} 55%, ${shade(color, 0.6)} 100%)` }
    case 'gloss':
      return { background: `radial-gradient(circle at 33% 28%, #fff 0 7%, ${tint(color, 0.25)} 16%, ${color} 50%, ${shade(color, 0.6)} 100%)` }
    case 'matte':
    default:
      return { background: `radial-gradient(circle at 38% 32%, ${tint(color, 0.3)} 0%, ${color} 50%, ${shade(color, 0.62)} 100%)` }
  }
}

export function BeadSwatch({ mat, color, small }: { mat: BeadMaterialId; color: string; small?: boolean }) {
  return <div className={'sw' + (small ? ' small' : '')} style={beadSwatchStyle(mat, color)} />
}

export function CordSwatch({ color }: { color: string }) {
  return (
    <div
      className="sw small"
      style={{
        background: `repeating-linear-gradient(55deg, ${tint(color, 0.18)} 0 3px, ${color} 3px 6px, ${shade(color, 0.75)} 6px 8px)`,
        borderRadius: 8,
      }}
    />
  )
}

/** Tiny line icons for bead silhouettes. */
export function ShapeIcon({ shape }: { shape: BeadShape }) {
  const c = '#5b4a3c'
  const common = { fill: '#efe3d1', stroke: c, strokeWidth: 1.4 }
  return (
    <svg width="26" height="26" viewBox="0 0 26 26">
      <line x1="1" y1="13" x2="25" y2="13" stroke="#b4262c" strokeWidth="1.6" strokeLinecap="round" />
      {shape === 'round' && <circle cx="13" cy="13" r="7.5" {...common} />}
      {shape === 'faceted' && <polygon points="13,5 19.5,8.5 20.5,13 19.5,17.5 13,21 6.5,17.5 5.5,13 6.5,8.5" {...common} />}
      {shape === 'rondelle' && <ellipse cx="13" cy="13" rx="4.6" ry="7.5" {...common} />}
      {shape === 'cube' && <rect x="6.5" y="6.5" width="13" height="13" rx="2.5" {...common} />}
      {shape === 'barrel' && <path d="M5 8 Q13 4 21 8 L21 18 Q13 22 5 18 Z" {...common} />}
      {shape === 'heishi' && <rect x="11" y="5.5" width="4" height="15" rx="1.5" {...common} />}
    </svg>
  )
}

/** Diagrammatic knot icons (cord in China red). */
export function KnotIcon({ style }: { style: KnotStyle }) {
  const s = { fill: 'none', stroke: '#b4262c', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const s2 = { ...s, stroke: '#d8726f' }
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {style === 'diamond' && (
        <g>
          <line x1="2" y1="20" x2="38" y2="20" {...s2} />
          {[11, 20, 29].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="20" rx="4.6" ry="7" {...s} />
              <path d={`M${x - 4} 15 Q${x} 20 ${x + 4} 25`} {...s2} />
            </g>
          ))}
        </g>
      )}
      {style === 'flat' && (
        <g>
          <line x1="20" y1="2" x2="20" y2="38" {...s2} />
          {[8, 15, 22, 29].map((y, i) => (
            <path key={y} d={i % 2 ? `M9 ${y} Q20 ${y - 4} 31 ${y} Q33 ${y + 3} 30 ${y + 4}` : `M31 ${y} Q20 ${y - 4} 9 ${y} Q7 ${y + 3} 10 ${y + 4}`} {...s} />
          ))}
        </g>
      )}
      {style === 'flatTwist' && (
        <g>
          <line x1="20" y1="2" x2="20" y2="38" {...s2} />
          {[7, 13, 19, 25, 31].map((y, i) => (
            <path key={y} d={`M${11 + i} ${y} Q20 ${y - 3} ${29 - i * 0.5} ${y + 3}`} {...s} />
          ))}
        </g>
      )}
      {style === 'snake' && (
        <g>
          {[8, 15, 22, 29].map((y) => (
            <path key={y} d={`M12 ${y + 5} Q20 ${y - 3} 28 ${y + 5}`} {...s} />
          ))}
          <line x1="20" y1="2" x2="20" y2="8" {...s} />
          <line x1="20" y1="34" x2="20" y2="38" {...s} />
        </g>
      )}
      {style === 'snakeBelly' && (
        <g>
          {[7, 13, 19, 25, 31].map((y, i) => (
            <path key={y} d={i % 2 ? `M13 ${y} L20 ${y + 4} L27 ${y}` : `M13 ${y + 4} L20 ${y} L27 ${y + 4}`} {...s} />
          ))}
        </g>
      )}
      {style === 'doubleConnection' && (
        <g>
          <line x1="2" y1="20" x2="38" y2="20" {...s2} />
          <circle cx="20" cy="20" r="7" {...s} />
          <path d="M14 16 Q20 26 26 16 M14 24 Q20 14 26 24" {...s2} />
        </g>
      )}
    </svg>
  )
}

/** 3D-rendered bead thumbnail (falls back to the CSS swatch while rendering). */
export function BeadThumb({ mat, shape, color, size = 48 }: { mat: BeadMaterialId; shape: BeadShape; color: string; size?: number }) {
  const url = useThumb(() => beadThumb(mat, shape, color), [mat, shape, color])
  if (!url) return <div className="sw" style={{ ...beadSwatchStyle(mat, color), width: size * 0.8, height: size * 0.8, margin: size * 0.1 }} />
  return <img className="thumb" src={url} width={size} height={size} alt="" draggable={false} />
}

export function KnotThumb({ style, color, material, size = 46 }: { style: KnotStyle; color?: string; material?: CordMaterialId; size?: number }) {
  const url = useThumb(() => knotThumb(style, color, material), [style, color, material])
  if (!url) return <KnotIcon style={style} />
  return <img className="thumb" src={url} width={size} height={size} alt="" draggable={false} />
}
