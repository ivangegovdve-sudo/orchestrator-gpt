const TAU = Math.PI * 2;

const THEMES = Object.freeze({
  portal: theme('portal', 'Forest canopy', 'rooted-canopy', '#bae098', '#e8b86b', 0.18, 86),
  kids: theme('kids', 'Playful fireflies', 'firefly-playground', '#ffd15a', '#ff8fb4', 0.34, 72),
  math: theme('math', 'Living equations', 'lissajous-grove', '#9bd26f', '#73e9ff', 0.26, 78),
  movie: theme('movie', 'Film-strip constellations', 'cinema-frames', '#ffc765', '#a5b4fc', 0.2, 70),
  library: theme('library', 'Knowledge shelves', 'shelf-lattice', '#60ecc1', '#a5b4fc', 0.16, 84),
  council: theme('council', 'Dialogue chambers', 'deliberation-orbits', '#ac90ff', '#8fe6ae', 0.2, 76),
  power: theme('power', 'Heavy-tail trajectory', 'pareto-comet', '#ffc258', '#f97363', 0.22, 82),
  time: theme('time', 'Time spiral', 'chronology-helix', '#7ee2ff', '#a9b2ff', 0.13, 86),
  mendeleev: theme('mendeleev', 'Periodic lattice', 'periodic-grid', '#7dd3fc', '#fbbf24', 0.12, 78),
  health: theme('health', 'Cycle pulse', 'cycle-helix', '#ff7fb0', '#60ecc1', 0.17, 78),
  muscle: theme('muscle', 'Muscle fibres', 'myofibril-field', '#ff745c', '#ffc258', 0.2, 86),
  calendar: theme('calendar', 'Calendar rings', 'calendar-wheel', '#6cafff', '#8fe6ae', 0.11, 72),
  ink: theme('ink', 'Living ink', 'calligraphic-current', '#eedcb8', '#d98a7f', 0.12, 74),
  poetry: theme('poetry', 'Poetic breath', 'stanza-spiral', '#e084ff', '#eedcb8', 0.14, 70),
  news: theme('news', 'Morning signal', 'broadcast-waves', '#70eade', '#e8b86b', 0.24, 76),
  'open-overview': theme('open-overview', 'Ecosystem graph', 'ecosystem-canopy', '#73e9ff', '#a9b2ff', 0.16, 88),
  'ai-research': theme('ai-research', 'Machine dialogue', 'twin-mind-field', '#a78bfa', '#51ebff', 0.19, 78),
  void: theme('void', 'Replicator drift', 'mitosis-field', '#51ebff', '#9bd26f', 0.27, 80),
  vfx: theme('vfx', 'VFX aperture', 'aperture-rig', '#a282ff', '#73e9ff', 0.23, 84),
  avatar: theme('avatar', 'Avatar rig', 'expression-rig', '#a5b4fc', '#f472b6', 0.2, 72),
  upload: theme('upload', 'Ascending packets', 'ingestion-stream', '#60ecc1', '#73e9ff', 0.24, 72),
});

const ALIASES = Object.freeze({
  open: 'open-overview',
  overview: 'open-overview',
  'math-mania': 'math',
  'math-forest': 'math',
  'kids-movie-library': 'movie',
  'womens-health-os': 'health',
  hypertrophy: 'muscle',
  hypertrophyos: 'muscle',
  manifesto: 'ink',
  replicator: 'void',
  'replicator-void': 'void',
  'avatar-playground': 'avatar',
  tinylm: 'council',
});

function theme(id, label, kind, primary, secondary, speed, pointCount) {
  return Object.freeze({
    id,
    label,
    kind,
    primary,
    secondary,
    speed,
    pointCount,
  });
}

export function resolveForestTheme(requested = 'portal') {
  const normalized = String(requested || 'portal').trim().toLowerCase();
  const id = ALIASES[normalized] || normalized;
  return THEMES[id] || THEMES.portal;
}

export function listForestThemes() {
  return Object.values(THEMES);
}

