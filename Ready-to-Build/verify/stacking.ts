import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { Tower } from '../src/sim/tower';
import { ModifierManager, ModifierStructure } from '../src/sim/modifier';
import { RawBalanceJSON } from '../src/interfaces';

const balancePath = path.resolve(process.cwd(), 'data/balance.json');
const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
const loader = new BalanceLoader(rawBalance);

let allPassed = true;
console.log('--- Running Modifier Stacking Fixture Verification ---');

// Case 1: Two Nutrient Beds (+45% each) -> x1.90 (1 + 0.45 + 0.45 = 1.90)
{
  const manager = new ModifierManager();
  const tower = new Tower(1, 'artillery', 100, 100, loader);
  manager.registerTower(tower);
  const baseDmg = tower.getBaseStat('damage');

  const mod1 = new ModifierStructure(1, 'Nutrient Bed', 100, 100, loader);
  const mod2 = new ModifierStructure(2, 'Nutrient Bed', 100, 100, loader);

  manager.addModifier(mod1);
  manager.addModifier(mod2);

  const effDmg = tower.getEffectiveDamage();
  const expectedDmg = baseDmg * 1.90;
  const diff = Math.abs(effDmg - expectedDmg);

  if (diff > 1e-6) {
    console.error(`FAIL: Two Nutrient Beds expected x1.90 (${expectedDmg}), got ${effDmg}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Two Nutrient Beds additive stacking: x1.90 (${effDmg.toFixed(2)})`);
  }
}

// Case 2: Nutrient Bed (+45%) + Amatoxin Vat (+105%) -> x2.50 (1 + 0.45 + 1.05 = 2.50)
{
  const manager = new ModifierManager();
  const tower = new Tower(1, 'artillery', 100, 100, loader);
  manager.registerTower(tower);
  const baseDmg = tower.getBaseStat('damage');

  const mod1 = new ModifierStructure(1, 'Nutrient Bed', 100, 100, loader);
  const mod2 = new ModifierStructure(2, 'Amatoxin Vat', 100, 100, loader);

  manager.addModifier(mod1);
  manager.addModifier(mod2);

  const effDmg = tower.getEffectiveDamage();
  const expectedDmg = baseDmg * 2.50;
  const diff = Math.abs(effDmg - expectedDmg);

  if (diff > 1e-6) {
    console.error(`FAIL: Nutrient Bed + Amatoxin Vat expected x2.50 (${expectedDmg}), got ${effDmg}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Nutrient Bed + Amatoxin Vat stacking: x2.50 (${effDmg.toFixed(2)})`);
  }
}

// Case 3: Enough negative multipliers to reach -1.2 -> floors at x0.2 (mult_floor)
{
  const manager = new ModifierManager();
  const tower = new Tower(1, 'puffball', 100, 100, loader);
  manager.registerTower(tower);
  const baseDmg = tower.getBaseStat('damage');

  // Fermentation Vent gives -0.38 damage_mult. 4 of them give -1.52 (1 - 1.52 = -0.52 -> floors at 0.2)
  for (let i = 1; i <= 4; i++) {
    manager.addModifier(new ModifierStructure(i, 'Fermentation Vent', 100, 100, loader));
  }

  const effDmg = tower.getEffectiveDamage();
  const expectedDmg = baseDmg * 0.2;
  const diff = Math.abs(effDmg - expectedDmg);

  if (diff > 1e-6) {
    console.error(`FAIL: Negative multipliers below floor expected x0.20 (${expectedDmg}), got ${effDmg}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Negative multiplier floor clamping: x0.20 (${effDmg.toFixed(2)})`);
  }
}

// Case 4: Hyphal Relay (+96 flat) on base range 118 -> 214 (118 + 96 = 214)
{
  const rawBaseRange = loader.getFamily('puffball').base.range; // 118
  const effRange = loader.calculateEffectiveStat(rawBaseRange, [96], []);
  const expectedRange = 118 + 96; // 214

  if (effRange !== expectedRange) {
    console.error(`FAIL: Hyphal Relay range expected ${expectedRange}, got ${effRange}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Hyphal Relay flat added range on base 118: ${effRange}px (118 + 96 = 214)`);
  }
}

// Case 5: Flat and multiplier together -> (base + added) * mult, in that order
{
  const rawBaseRange = loader.getFamily('puffball').base.range; // 118
  // (118 + 96) * (1 - 0.12) = 214 * 0.88 = 188.32
  const effRange = loader.calculateEffectiveStat(rawBaseRange, [96], [-0.12]);
  const expectedRange = (118 + 96) * 0.88;
  const diff = Math.abs(effRange - expectedRange);

  if (diff > 1e-6) {
    console.error(`FAIL: Flat + Multiplier order expected ${expectedRange}, got ${effRange}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Flat and multiplier ordering: (118 + 96) * 0.88 = ${effRange.toFixed(2)}px`);
  }
}

// Case 6: Sell a modifier and assert stats return to exact prior values
{
  const manager = new ModifierManager();
  const tower = new Tower(1, 'artillery', 100, 100, loader);
  manager.registerTower(tower);

  const priorDmg = tower.getEffectiveDamage();
  const priorRange = tower.getEffectiveRange();
  const priorRate = tower.getEffectiveRate();

  const mod = new ModifierStructure(10, 'Amatoxin Still', 100, 100, loader);
  manager.addModifier(mod);

  // Stats modified
  if (tower.getEffectiveDamage() === priorDmg) {
    console.error('FAIL: Expected modifier to change tower stats');
    allPassed = false;
  }

  // Sell/remove modifier
  manager.removeModifier(10);

  const restoredDmg = tower.getEffectiveDamage();
  const restoredRange = tower.getEffectiveRange();
  const restoredRate = tower.getEffectiveRate();

  if (restoredDmg !== priorDmg || restoredRange !== priorRange || restoredRate !== priorRate) {
    console.error(`FAIL: Sell modifier failed to restore prior values exactly.`);
    allPassed = false;
  } else {
    console.log(`[PASS] Modifier removal / sell restores exact prior stats.`);
  }
}

if (!allPassed) {
  console.error('\nFAIL: npm run verify:stacking failed assertions.');
  process.exit(1);
} else {
  console.log('\nPASS: npm run verify:stacking (all modifier stacking formulas and edge cases verified).');
  process.exit(0);
}
