import { BEAD_SHAPES, JEWELRY_TYPES, KNOT_ORDER, KNOT_STYLES } from '../data/catalog'
import { BEAD_MATERIALS, BEAD_PALETTE, CORD_MATERIALS, CORD_PALETTE } from '../data/materials'
import type { BeadItem, BeadMaterialId, BeadShape, CordMaterialId, KnotItem } from '../data/types'
import { pickName, pickPalette, useT } from '../i18n'
import { computeLayout } from '../lib/layout'
import { useStudio } from '../state/store'
import { BeadThumb, CordSwatch, KnotThumb } from './Swatch'

/** Short cord-material label: "中国结线 (5号/72号)" → "中国结线". */
const shortZh = (s: string) => s.split(' ')[0]

function BeadInspector({ item }: { item: BeadItem }) {
  const { t, n } = useT()
  const update = useStudio((s) => s.updateItem)
  const commit = useStudio((s) => s.commitLayout)
  const allowed = BEAD_MATERIALS[item.material].shapes
  return (
    <>
      <div className="section-title">{t('material')}</div>
      <div className="chips">
        {(Object.keys(BEAD_MATERIALS) as BeadMaterialId[]).map((id) => (
          <button key={id} className={'chip' + (item.material === id ? ' on' : '')} onClick={() => { update(item.id, { material: id }); commit() }}>
            {n(BEAD_MATERIALS[id])}
          </button>
        ))}
      </div>
      <div className="section-title">{t('colour')}</div>
      <div className="palette">
        {BEAD_PALETTE.map((c) => (
          <button key={c} className={item.color === c ? 'on' : ''} style={{ background: c }} onClick={() => update(item.id, { color: c })} />
        ))}
      </div>
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -4 }}>
        <input type="color" value={item.color} onChange={(e) => update(item.id, { color: e.target.value })} />
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('customColour')}</span>
      </div>
      <div className="section-title">{t('shape')}{allowed && <em>{t('shapeLocked')}</em>}</div>
      <div className="chips">
        {(Object.keys(BEAD_SHAPES) as BeadShape[]).map((id) => {
          const ok = !allowed || allowed.includes(id)
          return (
            <button key={id} disabled={!ok} className={'chip' + (item.shape === id ? ' on' : '') + (ok ? '' : ' off')} onClick={() => { update(item.id, { shape: id }); commit() }}>
              {n(BEAD_SHAPES[id])}
            </button>
          )
        })}
      </div>
      <div className="field">
        <label>{t('size')} <span>{item.size.toFixed(1)} mm</span></label>
        <input type="range" min={3} max={14} step={0.5} value={item.size} onChange={(e) => update(item.id, { size: +e.target.value })} onPointerUp={commit} />
      </div>
    </>
  )
}

