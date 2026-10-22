// Step 2 · the bonuses (BONUS-01): one row per bonus — stat, percentage, what it applies to — with its
// problems shown under it. Only the stats a bonus can change are offered (D-14).
import { CONFIG } from "../../config.js";
import { byId, escape, options } from "../../dom.js";
import { label, tierName } from "../../format.js";
import { ICONS } from "../../icons.js";
import { bonusEffect, currentGame, problemsOf, state } from "../../state.js";
import { t } from "../../texts/index.js";

const field = (id, text, control) => `<div class="field"><label for="${id}">${escape(text)}</label>${control}</div>`;

/** The values a filter can take, as [value, label] pairs. */
function filterValues(filter) {
  const entries = currentGame().game[filter];
  return entries.map((entry) => [entry.id, filter === "tiers" ? tierName(entry.id) : label(entry)]);
}

function bonusRow(bonus, index) {
  const { game } = currentGame();
  const stats = game.troopStats.filter((stat) => stat.boostable !== false).map((stat) => [stat.id, label(stat)]);
  const targets = [["all", t("bonus.all")], ...CONFIG.bonusFilters.map((filter) => [filter, t(`target.${filter}`)])];
  const { min, max } = game.bonusPercent;
  const percent = Number.isFinite(bonus.percent) ? bonus.percent : "";
  // with no target, an empty cell keeps the remove button in the last column
  const value =
    bonus.filter === "all"
      ? '<div class="field" aria-hidden="true"></div>'
      : field(
          `bonus-value-${index}`,
          t("bonus.value"),
          `<select id="bonus-value-${index}" data-key="value">${options(filterValues(bonus.filter), bonus.value)}</select>`,
        );
  return `<div class="bonus-row" data-index="${index}">
    ${field(`bonus-stat-${index}`, t("bonus.stat"), `<select id="bonus-stat-${index}" data-key="stat">${options(stats, bonus.stat)}</select>`)}
    ${field(`bonus-percent-${index}`, t("bonus.percent"), `<input id="bonus-percent-${index}" data-key="percent" type="number" min="${min}" max="${max}" step="${CONFIG.percentStep}" inputmode="decimal" value="${percent}" aria-describedby="bonus-problem-${index}" />`)}
    ${field(`bonus-target-${index}`, t("bonus.target"), `<select id="bonus-target-${index}" data-key="filter">${options(targets, bonus.filter)}</select>`)}
    ${value}
    <button type="button" class="icon" id="bonus-remove-${index}" data-remove="${index}" aria-label="${escape(t("bonus.remove"))}">${ICONS.close}</button>
    <p class="problem" id="bonus-problem-${index}"></p>
  </div>`;
}

export function drawBonuses() {
  byId("bonus-list").innerHTML = state.bonuses.length
    ? state.bonuses.map(bonusRow).join("")
    : `<p class="empty">${escape(t("bonuses.empty"))}</p>`;
}

/** The problems of each bonus, under its row; a bonus with a problem is left out of the figures. */
export function drawBonusProblems() {
  state.bonuses.forEach((bonus, index) => {
    const problems = problemsOf(bonusEffect(bonus));
    const message = byId(`bonus-problem-${index}`);
    if (!message) return;
    message.innerHTML = problems.length
      ? `<span aria-hidden="true">⚠</span> ${escape(problems.map((problem) => t(`problem.${problem.code}`, problem)).join(" "))}`
      : "";
    byId(`bonus-percent-${index}`).setAttribute("aria-invalid", String(problems.length > 0));
  });
}
