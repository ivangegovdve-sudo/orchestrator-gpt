/*
 * gltf-lite: a deliberately small glTF 2.0 reader for the one mesh SD Forest
 * ships (Poly Haven rock_09). No GLTFLoader exists in the local pack.
 *
 * - Fetches the .gltf, then resolves buffers[].uri and images[].uri RELATIVE
 *   TO THE .gltf URL (no hard-coded file names).
 * - Builds BufferGeometry from accessors/bufferViews (Float32/Uint16/Uint32,
 *   plus the small integer types; byteStride handled; sparse is rejected).
 * - Builds a MeshStandard(Node)Material: baseColor (sRGB), normal map,
 *   metallicRoughness image used as roughnessMap (G channel), metalness =
 *   metallicFactor. glTF UVs => texture.flipY = false.
 * - Bakes node transforms (matrix or TRS) into the geometry.
 *
 * Not supported (throws or ignores, by design): skins, morph targets, sparse
 * accessors, KHR_* extensions, cameras, animations.
 */
import * as THREE from 'three/webgpu';

const ITEM_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const ARRAY_TYPE = {
  5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
  5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array
};
const WRAP = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
const MAG = { 9728: THREE.NearestFilter, 9729: THREE.LinearFilter };
const MIN = {
  9728: THREE.NearestFilter, 9729: THREE.LinearFilter, 9984: THREE.NearestMipmapNearestFilter,
  9985: THREE.LinearMipmapNearestFilter, 9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`glTF fetch failed (${res.status}): ${url}`);
  return res.json();
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`glTF buffer fetch failed (${res.status}): ${url}`);
  return res.arrayBuffer();
}

function readAccessor(json, buffers, index) {
  const acc = json.accessors && json.accessors[index];
  if (!acc) throw new Error(`glTF accessor ${index} missing`);
  if (acc.sparse) throw new Error('glTF sparse accessors are not supported by gltf-lite');
  const Ctor = ARRAY_TYPE[acc.componentType];
  const itemSize = ITEM_SIZE[acc.type];
  if (!Ctor || !itemSize) throw new Error(`glTF accessor ${index}: unsupported type`);
  const count = acc.count;
  if (acc.bufferView === undefined) return { array: new Ctor(count * itemSize), itemSize, normalized: !!acc.normalized };
  const view = json.bufferViews[acc.bufferView];
  const buffer = buffers[view.buffer];
  const byteOffset = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const itemBytes = Ctor.BYTES_PER_ELEMENT * itemSize;
  const stride = view.byteStride || itemBytes;
  let array;
  if (stride === itemBytes && byteOffset % Ctor.BYTES_PER_ELEMENT === 0) {
    array = new Ctor(buffer, byteOffset, count * itemSize);
  } else {
    array = new Ctor(count * itemSize);
    const dst = new Uint8Array(array.buffer);
    const src = new Uint8Array(buffer);
    for (let i = 0; i < count; i += 1) {
      const s = byteOffset + i * stride;
      dst.set(src.subarray(s, s + itemBytes), i * itemBytes);
    }
  }
  return { array, itemSize, normalized: !!acc.normalized };
}

function nodeMatrix(node) {
  const m = new THREE.Matrix4();
  if (node.matrix) { m.fromArray(node.matrix); return m; }
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  return m.compose(new THREE.Vector3(...t), new THREE.Quaternion(...r), new THREE.Vector3(...s));
}

/**
 * @param {string|URL} gltfUrl  absolute or page-relative URL of the .gltf
 * @param {object} [opts]
 * @param {Function} [opts.materialClass]  defaults to MeshStandardNodeMaterial, else MeshStandardMaterial
 * @param {number}   [opts.maxAnisotropy]
 * @param {string[]} [opts.failures]       receives names of images that failed to load
 * @returns {Promise<{parts:Array, geometry:THREE.BufferGeometry, material:THREE.Material, textures:object, boundingBox:THREE.Box3, url:string}>}
 */
