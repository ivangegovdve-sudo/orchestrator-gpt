let THREE = null;

const projects = [
  {
    row: "00",
    title: "Chloé / fleet app",
    short: "Chloé",
    type: "Orchestration · internal boundary",
    origin: "Internal / unlisted",
    state: "Boundary",
    href: "",
    description: "The internal orchestration layer is named so the forest tells the truth without guessing a private route."
  },
  {
    row: "01",
    title: "openDashboard",
    short: "openDashboard",
    type: "AI tools · measured model catalogue",
    origin: "SDForest / live canonical",
    state: "Live",
    href: "https://opendashboard.sdforest.site/",
    description: "A public view into model capabilities, costs, and the evidence behind a choice."
  },
  {
    row: "02",
    title: "MoneyWolf",
    short: "MoneyWolf",
    type: "Finance · read-only paper desk",
    origin: "External / paper only",
    state: "Live",
    href: "https://moneywolf.sdforest.site/",
    description: "A cautious paper-trading surface for thinking in constraints before taking action."
  },
  {
    row: "03",
    title: "Repo Shelf",
    short: "Repo Shelf",
    type: "Repositories · published browser",
    origin: "External / live snapshot",
    state: "Live",
    href: "https://ivangegovdve-sudo.github.io/repo-shelf/",
    description: "A readable shelf for the code worlds that make the forest grow."
  },
  {
    row: "04",
    title: "Unified Reader",
    short: "Unified Reader",
    type: "Reading · dyslexia-friendly companion",
    origin: "External / reader + audiobook",
    state: "Live",
    href: "https://chloe.blumenkraft.cloud/dyslexia/",
    companion: "https://chloe.blumenkraft.cloud/audiobook/",
    description: "A gentler reading path, with a measured audiobook companion for listening instead."
  },
  {
    row: "05",
    title: "Alternate Self",
    short: "Alternate Self",
    type: "Conversation · live experiment",
    origin: "External / experiment",
    state: "Live",
    href: "https://alternate-self-sdforest.onhercules.app/",
    description: "A small experiment in meeting a version of the self through conversation."
  },
  {
    row: "06",
    title: "Council",
    short: "Council",
    type: "Model panels · public tool",
    origin: "SDForest / live route",
    state: "Live",
    href: "https://sdforest.site/web/council/",
    description: "A stateless public panel for seeing different model perspectives in one room."
  },
  {
    row: "07",
    title: "gymScholar",
    short: "gymScholar",
    type: "Training · evidence-based practice",
    origin: "External / live companion",
    state: "Live",
    href: "https://gymscholar.lovable.app/",
    description: "A training companion that turns evidence into a more deliberate practice."
  },
  {
    row: "08",
    title: "Math Mania",
    short: "Math Mania",
    type: "Learning · playful multiplication",
    origin: "External / live companion",
    state: "Live",
    href: "https://forest-math-plus.lovable.app/",
    description: "A bright little learning world for building fluency through play."
  },
  {
    row: "09",
    title: "The Drop",
    short: "The Drop",
    type: "Publication · daily AI signal",
    origin: "External / live publication",
    state: "Live",
    href: "https://thedrop.sdforest.site/",
    description: "A daily signal from the edge of the AI landscape, made small enough to keep."
  },
  {
    row: "10",
    title: "A Chair or a Ladder?",
    short: "A Chair or a Ladder?",
    type: "Writing · authored essay",
    origin: "SDForest / live route",
    state: "Live",
    href: "https://sdforest.site/web/chair-or-ladder/",
    description: "An essay about what tools are for, and whether we climb or sit with them."
  },
  {
    row: "11",
    title: "We Are the Training Data",
    short: "We Are the Training Data",
    type: "Spoken word · public piece",
    origin: "SDForest / live route",
    state: "Live",
    href: "https://sdforest.site/web/we-are-the-training-data/",
    description: "A spoken piece about the people inside the systems that learn from us."
  }
];

const root = document.documentElement;
const body = document.body;
const entry = document.querySelector("#entry");
const canvas = document.querySelector("#forest-canvas");
const entryVeil = document.querySelector("#entry-veil");
const enterButton = document.querySelector("#enter-forest");
const portalPreview = document.querySelector("#portal-preview");
const portalPreviewTitle = document.querySelector("#portal-preview-title");
const portalPreviewMeta = document.querySelector("#portal-preview-meta");
const portalPreviewCopy = document.querySelector("#portal-preview-copy");
const portalPreviewLink = document.querySelector("#portal-preview-link");
const sceneStatus = document.querySelector("#scene-status");
const engineLabel = document.querySelector("#engine-label");
const markerList = document.querySelector("#marker-list");
const focusButtons = [...document.querySelectorAll("[data-focus-index]")];
const quietToggle = document.querySelector("#quiet-toggle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  T: null,
  renderer: null,
  scene: null,
  camera: null,
  terrain: null,
  markerGeometry: null,
  markerBasePositions: [],
  markerPoints: null,
  markerSprites: [],
  markerMeshes: [],
  markerButtons: [],
  portal: null,
  portalDisc: null,
  portalRing: null,
  portalLight: null,
  portalMaterial: null,
  portalMaterials: [],
  portalNodeProgress: null,
  portalNodeColor: null,
  tsl: null,
  webgpu: false,
  fogParticles: null,
  mistPlanes: [],
  lights: [],
  selectedIndex: 0,
  hoveredIndex: -1,
  portalTarget: 0,
  portalScale: 0,
  entryProgress: reduceMotion.matches ? 1 : 0,
  worldProgress: 0,
  yaw: 0,
  pitch: 0,
  drag: null,
  clockStartedAt: performance.now(),
  clock: { getElapsedTime: () => (performance.now() - state.clockStartedAt) / 1000 },
  lastTime: 0,
  entered: reduceMotion.matches,
  started: false,
  reduced: reduceMotion.matches,
  assetFailures: []
};

