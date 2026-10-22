// The per-troop combat figures, as the game's community wiki documents them (Combat Mechanics, D-16): damage
// per troop = attack × damage / damageDivisor; effective health per troop = armour × health / healthDivisor
// (both with their bonuses). The divisors live in data/<game>/combat-rules.json.

const PERCENT = 100;
const ATTACK = { melee: ["meleeAttack", "meleeDamage"], ranged: ["rangedAttack", "rangedDamage"] };

/** Damage one troop deals with its melee or ranged attack (0 when it has none). */
export function damagePerTroop(stats, mode, model) {
  const [attack, damage] = ATTACK[mode];
  return ((stats[attack] ?? 0) * (stats[damage] ?? 0)) / model.damageDivisor;
}

/** Damage one troop takes before it falls: its effective health. */
export function healthPerTroop(stats, model) {
  return (stats.armour * stats.health) / model.healthDivisor;
}

/** The bonus (or penalty) for striking a lower (or higher) tier: a percentage per tier of difference. */
export function tierFactor(attackerTier, targetTier, model) {
  return Math.max(0, 1 + (model.tierModifierPercent / PERCENT) * (attackerTier - targetTier));
}

/** The attack a troop prefers: the one that deals more damage, bonuses included (wiki); melee on a tie. */
export function preferredMode(stats, model) {
  return damagePerTroop(stats, "ranged", model) > damagePerTroop(stats, "melee", model) ? "ranged" : "melee";
}

/** Defences, melee or ranged: where a group stands in the order of combat. */
export const category = (group, model) =>
  group.unit.unitType === "defences" ? "defences" : preferredMode(group.stats, model);

/**
 * How a group strikes: with its preferred attack, except a ranged group with nothing left in front of it at
 * its tier (no defences, no melee troops on its own side): it is engaged in melee and uses its melee stats.
 */
export function attackMode(group, side, model) {
  if (category(group, model) !== "ranged") return "melee";
  const screened = side.some(
    (other) =>
      other.unit.tier === group.unit.tier && other.count > 0 && ["defences", "melee"].includes(category(other, model)),
  );
  return screened ? "ranged" : "melee";
}
