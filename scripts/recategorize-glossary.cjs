// Re-categorize the 237 glossary terms that were dumped into the
// "Builders & Agent Platforms" fallback bucket. Audit 2026-08-03, gap 3.
// Only reassigns to categories that already exist in the data set; also folds
// two 1-item near-duplicate categories into their canonical siblings.
//
//   node scripts/recategorize-glossary.cjs web/ai-init/glossary-data.js
//
// Already applied to the checked-in data. Kept under version control as the
// record of which term went where, so the mapping is reviewable and can be
// re-applied if the glossary is ever regenerated upstream. Re-running against
// already-migrated data is a no-op that exits 0.
const fs = require('fs');

const FILE = process.argv[2];

const MAP = {
  'Protocols & APIs': ['A2A', 'CXMPL', 'DAP', 'LSP', 'MCP', 'OAI', 'RESP'],

  'Prompting & Interaction': ['FUNC', 'TOOLS', 'STRICT', 'ReAct'],

  // Genuine builder / agent / dev-platform terms — these stay put.
  'Builders & Agent Platforms': [
    'AGENT3', 'AGENTS-SDK', 'AI-INT', 'APPROVALS', 'CD', 'CI', 'CLI', 'CODEX',
    'EDITMODE', 'GHOSTWRITER', 'GUARDRAILS', 'HITL', 'IDE', 'LOVABLE', 'NOAPI',
    'PLANMODE', 'PM', 'POC', 'PR', 'REPLIT', 'REPLIT-AGENT', 'SDK', 'TRACE',
    'VSC', 'Agent',
  ],

  'Foundations & Concepts': [
    'AGI', 'AI', 'ML', 'DL', 'XAI', 'AR', 'VR', 'i.i.d', 'NFL', 'MaxEnt', 'MDL', 'SBSE',
  ],

  'Compute & Hardware': ['FLOP', 'FLOPS'],

  'Cloud & Infrastructure': ['BQML'],

  // Network architectures, layers, activation functions, detectors.
  'Architecture & Attention': [
    'AE', 'ANN', 'ARNN', 'BiFPN', 'BILSTM', 'BNN', 'CDBN', 'CLNN', 'CMAC', 'CRBM',
    'DAE', 'DBM', 'DBN', 'DNN', 'DSN', 'ELU', 'FC', 'FC-CNN', 'FC-LSTM', 'FNN',
    'FPN', 'HAN', 'HNN', 'KAN', 'MADE', 'MCLNN', 'MDN', 'MDRNN', 'MLP', 'MSDAE',
    'NAS', 'NN', 'NPE', 'NTM', 'PNN', 'PReLU', 'RandNN', 'RBFNN', 'RBM', 'RICNN',
    'RIM', 'RNN', 'SAE', 'SDAE', 'SLP', 'SOM', 'SSD', 'TGAN', 'TLFN', 'VAE',
    'VGG', 'YOLO',
  ],

  // Metrics, plus the explainability/attribution methods used to evaluate models.
  'Evaluation & Benchmarks': [
    'ACC', 'AUC', 'DR', 'F1 Score', 'FNR', 'FPR', 'FWIoU', 'IDR', 'IIR', 'INFD',
    'IoU', 'MAE', 'MAPE', 'MCS', 'MIoU', 'MPA', 'MRR', 'MSE', 'NRMSE', 'PA',
    'RMSE', 'ROC', 'SER', 'TNR', 'TPR', 'WPE',
    'AM', 'CBI', 'DeepLIFT', 'DTD', 'GALE', 'GEBI', 'LIME', 'LRP', 'SHAP',
    'SpRay', 'TINT',
  ],

  'Training & Fine-tuning': ['RLHF', 'SSL', 'STL', 'RTRL', 'STDA', 'TDA', 'PU'],

  // Pipelines, signal/feature processing, corpus statistics, extraction tasks,
  // and recommender-system models (all data-side).
  'Data & Knowledge Systems': [
    'ETL Pipeline', 'DWT', 'FFT', 'EMD', 'MINT', 'PMI', 'PPMI',
    'NER', 'NERQ', 'POS',
    'CF', 'CTR', 'MRS', 'RLFM', 'PMF', 'BPMF', 'PACO',
  ],

  // Classical ML algorithms, statistical estimators, RL, and applied task models.
  'Models & Intelligence': [
    'ACE', 'ADA', 'AdaBoost', 'AdR', 'ADT', 'AMT', 'BN', 'BRR', 'CALA', 'CART',
    'CMMs', 'DBSCAN', 'DQN', 'DT', 'EM', 'EXT', 'FALA', 'FCM', 'GAMLSS', 'GMM',
    'GPR', 'HCA', 'HDP', 'hLDA', 'ID3', 'k-NN', 'KDE', 'kNN', 'KRR', 'LDA',
    'LDADE', 'MAF', 'MAP', 'MARS', 'MCMC', 'MDP', 'MER', 'MLE', 'MSR', 'NB',
    'NBKE', 'NF', 'NLT', 'NMS', 'NNMODFF', 'NST', 'ODF', 'OLR', 'OLS', 'PCA',
    'PLSI', 'POMDP', 'PYTM', 'RANSAC', 'RBF', 'REPTree', 'RF', 'RIPPER', 'RL',
    'ROI', 'RR', 'SARSA', 'SBM', 'SCH', 'ST', 'SVD', 'SVS', 'TD', 'THAID',
    'TRPO', 'VAD', 'WFST', 'WMA',
  ],
};

