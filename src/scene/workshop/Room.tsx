import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clothTextures, plasterTexture, radialTexture, woodTextures } from '../../lib/textures'

/** Tabletop + back wall in warm ivory. */
export function Room() {
  const { table, wall, runner } = useMemo(() => {
    const wood = woodTextures('table', '#f2e8d8', '#e1d1b8')
    const m = wood.map.clone(); m.repeat.set(3, 3); m.needsUpdate = true
    const b = wood.bump.clone(); b.repeat.set(3, 3); b.needsUpdate = true
    const table = new THREE.MeshPhysicalMaterial({ map: m, bumpMap: b, bumpScale: 0.35, roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.6 })
    const plaster = plasterTexture().clone(); plaster.repeat.set(3, 2); plaster.needsUpdate = true
    const wall = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 })
    const cloth = clothTextures('runner', '#f3ece2', 1.2)
    const cm = cloth.map.clone(); cm.repeat.set(10, 5); cm.needsUpdate = true
    const cb = cloth.bump.clone(); cb.repeat.set(10, 5); cb.needsUpdate = true
    const runner = new THREE.MeshPhysicalMaterial({ map: cm, bumpMap: cb, bumpScale: 1.2, roughness: 0.95, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff8ee') })
    return { table, wall, runner }
  }, [])
  return (
    <group>
      <mesh material={table} rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
        <planeGeometry args={[260, 200]} />
      </mesh>
      {/* linen runner under the tray */}
      <mesh material={runner} rotation-x={-Math.PI / 2} rotation-z={0.04} position={[-2, 0.02, 2]} receiveShadow>
        <planeGeometry args={[64, 36]} />
      </mesh>
      <mesh material={wall} position={[0, 60, -62]} receiveShadow>
        <planeGeometry args={[300, 140]} />
      </mesh>
    </group>
  )
}

/**
 * Shadow-only occluders outside the frame: a window frame and a leafy branch.
 * They cast dappled sunlight across the table without ever being seen.
 */
export function ShadowCasters({ sunDir }: { sunDir: THREE.Vector3 }) {
  const branch = useRef<THREE.Group>(null)
  const leafGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.bezierCurveTo(1.6, 1.2, 4.2, 1.1, 6, 0)
    s.bezierCurveTo(4.2, -1.1, 1.6, -1.2, 0, 0)
    return new THREE.ShapeGeometry(s, 8)
  }, [])
  const hidden = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }), [])
  const leaves = useMemo(() => {
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 26 }, (_, i) => ({
      p: [i * 1.9 - 20 + rnd() * 3, (rnd() - 0.5) * 9, (rnd() - 0.5) * 6] as [number, number, number],
      r: [rnd() * 1.2 - 0.6, rnd() * 6, rnd() * 6] as [number, number, number],
      s: 0.8 + rnd() * 0.7,
    }))
  }, [])
  // place casters part-way toward the sun
  const anchor = sunDir.clone().multiplyScalar(48)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (branch.current) {
      branch.current.rotation.z = Math.sin(t * 0.45) * 0.035 + Math.sin(t * 1.3) * 0.01
      branch.current.rotation.x = Math.sin(t * 0.33 + 1) * 0.03
    }
  })
  return (
    <group position={anchor}>
      {/* window mullions */}
      <group position={[-6, -10, -14]} rotation-y={0.9}>
        {[-14, 0, 14].map((x) => (
          <mesh key={x} material={hidden} position={[x, 0, 0]} castShadow>
            <boxGeometry args={[1.6, 60, 1.6]} />
          </mesh>
        ))}
        <mesh material={hidden} position={[0, 4, 0]} castShadow>
          <boxGeometry args={[40, 1.6, 1.6]} />
        </mesh>
      </group>
      <group ref={branch} position={[0, 4, 14]} rotation-y={0.6}>
        {leaves.map((l, i) => (
          <mesh key={i} geometry={leafGeo} material={hidden} position={l.p} rotation={l.r} scale={l.s} castShadow />
        ))}
      </group>
    </group>
  )
}

/** Soft volumetric sun shafts: additive gradient cards aligned with the light. */
export function LightShafts({ sunDir }: { sunDir: THREE.Vector3 }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffe2b3') }, uStrength: { value: 0.045 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uStrength;
          void main(){
            float across = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
            float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
            float shimmer = 0.85 + 0.15 * sin(vUv.x * 9.0 + uTime * 0.25) * sin(vUv.y * 4.0 - uTime * 0.18);
            gl_FragColor = vec4(uColor * across * along * shimmer * uStrength, 1.0);
          }`,
      }),
    [],
  )
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir.clone().normalize()), [sunDir])
  const shafts = [
    { o: [-10, 0, -8], w: 7 },
    { o: [-2, 0, -2], w: 5 },
    { o: [6, 0, 6], w: 6 },
  ]
  return (
    <group>
      {shafts.map((s, i) => (
        <group key={i} position={s.o as [number, number, number]} quaternion={q}>
          {[0, 1].map((k) => (
            <mesh key={k} material={mat} position-y={22} rotation-y={k * Math.PI / 2 + i * 0.3}>
              <planeGeometry args={[s.w, 46]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Dust motes drifting slowly through the sunlight. */
export function DustMotes({ count = 160 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const { geo, mat, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    let s = 17
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 40 - 6
      pos[i * 3 + 1] = rnd() * 22 + 2
      pos[i * 3 + 2] = (rnd() - 0.5) * 30
      seeds[i] = rnd() * 100
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.PointsMaterial({ size: 0.22, map: radialTexture('rgba(255,240,215,1)', 'rgba(255,240,215,0)'), transparent: true, depthWrite: false, opacity: 0.55, blending: THREE.AdditiveBlending, sizeAttenuation: true, color: '#fff1da' })
    return { geo: g, mat: m, seeds }
  }, [count])
  useFrame((_, dt) => {
    const p = geo.getAttribute('position') as THREE.BufferAttribute
    const t = performance.now() * 0.0001
    for (let i = 0; i < p.count; i++) {
      const sd = seeds[i]
      p.setX(i, p.getX(i) + Math.sin(t * 3 + sd) * dt * 0.12)
      p.setY(i, p.getY(i) + (Math.sin(t * 2 + sd * 1.7) * 0.06 - 0.02) * dt)
      p.setZ(i, p.getZ(i) + Math.cos(t * 2.5 + sd) * dt * 0.1)
      if (p.getY(i) < 1) p.setY(i, 24)
    }
    p.needsUpdate = true
  })
  return <points ref={ref} geometry={geo} material={mat} />
}
