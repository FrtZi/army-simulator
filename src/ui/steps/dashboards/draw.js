// Step 6 · the dashboards: six tabs (efficiency, battle by round, balance, damage vs tanking, pros and cons,
// raiding) over one panel. Only the tab shown is drawn.
import { byId } from "../../dom.js";
import { state } from "../../state.js";
import { balancePanel, sizeBars } from "./balance.js";
import { efficiencyPanel, raidPanel } from "./efficiency.js";
import { mapPanel } from "./map.js";
import { prosPanel } from "./pros.js";
import { roundsPanel } from "./rounds.js";

export const PANELS = {
  efficiency: efficiencyPanel,
  rounds: roundsPanel,
  balance: balancePanel,
  map: mapPanel,
  pros: prosPanel,
  raid: raidPanel,
};

/** The tabs (the one shown selected and in the tab order, as the ARIA tabs pattern asks) and its panel. */
export function drawDashboards() {
  for (const tab of document.querySelectorAll("[data-dash]")) {
    const selected = tab.dataset.dash === state.dashboard;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  const panel = byId("dash-panel");
  panel.setAttribute("aria-labelledby", `dash-tab-${state.dashboard}`);
  panel.innerHTML = PANELS[state.dashboard]();
  sizeBars(panel);
}
