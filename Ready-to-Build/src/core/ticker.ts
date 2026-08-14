/**
 * Fixed-timestep multi-system accumulator.
 * System intervals from ENGINE-SPEC §1.1:
 * - Attacker movement: 64 ms
 * - Tower logic: 70 ms
 * - Wave spawning: 200 ms
 */

// non-balance: system tick intervals from ENGINE-SPEC §1.1
export const INTERVAL_ATTACKER_MOVEMENT_MS = 64;
// non-balance: system tick intervals from ENGINE-SPEC §1.1
export const INTERVAL_TOWER_LOGIC_MS = 70;
// non-balance: system tick intervals from ENGINE-SPEC §1.1
export const INTERVAL_WAVE_SPAWNING_MS = 200;

// non-balance: spiral-of-death cap per frame from ENGINE-SPEC §1.1
export const MAX_TICKS_PER_FRAME = 12;

// non-balance: small epsilon to handle float roundoff in timestep summation
const EPSILON = 1e-7;

export interface TickerCallbacks {
  onMovementTick?: (deltaMs: number) => void;
  onTowerTick?: (deltaMs: number) => void;
  onSpawningTick?: (deltaMs: number) => void;
}

export class MultiSystemAccumulator {
  private movementAcc: number = 0;
  private towerAcc: number = 0;
  private spawnAcc: number = 0;

  private totalMovementTicks: number = 0;
  private totalTowerTicks: number = 0;
  private totalSpawnTicks: number = 0;

  /**
   * Advance simulation time by deltaMs (milliseconds).
   * Runs missed ticks up to MAX_TICKS_PER_FRAME per system.
   */
  public advance(deltaMs: number, callbacks: TickerCallbacks): void {
    if (deltaMs <= 0) return;

    this.movementAcc += deltaMs;
    this.towerAcc += deltaMs;
    this.spawnAcc += deltaMs;

    // Movement ticks
    let moveTicks = 0;
    while (this.movementAcc + EPSILON >= INTERVAL_ATTACKER_MOVEMENT_MS && moveTicks < MAX_TICKS_PER_FRAME) {
      this.movementAcc -= INTERVAL_ATTACKER_MOVEMENT_MS;
      if (Math.abs(this.movementAcc) < EPSILON) this.movementAcc = 0;
      moveTicks++;
      this.totalMovementTicks++;
      callbacks.onMovementTick?.(INTERVAL_ATTACKER_MOVEMENT_MS);
    }
    if (moveTicks >= MAX_TICKS_PER_FRAME && this.movementAcc > INTERVAL_ATTACKER_MOVEMENT_MS) {
      this.movementAcc = this.movementAcc % INTERVAL_ATTACKER_MOVEMENT_MS;
    }

    // Tower logic ticks
    let towerTicks = 0;
    while (this.towerAcc + EPSILON >= INTERVAL_TOWER_LOGIC_MS && towerTicks < MAX_TICKS_PER_FRAME) {
      this.towerAcc -= INTERVAL_TOWER_LOGIC_MS;
      if (Math.abs(this.towerAcc) < EPSILON) this.towerAcc = 0;
      towerTicks++;
      this.totalTowerTicks++;
      callbacks.onTowerTick?.(INTERVAL_TOWER_LOGIC_MS);
    }
    if (towerTicks >= MAX_TICKS_PER_FRAME && this.towerAcc > INTERVAL_TOWER_LOGIC_MS) {
      this.towerAcc = this.towerAcc % INTERVAL_TOWER_LOGIC_MS;
    }

    // Wave spawning ticks
    let spawnTicks = 0;
    while (this.spawnAcc + EPSILON >= INTERVAL_WAVE_SPAWNING_MS && spawnTicks < MAX_TICKS_PER_FRAME) {
      this.spawnAcc -= INTERVAL_WAVE_SPAWNING_MS;
      if (Math.abs(this.spawnAcc) < EPSILON) this.spawnAcc = 0;
      spawnTicks++;
      this.totalSpawnTicks++;
      callbacks.onSpawningTick?.(INTERVAL_WAVE_SPAWNING_MS);
    }
    if (spawnTicks >= MAX_TICKS_PER_FRAME && this.spawnAcc > INTERVAL_WAVE_SPAWNING_MS) {
      this.spawnAcc = this.spawnAcc % INTERVAL_WAVE_SPAWNING_MS;
    }
  }

  public getStats() {
    return {
      movementTicks: this.totalMovementTicks,
      towerTicks: this.totalTowerTicks,
      spawnTicks: this.totalSpawnTicks,
      movementAcc: this.movementAcc,
      towerAcc: this.towerAcc,
      spawnAcc: this.spawnAcc,
    };
  }

  public reset(): void {
    this.movementAcc = 0;
    this.towerAcc = 0;
    this.spawnAcc = 0;
    this.totalMovementTicks = 0;
    this.totalTowerTicks = 0;
    this.totalSpawnTicks = 0;
  }
}
