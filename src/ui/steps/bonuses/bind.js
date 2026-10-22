// The bonus rows: add, remove, change. A percentage typed in only refreshes the figures; a changed choice
// redraws the rows (a new target brings its own list of values).
import { CONFIG } from "../../config.js";
import { byId, keepingFocus } from "../../dom.js";
import { currentGame, state } from "../../state.js";
import { refresh } from "../../render.js";
import { drawBonuses } from "./draw.js";

const redraw = () => {
  keepingFocus(drawBonuses);
  refresh();
};

/** The first value a filter can take, so a new target always starts valid. */
const firstValue = (filter) => (filter === "all" ? "" : String(currentGame().game[filter][0].id));

export function bindBonuses() {
  byId("bonus-add").addEventListener("click", () => {
    state.bonuses.push({ ...CONFIG.newBonus });
    redraw();
    byId(`bonus-stat-${state.bonuses.length - 1}`).focus();
  });
  const list = byId("bonus-list");
  list.addEventListener("input", (event) => {
    if (event.target.dataset.key !== "percent") return;
    const bonus = state.bonuses[event.target.closest("[data-index]").dataset.index];
    bonus.percent = event.target.value === "" ? undefined : Number(event.target.value);
    refresh();
  });
  list.addEventListener("change", (event) => {
    const { key } = event.target.dataset;
    if (!key || key === "percent") return;
    const bonus = state.bonuses[event.target.closest("[data-index]").dataset.index];
    bonus[key] = event.target.value;
    if (key === "filter") bonus.value = firstValue(bonus.filter);
    redraw();
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    state.bonuses.splice(Number(button.dataset.remove), 1);
    redraw();
    byId("bonus-add").focus();
  });
}
