import * as THREE from 'three'

/** Shared scene handles (non-reactive) used by camera, effects, drag & drop. */
export const sceneRefs = {
  bracelet: null as THREE.Group | null,
  camera: null as THREE.Camera | null,
  /** World-space centre of the piece, updated every frame. */
  focus: new THREE.Vector3(),
  /** Where the piece rests in the workshop (top of the design mat). */
  rest: new THREE.Vector3(-2, 1.05, 0.5),
  /** Where it is held up in showcase mode (well above the workshop, inside the backdrop). */
  held: new THREE.Vector3(-2, 70, 0.5),
  /** Bounding radius of the current piece on the mat (cm). */
  extent: 3,
  type: 'bracelet' as 'bracelet' | 'necklace' | 'pendant' | 'ring',
  /** Showcase backdrop opacity 0..1 (drives hiding the workshop once covered). */
  backdrop: 0,
}

export const MAT_CENTER = sceneRefs.rest
