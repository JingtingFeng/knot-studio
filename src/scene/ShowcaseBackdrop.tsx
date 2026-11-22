import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStudio } from '../state/store'
import { sceneRefs } from './refs'

/**
 * Showcase backdrop: a soft cream "photo sweep" sphere around the held piece.
 * It fades in over the workshop (which stays faintly visible through it,
 * then gets blurred by DOF) — like holding the bracelet up to the light.
 */
export function ShowcaseBackdrop() {
  const mesh = useRef<THREE.Mesh>(null)
  const view = useStudio((s) => s.view)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: { uOpacity: { value: 0 }, uTop: { value: new THREE.Color('#fffaf2') }, uBottom: { value: new THREE.Color('#f1e2cb') }, uGlow: { value: new THREE.Color('#fff6e6') } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir; uniform float uOpacity; uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uGlow;
          void main(){
            float h = vDir.y * 0.5 + 0.5;
            vec3 col = mix(uBottom, uTop, smoothstep(0.15, 0.85, h));
            // soft window glow up-left
            float g = pow(max(dot(vDir, normalize(vec3(-0.6, 0.5, -0.6))), 0.0), 6.0);
            col += uGlow * g * 0.35;
            gl_FragColor = vec4(col * 1.06, uOpacity);
          }`,
      }),
    [],
  )
  useFrame((_, dt) => {
    const target = view === 'showcase' ? 1 : 0
    const u = mat.uniforms.uOpacity
    u.value += (target - u.value) * (1 - Math.exp(-(view === 'showcase' ? 6 : 4) * dt))
    sceneRefs.backdrop = u.value
    if (mesh.current) {
      mesh.current.visible = u.value > 0.005
      mesh.current.position.copy(sceneRefs.held)
    }
  })
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1}>
      <sphereGeometry args={[66, 64, 40]} />
    </mesh>
  )
}
