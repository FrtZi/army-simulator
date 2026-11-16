// Your setup's champion skills (BONUS-10): either tree drawn as the rituals', a skill chosen in it to type its level,
// the points spent against those the champion's level gives. Kept with the champion, saved with the rest on Save.
import { byId, escape, options } from "../../dom.js";
import { label, number } from "../../format.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";
import { treeHtml } from "../../ritual-tree.js";
import { asEntry, pointsLine, skillEditorHtml, skillTrees, typedLevel } from "../../skill-tree.js";

const taken = () => state.playerSetup.champion?.skills ?? [];
const levelOf = (id) => taken().find((entry) => entry.id === id)?.level ?? 0;
const tree = () => skillTrees().find((entry) => entry.id === state.setupSkillTree) ?? skillTrees()[0];

/** The points spent in the tree shown; against the champion's level when it is entered. */
function drawPoints() {
  const spent = tree().skills.reduce((sum, skill) => sum + levelOf(skill.id), 0);
  const { level } = state.playerSetup.champion ?? {};
  const points = level
    ? pointsLine(tree(), spent, level)
    : { over: false, html: escape(t("setup.skillsSpent", { spent: number(spent) })) };
  byId("setup-skill-points").innerHTML = points.html;
  byId("setup-skill-points").classList.toggle("critical", points.over);
}

/** The tree shown, its points and, with `editor`, the chosen skill's level (a level typed redraws the rest only). */
export function drawSetupSkills({ editor = true } = {}) {
  byId("setup-skill-tree").innerHTML = options(
    skillTrees().map((entry) => [entry.id, label(entry)]),
    tree().id,
  );
  const entries = tree().skills.map(asEntry);
  const chosen = entries.find((entry) => entry.id === state.setupSkillChosen) ?? entries[0];
  state.setupSkillChosen = chosen.id;
  drawPoints();
  const lit = Object.assign(new Set(), { goal: chosen.id });
  byId("setup-skill-map").innerHTML = treeHtml(entries, { levelOf, lit, attribute: "data-setup-skill-node" });
  if (editor) {
    const field = { id: "setup-skill-level", attribute: "data-setup-skill", level: levelOf(chosen.id) };
    byId("setup-skill-editor").innerHTML = skillEditorHtml(entries, chosen, field);
  }
}

/** The skills once a level is typed: the skill replaced, or left out at 0. */
export function skillsWith(input) {
  const value = typedLevel(input);
  if (value === null) return null;
  const id = input.dataset.setupSkill;
  const others = taken().filter((entry) => entry.id !== id);
  return value ? [...others, { id, level: value }] : others;
}

/** A skill chosen in the tree: its field under it, focused. */
export function chooseSkill(id) {
  state.setupSkillChosen = id;
  drawSetupSkills();
  byId("setup-skill-level").focus();
}
