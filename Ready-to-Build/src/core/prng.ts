/**
 * Seeded PRNG implementation (Mulberry32).
 * Strictly deterministic for any given 32-bit integer seed.
 * Math.random is strictly prohibited in game logic.
 */
export class PRNG {
  private state: number;

  constructor(seed: number = 1) {
    // non-balance: bitwise seed initialization
    this.state = (seed >>> 0) || 1;
  }

  /**
   * Returns a pseudo-random float in [0, 1).
   */
  public next(): number {
    // non-balance: standard bitwise shift constants for 32-bit Mulberry32 algorithm
    let z = (this.state += 0x6d2b79f5);
    // non-balance: bitwise shift constants for Mulberry32
    z = Math.imul(z ^ (z >>> 15), z | 1);
    // non-balance: bitwise shift constants for Mulberry32
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    // non-balance: bitwise shift constants for Mulberry32
    const result = ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    return result;
  }

  /**
   * Returns a pseudo-random integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    // non-balance: integer indexing math
    return Math.floor(this.next() * (high - low + 1)) + low;
  }

  /**
   * Returns a pseudo-random float in [min, max).
   */
  public nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Forks a new PRNG with an independent deterministic seed.
   */
  public fork(): PRNG {
    // non-balance: random integer seed generation for fork
    const nextSeed = Math.floor(this.next() * 4294967296);
    return new PRNG(nextSeed);
  }

  public getSeedState(): number {
    return this.state;
  }

  public setSeedState(state: number): void {
    this.state = state >>> 0;
  }
}
