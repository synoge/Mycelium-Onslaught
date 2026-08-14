import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { Tower } from '../src/sim/tower';
import { Attacker } from '../src/sim/attacker';
import { Projectile } from '../src/sim/projectile';
import { loadMap, MapDataRaw } from '../src/map/map';
import { RawBalanceJSON } from '../src/interfaces';

describe('Tower & Targeting & Damage (A-06, A-07)', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
  const loader = new BalanceLoader(rawBalance);

  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const classicMap = loadMap('Classic', rawMaps['Classic']);

  it('computes effective stats matching formula with mult_floor (0.2) and max(0, ...)', () => {
    const tower = new Tower(1, 'puffball', 100, 100, loader);
    const baseDamage = tower.getBaseStat('damage');

    // Without modifiers
    expect(tower.getEffectiveDamage()).toBe(baseDamage);

    // Negative multipliers down to -1.2 must floor multiplier term at 0.2
    tower.multDamage = -1.2;
    expect(tower.getEffectiveDamage()).toBeCloseTo(baseDamage * 0.2, 5);

    // Additive stacking: two +45% (+0.45 each) gives 1 + 0.90 = 1.90x
    tower.multDamage = 0.90;
    expect(tower.getEffectiveDamage()).toBeCloseTo(baseDamage * 1.90, 5);
  });

  it('selects the provably correct candidate for all 8 targeting modes', () => {
    const tower = new Tower(1, 'artillery', 200, 200, loader);
    tower.levels.range = 5; // broad range

    // 6 Candidates with distinct properties
    const createCandidate = (
      id: number,
      x: number,
      y: number,
      energy: number,
      speed: number,
      timeAlive: number
    ): Attacker => {
      const atk = new Attacker(
        {
          id,
          wave: 1,
          difficultySpeed: speed,
          hp: 1000,
          bounty: 10,
          tier: 0,
          cycle: 1,
          jitterOffset: 0,
        },
        classicMap
      );
      atk.x = x;
      atk.y = y;
      atk.energy = energy;
      atk.moveSpeed = speed;
      atk.timeAliveMs = timeAlive;
      return atk;
    };

    // Six distinct candidates placed around tower at (200, 200)
    // c1: Near (dist 20), High HP (500), Slow (20), Young (100ms)
    // c2: Far (dist 100), Low HP (10), Fast (120), Old (5000ms)
    // c3: Mid (dist 50), Lowest HP (5), Mid Speed (60), Mid Age (1000ms)
    // c4: Mid (dist 60), Highest HP (999), Slowest (10), Youngest (50ms)
    // c5: Mid (dist 70), Mid HP (200), Fastest (150), Mid Age (2000ms)
    // c6: Mid (dist 80), Mid HP (300), Mid Speed (50), Oldest (9000ms)
    const c1 = createCandidate(1, 200, 220, 500, 20, 100);
    const c2 = createCandidate(2, 200, 300, 10, 120, 5000);
    const c3 = createCandidate(3, 200, 250, 5, 60, 1000);
    const c4 = createCandidate(4, 200, 260, 999, 10, 50);
    const c5 = createCandidate(5, 200, 270, 200, 150, 2000);
    const c6 = createCandidate(6, 200, 280, 300, 50, 9000);

    const candidates = [c1, c2, c3, c4, c5, c6];

    tower.targetLock = false;

    tower.targetingMode = 'near';
    expect(tower.acquireTarget(candidates)?.id).toBe(1);

    tower.targetingMode = 'far';
    expect(tower.acquireTarget(candidates)?.id).toBe(2);

    tower.targetingMode = 'weak';
    expect(tower.acquireTarget(candidates)?.id).toBe(3);

    tower.targetingMode = 'strong';
    expect(tower.acquireTarget(candidates)?.id).toBe(4);

    tower.targetingMode = 'slow';
    expect(tower.acquireTarget(candidates)?.id).toBe(4);

    tower.targetingMode = 'fast';
    expect(tower.acquireTarget(candidates)?.id).toBe(5);

    tower.targetingMode = 'old';
    expect(tower.acquireTarget(candidates)?.id).toBe(6);

    tower.targetingMode = 'young';
    expect(tower.acquireTarget(candidates)?.id).toBe(4);
  });

  it('conserves damage precisely (damage dealt equals damage taken by attackers)', () => {
    const atk = new Attacker(
      {
        id: 1,
        wave: 1,
        difficultySpeed: 50,
        hp: 100,
        bounty: 10,
        tier: 0,
        cycle: 1,
        jitterOffset: 0,
      },
      classicMap
    );

    const proj1 = new Projectile({
      id: 1,
      sourceTowerId: 1,
      startX: 0,
      startY: 0,
      targetAttacker: atk,
      damage: 40,
      speed: 1000,
    });

    const res1 = proj1.update(1000, [atk]);
    expect(res1.damageDealt).toBe(40);
    expect(atk.energy).toBe(60);

    // Overkill damage
    const proj2 = new Projectile({
      id: 2,
      sourceTowerId: 1,
      startX: 0,
      startY: 0,
      targetAttacker: atk,
      damage: 80,
      speed: 1000,
    });

    const res2 = proj2.update(1000, [atk]);
    expect(res2.damageDealt).toBe(60); // Clamped to remaining energy
    expect(atk.energy).toBe(0);
    expect(atk.isDead).toBe(true);
  });
});
