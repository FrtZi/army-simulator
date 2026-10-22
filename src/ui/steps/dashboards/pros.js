// DASH-05 · pros and cons (SIM-06): for the two compositions compared, the figures where each is ahead (▲, in
// green) or behind (▼, in red) by 10 % or more, then who wins each battle.
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { comparedNames, comparison } from "../../state.js";
import { prosAndCons } from "../../../engine/index.js";
import { t } from "../../texts/index.js";

const item = (entry, mark, kind) =>
  `<li class="${kind}"><span aria-hidden="true">${mark}</span> ${escape(t("pros.gap", { figure: t(`profile.${entry.key}`), gap: Number.isFinite(entry.gap) ? `${mark === "▲" ? "+" : "−"}${number(entry.gap)}` : "∞" }))}</li>`;

function column(name, side) {
  const list = (entries, mark, kind) =>
    entries.length
      ? entries.map((entry) => item(entry, mark, kind)).join("")
      : `<li class="empty">${escape(t("pros.none"))}</li>`;
  return `<div class="pros-column"><h3>${escape(t("composition.tab", { name }))}</h3>
    <h4>${escape(t("pros.strengths"))}</h4><ul class="pros-list">${list(side.pros, "▲", "win")}</ul>
    <h4>${escape(t("pros.weaknesses"))}</h4><ul class="pros-list">${list(side.cons, "▼", "lose")}</ul></div>`;
}

function verdict(battle, attacker, defender) {
  const winner = { attacker, defender }[battle.winner];
  return `<li>${escape(t("compare.attacks", { attacker, defender }))}: <span class="battle-verdict">${escape(winner ? t("compare.winner", { name: winner }) : t("compare.draw"))}</span></li>`;
}

export function prosPanel() {
  const [a, b] = comparedNames();
  const result = comparison();
  if (!result?.battles) return `<p class="empty">${escape(t("compare.empty"))}</p>`;
  const sides = prosAndCons(result);
  return `<p class="hint">${escape(t("pros.hint", { a, b }))}</p>
    <div class="pros-columns">${column(a, sides.a)}${column(b, sides.b)}</div>
    <ul class="battle-list">${verdict(result.battles.aAttacks, a, b)}${verdict(result.battles.bAttacks, b, a)}</ul>`;
}
