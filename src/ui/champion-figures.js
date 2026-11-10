// The champion's figures where it is used (BONUS-08): its own stats at its level, and what its gear gives in all,
// for its march and everywhere, each bonus summed over its pieces and sets, with the sets it reaches. Drawn alike in
// Your setup and in the Battle lab; the bonuses are the engine's own (D-30), so what is shown is what counts.
import { resolveSources } from "../engine/index.js";
import { escape } from "./dom.js";
import { label, nameOf, number } from "./format.js";
import { currentGame } from "./state.js";
import { t } from "./texts/index.js";

const data = () => currentGame().champion;

/** A bonus in words: its stat and the troops it counts for, or its march's (D-30). */
function bonusName({ stat, target }, march) {
  if (march) return t("guides.championMarch", { stat: nameOf("troopStats", stat) });
  const [filter, [value] = []] = Object.entries(target ?? {})[0] ?? [];
  return t("talents.label", {
    stat: nameOf("troopStats", stat),
    target: filter ? nameOf(filter, value) : t("talents.march"),
  });
}

/** The effects of one part of the gear ("march" or "general"), summed by stat and troops. */
function summed(gear, part) {
  const totals = new Map();
  for (const effect of resolveSources([{ kind: "champion", catalogue: data(), gear, part }])) {
    const key = JSON.stringify([effect.stat, effect.target ?? null]);
    const total = totals.get(key) ?? { ...effect, percent: 0 };
    totals.set(key, { ...total, percent: total.percent + effect.percent });
  }
  return [...totals.values()].map((effect) => [bonusName(effect, part === "march"), effect.percent]);
}

/** Each set at least one piece of it worn: the pieces worn and the highest tier reached (none below the first). */
function setsLines(gear) {
  return data()
    .sets.map((set) => {
      const worn = gear.filter(({ id }) => set.pieces.includes(id)).length;
      const tiers = [...new Set(Object.values(set.bonuses).flatMap((byCount) => Object.keys(byCount).map(Number)))];
      const reached = Math.max(0, ...tiers.filter((needed) => needed <= worn));
      return { set, worn, reached, first: Math.min(...tiers) };
    })
    .filter(({ worn }) => worn > 0)
    .map(({ set, worn, reached, first }) =>
      t(reached ? "champion.setReached" : "champion.setBelow", {
        set: label(set),
        worn,
        total: set.pieces.length,
        reached,
        first,
      }),
    );
}

const table = (rows, head) =>
  `<table class="guide-table"><thead><tr>${head.map((text, index) => `<th scope="col"${index ? ' class="num"' : ""}>${escape(text)}</th>`).join("")}</tr></thead><tbody>${rows
    .map(([name, value]) => `<tr><td>${escape(name)}</td><td class="num">${value}</td></tr>`)
    .join("")}</tbody></table>`;

/** The champion's figures, or a hint while it has neither level nor gear. `champion`: { level, gear } or null. */
export function championFiguresHtml(champion) {
  const { level, gear = [] } = champion ?? {};
  if (!level && !gear.length) return `<p class="hint">${escape(t("champion.nothingYet"))}</p>`;
  const parts = [];
  if (level) {
    const stats = Object.entries(data().champion.stats).map(([id, values]) => [
      nameOf("troopStats", id),
      number(values[level - 1]),
    ]);
    parts.push(
      `<h3>${escape(t("champion.statsAt", { level }))}</h3>${table(stats, [t("guides.stat"), t("guides.now")])}`,
    );
  }
  const bonuses = [...summed(gear, "march"), ...summed(gear, "general")].map(([name, percent]) => [
    name,
    `+${number(percent, 2)} %`,
  ]);
  if (bonuses.length) {
    parts.push(`<h3>${escape(t("champion.gives"))}</h3>${table(bonuses, [t("guides.bonus"), t("champion.inAll")])}`);
  }
  const sets = setsLines(gear);
  if (sets.length) parts.push(`<ul class="guide-uses">${sets.map((line) => `<li>${escape(line)}</li>`).join("")}</ul>`);
  return parts.join("");
}

/** The number of bonuses in battle the gear gives, for a one-line summary. */
export const championBonusCount = (champion) =>
  summed(champion?.gear ?? [], "march").length + summed(champion?.gear ?? [], "general").length;
