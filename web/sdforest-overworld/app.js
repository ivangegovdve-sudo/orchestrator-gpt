// Original clean-room prototype. Reference sites informed only the interaction
// categories documented in README.md; no reference source, shaders, imagery, or layouts are used here.
import * as THREE from "../vendor/three/three.module.min.js";

const shell = document.querySelector("#forest-shell");
const canvas = document.querySelector("#forest-canvas");
const introActivator = document.querySelector("#intro-activator");
const enterForest = document.querySelector("#enter-forest");
const restartIntro = document.querySelector("#restart-intro");
const frontPanel = document.querySelector("#front-panel");
const poolDetail = document.querySelector("#pool-detail");
const poolTitle = document.querySelector("#pool-title");
const poolDescription = document.querySelector("#pool-description");
const openSource = document.querySelector("#open-source");
const projectSources = document.querySelector("#project-sources");
const sceneStatus = document.querySelector("#scene-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const SOURCES = [
  {
    id: "the-drop",
    label: "The Drop",
    description: "A living publication and audio-reader surface.",
    href: "../morning-news/",
    color: "#9bffd4",
    position: [-3.95, -2.55],
  },
  {
    id: "mendeleev",
    label: "Mendeleev",
    description: "A playful science-learning environment.",
    href: "../mendeleev-bg/",
    color: "#79d7ff",
    position: [-1.82, -4.35],
  },
  {
    id: "rubiks-teacher",
    label: "Rubik’s Teacher",
    description: "A visual route into solving and understanding a cube.",
    href: "../rubiks-teacher/",
    color: "#e6d0ff",
    position: [1.2, -4.4],
  },
  {
    id: "open-dashboard",
    label: "Open Dashboard",
    description: "An evidence-aware view into open AI tools and systems.",
    href: "../open-dashboard/",
    color: "#f8c77d",
    position: [4.0, -2.35],
  },
  {
    id: "artificial-self",
    label: "Artificial Self",
    description: "Research and experiments around identity, minds, and tools.",
    href: "../ai-research/",
    color: "#b3a6ff",
    position: [3.35, 2.85],
  },
  {
    id: "poetry-space",
    label: "Poetry Space",
    description: "A quieter source for language, reflection, and creative work.",
    href: "../m-popova/",
    color: "#f0a5ba",
    position: [-3.45, 2.75],
  },
];

const sourceById = new Map(SOURCES.map((source) => [source.id, source]));
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const waterMaterial = { current: null };
const poolRecords = [];
const interactivePools = [];

const state = {
  introPhase: "dormant",
  openingStartedAt: 0,
  reduced: reducedMotion.matches,
  scene: "intro",
  selectedSourceId: null,
  transitionTimer: null,
};

const intro = {
  arch: null,
  portal: null,
  portalAura: null,
  portalLight: null,
  portalMaterial: null,
  portalRimMaterial: null,
  stones: [],
  stars: null,
};

let renderer;
let introCamera;
let introScene;
let frontCamera;
let frontScene;

function frontCameraHome() {
  if (window.innerWidth / window.innerHeight < .85) return { x: 7.1, y: 8.3, z: 13.6 };
  return { x: 8.3, y: 7.1, z: 10.4 };
}

