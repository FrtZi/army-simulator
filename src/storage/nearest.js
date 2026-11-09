// The id a misread name most likely meant ("Azazael" → azazel), for a refused value's message (CFG-05). An agent
// reading screenshots, or a person typing, gets a name slightly wrong far more often than entirely wrong.

/** Lower case, accents dropped, every run of other characters as one dash: "Throgg, King" → "throgg-king". */
export const normalise = (text) =>
  String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Edit distance (insertions, deletions, substitutions) between two short texts. */
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

// beyond a third of the name's length, a suggestion would be a guess, not a correction
const MAX_SHARE = 1 / 3;

/**
 * The entry's id whose id or label (in any language) is the read text, normalised; else the nearest within a
 * third of its length; else null. Entries: [{ id, labels: { en, fr } }].
 */
export function nearestId(read, entries) {
  const wanted = normalise(read);
  const names = entries.flatMap((entry) =>
    [entry.id, ...Object.values(entry.labels ?? {})].map((name) => ({ id: entry.id, name: normalise(name) })),
  );
  const exact = names.find((name) => name.name === wanted);
  if (exact) return exact.id;
  const scored = names.map((name) => ({ id: name.id, score: distance(wanted, name.name) }));
  const best = scored.reduce((winner, next) => (next.score < winner.score ? next : winner), scored[0]);
  return best && best.score <= Math.max(1, Math.floor(wanted.length * MAX_SHARE)) ? best.id : null;
}
