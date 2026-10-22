// The picker's controls: open and close, search, filters, ticks, and adding the ticked troops to the army.
import { CONFIG } from "../../config.js";
import { byId, keepingFocus } from "../../dom.js";
import { state } from "../../state.js";
import { refresh } from "../../render.js";
import { drawArmyLines } from "../army/draw.js";
import { toggleChoice } from "../../filters.js";
import { drawFilters, drawPicker, drawPickerButton, drawPickerList } from "./draw.js";

function addPicked() {
  const { picker } = state;
  if (!picker.picked.size) return;
  for (const id of picker.picked) state.troops[id] = CONFIG.newTroopCount;
  picker.picked = new Set();
  picker.open = false;
  drawArmyLines();
  drawPicker();
  refresh();
  byId("picker-toggle").focus();
}

export function bindPicker() {
  byId("picker-toggle").addEventListener("click", () => {
    state.picker.open = !state.picker.open;
    drawPicker();
    if (state.picker.open) byId("picker-search").focus();
  });
  byId("picker-search").addEventListener("input", (event) => {
    state.picker.search = event.target.value;
    drawPickerList();
  });
  byId("picker-filters").addEventListener("change", (event) => {
    if (!event.target.dataset.multi) return;
    toggleChoice(state.picker.filters, event.target);
    keepingFocus(() => {
      drawFilters();
      drawPickerList();
    });
  });
  byId("picker-list").addEventListener("change", (event) => {
    const id = event.target.dataset.pick;
    if (!id) return;
    if (event.target.checked) state.picker.picked.add(id);
    else state.picker.picked.delete(id);
    drawPickerButton();
  });
  byId("picker-add").addEventListener("click", addPicked);
}
