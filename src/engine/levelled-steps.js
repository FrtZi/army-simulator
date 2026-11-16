// The path's levelled steps (SIM-12, D-43): each ritual and building one level up from the levels held, with what
// reaching that level asks first that is not held yet, across both kinds (a ritual asks rituals and a building's level,
// a building asks buildings), back to the roots. Pure: the entries (D-29's shape, `requires: { ritual | structure:
// { id: [level asked at each level] } }`) and the levels held in, steps out.

const KINDS = ["ritual", "structure"];

/** The highest level an entry's levels up to `level` ask of each entry of a kind: [[id, level]], those asked only. */
const asked = (entry, kind, level) =>
  Object.entries(entry.requires?.[kind] ?? {})
    .map(([id, levels]) => [id, Math.max(0, ...levels.slice(0, level).filter((one) => one !== null))])
    .filter(([, one]) => one > 0);

/**
 * What reaching `level` of an entry asks that the levels held lack: [{ kind, id, from, level }], the roots first.
 * `entries`: kind → Map id → entry; `held`: kind → Map id → level.
 */
export function missingFor(entries, held, kind, id, level) {
  const needed = new Map();
  const visit = (entryKind, entryId, upTo) => {
    const entry = entries[entryKind].get(entryId);
    if (!entry) return;
    for (const needKind of KINDS) {
      for (const [need, one] of asked(entry, needKind, upTo)) {
        const key = `${needKind}:${need}`;
        if (one <= (held[needKind].get(need) ?? 0) || one <= (needed.get(key)?.level ?? 0)) continue;
        needed.set(key, { kind: needKind, id: need, from: held[needKind].get(need) ?? 0, level: one });
        visit(needKind, need, one);
      }
    }
  };
  visit(kind, id, level);
  return [...needed.values()].reverse();
}

/**
 * Each entry of `ids` (kind → ids to step) one level up from the level held, below its last: { kind, id, from, to,
 * first }, `first` what it asks first (missingFor).
 */
export const levelledSteps = (entries, held, ids) =>
  KINDS.flatMap((kind) =>
    ids[kind]
      .map((id) => ({ kind, id, from: held[kind].get(id) ?? 0, last: entries[kind].get(id).power.length }))
      .filter(({ from, last }) => from < last)
      .map(({ id, from }) => ({ kind, id, from, to: from + 1, first: missingFor(entries, held, kind, id, from + 1) })),
  );
