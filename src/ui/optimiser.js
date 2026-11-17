// The optimiser on the page (SIM-05, D-40), angle 1: the best army with what Your setup holds — its troops owned, its
// heroes at their levels, everything else it brings (rituals, buildings, champion) — for the composition being
// edited. The page gives the search its goal: weights on the profile's figures, or a battle won against an opponent
// chosen (another composition, or the PvE army). Angle 2 (SIM-12, D-41): an aim ticked keeps only the troops it
// names, and the best army without it says what the aim costs now; then the path from the army found (D-42, D-43).
// The search is the engine's; the scores are in optimiser-scores.js, the path in optimiser-path.js.
import { CONFIG } from "./config.js";
import { currentGame, state } from "./state.js";
import { asPlayed, troopsOwned } from "./lab-setup.js";
import { matchesFilters } from "./filters.js";
import { goalOf, heroesOwned, offered, opponent, opponentChosen, scores } from "./optimiser-scores.js";
import { pathFrom } from "./optimiser-path.js";
import { detailOf } from "./optimiser-detail.js";
import { chooseGear, settledAgain, wearing } from "./optimiser-gear.js";
import { addComposition } from "./compositions.js";
import { combinations, optimise, wholePlaces } from "../engine/index.js";

export { goalOf, opponentChosen, opponents } from "./optimiser-scores.js";

/** Whether an aim is ticked: a god or a troop type (SIM-12). */
export const aiming = () => Object.values(state.optimiser.aim).some((values) => values.length);

/** The troops owned an aim keeps: those matching every filter ticked (all of them with none); the aim chosen above. */
const aimed = (owned, aim = state.optimiser.aim) =>
  new Map([...owned].filter(([id]) => matchesFilters(currentGame().catalogue.units.get(id), aim)));

/** Why the optimiser cannot run for this goal now, as a text key; null when it can. */
export function blocked(goal) {
  if (!state.useSetup) return "optimiser.needSetup";
  if (!troopsOwned(state)) return "optimiser.needTroops";
  if (!aimed(troopsOwned(state)).size) return "optimiser.needAimTroops";
  if (goal.battle && !opponent()) return "optimiser.needOpponent";
  return null;
}

/** The troops of the composition edited, when they fit what is owned and the capacity: a start the search judges. */
function startOf(owned, capacity) {
  const troops = Object.fromEntries(Object.entries(state.troops).filter(([, count]) => count > 0));
  const fits = Object.entries(troops).every(([id, count]) => count <= (owned.get(id) ?? 0));
  const total = Object.values(troops).reduce((sum, count) => sum + count, 0);
  return fits && total <= capacity ? troops : null;
}

/**
 * The search's figures for the model's map (SIM-18): what it started from, the trios tried, kept and settled; the
 * kept and settled as the trail counts them, as a pair of heroes is kept a few times only (D-53).
 */
function mapOf(owned, capacity, trail) {
  const heroes = heroesOwned().length;
  const trios = combinations(heroesOwned(), Math.min(currentGame().game.heroRules.heroesPerArmy, heroes)).length;
  return {
    heroes,
    owned: owned.size,
    aimed: aimed(owned).size,
    capacity,
    trios,
    kept: trail?.kept.length ?? 0,
    settled: trail?.settled.length ?? 0,
  };
}

/** The troops owned by god: each god's filled first in a start of its own, so no aim beats the free search (DEF-054). */
function godsOf(owned) {
  const { units } = currentGame().catalogue;
  const byGod = new Map();
  for (const id of owned.keys()) {
    const god = units.get(id).alignment;
    byGod.set(god, [...(byGod.get(god) ?? []), id]);
  }
  return byGod.size > 1 ? [...byGod.values()] : [];
}

/** A search over these troops owned, with the heroes owned and the scores given, from the composition edited. */
function search(owned, { score, guess, capacity }) {
  const settings = { ...CONFIG.optimiser, ...currentGame().game.heroRules };
  const start = startOf(owned, capacity(state.composition));
  const groups = godsOf(owned);
  return optimise({
    owned: [...owned],
    capacity,
    heroes: heroesOwned(),
    offered,
    score,
    guess,
    start,
    groups,
    settings,
  });
}

/**
 * The best army for these troops owned, then the champion's gear chosen for it among the pieces owned and its troops
 * settled again in that gear (SIM-26): { found, gear }, gear null without pieces owned; null when nothing is placed.
 */
function geared(owned, goal) {
  const first = search(owned, scores(goal));
  if (!first) return null;
  const gear = chooseGear(goal, first.composition);
  if (!gear?.changes.length) return { found: first, gear };
  return { found: wearing(gear.gear, () => settledAgain(first, goal, owned)), gear };
}

/** The composition edited as it plays now, in the gear worn: its score, or null while it is empty. */
function currentScore(goal) {
  const { troops, heroes, talents } = asPlayed(state.composition, state);
  if (!Object.values(troops).some((count) => count > 0)) return null;
  return scores(goal).score({ troops, heroes: heroes ?? [], talents: talents ?? [] });
}

/** The army found described in the gear chosen: its capacity, path, map and detail. */
function described(goal, owned, { found, gear }, compared) {
  const capacity = wholePlaces(scores(goal).capacity(found.composition));
  return {
    goal: goal.id,
    ...found,
    ...compared,
    capacity,
    opponent: goal.battle ? opponentChosen() : null,
    path: pathFrom(found, goal, aimed(owned)),
    map: mapOf(owned, capacity, found.trail),
    detail: detailOf(found.composition),
    gear,
  };
}

/**
 * Runs the search for the goal chosen, within the aim if one is ticked: { goal, composition, score, current, free,
 * judged, path, gear }; `current` the composition edited as it plays now (null while it is empty); `free` the best
 * score without the aim, in its own best gear (null with none); `path` the steps from it, in the gear chosen; `gear`
 * the champion's gear chosen (SIM-26). Null when nothing can be placed.
 */
export function runOptimiser() {
  const goal = goalOf(state.optimiser.goal);
  const owned = troopsOwned(state);
  const run = geared(aimed(owned), goal);
  if (!run) return null;
  const free = aiming() ? (geared(owned, goal)?.found.score ?? null) : null;
  const current = currentScore(goal);
  return wearing(run.gear?.gear, () => described(goal, owned, run, { free, current }));
}

/**
 * X or Y (SIM-21): each aim's best army for the goal chosen, in its own best gear, against the best with no aim (the
 * army found, or its "free" score when it was aimed): { x, y }, each { composition, score } or null when no troop
 * owned fits it.
 */
export function runAims(aims) {
  const goal = goalOf(state.optimiser.goal);
  const owned = troopsOwned(state);
  const side = (aim) => {
    const kept = aimed(owned, aim);
    return kept.size ? (geared(kept, goal)?.found ?? null) : null;
  };
  const { result } = state.optimiser;
  return { goal: goal.id, x: side(aims.x), y: side(aims.y), free: result.free ?? result.score };
}

/** Puts the army found in the composition being edited, or in a new one (`into` "new"): its troops, heroes, talents. */
export function useFound(into = "edited") {
  const { troops, heroes, talents } = state.optimiser.result.composition;
  if (into === "new") {
    addComposition({ troops, heroes, talents, ledByChampion: state.composition.ledByChampion });
    return;
  }
  Object.assign(state.composition, {
    troops: { ...troops },
    heroes: heroes.map((hero) => ({ ...hero })),
    talents: [...talents],
  });
}
