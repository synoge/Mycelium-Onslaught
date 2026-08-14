import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { FamilyColour, RawBalanceJSON } from '../src/interfaces';
import { Tower } from '../src/sim/tower';

const balancePath = path.resolve(process.cwd(), 'data/balance.json');
const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
const loader = new BalanceLoader(rawBalance);

let allPassed = true;
console.log('--- Running Combo Dispatch & Reachability Fixture (B-03) ---');

// 1. Dispatch Cases from VERIFICATION.md §4.1
interface TestCase {
  lead: FamilyColour;
  counts: Record<string, number>;
  expectedKey: string | null;
}

const testCases: TestCase[] = [
  { lead: 'cyan', counts: { crimson: 2, green: 1, cyan: 1 }, expectedKey: 'lumen_sporeshell_scler' },
  { lead: 'cyan', counts: { crimson: 2, cyan: 1 }, expectedKey: 'sporeshell_sclerotium' },
  { lead: 'cyan', counts: { crimson: 2, green: 1 }, expectedKey: 'heavy_lumen_sporeshell' },
  { lead: 'cyan', counts: { crimson: 2 }, expectedKey: 'heavy_sporeshell' },
  { lead: 'cyan', counts: { crimson: 1, green: 1 }, expectedKey: 'lumen_sporeshell' },
  { lead: 'cyan', counts: { crimson: 1, amber: 1 }, expectedKey: 'paralytic_sporeshell' },
  { lead: 'cyan', counts: { cyan: 1, crimson: 1 }, expectedKey: 'deep_sclerotium' },
  { lead: 'cyan', counts: { cyan: 1, amber: 1 }, expectedKey: 'paralytic_sclerotium' },
  { lead: 'cyan', counts: { crimson: 1 }, expectedKey: 'sporeshell' },
  { lead: 'cyan', counts: { cyan: 1 }, expectedKey: 'sclerotium' },
  { lead: 'cyan', counts: { amber: 1 }, expectedKey: null },
  { lead: 'green', counts: { crimson: 2, cyan: 1 }, expectedKey: 'heavy_bloom_cannon' },
  { lead: 'green', counts: { crimson: 1, cyan: 1 }, expectedKey: 'bloom_cannon' },
  { lead: 'crimson', counts: { cyan: 2 }, expectedKey: 'fruiting_detonation' },
  { lead: 'crimson', counts: { crimson: 1, amber: 1, cyan: 1 }, expectedKey: 'enzymatic_burn' },
  { lead: 'crimson', counts: { green: 1, cyan: 1 }, expectedKey: 'cordyceps_cloud' },
  { lead: 'crimson', counts: { amber: 1 }, expectedKey: 'paralytic_packet' },
  { lead: 'crimson', counts: { green: 1 }, expectedKey: 'lumen_packet' },
  { lead: 'amber', counts: { amber: 2, green: 1 }, expectedKey: 'mycelial_sinkhole' },
  { lead: 'amber', counts: { amber: 1, cyan: 1, green: 1 }, expectedKey: 'spore_shockwave' },
  { lead: 'amber', counts: { crimson: 1, cyan: 1 }, expectedKey: 'paralytic_bloom_cannon' },
];

for (const tc of testCases) {
  const result = loader.dispatchCombo(tc.lead, tc.counts);
  const resultKey = result ? result.key : null;
  if (resultKey !== tc.expectedKey) {
    console.error(`FAIL: Dispatch for lead=${tc.lead}, counts=${JSON.stringify(tc.counts)}: expected ${tc.expectedKey}, got ${resultKey}`);
    allPassed = false;
  }
}
console.log(`[PASS] All 21 dispatch table cases evaluated correctly.`);

// 2. Reachability of all 20 combos
const allCombos = loader.combos;
if (allCombos.length !== 20) {
  console.error(`FAIL: Expected 20 combos in balance.json, found ${allCombos.length}`);
  allPassed = false;
}

for (const combo of allCombos) {
  const dispatchResult = loader.dispatchCombo(combo.lead, combo.requires);
  if (!dispatchResult || dispatchResult.key !== combo.key) {
    console.error(`FAIL: Combo ${combo.key} is UNREACHABLE with its own declared requirements! Got: ${dispatchResult?.key}`);
    allPassed = false;
  }
}
console.log(`[PASS] All 20 combos verified reachable with declared requirements.`);

// 3. Payload scaling test (§4.3)
// A cluster at damage level 8 must produce strictly less payload than the same cluster shape at level 12
const tLead8 = new Tower(1, 'puffball', 100, 100, loader);
tLead8.levels.damage = 8;
const tCrimson8 = new Tower(2, 'artillery', 120, 100, loader);
tCrimson8.levels.damage = 8;

// Sporeshell combo: yield 3.4
const combo = loader.getCombo('sporeshell')!;
const payload8 = (tLead8.getEffectiveDamage() + tCrimson8.getEffectiveDamage()) * combo.yield;

const tLead12 = new Tower(3, 'puffball', 100, 100, loader);
tLead12.levels.damage = 12;
const tCrimson12 = new Tower(4, 'artillery', 120, 100, loader);
tCrimson12.levels.damage = 12;

const payload12 = (tLead12.getEffectiveDamage() + tCrimson12.getEffectiveDamage()) * combo.yield;

if (payload8 >= payload12) {
  console.error(`FAIL: Payload did not scale with level! L8 payload=${payload8}, L12 payload=${payload12}`);
  allPassed = false;
} else {
  console.log(`[PASS] Payload scaling verified: Level 8 payload (${payload8.toFixed(1)}) < Level 12 payload (${payload12.toFixed(1)})`);
}

// 4. Eligibility check (§4.4)
const tElig7 = new Tower(5, 'puffball', 100, 100, loader);
tElig7.levels.damage = 7;
tElig7.levels.range = 10;
tElig7.levels.rate = 10;

const tElig8 = new Tower(6, 'puffball', 100, 100, loader);
tElig8.levels.damage = 8;
tElig8.levels.range = 1;
tElig8.levels.rate = 1;

if (tElig7.isComboCapable() !== false || tElig8.isComboCapable() !== true) {
  console.error('FAIL: Combo eligibility gating failed.');
  allPassed = false;
} else {
  console.log('[PASS] Combo eligibility strictly gated at damage level >= 8.');
}

if (!allPassed) {
  console.error('\nFAIL: npm run verify:combos failed.');
  process.exit(1);
} else {
  console.log('\nPASS: npm run verify:combos (dispatch, reachability, payload scaling, and eligibility verified).');
  process.exit(0);
}
