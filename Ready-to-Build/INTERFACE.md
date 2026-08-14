# Interface Agreement: Balance Loader Contract

This contract defines the typed interface between the Balance Loader (Lane A) and the Verification & Engine systems (Lanes B, C, D, Engine). Both lanes build strictly to this specification.

---

## 1. Type Definitions

```typescript
export type FamilyKey = 'puffball' | 'foxfire' | 'artillery' | 'cordyceps';
export type FamilyColour = 'cyan' | 'green' | 'crimson' | 'amber';
export type StatTrack = 'damage' | 'range' | 'rate';
export type DifficultyKey = 'sprout' | 'bloom' | 'spread' | 'dominion';

export interface PowerModelConfig {
  formula: string;
  range_reference: number;
}

export interface BalanceConstants {
  sigma: number;
  bloom_level: number;
  mult_floor: number;
  base_hp: number;
  wave_size: number;
  lives: number;
  combo_radius: number;
  resale: number;
  relocate_cost_x_build: number;
  wave_interval_ms: number;
  spawn_interval_ms: number;
}

export interface LadderRow {
  level: number;
  value: number;
  cost: number;
  cumulative: number;
}

export interface FamilyData {
  label: string;
  colour: FamilyColour;
  build_cost: number;
  base: {
    damage: number;
    range: number;
    rate: number;
  };
  base_power: number;
  cost_per_base_power: number;
  caps: {
    range: number;
    rate: number;
  };
  phi: number;
  bloom_price_per_power: number;
  cost_coefficient: number;
  bloom_cost: number;
  power_at_bloom: number;
  ladders: {
    damage: LadderRow[];
    range: LadderRow[];
    rate: LadderRow[];
  };
}

export interface DifficultyParams {
  label: string;
  g0: number;
  g_inf: number;
  tau: number;
  rho: number;
  speed: number;
  sigma: number;
  start_cash: number;
}

export interface DifficultySample {
  wave: number;
  hp: number;
  bounty: number;
  wave_income: number;
  growth: number;
}

export interface DifficultyData {
  label: string;
  params: DifficultyParams;
  samples: DifficultySample[];
}

export interface ModifierData {
  name: string;
  cost: number;
  damage_mult: number;
  range_mult: number;
  rate_mult: number;
  range_added: number;
  combo_mult: number;
}

export interface ComboRequirement {
  [colour: string]: number;
}

export interface ComboData {
  key: string;
  lead: FamilyColour;
  requires: ComboRequirement;
  specificity: number;
  yield: number;
  recharge_ms: number;
}

export interface RawBalanceJSON {
  _generated_by: string;
  _note: string;
  power_model: PowerModelConfig;
  constants: BalanceConstants;
  families: Record<FamilyKey, FamilyData>;
  difficulties: Record<DifficultyKey, DifficultyData>;
  modifiers: ModifierData[];
  combos: ComboData[];
  combo_dispatch_rule: string;
}
```

---

## 2. Loader Functions & Contract

```typescript
export interface IBalanceLoader {
  readonly constants: BalanceConstants;
  readonly families: Record<FamilyKey, FamilyData>;
  readonly difficulties: Record<DifficultyKey, DifficultyData>;
  readonly modifiers: ModifierData[];
  readonly combos: ComboData[];

  getFamily(key: FamilyKey): FamilyData;
  getDifficulty(key: DifficultyKey): DifficultyData;
  getModifier(nameOrIndex: string | number): ModifierData;
  getCombo(key: string): ComboData | undefined;

  // Ladder evaluation with closed-form extension past tabulated level 14
  getDamageAt(family: FamilyKey, level: number): number;
  getRangeAt(family: FamilyKey, level: number): number;
  getRateAt(family: FamilyKey, level: number): number;
  getUpgradeCost(family: FamilyKey, stat: StatTrack, currentLevel: number): number;

  // Wave growth & hp calculation (closed form and incremental step)
  getGrowth(difficulty: DifficultyKey, wave: number): number;
  getWaveHP(difficulty: DifficultyKey, wave: number): number;
  getWaveBounty(difficulty: DifficultyKey, wave: number): number;

  // Effective stat formula
  calculateEffectiveStat(base: number, added: number[], mults: number[]): number;

  // Combo dispatch algorithm
  dispatchCombo(leadColour: FamilyColour, surroundingCounts: Record<string, number>): ComboData | null;
}
```
