// The optimiser on the page (SIM-05, D-40), angle 1: the best army with what Your setup holds — its troops owned, its
// heroes at their levels, everything else it brings (rituals, buildings, champion) — for the composition being
// edited. The page gives the search its goal: weights on the profile's figures, or a battle won against an opponent
// chosen (another composition, or the PvE army). Angle 2 (SIM-12, D-41): an aim ticked keeps only
// the troops it names, and the best army without it says what the aim costs now. The search is the engine's.
import { CONFIG } from "./config.js";
import { currentGame, state, summarise, validEffects } from "./state.js";
import { asPlayed, troopsOwned } from "./lab-setup.js";
import { pveArmy, pveRaces } from "./pve.js";
import { matchesFilters } from "./filters.js";
import { armyProfile, offeredTalents, optimise, profileScore, simulateBattle } from "../engine/index.js";

export const goalOf = (id) => CONFIG.optimiser.goals.find((goal) => goal.id === id);

/** The opponents the battle goal can fight: each composition but the one edited, and the PvE army if it has troops. */
export function opponents() {
  const others = state.compositions.map((composition, index) => [String(index), composition]);
  const pve = pveArmy(state, currentGame()).size > 0 ? [["pve", null]] : [];
  return [...others.filter(([index]) => Number(index) !== state.active), ...pve];
}

/** The opponent chosen ("pve" or a composition's index), the first one when the choice no longer stands; or null. */
export function opponentChosen() {
  const values = opponents().map(([value]) => value);
  return values.includes(state.optimiser.opponent) ? state.optimiser.opponent : (values[0] ?? null);
}

/** The army the battle goal fights, as the engine sees it; null when it has no troop. */
function opponent() {
  const chosen = opponentChosen();
  if (chosen === null) return null;
  const army = chosen === "pve" ? pveArmy(state, currentGame()) : summarise(state.compositions[Number(chosen)]);
  return army.size > 0 ? army : null;
}

/** Whether an aim is ticked: a god, a troop type or a tier (SIM-12). */
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

/**
 * The goal's two scores of a composition ({ troops, heroes, talents }, played as the one edited: led by the champion
 * or not): the exact one, and the quick guess that orders the branches. A battle scores the power the opponent loses
 * less the power ours loses, ours attacking.
 */
function scores(goal) {
  const { rules } = currentGame();
  const against = opponentChosen() === "pve" ? pveRaces(state, currentGame()) : new Set();
  const shared = validEffects(); // once: the setup's rituals and buildings resolved for every army
  const army = (composition) => summarise({ ...state.composition, ...composition }, against, shared);
  const quick = (composition) =>
    profileScore(armyProfile(army(composition), rules.model), goal.weights ?? CONFIG.optimiser.guess);
  if (!goal.battle) return { score: quick, guess: quick };
  const enemy = opponent();
  const margin = (composition) => {
    const { powerLost } = simulateBattle(army(composition), enemy, rules);
    return powerLost.defender - powerLost.attacker;
  };
  return { score: margin, guess: quick };
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
  const game = currentGame();
  const heroes = state.savedPlayerSetup.warlords
    .filter(({ id }) => game.warlords.has(id))
    .map(({ id, level }) => ({ id, level }));
  const offered = (trio) => offeredTalents(trio.map(({ id, level }) => ({ warlord: game.warlords.get(id), level })));
  const settings = { ...CONFIG.optimiser, ...game.game.heroRules };
  const start = startOf(owned, capacity);
  return optimise({ owned: [...owned], capacity, heroes, offered, score, guess, start, settings });
}

/**
 * Runs the search for the goal chosen, within the aim if one is ticked: { goal, composition, score, current, free,
 * judged }; `current` the composition edited as it plays now, scored the same way (null while it is empty); `free`
 * the best score without the aim (null with none). Null when nothing can be placed.
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
  return { goal: goal.id, ...found, current, free, capacity, opponent: goal.battle ? opponentChosen() : null };
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
