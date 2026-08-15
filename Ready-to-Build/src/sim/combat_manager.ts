import { BalanceLoader } from '../balance/loader';
import { PRNG } from '../core/prng';
import { distance } from '../map/map';
import { Attacker } from './attacker';
import { ComboExecutionResult, ComboManager } from './combos';
import { Projectile } from './projectile';
import { Tower } from './tower';

export interface CausticPuddle {
  id: number;
  x: number;
  y: number;
  radius: number;
  damagePerTick: number;
  durationMs: number;
  maxDurationMs: number;
}

export interface CombatEvents {
  onLaserFired?: (source: Tower, target: Attacker, damage: number, chainHops: { x: number; y: number }[]) => void;
  onComboFired?: (comboResult: ComboExecutionResult, target: Attacker) => void;
  onProjectileLaunched?: (proj: Projectile) => void;
  onProjectileImpacted?: (x: number, y: number, splashRadius: number) => void;
  onAttackerKilled?: (attacker: Attacker) => void;
  onCausticPuddleSpawned?: (puddle: CausticPuddle) => void;
  onNeuralArcFired?: (source: Tower, chainTargets: { x: number; y: number }[], damage: number) => void;
  onKineticLeechFired?: (source: Tower, target: Attacker, bonusGold: number) => void;
}

