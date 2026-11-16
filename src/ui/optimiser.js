// The optimiser on the page (SIM-05, D-40), angle 1: the best army with what Your setup holds — its troops owned, its
// heroes at their levels, everything else it brings (rituals, buildings, champion) — for the composition being
// edited. The page gives the search its goal: weights on the profile's figures, or a battle won against the
// comparison's second side (a composition, or the PvE army chosen). The search itself is the engine's (optimise.js).
import { CONFIG } from "./config.js";
import { currentGame, state, summarise, validEffects } from "./state.js";
import { asPlayed, troopsOwned } from "./lab-setup.js";
import { pveArmy, pveRaces } from "./pve.js";
import { armyProfile, offeredTalents, optimise, profileScore, simulateBattle } from "../engine/index.js";

export const goalOf = (id) => CONFIG.optimiser.goals.find((goal) => goal.id === id);

/** The side the battle goal fights: the PvE army chosen, else the comparison's second composition; null if empty. */
function opponent() {
  const army = state.pve.on ? pveArmy(state, currentGame()) : summarise(state.compositions[state.compare[1]]);
  return army.size > 0 ? army : null;
}

/** Why the optimiser cannot run for this goal now, as a text key; null when it can. */
export function blocked(goal) {
  if (!state.useSetup) return "optimiser.needSetup";
  if (!troopsOwned(state)) return "optimiser.needTroops";
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
  const against = state.pve.on ? pveRaces(state, currentGame()) : new Set();
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

/**
 * Runs the search for the goal chosen: { goal, composition, score, current, judged }, `current` the composition
 * edited as it plays now, scored the same way (null while it is empty); null when nothing can be placed.
 */
export function runOptimiser() {
  const game = currentGame();
  const goal = goalOf(state.optimiser.goal);
  const owned = troopsOwned(state);
  const capacity = summarise({ ...state.composition, troops: {} }).capacity.total;
  const heroes = state.savedPlayerSetup.warlords
    .filter(({ id }) => game.warlords.has(id))
    .map(({ id, level }) => ({ id, level }));
  const offered = (trio) => offeredTalents(trio.map(({ id, level }) => ({ warlord: game.warlords.get(id), level })));
  const { score, guess } = scores(goal);
  const settings = { ...CONFIG.optimiser, ...game.game.heroRules };
  const start = startOf(owned, capacity);
  const found = optimise({ owned: [...owned], capacity, heroes, offered, score, guess, start, settings });
  if (!found) return null;
  const { troops, heroes: playing, talents } = asPlayed(state.composition, state);
  const empty = !Object.values(troops).some((count) => count > 0);
  const current = empty ? null : score({ troops, heroes: playing ?? [], talents: talents ?? [] });
  return { goal: goal.id, ...found, current, capacity };
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
