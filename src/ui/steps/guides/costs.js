// What going up costs, in the guides (GUIDE-04): reaching the level shown, and in all from the player's own level,
// or from nothing when the block is not in the saved setup. Each resource or item named in the player's language
// (data/<game>/items.json). Heroes, rituals and structures store their costs alike (D-29).
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { currentGame } from "../../state.js";
import { costBetween, rankOf } from "../../../engine/index.js";
import { t } from "../../texts/index.js";
import { rarityBadge } from "../../rarity.js";

const itemName = (id) => label(currentGame().items.get(id)) || id;
// the item's name opens its page in the items' guide: where it drops, what asks for it (GUIDE-04)
export const itemLink = (id) =>
  `<button type="button" class="link-button" data-goto-item="${id}">${escape(itemName(id))}</button>`;

/** The cost table of the level shown; `from` names where the total starts (the player's level, or nothing). */
export function costsTable(entry, level, mine, from) {
  const step = costBetween(entry, level - 1, level);
  const total = costBetween(entry, mine, level);
  const items = [...new Set([...Object.keys(step), ...Object.keys(total)])];
  const head = [t("guides.resource"), t("guides.thisLevel"), from].map(
    (text, column) => `<th scope="col"${column ? ' class="num"' : ""}>${escape(text)}</th>`,
  );
  const cell = (costs, item) => `<td class="num">${costs[item] ? number(costs[item]) : "—"}</td>`;
  const rows = items.map(
    (item) =>
      `<tr><td>${itemLink(item)} ${rarityBadge(currentGame().items.get(item)?.rarity)}</td>${cell(step, item)}${cell(total, item)}</tr>`,
  );
  const reached = mine >= level ? `<p class="hint">${escape(t("guides.reached"))}</p>` : "";
  const body = rows.length ? rows.join("") : `<tr><td colspan="3">${escape(t("guides.free"))}</td></tr>`;
  return `<h4>${escape(t("guides.costs"))}</h4>${reached}
    <table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

/** A hero's cost table: from its rank and level in the player's setup, or from nothing, its unlock included. */
export function costsHtml(warlord, level, mine = 0) {
  const rules = currentGame().game.heroRules;
  const from = mine ? t("guides.fromYours", rankOf(mine, rules)) : t("guides.fromNothing");
  return costsTable(warlord, level, mine, from);
}
