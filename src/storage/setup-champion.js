// The champion in a setup file (BL-13, D-30): its level, the gear it wears, each piece at a level it has, and its
// skills (BONUS-10), each at a level it has; each value checked on its own, an id unknown told with the nearest.
// No DOM here.
import { nearestId } from "./nearest.js";
import { isObject, rangeProblem, readList, refuse } from "./setup-checks.js";

/** A piece of gear's last level: the length of its bonuses' lists (champion.json). */
export const pieceLevels = (piece) =>
  Object.values({ ...piece.effects, ...piece.march, ...piece.other })[0]?.length ?? 1;

/** A piece of gear worn: a piece of the game's list (`pieces`, when the game has one), at a level it has. */
function gearEntry(entry, path, pieces) {
  if (!isObject(entry) || typeof entry.id !== "string") return { problems: [refuse(path, entry, "not-object")] };
  const piece = pieces?.find((candidate) => candidate.id === entry.id);
  if (pieces && !piece) {
    return { problems: [refuse(`${path}.id`, entry.id, "unknown-gear", { suggestion: nearestId(entry.id, pieces) })] };
  }
  const max = piece ? pieceLevels(piece) : Number.MAX_SAFE_INTEGER;
  const problems = rangeProblem(`${path}.level`, entry.level, 1, max);
  return problems.length ? { problems } : { value: { id: entry.id, level: entry.level }, problems };
}

/** Every skill of the champion's trees (champion-skills.json), each with its last level when known. */
export const allSkills = (skillTrees) => (skillTrees?.trees ?? []).flatMap((tree) => tree.skills);

/** A skill taken: a skill of the trees, at a level from 1 to its last (any, when its last is not known yet). */
function skillEntry(entry, path, skills) {
  if (!isObject(entry) || typeof entry.id !== "string") return { problems: [refuse(path, entry, "not-object")] };
  const skill = skills.find((candidate) => candidate.id === entry.id);
  if (!skill) {
    return { problems: [refuse(`${path}.id`, entry.id, "unknown-skill", { suggestion: nearestId(entry.id, skills) })] };
  }
  const problems = rangeProblem(`${path}.level`, entry.level, 1, skill.max ?? Number.MAX_SAFE_INTEGER);
  return problems.length ? { problems } : { value: { id: entry.id, level: entry.level }, problems };
}

/** The champion (BL-13): its level, from 1 to its last, the gear it wears and its skills; each field read on its own. */
export function readChampion(champion, target) {
  if (!isObject(champion)) return { problems: [refuse("champion", champion, "not-object")] };
  const value = {};
  const problems = [];
  if (champion.level !== undefined) {
    const found = rangeProblem("champion.level", champion.level, 1, target.champion?.champion.power.length ?? 1e9);
    if (found.length) problems.push(...found);
    else value.level = champion.level;
  }
  if (champion.gear !== undefined) {
    const gear = readList(champion.gear, "champion.gear", (entry, path) =>
      gearEntry(entry, path, target.champion?.pieces),
    );
    problems.push(...gear.problems);
    if (gear.value) value.gear = gear.value;
  }
  if (champion.skills !== undefined) {
    const skills = readList(champion.skills, "champion.skills", (entry, path) =>
      skillEntry(entry, path, allSkills(target.championSkills)),
    );
    problems.push(...skills.problems);
    if (skills.value) value.skills = skills.value;
  }
  return { value, problems };
}
