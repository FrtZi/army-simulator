// Checks a bonus (an effect) a player enters, against the game's vocabulary. Returns the problems found, as
// codes the page translates, instead of throwing: the form shows every problem at once.

import { TARGET_FIELDS } from "./targets.js";

const ids = (entries) => entries.map((entry) => entry.id);

/** The values each target filter accepts in this game and this catalogue. */
function targetValues(game, catalogue) {
  const values = Object.fromEntries(Object.keys(TARGET_FIELDS).map((filter) => [filter, ids(game[filter] ?? [])]));
  values.units = [...catalogue.units.keys(), ...catalogue.defences.keys()];
  return values;
}

function statProblems(effect, game) {
  const troopStat = game.troopStats.find((stat) => stat.id === effect.stat);
  const armyStat = game.armyStats.find((stat) => stat.id === effect.stat);
  if (!troopStat && !armyStat) return [{ code: "unknown-stat", stat: effect.stat }];
  if (troopStat?.boostable === false) return [{ code: "fixed-stat", stat: effect.stat }];
  if (armyStat && effect.target) return [{ code: "army-stat-target", stat: effect.stat }];
  return [];
}

function percentProblems(effect, { min, max }) {
  const { percent } = effect;
  if (typeof percent !== "number" || !Number.isFinite(percent)) return [{ code: "percent-missing" }];
  return percent < min || percent > max ? [{ code: "percent-out-of-range", percent, min, max }] : [];
}

function targetProblems(effect, allowed) {
  return Object.entries(effect.target ?? {}).flatMap(([filter, values]) => {
    if (!(filter in allowed)) return [{ code: "unknown-filter", filter }];
    return values
      .filter((value) => !allowed[filter].includes(value))
      .map((value) => ({ code: "unknown-value", filter, value }));
  });
}

/** Every problem of one effect: unknown or fixed stat, percentage missing or out of range, unknown target. */
export function effectProblems(effect, game, catalogue) {
  return [
    ...statProblems(effect, game),
    ...percentProblems(effect, game.bonusPercent),
    ...targetProblems(effect, targetValues(game, catalogue)),
  ];
}