function hash01(value) {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function smoothstep(edge0, edge1, value) {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return amount * amount * (3 - 2 * amount);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
}

function makeGlowTexture(color, strength = 1) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 192;
  textureCanvas.height = 192;
  const context = textureCanvas.getContext("2d");
  const center = textureCanvas.width / 2;
  const gradient = context.createRadialGradient(center, center, 2, center, center, center);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.92 * strength})`);
  gradient.addColorStop(0.16, `${color}`);
  gradient.addColorStop(0.46, `${color}55`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  const texture = new THREE.CanvasTexture(textureCanvas);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePortalTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 320;
  textureCanvas.height = 320;
  const context = textureCanvas.getContext("2d");
  const center = 160;
  const base = context.createRadialGradient(center, center, 4, center, center, 158);
  base.addColorStop(0, "rgba(246,251,255,.96)");
  base.addColorStop(.09, "rgba(166,198,255,.92)");
  base.addColorStop(.28, "rgba(91,118,239,.72)");
  base.addColorStop(.58, "rgba(59,42,133,.38)");
  base.addColorStop(1, "rgba(4,8,26,0)");
  context.fillStyle = base;
  context.fillRect(0, 0, 320, 320);

  for (let index = 0; index < 42; index += 1) {
    const start = index * 2.399 + hash01(index + 91) * .48;
    const radius = 19 + hash01(index + 32) * 126;
    const arc = .46 + hash01(index + 87) * 1.18;
    context.beginPath();
    context.arc(center, center, radius, start, start + arc);
    context.strokeStyle = index % 3 === 0
      ? "rgba(214,232,255,.40)"
      : index % 3 === 1
        ? "rgba(115,178,255,.34)"
        : "rgba(178,112,255,.29)";
    context.lineWidth = 1 + hash01(index + 117) * 4;
    context.lineCap = "round";
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLoop(radius, color, opacity = .55) {
  const points = [];
  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, .028, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function createIslandShape(points, depth, color, verticalOffset, roughness) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: .11,
    bevelThickness: .08,
    curveSegments: 3,
    depth,
  });
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: .08 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = verticalOffset;
  return mesh;
}

function createArrivalArch() {
  const arch = new THREE.Group();
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x353b36,
    emissive: 0x061422,
    emissiveIntensity: .22,
    metalness: .04,
    roughness: .92,
  });
  const mossMaterial = new THREE.MeshStandardMaterial({
    color: 0x29433a,
    emissive: 0x0a211b,
    emissiveIntensity: .22,
    roughness: .96,
  });
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(.7, 2.45, .72, 2, 4, 2), stoneMaterial);
  const rightPillar = leftPillar.clone();
  leftPillar.position.set(-2.34, .02, -.6);
  rightPillar.position.set(2.34, .02, -.6);
  arch.add(leftPillar, rightPillar);

  const crown = new THREE.Mesh(new THREE.TorusGeometry(2.34, .38, 6, 28, Math.PI), stoneMaterial);
  crown.position.set(0, 1.24, -.61);
  arch.add(crown);

  for (let index = 0; index < 26; index += 1) {
    const angle = Math.PI * (index / 25);
    const patch = new THREE.Mesh(
      new THREE.DodecahedronGeometry(.055 + hash01(index + 144) * .09, 0),
      mossMaterial,
    );
    patch.position.set(
      Math.cos(angle) * 2.36 + (hash01(index + 151) - .5) * .18,
      1.24 + Math.sin(angle) * 2.36 + (hash01(index + 157) - .5) * .14,
      -.14 + hash01(index + 163) * .12,
    );
    arch.add(patch);
  }

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8.8, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a1715, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.18;
  arch.add(ground);

  for (let index = 0; index < 34; index += 1) {
    const fern = new THREE.Mesh(
      new THREE.ConeGeometry(.025 + hash01(index + 170) * .055, .25 + hash01(index + 177) * .48, 4),
      mossMaterial,
    );
    const side = index % 2 === 0 ? -1 : 1;
    fern.position.set(
      side * (2.5 + hash01(index + 184) * 3.4),
      -1.02,
      -1.25 + hash01(index + 191) * 2.8,
    );
    fern.rotation.z = side * (.34 + hash01(index + 198) * .48);
    arch.add(fern);
  }
  return arch;
}

function createIntroScene() {
  introScene = new THREE.Scene();
  introScene.background = new THREE.Color(0x030708);
  introScene.fog = new THREE.FogExp2(0x030708, .075);
  introCamera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  introCamera.position.set(0, 1.25, 10.4);
  introCamera.lookAt(0, 1, 0);

  introScene.add(new THREE.HemisphereLight(0x476b7e, 0x010403, .9));
  const keyLight = new THREE.PointLight(0x8ea9ce, 7, 18, 2);
  keyLight.position.set(-2, 4, 4);
  introScene.add(keyLight);

  const starPositions = [];
  const starCount = state.reduced ? 52 : 130;
  for (let index = 0; index < starCount; index += 1) {
    starPositions.push(
      (hash01(index + 1) - .5) * 16,
      (hash01(index + 2) - .18) * 10,
      -2 - hash01(index + 3) * 10,
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  intro.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0x8bb5d6,
    size: .035,
    transparent: true,
    opacity: .66,
    depthWrite: false,
  }));
  introScene.add(intro.stars);

  intro.arch = createArrivalArch();
  introScene.add(intro.arch);

  const stoneGroup = new THREE.Group();
  for (let index = 0; index < 28; index += 1) {
    const scale = .18 + hash01(index + 4) * .21;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(scale, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x292f30).lerp(new THREE.Color(0x6d6559), hash01(index + 8)),
        emissive: 0x0b3d72,
        emissiveIntensity: .38,
        metalness: .04,
        roughness: .82,
      }),
    );
    const start = new THREE.Vector3(
      ((index % 7) - 3) * .41 + (hash01(index + 12) - .5) * .36,
      -.68 + Math.floor(index / 7) * .33 + hash01(index + 17) * .16,
      -.05 + (hash01(index + 23) - .5) * .78,
    );
    const scatter = new THREE.Vector3(
      start.x * 1.7 + (hash01(index + 28) - .5) * 2.1,
      start.y * .7 + (hash01(index + 31) - .5) * 2.1 + .8,
      (hash01(index + 37) - .5) * 1.5,
    );
    const angle = (index / 28) * Math.PI * 2;
    const radius = 1.8 + (index % 3) * .11;
    const target = new THREE.Vector3(
      Math.cos(angle) * radius,
      1.12 + Math.sin(angle) * radius * 1.22,
      (hash01(index + 41) - .5) * .24,
    );
    stone.position.copy(start);
    stone.rotation.set(hash01(index + 46) * 3, hash01(index + 51) * 3, hash01(index + 56) * 3);
    stone.userData = {
      baseRotation: stone.rotation.clone(),
      floatOffset: hash01(index + 61) * Math.PI * 2,
      scatter,
      spin: .45 + hash01(index + 66) * .8,
      start,
      target,
    };
    intro.stones.push(stone);
    stoneGroup.add(stone);
  }
  stoneGroup.position.y = .08;
  introScene.add(stoneGroup);

  intro.portal = new THREE.Group();
  const portalSurface = new THREE.Mesh(
    new THREE.CircleGeometry(2.12, 96),
    new THREE.MeshBasicMaterial({
      color: 0xa6b9ff,
      map: makePortalTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  portalSurface.scale.y = 1.27;
  intro.portalMaterial = portalSurface.material;
  intro.portal.add(portalSurface);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, .042, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0xc0d8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rim.scale.y = 1.27;
  intro.portalRimMaterial = rim.material;
  intro.portal.add(rim);

  intro.portalAura = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0x798dff,
    map: makeGlowTexture("#8298ff", .74),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  intro.portalAura.scale.set(6.8, 7.8, 1);
  intro.portalAura.position.z = -.16;
  intro.portal.add(intro.portalAura);
  intro.portal.position.set(0, 1.2, -.26);
  intro.portal.scale.setScalar(.72);
  introScene.add(intro.portal);
  intro.portalLight = new THREE.PointLight(0x7a96ff, 0, 11, 2);
  intro.portalLight.position.set(0, 1.15, 1.6);
  introScene.add(intro.portalLight);
}

function createFrontScene() {
  frontScene = new THREE.Scene();
  frontScene.background = new THREE.Color(0x061013);
  frontScene.fog = new THREE.FogExp2(0x061013, .048);
  frontCamera = new THREE.PerspectiveCamera(39, 1, .1, 100);
  const frontHome = frontCameraHome();
  frontCamera.position.set(frontHome.x, frontHome.y, frontHome.z);
  frontCamera.lookAt(0, 0, 0);

  frontScene.add(new THREE.HemisphereLight(0xb7e0e2, 0x031618, 1.7));
  const key = new THREE.DirectionalLight(0xbceef0, 2.2);
  key.position.set(6, 9, 4);
  frontScene.add(key);
  const rim = new THREE.DirectionalLight(0x5eb5a8, 1.15);
  rim.position.set(-5, 3, -6);
  frontScene.add(rim);

  const underlay = new THREE.Mesh(
    new THREE.CircleGeometry(12, 96),
    new THREE.MeshBasicMaterial({ color: 0x071819, transparent: true, opacity: .82 }),
  );
  underlay.rotation.x = -Math.PI / 2;
  underlay.position.y = -.84;
  frontScene.add(underlay);

  const islandOutline = [
    [-2.62, -1.32], [-1.72, -2.44], [-.26, -2.82], [1.88, -2.36],
    [2.88, -.98], [2.64, .94], [1.36, 2.55], [-.56, 2.74], [-2.26, 1.7], [-3.04, .18],
  ];
  const island = createIslandShape(islandOutline, .8, 0x194137, -.79, .76);
  frontScene.add(island);
  const topLayer = createIslandShape(islandOutline.map(([x, z]) => [x * .82, z * .82]), .12, 0x35614b, .025, .57);
  frontScene.add(topLayer);
  const islandEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(island.geometry, 18),
    new THREE.LineBasicMaterial({ color: 0x8cceb7, transparent: true, opacity: .22 }),
  );
  islandEdges.position.copy(island.position);
  frontScene.add(islandEdges);

  const embeddedShape = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x8bb493,
      clearcoat: .48,
      clearcoatRoughness: .21,
      emissive: 0x143d36,
      emissiveIntensity: .42,
      metalness: .17,
      roughness: .29,
    }),
  );
  embeddedShape.position.y = .14;
  embeddedShape.rotation.set(.14, .48, -.12);
  embeddedShape.scale.set(1.18, .38, .95);
  frontScene.add(embeddedShape);

  const waterGeometry = new THREE.RingGeometry(3.16, 5.5, 128, 1);
  waterGeometry.rotateX(-Math.PI / 2);
  waterMaterial.current = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(uv.x * 27.0 + uTime * 0.82) * .035;
        p.z += cos(uv.y * 21.0 - uTime * 0.61) * .021;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float swell = sin((vUv.x + vUv.y) * 22.0 + uTime * .6) * .5 + .5;
        float ripple = sin(vUv.x * 52.0 - uTime * 1.4) * .5 + .5;
        vec3 deep = vec3(.018, .16, .19);
        vec3 crest = vec3(.12, .54, .52);
        vec3 color = mix(deep, crest, .23 + swell * .22 + ripple * .13);
        gl_FragColor = vec4(color, .88);
      }
    `,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial.current);
  water.position.y = -.025;
  frontScene.add(water);
  frontScene.add(createLoop(3.18, 0xa8ffe9, .4));
  frontScene.add(createLoop(5.5, 0x70cabe, .24));

  const sourceGroup = new THREE.Group();
  SOURCES.forEach((source, index) => {
    const root = new THREE.Group();
    root.position.set(source.position[0], .06, source.position[1]);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(.31, 40),
      new THREE.MeshBasicMaterial({ color: source.color, transparent: true, opacity: .96 }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.userData.sourceId = source.id;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      color: source.color,
      map: makeGlowTexture(source.color),
      transparent: true,
      opacity: .78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.position.y = .075;
    glow.scale.set(1.38, 1.38, 1);
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0xe5fff8,
      map: makeGlowTexture("#e5fff8", .45),
      transparent: true,
      opacity: .74,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    spark.position.set(0, .24, 0);
    spark.scale.set(.38, .38, 1);
    const plume = new THREE.Sprite(new THREE.SpriteMaterial({
      color: source.color,
      map: makeGlowTexture(source.color, .82),
      transparent: true,
      opacity: .02,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    plume.position.set(0, .92, 0);
    plume.scale.set(.42, 2.45, 1);
    root.add(plume, glow, pool, spark);
    root.userData = { index, sourceId: source.id };
    sourceGroup.add(root);
    poolRecords.push({ glow, plume, pool, root, spark, source });
    interactivePools.push(pool);
  });
  frontScene.add(sourceGroup);
}

function setupRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.reduced ? 1 : 1.5));
    renderer.setClearColor(0x030708, 1);
    shell.dataset.renderer = "ready";
    return true;
  } catch (error) {
    shell.dataset.renderer = "failed";
    sceneStatus.textContent = "WebGL could not start in this browser.";
    return false;
  }
}

