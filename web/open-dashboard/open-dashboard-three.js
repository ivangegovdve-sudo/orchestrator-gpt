const hash32 = (text) => {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const clamp = (value, minimum, maximum) => (
  Math.max(minimum, Math.min(maximum, value))
);

export function deterministicLayout(id, index, total, side) {
  const progress = total <= 1 ? 0.5 : index / (total - 1);
  const x = side === "app" ? -3.2 : side === "model" ? -0.8 : side === "category" ? 1 : 3.2;
  return Object.freeze({
    x,
    y: 2.5 - progress * 5,
    z: ((hash32(id) % 1000) / 999 - 0.5) * 1.2,
  });
}

export async function mountRelationshipCanopy({
  host,
  graph,
  maxNodes = 32,
  maxEdges = 110,
}) {
  const THREE = await import("/web/vendor/three/three.module.min.js");
  const initialWidth = Math.max(320, host.clientWidth);
  const initialHeight = Math.max(260, host.clientHeight);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(
    matchMedia("(pointer: coarse)").matches ? 1.5 : 1.75,
    devicePixelRatio || 1,
  ));
  renderer.setSize(initialWidth, initialHeight, false);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.tabIndex = -1;
  renderer.domElement.style.pointerEvents = "none";
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, initialWidth / initialHeight, 0.1, 40);
  camera.position.set(0, 0, 11);
  const group = new THREE.Group();
  scene.add(group);

  const sharedUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uClick: { value: 0 },
  };
  const vertexShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uClick;
    varying float vLight;

    void main() {
      float breath = sin(uTime * 0.72 + position.y * 5.0 + position.x * 3.0) * 0.035;
      vec3 p = position * (1.0 + breath + uClick * 0.13);
      vLight = 0.08 * length(uMouse) + uClick * 0.5;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying float vLight;

    void main() {
      gl_FragColor = vec4(uColor + vec3(vLight), uOpacity);
    }
  `;

  const entities = graph.nodes.slice(0, maxNodes).map((item, index, rows) => ({
    ...item,
    position: deterministicLayout(item.id, index, rows.length, item.kind),
  }));
  const positions = new Map();
  const meshes = new Map();
  const sphere = new THREE.SphereGeometry(0.11, 10, 8);
  const colorForKind = (kind) => (
    kind === "app" ? 0xf4c86b
      : kind === "model" ? 0x79f2a8
        : kind === "category" ? 0xa9b2ff
          : 0x73e9ff
  );

  for (const entity of entities) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uMouse: sharedUniforms.uMouse,
        uClick: sharedUniforms.uClick,
        uColor: { value: new THREE.Color(colorForKind(entity.kind)) },
        uOpacity: { value: 0.88 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(entity.position.x, entity.position.y, entity.position.z);
    positions.set(String(entity.id), mesh.position.clone());
    meshes.set(String(entity.id), mesh);
    group.add(mesh);
  }

  const linePoints = [];
  for (const edge of graph.edges.slice(0, maxEdges)) {
    const start = positions.get(String(edge.sourceId));
    const end = positions.get(String(edge.targetId));
    if (start && end) linePoints.push(start, end);
  }
  let lineMaterial = null;
  if (linePoints.length) {
    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    lineMaterial = new THREE.LineBasicMaterial({
      color: 0x9dcfa9,
      transparent: true,
      opacity: 0.2,
    });
    group.add(new THREE.LineSegments(geometry, lineMaterial));
  }

  let active = true;
  let animationFrame = 0;
  let disposed = false;
  let lastTime = performance.now();
  let clickEnergy = 0;
  const pointer = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  };
  const debug = {
    loaded: true,
    running: true,
    frames: 0,
    nodes: entities.length,
    edges: linePoints.length / 2,
    disposed: false,
    theme: "ecosystem-canopy",
    uniforms: {
      uMouse: [0, 0],
      uClick: 0,
    },
  };
  window.__openDashboardThreeDebug = debug;

  const render = (time) => {
    animationFrame = 0;
    if (disposed || !active || document.hidden) {
      debug.running = false;
      return;
    }

    const delta = clamp((time - lastTime) / 1000, 1 / 240, 1 / 20);
    lastTime = time;
    const pointerEase = 1 - Math.exp(-delta * 6);
    pointer.x += (pointer.targetX - pointer.x) * pointerEase;
    pointer.y += (pointer.targetY - pointer.y) * pointerEase;
    clickEnergy *= Math.exp(-delta * 2.8);
    if (clickEnergy < 0.002) clickEnergy = 0;

    sharedUniforms.uTime.value = time / 1000;
    sharedUniforms.uMouse.value.set(pointer.x, pointer.y);
    sharedUniforms.uClick.value = clickEnergy;
    group.rotation.y = pointer.x * 0.11 + Math.sin(time / 5400) * 0.025;
    group.rotation.x = -pointer.y * 0.055 + Math.cos(time / 6200) * 0.018;
    group.scale.setScalar(1 + clickEnergy * 0.035);
    if (lineMaterial) lineMaterial.opacity = 0.2 + clickEnergy * 0.14;

    renderer.render(scene, camera);
    debug.frames += 1;
    debug.running = true;
    debug.uniforms.uMouse = [pointer.x, pointer.y];
    debug.uniforms.uClick = clickEnergy;
    animationFrame = requestAnimationFrame(render);
  };

  const start = () => {
    if (disposed || !active || document.hidden || animationFrame) return;
    lastTime = performance.now();
    debug.running = true;
    animationFrame = requestAnimationFrame(render);
  };

  const updatePointer = (event) => {
    if (disposed) return;
    const bounds = host.getBoundingClientRect();
    pointer.targetX = clamp(
      ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
      -1,
      1,
    );
    pointer.targetY = clamp(
      -(((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1),
      -1,
      1,
    );
    start();
  };
  const onPointerDown = (event) => {
    updatePointer(event);
    clickEnergy = 1;
    sharedUniforms.uClick.value = 1;
    start();
  };
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });

  const resize = () => {
    const width = Math.max(320, host.clientWidth);
    const height = Math.max(260, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    start();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  const visibility = () => {
    if (document.hidden) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      debug.running = false;
    } else {
      start();
    }
  };
  document.addEventListener("visibilitychange", visibility);

  const setActive = (value) => {
    active = Boolean(value);
    if (!active && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      debug.running = false;
    } else if (active) {
      start();
    }
  };

  const updateSelection = (ids) => {
    const selected = new Set(ids.map(String));
    for (const [id, mesh] of meshes) {
      mesh.scale.setScalar(selected.has(id) ? 1.9 : 1);
      mesh.material.uniforms.uOpacity.value = (
        selected.size === 0 || selected.has(id) ? 0.9 : 0.28
      );
    }
    start();
  };

  function destroy() {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", updatePointer);
    window.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("visibilitychange", visibility);

    const geometries = new Set();
    const materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (Array.isArray(object.material)) {
        for (const material of object.material) materials.add(material);
      } else if (object.material) {
        materials.add(object.material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    debug.running = false;
    debug.disposed = true;
  }

  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    host.dataset.webglState = "lost";
    destroy();
    const note = document.createElement("p");
    note.className = "oo-network-note";
    note.textContent = (
      "WebGL context lost; the semantic matrix and ranking tables remain authoritative."
    );
    host.replaceChildren(note);
  }, { once: true });

  start();
  return Object.freeze({ setActive, updateSelection, destroy });
}
