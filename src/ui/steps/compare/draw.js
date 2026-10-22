// Step 5 · the comparison (ARMY-03, SIM-03): any two compositions, chosen in two lists; each figure side by
// side, the better value in green (▲), the weaker in red (▼), equal values in orange (=) — the symbol and its
// word always go with the colour; then the battle both ways.
import { byId, escape, options } from "../../dom.js";
import { number } from "../../format.js";
import { term } from "../../glossary/tooltip.js";
import { comparison, state } from "../../state.js";
import { t } from "../../texts/index.js";

// the glossary term of each compared figure
const TERM = { power: "power", damage: "strike", health: "ehp", morale: "morale", speed: "speed", load: "load" };
const DIGITS = { morale: 1 };
const MARK = { win: "▲", lose: "▼", tie: "=" };
// the key figures, highlighted (as the key columns of the profile table)
const KEY = new Set(["power", "damage", "health"]);

const signed = (value, digits) => `${value > 0 ? "+" : ""}${number(value, digits)}`;

/** How a side's value fares: "win", "lose", "tie", or nothing when there is no verdict (an empty side). */
function outcome(better, side) {
  if (better === "none") return null;
  if (better === "same") return "tie";
  return better === side ? "win" : "lose";
}

function valueCell(value, digits, result) {
  if (!result) return `<td class="num">${number(value, digits)}</td>`;
  return `<td class="num ${result}"><span aria-hidden="true">${MARK[result]}</span> ${number(value, digits)}<span class="visually-hidden"> (${escape(t(`compare.${result}`))})</span></td>`;
}

function figuresTable({ figures }, names) {
  const head = [t("compare.figure"), ...names, t("compare.difference")];
  const rows = figures.map((figure) => {
    const digits = DIGITS[figure.key] ?? 0;
    const label = t(`profile.${figure.key}`);
    const title = TERM[figure.key] ? term(TERM[figure.key], label) : escape(label);
    const cells = ["a", "b"].map((side) => valueCell(figure[side], digits, outcome(figure.better, side)));
    return `<tr${KEY.has(figure.key) ? ' class="key"' : ""}><th scope="row">${title}</th>${cells.join("")}<td class="num">${signed(figure.difference, digits)}</td></tr>`;
  });
  const header = head.map((cell, index) => `<th scope="col"${index > 0 ? ' class="num"' : ""}>${escape(cell)}</th>`);
  return `<table><thead><tr>${header.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function battleLine(result, attacker, defender) {
  const winner = { attacker, defender }[result.winner];
  const verdict = winner ? t("compare.winner", { name: winner }) : t("compare.draw");
  const losses = t("compare.losses", {
    attacker,
    attackerLost: number(result.powerLost.attacker),
    defender,
    defenderLost: number(result.powerLost.defender),
  });
  return `<li><span class="battle-title">${escape(t("compare.attacks", { attacker, defender }))}</span>
    <span class="battle-verdict">${escape(verdict)}</span><span class="meta">${escape(losses)}</span></li>`;
}

const compositionName = (index) => state.compositions[index].name || String(index + 1);

/** The two lists of compositions, each showing the one chosen on its side. */
function drawCompareChoice() {
  const pairs = state.compositions.map((composition, index) => [index, compositionName(index)]);
  for (const select of [byId("compare-a"), byId("compare-b")]) {
    select.innerHTML = options(pairs, state.compare[select.dataset.side]);
  }
}

export function drawCompare() {
  drawCompareChoice();
  const names = state.compare.map(compositionName);
  if (state.compare[0] === state.compare[1]) {
    byId("compare-figures").innerHTML = `<p class="empty">${escape(t("compare.sameChoice"))}</p>`;
    byId("compare-battles").innerHTML = "";
    return;
  }
  const result = comparison();
  const [aAttacks, bAttacks] = result.battles ? [result.battles.aAttacks, result.battles.bAttacks] : [];
  byId("compare-figures").innerHTML = figuresTable(result, names);
  byId("compare-battles").innerHTML = result.battles
    ? `<h3>${escape(t("compare.battles"))}</h3><ul class="battle-list">${battleLine(aAttacks, names[0], names[1])}${battleLine(bAttacks, names[1], names[0])}</ul><p class="hint">${escape(t("compare.model"))}</p>`
    : `<p class="empty">${escape(t("compare.empty"))}</p>`;
}
