// Setups saved in this browser (CFG-01): a list of named configurations in localStorage, never sent anywhere.
// Storage can be blocked (private window, file://): every access is guarded, and saving then reports false.

const SAVES_KEY = "army-simulator.saves";

/** Every saved setup, newest first: [{ name, savedAt, configuration }]. */
export function savedSetups(storage) {
  try {
    const saves = JSON.parse(storage.getItem(SAVES_KEY) ?? "[]");
    return Array.isArray(saves) ? saves : [];
  } catch {
    return [];
  }
}

function write(storage, saves) {
  try {
    storage.setItem(SAVES_KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false; // blocked or full: the page says so
  }
}

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
