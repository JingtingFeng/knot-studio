import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ViewMode } from './data/types'
import { pickName, useLang, useT } from './i18n'
import { getCurrentLayout, pointerToSpot } from './scene/jewelry/Bracelet'
import { Experience } from './scene/Experience'
import { downloadSnapshot, useSnapshots } from './state/snapshots'
import { useStudio, type NewItemSpec } from './state/store'
import { Inspector } from './ui/Inspector'
import { DRAG_MIME, Library } from './ui/Library'

const VIEWS: { id: Exclude<ViewMode, 'intro'>; key: string }[] = [
  { id: 'workshop', key: '1' },
  { id: 'inspect', key: '2' },
  { id: 'showcase', key: '3' },
]

const PRESET_DOTS = ['linear-gradient(135deg,#5fc8bf,#f1c4d3 60%,#e4c48e)', 'linear-gradient(135deg,#b4262c,#e4c48e)']

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </svg>
  )
}

/** Snapshot button + gallery of saved designs (image + data). */
function Snapshots() {
  const { t, lang } = useT()
  const list = useSnapshots((s) => s.list)
  const take = useSnapshots((s) => s.take)
  const remove = useSnapshots((s) => s.remove)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [])
  const [preview, setPreview] = useState<string | null>(null)
  const flashNote = (msg: string) => { setNote(msg); setTimeout(() => setNote(null), 2600) }
  const capture = () => {
    const snap = take(useStudio.getState().design)
    if (snap) { setOpen(true); flashNote(t('snapSaved')) }
    else flashNote(t('snapFailed'))
  }
  const fmt = (ms: number) => new Date(ms).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="snapwrap" ref={ref}>
      <button className="tool" onClick={capture} title={t('snapshotTitle')}>
        <CameraIcon />
        <span>{t('snapshot')}</span>
      </button>
      <button className="tool caret" onClick={() => setOpen((o) => !o)} aria-label={t('snapshots')} title={t('snapshots')}>
        {list.length > 0 && <i className="badge">{list.length}</i>}▾
      </button>
      {preview && createPortal(
        <div className="snapview" onPointerDown={(e) => e.stopPropagation()} onClick={() => setPreview(null)}>
          <img src={preview} alt="" onClick={(e) => e.stopPropagation()} />
          <p>{t('snapSaveHint')}</p>
        </div>,
        document.body,
      )}
      {open && (
        <div className="snapmenu panel">
          <div className="snaphead">
            <b>{t('snapshots')}</b>
            {note && <span className="saved">{note}</span>}
          </div>
          {list.length === 0 && <p className="hint" style={{ margin: '8px 4px' }}>{t('snapEmpty')}</p>}
          <div className="snaplist">
            {list.map((s) => (
              <div key={s.id} className="snapitem">
                <img src={s.image} alt="" onClick={() => setPreview(s.image)} title={t('snapPreview')} />
                <div className="meta">
                  <b>{pickName(s.name, lang)}</b>
                  <span>{fmt(s.time)}</span>
                  <div className="row">
                    <button onClick={async () => {
                      const r = await downloadSnapshot(s)
                      if (r === 'saved') flashNote(t('snapDownloaded'))
                      else if (r === 'declined') flashNote(t('snapDeclined'))
                      else { flashNote(t('snapNoDownload')); setPreview(s.image) }
                    }}>{t('snapDownload')}</button>
                    <button className="del" onClick={() => remove(s.id)}>{t('snapDelete')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Camera flash when a snapshot is taken. */
function Flash() {
  const flash = useSnapshots((s) => s.flash)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!flash) return
    setOn(true)
    const id = setTimeout(() => setOn(false), 60)
    return () => clearTimeout(id)
  }, [flash])
  return <div className={'flash' + (on ? ' on' : '')} />
}

export function App() {
  const { t, lang } = useT()
  const setLang = useLang((s) => s.setLang)
  const view = useStudio((s) => s.view)
  const setView = useStudio((s) => s.setView)
  const recenter = useStudio((s) => s.recenter)
  const presets = useStudio((s) => s.presets)
  const presetIndex = useStudio((s) => s.presetIndex)
  const loadPreset = useStudio((s) => s.loadPreset)
  const newDesign = useStudio((s) => s.newDesign)
  const designName = useStudio((s) => s.design.name)
  const [ready, setReady] = useState(false)
  const [dropHover, setDropHover] = useState(false)
  const quality = new URLSearchParams(location.search).has('low') ? 'low' : 'high'

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en' }, [lang])

  // loading: hold the three-quarter "intro" shot until the scene is up, then glide to the desk
  useEffect(() => {
    const id = setInterval(() => {
      if ((window as any).__ready) {
        clearInterval(id)
        setTimeout(() => {
          setReady(true)
          if (useStudio.getState().view === 'intro') useStudio.getState().setView('workshop')
        }, 1400)
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const st = useStudio.getState()
      const v = VIEWS.find((x) => x.key === e.key)
      if (v && st.view !== 'intro') st.setView(v.id)
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) st.removeItem(st.selectedId)
      if (e.key === 'Escape') st.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropHover(false)
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return
    const spec = JSON.parse(raw) as NewItemSpec
    const canvas = (e.currentTarget as HTMLElement).querySelector('canvas')
    const spot = canvas ? pointerToSpot(e.clientX, e.clientY, canvas, getCurrentLayout()) : null
    useStudio.getState().addItem(spec, spot ?? undefined)
  }

  const intro = view === 'intro'
  const showcase = view === 'showcase'

  return (
    <div className={'app lang-' + lang + (intro ? ' is-intro' : '')}>
      <div
        className={'stage' + (dropHover ? ' drop-hover' : '')}
        onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); setDropHover(true) } }}
        onDragLeave={() => setDropHover(false)}
        onDrop={onDrop}
      >
        <Experience quality={quality} />
      </div>
      <Flash />

      <div className="brand">
        <div className="seal">结</div>
        <div>
          <h1>Knot Studio</h1>
          <p>{t('brandSub')}</p>
        </div>
      </div>

      <div className={'panel views enter-top' + (intro ? ' hidden' : '')}>
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)} title={`${t(v.id)} (${v.key})`}>
            {t(v.id)}
          </button>
        ))}
        <div className="sep" />
        <button className="tool lang" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title={t('langTitle')}>{t('langToggle')}</button>
        <Snapshots />
        <button className="tool" onClick={recenter} title={t('recenter')} aria-label={t('recenter')}>⟲</button>
      </div>

      <div className={'panel presets enter-top' + (intro ? ' hidden' : '')}>
        {presets.map((p, i) => (
          <button key={i} className={presetIndex === i ? 'on' : ''} onClick={() => loadPreset(i)} title={pickName(p.name, lang)}>
            <span className="dot" style={{ background: PRESET_DOTS[i] }} />
            {pickName(p.name, lang)}
          </button>
        ))}
        <div className="newmenu">
          <button className="new-btn" onClick={() => newDesign('bracelet')} title={t('newTitle')}>{t('newPiece')}</button>
        </div>
      </div>

      <Library hidden={showcase || intro} />
      <Inspector hidden={showcase || intro} />

      <div className={'showcase-caption' + (showcase ? '' : ' off')}>
        <h3>{pickName(designName, lang)}</h3>
        <p>{t('dragTurn')}</p>
      </div>

      <div className={'panel hintbar enter-bottom' + (showcase || intro ? ' hidden' : '')}>
        {(['hintOrbit', 'hintZoom', 'hintClick', 'hintSlide'] as const).map((k) => {
          const [verb, rest] = t(k).split('|')
          return <span key={k}><b>{verb}</b> {rest}</span>
        })}
      </div>

      <div className={'loading' + (ready ? ' done' : '')}>
        <span className="seal-sm">结</span>
        <span>{t('loading')}</span>
      </div>
    </div>
  )
}
