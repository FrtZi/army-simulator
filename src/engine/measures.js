// Two army-wide measures: what an army can deal in one strike, and how much damage it can take. They give a
// quick comparison of armies without a battle, and the figures of the control (SIM-07, D-10).

import { damagePerTroop, healthPerTroop } from "./combat.js";

/** Damage the army deals in one strike, each line with its stronger attack (SIM-07). */
export function armyDamage(army, model) {
  return army.lines.reduce(
    (total, line) =>
      total +
      line.count * Math.max(damagePerTroop(line.stats, "melee", model), damagePerTroop(line.stats, "ranged", model)),
    0,
  );
}

/** Damage the army can take before it falls: the sum of its troops' effective health. */
export function armyHealth(army, model) {
  return army.lines.reduce((total, line) => total + line.count * healthPerTroop(line.stats, model), 0);
}
