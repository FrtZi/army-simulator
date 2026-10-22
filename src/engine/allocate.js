// Where a strike's damage goes (official rules and the game's community wiki): the lowest tier of the target
// side first; within a tier, in the order of `damageOrderWithinTier` (defences, melee, ranged, then broken
// troops), and within each of those the higher morale first. Broken troops can only be hit by ranged attacks.
// Damage left over after a target falls moves on to the next one. Counts stay fractional: the engine computes
// the expected outcome.

import { category, healthPerTroop, tierFactor } from "./combat.js";

const PERCENT = 100;

/** The target slots in the order damage reaches them: each a group and whether it is its broken part. */
export function targetOrder(side, damageOrder, model) {
  const tiers = [...new Set(side.map((group) => group.unit.tier))].sort((a, b) => a - b);
  const byMorale = (a, b) => b.stats.morale - a.stats.morale;
  return tiers.flatMap((tier) =>
    damageOrder.flatMap((kind) =>
      side
        .filter((group) => group.unit.tier === tier && (kind === "broken" || category(group, model) === kind))
        .sort(byMorale)
        .map((group) => ({ group, broken: kind === "broken" })),
    ),
  );
}

const slotSize = ({ group, broken }) => (broken ? group.broken : group.count - group.broken);

/** Applies one group's raw damage to the target side; returns the damage left once every target has fallen. */
export function strike(striker, mode, rawDamage, targetSide, rules) {
  const { model } = rules;
  let remaining = rawDamage;
  for (const slot of targetOrder(targetSide, rules.damageOrderWithinTier, model)) {
    if (remaining <= 0) break;
    if (slot.broken && mode !== "ranged") continue; // melee cannot reach broken troops
    const brokenBonus = slot.broken ? 1 + model.brokenRangedBonusPercent / PERCENT : 1;
    const factor = tierFactor(striker.unit.tier, slot.group.unit.tier, model) * brokenBonus;
    const health = healthPerTroop(slot.group.stats, model);
    if (factor <= 0 || health <= 0 || slotSize(slot) <= 0) continue;
    const kills = Math.min(slotSize(slot), (remaining * factor) / health);
    slot.group.count -= kills;
    if (slot.broken) slot.group.broken -= kills;
    slot.group.lostThisTurn += kills;
    remaining -= (kills * health) / factor;
  }
  return Math.max(0, remaining);
}
