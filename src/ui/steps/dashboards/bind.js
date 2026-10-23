// The dashboard tabs: a click, or the arrow keys, Home and End (the ARIA tabs pattern), shows another panel;
// the efficiency chart's filters narrow the troops shown.
import { byId, keepingFocus } from "../../dom.js";
import { state } from "../../state.js";
import { toggleChoice } from "../../filters.js";
import { bindZoom } from "../../charts/zoom.js";
import { bindHoverNames } from "../../charts/hover.js";
import { drawDashboards, PANELS } from "./draw.js";

const NAMES = Object.keys(PANELS);
const KEYS = { ArrowRight: 1, ArrowLeft: -1 };

function show(name) {
  state.dashboard = name;
  drawDashboards();
  byId(`dash-tab-${name}`).focus();
}

export function bindDashboards() {
  const tabs = document.querySelector(".dash-tabs");
  tabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-dash]");
    if (tab) show(tab.dataset.dash);
  });
  tabs.addEventListener("keydown", (event) => {
    const index = NAMES.indexOf(state.dashboard);
    const next =
      { Home: 0, End: NAMES.length - 1 }[event.key] ??
      (event.key in KEYS ? (index + KEYS[event.key] + NAMES.length) % NAMES.length : null);
    if (next === null) return;
    event.preventDefault();
    show(NAMES[next]);
  });
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
