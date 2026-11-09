// The player's setup on the page (CFG-04, D-27): the one being edited, shown at once, and the last one saved,
// which the Battle lab will use. Save keeps the edits in this browser, Discard goes back to the save; what
// differs between the two is counted and marked, so the player sees what is not saved yet.
import { storedPlayerSetup, storePlayerSetup } from "../storage/player-setup.js";
import { GAMES_BY_ID } from "./games.js";
import { currentGame, state } from "./state.js";

// a plain copy: jsdom, which runs the page tests, has no structuredClone (DEF-029)
const copy = (value) => JSON.parse(JSON.stringify(value));
// the same setup whatever the order its fields were written in
const sorted = (_, value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort())
    : value;
const canonical = (value) => JSON.stringify(value ?? null, sorted);

/** The browser's storage, or null where reading it throws (blocked): the storage module copes with both. */
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Shows the setup saved for the current game, nothing unsaved. */
export function loadPlayerSetup() {
  state.savedPlayerSetup = storedPlayerSetup(storage(), state.gameId, GAMES_BY_ID);
  state.playerSetup = copy(state.savedPlayerSetup);
  state.setupSaveFailed = false;
  state.setupImport = null;
}

/** Keeps the edits in this browser; false (and said on the page) when the browser refuses. */
export function savePlayerSetup() {
  const stored = storePlayerSetup(storage(), state.playerSetup, currentGame().game);
  if (stored) state.savedPlayerSetup = copy(state.playerSetup);
  state.setupSaveFailed = !stored;
  return stored;
}

/** Goes back to the last save. */
export function discardSetupChanges() {
  state.playerSetup = copy(state.savedPlayerSetup);
  state.setupSaveFailed = false;
}

/** Each warlord's state against the save: "new" or "changed" by id; and the ids saved but removed since. */
export function warlordChanges() {
  const saved = new Map(state.savedPlayerSetup.warlords.map((warlord) => [warlord.id, warlord.level]));
  const marks = {};
  for (const { id, level } of state.playerSetup.warlords) {
    if (!saved.has(id)) marks[id] = "new";
    else if (saved.get(id) !== level) marks[id] = "changed";
  }
  const owned = new Set(state.playerSetup.warlords.map((warlord) => warlord.id));
  return { marks, removed: [...saved.keys()].filter((id) => !owned.has(id)) };
}

/** How many changes are not saved: each warlord added, changed or removed, each other field changed. */
export function unsavedCount() {
  const { marks, removed } = warlordChanges();
  const fields = (section) => {
    const [now, then] = [state.playerSetup[section], state.savedPlayerSetup[section]];
    if (section !== "capacity") return canonical(now) === canonical(then) ? 0 : 1;
    const names = new Set([...Object.keys(now), ...Object.keys(then)]);
    return [...names].filter((name) => now[name] !== then[name]).length;
  };
  // the warlords are counted one by one above; the game is the setup's, never edited here
  const others = Object.keys(state.playerSetup).filter((section) => !["game", "warlords"].includes(section));
  return Object.keys(marks).length + removed.length + others.reduce((sum, section) => sum + fields(section), 0);
}