const asset = (name) => new URL(`./assets/${name}`, import.meta.url).href;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function terrainHeight(x, z) {
  const broad = Math.sin(x * 0.16 + z * 0.05) * 0.34;
  const fold = Math.sin(z * 0.29 - x * 0.12) * 0.22;
  const cross = Math.cos((x + z) * 0.22) * 0.16;
  const radialX = x * 0.92;
  const radialZ = (z + 17) * 0.58;
  const radius = Math.hypot(radialX, radialZ);
  const angle = Math.atan2(radialZ, radialX);
  const contour = (Math.sin(radius * 0.68 + angle * 1.55 + Math.sin(angle * 3.0) * 0.22) * 0.92 + Math.sin(radius * 1.45) * 0.22) * Math.exp(-radius / 27);
  const innerRidge = Math.exp(-((radius - 5.6) ** 2) / 2.8) * 1.16;
  const outerRidge = Math.exp(-((radius - 12.6) ** 2) / 7.8) * 1.4;
  const hollow = Math.exp(-(((x + 1.5) ** 2) / 80 + ((z + 8) ** 2) / 42)) * -0.78;
  const ridge = Math.exp(-(((x - 7) ** 2) / 32 + ((z + 14) ** 2) / 35)) * 0.7;
  const nearRidge = Math.exp(-(((x + 11) ** 2) / 44 + ((z + 22) ** 2) / 30)) * 0.52;
  const clearing = Math.exp(-(((x - 2.4) ** 2) / 20 + ((z + 8.2) ** 2) / 16)) * -0.34;
  const relief = broad + fold + cross + contour + innerRidge + outerRidge + hollow + ridge + nearRidge + clearing - 0.5;
  // Sink the far perimeter into the same fog volume as the sky. This is a
  // geometric blend, not a screen-covering patch: there is no exposed quad
  // boundary for the handoff to cut against.
  const edge = clamp((Math.max(Math.abs(x), Math.abs(z)) - 38) / 18, 0, 1);
  return relief - edge * edge * 22;
}

function configureTexture(texture, repeatX, repeatY, colorSpace) {
  texture.wrapS = state.T.RepeatWrapping;
  texture.wrapT = state.T.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, state.renderer?.capabilities?.getMaxAnisotropy?.() || 4);
  if (colorSpace) texture.colorSpace = colorSpace;
  return texture;
}

function loadTexture(name, options = {}) {
  const loader = new state.T.TextureLoader();
  const texture = loader.load(
    asset(name),
    undefined,
    undefined,
    () => state.assetFailures.push(name)
  );
  return configureTexture(texture, options.repeatX ?? 1, options.repeatY ?? 1, options.colorSpace);
}

