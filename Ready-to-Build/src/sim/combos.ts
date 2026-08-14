import { BalanceLoader } from '../balance/loader';
import { ComboData, FamilyColour } from '../interfaces';
import { distance } from '../map/map';
import { Attacker } from './attacker';
import { Projectile } from './projectile';
import { Tower } from './tower';

export interface ComboExecutionResult {
  combo: ComboData;
  payload: number;
  firingTower: Tower;
  consumedTowers: Tower[];
}

export class ComboManager {
  private loader: BalanceLoader;

  constructor(loader: BalanceLoader) {
    this.loader = loader;
  }

  /**
   * Finds all combo-capable towers within combo_radius (70 px) of source, excluding source.
   */
  public getNearbyComboCapableTowers(source: Tower, allTowers: Tower[]): Tower[] {
    const radius = this.loader.constants.combo_radius;
    return allTowers.filter((t) => {
      if (t.id === source.id) return false;
      if (!t.isComboCapable()) return false;
      if (t.comboRechargeTimerMs > 0) return false; // Must be ready to contribute
      const d = distance({ x: source.x, y: source.y }, { x: t.x, y: t.y });
      return d <= radius;
    });
  }

  /**
   * Evaluates and dispatches a combo if eligible.
   */
  public evaluateAndDispatch(
    firingTower: Tower,
    allTowers: Tower[]
  ): ComboExecutionResult | null {
    if (!firingTower.isComboCapable()) return null;
    if (firingTower.comboRechargeTimerMs > 0) return null;

    const nearbyReadyTowers = this.getNearbyComboCapableTowers(firingTower, allTowers);

    // Count by colour
    const counts: Record<string, number> = {};
    for (const t of nearbyReadyTowers) {
      counts[t.colour] = (counts[t.colour] || 0) + 1;
    }

    const selectedCombo = this.loader.dispatchCombo(firingTower.colour, counts);
    if (!selectedCombo) return null;

    // Consume contributing towers matching requirements
    const consumedTowers: Tower[] = [];
    const remainingReqs: Record<string, number> = { ...selectedCombo.requires };

    for (const t of nearbyReadyTowers) {
      if (remainingReqs[t.colour] && remainingReqs[t.colour] > 0) {
        consumedTowers.push(t);
        remainingReqs[t.colour]--;
        // Set contributing tower combo recharge
        t.comboRechargeTimerMs = selectedCombo.recharge_ms;
      }
    }

    // Set firing tower combo recharge
    firingTower.comboRechargeTimerMs = selectedCombo.recharge_ms;

    // Calculate payload per ENGINE-SPEC §6.3:
    // payload = sum(contributor eff(damage)) * combo.yield * product(combo_mult)
    let sumContributorDamage = firingTower.getEffectiveDamage();
    for (const t of consumedTowers) {
      sumContributorDamage += t.getEffectiveDamage();
    }

    let comboMultProduct = 1.0;
    for (const cm of firingTower.comboMults) {
      comboMultProduct *= cm;
    }

    const payload = sumContributorDamage * selectedCombo.yield * comboMultProduct;

    return {
      combo: selectedCombo,
      payload,
      firingTower,
      consumedTowers,
    };
  }
}
