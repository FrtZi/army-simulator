// The troops owned put in the march capacity (SIM-05, D-40, D-45): ranked by their worth per place and filled in that
// order; and a composition's free places topped up from that order, so a talent or a bonus that raises the capacity is
// worth the troops it lets in, every branch linked. Pure.

// a hair above, so that 50,000 × 1.033 read as 51,649.999… in binary still gives 51,650 places
const ROUNDING = 1e-6;

/** A capacity in whole places. */
export const wholePlaces = (capacity) => Math.floor(capacity + ROUNDING);

export const placed = (troops) => Object.values(troops).reduce((total, count) => total + count, 0);

/** The troops owned, those worth most per place first (`worth`: a few troops' score): [[id, count]]. */
export const rank = (owned, capacity, worth) =>
  owned
    .map(([id, count]) => ({
      id,
      count,
      value: worth({ [id]: Math.min(count, capacity) }) / Math.min(count, capacity),
    }))
    .sort((a, b) => b.value - a.value)
    .map(({ id, count }) => [id, count]);

/** The composition's troops with its free places, up to `room`, taken from the troops owned in `order`. */
export function topUp(composition, order, room) {
  let free = room - placed(composition.troops);
  if (free <= 0) return composition;
  const troops = { ...composition.troops };
  for (const [id, count] of order) {
    const taken = Math.min(count - (troops[id] ?? 0), free);
    if (taken > 0) troops[id] = (troops[id] ?? 0) + taken;
    free -= Math.max(0, taken);
  }
  return { ...composition, troops };
}

/**
 * The composition's troops cut down to `room`, the lines worth least per place cut first: talents chosen again may give
 * fewer places than the troops already placed, which a score would count all the same (DEF-058).
 */
export function trim(composition, order, room) {
  let excess = placed(composition.troops) - room;
  if (excess <= 0) return composition;
  const troops = { ...composition.troops };
  for (const [id] of [...order].reverse()) {
    const cut = Math.min(troops[id] ?? 0, excess);
    if (cut > 0) troops[id] -= cut;
    if (troops[id] === 0) delete troops[id];
    excess -= Math.max(0, cut);
  }
  return { ...composition, troops };
}

/**
 * The troops a slice may move to: the `few` worth most per place (DEF-049), and as many more as it takes for their
 * counts to fill `room`: the best are often rare (200 Lords on Dragon), all placed already, and the free places would
 * find no troop to take (DEF-053).
 */
export function shortlist(order, few, room) {
  let counted = 0;
  return order.filter(([, count], index) => {
    const kept = index < (few ?? order.length) || counted < room;
    counted += count;
    return kept;
  });
}

/** The troops owned filled into the capacity, in `order`. */
export const fill = (order, capacity) => topUp({ troops: {} }, order, capacity).troops;

/** The order with a group's troops first (a god's, DEF-054), each part in its own order. */
export const leading = (order, ids) => [
  ...order.filter(([id]) => ids.includes(id)),
  ...order.filter(([id]) => !ids.includes(id)),
];

/** A composition's capacity in whole places, worked out once per heroes and talents: only they change it in a search. */
export function remembered(capacityOf) {
  const known = new Map();
  return (composition) => {
    const key = JSON.stringify([composition.heroes ?? [], composition.talents ?? []]);
    // whole places: a bonus in percent leaves a fraction, and a troop is counted whole
    if (!known.has(key)) known.set(key, wholePlaces(capacityOf(composition)));
    return known.get(key);
  };
}
