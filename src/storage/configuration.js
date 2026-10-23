// A setup as a configuration file (CFG-01, CFG-02), in the format of docs/data-model.md: the game, the march
// capacity, the bonuses as one manual source, and the compositions as scenarios. Reading a file checks every
// part against the game's data and returns problem codes instead of half a setup. No DOM, no storage here.

import { effectProblems } from "../engine/index.js";

export const SCHEMA_VERSION = 1;

/** A setup as a configuration: { game, capacity, bonuses (engine effects), compositions [{name, troops}] }. */
export function toConfiguration(setup, name) {
  const capacityBonus = { stat: "marchCapacity", percent: setup.capacityBonus };
  return {
    schemaVersion: SCHEMA_VERSION,
    game: setup.game,
    name,
    limits: { marchCapacity: setup.marchCapacity },
    sources: [{ kind: "manual", effects: [...setup.bonuses, capacityBonus] }],
    scenarios: setup.compositions.map((composition, index) => ({
      id: `composition-${index + 1}`,
      name: composition.name,
      troops: { ...composition.troops },
    })),
  };
}

const isCount = (value) => Number.isInteger(value) && value >= 0;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const listOf = (value, isItem) => value === undefined || (Array.isArray(value) && value.every(isItem));
const isTarget = (target) => target === undefined || (isObject(target) && Object.values(target).every(Array.isArray));
const isEffect = (effect) => isObject(effect) && isTarget(effect.target);
const isSource = (source) => isObject(source) && listOf(source.effects, isEffect);
const isScenario = (scenario) => isObject(scenario) && (scenario.troops === undefined || isObject(scenario.troops));

/** True when every part of a file has the shape the checks below read: lists, objects, a target per effect. */
const hasShape = (configuration) =>
  listOf(configuration.sources, isSource) && listOf(configuration.scenarios, isScenario);

function troopProblems(scenarios, catalogue) {
  return scenarios.flatMap((scenario) =>
    Object.entries(scenario.troops ?? {})
      .filter(([id, count]) => !catalogue.units.has(id) || !isCount(count))
      .map(([id]) => ({ code: "unknown-troop", id })),
  );
}

/**
 * Reads a configuration back into a setup, for the game found in `games` (id → { game, catalogue }). Returns
 * { setup } or { problems }: wrong version, unknown game, a bonus the game refuses, an unknown troop.
 */
export function fromConfiguration(configuration, games) {
  if (configuration?.schemaVersion !== SCHEMA_VERSION) return { problems: [{ code: "version" }] };
  const target = games[configuration.game];
  if (!target) return { problems: [{ code: "game", id: configuration.game }] };
  // a wrong shape is refused before any check reads it: it once threw instead (DEF-014)
  if (!hasShape(configuration)) return { problems: [{ code: "shape" }] };
  const effects = (configuration.sources ?? []).flatMap((source) => source.effects ?? []);
  const scenarios = configuration.scenarios ?? [];
  const problems = [
    ...effects.flatMap((effect) => effectProblems(effect, target.game, target.catalogue)),
    ...troopProblems(scenarios, target.catalogue),
  ];
  if (!isCount(configuration.limits?.marchCapacity)) problems.push({ code: "capacity" });
  // the page holds one capacity bonus: several add up, and their sum keeps to the limits (DEF-017)
  const capacityBonus = effects
    .filter((effect) => effect.stat === "marchCapacity")
    .reduce((total, effect) => total + effect.percent, 0);
  const { min, max } = target.game.bonusPercent;
  if (capacityBonus < min || capacityBonus > max) {
    problems.push({ code: "percent-out-of-range", percent: capacityBonus, min, max });
  }
  if (problems.length) return { problems };
  return {
    setup: {
      game: configuration.game,
      marchCapacity: configuration.limits.marchCapacity,
      capacityBonus,
      bonuses: effects.filter((effect) => effect.stat !== "marchCapacity"),
      compositions: scenarios.map((scenario) => ({ name: scenario.name ?? "", troops: { ...scenario.troops } })),
    },
  };
}
