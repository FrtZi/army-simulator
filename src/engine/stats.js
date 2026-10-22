// Effective values: a base value raised by the bonuses on its stat. Bonuses are percentages; they add up, then
// apply once to the base (decisions.md, D-12: provisional until the calibration).

import { appliesTo } from "./targets.js";

const PERCENT = 100;

/** The total percentage the effects give one stat. */
export function bonusPercent(effects, stat) {
  return effects.filter((effect) => effect.stat === stat).reduce((total, effect) => total + effect.percent, 0);
}

/** A base value raised by a percentage. */
export function applyPercent(base, percent) {
  return base * (1 + percent / PERCENT);
}

/** The troop's stats with every effect that targets it; stats the troop lacks stay absent. */
export function effectiveStats(troop, effects) {
  const own = effects.filter((effect) => appliesTo(effect, troop));
  return Object.fromEntries(
    Object.entries(troop.stats).map(([stat, base]) => [stat, applyPercent(base, bonusPercent(own, stat))]),
  );
}

/** The march capacity, split: the player's base, the bonus on top, and the total. */
export function marchCapacity(limits, effects) {
  const base = limits.marchCapacity;
  const percent = bonusPercent(effects, "marchCapacity");
  const total = applyPercent(base, percent);
  return { base, percent, bonus: total - base, total };
}
