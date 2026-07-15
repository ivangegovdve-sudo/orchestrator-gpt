const hash32 = (text) => {
  let hash = 2166136261;
  for (const character of String(text)) { hash ^= character.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
};

export function deterministicLayout(id, index, total, side) {
  const progress = total <= 1 ? .5 : index / (total - 1);
  const x = side === "app" ? -3.2 : side === "model" ? -.8 : side === "category" ? 1 : 3.2;
  return Object.freeze({ x, y: 2.5 - progress * 5, z: ((hash32(id) % 1000) / 999 - .5) * 1.2 });
}

export async function mountRelationshipCanopy({ host, graph, maxNodes = 32, maxEdges = 110 }) {
  const THREE = await import("/web/vendor/three/three.module.min.js");
  const width = Math.max(320, host.clientWidth); const height = Math.max(260, host.clientHeight);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(matchMedia("(pointer: coarse)").matches ? 1.5 : 1.75, devicePixelRatio || 1)); renderer.setSize(width, height, false); renderer.domElement.setAttribute("aria-hidden", "true"); renderer.domElement.tabIndex = -1; renderer.domElement.style.pointerEvents = "none"; host.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(38, width / height, .1, 40); camera.position.set(0, 0, 11); const group = new THREE.Group(); scene.add(group); scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const entities = graph.nodes.slice(0, maxNodes).map((item, index, rows) => ({ ...item, position: deterministicLayout(item.id, index, rows.length, item.kind) })); const positions = new Map(); const meshes = new Map(); const sphere = new THREE.SphereGeometry(.11, 10, 8);
  for (const entity of entities) { const material = new THREE.MeshBasicMaterial({ color: entity.kind === "app" ? 0xf4c86b : entity.kind === "model" ? 0x79f2a8 : entity.kind === "category" ? 0xa9b2ff : 0x73e9ff, transparent: true, opacity: .88 }); const mesh = new THREE.Mesh(sphere, material); mesh.position.set(entity.position.x, entity.position.y, entity.position.z); positions.set(String(entity.id), mesh.position.clone()); meshes.set(String(entity.id), mesh); group.add(mesh); }
  const linePoints = [];
  for (const edge of graph.edges.slice(0, maxEdges)) { const start = positions.get(String(edge.sourceId)); const end = positions.get(String(edge.targetId)); if (start && end) linePoints.push(start, end); }
  if (linePoints.length) { const geometry = new THREE.BufferGeometry().setFromPoints(linePoints); const material = new THREE.LineBasicMaterial({ color: 0x9dcfa9, transparent: true, opacity: .2 }); group.add(new THREE.LineSegments(geometry, material)); }
  let active = true; let frame = 0; let animationFrame = 0; let wakeUntil = performance.now() + 600; let disposed = false;
  const debug = { loaded: true, running: true, frames: 0, nodes: entities.length, edges: linePoints.length / 2, disposed: false }; window.__openOverviewThreeDebug = debug;
  const render = (time) => { if (disposed || !active || document.hidden) { debug.running = false; animationFrame = 0; return; } const progress = Math.min(1, Math.max(0, 1 - (wakeUntil - time) / 600)); group.scale.setScalar(.94 + progress * .06); renderer.render(scene, camera); debug.frames = ++frame; if (time < wakeUntil) animationFrame = requestAnimationFrame(render); else { debug.running = false; animationFrame = 0; } };
  const wake = () => { if (disposed || !active || document.hidden) return; wakeUntil = performance.now() + 600; if (!animationFrame) { debug.running = true; animationFrame = requestAnimationFrame(render); } };
  const resize = () => { const nextWidth = Math.max(320, host.clientWidth); const nextHeight = Math.max(260, host.clientHeight); camera.aspect = nextWidth / nextHeight; camera.updateProjectionMatrix(); renderer.setSize(nextWidth, nextHeight, false); wake(); };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); const visibility = () => { if (!document.hidden) wake(); }; document.addEventListener("visibilitychange", visibility);
  const setActive = (value) => { active = Boolean(value); if (!active && animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; debug.running = false; } else if (active) wake(); };
  const updateSelection = (ids) => { const selected = new Set(ids.map(String)); for (const [id, mesh] of meshes) { mesh.scale.setScalar(selected.has(id) ? 1.9 : 1); mesh.material.opacity = selected.size === 0 || selected.has(id) ? .9 : .28; } wake(); };
  function destroy() { if (disposed) return; disposed = true; if (animationFrame) cancelAnimationFrame(animationFrame); resizeObserver.disconnect(); document.removeEventListener("visibilitychange", visibility); scene.traverse((object) => { if (object.geometry && object.geometry !== sphere) object.geometry.dispose(); if (object.material) object.material.dispose(); }); sphere.dispose(); renderer.dispose(); renderer.domElement.remove(); debug.running = false; debug.disposed = true; }
  renderer.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); host.dataset.webglState = "lost"; destroy(); const note = document.createElement("p"); note.className = "oo-network-note"; note.textContent = "WebGL context lost; the semantic matrix and ranking tables remain authoritative."; host.replaceChildren(note); }, { once: true }); wake();
  return Object.freeze({ setActive, updateSelection, destroy });
}
