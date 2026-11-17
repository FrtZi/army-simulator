// The optimiser's page as agreed (SIM-18, SIM-19): its results in tabs (the model's map, with what I have, to
// improve), every block folding and remembered closed across runs, the gods' colours on the troops' bars and the
// heroes' cards, each with its god's name. On the published page in jsdom, with Your setup loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./page.js";

const GAME = "chaos-conquest";
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  warlords: ["bloodthirster", "chaos-lord-of-khorne", "great-unclean-one", "doom-knight"].map((id) => ({
    id,
    rank: 4,
    level: 5,
  })),
  troops: [
    { id: "khorngor", count: 30000 },
    { id: "pestigor", count: 30000 },
    { id: "khorne-gor", count: 20000 },
  ],
};

function run() {
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: setup }) } });
  page.tick("#load-setup-toggle");
  assert.ok(page.$("#optimiser-result").hidden, "no tabs before an army is found");
  page.click("#optimiser-run");
  return page;
}

test("SIM-18 the results in four tabs, with what I have shown first, the others a click away", () => {
  const page = run();
  const selected = () => page.$$("#optimiser-tabs [role=tab]").filter((tab) => tab.ariaSelected === "true");
  assert.deepEqual(
    page.$$("#optimiser-tabs [role=tab]").map((tab) => tab.textContent),
    ["Model's map", "With what I have", "X or Y", "To improve"],
  );
  assert.deepEqual(
    selected().map((tab) => tab.id),
    ["opt-tab-have"],
  );
  assert.ok(page.$("#opt-panel-map").hidden && !page.$("#opt-panel-have").hidden);
  page.click("#opt-tab-up");
  assert.deepEqual(
    selected().map((tab) => tab.id),
    ["opt-tab-up"],
  );
  assert.ok(!page.$("#opt-panel-up").hidden && page.$("#opt-panel-have").hidden);
  assert.match(page.text("#opt-panel-up"), /^The path: what to get or raise next \d+ steps · the first: /);
  // the model's map: the search's stages with their figures (4 heroes owned: 4 trios, all kept, all settled)
  page.click("#opt-tab-map");
  assert.match(page.text("#opt-panel-map"), /4heroes owned3kinds of troops50,000march places/);
  // the stages as cards, each its figure and what it does (SIM-22)
  assert.match(page.text("#opt-panel-map .opt-stages"), /^4trios of heroes, .*4kept, .*4settled, .*1chosen, /);
});

test("SIM-18 every block folds, its line still shown, and stays closed across runs", () => {
  const page = run();
  const troops = () => page.$('#opt-panel-have [data-block="troops"]');
  assert.ok(troops().open);
  troops().open = false;
  troops().dispatchEvent(new page.window.Event("toggle"));
  page.click("#optimiser-run");
  assert.ok(!troops().open, "still closed after another run");
  assert.match(
    troops().querySelector("summary").textContent,
    /Troops kinds: 3 · (Nurgle \d+ %, Khorne|Khorne \d+ %, Nurgle) \d+ %/,
  );
});

test("SIM-19 the gods' colours: each troop's bar and each hero's card in its god's colour, its god written beside", () => {
  const page = run();
  const bars = page.$$('#opt-panel-have [data-block="troops"] .share-bar span').map((bar) => bar.className);
  assert.ok(bars.length >= 2 && bars.every((name) => /^mark-(khorne|nurgle)$/.test(name)), bars.join(", "));
  const cards = page.$$("#opt-panel-have .opt-hero");
  for (const card of cards) {
    const god = card.className.match(/mark-(\w+)/)[1];
    // the god's name beside its colour (Undivided reads "Chaos Undivided")
    assert.match(card.textContent, new RegExp(god, "i"), "the god's name beside its colour");
  }
  // a talent says the hero it is from
  assert.match(page.text("#opt-panel-have"), /Melee Damage, Khorne \+33\.5 % · from Chaos Lord of Khorne on Dragon/);
});

// DEF-051: in French every bar was full: its share written "58,1" by the page's language, no CSS width
// DEF-052: the hero cards took the troop icons' god-* class, which colours text with a colour checked for marks only
test("SIM-19 DEF-051 DEF-052 in French the bars measure their share, and no god's colour falls on text", () => {
  const page = openPage({
    language: "fr-FR",
    // 45,000 places: shares with decimals (two thirds and one third), where a comma shows
    stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: { ...setup, capacity: { base: 45000 } } }) },
  });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  const widths = page.$$("#opt-panel-have [data-share]").map((bar) => bar.style.width);
  assert.ok(widths.length >= 2 && widths.every((width) => /^\d+(\.\d+)?%$/.test(width)), widths.join(", "));
  assert.ok(
    widths.some((width) => width !== "100%"),
    "not every bar full",
  );
  assert.deepEqual(
    page.$$('#optimiser-result [class*="god-"]').map((element) => element.className),
    [],
  );
});
