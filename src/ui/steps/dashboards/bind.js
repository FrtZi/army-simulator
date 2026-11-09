// The dashboard tabs: a click, or the arrow keys, Home and End (the ARIA tabs pattern, tablist.js), shows another panel;
// the efficiency chart's filters narrow the troops shown.
import { byId, keepingFocus } from "../../dom.js";
import { state } from "../../state.js";
import { toggleChoice } from "../../filters.js";
import { bindZoom } from "../../charts/zoom.js";
import { bindHoverNames } from "../../charts/hover.js";
import { bindTablist } from "../../tablist.js";
import { drawDashboards, PANELS } from "./draw.js";

const NAMES = Object.keys(PANELS);

function show(name) {
  state.dashboard = name;
  drawDashboards();
  byId(`dash-tab-${name}`).focus();
}

export function bindDashboards() {
  bindTablist(document.querySelector(".dash-tabs"), NAMES, () => state.dashboard, show, "dash");
  bindHoverNames(byId("dash-panel"));
  // "toggle" does not bubble: caught on its way down, it keeps the table open across redraws (D-24)
  byId("dash-panel").addEventListener(
    "toggle",
    (event) => {
      if (event.target.id === "chart-table") state.chartTable = event.target.open;
    },
    true,
  );
  byId("dash-panel").addEventListener("click", (event) => {
    if (!event.target.closest("#highlight-toggle")) return;
    state.highlightComposition = !state.highlightComposition;
    drawDashboards();
    byId("highlight-toggle").focus();
  });
  bindZoom(byId("dash-panel"), (focusId) => {
    drawDashboards();
    byId(focusId)?.focus();
  });
  byId("dash-panel").addEventListener("change", (event) => {
    if (!event.target.dataset.multi) return;
    toggleChoice(state.efficiencyFilters, event.target);
    keepingFocus(drawDashboards);
  });
}
