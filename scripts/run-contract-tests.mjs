import { spawnSync } from 'node:child_process';

// Run source contracts before the build-backed foundation suite. Separate stages
// prevent builders from racing on vercel-public; browser lanes run separately.
const files = [
  'scratch/tests/route-inventory-contract.test.js',
  'scratch/tests/project-catalog-contract.test.js',
  'scratch/tests/sdforest-settled-structure.test.js',
  'scratch/tests/sdforest-pool-structure.test.js',
  'scratch/tests/sdforest-pool-ordering.test.js',
  'scratch/tests/sdforest-legacy-structure.test.js',
  'scratch/tests/static-route-registry-validator.test.js',
  'scratch/tests/static-route-coverage.test.js',
  'scratch/tests/prose-drift.test.js',
  'scratch/tests/rubiks-teacher-contract.test.js',
  'scratch/tests/ai-kit-offers.test.js',
  'scratch/tests/ai-kit-data-contract.test.js',
  'scratch/tests/ai-kit-reverification.test.js',
];

for (const [name, stageFiles] of [
  ['Source contracts', files],
  ['Build-backed foundation', ['scratch/tests/sdforest-foundation.test.js']],
]) {
  console.log(`\n${name}`);
  const result = spawnSync(process.execPath, ['--test', ...stageFiles], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
