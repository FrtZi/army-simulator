// What reaching a level of a ritual asks (GUIDE-07): each prerequisite at the level needed, followed back to the
// roots of its tree, and each entry's depth in that tree, as the game draws it. Pure: levelled entries in (D-29's
// shape, `requires: { ritual: { id: [level asked at each level] } }`), figures out.

/** The levels each prerequisite asks to reach `level`: the highest any level up to it asks. */
function askedUpTo(entry, kind, level) {
  return Object.entries(entry.requires?.[kind] ?? {})
    .map(([id, levels]) => [id, Math.max(0, ...levels.slice(0, level).filter((asked) => asked !== null))])
    .filter(([, asked]) => asked > 0);
}

/** Every entry needed to reach `level` of `id`, back to the roots: Map id → the highest level asked of it. */
export function prerequisitesOf(entries, id, level, kind = "ritual") {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const needed = new Map();
  const visit = (entryId, upTo) => {
    const entry = byId.get(entryId);
    if (!entry) return;
    for (const [need, asked] of askedUpTo(entry, kind, upTo)) {
      if ((needed.get(need) ?? 0) >= asked) continue;
      needed.set(need, asked);
      visit(need, asked);
    }
  };
  visit(id, level);
  return needed;
}

/** Each entry's depth among `entries`: 0 when none of its prerequisites is among them, else one below its deepest. */
export function depthsOf(entries, kind = "ritual") {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const depths = new Map();
  const depth = (id, path) => {
    if (depths.has(id)) return depths.get(id);
    const needs = Object.keys(byId.get(id).requires?.[kind] ?? {}).filter((need) => byId.has(need) && !path.has(need));
    const found = needs.length ? 1 + Math.max(...needs.map((need) => depth(need, new Set([...path, need])))) : 0;
    depths.set(id, found);
    return found;
  };
  for (const entry of entries) depth(entry.id, new Set([entry.id]));
  return depths;
}
