// ChloeAvatar.js is a UMD script that reads `window.THREE`. The site vendors
// Three.js as an ES module for its ambient scenes, so expose that one copy
// rather than shipping a second build.
//
// ColorManagement is switched off on purpose: the engine was written against
// r128, where `new THREE.Color(0x4FB3A1)` stored the hex as-is and the custom
// shaders wrote it straight to the framebuffer. r152+ converts hex to linear on
// the way in and expects an sRGB pass on the way out, which a ShaderMaterial
// never gets, so every palette rendered visibly darker than the fleet build.
import * as THREE from '/web/vendor/three/three.module.min.js';

THREE.ColorManagement.enabled = false;
window.THREE = THREE;

export default THREE;
