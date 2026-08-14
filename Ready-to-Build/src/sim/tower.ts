import { BalanceLoader } from '../balance/loader';
import { FamilyColour, FamilyKey, StatTrack } from '../interfaces';
import { distance, Point } from '../map/map';
import { Attacker } from './attacker';

export type TargetingMode =
  | 'near'
  | 'far'
  | 'weak'
  | 'strong'
  | 'slow'
  | 'fast'
  | 'old'
  | 'young';

export type ConeMode = 'full' | 'wide' | 'medium' | 'narrow';

// Cone opening angles in radians
export const CONE_ANGLES: Record<ConeMode, number> = {
  full: Math.PI * 2,
  wide: Math.PI,
  medium: Math.PI / 2,
  // non-balance: 45 degree narrow cone in radians
  narrow: Math.PI / 4,
};

export interface TowerStats {
  damage: number;
  range: number;
  rate: number;
}

export interface TowerLevelState {
  damage: number;
  range: number;
  rate: number;
}

export class Tower {
  public readonly id: number;
  public readonly familyKey: FamilyKey;
  public readonly colour: FamilyColour;
  public x: number;
  public y: number;
  // non-balance: tower footprint radius in logical pixels
  public readonly footprintRadius: number = 16;

  // Levels on the 3 independent upgrade tracks (1-indexed)
  public levels: TowerLevelState = {
    damage: 1,
    range: 1,
    rate: 1,
  };

  // Targeting configuration
  public targetingMode: TargetingMode = 'near';
  public targetLock: boolean = true;
  public coneMode: ConeMode = 'full';
  public aimAngle: number = 0; // Aim direction in radians

  // Runtime target
  public currentTarget: Attacker | null = null;
  public rechargeTimerMs: number = 0;
  public comboRechargeTimerMs: number = 0;

  // Modifiers affecting this tower
  public addedRange: number = 0;
  public multDamage: number = 0;
  public multRange: number = 0;
  public multRate: number = 0;
  public comboMults: number[] = [];

  // Signature ability states
  public claimedThisShot: boolean = false; // Laser chain per-shot claim mark (ENGINE-SPEC §7.1)
  public orbitingProjectiles: number = 0; // Holding pattern (Artillery §7.2)
  public freakoutActive: boolean = false; // Freak-out state (Puffball & Cordyceps §7.3)
  public freakoutTimerMs: number = 0;
  public nextFreakoutTimeMs: number = 0;

  // Total investment tracking for economy resale (ENGINE-SPEC §8)
  public totalSpent: number;

  private loader: BalanceLoader;

  constructor(id: number, familyKey: FamilyKey, x: number, y: number, loader: BalanceLoader) {
    this.id = id;
    this.familyKey = familyKey;
    const fam = loader.getFamily(familyKey);
    this.colour = fam.colour;
    this.x = x;
    this.y = y;
    this.loader = loader;
    this.totalSpent = fam.build_cost;
  }

  public isComboCapable(): boolean {
    // ENGINE-SPEC §6.1: damage track level >= bloom_level (8)
    return this.levels.damage >= this.loader.constants.bloom_level;
  }

  public getBaseStat(track: StatTrack): number {
    const fam = this.loader.getFamily(this.familyKey);
    if (track === 'damage') return this.loader.getDamageAt(this.familyKey, this.levels.damage);
    if (track === 'range') return this.loader.getRangeAt(this.familyKey, this.levels.range);
    if (track === 'rate') return this.loader.getRateAt(this.familyKey, this.levels.rate);
    return fam.base[track];
  }

  public getEffectiveDamage(): number {
    let base = this.getBaseStat('damage');
    let mult = this.multDamage;
    if (this.freakoutActive) {
      // Freak-out 3x damage (ENGINE-SPEC §7.3)
      // non-balance: 3x freak-out damage multiplier
      base *= 3;
    }
    return this.loader.calculateEffectiveStat(base, [], [mult]);
  }

  public getEffectiveRange(): number {
    const base = this.getBaseStat('range');
    return this.loader.calculateEffectiveStat(base, [this.addedRange], [this.multRange]);
  }

  public getEffectiveRate(): number {
    let base = this.getBaseStat('rate');
    let mult = this.multRate;
    if (this.freakoutActive) {
      // Freak-out 4x rate (ENGINE-SPEC §7.3)
      // non-balance: 4x freak-out rate multiplier
      base *= 4;
    }
    return this.loader.calculateEffectiveStat(base, [], [mult]);
  }

  public getFireIntervalMs(): number {
    const effRate = this.getEffectiveRate();
    if (effRate <= 0) return Infinity;
    // non-balance: 60,000 ms per minute for rate in rpm from ENGINE-SPEC §4.2
    const msPerMinute = 60000;
    return msPerMinute / effRate;
  }

  public canHitAttacker(attacker: Attacker): boolean {
    if (attacker.isDead || attacker.reachedBase) return false;
    const dist = distance({ x: this.x, y: this.y }, { x: attacker.x, y: attacker.y });
    if (dist > this.getEffectiveRange()) return false;

    if (this.coneMode !== 'full') {
      const angleToAttacker = Math.atan2(attacker.y - this.y, attacker.x - this.x);
      let diff = angleToAttacker - this.aimAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const halfCone = CONE_ANGLES[this.coneMode] / 2;
      if (Math.abs(diff) > halfCone) return false;
    }

    return true;
  }

  public acquireTarget(candidates: Attacker[]): Attacker | null {
    // If targetLock is on and current target is still valid, retain it
    if (this.targetLock && this.currentTarget && this.canHitAttacker(this.currentTarget)) {
      return this.currentTarget;
    }

    const inRange = candidates.filter((a) => this.canHitAttacker(a));
    if (inRange.length === 0) {
      this.currentTarget = null;
      return null;
    }

    const towerPos = { x: this.x, y: this.y };

    switch (this.targetingMode) {
      case 'near':
        inRange.sort((a, b) => distance(towerPos, a) - distance(towerPos, b));
        break;
      case 'far':
        inRange.sort((a, b) => distance(towerPos, b) - distance(towerPos, a));
        break;
      case 'weak':
        inRange.sort((a, b) => a.energy - b.energy);
        break;
      case 'strong':
        inRange.sort((a, b) => b.energy - a.energy);
        break;
      case 'slow':
        inRange.sort((a, b) => a.moveSpeed - b.moveSpeed);
        break;
      case 'fast':
        inRange.sort((a, b) => b.moveSpeed - a.moveSpeed);
        break;
      case 'old':
        inRange.sort((a, b) => b.timeAliveMs - a.timeAliveMs);
        break;
      case 'young':
        inRange.sort((a, b) => a.timeAliveMs - b.timeAliveMs);
        break;
    }

    this.currentTarget = inRange[0];
    return this.currentTarget;
  }

  public upgradeTrack(track: StatTrack): number {
    const cost = this.loader.getUpgradeCost(this.familyKey, track, this.levels[track]);
    this.levels[track] += 1;
    this.totalSpent += cost;
    return cost;
  }
}
