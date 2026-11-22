import * as THREE from 'three'

/**
 * Procedural textures, painted once on <canvas> and cached.
 * Keeps the prototype asset-free (no image downloads) while still giving
 * wood grain, linen weave and braided-cord relief.
 */

const cache = new Map<string, THREE.Texture>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

// ---------- small seeded value-noise ----------
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function makeNoise(seed = 1, size = 256) {
  const r = rng(seed)
  const g = new Float32Array(size * size).map(() => r())
  const at = (x: number, y: number) => g[(((y % size) + size) % size) * size + (((x % size) + size) % size)]
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, oct = 4) {
  let sum = 0, amp = 0.5, f = 1
  for (let i = 0; i < oct; i++) { sum += amp * noise(x * f, y * f); f *= 2; amp *= 0.5 }
  return sum
}

function finish(tex: THREE.Texture, srgb: boolean, repeat = 1) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 8
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

const hexToRgb = (hex: string) => {
  const c = new THREE.Color(hex)
  return [c.r * 255, c.g * 255, c.b * 255]
}

/** Light maple / ash grain. Returns colour map + a greyscale bump/roughness map. */
export function woodTextures(key: 'tray' | 'table' | 'box' | 'lamp', base: string, dark: string) {
  const id = `wood:${key}`
  if (cache.has(id)) return { map: cache.get(id)!, bump: cache.get(id + ':b')! }
  const W = 1024, H = 1024
  const [c, ctx] = canvas(W, H)
  const [cb, ctxb] = canvas(W, H)
  const img = ctx.createImageData(W, H)
  const imgb = ctxb.createImageData(W, H)
  const n = makeNoise(key.length * 17 + 3, 256)
  const A = hexToRgb(base), B = hexToRgb(dark)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H
      // grain runs along x; distort with low-frequency noise for gentle figure
      const warp = fbm(n, u * 3, v * 6, 3) * 6
      const rings = v * 38 + warp + Math.sin(u * 7 + v * 3) * 0.6
      const fine = fbm(n, u * 140, v * 9, 2)
      let g = Math.pow(0.5 + 0.5 * Math.sin(rings * Math.PI), 6) * 0.65 + fine * 0.35
      g = THREE.MathUtils.clamp(g * 0.75 + (n(u * 9, v * 24) - 0.5) * 0.12, 0, 1)
      const i = (y * W + x) * 4
      for (let k = 0; k < 3; k++) img.data[i + k] = A[k] + (B[k] - A[k]) * g
      img.data[i + 3] = 255
      const bv = 150 - g * 90 + (fine - 0.5) * 40
      imgb.data[i] = imgb.data[i + 1] = imgb.data[i + 2] = bv
      imgb.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  ctxb.putImageData(imgb, 0, 0)
  const map = finish(new THREE.CanvasTexture(c), true)
  const bump = finish(new THREE.CanvasTexture(cb), false)
  cache.set(id, map)
  cache.set(id + ':b', bump)
  return { map, bump }
}

/** Woven linen / felt for the design mat and backdrop. */
export function clothTextures(key: string, base: string, weave = 1) {
  const id = `cloth:${key}`
  if (cache.has(id)) return { map: cache.get(id)!, bump: cache.get(id + ':b')! }
  const W = 512
  const [c, ctx] = canvas(W, W)
  const [cb, ctxb] = canvas(W, W)
  const img = ctx.createImageData(W, W)
  const imgb = ctxb.createImageData(W, W)
  const n = makeNoise(key.length * 31 + 7, 256)
  const A = hexToRgb(base)
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / W
      const fx = Math.sin((x + n(u * 40, v * 40) * 3) * Math.PI / 2.0)
      const fy = Math.sin((y + n(u * 40 + 9, v * 40) * 3) * Math.PI / 2.0)
      const w = (Math.abs(fx) * 0.5 + Math.abs(fy) * 0.5) * weave
      const fuzz = fbm(n, u * 64, v * 64, 3)
      const blot = fbm(n, u * 4, v * 4, 3)
      const g = 0.86 + w * 0.1 + (fuzz - 0.5) * 0.12 + (blot - 0.5) * 0.08
      const i = (y * W + x) * 4
      for (let k = 0; k < 3; k++) img.data[i + k] = THREE.MathUtils.clamp(A[k] * g, 0, 255)
      img.data[i + 3] = 255
      const bv = 110 + w * 90 + (fuzz - 0.5) * 60
      imgb.data[i] = imgb.data[i + 1] = imgb.data[i + 2] = bv
      imgb.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  ctxb.putImageData(imgb, 0, 0)
  const map = finish(new THREE.CanvasTexture(c), true)
  const bump = finish(new THREE.CanvasTexture(cb), false)
  cache.set(id, map)
  cache.set(id + ':b', bump)
  return { map, bump }
}

/** Painted plaster wall — very soft, large-scale variation. */
export function plasterTexture() {
  const id = 'plaster'
  if (cache.has(id)) return cache.get(id)!
  const W = 512
  const [c, ctx] = canvas(W, W)
  const img = ctx.createImageData(W, W)
  const n = makeNoise(99, 256)
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const g = 0.93 + (fbm(n, x / 40, y / 40, 5) - 0.5) * 0.1
    const i = (y * W + x) * 4
    img.data[i] = 247 * g; img.data[i + 1] = 239 * g; img.data[i + 2] = 226 * g; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = finish(new THREE.CanvasTexture(c), true)
  cache.set(id, t)
  return t
}

export type Weave = 'braid' | 'twist' | 'fineTwist' | 'smooth' | 'fuzzy'

/**
 * Cord relief, tiled so that u runs along the cord and v around it.
 * braid = herringbone chevrons (satin rattail), twist = diagonal plies.
 */
