// The page's tabs and Your setup, on the published page in jsdom (NAV-01, CFG-04, D-27).
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./page.js";

const shown = (page, id) => !page.$(`#${id}`).hidden;
const key = (page, selector, name) =>
  page.$(selector).dispatchEvent(new page.window.KeyboardEvent("keydown", { key: name, bubbles: true }));

test("NAV-01 two page tabs: the Battle lab first, Your setup beside it; one panel shown at a time", () => {
  const page = openPage();
  assert.deepEqual(
    page.$$(".page-tabs [role=tab]").map((tab) => tab.textContent),
    ["Battle lab", "Your setup"],
  );
  assert.ok(shown(page, "page-panel-lab") && !shown(page, "page-panel-setup"));
  assert.equal(page.$("#page-tab-lab").getAttribute("aria-selected"), "true");
  page.click("#page-tab-setup");
  assert.ok(!shown(page, "page-panel-lab") && shown(page, "page-panel-setup"));
  assert.equal(page.$("#page-tab-setup").getAttribute("aria-selected"), "true");
  assert.equal(page.$("#page-tab-lab").tabIndex, -1, "only the selected tab is in the tab order");
  // the keyboard, as the ARIA tabs pattern says: the arrows go round, Home and End to the ends
  key(page, "#page-tab-setup", "ArrowRight");
  assert.ok(shown(page, "page-panel-lab"));
  key(page, "#page-tab-lab", "End");
  assert.ok(shown(page, "page-panel-setup"));
  assert.equal(page.window.document.activeElement.id, "page-tab-setup");
  // the game is chosen above the tabs: it applies to both
  assert.ok(!page.$("#page-panel-lab").contains(page.$("#game")));
});

test("NAV-01 the tabs read in French too", () => {
  const page = openPage({ saved: "fr" });
  assert.equal(page.text("#page-tab-setup"), "Votre configuration");
  assert.equal(page.$(".page-tabs").getAttribute("aria-label"), "Pages");
});
