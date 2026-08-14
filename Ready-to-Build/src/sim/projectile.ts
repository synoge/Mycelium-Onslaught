import { distance, Point } from '../map/map';
import { Attacker } from './attacker';

export interface ProjectileConfig {
  id: number;
  sourceTowerId: number;
  startX: number;
  startY: number;
  targetAttacker: Attacker;
  damage: number;
  // non-balance: default projectile travel speed in logical px/sec
  speed?: number;
  poisonDivisor?: number;
  splashRadius?: number;
  isLaserInstant?: boolean;
}

export class Projectile {
  public readonly id: number;
  public readonly sourceTowerId: number;
  public x: number;
  public y: number;
  public targetAttacker: Attacker;
  public damage: number;
  public speed: number;
  public poisonDivisor: number;
  public splashRadius: number;
  public isDead: boolean = false;

  constructor(config: ProjectileConfig) {
    this.id = config.id;
    this.sourceTowerId = config.sourceTowerId;
    this.x = config.startX;
    this.y = config.startY;
    this.targetAttacker = config.targetAttacker;
    this.damage = config.damage;
    // non-balance: default projectile speed in px/s
    this.speed = config.speed || 400;
    this.poisonDivisor = config.poisonDivisor || 1;
    this.splashRadius = config.splashRadius || 0;
  }

  /**
   * Advances projectile towards target on simulation tick.
   * Returns true if impacted, false otherwise.
   */
  public update(deltaMs: number, allAttackers: Attacker[]): {
    impacted: boolean;
    damageDealt: number;
    killedAttackers: Attacker[];
  } {
    if (this.isDead) return { impacted: false, damageDealt: 0, killedAttackers: [] };

    // Target position (if target is dead, fly to its last known pos)
    const targetPos: Point = { x: this.targetAttacker.x, y: this.targetAttacker.y };
    const dx = targetPos.x - this.x;
    const dy = targetPos.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // non-balance: 1000 ms per second time conversion
    const moveDist = (this.speed * deltaMs) / 1000;

    // non-balance: impact threshold in logical pixels
    const impactThreshold = 4;
    if (dist <= moveDist || dist < impactThreshold) {
      // Impact!
      this.isDead = true;
      this.x = targetPos.x;
      this.y = targetPos.y;

      let totalDamage = 0;
      const killed: Attacker[] = [];

      if (this.splashRadius > 0) {
        // Splash damage across nearby attackers
        for (const atk of allAttackers) {
          if (!atk.isDead && !atk.reachedBase) {
            const d = distance({ x: this.x, y: this.y }, { x: atk.x, y: atk.y });
            if (d <= this.splashRadius) {
              const actualDamage = Math.min(atk.energy, this.damage);
              const wasKilled = atk.takeDamage(actualDamage);
              totalDamage += actualDamage;
              if (this.poisonDivisor > 1) {
                atk.applyPoison(this.poisonDivisor);
              }
              if (wasKilled) killed.push(atk);
            }
          }
        }
      } else {
        // Single target damage
        if (!this.targetAttacker.isDead && !this.targetAttacker.reachedBase) {
          const actualDamage = Math.min(this.targetAttacker.energy, this.damage);
          const wasKilled = this.targetAttacker.takeDamage(actualDamage);
          totalDamage += actualDamage;
          if (this.poisonDivisor > 1) {
            this.targetAttacker.applyPoison(this.poisonDivisor);
          }
          if (wasKilled) killed.push(this.targetAttacker);
        }
      }

      return {
        impacted: true,
        damageDealt: totalDamage,
        killedAttackers: killed,
      };
    } else {
      // Move towards target
      const ratio = moveDist / dist;
      this.x += dx * ratio;
      this.y += dy * ratio;
      return { impacted: false, damageDealt: 0, killedAttackers: [] };
    }
  }
}
