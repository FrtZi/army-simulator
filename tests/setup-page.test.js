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

const SETUP_KEY = "army-simulator.player-setup";
const status = (page) => page.text("#setup-status");
const tileState = (page, section) => page.text(`[data-tile="${section}"] .tile-state`);
const tileFigure = (page, section) => page.text(`[data-tile="${section}"] .tile-figure`);
const addHero = (page, id) => {
  page.choose("#setup-warlord-select", id);
  page.click("#setup-warlord-add");
};

test("CFG-04 your setup's summary: one tile per section, its figure and its state in an icon and a word", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  const tiles = page.$$("#setup-summary [data-tile]").map((tile) => tile.dataset.tile);
  assert.deepEqual(tiles, ["warlords", "capacity", "bonuses", "rituals", "buildings", "champion"]);
  assert.equal(tileFigure(page, "warlords"), "0 of 33");
  assert.equal(tileState(page, "warlords"), "○ Not entered");
  assert.equal(tileState(page, "rituals"), "◌ Coming in version 1.2");
  assert.equal(status(page), "○ Nothing saved yet: enter what you have in the game, then Save.");
  assert.ok(page.$("#setup-save").disabled && page.$("#setup-discard").disabled, "nothing to save yet");
});

test("CFG-04 heroes entered at the game's rank and level, with the site's power, marked until saved", () => {
  const page = openPage();
  addHero(page, "azazel");
  addHero(page, "bloodthirster");
  page.choose("#setup-rank-azazel", 5); // rank 5, level 1 = level 21 of 35: 80,000 power (warlords.json)
  assert.match(page.text("#setup-warlord-list li:first-child .meta"), /level 21 · power 80,000/);
  assert.equal(page.text("#setup-warlord-list li:first-child .setup-mark"), "new");
  assert.ok(!page.$("#setup-warlord-select option[value=azazel]"), "an owned hero is not offered again");
  page.type("#setup-capacity-base", 110000);
  page.type("#setup-capacity-bonus", 10);
  assert.equal(tileFigure(page, "capacity"), "121,000");
  assert.equal(tileFigure(page, "warlords"), "2 of 33");
  assert.equal(tileState(page, "warlords"), "✓ Entered");
  assert.equal(status(page), "⚠ 4 unsaved changes: Save keeps them in this browser.");
  page.click("#setup-save");
  assert.equal(status(page), "✓ Saved in this browser.");
  assert.equal(page.$$(".setup-mark").length, 0, "nothing is marked once saved");
  assert.ok(page.$("#setup-save").disabled);
  // a change after the save: marked, counted, and gone back to by Discard
  page.choose("#setup-level-azazel", 4);
  page.click("#setup-remove-bloodthirster");
  assert.equal(page.text("#setup-warlord-list li:first-child .setup-mark"), "changed");
  assert.equal(page.text("#setup-warlords-removed"), "Removed since the last save: Bloodthirster.");
  assert.equal(status(page), "⚠ 2 unsaved changes: Save keeps them in this browser.");
  page.click("#setup-discard");
  assert.deepEqual(
    page.$$("#setup-warlord-list .name").map((name) => name.textContent),
    ["Azazel", "Bloodthirster"],
  );
  assert.equal(status(page), "✓ Saved in this browser.");
});

test("CFG-04 the saved setup is there on the next visit, kept as a setup file; leaving unsaved asks first", () => {
  const first = openPage();
  addHero(first, "azazel");
  first.choose("#setup-rank-azazel", 5);
  first.choose("#setup-level-azazel", 4);
  const leaving = () => {
    const event = new first.window.Event("beforeunload", { cancelable: true });
    first.window.dispatchEvent(event);
    return event.defaultPrevented;
  };
  assert.equal(leaving(), true, "unsaved changes: the browser asks before leaving");
  first.click("#setup-save");
  assert.equal(leaving(), false, "all saved: the page closes without asking");
  const stored = first.window.localStorage.getItem(SETUP_KEY);
  const file = JSON.parse(stored)["chaos-conquest"];
  assert.equal(file.format, "army-simulator/setup");
  assert.deepEqual(file.warlords, [{ id: "azazel", rank: 5, level: 4 }]);
  const next = openPage({ stored: { [SETUP_KEY]: stored } });
  assert.match(next.text("#setup-warlord-list .meta"), /level 24/);
  assert.equal(status(next), "✓ Saved in this browser.");
});

test("CFG-04 a saved setup the browser kept damaged opens empty, without an error", () => {
  const page = openPage({ stored: { [SETUP_KEY]: "{not json" } });
  assert.equal(tileFigure(page, "warlords"), "0 of 33");
});