function buildTerrain() {
  const T = state.T;
  const segments = state.reduced ? 86 : 150;
  // Keep the authored relief well beyond the camera frustum. The previous
  // 58-unit patch exposed a straight soil silhouette against the sky during
  // the entry handoff; extending the same terrain lets exponential fog own
  // that transition instead of presenting a finite cut edge.
  const size = 128;
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
    for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
      const x = (xIndex / segments - 0.5) * size;
      const z = (zIndex / segments - 0.5) * size;
      vertices.push(x, terrainHeight(x, z), z);
      uvs.push(xIndex / segments * 9, zIndex / segments * 9);
    }
  }

  for (let zIndex = 0; zIndex < segments; zIndex += 1) {
    for (let xIndex = 0; xIndex < segments; xIndex += 1) {
      const a = zIndex * (segments + 1) + xIndex;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const diffuse = loadTexture("forrest_ground_01_diff_2k.jpg", {
    repeatX: 12,
    repeatY: 12,
    colorSpace: T.SRGBColorSpace
  });
  const normal = loadTexture("forrest_ground_01_nor_gl_2k.jpg", { repeatX: 12, repeatY: 12 });
  const roughness = loadTexture("forrest_ground_01_rough_2k.jpg", { repeatX: 12, repeatY: 12 });
  const displacement = loadTexture("forrest_ground_01_disp_2k.jpg", { repeatX: 12, repeatY: 12 });
  const material = new T.MeshStandardMaterial({
    map: diffuse,
    normalMap: normal,
    roughnessMap: roughness,
    displacementMap: displacement,
    displacementScale: 0.08,
    displacementBias: -0.04,
    roughness: 0.88,
    metalness: 0.02,
      color: new T.Color(0.34, 0.52, 0.57),
      emissive: new T.Color(0.018, 0.065, 0.078),
      emissiveIntensity: 1.35
  });
  material.normalScale = new T.Vector2(1.2, 1.2);
  const mesh = new T.Mesh(geometry, material);
  mesh.name = "PolyHavenForrestGround01Terrain";
  mesh.receiveShadow = true;
  state.scene.add(mesh);
  state.terrain = mesh;

  const contourGroup = new T.Group();
  contourGroup.name = "RimLitTerrainContours";
  const contourRadii = [4.5, 7.5, 10.5, 14.5, 19, 24, 30, 37];
  contourRadii.forEach((radius, ringIndex) => {
    const points = [];
    const steps = 180;
    for (let index = 0; index <= steps; index += 1) {
      const angle = index / steps * Math.PI * 2;
      const x = Math.cos(angle) * radius / 0.92;
      const z = Math.sin(angle) * radius / 0.58 - 17;
      points.push(new T.Vector3(x, terrainHeight(x, z) + 0.08 + ringIndex * 0.012, z));
    }
    const contourGeometry = new T.BufferGeometry().setFromPoints(points);
    const contourMaterial = new T.LineBasicMaterial({
      color: ringIndex < 3 ? 0x9be7d1 : 0x4faeab,
      transparent: true,
      opacity: ringIndex < 3 ? 0.34 : 0.16,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: true,
      toneMapped: false
    });
    const contourLine = new T.Line(contourGeometry, contourMaterial);
    contourLine.name = `RimLitRidge${ringIndex + 1}`;
    contourGroup.add(contourLine);
  });
  state.scene.add(contourGroup);
}

function componentArray(buffer, accessor, bufferViews) {
  const view = bufferViews[accessor.bufferView];
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const constructors = {
    5121: Uint8Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
  };
  const Ctor = constructors[accessor.componentType];
  const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  if (!Ctor || !components) throw new Error("Unsupported GLTF accessor");
  return new Ctor(buffer, offset, accessor.count * components);
}

async function loadRock() {
  const T = state.T;
  try {
    const descriptor = await fetch(asset("rock_09_2k.gltf")).then((response) => {
      if (!response.ok) throw new Error("rock descriptor unavailable");
      return response.json();
    });
    const binary = await fetch(asset("rock_09.bin")).then((response) => {
      if (!response.ok) throw new Error("rock binary unavailable");
      return response.arrayBuffer();
    });
    const meshData = descriptor.meshes[0].primitives[0];
    const geometry = new T.BufferGeometry();
    const attributes = meshData.attributes;
    for (const [name, accessorIndex] of Object.entries(attributes)) {
      const accessor = descriptor.accessors[accessorIndex];
      const array = componentArray(binary, accessor, descriptor.bufferViews);
      const attributeName = name === "POSITION" ? "position" : name === "NORMAL" ? "normal" : name === "TEXCOORD_0" ? "uv" : null;
      if (attributeName) {
        const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
        geometry.setAttribute(attributeName, new T.BufferAttribute(array, size, accessor.normalized === true));
      }
    }
    const indexAccessor = descriptor.accessors[meshData.indices];
    geometry.setIndex(new T.BufferAttribute(componentArray(binary, indexAccessor, descriptor.bufferViews), 1));
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new T.MeshStandardMaterial({
      map: loadTexture("rock_09_diff_2k.jpg", { colorSpace: T.SRGBColorSpace }),
      normalMap: loadTexture("rock_09_nor_gl_2k.jpg"),
      roughnessMap: loadTexture("rock_09_rough_2k.jpg"),
      roughness: 0.94,
      metalness: 0.01,
      color: new T.Color(0.48, 0.52, 0.46)
    });
    material.normalScale = new T.Vector2(1.1, 1.1);
    const rockSource = new T.Mesh(geometry, material);
    rockSource.name = "PolyHavenRock09Source";
    rockSource.scale.setScalar(32);
    rockSource.updateMatrixWorld(true);
    const placements = [
      [-7.4, -5.5, 0.84, 0.17],
      [6.8, -6.9, 0.62, -0.31],
      [-11.5, -13.8, 1.1, 0.48],
      [10.8, -15.8, 0.92, -0.5],
      [1.6, -22.3, 0.72, 0.2]
    ];
    for (const [x, z, scale, rotation] of placements) {
      const rock = rockSource.clone();
      rock.name = "PolyHavenRock09Instance";
      rock.position.set(x, terrainHeight(x, z) + 0.02, z);
      rock.scale.multiplyScalar(scale);
      rock.rotation.y = rotation;
      rock.castShadow = true;
      state.scene.add(rock);
    }
  } catch {
    state.assetFailures.push("rock_09_2k.gltf");
  }
}

function markerColor(index) {
  const colors = [0x98f4d4, 0xf3c879, 0x80d8ff, 0xe9a6ff, 0x9fe18c, 0xffa98d];
  return new state.T.Color(colors[index % colors.length]);
}

function markerPosition(index) {
  const positions = [
    [2.4, -8.2], [-2.9, -6.4], [7.0, -6.5], [-9.8, -10.5], [10.2, -11.4],
    [-4.4, -13.9], [4.1, -14.8], [-13.4, -18.0], [13.0, -18.3], [-7.0, -21.3],
    [0.4, -23.2], [8.2, -22.0]
  ];
  const [x, z] = positions[index];
  return new state.T.Vector3(x, terrainHeight(x, z) + 0.62, z);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function portalAnchor(index = state.selectedIndex) {
  return state.markerBasePositions[index] || markerPosition(index);
}

function updateMarkerField(elapsed) {
  if (!state.T || !state.markerBasePositions.length) return;
  const T = state.T;
  const gather = state.reduced ? 0 : smoothstep(0.22, 0.82, state.worldProgress);
  const anchor = portalAnchor();
  const positionAttribute = state.markerGeometry?.getAttribute("position");

  projects.forEach((project, index) => {
    const base = state.markerBasePositions[index];
    const current = base.clone();
    if (index !== state.selectedIndex) {
      const angle = index * 2.19 + 0.34;
      const radius = 1.65 + (index % 4) * 0.32;
      current.set(
        anchor.x + Math.cos(angle) * radius,
        anchor.y + 0.18 + Math.sin(angle * 1.7) * 0.14,
        anchor.z + Math.sin(angle) * radius * 0.62
      );
      current.lerp(base, 1 - gather);
    }
    current.y += state.reduced ? 0 : Math.sin(elapsed * 0.72 + index * 1.7) * (0.04 + (1 - gather) * 0.08);
    state.markerMeshes[index]?.position.copy(current);
    state.lights[index]?.position.copy(current);
    state.markerSprites[index]?.position.copy(current);
    if (positionAttribute) {
      positionAttribute.array[index * 3] = current.x;
      positionAttribute.array[index * 3 + 1] = current.y;
      positionAttribute.array[index * 3 + 2] = current.z;
    }
  });
  if (positionAttribute) positionAttribute.needsUpdate = true;
}

function markerVertexShader() {
  return `
    attribute float aSize;
    attribute vec3 aColor;
    uniform float uPixelRatio;
    uniform float uTime;
    varying vec3 vColor;
    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float pulse = 1.0 + 0.12 * sin(uTime * 1.7 + position.x * 0.6);
      gl_PointSize = aSize * uPixelRatio * pulse * (220.0 / max(5.0, -mvPosition.z));
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
}

function markerFragmentShader() {
  return `
    varying vec3 vColor;
    uniform float uTime;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float distanceToCenter = length(p);
      float halo = smoothstep(0.5, 0.02, distanceToCenter);
      float core = smoothstep(0.19, 0.0, distanceToCenter);
      float shimmer = 0.85 + 0.15 * sin(uTime * 2.0 + distanceToCenter * 18.0);
      vec3 color = mix(vColor * 0.55, vec3(1.0), core);
      gl_FragColor = vec4(color * shimmer, halo * 0.82);
    }
  `;
}

function buildMarkers() {
  const T = state.T;
  const positions = [];
  const colors = [];
  const sizes = [];
  const markerGeometry = new T.BufferGeometry();
  state.markerGeometry = markerGeometry;
  state.markerBasePositions = [];
  const pickMaterial = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const markerGroup = new T.Group();
  markerGroup.name = "BioluminescentProjectMarkers";
  state.scene.add(markerGroup);

  projects.forEach((project, index) => {
    const position = markerPosition(index);
    state.markerBasePositions.push(position.clone());
    positions.push(position.x, position.y, position.z);
    const color = markerColor(index);
    colors.push(color.r, color.g, color.b);
    sizes.push(index === 0 ? 2.35 : 1.95);

    const pick = new T.Mesh(new T.SphereGeometry(0.48, 10, 8), pickMaterial);
    pick.position.copy(position);
    pick.userData.markerIndex = index;
    state.markerMeshes.push(pick);
    markerGroup.add(pick);

    const beacon = new T.PointLight(color, index === 0 ? 1.8 : 1.15, 4.8, 2.0);
    beacon.position.copy(position);
    beacon.userData.baseIntensity = beacon.intensity;
    state.lights.push(beacon);
    markerGroup.add(beacon);
  });

  markerGeometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  markerGeometry.setAttribute("aColor", new T.Float32BufferAttribute(colors, 3));
  markerGeometry.setAttribute("aSize", new T.Float32BufferAttribute(sizes, 1));
  if (state.webgpu && state.tsl) {
    const tsl = state.tsl;
    const radialDistance = tsl.length(tsl.uv().sub(tsl.vec2(0.5)));
    projects.forEach((project, index) => {
      const material = new T.SpriteNodeMaterial({
        name: "BioluminescentMarkerNodeMaterial",
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        fog: true
      });
      material.colorNode = tsl.color(markerColor(index));
      material.opacityNode = tsl.smoothstep(tsl.float(0.5), tsl.float(0.04), radialDistance).mul(tsl.float(0.84));
      const sprite = new T.Sprite(material);
      sprite.name = "BioluminescentMarkerSprite";
      sprite.position.copy(markerPosition(index));
      sprite.scale.setScalar(index === 0 ? 1.16 : 0.92);
      markerGroup.add(sprite);
      state.markerSprites.push(sprite);
    });
  } else {
    const markerMaterial = new T.ShaderMaterial({
      name: "BioluminescentMarkerShader",
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: markerVertexShader(),
      fragmentShader: markerFragmentShader(),
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending
    });
    const points = new T.Points(markerGeometry, markerMaterial);
    points.name = "BioluminescentMarkerPoints";
    state.markerPoints = points;
    markerGroup.add(points);
  }

  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.className = "marker-button";
    button.type = "button";
    button.dataset.index = String(index);
    button.innerHTML = `<span class="marker-button__number">${project.row}</span><span>${project.short}</span>`;
    button.addEventListener("click", () => selectMarker(index, true));
    markerList.append(button);
    state.markerButtons.push(button);
  });
}

function fogParticleMaterial() {
  const T = state.T;
  if (state.webgpu && T.PointsNodeMaterial && state.tsl) {
    return new T.PointsNodeMaterial({
      name: "ForestMistNodeMaterial",
      color: 0x75c9bc,
      transparent: true,
      opacity: 0.18,
      size: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: true
    });
  }
  return new T.ShaderMaterial({
    name: "ForestMistParticleShader",
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      uniform float uPixelRatio;
      uniform float uTime;
      void main() {
        vAlpha = aAlpha;
        vec3 p = position;
        p.x += sin(uTime * 0.08 + position.z * 0.17) * 0.45;
        p.z += cos(uTime * 0.07 + position.x * 0.11) * 0.32;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uPixelRatio * (180.0 / max(7.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float soft = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(0.40, 0.82, 0.77, soft * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending
  });
}

function buildAtmosphere() {
  const T = state.T;
  const count = state.reduced ? 260 : 620;
  const positions = [];
  const sizes = [];
  const alphas = [];
  for (let index = 0; index < count; index += 1) {
    const x = (Math.random() - 0.5) * 48;
    const z = -Math.random() * 42 + 6;
    const y = Math.random() * 8 + 0.35;
    positions.push(x, y, z);
    sizes.push(Math.random() * 1.8 + 0.7);
    alphas.push(Math.random() * 0.25 + 0.06);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new T.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new T.Float32BufferAttribute(alphas, 1));
  const particles = new T.Points(geometry, fogParticleMaterial());
  particles.name = "VolumetricForestMotes";
  state.fogParticles = particles;
  state.scene.add(particles);

  const mistCanvas = document.createElement("canvas");
  mistCanvas.width = 8;
  mistCanvas.height = 128;
  const mistContext = mistCanvas.getContext("2d");
  const mistGradient = mistContext.createLinearGradient(0, 0, 0, mistCanvas.height);
  mistGradient.addColorStop(0, "rgba(118, 220, 207, 0)");
  mistGradient.addColorStop(0.28, "rgba(118, 220, 207, 0.06)");
  mistGradient.addColorStop(0.52, "rgba(147, 235, 218, 0.34)");
  mistGradient.addColorStop(0.76, "rgba(72, 157, 158, 0.12)");
  mistGradient.addColorStop(1, "rgba(19, 56, 66, 0)");
  mistContext.fillStyle = mistGradient;
  mistContext.fillRect(0, 0, mistCanvas.width, mistCanvas.height);
  const mistTexture = new T.CanvasTexture(mistCanvas);
  mistTexture.colorSpace = T.SRGBColorSpace;
  const rendererNeutralMist = new T.MeshBasicMaterial({
    map: mistTexture,
    color: 0x9ce9d9,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    depthTest: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    fog: false
  });
  // These textured curtains are renderer-neutral, so WebGPU gets the same
  // readable low fog instead of returning before any atmospheric layer draws.
  for (let index = 0; index < 3; index += 1) {
    const plane = new T.Mesh(new T.PlaneGeometry(58, 10, 1, 1), rendererNeutralMist.clone());
    plane.name = `RendererNeutralMistLayer${index + 1}`;
    plane.position.set(index % 2 === 0 ? -2 : 3, 1.9 + index * 0.72, -9 - index * 8);
    plane.rotation.x = -0.13;
    plane.rotation.y = index % 2 === 0 ? -0.08 : 0.1;
    plane.material.opacity = 0.68 - index * 0.12;
    state.scene.add(plane);
    state.mistPlanes.push(plane);
  }

  if (state.webgpu) return;

  const mistMaterial = new T.ShaderMaterial({
    name: "LowFogLayerShader",
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.14 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uOpacity;
      float wave(vec2 p){return sin(p.x*9.0+uTime*0.08)*0.5+sin(p.y*15.0-uTime*0.05)*0.25;}
      void main(){float edge=smoothstep(0.0,0.26,vUv.y)*smoothstep(1.0,0.62,vUv.y);float n=0.55+0.45*wave(vUv*1.7);gl_FragColor=vec4(0.22,0.50,0.49,uOpacity*edge*n);}
    `,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide
  });
  for (let index = 0; index < 3; index += 1) {
    const plane = new T.Mesh(new T.PlaneGeometry(46, 9, 1, 1), mistMaterial.clone());
    plane.name = `LowFogLayer${index + 1}`;
    plane.position.set(index % 2 === 0 ? -2 : 3, 1.7 + index * 0.65, -7 - index * 8);
    plane.rotation.x = -0.12;
    plane.rotation.y = index % 2 === 0 ? -0.08 : 0.1;
    plane.material.uniforms.uOpacity.value = 0.12 - index * 0.02;
    state.scene.add(plane);
    state.mistPlanes.push(plane);
  }
}

