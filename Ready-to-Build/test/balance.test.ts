import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { RawBalanceJSON } from '../src/interfaces';

describe('BalanceLoader', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));

  it('loads valid balance.json successfully', () => {
    const loader = new BalanceLoader(rawBalance);
    expect(loader.constants.bloom_level).toBe(8);
    expect(loader.constants.combo_radius).toBe(70);
    expect(loader.getFamily('puffball').colour).toBe('cyan');
  });

  it('throws loud error on corrupted schema', () => {
    expect(() => new BalanceLoader({} as any)).toThrow();
    expect(() => new BalanceLoader({ constants: {} } as any)).toThrow();
    expect(() => new BalanceLoader({ ...rawBalance, families: {} } as any)).toThrow();
  });

  it('evaluates level 20 damage and costs matching closed form', () => {
    const loader = new BalanceLoader(rawBalance);
    const dmg20 = loader.getDamageAt('artillery', 20);
    expect(dmg20).toBeGreaterThan(loader.getDamageAt('artillery', 14));
    expect(Number.isFinite(dmg20)).toBe(true);

    const cost20 = loader.getUpgradeCost('artillery', 'damage', 20);
    expect(cost20).toBeGreaterThan(loader.getUpgradeCost('artillery', 'damage', 14));
    expect(Number.isFinite(cost20)).toBe(true);
  });
});
