// A battle's outcome in full (SIM-25, docs/spec/battle-outcome.md; Frantz, 2026-11-17, on a real report): the verdict
// says total annihilation, or the victory and the enemy troops that survive; the losses per troop, side by side, as
// the game's report gives them (sent, lost, left), in a block that folds to the two sides' losses.
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { pveCatalogue } from "../../pve.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";

const whole = (count) => Math.round(count);

/** Each troop line of a side: sent, lost and left, whole troops; heroes are not troop lines. */
function linesOf(deployed, survivors) {
  return deployed
    .filter((group) => !group.hero)
    .map((group, index) => {
      const sent = whole(group.count);
      const left = Math.min(sent, whole(survivors.filter((each) => !each.hero)[index].count));
      return { id: group.id, sent, lost: sent - left, left };
    });
}

const totals = (lines) =>
  lines.reduce(
    (sum, line) => ({ sent: sum.sent + line.sent, lost: sum.lost + line.lost, left: sum.left + line.left }),
    {
      sent: 0,
      lost: 0,
      left: 0,
    },
  );

/** Both sides' troop lines and totals. */
function sidesOf(result) {
  return Object.fromEntries(
    ["attacker", "defender"].map((side) => {
      const lines = linesOf(result.deployed[side], result.survivors[side]);
      return [side, { lines, total: totals(lines) }];
    }),
  );
}

/** The verdict: total annihilation, a victory and the other side's survivors, or a draw. */
export function verdictOf(result, names) {
  if (result.winner === "draw") return t("compare.draw");
  const loser = result.winner === "attacker" ? "defender" : "attacker";
  const name = names[result.winner];
  if (result.annihilated[loser]) return t("compare.annihilation", { name });
  const { total } = sidesOf(result)[loser];
  return t("compare.victory", {
    name,
    left: number(total.left),
    sent: number(total.sent),
    percent: number((total.left / Math.max(total.sent, 1)) * 100, 1),
  });
}

/** A troop's name, ours or a PvE army's. */
function troopName(id) {
  const game = currentGame();
  return label(game.catalogue.units.get(id) ?? pveCatalogue(game).units.get(id));
}

/** One side's troop lines as a table, the largest loss first, its totals last. */
function sideTable(name, { lines, total }) {
  const cells = (values) => values.map((value) => `<td class="num">${escape(number(value))}</td>`).join("");
  const rows = [...lines]
    .sort((a, b) => b.lost - a.lost)
    .map(
      (line) =>
        `<tr><th scope="row">${escape(troopName(line.id))}</th>${cells([line.sent, line.lost, line.left])}</tr>`,
    );
  const head = ["lossTroop", "lossSent", "lossLost", "lossLeft"]
    .map((key, index) => `<th scope="col"${index ? ' class="num"' : ""}>${escape(t(`compare.${key}`))}</th>`)
    .join("");
  const foot = `<tr class="total"><th scope="row">${escape(t("compare.lossTotal"))}</th>${cells([total.sent, total.lost, total.left])}</tr>`;
  return `<div class="table-wrap"><table class="guide-table"><caption>${escape(name)}</caption><thead><tr>${head}</tr></thead><tbody>${rows.join("")}${foot}</tbody></table></div>`;
}

/** The losses per troop of both sides, folded to their totals. */
export function lossesBlock(result, names) {
  const sides = sidesOf(result);
  const line = t("compare.lossLine", {
    attacker: names.attacker,
    attackerLost: number(sides.attacker.total.lost),
    attackerSent: number(sides.attacker.total.sent),
    defender: names.defender,
    defenderLost: number(sides.defender.total.lost),
    defenderSent: number(sides.defender.total.sent),
  });
  return `<details class="battle-losses"><summary>${escape(line)}</summary>${sideTable(names.attacker, sides.attacker)}${sideTable(names.defender, sides.defender)}</details>`;
}
