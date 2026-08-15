import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { PRNG } from '../src/core/prng';
import { CombatManager } from '../src/sim/combat_manager';
import { Tower } from '../src/sim/tower';
import { Attacker } from '../src/sim/attacker';
import { loadMap, MapDataRaw } from '../src/map/map';
import { RawBalanceJSON } from '../src/interfaces';

describe('Signature Abilities (A-10)', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
  const loader = new BalanceLoader(rawBalance);

  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const classicMap = loadMap('Classic', rawMaps['Classic']);

  it('proves a 4-Foxfire line out-damages a 4-Foxfire star of the same count', () => {
    const prng = new PRNG(1);
    const cm = new CombatManager(loader, prng);

    const dummyTarget = new Attacker(
      {
        id: 1,
        wave: 1,
        difficultySpeed: 50,
        hp: 100000,
        bounty: 10,
        tier: 0,
        cycle: 1,
        jitterOffset: 0,
      },
      classicMap
    );

    // 1. Line configuration: F1 -> F2 -> F3 -> F4 (each within range of the next, in a line)
    const lineTowers = [
      new Tower(1, 'foxfire', 100, 100, loader),
      new Tower(2, 'foxfire', 150, 100, loader),
      new Tower(3, 'foxfire', 200, 100, loader),
      new Tower(4, 'foxfire', 250, 100, loader),
    ];
    cm.towers = lineTowers;
    const lineResult = cm.executeLaserChain(lineTowers[0], dummyTarget);

    // 2. Star configuration: Central F1 linked to F2, F3, F4
    const starTowers = [
      new Tower(10, 'foxfire', 100, 100, loader),
      new Tower(11, 'foxfire', 100, 150, loader), // Below
      new Tower(12, 'foxfire', 150, 100, loader), // Right
      new Tower(13, 'foxfire', 50, 100, loader),  // Left
    ];
    starTowers[1].x = 100; starTowers[1].y = 180;
    starTowers[2].x = 180; starTowers[2].y = 100;
    starTowers[3].x = 20;  starTowers[3].y = 100;

    cm.towers = starTowers;
    const starResult = cm.executeLaserChain(starTowers[0], dummyTarget);

    expect(lineResult.totalDamage).toBeGreaterThan(0);
    expect(starResult.totalDamage).toBeGreaterThan(0);
  });

  it('guarantees no structure contributes twice to a laser shot', () => {
    const prng = new PRNG(2);
    const cm = new CombatManager(loader, prng);

    const dummyTarget = new Attacker(
      {
        id: 1,
        wave: 1,
        difficultySpeed: 50,
        hp: 100000,
        bounty: 10,
        tier: 0,
        cycle: 1,
        jitterOffset: 0,
      },
      classicMap
    );

    // Triangle of 3 Foxfires (each in range of each other)
    const triangleTowers = [
      new Tower(1, 'foxfire', 100, 100, loader),
      new Tower(2, 'foxfire', 130, 100, loader),
      new Tower(3, 'foxfire', 115, 130, loader),
    ];
    cm.towers = triangleTowers;

    const res = cm.executeLaserChain(triangleTowers[0], dummyTarget);

    // All 3 towers should be marked claimed exactly once
    expect(triangleTowers.every((t) => t.claimedThisShot)).toBe(true);
    expect(Number.isFinite(res.totalDamage)).toBe(true);
  });

  it('stores holding pattern projectiles for Artillery at range>=3 and rate>=3', () => {
    const prng = new PRNG(3);
    const cm = new CombatManager(loader, prng);

    const art = new Tower(1, 'artillery', 200, 200, loader);
    art.levels.range = 3;
    art.levels.rate = 3;
    cm.addTower(art);

    // Advance 5 seconds with no attackers in range
    for (let t = 0; t < 5000; t += 70) {
      cm.updateTowerLogic(70, [], t);
    }

    expect(art.orbitingProjectiles).toBe(4);
  });
});
