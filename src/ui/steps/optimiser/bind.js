// The optimiser block (SIM-05, D-40): a goal chosen or an aim ticked (SIM-12) clears the last army found; the button
// runs the search; "Use it" puts the army found in the composition being edited, or in a new one, then edited.
import { byId } from "../../dom.js";
import { toggleChoice } from "../../filters.js";
import { runOptimiser, useFound } from "../../optimiser.js";
import { state } from "../../state.js";
import { renderAll } from "../../render.js";

export function bindOptimiser() {
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
  byId("optimiser").addEventListener("click", (event) => {
    const into = { "optimiser-use": "edited", "optimiser-new": "new" }[event.target.id];
    if (!into) return;
    useFound(into);
    state.optimiser.applied = true;
    renderAll();
  });
}
