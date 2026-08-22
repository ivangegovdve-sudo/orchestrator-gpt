const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_QUEUE_PATH = path.join(ROOT, 'glossary', 'candidates', 'pending.json');
const QUEUE_README = [
  'This file is an inert review queue, not a glossary source.',
  'A human reviewer must verify each term, write a cited definition in glossary/verified-terms.json, and rebuild the glossary.',
];
const CANDIDATE_FIELDS = new Set(['term', 'evidenceCount', 'sourceKinds']);
const STORED_CANDIDATE_FIELDS = new Set([...CANDIDATE_FIELDS, 'status']);
const SOURCE_KINDS = new Set(['email', 'manual', 'repository', 'sessions']);
const MAX_INPUT_CANDIDATES = 500;

function rejectPrivateShape(term) {
  const dotCount = typeof term === 'string' ? (term.match(/\./gu) || []).length : 0;
  if (
    typeof term !== 'string'
    || /[@/\\:]/u.test(term)
    || /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(term)
    || term.endsWith('.')
    || dotCount >= 2
    || /(?:^|[.-])(?:internal|local|localhost|lan|home|corp|prod|dev|stage|staging|test|svc|cluster|node|host)$/iu.test(term)
  ) {
    throw new TypeError('private-shaped candidate material is not allowed');
  }
}

function rejectCredentialShape(term) {
  if (typeof term !== 'string' || term.length < 16) {
    return;
  }

  const characterClasses = [/[a-z]/u, /[A-Z]/u, /\d/u].filter((pattern) => pattern.test(term)).length;
  const uniqueRatio = new Set(term).size / term.length;
  const longHex = /^[0-9a-f]+$/iu.test(term) && /[a-f]/iu.test(term) && /\d/u.test(term);
  const longOpaque = term.length >= 20 && /^[A-Za-z0-9_-]+$/u.test(term) && characterClasses >= 2;
  const singleCaseOpaque = term.length >= 24 && (/^[a-z]+$/u.test(term) || /^[A-Z]+$/u.test(term));
  if (
    (characterClasses === 3 && uniqueRatio >= 0.5)
    || (longHex && uniqueRatio >= 0.5)
    || (longOpaque && uniqueRatio >= 0.55)
    || (singleCaseOpaque && uniqueRatio >= 0.7)
  ) {
    throw new TypeError('credential-shaped candidate material is not allowed');
  }
}

function validateTermFormat(term) {
  if (typeof term !== 'string' || !/^[A-Za-z][A-Za-z0-9.+-]{1,31}$/u.test(term)) {
    throw new TypeError('candidate term format is invalid');
  }
}

function validateSourceKinds(sourceKinds) {
  if (
    !Array.isArray(sourceKinds)
    || sourceKinds.length === 0
    || sourceKinds.some((sourceKind) => !SOURCE_KINDS.has(sourceKind))
  ) {
    throw new TypeError('unsupported source kind');
  }
}

function validateEvidenceCount(evidenceCount) {
  if (!Number.isInteger(evidenceCount) || evidenceCount < 1 || evidenceCount > 1_000_000) {
    throw new TypeError('evidence count must be a bounded positive integer');
  }
}

function normalizeCandidate(candidate, { stored = false } = {}) {
  const allowedFields = stored ? STORED_CANDIDATE_FIELDS : CANDIDATE_FIELDS;
  if (
    !candidate
    || typeof candidate !== 'object'
    || Array.isArray(candidate)
    || Object.keys(candidate).some((field) => !allowedFields.has(field))
    || (stored && candidate.status !== 'pending-human-review')
  ) {
    throw new TypeError('unsupported candidate fields are not allowed');
  }

  rejectPrivateShape(candidate.term);
  rejectCredentialShape(candidate.term);
  validateTermFormat(candidate.term);
  validateEvidenceCount(candidate.evidenceCount);
  validateSourceKinds(candidate.sourceKinds);

  return {
    term: candidate.term,
    evidenceCount: candidate.evidenceCount,
    sourceKinds: [...new Set(candidate.sourceKinds)].sort(),
    status: 'pending-human-review',
  };
}

function readQueue(queuePath) {
  if (!fs.existsSync(queuePath)) {
    return [];
  }

  let queue;
  try {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  } catch {
    throw new TypeError('existing candidate queue is invalid');
  }
  if (
    !queue
    || typeof queue !== 'object'
    || Array.isArray(queue)
    || queue.schemaVersion !== 1
    || !Array.isArray(queue.candidates)
  ) {
    throw new TypeError('existing candidate queue is invalid');
  }

  return queue.candidates.map((candidate) => normalizeCandidate(candidate, { stored: true }));
}

function compareTerms(left, right) {
  const a = left.term.toLowerCase();
  const b = right.term.toLowerCase();
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function resolveQueuePath(options) {
  if (options === undefined) {
    return DEFAULT_QUEUE_PATH;
  }
  if (
    !options
    || typeof options !== 'object'
    || Array.isArray(options)
    || Object.keys(options).some((field) => field !== 'root')
    || typeof options.root !== 'string'
  ) {
    throw new TypeError('unsupported queue destination');
  }
  return path.join(path.resolve(options.root), 'glossary', 'candidates', 'pending.json');
}

function enqueueCandidates(document, options) {
  const queuePath = resolveQueuePath(options);
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new TypeError('candidate input must contain a candidates array');
  }
  if (Object.keys(document).some((field) => field !== 'candidates')) {
    throw new TypeError('unsupported input fields are not allowed');
  }
  if (!Array.isArray(document.candidates)) {
    throw new TypeError('candidate input must contain a candidates array');
  }
  if (document.candidates.length > MAX_INPUT_CANDIDATES) {
    throw new TypeError('candidate batch is too large');
  }

  const incoming = document.candidates.map((candidate) => normalizeCandidate(candidate));
  const existing = readQueue(queuePath);
  const byTerm = new Map(existing.map((candidate) => [candidate.term.toLowerCase(), candidate]));
  let added = 0;

  for (const candidate of incoming) {
    const key = candidate.term.toLowerCase();
    const previous = byTerm.get(key);
    if (!previous) {
      byTerm.set(key, candidate);
      added += 1;
      continue;
    }
    byTerm.set(key, {
      ...previous,
      evidenceCount: Math.max(previous.evidenceCount, candidate.evidenceCount),
      sourceKinds: [...new Set([...previous.sourceKinds, ...candidate.sourceKinds])].sort(),
    });
  }

  const candidates = [...byTerm.values()].sort(compareTerms);
  if (candidates.length > MAX_INPUT_CANDIDATES) {
    throw new TypeError('candidate queue is full');
  }
  const queue = {
    schemaVersion: 1,
    _readme: QUEUE_README,
    candidates,
  };

  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');

  return { added, total: candidates.length };
}

function parseCliArgs(argv) {
  let inputPath;
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new TypeError('invalid command-line arguments');
    }
    if (flag === '--input' && inputPath === undefined) {
      inputPath = path.resolve(value);
    } else {
      throw new TypeError('invalid command-line arguments');
    }
  }
  if (!inputPath) {
    throw new TypeError('invalid command-line arguments');
  }
  return { inputPath };
}

function runCli(argv) {
  try {
    const { inputPath } = parseCliArgs(argv);
    const document = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const result = enqueueCandidates(document);
    const noun = result.added === 1 ? 'candidate' : 'candidates';
    process.stdout.write(`Queued ${result.added} ${noun} for human review.\n`);
    return 0;
  } catch {
    process.stderr.write('Candidate queue rejected.\n');
    return 2;
  }
}

module.exports = { enqueueCandidates };

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2));
}
