// The Champion lab's setups saved by name in this browser (CFG-10, D-39): kept in the state for the current game, so
// the Battle lab can play one; read again after each save or deletion, as another tab may have changed them.
import { deleteChampion, saveChampion, savedChampions } from "../storage/browser.js";
import { state } from "./state.js";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked: nothing saved, nothing to save
  }
}

/** The current game's champion setups into the state; a choice in the Battle lab no longer saved is let go. */
export function loadChampionSetups() {
  state.championSetups = storage() ? savedChampions(storage(), state.gameId) : [];
  const name = state.labChampion.slice(0, state.labChampion.lastIndexOf("|"));
  if (!state.championSetups.some((save) => save.name === name)) state.labChampion = "";
}

/** Saves the lab's champion under a name; true when the browser kept it. */
export function keepChampionSetup(name, champion) {
  const kept = Boolean(storage()) && saveChampion(storage(), { name, game: state.gameId, champion });
  loadChampionSetups();
  return kept;
}

export function dropChampionSetup(name) {
  if (storage()) deleteChampion(storage(), state.gameId, name);
  loadChampionSetups();
}
