import { BalanceLoader } from '../balance/loader';
import { PRNG } from '../core/prng';
import { DifficultyKey } from '../interfaces';
import { GameMap } from '../map/map';
import { Attacker, MAX_WAYPOINT_JITTER } from './attacker';

export interface PendingSpawn {
  wave: number;
  hp: number;
  bounty: number;
  tier: number;
  cycle: number;
  difficultySpeed: number;
  remainingToSpawn: number;
  timeUntilNextSpawnMs: number;
}

export class WaveManager {
  private loader: BalanceLoader;
  private difficulty: DifficultyKey;
  private map: GameMap;
  private prng: PRNG;

  public currentWaveNum: number = 0;
  public runningHP: number = 0;
  public autoTimerMs: number = 0;
  public isRunning: boolean = true;

  // Active attackers on the road
  public attackers: Attacker[] = [];
  // Pending spawn queues for overlapping waves
  public pendingWaves: PendingSpawn[] = [];

  private nextAttackerId: number = 1;

  constructor(loader: BalanceLoader, difficulty: DifficultyKey, map: GameMap, prng: PRNG) {
    this.loader = loader;
    this.difficulty = difficulty;
    this.map = map;
    this.prng = prng;
    this.runningHP = loader.constants.base_hp;
    this.autoTimerMs = loader.constants.wave_interval_ms;
  }

  /**
   * Triggers the start of the next wave.
   * Can be invoked by the auto-timer or manually by the player ("send now").
   * Overlapping waves are queued concurrently without resetting the auto-timer.
   */
  public triggerWave(): number {
    this.currentWaveNum += 1;
    const wave = this.currentWaveNum;

    // Incremental HP calculation per ENGINE-SPEC §3.2
    const growth = this.loader.getGrowth(this.difficulty, wave);
    this.runningHP *= growth;
    const hp = this.runningHP;
    const rho = this.loader.getDifficulty(this.difficulty).params.rho;
    const bounty = rho * hp;

    // non-balance: 9 tiers per cycle
    const tier = (wave - 1) % 9;
    // non-balance: cycle calculation formula
    const cycle = Math.floor((wave - 1) / 9) + 1;
    const speed = this.loader.getDifficulty(this.difficulty).params.speed;

    this.pendingWaves.push({
      wave,
      hp,
      bounty,
      tier,
      cycle,
      difficultySpeed: speed,
      remainingToSpawn: this.loader.constants.wave_size,
      timeUntilNextSpawnMs: 0, // First attacker spawns immediately
    });

    return wave;
  }

  public updateSpawning(deltaMs: number): Attacker[] {
    return this.updateSpawningTick(deltaMs);
  }

  /**
   * Advances the auto-send timer and spawns pending attackers on the 200ms spawning tick accumulator.
   */
  public updateSpawningTick(deltaMs: number): Attacker[] {
    if (!this.isRunning) return [];

    // 1. Advance auto-send timer
    this.autoTimerMs -= deltaMs;
    if (this.autoTimerMs <= 0) {
      this.triggerWave();
      // Reset timer for next auto-send
      this.autoTimerMs += this.loader.constants.wave_interval_ms;
      if (this.autoTimerMs <= 0) {
        this.autoTimerMs = this.loader.constants.wave_interval_ms;
      }
    }

    // 2. Spawn pending attackers
    const spawned: Attacker[] = [];

    for (let i = this.pendingWaves.length - 1; i >= 0; i--) {
      const pw = this.pendingWaves[i];
      pw.timeUntilNextSpawnMs -= deltaMs;

      while (pw.timeUntilNextSpawnMs <= 0 && pw.remainingToSpawn > 0) {
        // Seeded jitter in [-19, 19] px
        const jitter = this.prng.nextFloat(-MAX_WAYPOINT_JITTER, MAX_WAYPOINT_JITTER);
        const attacker = new Attacker(
          {
            id: this.nextAttackerId++,
            wave: pw.wave,
            difficultySpeed: pw.difficultySpeed,
            hp: pw.hp,
            bounty: pw.bounty,
            tier: pw.tier,
            cycle: pw.cycle,
            jitterOffset: jitter,
          },
          this.map
        );

        this.attackers.push(attacker);
        spawned.push(attacker);
        pw.remainingToSpawn--;

        pw.timeUntilNextSpawnMs += this.loader.constants.spawn_interval_ms;
      }

      if (pw.remainingToSpawn <= 0) {
        this.pendingWaves.splice(i, 1);
      }
    }

    return spawned;
  }

  /**
   * Updates movement of all active attackers on the 64ms movement tick.
   * Returns list of base hits (lives lost) and dead attackers to clean up.
   */
  public updateMovement(deltaMs: number): { baseHits: number; deadAttackers: Attacker[] } {
    let baseHits = 0;
    const deadAttackers: Attacker[] = [];

    for (let i = this.attackers.length - 1; i >= 0; i--) {
      const attacker = this.attackers[i];
      attacker.updateMovement(deltaMs, this.map);

      if (attacker.reachedBase) {
        baseHits++;
        deadAttackers.push(attacker);
        this.attackers.splice(i, 1);
      } else if (attacker.isDead) {
        deadAttackers.push(attacker);
        this.attackers.splice(i, 1);
      }
    }

    return { baseHits, deadAttackers };
  }
}
