// Every block closes to one line that sums it up (FOLD-01, Frantz, 2026-11-10): on the published page in jsdom, each
// of the 18 blocks has its button and its line, the line written from the block's figures, the folding remembered.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addTroops, openPage } from "./page.js";

const FOLD_KEY = "army-simulator.folded";
const BLOCKS = [
  ...["game", "load-setup", "bonuses", "army", "heroes", "profile", "compare", "dashboards", "saves"],
  ...["setup", "setup-files", "setup-warlords", "setup-troops", "setup-champion", "setup-rituals", "setup-buildings"],
  ...["setup-capacity", "guides", "champion-level", "champion-gear", "champion-skills"],
];
const fold = (page, id) => page.$(`#${id} > .fold-toggle`).click();
const line = (page, id) => page.text(`#${id} > .fold-summary`);

test("FOLD-01 each of the 21 blocks folds from its button to one line, and opens again", () => {
  const page = openPage();
  for (const id of BLOCKS) {
    const toggle = page.$(`#${id} > .fold-toggle`);
    assert.ok(toggle, `${id} has its button`);
    assert.equal(toggle.getAttribute("aria-expanded"), "true", `${id} open at first`);
    assert.ok(page.$(`#${id} > .fold-summary`).hidden, `${id}'s line hidden while open`);
    fold(page, id);
    assert.ok(page.$(`#${id}`).classList.contains("folded"));
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.ok(line(page, id).length > 0, `${id} folds to a line`);
  }
  fold(page, "army");
  assert.ok(!page.$("#army").classList.contains("folded"), "open again");
  assert.ok(page.$("#army > .fold-summary").hidden);
});

test("FOLD-01 a line says the block's state and key figures, as the block shows them", () => {
  const page = openPage();
  addTroops(page, ["marauders"]);
  fold(page, "army");
  // the capacity's status line, then the number of troop types
  assert.equal(line(page, "army"), "✓ 1,000 troops · 49,000 free · types of troops: 1");
  fold(page, "load-setup");
  assert.equal(line(page, "load-setup"), "○ Off: free play");
  fold(page, "game");
  assert.equal(line(page, "game"), "Warhammer: Chaos & Conquest");
  fold(page, "profile");
  assert.match(line(page, "profile"), /^Power [\d,]+ · .+ [\d,]+ · .+ [\d,]+$/);
  page.click("#page-tab-setup");
  fold(page, "setup-troops");
  assert.equal(line(page, "setup-troops"), page.text('[data-tile="troops"] .tile-figure'), "the tile's figure");
  page.choose("#setup-troop-select", "marauders");
  // the line follows an edit made elsewhere: Your setup's status
  fold(page, "setup");
  assert.match(line(page, "setup"), /Nothing saved yet/);
});

test("FOLD-01 what is folded is remembered in this browser; a damaged entry leaves every block open", () => {
  const page = openPage({ stored: { [FOLD_KEY]: JSON.stringify(["game", "saves"]) } });
  assert.ok(page.$("#game").classList.contains("folded"));
  assert.equal(line(page, "game"), "Warhammer: Chaos & Conquest");
  fold(page, "game");
  assert.deepEqual(JSON.parse(page.window.localStorage.getItem(FOLD_KEY)), ["saves"]);
  const damaged = openPage({ stored: { [FOLD_KEY]: "{" } });
  assert.equal(damaged.$$(".card.folded").length, 0);
});
