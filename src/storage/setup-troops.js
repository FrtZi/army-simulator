// The troops a player owns, in a setup file (CFG-08, D-34): each troop or defence by its id with the number the
// Chaos Keep's Army tab shows. In the Battle lab a composition above what is owned is warned, never capped.

import { nearestId } from "./nearest.js";
import { isObject, rangeProblem, readList, refuse } from "./setup-checks.js";

/** Every troop and defence of the game, as the file may name them. */
export const ownable = (catalogue) => [...catalogue.units.values(), ...catalogue.defences.values()];

function troopEntry(entry, path, target, seen) {
  if (!isObject(entry) || typeof entry.id !== "string") return { problems: [refuse(path, entry, "not-object")] };
  const known = ownable(target.catalogue);
  if (!known.some((troop) => troop.id === entry.id)) {
    return { problems: [refuse(`${path}.id`, entry.id, "unknown-troop", { suggestion: nearestId(entry.id, known) })] };
  }
  if (seen.has(entry.id)) return { problems: [refuse(`${path}.id`, entry.id, "duplicate-troop")] };
  seen.add(entry.id);
  const problems = rangeProblem(`${path}.count`, entry.count, 0, Number.MAX_SAFE_INTEGER);
  return problems.length ? { problems } : { value: { id: entry.id, count: entry.count }, problems };
}

/** The troops section: each entry checked on its own, a troop listed twice kept once. */
export function readTroops(list, target) {
  const seen = new Set();
  return readList(list, "troops", (entry, path) => troopEntry(entry, path, target, seen));
}
