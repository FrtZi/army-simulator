// The Champion lab's controls (BONUS-09): the level, each side's set, pieces and levels, the tree shown, a skill
// chosen in it and its level. Each change redraws what follows from it; the field in use keeps its focus.
import { byId, keepingFocus } from "../../dom.js";
import { lab } from "./lab.js";
import { drawChampionLab } from "./draw.js";
import { chooseSidePiece, chooseSideSet, drawGear } from "./gear.js";
import { drawSkills, setSkillLevel } from "./skills.js";

function changed(event) {
  const { clabSet, clabPiece, clabLevel, side } = event.target.dataset;
  if (event.target.id === "clab-level") {
    lab().level = Number(event.target.value);
    return drawChampionLab;
  }
  if (event.target.id === "clab-tree") {
    Object.assign(lab(), { tree: event.target.value, chosen: null });
    return drawSkills;
  }
  if (clabSet) chooseSideSet(clabSet, event.target.value);
  else if (clabPiece) chooseSidePiece(side, clabPiece, "piece", event.target.value);
  else if (clabLevel) chooseSidePiece(side, clabLevel, "level", event.target.value);
  else return null;
  return drawGear;
}

export function bindChampionLab() {
  const panel = byId("page-panel-champion");
  panel.addEventListener("change", (event) => {
    const redraw = changed(event);
    if (redraw) keepingFocus(() => redraw());
  });
  panel.addEventListener("input", (event) => {
    if (event.target.dataset.clabSkill) setSkillLevel(event.target);
  });
  panel.addEventListener("click", (event) => {
    const node = event.target.closest("[data-clab-node]");
    if (!node) return;
    lab().chosen = node.dataset.clabNode;
    drawSkills();
    byId("clab-skill-level").focus();
  });
}
