import { BalanceLoader } from '../balance/loader';
import { ModifierData } from '../interfaces';
import { distance, Point } from '../map/map';
import { Tower } from './tower';

export class ModifierStructure {
  public readonly id: number;
  public readonly name: string;
  public readonly data: ModifierData;
  public x: number;
  public y: number;
  // non-balance: footprint radius in logical pixels
  public readonly footprintRadius: number = 16;
  public level: number = 1;
  // non-balance: base modifier aura radius in logical pixels from PRD §2.2
  public range: number = 80;
  public totalSpent: number;

  constructor(id: number, nameOrIndex: string | number, x: number, y: number, loader: BalanceLoader) {
    this.id = id;
    this.data = loader.getModifier(nameOrIndex);
    this.name = this.data.name;
    this.x = x;
    this.y = y;
    this.totalSpent = this.data.cost;
    // non-balance: base modifier range 80
    this.range = 80;
  }

  public upgrade(): void {
    if (this.level === 1) {
      this.level = 2;
      // non-balance: modifier upgrade range 130 from PRD §2.2
      this.range = 130;
      this.totalSpent += this.data.cost;
    }
  }

  public isTowerInRange(tower: Tower): boolean {
    const d = distance({ x: this.x, y: this.y }, { x: tower.x, y: tower.y });
    return d <= this.range;
  }
}

export class ModifierManager {
  private modifiers: ModifierStructure[] = [];
  private towers: Tower[] = [];
  public recomputationCount: number = 0;

  constructor() {}

  public registerTower(tower: Tower): void {
    this.towers.push(tower);
    this.recomputeAll();
  }

  public unregisterTower(towerId: number): void {
    this.towers = this.towers.filter((t) => t.id !== towerId);
    this.recomputeAll();
  }

  public addModifier(modifier: ModifierStructure): void {
    this.modifiers.push(modifier);
    this.recomputeAll();
  }

  public removeModifier(modifierId: number): void {
    this.modifiers = this.modifiers.filter((m) => m.id !== modifierId);
    this.recomputeAll();
  }

  public onStructureChanged(): void {
    this.recomputeAll();
  }

  /**
   * Recomputes modifier accumulators for all towers on change only.
   * Never polled during simulation ticks.
   */
  public recomputeAll(): void {
    this.recomputationCount++;

    for (const tower of this.towers) {
      let addedRange = 0;
      let multDamage = 0;
      let multRange = 0;
      let multRate = 0;
      const comboMults: number[] = [];

      for (const mod of this.modifiers) {
        if (mod.isTowerInRange(tower)) {
          addedRange += mod.data.range_added;
          multDamage += mod.data.damage_mult;
          multRange += mod.data.range_mult;
          multRate += mod.data.rate_mult;
          if (mod.data.combo_mult !== 1.0) {
            comboMults.push(mod.data.combo_mult);
          }
        }
      }

      tower.addedRange = addedRange;
      tower.multDamage = multDamage;
      tower.multRange = multRange;
      tower.multRate = multRate;
      tower.comboMults = comboMults;
    }
  }
}
