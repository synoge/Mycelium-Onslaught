import { BalanceLoader } from '../balance/loader';
import { DifficultyKey, FamilyKey, StatTrack } from '../interfaces';
import { ModifierStructure } from './modifier';
import { Tower } from './tower';

export class EconomyManager {
  public cash: number;
  public lives: number;
  public readonly startingCash: number;
  public isGameOver: boolean = false;
  private loader: BalanceLoader;

  constructor(loader: BalanceLoader, difficulty: DifficultyKey) {
    this.loader = loader;
    this.startingCash = loader.getDifficulty(difficulty).params.start_cash;
    this.cash = this.startingCash;
    this.lives = loader.constants.lives;
  }

  public canAfford(amount: number): boolean {
    return this.cash >= amount;
  }

  public deduct(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.cash -= amount;
    return true;
  }

  public award(amount: number): void {
    if (amount > 0) {
      this.cash += amount;
    }
  }

  public buyTower(familyKey: FamilyKey): number {
    const cost = this.loader.getFamily(familyKey).build_cost;
    if (!this.deduct(cost)) {
      throw new Error(`Cannot afford ${familyKey} tower (cost: ${cost}, cash: ${this.cash})`);
    }
    return cost;
  }

  public buyModifier(nameOrIndex: string | number): number {
    const cost = this.loader.getModifier(nameOrIndex).cost;
    if (!this.deduct(cost)) {
      throw new Error(`Cannot afford modifier (cost: ${cost}, cash: ${this.cash})`);
    }
    return cost;
  }

  public upgradeTower(tower: Tower, track: StatTrack): number {
    const cost = this.loader.getUpgradeCost(tower.familyKey, track, tower.levels[track]);
    if (!this.deduct(cost)) {
      throw new Error(`Cannot afford upgrade on ${track} (cost: ${cost}, cash: ${this.cash})`);
    }
    tower.upgradeTrack(track);
    return cost;
  }

  public sellTower(tower: Tower, simTimeMs?: number): number {
    // 3-Second Misclick Undo Buffer: 100% refund if sold within 3s without firing
    // non-balance: 3000ms undo window
    const isUndo = simTimeMs !== undefined && (simTimeMs - tower.placedTimeMs) <= 3000 && !tower.hasFired;
    const resaleAmount = isUndo
      ? tower.totalSpent
      : Math.floor(tower.totalSpent * this.loader.constants.resale);

    this.award(resaleAmount);
    return resaleAmount;
  }

  public sellModifier(modifier: ModifierStructure): number {
    const resaleAmount = Math.floor(modifier.totalSpent * this.loader.constants.resale);
    this.award(resaleAmount);
    return resaleAmount;
  }

  public getRelocateCost(buildCost: number): number {
    // ENGINE-SPEC §8: build_cost * relocate_cost_x_build (6x)
    return buildCost * this.loader.constants.relocate_cost_x_build;
  }

  public relocateTower(tower: Tower): number {
    const buildCost = this.loader.getFamily(tower.familyKey).build_cost;
    const cost = this.getRelocateCost(buildCost);
    if (!this.deduct(cost)) {
      throw new Error(`Cannot afford relocation (cost: ${cost}, cash: ${this.cash})`);
    }
    return cost;
  }

  public relocateModifier(modifier: ModifierStructure): number {
    const buildCost = modifier.data.cost;
    const cost = this.getRelocateCost(buildCost);
    if (!this.deduct(cost)) {
      throw new Error(`Cannot afford relocation (cost: ${cost}, cash: ${this.cash})`);
    }
    return cost;
  }

  public onAttackerReachedBase(): void {
    if (this.lives > 0) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.lives = 0;
        this.isGameOver = true;
      }
    }
  }
}
