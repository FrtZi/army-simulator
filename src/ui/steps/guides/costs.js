// A hero's way up in its guide (GUIDE-04): what reaching the level shown costs, and in all from the player's own
// level, or from nothing (its unlock included) when the hero is not in the saved setup. Each resource or item named
// in the player's language (data/<game>/items.json).
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { currentGame } from "../../state.js";
import { costBetween, rankOf } from "../../../engine/index.js";
import { t } from "../../texts/index.js";

const itemName = (id) => label(currentGame().items.get(id)) || id;

/** The cost table of the level shown, against the level the player has (0: not owned). */
export function costsHtml(warlord, level, mine = 0) {
  const step = costBetween(warlord, level - 1, level);
  const total = costBetween(warlord, mine, level);
  const items = [...new Set([...Object.keys(step), ...Object.keys(total)])];
  const rules = currentGame().game.heroRules;
  const from = mine ? t("guides.fromYours", rankOf(mine, rules)) : t("guides.fromNothing");
  const head = [t("guides.resource"), t("guides.thisLevel"), from].map(
    (text, column) => `<th scope="col"${column ? ' class="num"' : ""}>${escape(text)}</th>`,
  );
  const cell = (costs, item) => `<td class="num">${costs[item] ? number(costs[item]) : "—"}</td>`;
  const rows = items.map(
    (item) => `<tr><td>${escape(itemName(item))}</td>${cell(step, item)}${cell(total, item)}</tr>`,
  );
  const reached = mine >= level ? `<p class="hint">${escape(t("guides.reached"))}</p>` : "";
  return `<h4>${escape(t("guides.costs"))}</h4>${reached}
    <table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
