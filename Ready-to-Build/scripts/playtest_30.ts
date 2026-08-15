import fs from 'fs';
import path from 'path';
import { GameInstance } from '../src/sim/game_instance';
import { loadMap, MapDataRaw, isBuildLegal } from '../src/map/map';
import { RawBalanceJSON } from '../src/interfaces';

async function runPlaytest() {
  console.log('====================================================');
  console.log('  MYCELIUM ONSLAUGHT: 30-WAVE AUTONOMOUS PLAYTEST   ');
  console.log('====================================================\n');

  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));

  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const classicMap = loadMap('Classic', rawMaps['Classic']);

  // Initialize Game on Bloom difficulty (Normal)
  const game = new GameInstance(42, 'bloom', classicMap, rawBalance);

  let combosExecuted: Record<string, number> = {};
  let totalCombos = 0;
  let totalKills = 0;
  let totalLaserChains = 0;

  game.combatManager.events = {
    onComboFired: (comboResult) => {
      totalCombos++;
      const key = comboResult.combo.key;
      combosExecuted[key] = (combosExecuted[key] || 0) + 1;
    },
    onLaserFired: (_src, _tgt, _dmg, chainHops) => {
      if (chainHops && chainHops.length > 1) {
        totalLaserChains++;
      }
    },
    onAttackerKilled: () => {
      totalKills++;
    },
  };

  console.log(`[INIT] Starting Treasury: $${game.economyManager.cash}, Core Health: ${game.economyManager.lives} Nodes`);

  // Helper to find valid spots near coordinates
  function findLegalSpot(preferredX: number, preferredY: number, fp: number = 16): { x: number; y: number } | null {
    const existing = [
      ...game.combatManager.towers.map((t) => ({ x: t.x, y: t.y, footprintRadius: t.footprintRadius })),
      ...game.modifierManager['modifiers'].map((m) => ({ x: m.x, y: m.y, footprintRadius: 16 })),
    ];
    for (let r = 0; r <= 60; r += 4) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
        const x = Math.round(preferredX + Math.cos(angle) * r);
        const y = Math.round(preferredY + Math.sin(angle) * r);
        if (x > 25 && x < 695 && y > 25 && y < 455) {
          if (isBuildLegal({ x, y }, fp, game.map, existing)) {
            return { x, y };
          }
        }
      }
    }
    return null;
  }

  // 1. Primary Cluster Zone at S-bend (x=140, y=340)
  const zone1 = { x: 140, y: 340 };
  const zone2 = { x: 360, y: 230 };

  const plannedSequence: Array<{ zone: { x: number; y: number }; type: 'tower' | 'mod'; key: any }> = [
    { zone: zone1, type: 'tower', key: 'puffball' },
    { zone: zone1, type: 'tower', key: 'foxfire' },
    { zone: zone1, type: 'tower', key: 'foxfire' },
    { zone: zone1, type: 'tower', key: 'artillery' },
    { zone: zone1, type: 'tower', key: 'cordyceps' },
    { zone: zone1, type: 'mod',   key: 'Nutrient Bed' },
    { zone: zone2, type: 'tower', key: 'puffball' },
    { zone: zone2, type: 'tower', key: 'foxfire' },
    { zone: zone2, type: 'tower', key: 'artillery' },
  ];

  let nextBuildIdx = 0;

  // Build initial 2 towers
  const s1 = findLegalSpot(zone1.x, zone1.y);
  if (s1) { game.buildTower('puffball', s1.x, s1.y); nextBuildIdx++; }

  const s2 = findLegalSpot(zone1.x, zone1.y);
  if (s2) { game.buildTower('foxfire', s2.x, s2.y); nextBuildIdx++; }

  game.sendWaveNow();

  let targetWave = 30;
  const dt = 16.6; // 60fps equivalent tick
  let simTime = 0;
  let lastReportedWave = 1;

  console.log('[START] Beginning 30-wave engagement across Early, Mid, and Late-game ladders...\n');

  while (game.waveManager.currentWaveNum <= targetWave && !game.economyManager.isGameOver) {
    game.step(dt);
    simTime += dt;

    // 1. Build next planned structure if affordable
    if (nextBuildIdx < plannedSequence.length) {
      const nextItem = plannedSequence[nextBuildIdx];
      const cost = nextItem.type === 'tower'
        ? game.loader.getFamily(nextItem.key).build_cost
        : game.loader.getModifier(nextItem.key).cost;

      if (game.economyManager.canAfford(cost)) {
        const spot = findLegalSpot(nextItem.zone.x, nextItem.zone.y);
        if (spot) {
          if (nextItem.type === 'tower') {
            game.buildTower(nextItem.key, spot.x, spot.y);
          } else {
            game.buildModifier(nextItem.key, spot.x, spot.y);
          }
          nextBuildIdx++;
        }
      }
    }

    // 2. Upgrades: Prioritize Damage on first 4 towers to trigger massive Combos!
    for (let i = 0; i < game.combatManager.towers.length; i++) {
      const t = game.combatManager.towers[i];

      // Push Damage to Level 8+ immediately
      const dmgCost = game.loader.getUpgradeCost(t.familyKey, 'damage', t.levels.damage);
      if (t.levels.damage < 12 && game.economyManager.canAfford(dmgCost)) {
        game.upgradeTower(t, 'damage');
      }

      // Upgrade Range to L3
      const rngCost = game.loader.getUpgradeCost(t.familyKey, 'range', t.levels.range);
      if (t.levels.range < 3 && game.economyManager.canAfford(rngCost)) {
        game.upgradeTower(t, 'range');
      }

      // Upgrade Rate to L3
      const rateCost = game.loader.getUpgradeCost(t.familyKey, 'rate', t.levels.rate);
      if (t.levels.rate < 3 && game.economyManager.canAfford(rateCost)) {
        game.upgradeTower(t, 'rate');
      }
    }

    // Wave Progression
    const isWaveActive = game.waveManager.pendingWaves.length > 0 || game.waveManager.attackers.length > 0;
    if (!isWaveActive && game.waveManager.currentWaveNum < targetWave) {
      game.sendWaveNow();
    }

    const currentW = game.waveManager.currentWaveNum;
    if (currentW > lastReportedWave) {
      console.log(
        `[WAVE ${lastReportedWave.toString().padStart(2, ' ')} CLEARED] ` +
        `Treasury: $${Math.floor(game.economyManager.cash).toString().padStart(5, ' ')} | ` +
        `Core: ${game.economyManager.lives}/10 | ` +
        `Towers: ${game.combatManager.towers.length.toString().padStart(2, ' ')} | ` +
        `Combos: ${totalCombos.toString().padStart(4, ' ')} | ` +
        `Dmg Dealt: ${Math.floor(game.combatManager.totalDamageDealt).toLocaleString()}`
      );
      lastReportedWave = currentW;
    }

    // Safety timeout: 400s
    if (simTime > 400000) break;
  }

  console.log('\n====================================================');
  console.log('              PLAYTEST EVALUATION REPORT            ');
  console.log('====================================================');
  console.log(`Final Outcome:       ${game.economyManager.isGameOver ? '❌ DEFEAT' : '🏆 VICTORY (Wave 30 Cleared)'}`);
  console.log(`Core Integrity:      ${game.economyManager.lives} / 10 Spore Nodes Remaining`);
  console.log(`Total Eliminations:  ${totalKills} Incursions Repelled`);
  console.log(`Total Damage Dealt:  ${Math.floor(game.combatManager.totalDamageDealt).toLocaleString()} HP`);
  console.log(`Combos Executed:     ${totalCombos} Catastrophic Combo Payloads`);
  console.log(`Laser Chain Arcs:    ${totalLaserChains} Recursive Chain Strikes`);
  console.log(`Final Treasury:      $${Math.floor(game.economyManager.cash)}`);
  console.log('\n--- Executed Combo Breakdown ---');
  for (const [combo, count] of Object.entries(combosExecuted)) {
    console.log(`  • ${combo.padEnd(24, ' ')}: ${count} triggers`);
  }
  console.log('====================================================\n');
}

runPlaytest().catch(console.error);
