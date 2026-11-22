import { useState } from 'react'
import { BEAD_PRESETS, ENDINGS, JEWELRY_TYPES, KNOT_ORDER, KNOT_STYLES, type BeadPreset } from '../data/catalog'
import { CORD_MATERIALS, CORD_PALETTE } from '../data/materials'
import type { SegId } from '../data/types'
import { pickPalette, useT } from '../i18n'
import { useStudio, type NewItemSpec } from '../state/store'
import { BeadThumb, CordSwatch, KnotThumb } from './Swatch'

export const DRAG_MIME = 'application/x-knot-item'

function dragProps(spec: NewItemSpec) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(spec))
      e.dataTransfer.effectAllowed = 'copy'
    },
  }
}

const specOf = (p: BeadPreset): NewItemSpec => ({ kind: 'bead', shape: p.shape, material: p.material, color: p.color, size: p.size })

type Tab = 'beads' | 'knots' | 'cord' | 'ending'

function BeadsTab() {
  const add = useStudio((s) => s.addItem)
  const { t, n } = useT()
  return (
    <>
      <div className="section-title">{t('beadTray')}</div>
      <p className="hint">{t('beadHint')}</p>
      <div className="mat-grid" style={{ marginTop: 0 }}>
        {BEAD_PRESETS.map((p) => (
          <button key={p.id} className="card" onClick={() => add(specOf(p))} {...dragProps(specOf(p))}>
            <BeadThumb mat={p.material} shape={p.shape} color={p.color} />
            <div>
              <div className="t">{n(p)}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function KnotsTab() {
  const add = useStudio((s) => s.addItem)
  const { t, n, lang } = useT()
  return (
    <>
      <div className="section-title">{t('knotLib')}</div>
      <p className="hint">{t('knotHint')}</p>
      <div className="knot-list">
        {KNOT_ORDER.map((id) => {
          const k = KNOT_STYLES[id]
          const spec: NewItemSpec = { kind: 'knot', style: id }
          return (
            <button key={id} className="card" onClick={() => add(spec)} {...dragProps(spec)}>
              <div className="icon"><KnotThumb style={id} /></div>
              <div>
                <div className="t">{n(k)}</div>
                <div className="blurb">{lang === 'zh' ? k.blurbZh : k.blurb}</div>
              </div>
              <div className="plus">+</div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function CordTab() {
  const cord = useStudio((s) => s.design.cord)
  const type = useStudio((s) => s.design.type)
  const length = useStudio((s) => s.design.length)
  const setCord = useStudio((s) => s.setCord)
  const setLength = useStudio((s) => s.setLength)
  const tdef = JEWELRY_TYPES[type]
  const { t, lang } = useT()
  return (
    <>
      <div className="section-title">{t('thread')}</div>
      <div className="knot-list" style={{ marginBottom: 16 }}>
        {Object.values(CORD_MATERIALS).map((m) => (
          <button key={m.id} className="card" style={{ cursor: 'pointer', boxShadow: cord.material === m.id ? '0 0 0 2px #3b2f26' : undefined }} onClick={() => setCord({ material: m.id })}>
            <CordSwatch color={m.id === 'goldThread' ? m.defaultColor : cord.color} />
            <div>
              <div className="t">{lang === 'zh' ? m.zh : m.name}</div>
              <div className="blurb">{lang === 'zh' ? m.noteZh : m.note}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="section-title">{t('colour')}</div>
      <div className="palette">
        {CORD_PALETTE.map((c) => (
          <button key={c.hex} title={pickPalette(c.name, lang)} className={cord.color === c.hex ? 'on' : ''} style={{ background: c.hex }} onClick={() => setCord({ color: c.hex })} />
        ))}
        <input type="color" value={cord.color} onChange={(e) => setCord({ color: e.target.value })} title={t('customColour')} />
      </div>
      <div className="field">
        <label>{t('thickness')} <span>{cord.diameter.toFixed(1)} mm</span></label>
        <input type="range" min={0.8} max={3} step={0.1} value={cord.diameter} onChange={(e) => setCord({ diameter: +e.target.value })} />
      </div>
      <div className="field">
        <label>{t('strands')}</label>
        <div className="chips">
          {[1, 2].map((n) => (
            <button key={n} className={'chip' + (cord.strands === n ? ' on' : '')} onClick={() => setCord({ strands: n as 1 | 2 })}>
              {n === 1 ? t('single') : t('double')}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>{lang === 'zh' ? tdef.lengthLabelZh : tdef.lengthLabel} <span>{length.toFixed(1)} cm</span></label>
        <input type="range" min={tdef.min} max={tdef.max} step={tdef.step} value={length} onChange={(e) => setLength(+e.target.value)} />
      </div>
    </>
  )
}

function TailBeads() {
  const { t: tr } = useT()
  const items = useStudio((s) => s.design.items)
  const add = useStudio((s) => s.addItem)
  const remove = useStudio((s) => s.removeItem)
  const count = (seg: SegId) => items.filter((i) => i.seg === seg).length
  const addTo = (seg: SegId) => {
    const existing = items.filter((i) => i.seg === seg)
    const last = existing[existing.length - 1]
    const spec: NewItemSpec = last && last.kind === 'bead'
      ? { kind: 'bead', shape: last.shape, material: last.material, color: last.color, size: last.size }
      : { kind: 'bead', shape: 'round', material: 'gold', color: '#e4c48e', size: 5 }
    // new beads stack toward the tip
    const t = existing.length ? Math.max(0.15, Math.min(...existing.map((i) => i.t)) - 0.18) : 0.8
    add(spec, { seg, t })
  }
  const removeFrom = (seg: SegId) => {
    const existing = items.filter((i) => i.seg === seg).sort((a, b) => a.t - b.t)
    if (existing.length) remove(existing[0].id)
  }
  const Row = ({ seg, label }: { seg: SegId; label: string }) => (
    <div className="tail-row">
      <span>{label}</span>
      <div className="stepper">
        <button onClick={() => removeFrom(seg)} aria-label={`− ${label}`}>−</button>
        <b>{count(seg)}</b>
        <button onClick={() => addTo(seg)} aria-label={`+ ${label}`}>+</button>
      </div>
    </div>
  )
  return (
    <>
      <div className="section-title" style={{ marginTop: 6 }}>{tr('tailBeads')}</div>
      <p className="hint">{tr('tailHint')}</p>
      <Row seg="tailL" label={tr('leftTail')} />
      <Row seg="tailR" label={tr('rightTail')} />
      <button className="btn" style={{ width: '100%', marginTop: 4 }} onClick={() => { addTo('tailL'); addTo('tailR') }}>{tr('addPair')}</button>
    </>
  )
}

function EndingTab() {
  const ending = useStudio((s) => s.design.ending)
  const type = useStudio((s) => s.design.type)
  const tailLength = useStudio((s) => s.design.tailLength)
  const setEnding = useStudio((s) => s.setEnding)
  const setTailLength = useStudio((s) => s.setTailLength)
  const { t, lang } = useT()
  return (
    <>
      <div className="section-title">{t('finish')}</div>
      <div className="ending-list">
        {JEWELRY_TYPES[type].endings.map((id) => {
          const e = ENDINGS[id]
          return (
            <button key={id} className={'card' + (ending === id ? ' on' : '')} onClick={() => setEnding(id)}>
              <div className="icon" style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--paper-2)', display: 'grid', placeItems: 'center', flex: 'none', overflow: 'hidden' }}>
                <KnotThumb style={id === 'buttonLoop' ? 'button' : id === 'slidingKnot' ? 'flat' : 'doubleConnection'} size={46} />
              </div>
              <div>
                <div className="t">{lang === 'zh' ? e.zh : e.name}</div>
                <div className="blurb" style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3 }}>{lang === 'zh' ? e.blurbZh : e.blurb}</div>
              </div>
            </button>
          )
        })}
      </div>
      {ending === 'slidingKnot' && (
        <>
          <div className="field">
            <label>{t('tailLength')} <span>{tailLength.toFixed(1)} cm</span></label>
            <input type="range" min={1.5} max={8} step={0.5} value={tailLength} onChange={(e) => setTailLength(+e.target.value)} />
          </div>
          <TailBeads />
        </>
      )}
      <p className="hint" style={{ marginTop: 14 }}>{t('tasselMoved')}</p>
    </>
  )
}

export function Library({ hidden }: { hidden: boolean }) {
  const [tab, setTab] = useState<Tab>('beads')
  const { lang } = useT()
  const tabs: { id: Tab; zh: string; en: string }[] = [
    { id: 'beads', zh: '珠子', en: 'Beads' },
    { id: 'knots', zh: '绳结', en: 'Knots' },
    { id: 'cord', zh: '绳线', en: 'Cord' },
    { id: 'ending', zh: '收尾', en: 'Finish' },
  ]
  return (
    <aside className={'panel left library enter-left' + (hidden ? ' hidden' : '')}>
      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className={lang === 'zh' ? 'zh' : 'lbl'}>{lang === 'zh' ? t.zh : t.en}</span>
          </button>
        ))}
      </nav>
      <div className="tab-body">
        {tab === 'beads' && <BeadsTab />}
        {tab === 'knots' && <KnotsTab />}
        {tab === 'cord' && <CordTab />}
        {tab === 'ending' && <EndingTab />}
      </div>
    </aside>
  )
}
