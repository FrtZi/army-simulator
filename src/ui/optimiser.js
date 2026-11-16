// The optimiser on the page (SIM-05, D-40), angle 1: the best army with what Your setup holds — its troops owned, its
// heroes at their levels, everything else it brings (rituals, buildings, champion) — for the composition being
// edited. The page gives the search its goal: weights on the profile's figures, or a battle won against an opponent
// chosen (another composition, or the PvE army). Angle 2 (SIM-12, D-41): an aim ticked keeps only the troops it
// names, and the best army without it says what the aim costs now; then the path from the army found (D-42, D-43).
// The search is the engine's; the scores are in optimiser-scores.js, the path in optimiser-path.js.
import { CONFIG } from "./config.js";
import { currentGame, state, summarise } from "./state.js";
import { asPlayed, troopsOwned } from "./lab-setup.js";
import { matchesFilters } from "./filters.js";
import { goalOf, heroesOwned, offered, opponent, opponentChosen, scores } from "./optimiser-scores.js";
import { pathFrom } from "./optimiser-path.js";
import { optimise } from "../engine/index.js";

export { goalOf, opponentChosen, opponents } from "./optimiser-scores.js";

/** Whether an aim is ticked: a god or a troop type (SIM-12). */
export const aiming = () => Object.values(state.optimiser.aim).some((values) => values.length);

/** The troops owned the aim keeps: those matching every filter ticked (all of them with no aim). */
const aimed = (owned) =>
  new Map([...owned].filter(([id]) => matchesFilters(currentGame().catalogue.units.get(id), state.optimiser.aim)));

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

/** A search over these troops owned, with the heroes owned and the scores given, from the composition edited. */
function search(owned, capacity, { score, guess }) {
  const settings = { ...CONFIG.optimiser, ...currentGame().game.heroRules };
  const start = startOf(owned, capacity);
  return optimise({ owned: [...owned], capacity, heroes: heroesOwned(), offered, score, guess, start, settings });
}

/**
 * Runs the search for the goal chosen, within the aim if one is ticked: { goal, composition, score, current, free,
 * judged, path }; `current` the composition edited as it plays now, scored the same way (null while it is empty);
 * `free` the best score without the aim (null with none); `path` the steps from it. Null when nothing can be placed.
 */
export function runOptimiser() {
  const goal = goalOf(state.optimiser.goal);
  const owned = troopsOwned(state);
  const capacity = summarise({ ...state.composition, troops: {} }).capacity.total;
  const judges = scores(goal);
  const found = search(aimed(owned), capacity, judges);
  if (!found) return null;
  const free = aiming() ? (search(owned, capacity, judges)?.score ?? null) : null;
  const { troops, heroes: playing, talents } = asPlayed(state.composition, state);
  const empty = !Object.values(troops).some((count) => count > 0);
  const current = empty ? null : judges.score({ troops, heroes: playing ?? [], talents: talents ?? [] });
  const versus = goal.battle ? opponentChosen() : null;
  return { goal: goal.id, ...found, current, free, capacity, opponent: versus, path: pathFrom(found, goal) };
}

/** Puts the army found in the composition being edited: its troops, heroes and talents. */
export function useFound() {
  const { troops, heroes, talents } = state.optimiser.result.composition;
  Object.assign(state.composition, {
    troops: { ...troops },
    heroes: heroes.map((hero) => ({ ...hero })),
    talents: [...talents],
  });
}
