// The map to reach a ritual (GUIDE-07, D-32): its category's tree as the game draws it, each ritual under its
// prerequisites, a node per ritual in the state the saved setup gives it (at its top, under way, can start, locked),
// the way to the level chosen lit, and below it the steps still to do, in order. Each node is a button that opens
// its ritual; the links are drawn behind, for the eye only.
import { escape } from "../../dom.js";
import { label } from "../../format.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { depthsOf, prerequisitesOf } from "../../../engine/index.js";
import { treeHtml } from "../../ritual-tree.js";
import { savedLevel } from "./levelled.js";

const mine = (id) => savedLevel("rituals", id);

/** The steps left to reach `level` of the ritual: each prerequisite under the level asked, the deepest first. */
function stepsHtml(entry, level, needed, all) {
  const depths = depthsOf(all);
  const byId = new Map(all.map((other) => [other.id, other]));
  const steps = [...needed]
    .filter(([id, asked]) => mine(id) < asked && byId.has(id))
    .sort(([a], [b]) => depths.get(a) - depths.get(b))
    .map(([id, asked]) => [byId.get(id), asked]);
  if (mine(entry.id) < level) steps.push([entry, level]);
  if (!steps.length) return `<p class="hint">${escape(t("map.reached"))}</p>`;
  const items = steps.map(
    ([step, asked]) =>
      `<li><button type="button" class="link-button" data-guide-entry="${step.id}">${escape(label(step))}</button> ${escape(t("map.step", { from: mine(step.id), to: asked }))}</li>`,
  );
  return `<ol class="map-steps">${items.join("")}</ol>`;
}

/** The map of the ritual's category, the way to `level` lit, and the steps left. */
export function ritualMapHtml(entry, level) {
  const all = currentGame().rituals.rituals;
  const tree = all.filter((other) => other.category === entry.category);
  const needed = prerequisitesOf(all, entry.id, level);
  const lit = Object.assign(new Set(needed.keys()), { goal: entry.id });

  return `<h4>${escape(t("map.title", { level }))}</h4>
    <p class="hint">${escape(t("map.hint"))}</p>
    ${treeHtml(tree, { levelOf: mine, lit, attribute: "data-guide-entry" })}
    <h4>${escape(t("map.stepsTitle"))}</h4>${stepsHtml(entry, level, needed, all)}`;
}
