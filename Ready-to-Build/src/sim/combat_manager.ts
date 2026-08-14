import { BalanceLoader } from '../balance/loader';
import { PRNG } from '../core/prng';
import { distance } from '../map/map';
import { Attacker } from './attacker';
import { ComboManager } from './combos';
import { Projectile } from './projectile';
import { Tower } from './tower';

export class CombatManager {
  public towers: Tower[] = [];
  public projectiles: Projectile[] = [];
  public comboManager: ComboManager;
  private loader: BalanceLoader;
  private prng: PRNG;
  private nextProjectileId: number = 1;
  public totalDamageDealt: number = 0;
  public totalBountyEarned: number = 0;

  constructor(loader: BalanceLoader, prng: PRNG) {
    this.loader = loader;
    this.prng = prng;
    this.comboManager = new ComboManager(loader);
  }

  public addTower(tower: Tower): void {
    this.towers.push(tower);
    this.initializeSignatureAbilities(tower);
  }

  public removeTower(towerId: number): void {
    this.towers = this.towers.filter((t) => t.id !== towerId);
  }

  private initializeSignatureAbilities(tower: Tower): void {
    // non-balance: freakout unlock level threshold from ENGINE-SPEC §7.3
    const freakoutLevelThreshold = 4;
    if (
      (tower.familyKey === 'puffball' || tower.familyKey === 'cordyceps') &&
      tower.levels.damage >= freakoutLevelThreshold &&
      tower.levels.rate >= freakoutLevelThreshold
    ) {
      // non-balance: first freakout delay 60000ms from ENGINE-SPEC §7.3
      tower.nextFreakoutTimeMs = 60000;
    }
  }

  /**
   * Evaluates recursive Foxfire laser chain per ENGINE-SPEC §7.1.
   */
  public executeLaserChain(source: Tower, target: Attacker): number {
    // Reset all claim marks
    for (const t of this.towers) {
      t.claimedThisShot = false;
    }

    const recursiveLink = (current: Tower): number => {
      current.claimedThisShot = true;
      let dmg = current.getEffectiveDamage();

      // Find unclaimed Foxfire towers in range
      const effRange = current.getEffectiveRange();
      for (const neighbour of this.towers) {
        if (
          neighbour.familyKey === 'foxfire' &&
          !neighbour.claimedThisShot &&
          neighbour.id !== current.id
        ) {
          const d = distance({ x: current.x, y: current.y }, { x: neighbour.x, y: neighbour.y });
          if (d <= effRange) {
            // non-balance: 1.25 compounding multiplier from ENGINE-SPEC §7.1
            dmg += recursiveLink(neighbour) * 1.25;
          }
        }
      }
      return dmg;
    };

    return recursiveLink(source);
  }

