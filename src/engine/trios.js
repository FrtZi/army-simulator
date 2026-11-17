// The trios of heroes at a glance (SIM-05, D-40, D-53): every trio of the heroes owned, each judged quickly with the
// talents that gain most alone, best first; then the ones the search keeps, varied so that a pair of heroes does not
// take every place.

const better = (a, b) => (b.score > a.score ? b : a);

/** Every subset of `size` items, in their order (220 trios for 12 heroes). */
export function combinations(items, size) {
  if (size === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

/**
 * The talents a trio takes at a glance: the `max` that gain the most, each alone. A talent's gain is worked out once
 * per value (`gains`), as it hardly depends on the heroes beside it.
 */
function guessTalents(branch, offered, { guess, max, gains }) {
  const without = guess(branch);
  const gainOf = ({ id, percent }) => {
    const key = `${id}:${percent}`;
    if (!gains.has(key)) gains.set(key, guess({ ...branch, talents: [id] }) - without);
    return gains.get(key);
  };
  return offered
    .map((talent) => ({ id: talent.id, gain: gainOf(talent) }))
    .filter((talent) => talent.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, max)
    .map((talent) => talent.id);
}

/**
 * Every trio judged at a glance, best first: each with the talents that gain most alone, on the fill it scores best on
 * (DEF-054). `fills`: the troops to try each trio on, the first the default; `guess`: the quick judge.
 */
export function rankedTrios(trios, { fills, offered, guess, max }) {
  const gains = new Map();
  return trios
    .map((trio) => ({ troops: fills[0], heroes: trio, talents: [] }))
    .map((branch) => ({ ...branch, talents: guessTalents(branch, offered(branch.heroes), { guess, max, gains }) }))
    .map((branch) =>
      fills
        .map((some) => ({ ...branch, troops: some }))
        .map((composition) => ({ composition, score: guess(composition) }))
        .reduce(better),
    )
    .sort((a, b) => b.score - a.score);
}

/**
 * The trios kept: the best `width` at a glance, each pair of heroes in `perPair` of them at most, so that the places
 * do not all go to one pair beside every third hero, all alike at a glance (D-53).
 */
export function varied(ranked, width, perPair = Infinity) {
  const counts = new Map();
  const kept = [];
  for (const entry of ranked) {
    if (kept.length === width) break;
    const pairs = combinations(entry.composition.heroes.map(({ id }) => id).sort(), 2).map((pair) => pair.join("+"));
    if (pairs.some((pair) => (counts.get(pair) ?? 0) >= perPair)) continue;
    for (const pair of pairs) counts.set(pair, (counts.get(pair) ?? 0) + 1);
    kept.push(entry);
  }
  return kept;
}
