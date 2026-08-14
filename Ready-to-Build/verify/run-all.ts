import { spawnSync } from 'child_process';
import path from 'path';

console.log('====================================================');
console.log('    RUNNING FULL VERIFICATION SUITE (M0 GATE)       ');
console.log('====================================================\n');

const checks = [
  { name: '1. Constant Linting (npm run lint:constants)', cmd: 'npm', args: ['run', 'lint:constants'] },
  { name: '2. Parity Harness (npm run verify:parity)', cmd: 'npm', args: ['run', 'verify:parity'] },
  { name: '3. Determinism Harness (npm run verify:determinism)', cmd: 'npm', args: ['run', 'verify:determinism'] },
  { name: '4. Combo Dispatch & Reachability (npm run verify:combos)', cmd: 'npm', args: ['run', 'verify:combos'] },
  { name: '5. Modifier Stacking Math (npm run verify:stacking)', cmd: 'npm', args: ['run', 'verify:stacking'] },
  { name: '6. Economy & Resale Formulas (npm run verify:economy)', cmd: 'npm', args: ['run', 'verify:economy'] },
  { name: '7. Map Geometry & Traversal (npm run verify:maps)', cmd: 'npm', args: ['run', 'verify:maps'] },
];

let failedCount = 0;

for (const check of checks) {
  console.log(`\n>>> [STARTING] ${check.name}...`);
  const res = spawnSync(check.cmd, check.args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  });

  if (res.status !== 0) {
    console.error(`\n❌ [FAILED] ${check.name} returned non-zero exit code: ${res.status}`);
    failedCount++;
  } else {
    console.log(`\n✅ [PASSED] ${check.name}`);
  }
}

console.log('\n====================================================');
if (failedCount > 0) {
  console.error(`❌ VERIFICATION SUITE FAILED: ${failedCount} / ${checks.length} checks failed.`);
  process.exit(1);
} else {
  console.log(`✅ VERIFICATION SUITE PASSED: ALL ${checks.length} HARNESSES SUCCEEDED.`);
  process.exit(0);
}