  /**
   * Ticks tower logic on the 70ms fixed interval.
   */
  public updateTowerLogic(deltaMs: number, attackers: Attacker[], simTimeMs: number): void {
    // non-balance: freakout unlock level threshold from ENGINE-SPEC §7.3
    const freakoutLevelThreshold = 4;
    // non-balance: holding pattern unlock level threshold from ENGINE-SPEC §7.2
    const holdingPatternLevelThreshold = 3;

    // 1. Update recharge timers and Freak-out states
    for (const tower of this.towers) {
      if (tower.rechargeTimerMs > 0) {
        tower.rechargeTimerMs -= deltaMs;
      }
      if (tower.comboRechargeTimerMs > 0) {
        tower.comboRechargeTimerMs -= deltaMs;
      }

      // Freak-out logic (Puffball / Cordyceps dmg>=4 and rate>=4)
      if (
        (tower.familyKey === 'puffball' || tower.familyKey === 'cordyceps') &&
        tower.levels.damage >= freakoutLevelThreshold &&
        tower.levels.rate >= freakoutLevelThreshold
      ) {
        if (tower.nextFreakoutTimeMs === 0) {
          // non-balance: first freakout delay
          tower.nextFreakoutTimeMs = simTimeMs + 60000;
        }

        if (tower.freakoutActive) {
          tower.freakoutTimerMs -= deltaMs;
          if (tower.freakoutTimerMs <= 0) {
            tower.freakoutActive = false;
            // Schedule next freakout: now + space/2 + rand(0, space/2) - rate_level * rate_mult * 1000
            // space = 80000 ms, rate_mult = 4 (ENGINE-SPEC §7.3)
            // non-balance: space / 2 = 40000 ms
            const spaceHalf = 40000;
            const randPart = this.prng.nextFloat(0, spaceHalf);
            // non-balance: 4000 ms per rate level
            const reduction = tower.levels.rate * 4 * 1000;
            // non-balance: minimum reschedule delay
            const minDelay = 5000;
            tower.nextFreakoutTimeMs = simTimeMs + Math.max(minDelay, spaceHalf + randPart - reduction);
          }
        } else if (simTimeMs >= tower.nextFreakoutTimeMs) {
          tower.freakoutActive = true;
          // non-balance: 5000 ms freakout duration from ENGINE-SPEC §7.3
          tower.freakoutTimerMs = 5000;
        }
      }

      // Holding pattern logic (Artillery range>=3 & rate>=3)
      if (
        tower.familyKey === 'artillery' &&
        tower.levels.range >= holdingPatternLevelThreshold &&
        tower.levels.rate >= holdingPatternLevelThreshold
      ) {
        // non-balance: max 4 pre-launched orbiting projectiles from ENGINE-SPEC §7.2
        const maxOrbiting = 4;
        if (tower.orbitingProjectiles < maxOrbiting && tower.rechargeTimerMs <= 0) {
          tower.orbitingProjectiles++;
          tower.rechargeTimerMs += tower.getFireIntervalMs();
        }
      }
    }

    // 2. Target acquisition and firing
    for (const tower of this.towers) {
      // Check if ready to fire
      const isArtilleryHolding = tower.familyKey === 'artillery' && tower.orbitingProjectiles > 0;
      if (tower.rechargeTimerMs > 0 && !isArtilleryHolding) {
        continue;
      }

      const target = tower.acquireTarget(attackers);
      if (!target) continue;

      // Check combo eligibility & dispatch
      const comboResult = this.comboManager.evaluateAndDispatch(tower, this.towers);

      if (comboResult) {
        // Fire combo
        if (comboResult.combo.key === 'mycelial_sinkhole') {
          // Sinkhole: removes attackers in 70px radius with 0 bounty (ENGINE-SPEC §6.3)
          // non-balance: sinkhole radius in logical pixels
          const sinkholeRadius = 70;
          for (const atk of attackers) {
            if (!atk.isDead && !atk.reachedBase) {
              const d = distance({ x: tower.x, y: tower.y }, { x: atk.x, y: atk.y });
              if (d <= sinkholeRadius) {
                atk.isDead = true; // Removed without bounty
              }
            }
          }
        } else {
          // Launch combo projectile with massive payload
          this.projectiles.push(
            new Projectile({
              id: this.nextProjectileId++,
              sourceTowerId: tower.id,
              startX: tower.x,
              startY: tower.y,
              targetAttacker: target,
              damage: comboResult.payload,
              // non-balance: combo projectile visual splash radius
              splashRadius: 50,
            })
          );
        }
        tower.rechargeTimerMs = tower.getFireIntervalMs();
        continue;
      }

      // Normal shot or Signature weapon firing
      if (tower.familyKey === 'foxfire') {
        // Laser chain
        const chainDamage = this.executeLaserChain(tower, target);
        // Lasers hit instantaneously or via beam
        const actualDmg = Math.min(target.energy, chainDamage);
        const killed = target.takeDamage(actualDmg);
        this.totalDamageDealt += actualDmg;
        if (killed) this.totalBountyEarned += target.bounty;
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      } else if (isArtilleryHolding) {
        // Holding pattern: immediate strike without launch delay
        tower.orbitingProjectiles--;
        const actualDmg = Math.min(target.energy, tower.getEffectiveDamage());
        const killed = target.takeDamage(actualDmg);
        this.totalDamageDealt += actualDmg;
        if (killed) this.totalBountyEarned += target.bounty;
      } else {
        // Cordyceps slow poison calculation (§7.4)
        let poisonDivisor = 1;
        if (tower.familyKey === 'cordyceps') {
          // poison_max = 10, divisor = max(1, poison_max * damage_upgrade_percent / 100)
          // non-balance: 10 poison_max constant from ENGINE-SPEC §7.4
          const poisonMax = 10;
          // non-balance: percentage ratio conversion
          const damageUpgradePercent = Math.max(10, tower.levels.damage * 10);
          // non-balance: 100 percent divisor
          poisonDivisor = Math.max(1, (poisonMax * damageUpgradePercent) / 100);
        }

        this.projectiles.push(
          new Projectile({
            id: this.nextProjectileId++,
            sourceTowerId: tower.id,
            startX: tower.x,
            startY: tower.y,
            targetAttacker: target,
            damage: tower.getEffectiveDamage(),
            poisonDivisor,
          })
        );
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      }
    }
  }

  /**
   * Advances active projectiles and resolves impacts.
   */
  public updateProjectiles(deltaMs: number, attackers: Attacker[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const result = proj.update(deltaMs, attackers);

      if (result.impacted) {
        this.totalDamageDealt += result.damageDealt;
        for (const killed of result.killedAttackers) {
          this.totalBountyEarned += killed.bounty;
        }
        this.projectiles.splice(i, 1);
      }
    }
  }
}
