import {
  BalanceConstants,
  ComboData,
  DifficultyData,
  DifficultyKey,
  FamilyColour,
  FamilyData,
  FamilyKey,
  IBalanceLoader,
  ModifierData,
  RawBalanceJSON,
  StatTrack,
} from '../interfaces';

export class BalanceLoader implements IBalanceLoader {
  public readonly constants: BalanceConstants;
  public readonly families: Record<FamilyKey, FamilyData>;
  public readonly difficulties: Record<DifficultyKey, DifficultyData>;
  public readonly modifiers: ModifierData[];
  public readonly combos: ComboData[];
  private readonly rangeReference: number;

  constructor(raw: RawBalanceJSON) {
    this.validateSchema(raw);

    this.constants = raw.constants;
    this.families = raw.families;
    this.difficulties = raw.difficulties;
    this.modifiers = raw.modifiers;
    this.combos = raw.combos;
    this.rangeReference = raw.power_model.range_reference;
  }

  private validateSchema(raw: any): void {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Balance data must be a non-null object');
    }
    if (!raw.constants || typeof raw.constants !== 'object') {
      throw new Error('Missing constants section in balance data');
    }
    if (!raw.families || typeof raw.families !== 'object') {
      throw new Error('Missing families section in balance data');
    }
    if (!raw.difficulties || typeof raw.difficulties !== 'object') {
      throw new Error('Missing difficulties section in balance data');
    }
    if (!Array.isArray(raw.modifiers)) {
      throw new Error('Missing or invalid modifiers array in balance data');
    }
    if (!Array.isArray(raw.combos)) {
      throw new Error('Missing or invalid combos array in balance data');
    }

    const requiredFamilies: FamilyKey[] = ['puffball', 'foxfire', 'artillery', 'cordyceps'];
    for (const fam of requiredFamilies) {
      if (!raw.families[fam] || !raw.families[fam].ladders) {
        throw new Error(`Invalid or missing family definition for ${fam}`);
      }
    }

