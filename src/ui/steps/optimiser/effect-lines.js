// Bonuses that read at a glance (SIM-23, D-51, Frantz, 2026-11-17): grouped by value, the stats that share the same
// troops on one line, the troops as tags (a god's in its colour, its name written), the value in bold. Four effects
// of +40 % on melee and ranged attack, infantry and monstrous infantry, read as one line.
import { escape } from "../../dom.js";
import { nameOf, number } from "../../format.js";
import { t } from "../../texts/index.js";
import { godClass } from "./blocks.js";

/** A stat's name, the march capacity's included (no troop stat). */
export const statName = (stat) => (stat === "marchCapacity" ? t("capacity.label") : nameOf("troopStats", stat));

/** An effect's troops as [filter, value] pairs; none for the whole march. */
const targetsOf = ({ target }) =>
  Object.entries(target ?? {}).flatMap(([filter, values]) => values.map((value) => [filter, value]));

/**
 * The effects as lines: { stats, targets, percent }, the stats of one value grouped when they touch the same troops,
 * the largest value first. `effects`: [{ stat, percent, target }].
 */
export function groupedEffects(effects) {
  const byValue = new Map();
  for (const effect of effects) {
    const stats = byValue.get(effect.percent) ?? new Map();
    stats.set(effect.stat, [...(stats.get(effect.stat) ?? []), ...targetsOf(effect)]);
    byValue.set(effect.percent, stats);
  }
  return [...byValue]
    .sort((a, b) => b[0] - a[0])
    .flatMap(([percent, stats]) => {
      const lines = new Map();
      for (const [stat, targets] of stats) {
        const key = JSON.stringify(targets);
        lines.set(key, { stats: [...(lines.get(key)?.stats ?? []), stat], targets, percent });
      }
      return [...lines.values()];
    });
}

/** A troop tag: a god's with its colour's mark, its name written. */
function tag([filter, value]) {
  const mark = filter === "alignments" ? ` ${godClass(value)}` : "";
  return `<span class="opt-tag${mark}">${escape(nameOf(filter, value))}</span>`;
}

/** The effects as a list of lines, each its stats, its troops' tags and its value in bold. */
export function effectLines(effects) {
  const lines = groupedEffects(effects).map(({ stats, targets, percent }) => {
    const troops = targets.length
      ? targets.map(tag).join("")
      : `<span class="opt-tag">${escape(t("talents.march"))}</span>`;
    const value = `${percent > 0 ? "+" : ""}${number(percent, 2)} %`;
    return `<li class="opt-effect"><span class="opt-stats">${escape(stats.map(statName).join(" · "))}</span><span class="opt-troops">${troops}</span><b class="opt-value">${escape(value)}</b></li>`;
  });
  return `<ul class="opt-effects">${lines.join("")}</ul>`;
}
