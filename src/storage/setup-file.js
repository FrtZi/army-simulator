// Reads a setup file (CFG-05, D-27): what the player has in game, whole or in part, written by a person or by an
// agent reading screenshots. Every value is checked on its own: a refused value is reported with where it is,
// what was read and why, and the rest is kept. Only a file that is not a setup stops the reading. No DOM here.

import { effectProblems, levelOf, rankOf } from "../engine/index.js";
import { nearestId } from "./nearest.js";

export const SETUP_FORMAT = "army-simulator/setup";
export const SETUP_VERSION = 1;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const refuse = (path, read, code, extra = {}) => ({ path, read, code, ...extra });

/** A whole number in its range, or the problem saying why not. */
const rangeProblem = (path, read, min, max) =>
  isInteger(read, min, max) ? [] : [refuse(path, read, "out-of-range", { min, max })];

function warlordEntry(entry, path, target, seen) {
  if (!isObject(entry)) return { problems: [refuse(path, entry, "not-object")] };
  const { ranks, levelsPerRank } = target.game.heroRules;
  if (!target.warlords.has(entry.id)) {
    const suggestion = nearestId(entry.id, [...target.warlords.values()]);
    return { problems: [refuse(`${path}.id`, entry.id, "unknown-warlord", { suggestion })] };
  }
  if (seen.has(entry.id)) return { problems: [refuse(`${path}.id`, entry.id, "duplicate")] };
  seen.add(entry.id);
  const problems = [
    ...rangeProblem(`${path}.rank`, entry.rank, 1, ranks),
    ...rangeProblem(`${path}.level`, entry.level, 1, levelsPerRank),
  ];
  if (problems.length) return { problems };
  return { value: { id: entry.id, level: levelOf(entry.rank, entry.level, target.game.heroRules) }, problems };
}

function bonusEntry(entry, path, target) {
  if (!isObject(entry)) return { problems: [refuse(path, entry, "not-object")] };
  // the march capacity bonus has its own field: in the bonuses it would count twice (DEF-017)
  if (entry.stat === "marchCapacity") return { problems: [refuse(`${path}.stat`, entry.stat, "capacity-bonus")] };
  if (entry.target !== undefined && !(isObject(entry.target) && Object.values(entry.target).every(Array.isArray))) {
    return { problems: [refuse(`${path}.target`, entry.target, "not-object")] };
  }
  const problems = effectProblems(entry, target.game, target.catalogue).map((problem) =>
    refuse(path, entry, problem.code, problem),
  );
  if (problems.length) return { problems };
  const { stat, percent, target: troops, source } = entry;
  return { value: { stat, percent, ...(troops && { target: troops }), ...(source && { source }) }, problems };
}

/**
 * A ritual or a building at its level (BONUS-04, BONUS-07): an id of the game's list (`entries`; when the game has
 * none, any id is kept as read) and a level from 0 to the entry's last. An unknown id gets the nearest as suggestion.
 */
function levelledEntry(entry, path, entries, unknownCode) {
  if (!isObject(entry) || typeof entry.id !== "string") return { problems: [refuse(path, entry, "not-object")] };
  const known = entries?.find((candidate) => candidate.id === entry.id);
  if (entries && !known) {
    return { problems: [refuse(`${path}.id`, entry.id, unknownCode, { suggestion: nearestId(entry.id, entries) })] };
  }
  const problems = rangeProblem(`${path}.level`, entry.level, 0, known ? known.power.length : Number.MAX_SAFE_INTEGER);
  return problems.length ? { problems } : { value: { id: entry.id, level: entry.level }, problems };
}

/** A list section: each entry read on its own; the refused ones reported, the others kept. */
function readList(list, name, readEntry) {
  if (!Array.isArray(list)) return { problems: [refuse(name, list, "not-list")] };
  const results = list.map((entry, index) => readEntry(entry, `${name}[${index}]`));
  return {
    value: results.filter((result) => result.value).map((result) => result.value),
    problems: results.flatMap((result) => result.problems),
  };
}

function readCapacity(capacity, target) {
  if (!isObject(capacity)) return { problems: [refuse("capacity", capacity, "not-object")] };
  const { min, max } = target.game.bonusPercent;
  const value = {};
  const problems = [];
  if (capacity.base !== undefined) {
    const found = rangeProblem("capacity.base", capacity.base, 0, Number.MAX_SAFE_INTEGER);
    if (found.length) problems.push(...found);
    else value.base = capacity.base;
  }
  if (capacity.bonusPercent !== undefined) {
    const read = capacity.bonusPercent;
    if (typeof read === "number" && read >= min && read <= max) value.bonusPercent = read;
    else problems.push(refuse("capacity.bonusPercent", read, "out-of-range", { min, max }));
  }
  return { value, problems };
}

/** Each section the file may hold, and how it is read. */
const SECTIONS = {
  warlords: (list, target) => {
    const seen = new Set();
    return readList(list, "warlords", (entry, path) => warlordEntry(entry, path, target, seen));
  },
  capacity: readCapacity,
  bonuses: (list, target) => readList(list, "bonuses", (entry, path) => bonusEntry(entry, path, target)),
  rituals: (list, target) =>
    readList(list, "rituals", (entry, path) => levelledEntry(entry, path, target.rituals?.rituals, "unknown-ritual")),
  buildings: (list, target) =>
    readList(list, "buildings", (entry, path) =>
      levelledEntry(entry, path, target.structures?.structures, "unknown-building"),
    ),
  champion: (champion) =>
    isObject(champion) ? { value: champion, problems: [] } : { problems: [refuse("champion", champion, "not-object")] },
};

/**
 * Reads a parsed setup file for the game found in `games` (id → { game, catalogue, warlords }). Returns
 * { game, sections, problems }: the sections the file holds, with their accepted values, and every refused
 * value; or { problems } alone when the file is not a setup, of another version or another game.
 */
export function readSetupFile(file, games) {
  if (!isObject(file) || file.format !== SETUP_FORMAT) return { problems: [{ code: "not-setup" }] };
  if (file.version !== SETUP_VERSION) return { problems: [{ code: "version", read: file.version }] };
  const target = games[file.game];
  if (!target) return { problems: [{ code: "game", read: file.game }] };
  const sections = {};
  const problems = [];
  for (const [name, read] of Object.entries(SECTIONS)) {
    if (file[name] === undefined || file[name] === null) continue; // absent: the player's own stays
    const result = read(file[name], target);
    if (result.value !== undefined) sections[name] = result.value;
    problems.push(...result.problems);
  }
  return { game: file.game, sections, problems };
}

/** The setup as a file to download: whole, the warlords' levels as the game shows them (rank, level). */
export function writeSetupFile(setup, game) {
  const { game: id, warlords, ...rest } = setup;
  return {
    format: SETUP_FORMAT,
    version: SETUP_VERSION,
    game: id,
    warlords: warlords.map((warlord) => ({ id: warlord.id, ...rankOf(warlord.level, game.heroRules) })),
    ...rest,
  };
}
