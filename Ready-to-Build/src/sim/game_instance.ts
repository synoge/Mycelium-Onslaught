import { BalanceLoader } from '../balance/loader';
import { PRNG } from '../core/prng';
import { MultiSystemAccumulator } from '../core/ticker';
import { DifficultyKey, FamilyKey, RawBalanceJSON, StatTrack } from '../interfaces';
import { distance, GameMap, isBuildLegal, Point } from '../map/map';
import { CombatManager } from './combat_manager';
import { EconomyManager } from './economy';
import { ModifierManager, ModifierStructure } from './modifier';
import { Tower } from './tower';
import { WaveManager } from './wave';

export interface GameInput {
  timeMs: number;
  action: 'build_tower' | 'build_modifier' | 'upgrade_tower' | 'sell_tower' | 'send_wave' | 'relocate_tower';
  params?: any;
}

export class GameInstance {
  public readonly seed: number;
  public readonly difficulty: DifficultyKey;
  public readonly map: GameMap;
  public prng: PRNG;
  public loader: BalanceLoader;
  public accumulator: MultiSystemAccumulator;
  public waveManager: WaveManager;
  public combatManager: CombatManager;
  public modifierManager: ModifierManager;
  public economyManager: EconomyManager;

  public simTimeMs: number = 0;
  private nextStructureId: number = 1;
  public selectedTower: Tower | null = null;
  public selectedModifier: ModifierStructure | null = null;

  constructor(
    seed: number,
    difficulty: DifficultyKey,
    map: GameMap,
    rawBalance: RawBalanceJSON
  ) {
    this.seed = seed;
    this.difficulty = difficulty;
    this.map = map;
    this.prng = new PRNG(seed);
    this.loader = new BalanceLoader(rawBalance);
    this.accumulator = new MultiSystemAccumulator();
    this.waveManager = new WaveManager(this.loader, difficulty, map, this.prng);
    this.combatManager = new CombatManager(this.loader, this.prng);
    this.modifierManager = new ModifierManager();
    this.economyManager = new EconomyManager(this.loader, difficulty);

    // Auto-award bounties earned from kills
    this.combatManager.onBountyAwarded = (bounty: number) => {
      this.economyManager.award(bounty);
    };
  }

  public step(deltaMs: number): void {
    if (this.economyManager.isGameOver) return;

    this.simTimeMs += deltaMs;

    this.accumulator.advance(deltaMs, {
      onMovementTick: (dt) => {
        const { baseHits, deadAttackers } = this.waveManager.updateMovement(dt);
        for (let i = 0; i < baseHits; i++) {
          this.economyManager.onAttackerReachedBase();
        }
      },
      onTowerTick: (dt) => {
        this.combatManager.updateTowerLogic(dt, this.waveManager.attackers, this.simTimeMs);
        this.combatManager.updateProjectiles(dt, this.waveManager.attackers);
      },
      onSpawningTick: (dt) => {
        this.waveManager.updateSpawningTick(dt);
      },
    });
  }

  public buildTower(familyKey: FamilyKey, x: number, y: number): Tower {
    const cost = this.loader.getFamily(familyKey).build_cost;
    if (!this.economyManager.canAfford(cost)) {
      throw new Error('Cannot afford tower');
    }

    const allStructures = [
      ...this.combatManager.towers.map((t) => ({ x: t.x, y: t.y, footprintRadius: t.footprintRadius })),
      // non-balance: modifier footprint radius
      ...this.modifierManager['modifiers'].map((m) => ({ x: m.x, y: m.y, footprintRadius: 16 })),
    ];

    // non-balance: footprint radius 16
    const fp = 16;
    if (!isBuildLegal({ x, y }, fp, this.map, allStructures)) {
      throw new Error('Build location illegal');
    }

    this.economyManager.buyTower(familyKey);
    const tower = new Tower(this.nextStructureId++, familyKey, x, y, this.loader);
    tower.placedTimeMs = this.simTimeMs;
    this.combatManager.addTower(tower);
    this.modifierManager.registerTower(tower);
    return tower;
  }

  public buildModifier(nameOrIndex: string | number, x: number, y: number): ModifierStructure {
    const cost = this.loader.getModifier(nameOrIndex).cost;
    if (!this.economyManager.canAfford(cost)) {
      throw new Error('Cannot afford modifier');
    }

    const allStructures = [
      ...this.combatManager.towers.map((t) => ({ x: t.x, y: t.y, footprintRadius: t.footprintRadius })),
      // non-balance: modifier footprint radius
      ...this.modifierManager['modifiers'].map((m) => ({ x: m.x, y: m.y, footprintRadius: 16 })),
    ];

    // non-balance: footprint radius 16
    const fp = 16;
    if (!isBuildLegal({ x, y }, fp, this.map, allStructures)) {
      throw new Error('Build location illegal');
    }

    this.economyManager.buyModifier(nameOrIndex);
    const mod = new ModifierStructure(this.nextStructureId++, nameOrIndex, x, y, this.loader);
    this.modifierManager.addModifier(mod);
    return mod;
  }

  public upgradeTower(tower: Tower, track: StatTrack): void {
    this.economyManager.upgradeTower(tower, track);
    this.modifierManager.onStructureChanged();
  }

  public sellTower(tower: Tower): void {
    this.economyManager.sellTower(tower, this.simTimeMs);
    this.combatManager.removeTower(tower.id);
    this.modifierManager.unregisterTower(tower.id);
    if (this.selectedTower?.id === tower.id) {
      this.selectedTower = null;
    }
  }

  public sellModifier(modifier: ModifierStructure): void {
    this.economyManager.sellModifier(modifier);
    this.modifierManager.removeModifier(modifier.id);
    if (this.selectedModifier?.id === modifier.id) {
      this.selectedModifier = null;
    }
  }

  public sendWaveNow(): number {
    return this.waveManager.triggerWave();
  }

  /**
   * Generates a deterministic state snapshot hash string.
   */
  public getStateHash(): string {
    // non-balance: decimal formatting for state hashing
    const dec = 4;
    const atkSnapshots = this.waveManager.attackers.map((a) =>
      // non-balance: decimal formatting
      `${a.id}:${a.x.toFixed(dec)},${a.y.toFixed(dec)},${a.energy.toFixed(dec)},${a.moveSpeed.toFixed(dec)}`
    ).join(';');

    const towerSnapshots = this.combatManager.towers.map((t) =>
      `${t.id}:${t.familyKey}:${t.levels.damage},${t.levels.range},${t.levels.rate}:${t.x.toFixed(2)},${t.y.toFixed(2)}`
    ).join(';');

    return `cash=${this.economyManager.cash.toFixed(2)}|lives=${this.economyManager.lives}|wave=${this.waveManager.currentWaveNum}|dmg=${this.combatManager.totalDamageDealt.toFixed(2)}|towers=[${towerSnapshots}]|atks=[${atkSnapshots}]`;
  }
}