export async function loadGLTFLite(gltfUrl, opts = {}) {
  const url = new URL(String(gltfUrl), typeof document !== 'undefined' ? document.baseURI : import.meta.url);
  const json = await fetchJSON(url.href);
  if (!json.asset || !String(json.asset.version).startsWith('2')) throw new Error('Only glTF 2.x is supported');

  const buffers = await Promise.all((json.buffers || []).map((b) => {
    if (b.uri === undefined) throw new Error('GLB-embedded buffers are not supported by gltf-lite');
    return fetchBuffer(new URL(b.uri, url).href);
  }));

  // --- textures (cached per image + colour space) ---
  const loader = new THREE.TextureLoader();
  const texCache = new Map();
  async function getTexture(textureIndex, srgb) {
    const tdef = json.textures && json.textures[textureIndex];
    if (!tdef) return null;
    const key = `${tdef.source}|${tdef.sampler}|${srgb ? 's' : 'l'}`;
    if (texCache.has(key)) return texCache.get(key);
    const image = json.images && json.images[tdef.source];
    const promise = (async () => {
      if (!image || image.uri === undefined) return null;
      try {
        const tex = await loader.loadAsync(new URL(image.uri, url).href);
        const sampler = (json.samplers && json.samplers[tdef.sampler]) || {};
        tex.flipY = false; // glTF UV origin is top-left
        tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.wrapS = WRAP[sampler.wrapS] ?? THREE.RepeatWrapping;
        tex.wrapT = WRAP[sampler.wrapT] ?? THREE.RepeatWrapping;
        tex.magFilter = MAG[sampler.magFilter] ?? THREE.LinearFilter;
        tex.minFilter = MIN[sampler.minFilter] ?? THREE.LinearMipmapLinearFilter;
        tex.anisotropy = Math.max(1, opts.maxAnisotropy || 4);
        tex.needsUpdate = true;
        return tex;
      } catch (err) {
        if (opts.failures) opts.failures.push(String(image.uri));
        return null;
      }
    })();
    texCache.set(key, promise);
    return promise;
  }

  const MaterialClass = opts.materialClass || THREE.MeshStandardNodeMaterial || THREE.MeshStandardMaterial;
  const materialCache = new Map();
  async function getMaterial(index) {
    if (materialCache.has(index)) return materialCache.get(index);
    const def = (json.materials && json.materials[index]) || {};
    const pbr = def.pbrMetallicRoughness || {};
    const params = {
      name: def.name || `material_${index}`,
      color: new THREE.Color().fromArray((pbr.baseColorFactor || [1, 1, 1, 1]).slice(0, 3)),
      roughness: pbr.roughnessFactor ?? 1,
      metalness: pbr.metallicFactor ?? 1,
      side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide
    };
    if (def.emissiveFactor) params.emissive = new THREE.Color().fromArray(def.emissiveFactor);
    const [map, normalMap, mrMap] = await Promise.all([
      pbr.baseColorTexture ? getTexture(pbr.baseColorTexture.index, true) : null,
      def.normalTexture ? getTexture(def.normalTexture.index, false) : null,
      pbr.metallicRoughnessTexture ? getTexture(pbr.metallicRoughnessTexture.index, false) : null
    ]);
    if (map) params.map = map;
    if (normalMap) { params.normalMap = normalMap; }
    if (mrMap) {
      params.roughnessMap = mrMap; // G channel = roughness
      if ((pbr.metallicFactor ?? 1) > 0) params.metalnessMap = mrMap; // B channel = metalness
    }
    const material = new MaterialClass(params);
    if (normalMap && def.normalTexture && def.normalTexture.scale !== undefined) {
      material.normalScale = new THREE.Vector2(def.normalTexture.scale, def.normalTexture.scale);
    }
    const out = { material, textures: { map, normalMap, roughnessMap: mrMap } };
    materialCache.set(index, out);
    return out;
  }

  // --- geometry: walk the default scene, bake node transforms ---
  const parts = [];
  const textures = {};
  const sceneDef = (json.scenes && json.scenes[json.scene || 0]) || { nodes: (json.nodes || []).map((_, i) => i) };

  async function visit(nodeIndex, parentMatrix) {
    const node = json.nodes[nodeIndex];
    const world = parentMatrix.clone().multiply(nodeMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = json.meshes[node.mesh];
      for (const prim of mesh.primitives) {
        if (prim.mode !== undefined && prim.mode !== 4) continue; // triangles only
        const geometry = new THREE.BufferGeometry();
        const map = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', TEXCOORD_1: 'uv1', COLOR_0: 'color' };
        for (const [semantic, accessorIndex] of Object.entries(prim.attributes)) {
          const name = map[semantic];
          if (!name) continue;
          const { array, itemSize, normalized } = readAccessor(json, buffers, accessorIndex);
          geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize, normalized));
        }
        if (prim.indices !== undefined) {
          const { array } = readAccessor(json, buffers, prim.indices);
          geometry.setIndex(new THREE.BufferAttribute(array, 1));
        }
        if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
        if (!world.equals(new THREE.Matrix4())) geometry.applyMatrix4(world);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const mat = await getMaterial(prim.material ?? 0);
        Object.assign(textures, mat.textures);
        parts.push({ name: node.name || mesh.name || 'part', geometry, material: mat.material });
      }
    }
    for (const child of node.children || []) await visit(child, world);
  }
  for (const root of sceneDef.nodes || []) await visit(root, new THREE.Matrix4());

  if (!parts.length) throw new Error('glTF contained no triangle meshes');
  const boundingBox = new THREE.Box3();
  for (const p of parts) boundingBox.union(p.geometry.boundingBox);
  return { parts, geometry: parts[0].geometry, material: parts[0].material, textures, boundingBox, url: url.href };
}
