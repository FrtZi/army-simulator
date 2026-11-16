// The path from the army found (SIM-12, D-42, D-43, D-44): each hero to get or raise by a level, each ritual and
// building one level up that can be done now, and the champion's pieces and skills one level up, by its gain on that
// army, the most first; the cost shown, not weighed (Frantz, 2026-11-16: gain first). Every branch is linked (D-45):
// each step is judged at a glance, then the best and those that raise the capacity are settled, their talents chosen
// again and their troops moved, the capacity they free filled.
import { CONFIG } from "./config.js";
import { currentGame, state, validEffects } from "./state.js";
import { heroesOwned, offered, scores } from "./optimiser-scores.js";
import { highestCopy } from "../storage/setup-buildings.js";
import { championInPlay } from "./lab-setup.js";
import {
  gearSteps,
  heroPath,
  heroSteps,
  levelledSteps,
  rank,
  settle,
  skillSteps,
  topUp,
  wholePlaces,
} from "../engine/index.js";

const byId = (list) => new Map(list.map((entry) => [entry.id, entry]));

/** A step judged at a glance: the army found as it is, scored with the step; `judge` kept to settle it later. */
const glance = (found, step, judge) => ({
  ...step,
  judge,
  start: found.composition,
  base: found.score,
  gain: judge.score(found.composition) - found.score,
});

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
      return glance(found, step, scores(goal, validEffects({ ...state, savedPlayerSetup: setupWith(saved, reached) })));
    });
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
  return steps.map((step) => {
    const seen = { ...state, labChampion: "", savedPlayerSetup: { ...saved, champion: championWith(now, step) } };
    return glance(found, step, scores(goal, validEffects(seen), seen));
  });
}

const placed = (troops) => Object.values(troops).reduce((sum, count) => sum + count, 0);

/** Whether a step leaves capacity free: then its gain shows only once its troops fill it. */
const freeing = (step) => step.judge.capacity(step.start) > placed(step.start.troops);

/**
 * A step settled: its talents chosen again, its troops moved and the capacity it freed filled, every branch linked;
 * its gain against the army found settled the same way (`again`), so a better arrangement of the troops, found with
 * or without the step, is not counted as the step's.
 */
function settled(step, { owned, settings, again }) {
  const { score, capacity } = step.judge;
  const done = settle(step.start, { owned: [...owned], capacity, offered, score, ...settings });
  return { ...step, gain: done.score - Math.max(step.base, again), composition: done.composition };
}

/** Of the pieces to put on in one empty slot, the best only: they are a choice, not steps one after the other. */
function bestPerSlot(steps) {
  const slotOf = (id) => currentGame().champion.pieces.find((piece) => piece.id === id).slot;
  const seen = new Set();
  return steps.filter((step) => {
    if (step.kind !== "gear" || step.from) return true;
    const slot = slotOf(step.id);
    if (seen.has(slot)) return false;
    seen.add(slot);
    return true;
  });
}

/**
 * The path from the army found (its troops owned within the aim, `owned`): the heroes', rituals' and buildings', and
 * the champion's steps, the best settled, the most gain first, the first few.
 */
export function pathFrom(found, goal, owned) {
  const { warlords, game } = currentGame();
  const rules = game.heroRules;
  const settings = { ...CONFIG.optimiser, ...rules };
  const judge = scores(goal);
  const held = new Map(heroesOwned().map(({ id, level }) => [id, level]));
  // the heroes judged with the places their talents free filled: a talent raising the capacity counts at a glance
  const order = rank([...owned], wholePlaces(judge.capacity(found.composition)), (some) =>
    judge.score({ ...found.composition, troops: some }),
  );
  const topped = (composition) => judge.score(topUp(composition, order, wholePlaces(judge.capacity(composition))));
  const heroes = heroPath(found, heroSteps([...warlords.keys()], held, rules.ranks * rules.levelsPerRank), {
    score: topped,
    offered,
    ...rules,
  }).map((step) => ({ ...step, judge, start: step.composition }));
  const glanced = [...heroes, ...levelledPath(found, goal), ...championPath(found, goal)].sort(
    (a, b) => b.gain - a.gain,
  );
  const again = settle(found.composition, { owned: [...owned], ...judge, offered, ...settings }).score;
  const judged = glanced.map((step, index) =>
    index < settings.width || freeing(step) ? settled(step, { owned, settings, again }) : step,
  );
  return bestPerSlot(judged.filter((step) => step.gain > 0).sort((a, b) => b.gain - a.gain)).slice(
    0,
    CONFIG.optimiser.pathSteps,
  );
}
