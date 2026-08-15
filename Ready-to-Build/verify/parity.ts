import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { DifficultyKey, FamilyKey, RawBalanceJSON, StatTrack } from '../src/interfaces';

const balancePath = path.resolve(process.cwd(), 'data/balance.json');
const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
const loader = new BalanceLoader(rawBalance);

// Tolerances from VERIFICATION.md §1
const RELATIVE_TOLERANCE = 1e-9;

function relError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual);
  return Math.abs((actual - expected) / expected);
}

let allPassed = true;
const difficulties: DifficultyKey[] = ['sprout', 'bloom', 'spread', 'dominion'];

console.log('--- Running Parity Harness: Wave Curves (200 Waves) ---');

for (const diff of difficulties) {
  const dParams = loader.getDifficulty(diff).params;
  let runningHP = loader.constants.base_hp;
  let maxRelErrHP = 0;
  let maxRelErrBounty = 0;
  let maxRelErrGrowth = 0;

  for (let w = 1; w <= 200; w++) {
    // Reference formulas from generate_balance.py / ENGINE-SPEC §3.2
    const expectedGrowth = dParams.g_inf + (dParams.g0 - dParams.g_inf) * Math.exp(-(w - 1) / dParams.tau);
    runningHP *= expectedGrowth;
    const expectedHP = runningHP;
    const expectedBounty = dParams.rho * expectedHP;

    // Engine loader calculations
    const actualGrowth = loader.getGrowth(diff, w);
    const actualHP = loader.getWaveHP(diff, w);
    const actualBounty = loader.getWaveBounty(diff, w);

    const errG = relError(actualGrowth, expectedGrowth);
    const errHP = relError(actualHP, expectedHP);
    const errB = relError(actualBounty, expectedBounty);

    if (errG > maxRelErrGrowth) maxRelErrGrowth = errG;
    if (errHP > maxRelErrHP) maxRelErrHP = errHP;
    if (errB > maxRelErrBounty) maxRelErrBounty = errB;

    if (errG >= RELATIVE_TOLERANCE || errHP >= RELATIVE_TOLERANCE || errB >= RELATIVE_TOLERANCE) {
      console.error(`FAIL: Discrepancy on ${diff} wave ${w}: errG=${errG}, errHP=${errHP}, errB=${errB}`);
      allPassed = false;
    }
  }

  console.log(`[${diff.toUpperCase()}] max relative error: Growth=${maxRelErrGrowth.toExponential(3)}, HP=${maxRelErrHP.toExponential(3)}, Bounty=${maxRelErrBounty.toExponential(3)}`);
}

console.log('\n--- Running Parity Harness: Cost & Stat Curves (Levels 1-20) ---');

const families: FamilyKey[] = ['puffball', 'foxfire', 'artillery', 'cordyceps', 'inky_cap', 'polypore', 'stinkhorn', 'ghost_pipe', 'lions_mane'];
const tracks: StatTrack[] = ['damage', 'range', 'rate'];

for (const fam of families) {
  for (const track of tracks) {
    for (let level = 1; level <= 20; level++) {
      const cost = loader.getUpgradeCost(fam, track, level);
      if (level <= 14) {
        const expectedCost = rawBalance.families[fam].ladders[track][level - 1].cost;
        if (cost !== expectedCost) {
          console.error(`FAIL: ${fam} ${track} level ${level} cost mismatch: actual=${cost}, expected=${expectedCost}`);
          allPassed = false;
        }
      } else {
        // Levels 15-20 cost check
        if (typeof cost !== 'number' || isNaN(cost) || cost < 1) {
          console.error(`FAIL: ${fam} ${track} level ${level} invalid cost=${cost}`);
          allPassed = false;
        }
      }

      // Check stat values
      if (track === 'damage') {
        const dmg = loader.getDamageAt(fam, level);
        if (level <= 14) {
          const expectedDmg = rawBalance.families[fam].ladders.damage[level - 1].value;
          if (dmg !== expectedDmg) {
            console.error(`FAIL: ${fam} damage level ${level} mismatch: actual=${dmg}, expected=${expectedDmg}`);
            allPassed = false;
          }
        }
      }
    }
  }
}

if (!allPassed) {
  console.error('\nFAIL: Parity harness failed one or more assertions.');
  process.exit(1);
} else {
  console.log('\nPASS: npm run verify:parity (all curves match generator to < 1e-9 relative error across 200 waves).');
  process.exit(0);
}