// Two categories held a single entry each and duplicate a sibling taxonomy branch.
const FOLD = {
  'Evaluation & Safety': 'Evaluation & Benchmarks',
  'Inference & Efficiency': 'Inference & Serving',
};

const byAbbr = new Map();
for (const [cat, abbrs] of Object.entries(MAP)) {
  for (const a of abbrs) {
    if (byAbbr.has(a)) throw new Error('duplicate assignment: ' + a);
    byAbbr.set(a, cat);
  }
}

global.window = {};
const src = fs.readFileSync(FILE, 'utf8');
eval(src);
const data = window.AI_INIT_GLOSSARY_DATA;

const bucket = data.filter(t => t.category === 'Builders & Agent Platforms');

// Already migrated: the bucket holds only the terms that legitimately belong
// there and every mapped term already sits in its assigned category.
const settled = bucket.every(t => byAbbr.get(t.abbr) === 'Builders & Agent Platforms')
  && [...byAbbr].every(([a, cat]) => {
    const t = data.find(x => x.abbr === a);
    return !t || t.category === cat;
  });

if (settled) {
  console.log('already applied — no terms left in the fallback bucket. Nothing to do.');
  process.exit(0);
}

const missing = bucket.filter(t => !byAbbr.has(t.abbr)).map(t => t.abbr);
const extra = [...byAbbr.keys()].filter(a => !data.some(t => t.abbr === a));

if (missing.length || extra.length) {
  console.error('UNMAPPED (in data, not in map):', missing);
  console.error('STALE (in map, not in data):', extra);
  process.exit(1);
}

let moved = 0, folded = 0;
for (const t of data) {
  if (t.category === 'Builders & Agent Platforms') {
    const next = byAbbr.get(t.abbr);
    if (next !== t.category) { t.category = next; moved++; }
  } else if (FOLD[t.category]) {
    t.category = FOLD[t.category];
    folded++;
  }
}

fs.writeFileSync(FILE, 'window.AI_INIT_GLOSSARY_DATA = ' + JSON.stringify(data) + ';\n');

const counts = {};
data.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
console.log('total terms:', data.length);
console.log('re-categorized:', moved, '| folded singleton categories:', folded);
console.log('--- new distribution ---');
Object.entries(counts).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(String(v).padStart(4), k));