export function cordBump(weave: Weave) {
  const id = `cord:${weave}`
  if (cache.has(id)) return cache.get(id)!
  const W = 128, H = 128
  const [c, ctx] = canvas(W, H)
  const img = ctx.createImageData(W, H)
  const n = makeNoise(5, 64)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H
    let g = 0.5
    if (weave === 'braid') {
      // 8 carriers around the cord → chevrons
      const band = Math.floor(v * 8) % 2 === 0 ? 1 : -1
      const k = (u * 2 + band * v * 2) % 1
      g = Math.pow(Math.sin(k * Math.PI), 0.7) * 0.85 + 0.15 * Math.sin(v * 8 * Math.PI) ** 2
    } else if (weave === 'twist' || weave === 'fineTwist') {
      const plies = weave === 'twist' ? 3 : 4
      const k = ((u * 1 + v * plies) % 1 + 1) % 1
      g = Math.pow(Math.sin(k * Math.PI), 0.55)
      g += (n(u * 64, v * 8) - 0.5) * 0.15
    } else if (weave === 'fuzzy') {
      const k = ((u + v * 3) % 1 + 1) % 1
      g = 0.55 * Math.pow(Math.sin(k * Math.PI), 0.8) + 0.45 * fbm(n, u * 32, v * 32, 3)
    } else {
      g = 0.5 + (n(u * 16, v * 16) - 0.5) * 0.1
    }
    const i = (y * W + x) * 4
    const b = THREE.MathUtils.clamp(g, 0, 1) * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = b
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = finish(new THREE.CanvasTexture(c), false)
  cache.set(id, t)
  return t
}

/** Albedo with a gold filament braided through (加金线). */
export function goldFleckMap(baseHex: string) {
  const id = 'cord:goldfleck:' + baseHex
  const base = hexToRgb(baseHex)
  if (cache.has(id)) return cache.get(id)!
  const W = 128, H = 128
  const [c, ctx] = canvas(W, H)
  const img = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H
    const k = ((u * 2 + v * 2) % 1 + 1) % 1
    const onGold = Math.floor(v * 8) % 8 === 0 && k > 0.3 && k < 0.7
    const i = (y * W + x) * 4
    // the cord colour is baked in here (material.color stays white) so the gold stays gold
    if (onGold) { img.data[i] = 226; img.data[i + 1] = 188; img.data[i + 2] = 118 }
    else { img.data[i] = base[0]; img.data[i + 1] = base[1]; img.data[i + 2] = base[2] }
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = finish(new THREE.CanvasTexture(c), true)
  cache.set(id, t)
  return t
}

/** Mask for metallic flecks (white = metal). */
export function goldFleckMetal() {
  const id = 'cord:goldfleck:m'
  if (cache.has(id)) return cache.get(id)!
  const W = 128, H = 128
  const [c, ctx] = canvas(W, H)
  const img = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H
    const k = ((u * 2 + v * 2) % 1 + 1) % 1
    const onGold = Math.floor(v * 8) % 8 === 0 && k > 0.3 && k < 0.7
    const i = (y * W + x) * 4
    // metalnessMap reads blue, roughnessMap reads green
    img.data[i] = 0
    img.data[i + 1] = onGold ? 90 : 255
    img.data[i + 2] = onGold ? 255 : 0
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = finish(new THREE.CanvasTexture(c), false)
  cache.set(id, t)
  return t
}

/** Bead surface detail maps (greyscale-ish, multiplied by bead colour). */
export function beadDetail(kind: 'speckle' | 'woodgrain' | 'marble' | 'cloud') {
  const id = `bead:${kind}`
  if (cache.has(id)) return cache.get(id)!
  const W = 256, H = 128
  const [c, ctx] = canvas(W, H)
  const img = ctx.createImageData(W, H)
  const n = makeNoise(kind.length * 13, 128)
  const r = rng(kind.length * 7)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H
    let g = 1
    let tint = [1, 1, 1]
    if (kind === 'speckle') {
      g = 0.97 + (fbm(n, u * 20, v * 10, 3) - 0.5) * 0.12
      if (r() < 0.004) g = 0.35
    } else if (kind === 'woodgrain') {
      const k = Math.sin((v * 22 + fbm(n, u * 4, v * 4, 3) * 4) * Math.PI)
      g = 0.82 + 0.18 * k
    } else if (kind === 'marble') {
      const k = Math.sin((u * 6 + v * 3 + fbm(n, u * 6, v * 6, 4) * 5) * Math.PI)
      g = 0.78 + 0.3 * Math.pow(0.5 + 0.5 * k, 3)
      tint = [1, 0.97 + 0.05 * k, 0.95]
    } else if (kind === 'cloud') {
      const f = fbm(n, u * 6, v * 6, 5)
      g = 0.8 + f * 0.45
      // milky inclusions in jade
      if (f > 0.62) tint = [1.08, 1.1, 1.05]
    }
    const i = (y * W + x) * 4
    img.data[i] = THREE.MathUtils.clamp(255 * g * tint[0], 0, 255)
    img.data[i + 1] = THREE.MathUtils.clamp(255 * g * tint[1], 0, 255)
    img.data[i + 2] = THREE.MathUtils.clamp(255 * g * tint[2], 0, 255)
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = finish(new THREE.CanvasTexture(c), true)
  cache.set(id, t)
  return t
}

/** Soft radial gradient used for halos, light pools and dust sprites. */
export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const id = `radial:${inner}:${outer}`
  if (cache.has(id)) return cache.get(id)!
  const W = 128
  const [c, ctx] = canvas(W, W)
  const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, W)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  cache.set(id, t)
  return t
}
