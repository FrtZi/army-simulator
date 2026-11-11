// What the champion's skills give (BONUS-09, Frantz 2026-11-11): one skill at its level and at most, and a tree's
// skills in all, each bonus named as the gear's are; shared by the Champion lab and the Guides. A skill whose values
// are not known says so.
import { escape } from "./dom.js";
import { t } from "./texts/index.js";
import { bonusInfo, skillBonuses, totalText } from "./champion-bonuses.js";

const table = (rows, head) =>
  `<div class="table-wrap"><table class="guide-table"><thead><tr>${head.map((text, column) => `<th scope="col"${column ? ' class="num"' : ""}>${escape(text)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;

/** What a skill gives at `level` (0: not taken) and at its most levels; or that it is not known yet. */
export function skillBenefitsHtml(skill, level) {
  if (!skill.gives) return `<p class="hint">${escape(t("clab.notKnown"))}</p>`;
  const now = skillBonuses(skill, level);
  const most = skillBonuses(skill, skill.max ?? 1);
  const rows = [...most].map(
    ([id, total]) =>
      `<tr><td>${escape(bonusInfo(id).name)}</td><td class="num">${totalText(now.get(id) ?? { percent: 0, flat: 0 })}</td><td class="num">${totalText(total)}</td></tr>`,
  );
  return table(rows, [t("guides.bonus"), t("clab.atLevel", { level }), t("clab.atMost", { level: skill.max })]);
}

/** What the skills taken in a tree give in all, by bonus; levels: { skill id: level }. */
export function treeBenefitsHtml(skills, levels) {
  const totals = new Map();
  for (const skill of skills) {
    for (const [id, total] of skillBonuses(skill, levels[skill.id] ?? 0)) {
      if (!levels[skill.id]) continue;
      totals.set(id, (totals.get(id) ?? 0) + total.percent);
    }
  }
  if (!totals.size) return `<p class="hint">${escape(t("clab.noSkill"))}</p>`;
  const rows = [...totals]
    .map(([id, percent]) => [bonusInfo(id).name, percent])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, percent]) => `<tr><td>${escape(name)}</td><td class="num">${totalText({ percent, flat: 0 })}</td></tr>`,
    );
  return table(rows, [t("guides.bonus"), t("champion.inAll")]);
}
