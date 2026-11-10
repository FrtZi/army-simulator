// The map to reach a ritual (GUIDE-07): the prerequisites followed back to the roots (engine), and on the published
// page the category's tree with each ritual's state from the saved setup, the way lit, the steps left in order.
// Figures from data/chaos-conquest/rituals.json: the Military tree as the game draws it (Frantz's screenshots).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { depthsOf, prerequisitesOf } from "../src/engine/index.js";
import { openPage } from "./page.js";

const { rituals } = JSON.parse(readFileSync(new URL("../data/chaos-conquest/rituals.json", import.meta.url), "utf8"));
const military = rituals.filter((ritual) => ritual.category === "military");
const textOf = (element) => element.textContent.replace(/\s+/g, " ").trim();

test("GUIDE-07 a ritual's prerequisites back to the roots, each at the highest level asked; depths as the game's tree", () => {
  // The Great Invasion ← Chimera ← Mutalith Vortex Beasts ← Gorebeast Chariot ← Feel No Pain 6 and Hardened Resolve 6 …
  const needed = prerequisitesOf(rituals, "the-great-invasion", 1);
  assert.equal(needed.get("unlock-chimerae"), 1);
  assert.equal(needed.get("feel-no-pain"), 6);
  assert.equal(needed.get("daemonic-weapons"), 3, "Chaos Armour asks it at 3");
  assert.equal(needed.get("scouting"), 3, "the highest asked: 1 by the trainers, 3 by Daemonic Weapons");
  assert.ok(!needed.has("unlock-forsaken"), "not on the way");
  const depths = depthsOf(military);
  assert.equal(depths.get("scouting"), 0);
  assert.equal(depths.get("infantry-training-speed"), 1);
  assert.ok(depths.get("the-great-invasion") > depths.get("unlock-chimerae"));
});

const SAVED = JSON.stringify({
  "chaos-conquest": {
    format: "army-simulator/setup",
    version: 1,
    game: "chaos-conquest",
    rituals: [
      { id: "scouting", level: 10 },
      { id: "infantry-training-speed", level: 3 },
      { id: "daemonic-weapons", level: 2 },
    ],
  },
});

function openRitual(id) {
  const page = openPage({ stored: { "army-simulator.player-setup": SAVED } });
  page.click("#page-tab-guides");
  page.click("#guide-tab-rituals");
  page.click(`#guide-rituals-${id}`);
  return page;
}
const node = (page, id) => page.$(`.map [data-guide-entry="${id}"]`);

test("GUIDE-07 the map: the category's tree, each ritual's state from the setup, the way lit, the steps in order", () => {
  const page = openRitual("the-great-invasion");
  assert.equal(page.$$(".map .map-node").length, military.length, "the whole Military tree");
  assert.ok(node(page, "scouting").classList.contains("done"), "at its top: 10 of 10");
  assert.match(node(page, "scouting").getAttribute("aria-label"), /Scouting: at its top level/);
  assert.ok(node(page, "daemonic-weapons").classList.contains("partial"));
  assert.equal(textOf(node(page, "daemonic-weapons").querySelector(".map-state")), "◑ 2/10");
  assert.ok(node(page, "unlock-forsaken").classList.contains("open"), "its need, Harsh Task Master, is met");
  assert.ok(node(page, "unlock-chimerae").classList.contains("locked"));
  assert.ok(node(page, "unlock-chimerae").classList.contains("on-path"));
  assert.ok(!node(page, "unlock-forsaken").classList.contains("on-path"), "not on the way");
  const steps = page.$$(".map-steps li").map(textOf);
  assert.equal(steps[0], "Beast Lord from 0 to 1", "the shallowest first");
  assert.ok(steps.includes("Daemonic Weapons from 2 to 3"));
  assert.ok(steps.includes("Feel No Pain from 0 to 6"));
  assert.equal(steps.at(-1), "The Great Invasion from 0 to 1");
});

test("GUIDE-07 a node and a step open their ritual", () => {
  const page = openRitual("the-great-invasion");
  node(page, "unlock-chimerae").click();
  assert.equal(page.text("#guide-rituals-title"), "Unleash Chimera");
  page.$('.map-steps [data-guide-entry="feel-no-pain"]').click();
  assert.equal(page.text("#guide-rituals-title"), "Feel No Pain");
});
