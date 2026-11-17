// The trios kept, named (SIM-22, D-53): under the search's picture, each kept trio's heroes and its share of the best
// army at each stage, the one chosen first and marked in words, so that every mark of the picture has its names.
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { sharesOf } from "./map-search-axis.js";

const percent = (share) => (share === undefined ? "—" : `${number(share, 1)} %`);
const cell = (text) => `<td class="num">${escape(text)}</td>`;

/** The trios kept as a table: heroes, share at a glance, once talents are chosen, once troops have moved. */
export function triosTable(result) {
  const { trail } = result;
  if (!trail) return "";
  const { warlords } = currentGame();
  const shares = sharesOf(trail, !goalOf(result.goal).battle);
  const settledOf = new Map(trail.settled.map(({ rank }, index) => [rank, shares.settled[index]]));
  const final = (rank) => settledOf.get(rank) ?? shares.kept[rank];
  const order = trail.kept
    .map((_, rank) => rank)
    .sort((a, b) => (b === trail.chosen) - (a === trail.chosen) || final(b) - final(a));
  const rows = order.map((rank) => {
    const heroes = trail.kept[rank].heroes.map((id) => label(warlords.get(id))).join(", ");
    const chosen =
      rank === trail.chosen ? ` <span class="opt-badge stage-chosen">${escape(t("optimiser.triosChosen"))}</span>` : "";
    return `<tr><td>${escape(heroes)}${chosen}</td>${cell(percent(shares.keptGlance[rank]))}${cell(percent(shares.kept[rank]))}${cell(percent(settledOf.get(rank)))}</tr>`;
  });
  const head = ["triosHeroes", "row-tried", "row-kept", "row-settled"]
    .map((key, index) => `<th scope="col"${index ? ' class="num"' : ""}>${escape(t(`optimiser.${key}`))}</th>`)
    .join("");
  return `<div class="table-wrap"><table class="guide-table opt-trios"><caption>${escape(t("optimiser.triosCaption"))}</caption><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
