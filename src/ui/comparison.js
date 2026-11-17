// The two sides the page compares (figures and battles): two compositions, or a composition and the PvE army chosen.
import { chosenPlace, pveArmy, pveRaces } from "./pve.js";
import { label } from "./format.js";
import { t } from "./texts/index.js";
import { compareArmies } from "../engine/index.js";
import { currentGame, state, summarise } from "./state.js";

/** The names of the two sides compared: two compositions, or a composition and the PvE army chosen. */
export function comparedNames() {
  const names = state.compare.map((index) => state.compositions[index].name || String(index + 1));
  if (!state.pve.on) return names;
  const place = chosenPlace(state, currentGame());
  return [names[0], t("pve.name", { place: label(place), level: place?.level ?? "" })];
}

/** The two compositions chosen for the comparison (figures and battles); null when it is the same one twice. */
export function comparison() {
  const composition = state.compositions[state.compare[0]];
  if (state.pve.on) {
    const game = currentGame();
    return compareArmies(summarise(composition, pveRaces(state, game)), pveArmy(state, game), game.rules);
  }
  const first = summarise(composition);
  if (state.compare[0] === state.compare[1]) return null;
  return compareArmies(first, summarise(state.compositions[state.compare[1]]), currentGame().rules);
}
