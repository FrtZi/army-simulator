// Your setup's rituals in their tree (Frantz, 2026-11-10): the category drawn as the game's tree with the levels as
// entered (saved or not); a ritual chosen in it opens its level under the tree, the same field as its line in the list.
import { byId, escape } from "../../dom.js";
import { label } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { treeHtml, treeOrder } from "../../ritual-tree.js";

const entered = (id) => state.playerSetup.rituals.find((entry) => entry.id === id)?.level ?? 0;
const category = () => currentGame().rituals.rituals.filter((ritual) => ritual.category === state.setupRitualCategory);

/** The ritual chosen's level, under the tree. */
function editorHtml(rituals, chosen) {
  const { number } = treeOrder(rituals).find(({ entry }) => entry.id === chosen.id);
  const max = chosen.power.length;
  const name = label(chosen);
  return `<span class="tree-number">${number}</span>
    <label for="setup-ritual-chosen">${escape(t("setup.levelOf", { name, max }))}</label>
    <input id="setup-ritual-chosen" type="number" min="0" max="${max}" step="1" inputmode="numeric" data-setup-level="rituals" data-id="${chosen.id}" value="${entered(chosen.id) || ""}" />
    <span class="meta" aria-hidden="true">/ ${max}</span>`;
}

/** The tree, and with `editor` the chosen ritual's field (a level typed redraws the tree only, the field kept). */
export function drawSetupRitualTree({ editor = true } = {}) {
  const rituals = category();
  const chosen = rituals.find((ritual) => ritual.id === state.setupRitualChosen) ?? rituals[0];
  state.setupRitualChosen = chosen?.id;
  const lit = Object.assign(new Set(), { goal: chosen?.id });
  byId("setup-ritual-tree").innerHTML = treeHtml(rituals, { levelOf: entered, lit, attribute: "data-setup-ritual" });
  if (editor) byId("setup-ritual-editor").innerHTML = chosen ? editorHtml(rituals, chosen) : "";
}

/** A ritual chosen in the tree: its field under it, focused. */
export function chooseRitual(id) {
  state.setupRitualChosen = id;
  drawSetupRitualTree();
  byId("setup-ritual-chosen").focus();
}