function resize() {
  if (!renderer) return;
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.reduced ? 1 : 1.5));
  renderer.setSize(width, height, false);
  introCamera.aspect = width / height;
  introCamera.updateProjectionMatrix();
  frontCamera.aspect = width / height;
  frontCamera.position.z = frontCameraHome().z;
  frontCamera.updateProjectionMatrix();
}

function resetIntro() {
  state.introPhase = "dormant";
  state.openingStartedAt = 0;
  shell.dataset.introPhase = "dormant";
  intro.portal.scale.setScalar(.72);
  intro.portal.rotation.set(0, 0, 0);
  intro.portalMaterial.opacity = 0;
  intro.portalRimMaterial.opacity = 0;
  intro.portalAura.material.opacity = 0;
  if (intro.portalLight) intro.portalLight.intensity = 0;
  intro.stones.forEach((stone) => {
    stone.position.copy(stone.userData.start);
    stone.rotation.copy(stone.userData.baseRotation);
    stone.scale.setScalar(1);
    stone.material.emissiveIntensity = .38;
  });
  enterForest.hidden = true;
}

function openPortal() {
  if (state.scene !== "intro" || state.introPhase !== "dormant") return;
  state.introPhase = "opening";
  state.openingStartedAt = clock.getElapsedTime();
  shell.dataset.introPhase = "opening";
  sceneStatus.textContent = "The stones are rearranging into a portal.";
  if (state.reduced) updateIntro(state.openingStartedAt + 2);
}

