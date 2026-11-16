// The optimiser (SIM-05, docs/spec/optimiser.md, D-40): the best composition within the troops owned and the march
// capacity, with heroes among those owned and their talents, for a goal the caller scores. A search tree pruned at
// each level (a beam search): every trio of heroes ranked by a quick guess and the best `width` kept; each kept
// trio's talents chosen one by one by the exact score; then slices of troops moved between lines while the score
// rises. The caller passes both scores (the battle engine behind them), so this module knows neither the page nor
// what a goal is.
import { COMPARED } from "./compare.js";
import { fill, placed, rank, remembered, shortlist, topUp } from "./fill.js";

/** Every subset of `size` items, in their order (220 trios for 12 heroes). */
export function combinations(items, size) {
  if (size === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

/**
 * A profile scored for weights on its figures (COMPARED's keys): each figure raised to its weight, multiplied. A
 * weighted geometric mean: no figure's unit or scale matters, and an army that lacks one figure scores nothing.
 */
export function profileScore(profile, weights) {
  return Object.entries(weights).reduce((score, [key, weight]) => {
    const figure = COMPARED.find((entry) => entry.key === key).read(profile);
    return score * Math.max(0, figure) ** weight;
  }, 1);
}

const better = (a, b) => (b.score > a.score ? b : a);

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

/** A branch's talents chosen one by one, each time the one the exact score rises most with, up to `max`. */
export function chooseTalents(branch, ids, { score, max }) {
  let best = { composition: { ...branch, talents: [] }, score: score({ ...branch, talents: [] }) };
  while (best.composition.talents.length < max) {
    const tries = ids
      .filter((id) => !best.composition.talents.includes(id))
      .map((id) => ({ ...best.composition, talents: [...best.composition.talents, id] }))
      .map((composition) => ({ composition, score: score(composition) }));
    const next = tries.reduce(better, { score: best.score });
    if (!next.composition) break;
    best = next;
  }
  return best;
}

/** `count` troops moved from one line to another (`from` null: taken from the capacity still free). */
function shift(troops, from, to, count) {
  const next = { ...troops, [to]: (troops[to] ?? 0) + count };
  if (from) next[from] -= count;
  if (from && !next[from]) delete next[from];
  return next;
}

/** Every move of one slice: into a line with troops owned to spare, from the free capacity or from another line. */
function moves(troops, owned, capacity, slice) {
  const free = capacity - placed(troops);
  return owned.flatMap(([to, count]) => {
    const room = count - (troops[to] ?? 0);
    if (room <= 0) return [];
    const from = Object.keys(troops).filter((id) => id !== to);
    const fromFree = free > 0 ? [shift(troops, null, to, Math.min(slice, free, room))] : [];
    return [...fromFree, ...from.map((id) => shift(troops, id, to, Math.min(slice, troops[id], room)))];
  });
}

/** The troops moved by slices, the best move each round, while the exact score rises (at most `rounds`). */
function climb(start, owned, capacity, { score, slice, rounds }) {
  let best = start;
  for (let round = 0; round < rounds; round += 1) {
    const next = moves(best.composition.troops, owned, capacity, slice)
      .map((troops) => ({ ...best.composition, troops }))
      .map((composition) => ({ composition, score: score(composition) }))
      .reduce(better, best);
    if (next === best) break;
    best = next;
  }
  return best;
}

/**
 * A composition settled after a change (D-45), every branch linked: its talents chosen again for its heroes, then its
 * troops moved by slices while the score rises, the free capacity filled first when the change raised it.
 * `capacity(composition)`: the march capacity it has (a talent or a bonus may raise it); `owned`: [[troop id, count]].
 */
export function settle(composition, { owned, capacity, offered, score, slices, rounds, talentsPerArmy, candidates }) {
  const usable = owned.filter(([, count]) => count > 0);
  const roomOf = remembered(capacity);
  const order = rank(usable, roomOf(composition), (some) => score({ ...composition, troops: some }));
  const full = (each) => score(topUp(each, order, roomOf(each)));
  const ids = offered(composition.heroes).map(({ id }) => id);
  const talented = chooseTalents(composition, ids, { score: full, max: talentsPerArmy });
  const room = roomOf(talented.composition);
  const start = { composition: talented.composition, score: score(talented.composition) };
  return climb(start, shortlist(order, candidates, room), room, {
    score,
    slice: Math.max(1, Math.round(room / slices)),
    rounds,
  });
}

/**
 * The best composition found: { composition: { troops, heroes, talents }, score, judged }, or null with no troop
 * owned or no capacity. `owned`: [[troop id, count]]; `capacity`: the march capacity, or a function of the composition
 * (a talent may raise it, D-45); `heroes`: the heroes owned, [{ id, level }]; `offered(heroes)`: the talents they
 * offer, [{ id, percent }]; `score(composition)` the exact judge, `guess` the quick one (the same by default); `start`:
 * the troops the player has now, judged too; `settings`: width, slices, rounds, heroesPerArmy, talentsPerArmy, and
 * `settled`, the few leaves whose troops are settled (all the kept ones by default), `candidates`, the troops worth
 * most per place that slices may move to (all of them by default).
 * `judged`: how many armies were scored.
 */
export function optimise({ owned, capacity, heroes, offered, score, guess = score, start, settings }) {
  const capacityOf = remembered(typeof capacity === "function" ? capacity : () => capacity);
  const usable = owned.filter(([, count]) => count > 0);
  const base = capacityOf({ troops: {}, heroes: [], talents: [] });
  if (!usable.length || base <= 0) return null;
  let judged = 0;
  const counted = (judge) => (composition) => ((judged += 1), judge(composition));
  const exact = counted(score);
  const quick = counted(guess);
  const { width, slices, rounds, heroesPerArmy, talentsPerArmy: max, settled: few = width, candidates } = settings;
  // the troops moved by slices within the capacity this composition has, its free places filled first
  const settled = (entry) => {
    const room = capacityOf(entry.composition);
    return climb(entry, shortlist(order, candidates, room), room, {
      score: exact,
      slice: Math.max(1, Math.round(room / slices)),
      rounds,
    });
  };
  const order = rank(usable, base, (some) => quick({ troops: some, heroes: [], talents: [] }));
  const troops = fill(order, base);
  // the slices move to the troops worth most per place only, and enough of them to fill every place (DEF-049, DEF-053)
  // a talent judged with the places it frees filled: one raising the capacity is worth its troops (D-45)
  const topped = (judge) => (composition) => judge(topUp(composition, order, capacityOf(composition)));
  const gains = new Map();
  const kept = combinations(heroes, Math.min(heroesPerArmy, heroes.length))
    .map((trio) => ({ troops, heroes: trio, talents: [] }))
    .map((branch) => ({
      ...branch,
      talents: guessTalents(branch, offered(branch.heroes), { guess: topped(quick), max, gains }),
    }))
    .map((composition) => ({ composition, score: topped(quick)(composition) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, width);
  // each kept trio's talents by the exact score, then its troops settled: a talent raising the capacity is worth the
  // troops it lets in, every branch linked (D-45)
  const leaf = kept
    .map(({ composition }) =>
      chooseTalents(
        composition,
        offered(composition.heroes).map(({ id }) => id),
        { score: topped(exact), max },
      ),
    )
    // the best few, by their score with their free places filled, have their troops settled: the others would not
    // overtake them; each scored as it stands first, the free places then filled by the moves themselves
    .sort((a, b) => b.score - a.score)
    .slice(0, few)
    .map(({ composition }) => settled({ composition, score: exact(composition) }))
    .reduce(better);
  const room = capacityOf(leaf.composition);
  const starts = [start, ...shortlist(order, candidates, room).map(([id, count]) => ({ [id]: Math.min(count, room) }))]
    .filter(Boolean)
    .map((some) => ({ ...leaf.composition, troops: some }))
    .map((composition) => ({ composition, score: exact(composition) }))
    .reduce(better, leaf);
  return { ...settled(starts), judged };
}