function KnotInspector({ item }: { item: KnotItem }) {
  const { t, n, lang } = useT()
  const update = useStudio((s) => s.updateItem)
  const commit = useStudio((s) => s.commitLayout)
  const def = KNOT_STYLES[item.style]
  const isTassel = item.style === 'tassel'
  return (
    <>
      <div className="section-title">{t('knotStyle')}</div>
      <div className="chips">
        {KNOT_ORDER.map((id) => (
          <button key={id} className={'chip' + (item.style === id ? ' on' : '')} onClick={() => {
            update(item.id, { style: id, repeat: Math.min(item.repeat, KNOT_STYLES[id].maxRepeat), ...(id === 'tassel' && item.length == null ? { length: 4, accent: '#d8b46e' } : {}) })
            commit()
          }}>
            {n(KNOT_STYLES[id])}
          </button>
        ))}
      </div>
      {def.maxRepeat > 1 && (
        <div className="field">
          <label>{t('repeat')} <span>{t('maxN')} {def.maxRepeat}</span></label>
          <div className="stepper">
            <button onClick={() => { update(item.id, { repeat: Math.max(1, item.repeat - 1) }); commit() }}>−</button>
            <b>{item.repeat}</b>
            <button onClick={() => { update(item.id, { repeat: Math.min(def.maxRepeat, item.repeat + 1) }); commit() }}>+</button>
          </div>
        </div>
      )}
      {isTassel && (
        <>
          <div className="field">
            <label>{t('fringe')} <span>{(item.length ?? 4).toFixed(1)} cm</span></label>
            <input type="range" min={1.5} max={8} step={0.25} value={item.length ?? 4} onChange={(e) => update(item.id, { length: +e.target.value })} />
          </div>
          <p className="hint">{t('tasselOne')}</p>
          <div className="section-title">{t('band')}</div>
          <div className="palette">
            {['#d8b46e', '#d9d6d0', ...CORD_PALETTE.map((c) => c.hex).slice(0, 6)].map((c) => (
              <button key={c} className={item.accent === c ? 'on' : ''} style={{ background: c }} onClick={() => update(item.id, { accent: c })} />
            ))}
          </div>
        </>
      )}
      <div className="section-title">{isTassel ? t('silk') : t('colour')}</div>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button className={'chip' + (item.color == null ? ' on' : '')} onClick={() => update(item.id, { color: null })}>{t('matchCord')}</button>
      </div>
      <div className="palette">
        {CORD_PALETTE.map((c) => (
          <button key={c.hex} title={pickPalette(c.name, lang)} className={item.color === c.hex ? 'on' : ''} style={{ background: c.hex }} onClick={() => update(item.id, { color: c.hex })} />
        ))}
      </div>
      {!isTassel && (
        <>
          <div className="section-title">{t('thread')}</div>
          <div className="chips">
            <button className={'chip' + (item.material == null ? ' on' : '')} onClick={() => update(item.id, { material: null })}>{t('matchCord')}</button>
            {(Object.keys(CORD_MATERIALS) as CordMaterialId[]).map((id) => (
              <button key={id} className={'chip' + (item.material === id ? ' on' : '')} onClick={() => update(item.id, { material: id })}>
                {lang === 'zh' ? shortZh(CORD_MATERIALS[id].zh) : CORD_MATERIALS[id].name}
              </button>
            ))}
          </div>
        </>
      )}
      {lang === 'zh' ? (
        <details className="steps">
          <summary>{t('steps')} · {def.source === 'book-steps' ? t('stepsBook') : t('stepsStyl')}</summary>
          <ol>{def.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </details>
      ) : null}
    </>
  )
}

function Summary() {
  const { t, n, lang } = useT()
  const design = useStudio((s) => s.design)
  const lay = computeLayout(design)
  const beads = design.items.filter((i): i is BeadItem => i.kind === 'bead')
  const knots = design.items.filter((i): i is KnotItem => i.kind === 'knot')
  const tally = new Map<string, { item: BeadItem; n: number }>()
  for (const b of beads) {
    const k = `${b.material}|${b.color}|${b.shape}|${b.size}`
    const e = tally.get(k)
    if (e) e.n++
    else tally.set(k, { item: b, n: 1 })
  }
  // cord estimate: paths × strands + knot take-up (≈6× the knot length) + working slack
  const pathLen = lay.segs.reduce((a, s) => a + s.path.L, 0)
  const knotTake = knots.filter((k) => k.style !== 'tassel').reduce((acc, k) => acc + KNOT_STYLES[k.style].unit * k.repeat * (design.cord.diameter / 10) * 6, 0)
  const cordCm = Math.round(pathLen * design.cord.strands * 1.1 + knotTake + 20)
  const tdef = JEWELRY_TYPES[design.type]
  const cm = CORD_MATERIALS[design.cord.material]
  return (
    <div className="summary">
      <div className="stat"><span>{t('type')}</span><b>{lang === 'zh' ? tdef.zh : tdef.name}</b></div>
      <div className="stat"><span>{lang === 'zh' ? tdef.lengthLabelZh : tdef.lengthLabel}</span><b>{design.length.toFixed(1)} cm</b></div>
      <div className="stat"><span>{t('mainCord')}</span><b>{lang === 'zh' ? shortZh(cm.zh) : cm.name} · {design.cord.diameter.toFixed(1)} mm</b></div>
      <div className="stat"><span>{t('cordCut')}</span><b>≈ {cordCm} cm</b></div>
      <div className="stat"><span>{t('knots')}</span><b>{knots.length}</b></div>
      <div className="section-title" style={{ marginTop: 14 }}>{t('beadList')}</div>
      <div className="tally">
        {[...tally.values()].map(({ item, n: count }) => (
          <div key={item.id}>
            <BeadThumb mat={item.material} shape={item.shape} color={item.color} size={28} />
            <span>{BEAD_MATERIALS[item.material].shapes ? n(BEAD_MATERIALS[item.material]) : lang === 'zh' ? `${BEAD_MATERIALS[item.material].zh}${BEAD_SHAPES[item.shape].zh}` : `${BEAD_MATERIALS[item.material].name}, ${BEAD_SHAPES[item.shape].name.toLowerCase()}`} · {item.size}mm</span>
            <b>× {count}</b>
          </div>
        ))}
        {tally.size === 0 && <div style={{ color: 'var(--ink-soft)' }}>{t('noBeads')}</div>}
      </div>
    </div>
  )
}

export function Inspector({ hidden }: { hidden: boolean }) {
  const { t, n, lang } = useT()
  const selected = useStudio((s) => s.design.items.find((i) => i.id === s.selectedId) ?? null)
  const cord = useStudio((s) => s.design.cord)
  const name = useStudio((s) => s.design.name)
  const select = useStudio((s) => s.select)
  const remove = useStudio((s) => s.removeItem)
  const dup = useStudio((s) => s.duplicateItem)
  const cls = 'panel right inspector enter-right' + (hidden ? ' hidden' : '')

  if (!selected) {
    return (
      <aside className={cls}>
        <header>
          <CordSwatch color={cord.color} />
          <div>
            <h2>{pickName(name, lang)}</h2>
          </div>
        </header>
        <div className="body"><Summary /></div>
      </aside>
    )
  }

  const seg = { main: t('segMain'), tailL: t('segL'), tailR: t('segR') }[selected.seg ?? 'main']
  const title = selected.kind === 'bead'
    ? (lang === 'zh' ? `${BEAD_MATERIALS[selected.material].zh} · ${BEAD_SHAPES[selected.shape].zh}` : `${BEAD_MATERIALS[selected.material].name} ${BEAD_SHAPES[selected.shape].name.toLowerCase()}`)
    : selected.style === 'tassel' ? n(KNOT_STYLES.tassel) : `${n(KNOT_STYLES[selected.style])} × ${selected.repeat}`

  return (
    <aside className={cls}>
      <header>
        {selected.kind === 'bead'
          ? <BeadThumb mat={selected.material} shape={selected.shape} color={selected.color} size={44} />
          : <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}><KnotThumb style={selected.style} color={selected.color ?? cord.color} material={selected.material ?? cord.material} size={44} /></div>}
        <div>
          <h2>{title}</h2>
          <p>{seg}</p>
        </div>
        <button className="close" onClick={() => select(null)} aria-label={t('deselect')}>×</button>
      </header>
      <div className="body">
        {selected.kind === 'bead' ? <BeadInspector item={selected} /> : <KnotInspector item={selected} />}
      </div>
      <div className="actions">
        <button className="btn" onClick={() => dup(selected.id)}>{t('duplicate')}</button>
        <button className="btn danger" onClick={() => remove(selected.id)}>{t('remove')}</button>
      </div>
    </aside>
  )
}