function enterFrontDoor() {
  if (state.scene !== "intro" || state.introPhase !== "open") return;
  state.scene = "transition";
  shell.dataset.scene = "transition";
  sceneStatus.textContent = "Entering the SD Forest project sources.";
  const finish = () => {
    state.scene = "frontdoor";
    shell.dataset.scene = "frontdoor";
    frontPanel.hidden = false;
    projectSources.hidden = false;
    sceneStatus.textContent = "Project-source landscape ready. Hover a pool to explore it.";
  };
  window.clearTimeout(state.transitionTimer);
  state.transitionTimer = window.setTimeout(finish, state.reduced ? 0 : 640);
}

function restartArrival() {
  window.clearTimeout(state.transitionTimer);
  state.scene = "intro";
  state.selectedSourceId = null;
  shell.dataset.scene = "intro";
  frontPanel.hidden = true;
  projectSources.hidden = true;
  poolDetail.hidden = true;
  document.querySelectorAll(".source-link").forEach((link) => { link.dataset.active = "false"; });
  resetIntro();
  sceneStatus.textContent = "Arrival scene reset.";
}

function selectSource(sourceId, announce = true) {
  const source = sourceById.get(sourceId);
  if (!source || state.scene !== "frontdoor") return;
  state.selectedSourceId = sourceId;
  poolTitle.textContent = source.label;
  poolDescription.textContent = source.description;
  openSource.href = source.href;
  poolDetail.hidden = false;
  document.querySelectorAll(".source-link").forEach((link) => {
    link.dataset.active = `${link.dataset.sourceId === sourceId}`;
  });
  if (announce) sceneStatus.textContent = `${source.label} source selected.`;
}

