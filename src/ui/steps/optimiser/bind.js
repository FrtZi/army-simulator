// The optimiser block (SIM-05, D-40): a goal chosen or an aim ticked (SIM-12) clears the last army found; the button
// runs the search; "Use it" puts the army found in the composition being edited, or in a new one, then edited.
import { byId } from "../../dom.js";
import { toggleChoice } from "../../filters.js";
import { bindTablist } from "../../tablist.js";
import { TABS } from "./draw.js";
import { runAims, runOptimiser, useFound } from "../../optimiser.js";
import { state } from "../../state.js";
import { renderAll } from "../../render.js";

/** Shows a tab of the results and puts the focus on it. */
function show(name) {
  state.optimiserView.tab = name;
  renderAll();
  byId(`opt-tab-${name}`).focus();
}

export function bindOptimiser() {
  bindTablist(byId("optimiser-tabs"), Object.keys(TABS), () => state.optimiserView.tab, show, "opt");
  // a block opened or closed is remembered ("toggle" does not bubble: caught on its way down, D-24)
  byId("optimiser-result").addEventListener(
    "toggle",
    (event) => {
      const id = event.target.dataset?.block;
      if (!id) return;
      if (event.target.open) state.optimiserView.closed.delete(id);
      else state.optimiserView.closed.add(id);
    },
    true,
  );
  byId("optimiser-goal").addEventListener("change", (event) => {
    state.optimiser = { ...state.optimiser, goal: event.target.value, result: null, applied: false };
    renderAll();
  });
  byId("optimiser-opponent").addEventListener("change", (event) => {
    state.optimiser = { ...state.optimiser, opponent: event.target.value, result: null, applied: false };
    renderAll();
  });
  byId("optimiser-aim").addEventListener("change", (event) => {
    if (!event.target.dataset.multi) return;
    toggleChoice(state.optimiser.aim, event.target);
    state.optimiser = { ...state.optimiser, result: null, applied: false };
    renderAll();
  });
  byId("optimiser-run").addEventListener("click", () => {
    state.optimiser = { ...state.optimiser, result: runOptimiser() ?? false, applied: false };
    renderAll();
  });
  // X or Y (SIM-21): a side's aim ticked clears the comparison; the button runs both sides
  byId("optimiser-result").addEventListener("change", (event) => {
    const side = event.target.closest?.("[id^=optimiser-xy-]")?.id.slice(-1);
    if (!side || !event.target.dataset.multi) return;
    toggleChoice(state.optimiserXY.aims[side], event.target);
    state.optimiserXY.result = null;
    renderAll();
  });
  byId("optimiser").addEventListener("click", (event) => {
    if (event.target.id === "optimiser-xy-run") {
      state.optimiserXY.result = runAims(state.optimiserXY.aims);
      renderAll();
      return;
    }
    const into = { "optimiser-use": "edited", "optimiser-new": "new" }[event.target.id];
    if (!into) return;
    useFound(into);
    state.optimiser.applied = true;
    renderAll();
  });
}
