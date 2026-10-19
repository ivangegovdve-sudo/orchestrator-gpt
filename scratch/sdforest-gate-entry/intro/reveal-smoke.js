/*
 * Self-hosted reveal layer for the gate intro.
 *
 * This is an original, small WebGL2 reconstruction of the visual ingredients
 * documented in PR #763's Onlook study: a rising feedback-like plume, a
 * direction-biased palette, and animated fractal noise. It intentionally does
 * not load Unicorn Studio or the third-party scene from a CDN. The palette is
 * public so the blue treatment can be compared with the original red fallback.
 */

const PALETTES = Object.freeze({
  blue: Object.freeze({ cool: [0.03, 0.16, 1.0], hot: [0.42, 0.90, 1.0] }),
  red: Object.freeze({ cool: [0.66, 0.01, 0.035], hot: [1.0, 0.08, 0.25] })
});

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uReveal;
uniform vec2 uResolution;
uniform vec3 uCool;
uniform vec3 uHot;

in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

mat2 rotate(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

// Eight octaves and a ridged pass keep the veil sharp and visibly detailed.
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  mat2 twist = rotate(0.43);
  for (int i = 0; i < 8; i++) {
    value += amplitude * noise(p);
    p = twist * p * 2.07 + vec2(11.3, -7.1);
    amplitude *= 0.54;
  }
  return value;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  // The live camera offsets the gate slightly right; capture mode centers it.
  // A broad center keeps the reveal legible in both compositions.
  vec2 p = vUv - vec2(0.55, 0.47);
  p.x *= aspect;

  // A tall portal-shaped plume, with a little asymmetric lift on its right side.
  float portal = 1.0 - smoothstep(0.08, 0.98, length(p / vec2(0.42, 0.52)));
  float lift = smoothstep(-0.34, 0.34, p.y) * (0.86 + 0.14 * smoothstep(-0.2, 0.28, p.x));

  vec2 flow = vec2((vUv.x - 0.58) * aspect, vUv.y * 1.38);
  flow = rotate(-0.18) * flow;
  flow += vec2(uTime * 0.016, -uTime * 0.052);

  float coarse = fbm(flow * 3.1);
  float detailed = fbm(flow * 10.7 + vec2(coarse * 2.4, -coarse * 1.7));
  float ridged = 1.0 - abs(detailed * 2.0 - 1.0);
  float grain = noise(flow * 28.0 + vec2(-uTime * 0.09, uTime * 0.07));

  // Thresholding the high-frequency field creates the requested edgy, veiled edge.
  float veil = smoothstep(0.35, 0.64, mix(coarse, ridged, 0.72));
  float filaments = smoothstep(0.36, 0.70, ridged) * (0.62 + 0.38 * grain);
  veil = max(veil * 0.92, filaments * 0.76);
  veil *= portal * lift;
  veil *= smoothstep(0.0, 1.0, uReveal);

  float heat = clamp(0.26 + 0.74 * (ridged + 0.18 * grain), 0.0, 1.0);
  vec3 color = mix(uCool, uHot, smoothstep(0.12, 0.92, heat));
  float alpha = clamp(veil * (0.55 + 0.75 * uReveal), 0.0, 0.92);
  outColor = vec4(color, alpha);
}`;

function clamp01(value) { return Math.min(1, Math.max(0, value)); }
function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function noOp(canvas, palette) {
  return {
    backend: 'unavailable',
    canvas,
    palette,
    progress: 0,
    reveal: 0,
    resize() {},
    start() {},
    stop() {},
    setProgress() {},
    setPalette() { return palette; },
    getState() { return { backend: 'unavailable', palette, progress: 0, reveal: 0 }; },
    dispose() {}
  };
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'unknown shader error';
    gl.deleteShader(shader);
    throw new Error(error);
  }
  return shader;
}

function link(gl, vertex, fragment) {
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || 'unknown program error';
    gl.deleteProgram(program);
    throw new Error(error);
  }
  return program;
}

export const REVEAL_PALETTES = PALETTES;

export function createRevealSmoke(canvas, options = {}) {
  const initialPalette = PALETTES[options.palette] ? options.palette : 'blue';
  if (!canvas) return noOp(canvas, initialPalette);

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  });
  if (!gl) return noOp(canvas, initialPalette);

  let vertex;
  let fragment;
  let program;
  try {
    vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = link(gl, vertex, fragment);
  } catch (error) {
    console.warn('[sdforest reveal] WebGL2 shader unavailable:', error);
    return noOp(canvas, initialPalette);
  } finally {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1, 1, 1
  ]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'aPosition');
  const uniforms = {
    time: gl.getUniformLocation(program, 'uTime'),
    reveal: gl.getUniformLocation(program, 'uReveal'),
    resolution: gl.getUniformLocation(program, 'uResolution'),
    cool: gl.getUniformLocation(program, 'uCool'),
    hot: gl.getUniformLocation(program, 'uHot')
  };

  let palette = initialPalette;
  let progress = 0;
  let reveal = 0;
  let time = 0;
  let width = 1;
  let height = 1;
  let frame = 0;
  let running = false;

  function resize() {
    const cssWidth = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
    const cssHeight = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
    // The veil is intentionally cheaper than the main scene: enough detail to
    // read in the proof, without turning the intro into a second full-resolution pass.
    const scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.62;
    width = Math.max(1, Math.floor(cssWidth * scale));
    height = Math.max(1, Math.floor(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    draw();
  }

  function draw() {
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (reveal <= 0.001) return;
    const colors = PALETTES[palette];
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.reveal, reveal);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform3fv(uniforms.cool, colors.cool);
    gl.uniform3fv(uniforms.hot, colors.hot);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function tick(now) {
    if (!running) return;
    time = now * 0.001;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running || reveal <= 0.001) return;
    running = true;
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function setProgress(value, options = {}) {
    progress = clamp01(Number(value) || 0);
    // The smoky layer arrives with the portal reveal, after the stone gate has settled.
    reveal = smoothstep(0.72, 0.96, progress);
    if (options.time != null) time = Number(options.time) || 0;
    draw();
    if (reveal > 0.001) start(); else stop();
  }

  function setPalette(name) {
    if (!PALETTES[name]) return palette;
    palette = name;
    draw();
    return palette;
  }

  function dispose() {
    stop();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  resize();

  return {
    backend: 'webgl2-smoke',
    canvas,
    get palette() { return palette; },
    get progress() { return progress; },
    get reveal() { return reveal; },
    resize,
    start,
    stop,
    setProgress,
    setPalette,
    getState() { return { backend: 'webgl2-smoke', palette, progress, reveal, width, height }; },
    dispose
  };
}
