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
  const effects = (configuration.sources ?? []).flatMap((source) => source.effects ?? []);
  const scenarios = configuration.scenarios ?? [];
  const problems = [
    ...effects.flatMap((effect) => effectProblems(effect, target.game, target.catalogue)),
    ...troopProblems(scenarios, target.catalogue),
  ];
  if (!isCount(configuration.limits?.marchCapacity)) problems.push({ code: "capacity" });
  if (problems.length) return { problems };
  const capacity = effects.filter((effect) => effect.stat === "marchCapacity");
  return {
    setup: {
      game: configuration.game,
      marchCapacity: configuration.limits.marchCapacity,
      capacityBonus: capacity.reduce((total, effect) => total + effect.percent, 0),
      bonuses: effects.filter((effect) => effect.stat !== "marchCapacity"),
      compositions: scenarios.map((scenario) => ({ name: scenario.name ?? "", troops: { ...scenario.troops } })),
    },
  };
}
