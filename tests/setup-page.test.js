// The page's tabs and Your setup, on the published page in jsdom (NAV-01, CFG-04, D-27).
import { test } from "node:test";
import assert from "node:assert/strict";
import { addTroops, openPage } from "./page.js";

const shown = (page, id) => !page.$(`#${id}`).hidden;
const key = (page, selector, name) =>
  page.$(selector).dispatchEvent(new page.window.KeyboardEvent("keydown", { key: name, bubbles: true }));

test("NAV-01 GUIDE-01 three page tabs: the Battle lab first, Your setup, the Guides; one panel shown at a time", () => {
  const page = openPage();
  assert.deepEqual(
    page.$$(".page-tabs [role=tab]").map((tab) => tab.textContent),
    ["Battle lab", "Your setup", "Guides"],
  );
  assert.ok(shown(page, "page-panel-lab") && !shown(page, "page-panel-setup"));
  assert.equal(page.$("#page-tab-lab").getAttribute("aria-selected"), "true");
  page.click("#page-tab-setup");
  assert.ok(!shown(page, "page-panel-lab") && shown(page, "page-panel-setup"));
  assert.equal(page.$("#page-tab-setup").getAttribute("aria-selected"), "true");
  assert.equal(page.$("#page-tab-lab").tabIndex, -1, "only the selected tab is in the tab order");
  // the keyboard, as the ARIA tabs pattern says: the arrows go round, Home and End to the ends
  key(page, "#page-tab-setup", "ArrowRight");
  assert.ok(shown(page, "page-panel-guides") && !shown(page, "page-panel-setup"));
  key(page, "#page-tab-guides", "ArrowRight");
  assert.ok(shown(page, "page-panel-lab"), "the arrows go round");
  key(page, "#page-tab-lab", "End");
  assert.ok(shown(page, "page-panel-guides"));
  assert.equal(page.window.document.activeElement.id, "page-tab-guides");
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
  assert.deepEqual(tiles, ["warlords", "capacity", "rituals", "buildings", "bonuses", "champion"]);
  assert.equal(tileFigure(page, "warlords"), "0 of 33");
  assert.equal(tileState(page, "warlords"), "○ Not entered");
  assert.equal(tileState(page, "rituals"), "○ Not entered");
  assert.equal(tileState(page, "champion"), "◌ Coming in version 1.3");
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

const SAVED = JSON.stringify({
  "chaos-conquest": {
    format: "army-simulator/setup",
    version: 1,
    game: "chaos-conquest",
    warlords: [{ id: "azazel", rank: 5, level: 4 }],
    capacity: { base: 110000, bonusPercent: 35 },
    bonuses: [{ stat: "meleeAttack", percent: 12, target: { unitTypes: ["infantry"] } }],
  },
});
const heroNames = (page) => page.$$("#hero-lines .name").map((name) => name.textContent);

test("CFG-04 Load your setup: only the heroes owned at their levels, the setup's capacity and bonuses; off, free play", () => {
  const page = openPage({ stored: { [SETUP_KEY]: SAVED } });
  for (const id of ["azazel", "bloodthirster"]) {
    page.click("#hero-picker-toggle");
    page.tick(`#pick-hero-${id}`);
    page.click("#hero-picker-add");
  }
  assert.equal(page.$("#load-setup-toggle").checked, false, "off by default: free play");
  page.tick("#load-setup-toggle");
  assert.deepEqual(heroNames(page), ["Azazel"]);
  assert.match(page.text("#hero-lines"), /level 24 · power 95,000/); // rank 5, level 4: warlords.json
  assert.match(page.text("#hero-lines"), /Not in your setup, left out of the figures: Bloodthirster\./);
  assert.ok(page.$("#rank-azazel").disabled, "the level is the setup's");
  assert.equal(page.$("#capacity-base").value, "110000");
  assert.ok(page.$("#capacity-base").disabled && page.$("#capacity-bonus").disabled);
  assert.match(page.text("#capacity .capacity-total"), /= 148,500/); // 110,000 + 35 %
  assert.match(page.text("#bonus-list"), /your setup's 1 bonuses/);
  assert.match(page.text("#load-setup-status"), /^On: compositions play with your saved setup\./);
  page.click("#hero-picker-toggle");
  assert.deepEqual(
    page.$$("#hero-picker-list [data-pick-hero]").map((box) => box.dataset.pickHero),
    ["azazel"],
    "only the heroes owned can be picked",
  );
  page.click("#hero-picker-toggle");
  page.untick("#load-setup-toggle");
  assert.deepEqual(heroNames(page), ["Azazel", "Bloodthirster"]);
  assert.match(page.text("#hero-lines"), /level 1 ·/);
  assert.equal(page.$("#capacity-base").value, "50000");
  assert.ok(!page.$("#capacity-base").disabled);
});

test("CFG-04 the setup's bonuses count in the figures once loaded, and only then", () => {
  const page = openPage({ stored: { [SETUP_KEY]: SAVED } });
  addTroops(page, ["marauders"]); // infantry, no hero: only the setup's +12 % melee attack on infantry differs
  const free = page.metric("damage");
  page.tick("#load-setup-toggle");
  const loaded = page.metric("damage");
  assert.ok(Number(loaded.replace(/\D/g, "")) > Number(free.replace(/\D/g, "")), `${loaded} > ${free}`);
  page.untick("#load-setup-toggle");
  assert.equal(page.metric("damage"), free);
});

test("CFG-04 with nothing saved in Your setup, the switch cannot be turned on and says where to go", () => {
  const page = openPage();
  assert.ok(page.$("#load-setup-toggle").disabled);
  assert.match(page.text("#load-setup-status"), /^Nothing is saved in Your setup yet/);
  page.click("#load-setup-open");
  assert.ok(!page.$("#page-panel-setup").hidden);
});

test("CFG-04 a saved setup the browser kept damaged opens empty, without an error", () => {
  const page = openPage({ stored: { [SETUP_KEY]: "{not json" } });
  assert.equal(tileFigure(page, "warlords"), "0 of 33");
});

test("BONUS-04 BONUS-07 rituals and buildings at their levels: typed, a level beyond the last refused, saved", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  page.choose("#setup-ritual-category", "battle");
  page.type("#setup-ritual-cavalry-and-chariot-morale", 4);
  page.type("#setup-building-beastmen-herdstone", 40);
  page.type("#setup-building-bestiary", 99); // the Bestiary has 40 levels: marked, not kept
  assert.equal(page.$("#setup-building-bestiary").getAttribute("aria-invalid"), "true");
  assert.equal(tileFigure(page, "rituals"), "1 of 373");
  assert.equal(tileFigure(page, "buildings"), "1 of 32");
  assert.equal(page.text("#setup-status"), "⚠ 2 unsaved changes: Save keeps them in this browser.");
  page.type("#setup-ritual-cavalry-and-chariot-morale", 0); // 0 takes it out
  assert.equal(tileFigure(page, "rituals"), "0 of 373");
  page.type("#setup-ritual-cavalry-and-chariot-morale", 4);
  page.click("#setup-save");
  const file = JSON.parse(page.window.localStorage.getItem(SETUP_KEY))["chaos-conquest"];
  assert.deepEqual(file.rituals, [{ id: "cavalry-and-chariot-morale", level: 4 }]);
  assert.deepEqual(file.buildings, [{ id: "beastmen-herdstone", level: 40 }]);
});

test("BONUS-07 DEF-036 a setup of buildings alone loads: their bonuses in battle count in the lab, and only then", () => {
  const saved = JSON.stringify({
    "chaos-conquest": {
      format: "army-simulator/setup",
      version: 1,
      game: "chaos-conquest",
      buildings: [{ id: "beastmen-herdstone", level: 40 }],
    },
  });
  const page = openPage({ stored: { [SETUP_KEY]: saved } });
  addTroops(page, ["marauders"]); // infantry: the Herdstone at 40 gives infantry +15 % health (structures.json)
  const health = () => Number(page.metric("health").replace(/\D/g, ""));
  const free = health();
  page.tick("#load-setup-toggle");
  assert.equal(health(), Math.round(free * 1.15));
  page.untick("#load-setup-toggle");
  assert.equal(health(), free);
});
