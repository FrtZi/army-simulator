// A bonus row of the Battle lab (a stat, a percentage, one filter and its value) to and from an engine effect.

/** A bonus row of the page as an engine effect. */
export function bonusEffect(bonus) {
  if (bonus.filter === "all") return { stat: bonus.stat, percent: bonus.percent };
  const value = bonus.filter === "tiers" ? Number(bonus.value) : bonus.value;
  return { stat: bonus.stat, percent: bonus.percent, target: { [bonus.filter]: [value] } };
}

/** An engine effect as a bonus row; null when its target has several filters (the page shows one per row). */
export function bonusRow(effect) {
  const filters = Object.entries(effect.target ?? {});
  if (filters.length > 1 || filters.some(([, values]) => values.length !== 1)) return null;
  const [filter, [value] = [""]] = filters[0] ?? ["all"];
  return { stat: effect.stat, percent: effect.percent, filter, value: String(value) };
}
