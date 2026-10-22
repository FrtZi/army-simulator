// The march capacity fields and the army's lines: a value typed in refreshes the figures; removing a troop
// redraws the lines and the picker (where it becomes available again).
import { byId, keepingFocus } from "../../dom.js";
import { state } from "../../state.js";
import { refresh } from "../../render.js";
import { drawPicker } from "../picker/draw.js";
import { drawArmyLines } from "./draw.js";

const wholeCount = (text) => Math.max(0, Math.round(Number(text) || 0));

export function bindArmy() {
  byId("capacity-base").addEventListener("input", (event) => {
    state.marchCapacity = wholeCount(event.target.value);
    refresh();
  });
  byId("capacity-bonus").addEventListener("input", (event) => {
    state.capacityBonus = event.target.value === "" ? undefined : Number(event.target.value);
    refresh();
  });
  const lines = byId("army-lines");
  lines.addEventListener("input", (event) => {
    const id = event.target.dataset.count;
    if (!id) return;
    state.troops[id] = wholeCount(event.target.value);
    refresh();
  });
  lines.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    delete state.troops[button.dataset.remove];
    keepingFocus(() => {
      drawArmyLines();
      drawPicker();
    });
    refresh();
    byId("picker-toggle").focus();
  });
}
