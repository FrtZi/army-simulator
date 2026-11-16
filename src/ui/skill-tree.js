// A champion skill tree drawn and edited as the rituals' (BONUS-09, BONUS-10), shared by the Champion lab, Your setup
// and the Guides: a skill read as a ritual entry, the points spent against those a level gives, a skill's level field.
import { escape } from "./dom.js";
import { label, number } from "./format.js";
import { currentGame } from "./state.js";
import { t } from "./texts/index.js";
import { treeOrder } from "./ritual-tree.js";

export const skillTrees = () => currentGame().championSkills.trees;

/** A skill as the rituals' tree reads an entry: its prerequisites, and as many levels as it has (1 when not known). */
export const asEntry = (skill) => ({
  ...skill,
  requires: { ritual: Object.fromEntries(Object.entries(skill.requires).map(([id, level]) => [id, [level]])) },
  power: Array.from({ length: skill.max ?? 1 }),
});

/** The points spent in a tree against those the champion's `level` gives in it, and whether too many are. */
export function pointsLine(tree, spent, level) {
  const given = currentGame().champion.champion[tree.points][level - 1];
  const over = spent > given;
  const words = t(over ? "clab.pointsOver" : "clab.points", { spent: number(spent), given: number(given), level });
  return { over, html: `<span aria-hidden="true">${over ? "⚠" : "✓"}</span> ${escape(words)}` };
}

/** The chosen skill's level field, under its tree: `id` the field's, `attribute` the one naming the skill. */
export function skillEditorHtml(entries, chosen, { id, attribute, level }) {
  const { number: rank } = treeOrder(entries).find(({ entry }) => entry.id === chosen.id);
  const max = chosen.max ?? "";
  return `<span class="tree-number">${rank}</span>
    <label for="${id}">${escape(t("clab.skillLevel", { name: label(chosen) }))}</label>
    <input id="${id}" type="number" min="0"${max ? ` max="${max}"` : ""} step="1" inputmode="numeric" ${attribute}="${chosen.id}" value="${level || ""}" />
    <span class="meta" aria-hidden="true">${max ? `/ ${max}` : escape(t("clab.maxUnknown"))}</span>`;
}

/** A skill's level typed: the whole number within its levels (0 for empty), or null when it is not one. */
export function typedLevel(input) {
  const value = input.value === "" ? 0 : Number(input.value);
  const max = input.max ? Number(input.max) : Infinity;
  const valid = Number.isInteger(value) && value >= 0 && value <= max;
  input.setAttribute("aria-invalid", String(!valid));
  return valid ? value : null;
}
