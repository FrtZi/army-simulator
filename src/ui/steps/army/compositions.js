// The compositions (ARMY-03, D-19): switch the one being edited, add a new one, duplicate or delete it, rename it.
import { byId, keepingFocus } from "../../dom.js";
import { state } from "../../state.js";
import { addComposition, duplicateComposition, removeComposition } from "../../compositions.js";
import { refresh } from "../../render.js";
import { drawPicker } from "../picker/draw.js";
import { drawHeroes } from "../heroes/draw.js";
import { drawArmyLines, drawCompositions } from "./draw.js";

function redrawEdited() {
  keepingFocus(() => {
    drawCompositions();
    drawArmyLines();
    drawPicker();
    drawHeroes();
  });
  refresh();
}

/** After adding one: its tab gets the focus, so the keyboard follows the new composition. */
function focusActiveTab() {
  redrawEdited();
  byId(`composition-tab-${state.active}`).focus();
}

export function bindCompositions() {
  byId("composition-tabs").addEventListener("click", (event) => {
    if (event.target.closest("#composition-new")) {
      addComposition();
      focusActiveTab();
      return;
    }
    const tab = event.target.closest("[data-composition]");
    if (!tab) return;
    state.active = Number(tab.dataset.composition);
    redrawEdited();
  });
  byId("composition-name").addEventListener("input", (event) => {
    state.compositions[state.active].name = event.target.value;
    drawCompositions();
    refresh();
  });
  byId("composition-duplicate").addEventListener("click", () => {
    duplicateComposition();
    focusActiveTab();
  });
  byId("composition-delete").addEventListener("click", () => {
    removeComposition();
    focusActiveTab();
  });
}
