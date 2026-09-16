import { spawnSync } from 'node:child_process';

// Dependency-free foundation contracts only; browser/Playwright lanes run separately.
const files = [
  'scratch/tests/route-inventory-contract.test.js',
  'scratch/tests/project-catalog-contract.test.js',
  'scratch/tests/sdforest-settled-structure.test.js',
  'scratch/tests/static-route-registry-validator.test.js',
  'scratch/tests/static-route-coverage.test.js',
];

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