    const requiredDifficulties: DifficultyKey[] = ['sprout', 'bloom', 'spread', 'dominion'];
    for (const diff of requiredDifficulties) {
      if (!raw.difficulties[diff] || !raw.difficulties[diff].params) {
        throw new Error(`Invalid or missing difficulty definition for ${diff}`);
      }
    }
  }

  public getFamily(key: FamilyKey): FamilyData {
    const fam = this.families[key];
    if (!fam) throw new Error(`Unknown family key: ${key}`);
    return fam;
  }

  public getDifficulty(key: DifficultyKey): DifficultyData {
    const diff = this.difficulties[key];
    if (!diff) throw new Error(`Unknown difficulty key: ${key}`);
    return diff;
  }

  public getModifier(nameOrIndex: string | number): ModifierData {
    if (typeof nameOrIndex === 'number') {
      const mod = this.modifiers[nameOrIndex];
      if (!mod) throw new Error(`Modifier index out of bounds: ${nameOrIndex}`);
      return mod;
    }
    const found = this.modifiers.find((m) => m.name === nameOrIndex);
    if (!found) throw new Error(`Unknown modifier: ${nameOrIndex}`);
    return found;
  }

  public getCombo(key: string): ComboData | undefined {
    return this.combos.find((c) => c.key === key);
  }

  private calculatePower(dmg: number, rateRpm: number, rng: number): number {
    // non-balance: 60 seconds per minute rate conversion factor
    const secondsPerMinute = 60;
    return dmg * (rateRpm / secondsPerMinute) * Math.sqrt(rng / this.rangeReference);
  }

  public getDamageAt(family: FamilyKey, level: number): number {
    if (level < 1) throw new Error(`Level must be >= 1, got ${level}`);
    const fam = this.getFamily(family);
    if (level <= fam.ladders.damage.length) {
      return fam.ladders.damage[level - 1].value;
    }
    // Closed form: d0 * (phi ^ level)
    const d0 = fam.base.damage;
    const phi = fam.phi;
    // non-balance: round to 1 decimal place matching table specification
    return Math.round(d0 * Math.pow(phi, level) * 10) / 10;
  }

  public getRangeAt(family: FamilyKey, level: number): number {
    if (level < 1) throw new Error(`Level must be >= 1, got ${level}`);
    const fam = this.getFamily(family);
    if (level <= fam.ladders.range.length) {
      return fam.ladders.range[level - 1].value;
    }
    const r0 = fam.base.range;
    const rInf = fam.caps.range;
    const r1 = fam.ladders.range[0].value;
    const kappa = -1 / Math.log((rInf - r1) / (rInf - r0));
    const val = rInf - (rInf - r0) * Math.exp(-level / kappa);
    // non-balance: round to 1 decimal place
    return Math.round(val * 10) / 10;
  }

  public getRateAt(family: FamilyKey, level: number): number {
    if (level < 1) throw new Error(`Level must be >= 1, got ${level}`);
    const fam = this.getFamily(family);
    if (level <= fam.ladders.rate.length) {
      return fam.ladders.rate[level - 1].value;
    }
    const f0 = fam.base.rate;
    const fInf = fam.caps.rate;
    const f1 = fam.ladders.rate[0].value;
    const lam = -1 / Math.log((fInf - f1) / (fInf - f0));
    const val = fInf - (fInf - f0) * Math.exp(-level / lam);
    // non-balance: round to 1 decimal place
    return Math.round(val * 10) / 10;
  }

  private relGain(family: FamilyKey, stat: StatTrack, n: number): number {
    const fam = this.getFamily(family);
    const d0 = fam.base.damage;
    const f0 = fam.base.rate;
    const r0 = fam.base.range;
    const rInf = fam.caps.range;
    const fInf = fam.caps.rate;
    const r1 = fam.ladders.range[0].value;
    const f1 = fam.ladders.rate[0].value;

    const kappa = -1 / Math.log((rInf - r1) / (rInf - r0));
    const lam = -1 / Math.log((fInf - f1) / (fInf - f0));

    const base = this.calculatePower(d0, f0, r0);

    const dmgFn = (idx: number) => d0 * Math.pow(fam.phi, idx);
    const rngFn = (idx: number) => rInf - (rInf - r0) * Math.exp(-idx / kappa);
    const rateFn = (idx: number) => fInf - (fInf - f0) * Math.exp(-idx / lam);

    const lvA = { damage: 0, range: 0, rate: 0 };
    lvA[stat] = n;
    const pA = this.calculatePower(dmgFn(lvA.damage), rateFn(lvA.rate), rngFn(lvA.range));

    const lvB = { damage: 0, range: 0, rate: 0 };
    lvB[stat] = n + 1;
    const pB = this.calculatePower(dmgFn(lvB.damage), rateFn(lvB.rate), rngFn(lvB.range));

    return (pB - pA) / base;
  }

  public getUpgradeCost(family: FamilyKey, stat: StatTrack, currentLevel: number): number {
    if (currentLevel < 1) throw new Error(`Current level must be >= 1, got ${currentLevel}`);
    const fam = this.getFamily(family);
    if (currentLevel <= fam.ladders[stat].length) {
      return fam.ladders[stat][currentLevel - 1].cost;
    }
    const n = currentLevel - 1;
    const k = fam.cost_coefficient;
    const sigma = this.constants.sigma;
    const gain = this.relGain(family, stat, n);
    return Math.max(1, Math.round(k * gain * Math.pow(sigma, n)));
  }

  public getGrowth(difficulty: DifficultyKey, wave: number): number {
    const d = this.getDifficulty(difficulty).params;
    return d.g_inf + (d.g0 - d.g_inf) * Math.exp(-(wave - 1) / d.tau);
  }

  public getWaveHP(difficulty: DifficultyKey, wave: number): number {
    let hp = this.constants.base_hp;
    for (let w = 1; w <= wave; w++) {
      hp *= this.getGrowth(difficulty, w);
    }
    return hp;
  }

  public getWaveBounty(difficulty: DifficultyKey, wave: number): number {
    const hp = this.getWaveHP(difficulty, wave);
    const rho = this.getDifficulty(difficulty).params.rho;
    return rho * hp;
  }

  public calculateEffectiveStat(base: number, added: number[], mults: number[]): number {
    const sumAdded = added.reduce((acc, val) => acc + val, 0);
    const sumMult = mults.reduce((acc, val) => acc + val, 0);
    const multTerm = Math.max(this.constants.mult_floor, 1 + sumMult);
    return Math.max(0, (base + sumAdded) * multTerm);
  }

  public dispatchCombo(
    leadColour: FamilyColour,
    surroundingCounts: Record<string, number>
  ): ComboData | null {
    const candidates = this.combos.filter((c) => {
      if (c.lead !== leadColour) return false;
      for (const [colour, requiredCount] of Object.entries(c.requires)) {
        const available = surroundingCounts[colour] || 0;
        if (available < requiredCount) return false;
      }
      return true;
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (b.specificity !== a.specificity) {
        return b.specificity - a.specificity;
      }
      return b.yield - a.yield;
    });

    return candidates[0];
  }
}
