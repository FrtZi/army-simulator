// DASH-02 · the two battles of the comparison, round by round: per side, troops lost (and in which tiers),
// power lost, troops broken.
import { escape } from "../../dom.js";
import { number, tierName } from "../../format.js";
import { comparedNames, comparison } from "../../state.js";
import { rounds } from "../../../engine/index.js";
import { t } from "../../texts/index.js";

const byTier = (tiers) =>
  Object.entries(tiers)
    .filter(([, lost]) => lost > 0)
    .map(([tier, lost]) => `${tierName(Number(tier))} ${number(lost)}`)
    .join(" · ") || "—";

function battleTable(battle, attacker, defender) {
  const sides = [
    ["attacker", attacker],
    ["defender", defender],
  ];
  const head = sides.flatMap(([, name]) =>
    ["rounds.lost", "rounds.byTier", "rounds.power", "rounds.broken"].map((key) => t(key, { name })),
  );
  const body = rounds(battle).map((round) => {
    const cells = sides.flatMap(([side]) => {
      const data = round[side];
      return [number(data.lost), byTier(data.byTier), number(data.powerLost), number(data.broken)];
    });
    return `<tr><th scope="row">${round.turn}</th>${cells.map((cell, index) => `<td class="num${index % 4 === 2 ? " key" : ""}">${escape(cell)}</td>`).join("")}</tr>`;
  });
  return `<h3>${escape(t("compare.attacks", { attacker, defender }))}</h3>
    <div class="table-wrap"><table><thead><tr><th scope="col">${escape(t("rounds.round"))}</th>${head.map((cell, index) => `<th scope="col" class="num${index % 4 === 2 ? " key" : ""}">${escape(cell)}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table></div>`;
}

export function roundsPanel() {
  const [a, b] = comparedNames();
  const result = comparison();
  if (!result?.battles) return `<p class="empty">${escape(t("compare.empty"))}</p>`;
  return `<p class="hint">${escape(t("rounds.hint"))}</p>
    ${battleTable(result.battles.aAttacks, a, b)}${battleTable(result.battles.bAttacks, b, a)}`;
}
