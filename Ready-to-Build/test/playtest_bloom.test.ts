import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GameInstance } from '../src/sim/game_instance';
import { loadMap, MapDataRaw } from '../src/map/map';
import { RawBalanceJSON } from '../src/interfaces';

describe('30-Wave Bloom Simulation Test (M0 Exit Criterion 6/Automated Playtest)', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));

  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const map = loadMap('Classic', rawMaps['Classic']);

  it('plays 30 continuous waves on Bloom without crashes, maintaining stability and mathematical integrity', () => {
    const game = new GameInstance(9999, 'bloom', map, rawBalance);
    game.economyManager.lives = 999; // Generous lives for headless automated 30-wave burn-in

    // Starting cash on Bloom is $44.
    // Build initial defense
    game.buildTower('puffball', 150, 280);
    game.buildTower('foxfire', 200, 280);

    // Run 30 waves via auto-send timer (30 * 18000ms)
    for (let w = 1; w <= 30; w++) {
      // Step simulation for this wave's auto-timer duration (18000ms)
      for (let t = 0; t < 18000; t += 33.33) {
        game.step(33.33);

        // Player AI: place more towers along legal spots
        if (game.combatManager.towers.length === 2 && game.economyManager.canAfford(26)) {
          game.buildTower('artillery', 250, 280);
        }
        if (game.combatManager.towers.length === 3 && game.economyManager.canAfford(40)) {
          game.buildTower('cordyceps', 150, 330);
        }
        if (game.combatManager.towers.length === 4 && game.economyManager.canAfford(26)) {
          game.buildTower('artillery', 200, 330);
        }

        // Upgrade towers
        for (const tower of game.combatManager.towers) {
          const dmgCost = game.loader.getUpgradeCost(tower.familyKey, 'damage', tower.levels.damage);
          if (game.economyManager.canAfford(dmgCost)) {
            game.upgradeTower(tower, 'damage');
            break;
          }
          const rateCost = game.loader.getUpgradeCost(tower.familyKey, 'rate', tower.levels.rate);
          if (game.economyManager.canAfford(rateCost)) {
            game.upgradeTower(tower, 'rate');
            break;
          }
        }
      }
    }

    expect(game.waveManager.currentWaveNum).toBe(30);
    expect(Number.isFinite(game.economyManager.cash)).toBe(true);
    expect(game.economyManager.cash).toBeGreaterThan(0);
    expect(Number.isFinite(game.combatManager.totalDamageDealt)).toBe(true);
    expect(game.combatManager.totalDamageDealt).toBeGreaterThan(0);
  });
});
