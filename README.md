# Knot Studio · 结艺工坊 — visual prototype (round 1 + refinements)

A small, cozy 3D Chinese-knot jewellery workspace built with **TypeScript + Three.js + React Three Fiber**.
Round 1 goal: prove the *look and feel* (light, materials, depth, interaction) before building the tutorial engine.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## What you can do

| Action | How |
|---|---|
| Orbit / zoom | drag / scroll (360° in Showcase, above-the-table in Workshop / Inspect) |
| Select a bead, knot or tassel | click it (warm halo + lift) |
| Slide a piece | drag it — it stays threaded and can move between the main cord and the clasp tails |
| Add beads / knots | click a card in the left tray, or **drag the card onto the piece** (tails included) |
| Edit a bead | colour, material, shape, size — choosing pearl forces a round pearl, crystal forces faceted |
| Edit a knot | style, repeat (where allowed), colour, thread; book steps shown under each knot |
| Tassel 流苏 | in the Knots tab: fringe length, silk colour, band colour; one per spot (repeat 1), use Duplicate |
| Main cord | thread type, colour, thickness, single/double strand, wearable length |
| Finish 收尾 | sliding knot (tails default 2.5 cm, beads on each tail), button & loop |
| New piece | **＋ New 新建** starts a fresh bracelet (necklace / pendant / ring are in the data model but hidden until ready) |
| Language | 中文 / English toggle in the top bar — the UI shows one language at a time (remembered per browser) |
| Snapshot 快照 | camera button saves the current view + full design; ▾ opens the list to reload a design or download the image |
| Views | `1` Workshop 工作台 · `2` Inspect 端详 · `3` Showcase 展示 |

On load the camera holds a three-quarter glance across the tray (with "Setting out the tray…"), then
glides to a square-on seat at the desk: the tray's front and back rails stay horizontal and the piece
sits in the middle of the uncovered area between the two side panels.

## Code structure

```
src/
  data/            pure design data — no three.js
    types.ts         Design, BeadItem, KnotItem, CordSpec …
    materials.ts     Material Library (bead PBR presets, cord/thread presets, palettes)
    catalog.ts       component catalogue: bead shapes, knot styles, endings, presets
  lib/
    layout.ts        design → placement: cord paths per jewellery type (loop / open drop /
                     clasp tails), arc-length positions, overlap relaxation, cord height, gathering
    textures.ts      procedural canvas textures (wood, linen, braid relief, bead detail)
  three/
    beadGeometry.ts  unit bead meshes (lathe / rounded box), threading axis = +X
    knotGeometry.ts  knots as strand centre-lines (+ per-point tutorial step tags) → tubes
    tasselGeometry.ts  流苏: folded head, wrapped band, fanned fringe
    materialFactory.ts  Material Library → cached MeshPhysicalMaterial
  scene/
    Experience.tsx   <Canvas>, workshop composition, automation hooks
    Lighting.tsx     sun, lamp, ambient, Lightformer environment, showcase key/fill
    Effects.tsx      post stack (N8AO, DOF, bloom, grade, vignette, tone mapping)
    CameraRig.tsx    orbit + fly-to between views
    ShowcaseBackdrop.tsx
    jewelry/         Bracelet, Cord, Piece (bead/knot + interaction), Ending (clasps)
    workshop/        Tray, Props (box, dish, spools, scissors, lamp, teacup), Room (table,
                     wall, shadow casters, light shafts, dust)
  state/store.ts     zustand store: design, undo/redo history, selection, drag, view, new piece
  ui/                Library (tray), Inspector, 3D thumbnails (thumbs.ts), swatches & icons
```

The key separation: **`Design` is plain data** (positions are a 0–1 fraction along the loop; sizes in mm).
`computeLayout()` turns it into arc-length placements; components turn placements into meshes. The same
data will feed the round-2 *Generate Tutorial* step (bead counts, knot order, cord length are already
derived in the Summary panel).

## Rendering & material choices

**Look target — "cozy stylised realism".** PBR everywhere, but with soft, slightly exaggerated forms and
no micro-texture noise. Highlights are broad, metals are rough (champagne gold at roughness 0.3) so nothing
reads like a jewellery advert.

- **Lighting recipe.** A low, warm sun (`#ffe8cc`) from a window on the left gives long soft shadows; a cream
  hemisphere light is the bounce from wall and table; the desk lamp adds a warmer pool (spot + point). All
  reflections come from an in-scene `Environment` built from `Lightformer` cards (window softbox, ceiling
  bounce, lamp disc, warm rim) — no HDR download, fully art-directable, and glass beads show a recognisable
  window highlight.
- **"Volumetric" sunlight** is faked cheaply: additive gradient cards along the sun direction, ~160 drifting
  dust motes, and *invisible* shadow casters (a window frame and a swaying leafy branch) placed outside the
  frame so the tray gets dappled light. These are the same tricks cozy games use instead of real volumetrics.
