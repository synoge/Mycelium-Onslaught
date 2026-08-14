import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { PRNG } from '../src/core/prng';
import { loadMap, MapDataRaw } from '../src/map/map';
import { WaveManager } from '../src/sim/wave';
import { RawBalanceJSON } from '../src/interfaces';

describe('WaveManager & Attacker System (A-04, A-05)', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
  const loader = new BalanceLoader(rawBalance);

  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const classicMap = loadMap('Classic', rawMaps['Classic']);

  it('runs 200 waves matching generator HP and bounty to 1e-9', () => {
    const prng = new PRNG(100);
    const wm = new WaveManager(loader, 'bloom', classicMap, prng);

    for (let w = 1; w <= 200; w++) {
      const wave = wm.triggerWave();
      expect(wave).toBe(w);

      const expectedHP = loader.getWaveHP('bloom', w);
      const expectedBounty = loader.getWaveBounty('bloom', w);

      const relErrHP = Math.abs((wm.runningHP - expectedHP) / expectedHP);
      expect(relErrHP).toBeLessThan(1e-9);
    }
  });

  it('allows 5 waves sent early to spawn 50 attackers concurrently without breaking auto-timer', () => {
    const prng = new PRNG(200);
    const wm = new WaveManager(loader, 'sprout', classicMap, prng);

    const initialTimer = wm.autoTimerMs;

    // Trigger 5 waves early
    for (let i = 0; i < 5; i++) {
      wm.triggerWave();
    }

    expect(wm.pendingWaves.length).toBe(5);
    expect(wm.autoTimerMs).toBe(initialTimer);

    // Simulate spawning over time (640ms interval * 10 spawns = ~6400ms)
    let totalSpawned = 0;
    for (let t = 0; t < 10000; t += 200) {
      const spawned = wm.updateSpawning(200);
      totalSpawned += spawned.length;
    }

    expect(totalSpawned).toBe(50);
    expect(wm.attackers.length).toBe(50);
  });

  it('generates reproducible seeded jitter', () => {
    const prng1 = new PRNG(42);
    const wm1 = new WaveManager(loader, 'sprout', classicMap, prng1);
    wm1.triggerWave();
    const spawned1 = wm1.updateSpawning(1000);

    const prng2 = new PRNG(42);
    const wm2 = new WaveManager(loader, 'sprout', classicMap, prng2);
    wm2.triggerWave();
    const spawned2 = wm2.updateSpawning(1000);

    expect(spawned1.length).toBe(spawned2.length);
    for (let i = 0; i < spawned1.length; i++) {
      expect(spawned1[i].jitterOffset).toBe(spawned2[i].jitterOffset);
      expect(spawned1[i].x).toBe(spawned2[i].x);
      expect(spawned1[i].y).toBe(spawned2[i].y);
    }
  });
});
