import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { EconomyManager } from '../src/sim/economy';
import { Tower } from '../src/sim/tower';
import { RawBalanceJSON } from '../src/interfaces';

const balancePath = path.resolve(process.cwd(), 'data/balance.json');
const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
const loader = new BalanceLoader(rawBalance);

let allPassed = true;
console.log('--- Running Economy Fixture Verification (A-11 / VERIFICATION §6) ---');

// 1. Build -> 3 upgrades -> sell returns floor(total_spent * resale)
{
  const eco = new EconomyManager(loader, 'bloom');
  const startingCash = eco.cash;

  // Buy Puffball tower
  const buildCost = loader.getFamily('puffball').build_cost; // 12
  eco.award(10000); // Give enough cash for test
  const cashBefore = eco.cash;

  const tower = new Tower(1, 'puffball', 100, 100, loader);
  eco.deduct(buildCost);

  // 3 Upgrades
  const up1 = eco.upgradeTower(tower, 'damage');
  const up2 = eco.upgradeTower(tower, 'damage');
  const up3 = eco.upgradeTower(tower, 'rate');

  const totalSpent = buildCost + up1 + up2 + up3;
  if (tower.totalSpent !== totalSpent) {
    console.error(`FAIL: tower.totalSpent (${tower.totalSpent}) != expected (${totalSpent})`);
    allPassed = false;
  }

  const expectedResale = Math.floor(totalSpent * loader.constants.resale);
  const resaleGot = eco.sellTower(tower);

  if (resaleGot !== expectedResale) {
    console.error(`FAIL: Sell returns ${resaleGot}, expected floor(total_spent * resale) = ${expectedResale}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Build -> 3 upgrades -> sell returns exact floor(total_spent * resale): $${resaleGot} from $${totalSpent}`);
  }
}

// 2. Relocate costs build_cost * relocate_cost_x_build (6x)
{
  const eco = new EconomyManager(loader, 'bloom');
  const artBuildCost = loader.getFamily('artillery').build_cost; // 26
  const expectedRelocateCost = artBuildCost * loader.constants.relocate_cost_x_build; // 26 * 6 = 156

  const actualRelocateCost = eco.getRelocateCost(artBuildCost);
  if (actualRelocateCost !== expectedRelocateCost) {
    console.error(`FAIL: Relocate cost expected ${expectedRelocateCost}, got ${actualRelocateCost}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Relocation cost matches build_cost * 6: $${actualRelocateCost} ($${artBuildCost} * 6)`);
  }
}

// 3. Cash never goes negative through any legal action sequence
{
  const eco = new EconomyManager(loader, 'dominion');
  // Attempt to buy something beyond starting cash
  const expensiveCost = 999999;
  const canAfford = eco.canAfford(expensiveCost);
  const deductResult = eco.deduct(expensiveCost);

  if (canAfford !== false || deductResult !== false || eco.cash < 0) {
    console.error(`FAIL: Economy allowed illegal transaction into negative balance`);
    allPassed = false;
  } else {
    console.log(`[PASS] Negative balance strictly prevented: cash remains $${eco.cash}`);
  }
}

if (!allPassed) {
  console.error('\nFAIL: npm run verify:economy failed.');
  process.exit(1);
} else {
  console.log('\nPASS: npm run verify:economy (all economy formulas, resale rounding, relocation rates, and cash non-negativity verified).');
  process.exit(0);
}
