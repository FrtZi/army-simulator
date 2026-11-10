// The two lists of the comparison: choosing a composition on one side redraws the comparison and the
// dashboards that use the pair.
import { byId, keepingFocus } from "../../dom.js";
import { currentGame, state } from "../../state.js";
import { choosePlace } from "../../pve.js";
import { bindPveChoice } from "./pve.js";
import { chooseCompared } from "../../compositions.js";
import { drawDashboards } from "../dashboards/draw.js";
import { drawCompare } from "./draw.js";

const redraw = () => {
  drawCompare();
  drawDashboards();
};

export function bindCompare() {
  bindPveChoice(redraw);
  for (const select of [byId("compare-a"), byId("compare-b")]) {
    select.addEventListener("change", () => {
      const pve = select.value === "pve"; // a PvE army on the second side (SIM-11)
      if (pve && !state.pve.on) choosePlace(state, currentGame(), {});
      state.pve.on = pve;
      if (!pve) chooseCompared(Number(select.dataset.side), Number(select.value));
      keepingFocus(() => {
        drawCompare();
        drawDashboards(); // the battles and the pros and cons follow the pair
      });
    });
  }
}