- **Post stack.** N8AO (contact occlusion so beads sit *on* the linen), depth of field that follows the
  bracelet (wide in Workshop, shallow in Inspect/Showcase), a restrained bloom for the lamp and glints,
  slight desaturation + contrast, vignette, and **Neutral tone mapping** — ACES turned the ivory background
  grey; Neutral keeps creams cream.
- **Beads.** One geometry per silhouette, many materials. `MeshPhysicalMaterial` with transmission + IOR +
  attenuation for glass, crystal (flat-shaded facets + dispersion + iridescence), jade/agate (partial
  transmission, short attenuation → milky glow), pearl (sheen + iridescence + clearcoat), glazed ceramic
  (clearcoat + speckle), wood (sheen + grain). Clear glass is tinted lightly so the cord inside stays visible.
- **Cords.** Tubes along the bracelet path with procedural bump maps: herringbone braid for 中国结线 (5号/72号),
  fine twist for 玉线, smooth twist for 蜡线, fuzzy twist for 棉线, metallic for 金线, and a gold filament baked
  into the albedo/metal maps for 加金线. Anisotropy + sheen give the satin cord its soft sheen. Two strands
  lie side by side and gather/rise to pass through each bead's centre.
- **Knots** are generated from strand centre-lines (diamond 金刚结, square 平结 and spiral 单向平结, snake 蛇结,
  snake-belly braid 蛇腹结, double connection 双联结, butterfly 蝴蝶结, button knot 纽扣结). Because each knot is a
  set of curves, round 2 can animate the cord path step by step (draw-on along the curve, slow-mo, reverse),
  following the Macrame911 / Knots 3D idea that diagrams come from data rather than from images.
- **Showcase** lifts the bracelet off the tray, tilts it toward the camera, fades in a bright cream sweep,
  adds a soft studio key/fill and slowly turns — the "hold it up to the light" moment, without a hand.

## Knots and the book

Each knot in `data/catalog.ts` carries the step text from 《中国结一本通》, and `three/knotGeometry.ts`
builds its strands as data:

- **平结 / 单向平结** — built from the steps: cord *a* stays on the front and zig-zags across as the bars
  (a 挑 b, 压垂线), cord *b* stays behind and wraps forward at each edge (穿过左圈 / 穿过右圈). The two-direction
  version alternates sides so it lies flat; the one-direction version twists into a spiral. Control points are
  tagged with step numbers for the tutorial.
- **金刚结, 蛇结, 蛇腹结, 双联结** — stylised strand paths that match the finished look; they still need to be
  re-authored step by step.
- Not in the tray yet (code kept in `knotGeometry.ts`): 二回盘长结, 双钱结, 酢浆草结, 纽扣结 (纽扣结 is used by the
  button-and-loop clasp).
- **流苏** — the book's method: a bundle folded over the hanging cord, bound with wrapped thread under the fold.

## Known limitations

- Knot strands are authored curves, not a physics simulation. 平结 and 盘长结 follow the book's crossing order;
  金刚结, 蛇结, 蛇腹结, 双联结 and 纽扣结 are still stylised and should be re-authored from the step diagrams.
- The PDF's step *diagrams* (images) were not readable here — only its text — so the paths follow the written
  steps plus general knowledge of each knot.
- Pieces slide along the cords only (they cannot leave the cord).
- Pieces rest flat on the tray; no physics/sag, and cords do not collide with beads.
- Transmission (glass) is screen-space: in Showcase glass beads refract the backdrop colour, not the workshop.
- Necklaces, pendants and rings lie flat on the tray; pendants hang in Showcase, but tassels don't sway yet. Photo → design extraction is not started.
- Heavy on weak GPUs: transmission + AO + DOF + MSAA. `?low` in the URL turns off MSAA and halves AO.
- Fonts load from Google Fonts; offline it falls back to system serif/sans.

## Suggested next steps

1. **Tutorial engine (round 2):** knot strands → step list + camera keyframes; animate cords with a
   draw-range on the tube, plus "Next / Back / slow / reverse" controls on a clean white stage.
2. **Author knots from real step diagrams** (start with 金刚结, 平结, 蛇结, 纽扣结) and validate against photos.
3. **More connectors**: 线圈 / 绕线 wraps, jump rings, pendants hung from a necklace's centre.
4. **Photo → design:** segment beads, cluster colours, fit the repeating pattern to `Design.items`.
5. **Performance tiers:** automatic quality fallback (drop transmission → frosted, AO off) on slow devices.
6. **Asset polish:** hand-modelled hero props (lamp, scissors, box) in Blender with baked AO, keeping the
   procedural jewellery.
