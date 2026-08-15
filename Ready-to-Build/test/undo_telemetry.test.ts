import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GameInstance } from '../src/sim/game_instance';
import { loadMap, MapDataRaw } from '../src/map/map';
import { RawBalanceJSON } from '../src/interfaces';

describe('Option B: Undo Buffer and Combat Telemetry', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const classicMap = loadMap('Classic', rawMaps['Classic']);

  it('provides 100% refund when sold within 3 seconds without firing', () => {
    const game = new GameInstance(1, 'bloom', classicMap, rawBalance);
    const startCash = game.economyManager.cash; // $44

    // Build puffball ($12)
    const t = game.buildTower('puffball', 140, 340);
    expect(game.economyManager.cash).toBe(startCash - 12);

    // Advance 1.5 seconds (1500ms <= 3000ms, hasFired = false)
    game.step(1500);

    // Sell tower -> should refund full 100% ($12)
    game.sellTower(t);
    expect(game.economyManager.cash).toBe(startCash);
  });

  it('reverts to 65% resale rate after 3 seconds or after firing', () => {
    const game = new GameInstance(2, 'bloom', classicMap, rawBalance);
    const startCash = game.economyManager.cash; // $44

    // Build foxfire ($17)
    const t = game.buildTower('foxfire', 140, 340);

    // Advance 4.0 seconds (4000ms > 3000ms)
    game.step(4000);

    // Sell tower -> should refund floor(17 * 0.65) = $11
    game.sellTower(t);
    expect(game.economyManager.cash).toBe(startCash - 17 + 11);
  });

  it('tracks live damage and kill telemetry per tower instance', () => {
    const game = new GameInstance(3, 'bloom', classicMap, rawBalance);
    const t = game.buildTower('puffball', 140, 340);

    expect(t.totalDamageDealt).toBe(0);
    expect(t.totalKills).toBe(0);
    expect(t.hasFired).toBe(false);

    // Send wave 1 and advance 10 seconds
    game.sendWaveNow();
    for (let i = 0; i < 600; i++) {
      game.step(16.6);
    }

    expect(t.hasFired).toBe(true);
    expect(t.totalDamageDealt).toBeGreaterThan(0);
  });
});
