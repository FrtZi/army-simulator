// The optimiser's judges (SIM-05, D-40): the goal's scores of a composition, the battle's opponent, the heroes owned
// and the talents a trio offers; shared by the search (optimiser.js) and the path (optimiser-path.js).
import { CONFIG } from "./config.js";
import { currentGame, state, summarise, summariseAsGiven, validEffects } from "./state.js";
import { pveArmy, pveRaces } from "./pve.js";
import { armyProfile, offeredTalents, profileScore, simulateBattle } from "../engine/index.js";

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
export function opponent() {
  const chosen = opponentChosen();
  if (chosen === null) return null;
  const army = chosen === "pve" ? pveArmy(state, currentGame()) : summarise(state.compositions[Number(chosen)]);
  return army.size > 0 ? army : null;
}

/**
 * The goal's two scores of a composition ({ troops, heroes, talents }, played as the one edited: led by the champion
 * or not): the exact one, and the quick guess that orders the branches; and the capacity it has. A battle scores the power the opponent loses
 * less the power ours loses, ours attacking. `shared`: the bonuses every army shares, the setup's by default; the path
 * passes those of a setup with a ritual or a building more (D-43), and `seen`, a state whose champion has a piece or a
 * skill more, for its march's bonuses (D-44).
 */
export function scores(goal, shared = validEffects(), seen = state) {
  const { rules } = currentGame();
  const against = opponentChosen() === "pve" ? pveRaces(state, currentGame()) : new Set();
  // the heroes as given: the search's are owned at their levels; the path's may be one up, or not owned yet
  const army = (composition) => summariseAsGiven({ ...state.composition, ...composition }, against, shared, seen);
  const quick = (composition) =>
    profileScore(armyProfile(army(composition), rules.model), goal.weights ?? CONFIG.optimiser.guess);
  // the march capacity a composition has: its talents and the setup's bonuses may raise it (D-45)
  const capacity = (composition) => army({ ...composition, troops: {} }).capacity.total;
  if (!goal.battle) return { score: quick, guess: quick, capacity };
  const enemy = opponent();
  const margin = (composition) => {
    const { powerLost } = simulateBattle(army(composition), enemy, rules);
    return powerLost.defender - powerLost.attacker;
  };
  return { score: margin, guess: quick, capacity };
}

/** The heroes Your setup holds, at their levels. */
export const heroesOwned = () =>
  state.savedPlayerSetup.warlords
    .filter(({ id }) => currentGame().warlords.has(id))
    .map(({ id, level }) => ({ id, level }));

/** The talents a trio offers at its levels. */
export const offered = (trio) =>
  offeredTalents(trio.map(({ id, level }) => ({ warlord: currentGame().warlords.get(id), level })));