function updateIntro(elapsed) {
  const phase = state.introPhase;
  const openingProgress = phase === "dormant"
    ? 0
    : state.reduced
      ? 1
      : Math.min(1, (elapsed - state.openingStartedAt) / 1.45);

  intro.stones.forEach((stone, index) => {
    const data = stone.userData;
    if (phase === "dormant") {
      stone.position.copy(data.start);
      stone.position.y += Math.sin(elapsed * .9 + data.floatOffset) * .035;
      stone.rotation.x = data.baseRotation.x + elapsed * .08 * data.spin;
      stone.rotation.y = data.baseRotation.y + elapsed * .11 * data.spin;
      return;
    }
    if (openingProgress < .43) {
      stone.position.copy(data.start).lerp(data.scatter, easeOutCubic(openingProgress / .43));
    } else {
      stone.position.copy(data.scatter).lerp(data.target, smoothstep(.43, 1, openingProgress));
    }
    stone.rotation.x = data.baseRotation.x + openingProgress * (3.8 + index * .08) * data.spin;
    stone.rotation.y = data.baseRotation.y + openingProgress * (5.5 + index * .05) * data.spin;
    stone.scale.setScalar(1 + Math.sin(openingProgress * Math.PI) * .18);
    stone.material.emissiveIntensity = .38 + openingProgress * .8;
  });

  const portalAmount = smoothstep(.47, .92, openingProgress);
  intro.portal.scale.setScalar(.72 + portalAmount * .31);
  intro.portal.rotation.z = elapsed * .05;
  intro.portalMaterial.opacity = portalAmount * .88;
  intro.portalRimMaterial.opacity = portalAmount * .95;
  intro.portalAura.material.opacity = portalAmount * .58;
  if (intro.portalLight) intro.portalLight.intensity = portalAmount * 9;
  if (intro.stars && !state.reduced) intro.stars.rotation.y = elapsed * .011;
  if (phase === "opening" && openingProgress >= 1) {
    state.introPhase = "open";
    shell.dataset.introPhase = "open";
    enterForest.hidden = false;
    sceneStatus.textContent = "Portal open. Step into the forest.";
  }
  if (!state.reduced) {
    introCamera.position.x += (pointer.x * .32 - introCamera.position.x) * .03;
    introCamera.position.y += (1.25 + pointer.y * .18 - introCamera.position.y) * .03;
    introCamera.lookAt(0, 1.1, 0);
  }
}

