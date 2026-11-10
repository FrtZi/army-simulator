// What an uploaded file changes in the player's setup (CFG-05, D-27): only what it holds. A list's entries are
// matched by their key (a warlord's id, a bonus's stat and troops): a new one is added, a known one updated, and
// one the file does not list is kept. A file removes nothing unless the player chooses, section by section, to
// replace what they have with it (CFG-09, Frantz 2026-11-10): then what the file does not hold is removed, and said.

/** The player's setup before anything is entered. */
export const emptySetup = (game) => ({
  game,
  warlords: [],
  capacity: {},
  bonuses: [],
  rituals: [],
  buildings: [],
  champion: null,
  troops: [],
});

const byId = (entry) => entry.id;
// a bonus is the same bonus when it raises the same stat of the same troops; its percentage may change
const byStatAndTroops = (entry) => JSON.stringify([entry.stat, entry.target ?? {}]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Merges a list by key, and counts what happened: added, updated, unchanged (listed, same), kept (not listed). */
function mergeList(current, incoming, keyOf) {
  const report = { added: 0, updated: 0, unchanged: 0, kept: 0 };
  const read = new Map(incoming.map((entry) => [keyOf(entry), entry]));
  const merged = current.map((entry) => {
    const update = read.get(keyOf(entry));
    if (!update) {
      report.kept += 1;
      return entry;
    }
    read.delete(keyOf(entry));
    report[same(entry, update) ? "unchanged" : "updated"] += 1;
    return update;
  });
  report.added = read.size;
  return { value: [...merged, ...read.values()], report };
}

/** An object section: each field the file holds replaces the player's; counted as updated or unchanged. */
function mergeFields(current, incoming) {
  const changed = Object.keys(incoming).filter((field) => !same(current?.[field], incoming[field]));
  const unchanged = Object.keys(incoming).length - changed.length;
  return { value: { ...current, ...incoming }, report: { updated: changed.length, unchanged } };
}

const MERGES = {
  warlords: (current, incoming) => mergeList(current, incoming, byId),
  bonuses: (current, incoming) => mergeList(current, incoming, byStatAndTroops),
  rituals: (current, incoming) => mergeList(current, incoming, byId),
  buildings: (current, incoming) => mergeList(current, incoming, byId),
  capacity: mergeFields,
  champion: mergeFields,
  troops: (current, incoming) => mergeList(current ?? [], incoming, byId),
};

/** A section replaced by the file's: counted as a merge would, what it held and the file not counted as removed. */
function replaced(name, current, incoming) {
  const { report } = MERGES[name](current, incoming);
  if (Array.isArray(incoming)) return { value: incoming, report: { ...report, kept: 0, removed: report.kept } };
  const gone = Object.keys(current ?? {}).filter((field) => !(field in incoming)).length;
  return { value: { ...incoming }, report: { ...report, removed: gone } };
}

/**
 * The setup once the file's sections (from readSetupFile) are applied, and per section what changed; a section
 * the file does not hold is left as it is and absent from the report; one in `replace` becomes the file's.
 */
export function mergeSetup(setup, sections, replace = new Set()) {
  const merged = { ...setup };
  const report = {};
  for (const [name, incoming] of Object.entries(sections)) {
    const result = replace.has(name) ? replaced(name, setup[name], incoming) : MERGES[name](setup[name], incoming);
    merged[name] = result.value;
    report[name] = result.report;
  }
  return { setup: merged, report };
}
