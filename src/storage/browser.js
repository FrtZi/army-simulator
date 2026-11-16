// Setups saved in this browser (CFG-01), and the Champion lab's (CFG-10): lists of named entries in localStorage,
// never sent anywhere. Storage can be blocked (private window, file://): every access is guarded, and saving then
// reports false.

const SAVES_KEY = "army-simulator.saves";
const CHAMPIONS_KEY = "army-simulator.champion-setups";

function read(storage, key) {
  try {
    const saves = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(saves) ? saves : [];
  } catch {
    return [];
  }
}

function write(storage, saves, key = SAVES_KEY) {
  try {
    storage.setItem(key, JSON.stringify(saves));
    return true;
  } catch {
    return false; // blocked or full: the page says so
  }
}

/** Every saved setup, newest first: [{ name, savedAt, configuration }]. */
export const savedSetups = (storage) => read(storage, SAVES_KEY);

/** Saves a configuration under its name, replacing a save of the same name; true when it was stored. */
export function saveSetup(storage, configuration, now = new Date()) {
  const others = savedSetups(storage).filter((save) => save.name !== configuration.name);
  return write(storage, [{ name: configuration.name, savedAt: now.toISOString(), configuration }, ...others]);
}

/** Deletes the save of that name. */
export function deleteSetup(storage, name) {
  return write(
    storage,
    savedSetups(storage).filter((save) => save.name !== name),
  );
}

/** The Champion lab's setups saved for a game, newest first: [{ name, game, savedAt, champion }]. */
export const savedChampions = (storage, game) => read(storage, CHAMPIONS_KEY).filter((save) => save.game === game);

/** Saves a champion setup under its name for its game, replacing one of the same name; true when stored. */
export function saveChampion(storage, { name, game, champion }, now = new Date()) {
  const others = read(storage, CHAMPIONS_KEY).filter((save) => !(save.game === game && save.name === name));
  return write(storage, [{ name, game, savedAt: now.toISOString(), champion }, ...others], CHAMPIONS_KEY);
}

/** Deletes the champion setup of that name for that game. */
export function deleteChampion(storage, game, name) {
  const kept = read(storage, CHAMPIONS_KEY).filter((save) => !(save.game === game && save.name === name));
  return write(storage, kept, CHAMPIONS_KEY);
}