function portalShaders() {
  const vertex = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    uniform float uTime;
    uniform float uProgress;
    void main() {
      vec3 p = position;
      float ripple = sin(p.y * 8.0 + uTime * 1.7) * 0.018 * uProgress;
      p += normal * ripple;
      vec4 worldPosition = modelMatrix * vec4(p, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;
  const fragment = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uProgress;
    void main() {
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(0.0, dot(viewDirection, normalize(vNormal))), 2.5);
      float wave = 0.75 + 0.25 * sin(uTime * 2.1 + vWorldPosition.y * 5.0 + vWorldPosition.x * 3.0);
      vec3 color = mix(uColor * 0.08, vec3(0.92, 1.0, 0.94), fresnel);
      gl_FragColor = vec4(color * wave, (0.22 + fresnel * 0.72) * uProgress);
    }
  `;
  return { vertex, fragment };
}

function buildWebGpuPortalMaterial() {
  const T = state.T;
  const tsl = state.tsl;
  const viewDirection = tsl.normalize(tsl.cameraPosition.sub(tsl.positionWorld));
  const facing = tsl.max(tsl.float(0), tsl.dot(viewDirection, tsl.normalWorld));
  const fresnel = tsl.pow(tsl.float(1).sub(facing), tsl.float(2.5));
  const wave = tsl.float(0.78).add(tsl.sin(tsl.time.mul(2.1).add(tsl.positionWorld.y.mul(5)).add(tsl.positionWorld.x.mul(3))).mul(0.22));
  const color = tsl.mix(state.portalNodeColor.mul(0.08), tsl.color(0xecfff8), fresnel).mul(wave);
  const alpha = fresnel.mul(0.68).add(0.22).mul(state.portalNodeProgress);
  const material = new T.MeshBasicNodeMaterial({
    name: "PortalFresnelNodeMaterial",
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    toneMapped: false
  });
  material.fragmentNode = tsl.vec4(color, alpha);
  state.portalMaterials.push(material);
  return material;
}

function portalArchGeometry() {
  const T = state.T;
  const shape = new T.Shape();
  const radius = 0.86;
  const spring = 0.15;
  shape.moveTo(-radius, -1.08);
  shape.lineTo(-radius, spring);
  for (let index = 1; index <= 24; index += 1) {
    const angle = Math.PI - (index / 24) * Math.PI;
    shape.lineTo(Math.cos(angle) * radius, spring + Math.sin(angle) * radius);
  }
  shape.lineTo(radius, -1.08);
  shape.lineTo(-radius, -1.08);
  return new T.ShapeGeometry(shape, 24);
}

function portalOutlineGeometry(scale = 1) {
  const T = state.T;
  const radius = 0.86 * scale;
  const spring = 0.15 * scale;
  const points = [new T.Vector3(-radius, -1.08 * scale, 0), new T.Vector3(-radius, spring, 0)];
  for (let index = 1; index <= 24; index += 1) {
    const angle = Math.PI - (index / 24) * Math.PI;
    points.push(new T.Vector3(Math.cos(angle) * radius, spring + Math.sin(angle) * radius, 0));
  }
  points.push(new T.Vector3(radius, -1.08 * scale, 0));
  points.push(new T.Vector3(-radius, -1.08 * scale, 0));
  return new T.BufferGeometry().setFromPoints(points);
}

function buildPortal() {
  const T = state.T;
  const color = markerColor(0);
  let material;
  if (state.webgpu && state.tsl) {
    state.portalNodeColor = state.tsl.uniform(color);
    state.portalNodeProgress = state.tsl.uniform(0);
    material = buildWebGpuPortalMaterial();
  } else {
    const shaders = portalShaders();
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uColor: { value: color }
    };
    material = new T.ShaderMaterial({
      name: "PortalFresnelShader",
      uniforms,
      vertexShader: shaders.vertex,
      fragmentShader: shaders.fragment,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide
    });
  }
  const group = new T.Group();
  group.name = "ProjectPortalPreview";
  group.visible = false;
  const disc = new T.Mesh(
    portalArchGeometry(),
    new T.MeshBasicMaterial({
      color: 0x031015,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: T.DoubleSide,
      toneMapped: false
    })
  );
  disc.name = "PortalDarkArchInterior";
  const ring = new T.Mesh(new T.TorusGeometry(1, 0.055, 14, 96), state.webgpu && state.tsl ? buildWebGpuPortalMaterial() : material.clone());
  ring.name = "PortalExpansionRing";
  ring.scale.set(0.86, 1.18, 1);
  ring.rotation.z = 0.02;
  const outline = new T.Line(
    portalOutlineGeometry(),
    new T.LineBasicMaterial({ color, transparent: true, opacity: 0.74, blending: T.AdditiveBlending, toneMapped: false })
  );
  outline.name = "PortalArchOutline";
  const halo = new T.Line(
    portalOutlineGeometry(1.12),
    new T.LineBasicMaterial({ color, transparent: true, opacity: 0.24, blending: T.AdditiveBlending, toneMapped: false })
  );
  halo.name = "PortalHaloOutline";
  const portalLight = new T.PointLight(color, 0, 8.5, 1.6);
  portalLight.name = "PortalLuminousPointLight";
  group.add(disc, ring, outline, halo, portalLight);
  state.scene.add(group);
  state.portal = group;
  state.portalDisc = disc;
  state.portalRing = ring;
  state.portalLight = portalLight;
  state.portalMaterial = material;
}

function setupScene(T, tsl = null) {
  state.T = T;
  state.tsl = tsl;
  state.webgpu = Boolean(tsl);
  state.scene = new T.Scene();
  // Let the scene inherit the layered CSS sky behind the canvas. A solid
  // renderer clear made the finite terrain read as a cut-out silhouette at
  // the horizon; transparency lets the same fog-colored atmosphere carry
  // continuously through the terrain edge on both renderer paths.
  state.scene.background = null;
  state.scene.fog = new T.FogExp2(0x081827, 0.036);
  state.camera = new T.PerspectiveCamera(43, 1, 0.1, 180);
  state.camera.position.set(0, 10.8, 15.5);
  state.camera.lookAt(0, 0.15, -13.5);

  const hemisphere = new T.HemisphereLight(0x8fd3c3, 0x071c2a, 1.18);
  state.scene.add(hemisphere);
  const moon = new T.DirectionalLight(0xb7e5da, 4.1);
  moon.position.set(-9, 16, 7);
  moon.castShadow = true;
  state.scene.add(moon);
  const warm = new T.PointLight(0xf0a264, 4.4, 30, 2.0);
  warm.position.set(-9, 5.5, -5);
  state.scene.add(warm);
  const rim = new T.PointLight(0x63e8cf, 13.5, 38, 2.1);
  rim.position.set(0, 5.8, -10);
  state.scene.add(rim);

  buildTerrain();
  buildMarkers();
  buildAtmosphere();
  buildPortal();
  loadRock();
  updateCamera(0);
}

async function createRenderer() {
  if (navigator.gpu && !state.reduced) {
    try {
      const webgpu = await import(asset("three.webgpu.min.js"));
      if (webgpu.WebGPURenderer) {
        const tsl = await import(asset("three.tsl.min.js"));
        const renderer = new webgpu.WebGPURenderer({ canvas, antialias: true, alpha: true });
        await renderer.init();
        renderer.outputColorSpace = webgpu.SRGBColorSpace;
        renderer.toneMapping = webgpu.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        return { renderer, T: webgpu, tsl, label: "Three.js r180 / WebGPU + TSL" };
      }
    } catch {
      // Some browsers expose navigator.gpu but refuse adapter creation; WebGL is the authored fallback.
    }
  }
  THREE = await import("../../web/vendor/three/three.module.min.js");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x05090f, 0);
  return { renderer, T: THREE, tsl: null, label: "Three.js r180 / WebGL shader path" };
}

function resize() {
  if (!state.renderer || !state.camera) return;
  const width = Math.max(1, canvas.clientWidth || window.innerWidth);
  const height = Math.max(1, canvas.clientHeight || window.innerHeight);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.reduced ? 1.25 : 1.8));
  state.renderer.setSize(width, height, false);
  if (state.markerPoints?.material?.uniforms?.uPixelRatio) {
    state.markerPoints.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.8);
  }
}

function setPortalColor(index) {
  const color = markerColor(index);
  if (state.portalNodeColor?.value?.copy) state.portalNodeColor.value.copy(color);
  state.portal?.traverse((object) => {
    const material = object.material;
    if (material?.uniforms?.uColor) material.uniforms.uColor.value.copy(color);
    if (object !== state.portalDisc && material?.color?.copy) material.color.copy(color);
  });
}

function preventInternalLink(event) {
  event.preventDefault();
}

function renderPortalPreview(project, index) {
  const isInternal = !project.href;
  portalPreview.hidden = false;
  portalPreviewTitle.textContent = project.title;
  portalPreviewMeta.textContent = `${project.row} / ${project.type} / ${project.origin}`;
  portalPreviewCopy.textContent = project.description;
  portalPreviewLink.textContent = isInternal ? "Internal boundary" : "Open live doorway";
  portalPreviewLink.href = project.href || "#about";
  portalPreviewLink.setAttribute("aria-disabled", String(isInternal));
  portalPreviewLink.classList.toggle("is-disabled", isInternal);
  if (isInternal) portalPreviewLink.addEventListener("click", preventInternalLink, { once: true });
  portalPreview.dataset.index = String(index);
}

function selectMarker(index, focusPreview = false) {
  const project = projects[index];
  if (!project) return;
  state.selectedIndex = index;
  state.portalTarget = state.entered || state.reduced ? 1 : 0;
  setPortalColor(index);
  portalPreview.hidden = !(state.entered || state.reduced);
  if (state.entered || state.reduced) renderPortalPreview(project, index);
  state.markerButtons.forEach((button, buttonIndex) => button.classList.toggle("is-selected", buttonIndex === index));
  focusButtons.forEach((button) => button.classList.toggle("is-selected", Number(button.dataset.focusIndex) === index));
  // Selecting a marker changes the portal in place; it must not steal scroll
  // position from the overworld or from the text catalogue.
}

function clearMarkerHover() {
  if (state.hoveredIndex !== -1) {
    state.markerButtons[state.hoveredIndex]?.classList.remove("is-hovered");
    state.hoveredIndex = -1;
  }
  canvas.style.cursor = "grab";
}

function updateMarkerHover(index) {
  if (index === state.hoveredIndex) return;
  clearMarkerHover();
  if (index < 0) return;
  state.hoveredIndex = index;
  state.markerButtons[index]?.classList.add("is-hovered");
  canvas.style.cursor = "pointer";
}

function pointerToNdc(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  };
}

function raycastMarker(event) {
  if (!state.camera || !state.markerMeshes.length) return -1;
  const ndc = pointerToNdc(event);
  const raycaster = new state.T.Raycaster();
  raycaster.setFromCamera(new state.T.Vector2(ndc.x, ndc.y), state.camera);
  const hit = raycaster.intersectObjects(state.markerMeshes, false)[0];
  return hit ? hit.object.userData.markerIndex : -1;
}

function updateCamera(time) {
  if (!state.camera) return;
  const T = state.T;
  const anchor = portalAnchor();
  const flight = state.reduced ? 0 : smoothstep(0, 1, state.worldProgress);
  const start = new T.Vector3(0, 10.8, 15.5);
  const end = new T.Vector3(anchor.x * 0.82, 2.9, anchor.z - 12.4);
  const position = new T.Vector3().lerpVectors(start, end, flight);
  const sway = state.reduced ? 0 : Math.sin(time * 0.00016) * 0.12;
  position.x += Math.sin(state.yaw) * (0.45 + flight * 0.8) + sway;
  position.y += state.pitch * 0.55;
  state.camera.position.lerp(position, state.reduced ? 0.3 : 0.14);
  const lookStart = new T.Vector3(anchor.x * 0.15, 0.1, anchor.z - 7.0);
  const lookEnd = new T.Vector3(anchor.x * 0.95, 1.85, anchor.z - 15.5);
  state.camera.lookAt(new T.Vector3().lerpVectors(lookStart, lookEnd, flight));
}

function updateEntryProgress() {
  if (state.reduced) {
    state.entryProgress = 1;
    entry.style.setProperty("--entry-progress", "1");
    return;
  }
  if (!state.entered) {
    state.entryProgress = 0;
    entry.style.setProperty("--entry-progress", "0");
    return;
  }
  const target = entry.classList.contains("is-entered") ? 1 : 0;
  state.entryProgress += (target - state.entryProgress) * 0.035;
  entry.style.setProperty("--entry-progress", state.entryProgress.toFixed(3));
  if (target === 1 && state.entryProgress > 0.985) {
    entryVeil.classList.add("is-faded");
    entryVeil.setAttribute("aria-hidden", "true");
  }
}

function updateScrollProgress() {
  if (!entry) return;
  const rect = entry.getBoundingClientRect();
  const travel = Math.max(1, rect.height - window.innerHeight);
  state.worldProgress = clamp(-rect.top / travel, 0, 1);
  root.style.setProperty("--world-progress", state.worldProgress.toFixed(3));
  const bar = document.querySelector("#scene-progress-bar");
  if (bar) bar.style.transform = `scaleX(${state.worldProgress})`;
  const phase = document.querySelector("#scene-phase");
  if (phase) phase.textContent = state.worldProgress > 0.72 ? "through / catalogue" : state.worldProgress > 0.2 ? "gathering / portal" : "before the first signal";
}

function animate(time) {
  const delta = Math.min(0.05, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  const elapsed = state.clock.getElapsedTime();
  updateEntryProgress();
  updateCamera(time);
  const reveal = state.reduced ? 1 : clamp(state.entryProgress * 1.2, 0, 1);
  const portalTarget = state.portalTarget * reveal;
  state.portalScale += (portalTarget - state.portalScale) * (state.reduced ? 0.25 : 0.075);
  updateMarkerField(elapsed);
  if (state.portal) {
    state.portal.visible = state.portalScale > 0.015;
    const marker = portalAnchor();
    const visualScale = state.portalScale * (0.68 + state.worldProgress * 0.3);
    state.portal.position.set(marker.x, marker.y + 1.08 * visualScale, marker.z - 0.4);
    state.portal.scale.setScalar(visualScale);
    state.portal.rotation.y += delta * (state.reduced ? 0.02 : 0.13);
    state.portal.rotation.z = Math.sin(elapsed * 0.42) * 0.035;
  }
  if (state.portalLight) state.portalLight.intensity = state.portalScale * (3.8 + state.worldProgress * 9.5);
  if (state.portalMaterial?.uniforms?.uTime) state.portalMaterial.uniforms.uTime.value = elapsed;
  if (state.portalMaterial?.uniforms?.uProgress) state.portalMaterial.uniforms.uProgress.value = state.portalScale;
  if (state.portalNodeProgress?.value !== undefined) state.portalNodeProgress.value = state.portalScale;
  state.portal?.children.forEach((child, index) => {
    if (!child.material?.uniforms) return;
    if (child.material.uniforms.uTime) child.material.uniforms.uTime.value = elapsed * (index === 2 ? 1.12 : 0.78);
    if (child.material.uniforms.uProgress) child.material.uniforms.uProgress.value = state.portalScale;
  });
  if (state.markerPoints?.material?.uniforms?.uTime) state.markerPoints.material.uniforms.uTime.value = elapsed;
  if (state.fogParticles?.material?.uniforms?.uTime) state.fogParticles.material.uniforms.uTime.value = elapsed;
  state.mistPlanes.forEach((plane) => {
    if (plane.material.uniforms?.uTime) plane.material.uniforms.uTime.value = elapsed;
  });
  state.lights.forEach((light, index) => {
    const active = index === state.selectedIndex ? 1.8 : 1;
    light.intensity = light.userData.baseIntensity * active * (0.9 + Math.sin(elapsed * 1.5 + index) * 0.1);
  });
  if (state.renderer && state.scene && state.camera) state.renderer.render(state.scene, state.camera);
  if (state.started && !state.renderer?.setAnimationLoop) requestAnimationFrame(animate);
}

function wireInteractions() {
  enterButton?.addEventListener("click", () => {
    state.entered = true;
    state.entryProgress = 0;
    state.portalTarget = 1;
    entry.classList.add("is-entered");
    enterButton.disabled = true;
    enterButton.textContent = "Entering the forest…";
    window.setTimeout(() => {
      entryVeil.classList.add("is-faded");
      entryVeil.setAttribute("aria-hidden", "true");
    }, state.reduced ? 0 : 760);
    window.setTimeout(() => {
      enterButton.textContent = "The forest is open";
      selectMarker(0);
    }, state.reduced ? 0 : 1120);
  });

  quietToggle?.addEventListener("click", () => {
    const quiet = body.classList.toggle("is-quiet");
    quietToggle.setAttribute("aria-pressed", String(quiet));
    quietToggle.setAttribute("aria-label", quiet ? "Restore the forest field" : "Quiet the forest field");
  });

  focusButtons.forEach((button) => button.addEventListener("click", () => selectMarker(Number(button.dataset.focusIndex), true)));

  canvas.addEventListener("pointermove", (event) => {
    const hit = raycastMarker(event);
    updateMarkerHover(hit);
    if (!state.drag) return;
    const dx = event.clientX - state.drag.x;
    const dy = event.clientY - state.drag.y;
    state.yaw = clamp(state.drag.yaw - dx * 0.003, -0.75, 0.75);
    state.pitch = clamp(state.drag.pitch + dy * 0.008, -1.25, 1.25);
    state.drag.x = event.clientX;
    state.drag.y = event.clientY;
  }, { passive: true });
  canvas.addEventListener("pointerleave", clearMarkerHover, { passive: true });
  canvas.addEventListener("pointerdown", (event) => {
    state.drag = { x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!state.drag) return;
    const movement = Math.hypot(event.clientX - state.drag.x, event.clientY - state.drag.y);
    state.drag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    if (movement < 12) {
      const hit = raycastMarker(event);
      if (hit >= 0) selectMarker(hit, true);
    }
  });
  canvas.addEventListener("wheel", (event) => {
    state.yaw = clamp(state.yaw + event.deltaX * 0.0015, -0.75, 0.75);
  }, { passive: true });
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  reduceMotion.addEventListener?.("change", (event) => {
    state.reduced = event.matches;
    body.dataset.motion = state.reduced ? "reduced" : "full";
  });
  updateScrollProgress();
}

async function boot() {
  body.dataset.motion = state.reduced ? "reduced" : "full";
  if (state.reduced) entry.classList.add("is-entered");
  wireInteractions();
  const result = await createRenderer();
  state.renderer = result.renderer;
  state.renderer.domElement.setAttribute("data-renderer", result.label);
  engineLabel.textContent = result.label;
  sceneStatus.textContent = "Terrain / fog / marker field ready";
  setupScene(result.T, result.tsl);
  resize();
  selectMarker(0);
  state.started = true;
  if (state.renderer.setAnimationLoop) state.renderer.setAnimationLoop(animate);
  else requestAnimationFrame(animate);
}

boot().catch(() => {
  sceneStatus.textContent = "Text-first field guide active";
  engineLabel.textContent = "Canvas unavailable / authored fallback";
  body.dataset.sceneError = "true";
});

export { projects };
