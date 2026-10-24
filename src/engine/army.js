// An army: a count per troop type. Its size is checked against the march capacity, its power is the sum of
// count × power per troop ("Puissance d'escouade" on the sheet: the power each troop adds, D-12).

import { effectiveStats, marchCapacity } from "./stats.js";

/** Looks up each troop of the army; throws on an unknown id or a defence (defences never march, D-11). */
function lineUp(troops, catalogue) {
  return Object.entries(troops).map(([id, count]) => {
    if (catalogue.defences.has(id)) throw new Error(`"${id}" is a defence: it cannot march in an army`);
    const unit = catalogue.units.get(id);
    if (!unit) throw new Error(`Unknown troop "${id}"`);
    if (!Number.isInteger(count) || count < 0) throw new Error(`"${id}": the count must be a whole number ≥ 0`);
    return { unit, count };
  });
}

/** Indexes the game's units and defences by id, once, for every army that follows. */
export function indexCatalogue(units, defences = []) {
  return {
    units: new Map(units.map((unit) => [unit.id, unit])),
    defences: new Map(defences.map((defence) => [defence.id, defence])),
  };
}

/**
 * Everything the engine knows about an army: each troop line with its effective stats and power, the size
 * against the march capacity (base, bonus, total) with the excess, and the total power. Bonuses change stats
 * and capacity, not power. Heroes (heroUnit, D-26) fight as lines of one, with their own stats at their level:
 * no bonus changes them (open question 14), they take no place in the march (open question 18), their power
 * counts.
 */
export function summariseArmy(troops, catalogue, effects, limits, heroUnits = []) {
  const lines = lineUp(troops, catalogue).map(({ unit, count }) => ({
    unit,
    count,
    stats: effectiveStats(unit, effects),
    power: count * unit.stats.squadPower,
  }));
  const heroes = heroUnits.map((unit) => ({ unit, count: 1, stats: unit.stats, power: unit.stats.squadPower }));
  const size = lines.reduce((total, line) => total + line.count, 0);
  const capacity = marchCapacity(limits, effects);
  return {
    lines,
    heroes,
    size,
    capacity,
    excess: Math.max(0, size - capacity.total),
    power: [...lines, ...heroes].reduce((total, line) => total + line.power, 0),
  };
}

/** Every line that fights: the troops, then the heroes. */
export const fighters = (army) => [...army.lines, ...(army.heroes ?? [])];
