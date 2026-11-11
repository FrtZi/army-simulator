// Every bonus a champion's gear gives (BONUS-09): each piece at its level and each set at the highest tier its pieces
// worn reach, in battle (our effects, the march's: D-30) and beyond (the bonuses kept by name), summed by bonus, each
// named and set in its domain (game.json `bonusDomains`, first match on its id).
import { label, nameOf, number } from "./format.js";
import { currentGame } from "./state.js";
import { t } from "./texts/index.js";

const data = () => currentGame().champion;
const byId = (list, id) => list.find((entry) => entry.id === id);

/** Adds a value to a bonus's total: percentages add, flat values add apart. */
function add(totals, id, value) {
  if (value === null || value === undefined) return;
  const total = totals.get(id) ?? { percent: 0, flat: 0 };
  if (typeof value === "object") total.flat += value.flat;
  else total.percent += value;
  totals.set(id, total);
}

/** Each bonus the gear gives, by id: its percentage and its flat value, summed over its pieces and sets. */
export function gearBonuses(gear) {
  const totals = new Map();
  const pieces = gear.map(({ id, level }) => ({ piece: byId(data().pieces, id), level })).filter(({ piece }) => piece);
  for (const { piece, level } of pieces) {
    for (const part of [piece.effects, piece.march, piece.other]) {
      for (const [id, values] of Object.entries(part ?? {})) {
        add(totals, id, values[Math.min(level, values.length) - 1]);
      }
    }
  }
  for (const set of data().sets) {
    const worn = pieces.filter(({ piece }) => set.pieces.includes(piece.id)).length;
    for (const [id, byCount] of Object.entries(set.bonuses)) {
      const reached = Object.keys(byCount)
        .map(Number)
        .filter((count) => count <= worn);
      if (reached.length) add(totals, id, byCount[Math.max(...reached)]);
    }
  }
  return totals;
}

/** A bonus in words, and its domain: battle for our effects and the march's, else the first domain matching its id. */
export function bonusInfo(id) {
  const effect = byId(data().effects, id);
  const march = byId(data().march, id);
  if (march) return { name: t("guides.championMarch", { stat: nameOf("troopStats", march.stat) }), domain: "battle" };
  if (effect) {
    const [filter, [value] = []] = Object.entries(effect.target ?? {})[0] ?? [];
    const target = filter ? nameOf(filter, value) : t("talents.march");
    return { name: t("talents.label", { stat: nameOf("troopStats", effect.stat), target }), domain: "battle" };
  }
  const domain = currentGame().game.bonusDomains.find((entry) => new RegExp(entry.match).test(id)).id;
  return { name: label(byId(data().other, id)) || id, domain };
}

/** A total in words: "+12.5 %", "+2,600", or both. */
export const totalText = (total) =>
  [
    total.percent ? `${total.percent > 0 ? "+" : ""}${number(total.percent, 2)} %` : "",
    total.flat ? `+${number(total.flat)}` : "",
  ]
    .filter(Boolean)
    .join(" · ") || "—";
