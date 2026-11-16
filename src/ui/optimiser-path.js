// The path from the army found (SIM-12, D-42, D-43, D-44): each hero to get or raise by a level, each ritual and
// building one level up that can be done now, and the champion's pieces and skills one level up, by its gain on that
// army, the most first; the cost shown, not weighed (Frantz, 2026-11-16: gain first).
import { CONFIG } from "./config.js";
import { currentGame, state, validEffects } from "./state.js";
import { heroesOwned, offered, scores } from "./optimiser-scores.js";
import { highestCopy } from "../storage/setup-buildings.js";
import { championInPlay } from "./lab-setup.js";
import { gearSteps, heroPath, heroSteps, levelledSteps, skillSteps } from "../engine/index.js";

const byId = (list) => new Map(list.map((entry) => [entry.id, entry]));

/** The rituals' and buildings' entries, kind → Map id → entry, as the levelled steps read them. */
export const levelledEntries = (game) => ({
  ritual: byId(game.rituals.rituals),
  structure: byId(game.structures.structures),
});

/** The levels Your setup holds: a building at its highest copy, as a prerequisite reads it. */
const heldOf = (saved) => ({
  ritual: new Map(saved.rituals.map(({ id, level }) => [id, level])),
  structure: new Map(saved.buildings.map((building) => [building.id, highestCopy(building)])),
});

/** The entries a level of which gives a bonus in battle: the only ones a step can gain with. */
function battleIds(game) {
  const inBattle = ({ entries, effects }) =>
    entries
      .filter((entry) => Object.keys(entry.effects).some((id) => effects.find((effect) => effect.id === id)?.stat))
      .map((entry) => entry.id);
  return {
    ritual: inBattle({ entries: game.rituals.rituals, effects: game.rituals.effects }),
    structure: inBattle({ entries: game.structures.structures, effects: game.structures.effects }),
  };
}

/** The setup with each entry reached ({ kind, id, level }) at the higher of its level and the one reached. */
function setupWith(saved, reached) {
  const rituals = byId(saved.rituals);
  const buildings = byId(saved.buildings);
  for (const { kind, id, level } of reached) {
    const held = kind === "ritual" ? rituals : buildings;
    const now = held.get(id) ?? { id, level: 0 };
    held.set(id, { ...now, level: Math.max(level, now.level) });
  }
  return { ...saved, rituals: [...rituals.values()], buildings: [...buildings.values()] };
}

/**
 * Each ritual and building one level up that can be done now, by its gain on the army found. A step whose
 * prerequisites are not all held waits for them: counted with them, a deep ritual took their gains and their cost
 * (+161 % for a bundle of fifty, D-43); its prerequisites are steps of their own, so the path keeps them first.
 */
function levelledPath(found, goal) {
  const game = currentGame();
  const saved = state.savedPlayerSetup;
  return levelledSteps(levelledEntries(game), heldOf(saved), battleIds(game))
    .filter((step) => !step.first.length)
    .map((step) => {
      const reached = [{ kind: step.kind, id: step.id, level: step.to }];
      const shared = validEffects({ ...state, savedPlayerSetup: setupWith(saved, reached) });
      return { ...step, gain: scores(goal, shared).score(found.composition) - found.score };
    })
    .filter((step) => step.gain > 0);
}

/** The champion in play with a step taken: its piece one level up or put on, or its skill one level up. */
function championWith(champion, { kind, id, to }) {
  const set = (list) => [...list.filter((entry) => entry.id !== id), { id, level: to }];
  if (kind === "gear") return { ...champion, gear: set(champion.gear ?? []) };
  return { ...champion, skills: set(champion.skills ?? []) };
}

/** Each piece and skill of the champion in play one level up, by its gain on the army found. */
function championPath(found, goal) {
  const { champion, championSkills } = currentGame();
  const saved = state.savedPlayerSetup;
  const now = championInPlay(state);
  const points = (tree) => (now.level ? champion.champion[tree.points][now.level - 1] : 0);
  const skills = new Map((now.skills ?? []).map(({ id, level }) => [id, level]));
  const steps = [
    ...gearSteps(now.gear ?? [], champion.pieces, heldOf(saved).structure),
    ...skillSteps(championSkills.trees, skills, points),
  ];
  return steps
    .map((step) => {
      const seen = { ...state, labChampion: "", savedPlayerSetup: { ...saved, champion: championWith(now, step) } };
      return { ...step, gain: scores(goal, validEffects(seen), seen).score(found.composition) - found.score };
    })
    .filter((step) => step.gain > 0);
}

/** The path: the heroes' steps, the rituals' and buildings', the champion's, the most gain first, the first few. */
export function pathFrom(found, goal) {
  const { warlords, game } = currentGame();
  const rules = game.heroRules;
  const owned = new Map(heroesOwned().map(({ id, level }) => [id, level]));
  const steps = heroSteps([...warlords.keys()], owned, rules.ranks * rules.levelsPerRank);
  const heroes = heroPath(found, steps, { score: scores(goal).score, offered, ...rules });
  return [...heroes, ...levelledPath(found, goal), ...championPath(found, goal)]
    .sort((a, b) => b.gain - a.gain)
    .slice(0, CONFIG.optimiser.pathSteps);
}
