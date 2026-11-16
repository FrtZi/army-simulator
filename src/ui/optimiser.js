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

/** The search's figures for the model's map (SIM-18): what it started from, the trios tried, kept and settled. */
function mapOf(owned, capacity) {
  const { width, settled } = CONFIG.optimiser;
  const heroes = heroesOwned().length;
  const trios = combinations(heroesOwned(), Math.min(currentGame().game.heroRules.heroesPerArmy, heroes)).length;
  const kept = Math.min(width, trios);
  return {
    heroes,
    owned: owned.size,
    aimed: aimed(owned).size,
    capacity,
    trios,
    kept,
    settled: Math.min(settled, kept),
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
 * Runs the search for the goal chosen, within the aim if one is ticked: { goal, composition, score, current, free,
 * judged, path }; `current` the composition edited as it plays now, scored the same way (null while it is empty);
 * `free` the best score without the aim (null with none); `path` the steps from it. Null when nothing can be placed.
 */
export function runOptimiser() {
  const goal = goalOf(state.optimiser.goal);
  const owned = troopsOwned(state);
  const judges = scores(goal);
  const found = search(aimed(owned), judges);
  if (!found) return null;
  const free = aiming() ? (search(owned, judges)?.score ?? null) : null;
  const capacity = wholePlaces(judges.capacity(found.composition));
  const { troops, heroes: playing, talents } = asPlayed(state.composition, state);
  const empty = !Object.values(troops).some((count) => count > 0);
  const current = empty ? null : judges.score({ troops, heroes: playing ?? [], talents: talents ?? [] });
  const versus = goal.battle ? opponentChosen() : null;
  const path = pathFrom(found, goal, aimed(owned));
  const detail = detailOf(found.composition);
  return {
    goal: goal.id,
    ...found,
    current,
    free,
    capacity,
    opponent: versus,
    path,
    map: mapOf(owned, capacity),
    detail,
  };
}

/**
 * X or Y (SIM-21): each aim's best army for the goal chosen, against the best with no aim (the army found, or its
 * "free" score when it was aimed): { x, y }, each { composition, score } or null when no troop owned fits it.
 */
export function runAims(aims) {
  const goal = goalOf(state.optimiser.goal);
  const owned = troopsOwned(state);
  const judges = scores(goal);
  const side = (aim) => {
    const kept = aimed(owned, aim);
    return kept.size ? search(kept, judges) : null;
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
