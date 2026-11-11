// The champion's two skill trees in the Champion lab (BONUS-09): drawn as the rituals' trees are (GUIDE-07), a skill
// chosen in its tree to set its level; the points spent against those the level chosen gives. What each level of a
// skill gives is not known yet: the trees say what is taken, not what it brings.
import { byId, escape, options } from "../../dom.js";
import { label, number } from "../../format.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { treeHtml, treeOrder } from "../../ritual-tree.js";
import { lab } from "./lab.js";

const trees = () => currentGame().championSkills.trees;
const tree = () => trees().find((entry) => entry.id === lab().tree);
const levelOf = (id) => lab().skills[lab().tree][id] ?? 0;

/** A skill as the rituals' tree reads an entry: its prerequisites, and as many levels as it has (1 when not known). */
const asEntry = (skill) => ({
  ...skill,
  requires: { ritual: Object.fromEntries(Object.entries(skill.requires).map(([id, level]) => [id, [level]])) },
  power: Array.from({ length: skill.max ?? 1 }),
});

/** The points spent in the tree shown, against those the champion's level gives. */
function pointsHtml() {
  const spent = Object.values(lab().skills[lab().tree]).reduce((sum, level) => sum + level, 0);
  const given = currentGame().champion.champion[tree().points][lab().level - 1];
  const over = spent > given;
  const words = t(over ? "clab.pointsOver" : "clab.points", {
    spent: number(spent),
    given: number(given),
    level: lab().level,
  });
  byId("clab-points").classList.toggle("critical", over);
  return `<span aria-hidden="true">${over ? "⚠" : "✓"}</span> ${escape(words)}`;
}

function editorHtml(entries, chosen) {
  const { number: rank } = treeOrder(entries).find(({ entry }) => entry.id === chosen.id);
  const max = chosen.max ?? "";
  return `<span class="tree-number">${rank}</span>
    <label for="clab-skill-level">${escape(t("clab.skillLevel", { name: label(chosen) }))}</label>
    <input id="clab-skill-level" type="number" min="0"${max ? ` max="${max}"` : ""} step="1" inputmode="numeric" data-clab-skill="${chosen.id}" value="${levelOf(chosen.id) || ""}" />
    <span class="meta" aria-hidden="true">${max ? `/ ${max}` : escape(t("clab.maxUnknown"))}</span>`;
}

/** The tree shown, its points and, with `editor`, the chosen skill's level (a level typed redraws the rest only). */
export function drawSkills({ editor = true } = {}) {
  byId("clab-tree").innerHTML = options(
    trees().map((entry) => [entry.id, label(entry)]),
    lab().tree,
  );
  const entries = tree().skills.map(asEntry);
  const chosen = entries.find((entry) => entry.id === lab().chosen) ?? entries[0];
  lab().chosen = chosen.id;
  byId("clab-points").innerHTML = pointsHtml();
  const lit = Object.assign(new Set(), { goal: chosen.id });
  byId("clab-tree-map").innerHTML = treeHtml(entries, { levelOf, lit, attribute: "data-clab-node" });
  if (editor) byId("clab-skill-editor").innerHTML = editorHtml(entries, chosen);
}

/** A level typed for the chosen skill: kept when a whole number within its levels (0 or empty: not taken). */
export function setSkillLevel(input) {
  const value = input.value === "" ? 0 : Number(input.value);
  const max = input.max ? Number(input.max) : Infinity;
  const valid = Number.isInteger(value) && value >= 0 && value <= max;
  input.setAttribute("aria-invalid", String(!valid));
  if (!valid) return;
  const skills = lab().skills[lab().tree];
  if (value) skills[input.dataset.clabSkill] = value;
  else delete skills[input.dataset.clabSkill];
  drawSkills({ editor: false });
}