export function createThemePoints(themeInput, countInput, seedInput = 1) {
  const themeValue = typeof themeInput === 'string' ? resolveForestTheme(themeInput) : themeInput;
  const count = Math.max(8, Math.round(countInput || themeValue.pointCount));
  const random = mulberry32(hashSeed(`${themeValue.id}:${seedInput}`));
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const lanes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0 : index / (count - 1);
    const point = themedPoint(themeValue.id, t, index, count, random);
    const offset = index * 3;
    positions[offset] = point[0];
    positions[offset + 1] = point[1];
    positions[offset + 2] = point[2];
    phases[index] = random() * TAU;
    sizes[index] = 1.2 + random() * 2.8;
    lanes[index] = (index % 7) / 6;
  }

  return { positions, phases, sizes, lanes };
}

function themedPoint(id, t, index, count, random) {
  const noise = (amount) => (random() - 0.5) * amount;
  const angle = t * TAU;

  switch (id) {
    case 'portal': {
      const branch = index % 7;
      const branchT = Math.floor(index / 7) / Math.max(1, Math.ceil(count / 7) - 1);
      const spread = (branch - 3) * 0.42;
      return [
        spread * (0.3 + branchT) + Math.sin(branchT * Math.PI) * noise(0.34),
        -1.7 + branchT * 3.3 + Math.cos(branchT * Math.PI + branch) * 0.16,
        noise(1.4),
      ];
    }
    case 'kids': {
      const cluster = index % 5;
      const cx = Math.cos(cluster * TAU / 5) * 1.2;
      const cy = Math.sin(cluster * TAU / 5) * 0.72;
      return [cx + noise(0.78), cy + noise(0.68), noise(1.6)];
    }
    case 'math':
      return [
        Math.sin(angle * 3 + 0.4) * 1.72 + noise(0.12),
        Math.sin(angle * 2) * 1.18 + noise(0.12),
        Math.cos(angle * 5) * 0.46,
      ];
    case 'movie': {
      const frame = index % 10;
      const row = Math.floor(index / 10);
      const x = (frame / 9 - 0.5) * 3.7;
      const y = (row / Math.max(1, Math.ceil(count / 10) - 1) - 0.5) * 2.15;
      const perforation = frame === 0 || frame === 9 ? 0.18 : 0;
      return [x, y + Math.sin(x * 1.8) * 0.12 + perforation, noise(0.66)];
    }
    case 'library': {
      const shelf = index % 6;
      const slot = Math.floor(index / 6);
      return [
        (slot / Math.max(1, Math.ceil(count / 6) - 1) - 0.5) * 3.6 + noise(0.12),
        (shelf / 5 - 0.5) * 2.45 + Math.sin(slot * 0.8 + shelf) * 0.06,
        noise(0.74),
      ];
    }
    case 'council': {
      const chamber = index % 2;
      const localT = Math.floor(index / 2) / Math.max(1, Math.ceil(count / 2) - 1);
      const a = localT * TAU + chamber * Math.PI;
      return [
        Math.cos(a) * (chamber ? 1.62 : 0.92),
        Math.sin(a) * (chamber ? 0.84 : 1.18),
        chamber ? -0.35 : 0.35,
      ];
    }
    case 'power': {
      const x = t * 3.8 - 1.9;
      const curve = Math.pow(Math.max(t, 0.02), 3.5) * 2.8 - 1.35;
      return [x + noise(0.09), curve + noise(0.16 + t * 0.24), t * 1.7 - 0.85];
    }
    case 'time': {
      const turns = angle * 3;
      const radius = 0.45 + t * 1.35;
      return [Math.cos(turns) * radius, t * 3.2 - 1.6, Math.sin(turns) * 0.8];
    }
    case 'mendeleev': {
      const column = index % 18;
      const row = Math.floor(index / 18);
      const gap = column > 1 && column < 12 && row < 3 ? 0.18 : 0;
      return [
        (column / 17 - 0.5) * 3.9,
        (row / Math.max(1, Math.ceil(count / 18) - 1) - 0.5) * 2.25 - gap,
        noise(0.34),
      ];
    }
    case 'health': {
      const turns = angle * 2.25;
      return [
        Math.cos(turns) * (1.2 + Math.sin(angle) * 0.2),
        t * 3 - 1.5,
        Math.sin(turns) * 0.78,
      ];
    }
    case 'muscle': {
      const fibre = index % 8;
      const fibreT = Math.floor(index / 8) / Math.max(1, Math.ceil(count / 8) - 1);
      const x = fibreT * 4 - 2;
      return [
        x,
        (fibre / 7 - 0.5) * 2 + Math.sin(x * 2.1 + fibre * 0.7) * 0.17,
        Math.cos(x * 1.4 + fibre) * 0.38,
      ];
    }
    case 'calendar': {
      const ring = index % 3;
      const ringT = Math.floor(index / 3) / Math.max(1, Math.ceil(count / 3) - 1);
      const a = ringT * TAU + ring * 0.16;
      const radius = 0.72 + ring * 0.5;
      return [Math.cos(a) * radius, Math.sin(a) * radius, (ring - 1) * 0.42];
    }
    case 'ink': {
      const x = t * 4 - 2;
      return [
        x,
        Math.sin(x * 1.65) * 0.72 + Math.sin(x * 4.1) * 0.18 + noise(0.12),
        Math.cos(x * 1.1) * 0.45,
      ];
    }
    case 'poetry': {
      const stanza = index % 4;
      const stanzaT = Math.floor(index / 4) / Math.max(1, Math.ceil(count / 4) - 1);
      const a = stanzaT * TAU * 1.6 + stanza * 0.34;
      const radius = 0.32 + stanzaT * 1.45;
      return [Math.cos(a) * radius, Math.sin(a) * radius * 0.72, (stanza - 1.5) * 0.28];
    }
    case 'news': {
      const band = index % 5;
      const bandT = Math.floor(index / 5) / Math.max(1, Math.ceil(count / 5) - 1);
      const x = bandT * 4 - 2;
      return [
        x,
        (band / 4 - 0.5) * 2.2 + Math.sin(x * (1.2 + band * 0.18)) * 0.2,
        Math.cos(x + band) * 0.34,
      ];
    }
    case 'open-overview': {
      const ring = index % 4;
      const ringT = Math.floor(index / 4) / Math.max(1, Math.ceil(count / 4) - 1);
      const a = ringT * TAU + ring * 0.72;
      const radius = 0.52 + ring * 0.38;
      return [Math.cos(a) * radius + noise(0.1), Math.sin(a) * radius + noise(0.1), (ring - 1.5) * 0.32];
    }
    case 'ai-research': {
      const mind = index % 2;
      const localT = Math.floor(index / 2) / Math.max(1, Math.ceil(count / 2) - 1);
      const a = localT * TAU * 2;
      return [
        (mind ? 0.88 : -0.88) + Math.cos(a) * 0.65,
        Math.sin(a) * 1.16,
        Math.cos(a * 0.5 + mind * Math.PI) * 0.55,
      ];
    }
    case 'void': {
      const cell = index % 7;
      const a = cell * TAU / 7;
      const generation = Math.floor(index / 7);
      const radius = 0.35 + generation * 0.13;
      return [
        Math.cos(a + generation * 0.28) * radius + noise(0.18),
        Math.sin(a + generation * 0.28) * radius + noise(0.18),
        noise(1.35),
      ];
    }
    case 'vfx': {
      const blade = index % 9;
      const bladeT = Math.floor(index / 9) / Math.max(1, Math.ceil(count / 9) - 1);
      const a = blade * TAU / 9 + bladeT * 0.48;
      const radius = 0.38 + bladeT * 1.55;
      return [Math.cos(a) * radius, Math.sin(a) * radius, Math.sin(a * 3) * 0.46];
    }
    case 'avatar': {
      const a = angle;
      const faceX = Math.cos(a) * 1.22;
      const faceY = Math.sin(a) * 1.5;
      const expression = index % 9 === 0 ? 0.3 : 0;
      return [faceX, faceY + expression, Math.cos(a * 2) * 0.32];
    }
    case 'upload': {
      const lane = index % 6;
      const laneT = Math.floor(index / 6) / Math.max(1, Math.ceil(count / 6) - 1);
      return [
        (lane / 5 - 0.5) * 2.7 + Math.sin(laneT * TAU + lane) * 0.12,
        laneT * 3.4 - 1.7,
        Math.cos(laneT * TAU + lane) * 0.62,
      ];
    }
    default:
      return [Math.cos(angle) * 1.4, Math.sin(angle) * 1.1, noise(0.8)];
  }
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let value = seed | 0;
  return function seededRandom() {
    value = (value + 0x6D2B79F5) | 0;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}
