// The champion's gear drawn (SIM-24, D-51, Frantz, 2026-11-17): a card per slot, its piece's rarity and level, its
// bonuses in battle as grouped lines (those of the march it leads apart), how many act outside battle, the gain of its
// next level or the best piece for an empty slot (from the path); then each set begun, its pieces worn on a track and
// its tiers, those that act in battle marked. Each mark has its words beside it.
import { escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { gearRarity, rarityBadge } from "../../rarity.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { resolveSources } from "../../../engine/index.js";
import { effectLines, statName } from "./effect-lines.js";
import { gainText } from "./path.js";

const data = () => currentGame().champion;
const PARTS = ["effects", "march", "other", "costs"];

/** A piece's last level: the longest of its tables. */
const levelsOf = (piece) =>
  Math.max(1, ...PARTS.flatMap((part) => Object.values(piece[part] ?? {}).map((v) => v.length)));
const at = (values, level) => values[Math.min(level, values.length) - 1];

/** A piece's own bonuses in battle at its level: "general" on the troops, or "march" on the march it leads. */
const own = (id, level, part) => resolveSources([{ kind: "champion", catalogue: data(), gear: [{ id, level }], part }]);

/** The level as pips, those reached in the rarity's colour; its words for a screen reader. */
function pips(level, max) {
  const cells = Array.from({ length: max }, (_, index) => `<span${index < level ? ' class="on"' : ""}></span>`);
  const words = escape(t("optimiser.gearLevel", { level, max }));
  return `<span class="opt-pips mark-rarity-${gearRarity(level)}" role="img" aria-label="${words}">${cells.join("")}</span>`;
}

/** An empty slot: said so, with the best piece to put there when the path found one. */
function emptyCard(slot, result) {
  const piece = (id) => data().pieces.find((entry) => entry.id === id);
  const best = result.path.steps.find((step) => step.kind === "gear" && !step.from && piece(step.id)?.slot === slot);
  const hint = best
    ? `<p class="opt-next">${escape(t("optimiser.gearBest", { name: label(piece(best.id)), gain: gainText(result, best.gain) }))}</p>`
    : "";
  return `<li class="opt-gear opt-gear-empty"><span class="opt-slot">${escape(t(`guides.slot-${slot}`))}</span><span class="opt-name">${escape(t("optimiser.gearEmpty"))}</span>${hint}</li>`;
}

/** A slot's card with its piece worn. */
function pieceCard(slot, { id, level }, result) {
  const piece = data().pieces.find((entry) => entry.id === id);
  const [general, march] = [own(id, level, "general"), own(id, level, "march")];
  const set = data().sets.find((entry) => entry.pieces.includes(id));
  const next = result.path.steps.find((step) => step.kind === "gear" && step.id === id && step.from);
  const off = Object.values(piece.other ?? {}).filter((values) => at(values, level)).length;
  const parts = [
    `<span class="opt-slot">${escape(t(`guides.slot-${slot}`))} ${rarityBadge(gearRarity(level))}</span>`,
    `<span class="opt-name">${escape(label(piece))}</span>${pips(level, levelsOf(piece))}`,
    set ? `<span class="opt-set">${escape(label(set))}</span>` : "",
    general.length ? effectLines(general) : "",
    march.length ? `<p class="opt-sub">${escape(t("optimiser.gearMarch"))}</p>${effectLines(march)}` : "",
    general.length || march.length ? "" : `<p class="opt-sub">${escape(t("optimiser.gearNothing"))}</p>`,
    next ? `<p class="opt-next">${escape(t("optimiser.gearNext", { gain: gainText(result, next.gain) }))}</p>` : "",
    off ? `<p class="opt-sub">${escape(t("optimiser.gearOff", { n: off }))}</p>` : "",
  ];
  return `<li class="opt-gear">${parts.join("")}</li>`;
}

/** A set bonus in words, and whether it acts in battle (on the troops or on the march the champion leads). */
function setBonus(id, value) {
  const { effects, march, other } = data();
  const general = effects.find((entry) => entry.id === id);
  const marching = march.find((entry) => entry.id === id);
  const [filter, [target] = []] = Object.entries(general?.target ?? {})[0] ?? [];
  const name = general
    ? t("talents.label", {
        stat: statName(general.stat),
        target: filter ? nameOf(filter, target) : t("talents.march"),
      })
    : marching
      ? t("guides.championMarch", { stat: nameOf("troopStats", marching.stat) })
      : label(other.find((entry) => entry.id === id)) || id;
  const figure = typeof value === "number" ? `+${number(value, 2)} %` : `+${number(value.flat)}`;
  return { text: `${name} ${figure}`, battle: Boolean(general || marching) };
}

/** A set's tiers: each count of pieces that gives something, with its bonuses and whether one acts in battle. */
function tiersOf(set) {
  const counts = [...new Set(Object.values(set.bonuses).flatMap((byCount) => Object.keys(byCount).map(Number)))];
  return counts
    .sort((a, b) => a - b)
    .map((count) => {
      const bonuses = Object.entries(set.bonuses)
        .filter(([, byCount]) => byCount[count] !== undefined)
        .map(([id, byCount]) => setBonus(id, byCount[count]));
      return { count, bonuses, battle: bonuses.some((bonus) => bonus.battle) };
    });
}

/** A tier in words: its count, its bonuses, those in battle in bold and tagged; ticked once reached. */
function tierItem({ count, bonuses, battle }, worn) {
  const words = bonuses.map(({ text, battle: acts }) => (acts ? `<b>${escape(text)}</b>` : escape(text))).join(", ");
  const tag = battle ? ` <span class="opt-tag">${escape(t("optimiser.inBattle"))}</span>` : "";
  const reached = count <= worn;
  return `<li${reached ? ' class="reached"' : ""}>${reached ? "✓ " : ""}${escape(t("optimiser.setTier", { n: count }))} ${words}${tag}</li>`;
}

/** A set begun: its pieces worn on a track, the tiers that act in battle outlined on it, then each tier. */
function setRow(set, worn) {
  const tiers = tiersOf(set);
  const inBattle = new Set(tiers.filter(({ battle }) => battle).map(({ count }) => count));
  const track = set.pieces
    .map((_, index) => {
      const classes = [index < worn ? "on" : "", inBattle.has(index + 1) ? "tier" : ""].filter(Boolean);
      return `<span${classes.length ? ` class="${classes.join(" ")}"` : ""}></span>`;
    })
    .join("");
  const next = tiers.find(({ count }) => count > worn)?.count;
  const line = [
    t("optimiser.setLine", { worn, total: set.pieces.length }),
    next ? t("optimiser.setNext", { n: next }) : "",
  ];
  return `<li class="opt-gear-set"><span class="opt-name">${escape(label(set))}</span> <span class="meta">${escape(line.filter(Boolean).join(" · "))}</span>
    <span class="opt-track" aria-hidden="true">${track}</span><ul class="opt-tiers">${tiers.map((tier) => tierItem(tier, worn)).join("")}</ul></li>`;
}

/** The gear as cards by slot, then the sets begun. `champion`: { level, gear }; `result`: the optimiser's. */
export function gearPicture(champion, result) {
  const gear = champion.gear ?? [];
  const bySlot = (slot) => gear.find(({ id }) => data().pieces.find((piece) => piece.id === id)?.slot === slot);
  const cards = data().slots.map((slot) =>
    bySlot(slot) ? pieceCard(slot, bySlot(slot), result) : emptyCard(slot, result),
  );
  const sets = data()
    .sets.map((set) => [set, gear.filter(({ id }) => set.pieces.includes(id)).length])
    .filter(([, worn]) => worn > 0)
    .map(([set, worn]) => setRow(set, worn));
  return `<ul class="opt-gears">${cards.join("")}</ul>${sets.length ? `<ul class="opt-gear-sets">${sets.join("")}</ul>` : ""}`;
}
