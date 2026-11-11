// The page's tabs (NAV-01, D-27): the Battle lab, the page as it was; Your setup, what the player has in game; and
// the Guides, the game's blocks in detail (GUIDE-01). The game chosen above them applies to all three.
import { byId } from "../../dom.js";
import { state } from "../../state.js";
import { bindTablist } from "../../tablist.js";

const PAGES = ["lab", "setup", "guides", "champion"]; // the Champion lab: BONUS-09

/** Shows the tab of the page chosen, and only its panel; only the selected tab is in the tab order. */
export function drawPageTabs() {
  for (const page of PAGES) {
    const selected = page === state.page;
    const tab = byId(`page-tab-${page}`);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    byId(`page-panel-${page}`).hidden = !selected;
  }
}

function show(page) {
  state.page = page;
  drawPageTabs();
  byId(`page-tab-${page}`).focus();
}

export function bindPageTabs() {
  bindTablist(document.querySelector(".page-tabs"), PAGES, () => state.page, show, "page-tab");
}
