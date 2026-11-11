// The champion's skill trees in the Guides (BONUS-09, Frantz 2026-11-11): either tree drawn as the rituals', a skill
// chosen showing what each of its levels gives, or that it is not known yet.
import { escape, options } from "../../dom.js";
import { label, number } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { treeHtml } from "../../ritual-tree.js";
import { bonusInfo } from "../../champion-bonuses.js";

const guide = () => state.guide.champion;
const trees = () => currentGame().championSkills.trees;

/** A skill as the rituals' tree reads an entry. */
const asEntry = (skill) => ({
  ...skill,
  requires: { ritual: Object.fromEntries(Object.entries(skill.requires).map(([id, level]) => [id, [level]])) },
  power: Array.from({ length: skill.max ?? 1 }),
});

/** Each level of a skill and what it gives, a column per bonus. */
function levelsTable(skill) {
  if (!skill.gives) return `<p class="hint">${escape(t("clab.notKnown"))}</p>`;
  const ids = Object.keys(skill.gives);
  const head = [t("guides.level"), ...ids.map((id) => bonusInfo(id).name)];
  const rows = Array.from({ length: skill.max }, (_, index) => {
    const cells = ids.map((id) => {
      const value = skill.gives[id][index];
      return `<td class="num">${value === null ? "—" : `+${number(value, 2)} %`}</td>`;
    });
    return `<tr><td>${index + 1}</td>${cells.join("")}</tr>`;
  });
  return `<div class="table-wrap"><table class="guide-table"><thead><tr>${head.map((text, column) => `<th scope="col"${column ? ' class="num"' : ""}>${escape(text)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

export function skillsGuideHtml() {
  const tree = trees().find((entry) => entry.id === guide().skillTree) ?? trees()[0];
  const entries = tree.skills.map(asEntry);
  const chosen = entries.find((entry) => entry.id === guide().skill) ?? entries[0];
  const lit = Object.assign(new Set(), { goal: chosen.id });
  const choice = options(
    trees().map((entry) => [entry.id, label(entry)]),
    tree.id,
  );
  return `<h3 id="guide-champion-title">${escape(t("guides.view-skills"))}</h3>
    <div class="field"><label for="guide-skill-tree">${escape(t("clab.tree"))}</label><select id="guide-skill-tree" data-guide-champion="skillTree">${choice}</select></div>
    ${treeHtml(entries, { levelOf: () => 0, lit, attribute: "data-guide-skill" })}
    <h4>${escape(label(chosen))}</h4>${levelsTable(chosen)}`;
}