function updateFront(elapsed) {
  if (waterMaterial.current) waterMaterial.current.uniforms.uTime.value = state.reduced ? 0 : elapsed;
  const selected = state.selectedSourceId;
  poolRecords.forEach(({ glow, plume, pool, root, spark, source }, index) => {
    const active = source.id === selected;
    const pulse = state.reduced ? 0 : Math.sin(elapsed * 1.45 + index * 1.2) * .055;
    const scale = active ? 1.48 : 1 + pulse;
    root.scale.lerp(new THREE.Vector3(scale, scale, scale), .12);
    glow.material.opacity = active ? .98 : .7 + pulse;
    pool.material.opacity = active ? 1 : .86;
    spark.position.y = active ? .34 : .22 + pulse;
    plume.material.opacity = active ? .76 : .02;
    plume.scale.y = active ? 3.2 + pulse * 4 : 2.25;
  });
  if (!state.reduced) {
    const home = frontCameraHome();
    const targetX = home.x + pointer.x * .48;
    const targetY = home.y + pointer.y * .24;
    frontCamera.position.x += (targetX - frontCamera.position.x) * .025;
    frontCamera.position.y += (targetY - frontCamera.position.y) * .025;
  }
  frontCamera.lookAt(0, 0, 0);
}

function render() {
  if (!renderer) return;
  const elapsed = clock.getElapsedTime();
  if (state.scene === "frontdoor") {
    updateFront(elapsed);
    renderer.render(frontScene, frontCamera);
  } else {
    updateIntro(elapsed);
    renderer.render(introScene, introCamera);
  }
  window.requestAnimationFrame(render);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  if (state.scene !== "frontdoor") return;
  raycaster.setFromCamera(pointer, frontCamera);
  const hit = raycaster.intersectObjects(interactivePools, false)[0];
  if (hit?.object?.userData?.sourceId) selectSource(hit.object.userData.sourceId, false);
}

function selectFromCanvas() {
  if (state.scene !== "frontdoor") return;
  raycaster.setFromCamera(pointer, frontCamera);
  const hit = raycaster.intersectObjects(interactivePools, false)[0];
  if (hit?.object?.userData?.sourceId) selectSource(hit.object.userData.sourceId, true);
}

if (setupRenderer()) {
  createIntroScene();
  createFrontScene();
  resize();
  resetIntro();
  window.__sdForest = {
    snapshot: () => ({
      introPhase: state.introPhase,
      reducedMotion: state.reduced,
      renderer: "webgl",
      scene: state.scene,
      selectedSourceId: state.selectedSourceId,
      sourceCount: poolRecords.length,
    }),
  };
  window.requestAnimationFrame(render);
}

introActivator.addEventListener("pointerenter", openPortal);
introActivator.addEventListener("focus", openPortal);
introActivator.addEventListener("click", openPortal);
enterForest.addEventListener("click", enterFrontDoor);
restartIntro.addEventListener("click", restartArrival);
canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("click", selectFromCanvas);
window.addEventListener("resize", resize);
reducedMotion.addEventListener("change", (event) => {
  state.reduced = event.matches;
  resize();
});
document.querySelectorAll(".source-link").forEach((link) => {
  const select = () => selectSource(link.dataset.sourceId, false);
  link.addEventListener("pointerenter", select);
  link.addEventListener("focus", select);
});
