// An army's overall profile (SIM-08): what it deals, what it takes, how it holds and what it costs, without a
// battle. Built on an army summary (summariseArmy), so the bonuses are already in the stats.

import { damagePerTroop, healthPerTroop, preferredMode } from "./combat.js";
import { armyDamage, armyHealth } from "./measures.js";
import { fighters } from "./army.js";

const PER_HOUR = 100; // food upkeep is given per 100 troops per hour
const ATTACK_STATS = { melee: ["meleeAttack", "meleeDamage"], ranged: ["rangedAttack", "rangedDamage"] };

const sum = (lines, value) => lines.reduce((total, line) => total + line.count * value(line), 0);

/** Troops per value of a field (tier, attack type, unit type): how the army is spread. */
function spread(lines, field) {
  const counts = {};
  for (const line of lines) counts[line.unit[field]] = (counts[line.unit[field]] ?? 0) + line.count;
  return counts;
}

/**
 * Every line's own figures: the attack it strikes with and that attack's two stats (attack, damage), its
 * armour and health, then the totals they make: damage per strike and effective health; and its power.
 */
function lineProfiles(lines, model) {
  return lines.map((line) => {
    const mode = preferredMode(line.stats, model);
    const [attack, damage] = ATTACK_STATS[mode];
    return {
      unit: line.unit,
      hero: line.unit.unitType === "hero",
      count: line.count,
      power: line.power,
      powerPerTroop: line.unit.stats.squadPower,
      mode,
      attack: line.stats[attack] ?? 0,
      damagePerHit: line.stats[damage] ?? 0,
      armour: line.stats.armour,
      healthPerTroop: line.stats.health,
      damage: line.count * damagePerTroop(line.stats, mode, model),
      health: line.count * healthPerTroop(line.stats, model),
    };
  });
}

/**
 * The army's profile: size and power; damage per strike in melee, at range and with each line's stronger
 * attack; its tanking — effective health, and the raw health and average armour it comes from; average
 * morale (per troop); slowest troop speed; total load; food upkeep per hour; troops per tier and per attack
 * type; and each line's own figures.
 */
export function armyProfile(army, model) {
  const lines = fighters(army); // the troops, then the heroes: they fight, march and carry too (D-26)
  const fielded = lines.filter((line) => line.count > 0);
  const counted = lines.reduce((total, line) => total + line.count, 0);
  const perTroop = (value) => (counted > 0 ? sum(lines, value) / counted : 0);
  return {
    troops: army.size,
    heroes: (army.heroes ?? []).length,
    power: army.power,
    damage: {
      melee: sum(lines, (line) => damagePerTroop(line.stats, "melee", model)),
      ranged: sum(lines, (line) => damagePerTroop(line.stats, "ranged", model)),
      best: armyDamage(army, model),
    },
    health: armyHealth(army, model),
    rawHealth: sum(lines, (line) => line.stats.health),
    averageArmour: perTroop((line) => line.stats.armour),
    morale: perTroop((line) => line.stats.morale),
    slowestSpeed: fielded.length ? Math.min(...fielded.map((line) => line.stats.speed)) : 0,
    load: sum(lines, (line) => line.stats.load ?? 0),
    foodPerHour: sum(lines, (line) => (line.stats.foodUpkeep ?? 0) / PER_HOUR), // heroes eat nothing on the sheets
    byTier: spread(lines, "tier"),
    byAttackType: spread(lines, "attackType"),
    lines: lineProfiles(lines, model),
  };
}
