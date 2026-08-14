import { PRNG } from '../core/prng';
import { distance, GameMap, Point } from '../map/map';

export interface AttackerConfig {
  id: number;
  wave: number;
  difficultySpeed: number;
  hp: number;
  bounty: number;
  tier: number;
  cycle: number;
  jitterOffset: number; // perpendicular offset in [-19, 19] px
}

// non-balance: maximum perpendicular jitter in logical px from ENGINE-SPEC §3.3
export const MAX_WAYPOINT_JITTER = 19;
// non-balance: minimum poison speed floor from ENGINE-SPEC §3.4
export const POISON_SPEED_FLOOR = 5;
// non-balance: poison recovery speed per tick from ENGINE-SPEC §3.4
export const POISON_RECOVERY_PER_TICK = 2;

export class Attacker {
  public readonly id: number;
  public readonly wave: number;
  public readonly tier: number;
  public readonly cycle: number;
  public readonly energyStart: number;
  public readonly moveSpeedInit: number;
  public readonly bounty: number;
  public readonly jitterOffset: number;

  public energy: number;
  public moveSpeed: number;
  public isDead: boolean = false;
  public reachedBase: boolean = false;

  // Traversal state along map waypoints
  public currentWaypointIndex: number = 0;
  public x: number = 0;
  public y: number = 0;
  public headingAngle: number = 0;

  // Lifetime tracking for targeting modes ('old' / 'young')
  public timeAliveMs: number = 0;
  public distanceTraveled: number = 0;

  constructor(config: AttackerConfig, map: GameMap) {
    this.id = config.id;
    this.wave = config.wave;
    this.tier = config.tier;
    this.cycle = config.cycle;
    this.energyStart = config.hp;
    this.energy = config.hp;
    this.moveSpeedInit = config.difficultySpeed;
    this.moveSpeed = config.difficultySpeed;
    this.bounty = config.bounty;
    this.jitterOffset = config.jitterOffset;

    // Initialize at spawn (waypoint 0) with jitter
    this.currentWaypointIndex = 0;
    this.applyPositionAtWaypoint(0, map);
  }

  private getJitteredWaypoint(index: number, map: GameMap): Point {
    const rawWp = map.waypoints[index];
    if (this.jitterOffset === 0 || map.waypoints.length < 2) {
      return { x: rawWp.x, y: rawWp.y };
    }

    // Determine segment normal for perpendicular jitter
    let segA = rawWp;
    let segB = index < map.waypoints.length - 1 ? map.waypoints[index + 1] : map.waypoints[index - 1];

    let dx = segB.x - segA.x;
    let dy = segB.y - segA.y;
    if (index === map.waypoints.length - 1) {
      dx = rawWp.x - segB.x;
      dy = rawWp.y - segB.y;
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: rawWp.x, y: rawWp.y };

    // Normal (-dy, dx) normalized
    const nx = -dy / len;
    const ny = dx / len;

    return {
      x: rawWp.x + nx * this.jitterOffset,
      y: rawWp.y + ny * this.jitterOffset,
    };
  }

  private applyPositionAtWaypoint(index: number, map: GameMap): void {
    const p = this.getJitteredWaypoint(index, map);
    this.x = p.x;
    this.y = p.y;
  }

  public getHealthPercent(): number {
    if (this.energyStart <= 0) return 0;
    // non-balance: 100 percent multiplier and clamp
    const percentScale = 100;
    return Math.max(0, Math.min(percentScale, Math.ceil((this.energy / this.energyStart) * percentScale)));
  }

  public applyPoison(divisor: number): void {
    if (divisor <= 1) return;
    // ENGINE-SPEC §3.4: move_speed = max(5, move_speed / poison_divisor)
    this.moveSpeed = Math.max(POISON_SPEED_FLOOR, this.moveSpeed / divisor);
  }

  public takeDamage(amount: number): boolean {
    if (this.isDead || this.reachedBase) return false;
    this.energy -= amount;
    if (this.energy <= 0) {
      this.energy = 0;
      this.isDead = true;
      return true; // Killed by this hit
    }
    return false;
  }

  /**
   * Advances attacker position along the path on the 64ms movement tick.
   */
  public updateMovement(deltaMs: number, map: GameMap): void {
    if (this.isDead || this.reachedBase) return;

    this.timeAliveMs += deltaMs;

    // Poison recovery: +2 per movement tick, clamped to moveSpeedInit (ENGINE-SPEC §3.4)
    if (this.moveSpeed < this.moveSpeedInit) {
      this.moveSpeed = Math.min(this.moveSpeedInit, this.moveSpeed + POISON_RECOVERY_PER_TICK);
    }

    // Travel distance this tick (pixels = speed_px_per_sec * delta_sec)
    // non-balance: 1000 ms per second time conversion
    const distToMove = (this.moveSpeed * deltaMs) / 1000;
    let remainingMove = distToMove;

    while (remainingMove > 0 && !this.reachedBase) {
      const nextWpIdx = this.currentWaypointIndex + 1;
      if (nextWpIdx >= map.waypoints.length) {
        // Reached past n - 1 -> Base Hit!
        this.reachedBase = true;
        this.isDead = true;
        break;
      }

      const targetPos = this.getJitteredWaypoint(nextWpIdx, map);
      const dx = targetPos.x - this.x;
      const dy = targetPos.y - this.y;
      const distToNext = Math.sqrt(dx * dx + dy * dy);

      this.headingAngle = Math.atan2(dy, dx);

      if (distToNext <= remainingMove) {
        // Arrived at next waypoint
        this.x = targetPos.x;
        this.y = targetPos.y;
        this.currentWaypointIndex = nextWpIdx;
        this.distanceTraveled += distToNext;
        remainingMove -= distToNext;
      } else {
        // Move partial distance along current segment
        const ratio = remainingMove / distToNext;
        this.x += dx * ratio;
        this.y += dy * ratio;
        this.distanceTraveled += remainingMove;
        remainingMove = 0;
      }
    }
  }
}
