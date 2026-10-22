// Two armies side by side (ARMY-03, SIM-03): each figure of their profiles with its difference and which one
// is better, then the battle both ways (each attacking the other).

import { armyProfile } from "./profile.js";
import { simulateBattle } from "./battle.js";

/** The figures compared, where to read them in a profile, and which way is better. */
export const COMPARED = [
  { key: "power", read: (p) => p.power, better: "higher" },
  { key: "troops", read: (p) => p.troops, better: "higher" },
  { key: "damage", read: (p) => p.damage.best, better: "higher" },
  { key: "health", read: (p) => p.health, better: "higher" },
  { key: "morale", read: (p) => p.morale, better: "higher" },
  { key: "speed", read: (p) => p.slowestSpeed, better: "higher" },
  { key: "load", read: (p) => p.load, better: "higher" },
  { key: "food", read: (p) => p.foodPerHour, better: "lower" },
];

/** Which of two values is better for a figure: "a", "b" or "same". */
function verdict(a, b, better) {
  if (a === b) return "same";
  return b > a === (better === "higher") ? "b" : "a";
}

/**
 * Compares two army summaries (from summariseArmy): every figure of COMPARED with B − A and the better side,
 * and the two battles, A attacking B and B attacking A. With an empty side, nothing is better ("none") and
 * there is no battle.
 */
export function compareArmies(a, b, rules) {
  const profiles = [armyProfile(a, rules.model), armyProfile(b, rules.model)];
  const fought = a.size > 0 && b.size > 0;
  const figures = COMPARED.map(({ key, read, better }) => {
    const [valueA, valueB] = profiles.map(read);
    return {
      key,
      a: valueA,
      b: valueB,
      difference: valueB - valueA,
      better: fought ? verdict(valueA, valueB, better) : "none",
    };
  });
  return {
    profiles,
    figures,
    battles: fought ? { aAttacks: simulateBattle(a, b, rules), bAttacks: simulateBattle(b, a, rules) } : null,
  };
}
