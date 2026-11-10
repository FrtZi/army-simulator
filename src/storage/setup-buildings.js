// Several copies of a building (BL-27, D-33): the game lets some troop producers be built up to 5 times (Frantz,
// 2026-11-10: the Dungeon, the Training Ground, the Bestiary), each copy at its own level and each giving its own
// bonus. A setup's building holds its first copy's `level` and, when it has more, the others' levels in `copies`.

import { rangeProblem, refuse } from "./setup-checks.js";

/** The most copies of a building the game allows (data/<game>/game.json `buildings`); 1 when it says nothing. */
export const mostCopies = (game, id) => game.buildings?.find((building) => building.id === id)?.maxCopies ?? 1;

/** Every copy of each building at its level, as the levelled source reads them: one { id, level } per copy. */
export const eachCopy = (buildings) =>
  buildings.flatMap(({ id, level, copies = [] }) => [level, ...copies].map((each) => ({ id, level: each })));

/** The highest level among a building's copies. */
export const highestCopy = (building) => Math.max(building.level, ...(building.copies ?? []));

/**
 * A building read with its first level (`read`, from the levelled reader), then its other copies checked: a list,
 * no longer than the game allows, each level from 1 to the building's last.
 */
export function withCopies(read, entry, path, target) {
  if (!read.value || entry.copies === undefined) return read;
  if (!Array.isArray(entry.copies)) return { problems: [refuse(`${path}.copies`, entry.copies, "not-list")] };
  const most = mostCopies(target.game, entry.id);
  if (entry.copies.length > most - 1) {
    return { problems: [refuse(`${path}.copies`, entry.copies, "too-many-copies", { max: most })] };
  }
  const last = target.structures.structures.find((building) => building.id === entry.id).power.length;
  const problems = entry.copies.flatMap((level, index) => rangeProblem(`${path}.copies[${index}]`, level, 1, last));
  if (problems.length) return { problems };
  return { value: { ...read.value, ...(entry.copies.length && { copies: entry.copies }) }, problems: [] };
}
