// The page's two tabs (NAV-01, D-27): the Battle lab, the page as it was, and Your setup, what the player has in
// game. A click, or the arrow keys, Home and End (the ARIA tabs pattern), shows the other panel; the game chosen
// above them applies to both.
import { byId } from "../../dom.js";
import { state } from "../../state.js";

const PAGES = ["lab", "setup"];
const KEYS = { ArrowRight: 1, ArrowLeft: -1 };

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
  const tabs = document.querySelector(".page-tabs");
  tabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-page-tab]");
    if (tab) show(tab.dataset.pageTab);
  });
  tabs.addEventListener("keydown", (event) => {
    const index = PAGES.indexOf(state.page);
    const next =
      { Home: 0, End: PAGES.length - 1 }[event.key] ??
      (event.key in KEYS ? (index + KEYS[event.key] + PAGES.length) % PAGES.length : null);
    if (next === null) return;
    event.preventDefault();
    show(PAGES[next]);
  });
}
