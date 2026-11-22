import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette, HueSaturation, BrightnessContrast } from '@react-three/postprocessing'
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ViewMode } from '../data/types'
import { useStudio } from '../state/store'
import { sceneRefs } from './refs'

/** Per-view lens settings: focus range (world cm) and bokeh size. */
const LENS: Record<ViewMode, { range: number; bokeh: number }> = {
  intro: { range: 16, bokeh: 2.4 },
  workshop: { range: 18, bokeh: 2.0 },
  inspect: { range: 5.5, bokeh: 3.2 },
  showcase: { range: 6, bokeh: 4.5 },
}

/**
 * Post stack, in order:
 *  N8AO (contact occlusion — grounds beads on the mat) → depth of field (soft
 *  background) → gentle bloom on the lamp/sparkles → warm grade → vignette →
 *  Neutral tone mapping (keeps cream whites cream instead of grey).
 */
export function Effects({ quality }: { quality: 'high' | 'low' }) {
  const dof = useRef<DepthOfFieldEffect>(null)
  const view = useStudio((s) => s.view)
  const focus = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const e = dof.current
    if (!e) return
    const lens = LENS[view]
    focus.copy(sceneRefs.focus)
    if (e.target) e.target.lerp(focus, 1 - Math.exp(-8 * dt))
    const k = 1 - Math.exp(-3 * dt)
    const range = view === 'workshop' || view === 'intro' ? lens.range : lens.range * Math.max(0.5, sceneRefs.extent / 3.2)
    e.cocMaterial.focusRange += (range - e.cocMaterial.focusRange) * k
    e.bokehScale += (lens.bokeh - e.bokehScale) * k
  })

  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
      <N8AO aoRadius={1.6} distanceFalloff={0.6} intensity={2.4} color="#5a3f28" halfRes={quality === 'low'} quality={quality === 'high' ? 'medium' : 'performance'} />
      <DepthOfField ref={dof} target={[sceneRefs.rest.x, sceneRefs.rest.y, sceneRefs.rest.z]} focusRange={LENS.workshop.range} bokehScale={LENS.workshop.bokeh} resolutionScale={0.75} />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.3} radius={0.6} />
      <HueSaturation saturation={-0.06} hue={0} />
      <BrightnessContrast brightness={0.01} contrast={0.04} />
      <Vignette offset={0.32} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}
