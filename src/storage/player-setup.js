// The player's setup kept in this browser (CFG-04, D-27): one per game, stored as a setup file, the format an
// upload or a download uses, so there is one format to read and check. Read back through the same reader: a value
// the game's data no longer accepts is left out, never thrown on. Storage can be blocked (private window, file://):
// reading then finds nothing, and saving says it failed.
import { readSetupFile, writeSetupFile } from "./setup-file.js";
import { emptySetup, mergeSetup } from "./setup-merge.js";

const SETUP_KEY = "army-simulator.player-setup";

function storedFiles(storage) {
  try {
    const files = JSON.parse(storage.getItem(SETUP_KEY) ?? "{}");
    return files !== null && typeof files === "object" && !Array.isArray(files) ? files : {};
  } catch {
    return {};
  }
}

/** The setup saved for this game (games: id → { game, catalogue, warlords }), or an empty one. */
export function storedPlayerSetup(storage, gameId, games) {
  const file = storedFiles(storage)[gameId];
  if (!file) return emptySetup(gameId);
  const { sections = {} } = readSetupFile(file, games);
  return mergeSetup(emptySetup(gameId), sections).setup;
}

/** Saves the setup for its game, beside the other games' ones; true when it was stored. */
export function storePlayerSetup(storage, setup, game) {
  try {
    const files = { ...storedFiles(storage), [setup.game]: writeSetupFile(setup, game) };
    storage.setItem(SETUP_KEY, JSON.stringify(files));
    return true;
  } catch {
    return false; // blocked or full: the page says so
  }
}
