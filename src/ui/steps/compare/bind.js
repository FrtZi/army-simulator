// The two lists of the comparison: choosing a composition on one side redraws the comparison and the
// dashboards that use the pair.
import { byId, keepingFocus } from "../../dom.js";
import { chooseCompared } from "../../compositions.js";
import { drawDashboards } from "../dashboards/draw.js";
import { drawCompare } from "./draw.js";

export function bindCompare() {
  for (const select of [byId("compare-a"), byId("compare-b")]) {
    select.addEventListener("change", () => {
      chooseCompared(Number(select.dataset.side), Number(select.value));
      keepingFocus(() => {
        drawCompare();
        drawDashboards(); // the battles and the pros and cons follow the pair
      });
    });
  }
}