export class CombatManager {
  public towers: Tower[] = [];
  public projectiles: Projectile[] = [];
  public causticPuddles: CausticPuddle[] = [];
  public comboManager: ComboManager;
  public events: CombatEvents = {};
  public onBountyAwarded?: (bounty: number) => void;
  private loader: BalanceLoader;
  private prng: PRNG;
  private nextProjectileId: number = 1;
  private nextPuddleId: number = 1;
  public totalDamageDealt: number = 0;
  public totalBountyEarned: number = 0;
  public totalKills: number = 0;

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
  public executeLaserChain(source: Tower, target: Attacker): { totalDamage: number; chainHops: { x: number; y: number }[] } {
    // Reset all claim marks
    for (const t of this.towers) {
      t.claimedThisShot = false;
    }

    const hops: { x: number; y: number }[] = [];

    const recursiveLink = (current: Tower): number => {
      current.claimedThisShot = true;
      hops.push({ x: current.x, y: current.y });
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

    const totalDamage = recursiveLink(source);
    return { totalDamage, chainHops: hops };
  }

  /**
   * Ticks tower combat logic on the 70ms fixed interval.
   */
  public updateTowerLogic(deltaMs: number, attackers: Attacker[], simTimeMs: number): void {
    // non-balance: freakout unlock level threshold from ENGINE-SPEC §7.3
    const freakoutLevelThreshold = 4;
    // non-balance: holding pattern unlock level threshold from ENGINE-SPEC §7.2
    const holdingPatternLevelThreshold = 3;

    // 0. Update Polypore Haste Auras on adjacent allies
    for (const t of this.towers) {
      t.hasteBuffMult = 1.0;
    }
    for (const poly of this.towers) {
      if (poly.familyKey === 'polypore') {
        const polyRange = poly.getEffectiveRange();
        for (const ally of this.towers) {
          if (ally.id !== poly.id) {
            const d = distance({ x: poly.x, y: poly.y }, { x: ally.x, y: ally.y });
            if (d <= polyRange) {
              // non-balance: +20% fire-rate buff from Polypore Bio-Shield
              ally.hasteBuffMult = Math.max(ally.hasteBuffMult, 1.2);
            }
          }
        }
      }
    }

    // 1. Update recharge timers, freak-out states, and persistent auras
    for (const tower of this.towers) {
      if (tower.rechargeTimerMs > 0) {
        tower.rechargeTimerMs -= deltaMs;
      }
      if (tower.comboRechargeTimerMs > 0) {
        tower.comboRechargeTimerMs -= deltaMs;
      }

      // Freak-out logic (Puffball / Cordyceps)
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

      // Holding pattern logic (Artillery)
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

      // Stinkhorn Miasma 360° Continuous Gas Cloud
      if (tower.familyKey === 'stinkhorn') {
        const gasRange = tower.getEffectiveRange();
        // non-balance: stinkhorn tick damage fraction
        const tickDmg = (tower.getEffectiveDamage() * deltaMs) / 1000;
        for (const atk of attackers) {
          if (!atk.isDead && !atk.reachedBase) {
            const d = distance({ x: tower.x, y: tower.y }, { x: atk.x, y: atk.y });
            if (d <= gasRange) {
              // non-balance: 0.05 armor shred per second
              atk.applyArmorShred((0.05 * deltaMs) / 1000);
              const actualDmg = Math.min(atk.energy, tickDmg);
              const killed = atk.takeDamage(actualDmg);
              this.totalDamageDealt += actualDmg;
              tower.totalDamageDealt += actualDmg;
              if (killed) {
                this.totalBountyEarned += atk.bounty;
                this.totalKills++;
                tower.totalKills++;
                if (this.onBountyAwarded) this.onBountyAwarded(atk.bounty);
                if (this.events.onAttackerKilled) this.events.onAttackerKilled(atk);
              }
            }
          }
        }
      }

      // Polypore Forcefield Barrier Slow Field
      if (tower.familyKey === 'polypore') {
        const fieldRange = tower.getEffectiveRange();
        for (const atk of attackers) {
          if (!atk.isDead && !atk.reachedBase) {
            const d = distance({ x: tower.x, y: tower.y }, { x: atk.x, y: atk.y });
            if (d <= fieldRange) {
              // non-balance: 1.35 slow factor divisor
              atk.applyPoison(1.35);
            }
          }
        }
      }
    }

    // 2. Target acquisition and active projectile/beam firing
    for (const tower of this.towers) {
      if (tower.familyKey === 'stinkhorn' || tower.familyKey === 'polypore') {
        // These passive aura towers pulse continuously above
        continue;
      }

      const isArtilleryHolding = tower.familyKey === 'artillery' && tower.orbitingProjectiles > 0;
      if (tower.rechargeTimerMs > 0 && !isArtilleryHolding) {
        continue;
      }

      const target = tower.acquireTarget(attackers);
      if (!target) continue;

      tower.hasFired = true;

      // Check combo eligibility & dispatch
      const comboResult = this.comboManager.evaluateAndDispatch(tower, this.towers);
      if (comboResult) {
        if (this.events.onComboFired) {
          this.events.onComboFired(comboResult, target);
        }

        if (comboResult.combo.key === 'mycelial_sinkhole') {
          // non-balance: sinkhole radius in logical pixels
          const sinkholeRadius = 70;
          for (const atk of attackers) {
            if (!atk.isDead && !atk.reachedBase) {
              const d = distance({ x: tower.x, y: tower.y }, { x: atk.x, y: atk.y });
              if (d <= sinkholeRadius) {
                atk.isDead = true;
                tower.totalKills++;
              }
            }
          }
        } else {
          const proj = new Projectile({
            id: this.nextProjectileId++,
            sourceTowerId: tower.id,
            startX: tower.x,
            startY: tower.y,
            targetAttacker: target,
            damage: comboResult.payload,
            // non-balance: combo projectile visual splash radius
            splashRadius: 50,
          });
          this.projectiles.push(proj);
          if (this.events.onProjectileLaunched) this.events.onProjectileLaunched(proj);
        }
        tower.rechargeTimerMs = tower.getFireIntervalMs();
        continue;
      }

      // Specialized Tower Weapons
      if (tower.familyKey === 'foxfire') {
        // Laser chain
        const { totalDamage, chainHops } = this.executeLaserChain(tower, target);
        const actualDmg = Math.min(target.energy, totalDamage);
        const killed = target.takeDamage(actualDmg);
        this.totalDamageDealt += actualDmg;
        tower.totalDamageDealt += actualDmg;

        if (this.events.onLaserFired) this.events.onLaserFired(tower, target, actualDmg, chainHops);
        if (killed) {
          this.totalBountyEarned += target.bounty;
          this.totalKills++;
          tower.totalKills++;
          if (this.onBountyAwarded) this.onBountyAwarded(target.bounty);
          if (this.events.onAttackerKilled) this.events.onAttackerKilled(target);
        }
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      } else if (tower.familyKey === 'ghost_pipe') {
        // Kinetic Siphon: Drain speed & award bonus gold dividend
        // non-balance: 1.5 kinetic drain divisor
        target.applyPoison(1.5);
        // non-balance: 0.35 kinetic gold bonus ratio
        const goldDividend = target.bounty * 0.35;
        const actualDmg = Math.min(target.energy, tower.getEffectiveDamage());
        const killed = target.takeDamage(actualDmg);
        this.totalDamageDealt += actualDmg;
        tower.totalDamageDealt += actualDmg;

        if (this.events.onKineticLeechFired) this.events.onKineticLeechFired(tower, target, goldDividend);
        if (this.onBountyAwarded && goldDividend > 0) this.onBountyAwarded(goldDividend);
        this.totalBountyEarned += goldDividend;

        if (killed) {
          this.totalBountyEarned += target.bounty;
          this.totalKills++;
          tower.totalKills++;
          if (this.onBountyAwarded) this.onBountyAwarded(target.bounty);
          if (this.events.onAttackerKilled) this.events.onAttackerKilled(target);
        }
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      } else if (tower.familyKey === 'lions_mane') {
        // Neural Synapse Chain Lightning: Jump up to 3 nearby enemies + Stun & Path Reversal
        const chainTargets: Attacker[] = [target];
        // non-balance: max 3 chain targets
        const maxChain = 3;
        // non-balance: chain jump radius 90px
        const chainRadius = 90;
        for (const candidate of attackers) {
          if (chainTargets.length >= maxChain) break;
          if (!candidate.isDead && !candidate.reachedBase && !chainTargets.includes(candidate)) {
            const lastTarget = chainTargets[chainTargets.length - 1];
            const d = distance({ x: lastTarget.x, y: lastTarget.y }, { x: candidate.x, y: candidate.y });
            if (d <= chainRadius) {
              chainTargets.push(candidate);
            }
          }
        }

        const dmgPerTarget = tower.getEffectiveDamage();
        for (const hit of chainTargets) {
          // non-balance: 800ms stun duration
          hit.applyStun(800);
          // non-balance: 1000ms reversal stagger duration
          hit.applyPathReversal(1000);
          const actualDmg = Math.min(hit.energy, dmgPerTarget);
          const killed = hit.takeDamage(actualDmg);
          this.totalDamageDealt += actualDmg;
          tower.totalDamageDealt += actualDmg;
          if (killed) {
            this.totalBountyEarned += hit.bounty;
            this.totalKills++;
            tower.totalKills++;
            if (this.onBountyAwarded) this.onBountyAwarded(hit.bounty);
            if (this.events.onAttackerKilled) this.events.onAttackerKilled(hit);
          }
        }

        if (this.events.onNeuralArcFired) {
          this.events.onNeuralArcFired(
            tower,
            chainTargets.map((c) => ({ x: c.x, y: c.y })),
            dmgPerTarget
          );
        }
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      } else if (tower.familyKey === 'inky_cap') {
        // Void-Mortar: Launch shell that leaves persistent caustic puddle on impact
        const proj = new Projectile({
          id: this.nextProjectileId++,
          sourceTowerId: tower.id,
          startX: tower.x,
          startY: tower.y,
          targetAttacker: target,
          damage: tower.getEffectiveDamage(),
          // non-balance: inky cap splash radius 35
          splashRadius: 35,
        });
        this.projectiles.push(proj);
        if (this.events.onProjectileLaunched) this.events.onProjectileLaunched(proj);
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      } else if (isArtilleryHolding) {
        // Holding pattern instant launch
        tower.orbitingProjectiles--;
        const actualDmg = Math.min(target.energy, tower.getEffectiveDamage());
        const killed = target.takeDamage(actualDmg);
        this.totalDamageDealt += actualDmg;
        tower.totalDamageDealt += actualDmg;

        // non-balance: holding strike visual splash radius
        const holdingRadius = 25;
        if (this.events.onProjectileImpacted) this.events.onProjectileImpacted(target.x, target.y, holdingRadius);
        if (killed) {
          this.totalBountyEarned += target.bounty;
          this.totalKills++;
          tower.totalKills++;
          if (this.onBountyAwarded) this.onBountyAwarded(target.bounty);
          if (this.events.onAttackerKilled) this.events.onAttackerKilled(target);
        }
      } else {
        // Puffball and Cordyceps standard projectiles
        let poisonDivisor = 1;
        if (tower.familyKey === 'cordyceps') {
          // non-balance: 10 poison_max constant from ENGINE-SPEC §7.4
          const poisonMax = 10;
          // non-balance: percentage ratio conversion
          const damageUpgradePercent = Math.max(10, tower.levels.damage * 10);
          // non-balance: 100 percent divisor
          poisonDivisor = Math.max(1, (poisonMax * damageUpgradePercent) / 100);
        }

        const proj = new Projectile({
          id: this.nextProjectileId++,
          sourceTowerId: tower.id,
          startX: tower.x,
          startY: tower.y,
          targetAttacker: target,
          damage: tower.getEffectiveDamage(),
          poisonDivisor,
        });
        this.projectiles.push(proj);
        if (this.events.onProjectileLaunched) this.events.onProjectileLaunched(proj);
        tower.rechargeTimerMs = tower.getFireIntervalMs();
      }
    }

    // 3. Update Caustic Puddles (Inky Cap Ground Denial)
    for (let i = this.causticPuddles.length - 1; i >= 0; i--) {
      const puddle = this.causticPuddles[i];
      puddle.durationMs -= deltaMs;
      if (puddle.durationMs <= 0) {
        this.causticPuddles.splice(i, 1);
        continue;
      }

      // Deal DoT & Armor Shred to enemies inside puddle
      const tickDmg = (puddle.damagePerTick * deltaMs) / 1000;
      for (const atk of attackers) {
        if (!atk.isDead && !atk.reachedBase) {
          const d = distance({ x: puddle.x, y: puddle.y }, { x: atk.x, y: atk.y });
          if (d <= puddle.radius) {
            // non-balance: 0.15 armor shred per second
            atk.applyArmorShred((0.15 * deltaMs) / 1000);
            const actualDmg = Math.min(atk.energy, tickDmg);
            const killed = atk.takeDamage(actualDmg);
            this.totalDamageDealt += actualDmg;
            if (killed) {
              this.totalBountyEarned += atk.bounty;
              this.totalKills++;
              if (this.onBountyAwarded) this.onBountyAwarded(atk.bounty);
              if (this.events.onAttackerKilled) this.events.onAttackerKilled(atk);
            }
          }
        }
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

        const srcTower = this.towers.find((t) => t.id === proj.sourceTowerId);
        if (srcTower) {
          srcTower.totalDamageDealt += result.damageDealt;
          srcTower.totalKills += result.killedAttackers.length;

          // Inky Cap Spawns Caustic Puddle on Impact
          if (srcTower.familyKey === 'inky_cap') {
            // non-balance: puddle radius 35
            const puddleRadius = 35;
            // non-balance: 4000ms puddle duration
            const puddle: CausticPuddle = {
              id: this.nextPuddleId++,
              x: proj.x,
              y: proj.y,
              radius: puddleRadius,
              damagePerTick: srcTower.getEffectiveDamage() * 0.4,
              durationMs: 4000,
              maxDurationMs: 4000,
            };
            this.causticPuddles.push(puddle);
            if (this.events.onCausticPuddleSpawned) this.events.onCausticPuddleSpawned(puddle);
          }
        }

        if (this.events.onProjectileImpacted) {
          this.events.onProjectileImpacted(proj.x, proj.y, proj.splashRadius);
        }
        for (const killed of result.killedAttackers) {
          this.totalBountyEarned += killed.bounty;
          this.totalKills++;
          if (this.onBountyAwarded) this.onBountyAwarded(killed.bounty);
          if (this.events.onAttackerKilled) this.events.onAttackerKilled(killed);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }
}
