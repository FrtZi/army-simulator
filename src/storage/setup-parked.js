// A value left out of an uploaded setup file, parked until the player chooses (CFG-05, Frantz 2026-11-09): when a
// list can fix it (a hero's id, its rank or level, a bonus's stat, a target's value), the list is offered with the
// nearest entry chosen for a misread name; the choice is written into the file, which is read again whole, so every
// check still applies. No DOM here.
import { nearestId } from "./nearest.js";
import { readSetupFile } from "./setup-file.js";

const numbers = (max) =>
  Array.from({ length: max }, (_, index) => ({
    id: index + 1,
    labels: { en: String(index + 1), fr: String(index + 1) },
  }));

// a hero's field, and the rule of the game that bounds it
const HERO_RANGES = { rank: "ranks", level: "levelsPerRank" };

// a suggestion corrects a misread name; for a number it would be a guess
const parked = (path, read, entries) => ({
  path,
  read,
  entries,
  suggestion: typeof read === "string" ? nearestId(read, entries) : null,
});

/** The values a target filter takes in this game: a vocabulary list, or for `units` every troop and defence. */
const filterEntries = (filter, { game, catalogue }) =>
  filter === "units" ? [...catalogue.units.values(), ...catalogue.defences.values()] : (game[filter] ?? []);

/**
 * The list that fixes a value left out, where its choice is written, and the nearest entry; null when no list can
 * (a duplicate, a percentage out of range, a section of the wrong shape). `target`: { game, catalogue, warlords }.
 */
/** A number out of range: a hero's rank or level, or a ritual's or building's level (0, not there, to its last). */
function rangeChoice(problem, { game }) {
  const hero = problem.path.match(/^warlords\[\d+\]\.(rank|level)$/)?.[1];
  if (hero) return parked(problem.path, problem.read, numbers(game.heroRules[HERO_RANGES[hero]]));
  if (!/^(rituals|buildings)\[\d+\]\.level$/.test(problem.path)) return null;
  return parked(problem.path, problem.read, [{ id: 0, labels: { en: "0", fr: "0" } }, ...numbers(problem.max)]);
}

function statChoice(problem, { game }) {
  const stats = game.troopStats.filter((stat) => stat.boostable !== false);
  return parked(`${problem.path}.stat`, problem.read.stat, stats);
}

function valueChoice(problem, target) {
  const index = problem.read.target[problem.filter].indexOf(problem.value);
  const path = `${problem.path}.target.${problem.filter}[${index}]`;
  return parked(path, problem.value, filterEntries(problem.filter, target));
}

/** Each kind of value left out a list can fix, and how its list is made. */
const CHOICES = {
  "unknown-warlord": (problem, target) => parked(problem.path, problem.read, [...target.warlords.values()]),
  "unknown-ritual": (problem, target) => parked(problem.path, problem.read, target.rituals.rituals),
  "unknown-building": (problem, target) => parked(problem.path, problem.read, target.structures.structures),
  "out-of-range": rangeChoice,
  "unknown-stat": statChoice,
  "fixed-stat": statChoice,
  "unknown-value": valueChoice,
};

export function parkedChoice(problem, target) {
  return CHOICES[problem.code]?.(problem, target) ?? null;
}

/** A copy of the file with one value replaced, at a path such as "warlords[1].id" or "bonuses[0].target.tiers[2]". */
export function withValue(file, path, value) {
  const copy = JSON.parse(JSON.stringify(file));
  const keys = path.match(/[^.[\]]+/g);
  const holder = keys.slice(0, -1).reduce((node, key) => node[key], copy);
  holder[keys.at(-1)] = value;
  return copy;
}

/** Reads the file with the player's choices written in (path → value; null: leave it out), as readSetupFile does. */
export function readWithChoices(file, choices, games) {
  const chosen = Object.entries(choices)
    .filter(([, value]) => value !== null)
    .reduce((current, [path, value]) => withValue(current, path, value), file);
  return readSetupFile(chosen, games);
}
