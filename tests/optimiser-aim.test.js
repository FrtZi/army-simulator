// The optimiser's angle 2, an aim (SIM-12, D-41): on the published page in jsdom, with Your setup loaded, the gods,
// troop types or tiers ticked keep only the troops owned they name, the heroes following; the best army without the
// aim says what the aim costs now.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addTroops, openPage } from "./page.js";

const GAME = "chaos-conquest";
const SETUP_KEY = "army-simulator.player-setup";
const setup = {
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  // level 20: rank 4, level 5, as a setup file says it
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

function aimedPage() {
  const page = openPage({ stored: { [SETUP_KEY]: JSON.stringify({ [GAME]: setup }) } });
  page.tick("#load-setup-toggle");
  return page;
}

test("SIM-12 pro Nurgle: only your Nurgle troops play, a Nurgle hero follows, and what the aim costs now", () => {
  const page = aimedPage();
  // a god and a troop type, never a tier: small troops take the strikes first (Frantz, D-41)
  assert.deepEqual(
    page.$$("#optimiser-aim details").map((details) => details.id),
    ["optimiser-aim-alignment", "optimiser-aim-unitType"],
  );
  page.tick("#optimiser-aim-alignment-nurgle");
  assert.match(page.text("#optimiser-aim"), /Nurgle/);
  page.click("#optimiser-run");
  const result = page.text("#opt-panel-have");
  assert.match(result, /Troops: 30,000 of 50,000/);
  // one bar, Nurgle's: your 30,000 Pestigor, nothing of Khorne
  assert.match(result, /Troops kinds: 1 · Nurgle 100 % Pestigor · Nurgle 30,000 /);
  assert.match(result, /Great Unclean One level 20 · Nurgle/, "Nurgle's troops: the hero whose talents raise them");
  // without the aim, your Khorne troops fill the capacity: the best army scores more
  assert.match(result, /▼ The aim costs [\d.]+ % now: without it, the best army scores that much more\./);
  page.$("#optimiser > .fold-toggle").click();
  assert.match(page.text("#optimiser > .fold-summary"), /^✓ All-round: damage and health: 30,000 troops, .+ · aimed$/);
});

test("SIM-12 an aim none of your troops fits stops the search and says so; untick it and it runs free", () => {
  const page = aimedPage();
  page.tick("#optimiser-aim-alignment-slaanesh");
  assert.ok(page.$("#optimiser-run").disabled);
  assert.match(page.text("#optimiser-status"), /None of your troops owned fits the aim/);
  page.untick("#optimiser-aim-alignment-slaanesh");
  page.click("#optimiser-run");
  assert.doesNotMatch(page.text("#opt-panel-have"), /aim/, "no aim: nothing said about one");
});

test("SIM-12 a battle aimed: won within the aim, and the battle without it said beside", () => {
  const page = aimedPage();
  page.click("#composition-tab-1");
  addTroops(page, ["khorne-gor"]);
  page.click("#composition-tab-0");
  page.choose("#optimiser-goal", "battle");
  page.tick("#optimiser-aim-alignment-khorne");
  page.click("#optimiser-run");
  assert.match(
    page.text("#opt-panel-have"),
    /Without the aim: (✓ won|✗ lost) by [\d,]+ power|Without the aim: = a draw/,
  );
});
