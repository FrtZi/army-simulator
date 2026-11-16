// The champion's two skill trees in the Champion lab (BONUS-09): drawn as the rituals' trees are (GUIDE-07), a skill
// chosen in its tree to set its level; the points spent against those the level chosen gives, and what the skills
// taken give where their values are known.
import { byId, options } from "../../dom.js";
import { label } from "../../format.js";
import { treeHtml } from "../../ritual-tree.js";
import { asEntry, pointsLine, skillEditorHtml, skillTrees, typedLevel } from "../../skill-tree.js";
import { lab } from "./lab.js";
import { skillBenefitsHtml, treeBenefitsHtml } from "../../skill-benefits.js";

const tree = () => skillTrees().find((entry) => entry.id === lab().tree);
const levelOf = (id) => lab().skills[lab().tree][id] ?? 0;

/** The tree shown, its points and, with `editor`, the chosen skill's level (a level typed redraws the rest only). */
export function drawSkills({ editor = true } = {}) {
  byId("clab-tree").innerHTML = options(
    skillTrees().map((entry) => [entry.id, label(entry)]),
    lab().tree,
  );
  const entries = tree().skills.map(asEntry);
  const chosen = entries.find((entry) => entry.id === lab().chosen) ?? entries[0];
  lab().chosen = chosen.id;
  const spent = Object.values(lab().skills[lab().tree]).reduce((sum, level) => sum + level, 0);
  const points = pointsLine(tree(), spent, lab().level);
  byId("clab-points").innerHTML = points.html;
  byId("clab-points").classList.toggle("critical", points.over);
  const lit = Object.assign(new Set(), { goal: chosen.id });
  byId("clab-tree-map").innerHTML = treeHtml(entries, { levelOf, lit, attribute: "data-clab-node" });
  if (editor) {
    const field = { id: "clab-skill-level", attribute: "data-clab-skill", level: levelOf(chosen.id) };
    byId("clab-skill-editor").innerHTML = skillEditorHtml(entries, chosen, field);
  }
  byId("clab-skill-benefits").innerHTML = skillBenefitsHtml(chosen, levelOf(chosen.id));
  byId("clab-tree-benefits").innerHTML = treeBenefitsHtml(tree().skills, lab().skills[lab().tree]);
}

/** A level typed for the chosen skill: kept when a whole number within its levels (0 or empty: not taken). */
export function setSkillLevel(input) {
  const value = typedLevel(input);
  if (value === null) return;
  const skills = lab().skills[lab().tree];
  if (value) skills[input.dataset.clabSkill] = value;
  else delete skills[input.dataset.clabSkill];
  drawSkills({ editor: false });
}
