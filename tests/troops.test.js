// The troops owned (CFG-08, D-34): read and checked in a setup file, merged by id, a misread name parked with its
// list; typed in Your setup; in the Battle lab, with the setup loaded, each line says what is owned and a count above
// it is warned, never capped (Frantz, 2026-11-10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexCatalogue } from "../src/engine/index.js";
import { readSetupFile } from "../src/storage/setup-file.js";
import { emptySetup, mergeSetup } from "../src/storage/setup-merge.js";
import { parkedChoice } from "../src/storage/setup-parked.js";
import { addTroops, openPage } from "./page.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const target = {
  game: read(`data/${GAME}/game.json`),
  catalogue: indexCatalogue(read(`data/${GAME}/units.json`), read(`data/${GAME}/defences.json`)),
  warlords: new Map(),
};
const games = { [GAME]: target };
const file = (troops) => ({ format: "army-simulator/setup", version: 1, game: GAME, troops });
const SETUP_KEY = "army-simulator.player-setup";

test("CFG-08 a setup file's troops: kept by id, a misread name parked with its list, a second listing or a bad count refused", () => {
  const result = readSetupFile(
    file([
      { id: "marauders", count: 9801 },
      { id: "maraudrs", count: 5 },
      { id: "marauders", count: 1 },
      { id: "pestigor", count: -3 },
    ]),
    games,
  );
  assert.deepEqual(result.sections.troops, [{ id: "marauders", count: 9801 }]);
  assert.deepEqual(
    result.problems.map((problem) => problem.code),
    ["unknown-troop", "duplicate-troop", "out-of-range"],
  );
  const parked = parkedChoice(result.problems[0], target);
  assert.equal(parked.suggestion, "marauders", "the nearest troop chosen");
  assert.ok(
    parked.entries.some((entry) => entry.id === "degraded-mortar"),
    "the defences listed too",
  );
  const { setup, report } = mergeSetup(
    { ...emptySetup(GAME), troops: [{ id: "marauders", count: 10 }] },
    {
      troops: [
        { id: "marauders", count: 9801 },
        { id: "pestigor", count: 64336 },
      ],
    },
  );
  assert.deepEqual(setup.troops, [
    { id: "marauders", count: 9801 },
    { id: "pestigor", count: 64336 },
  ]);
  assert.deepEqual(report.troops, { added: 1, updated: 1, unchanged: 0, kept: 0 });
});

test("CFG-08 Your setup: a troop added and its number typed, saved as the file says, shown on its tile", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  assert.ok(!page.$("#setup-troop-none").hidden, "nothing listed yet");
  page.choose("#setup-troop-select", "marauders");
  page.click("#setup-troop-add");
  page.type("#setup-troop-marauders", 9801);
  assert.equal(page.text('[data-tile="troops"] .tile-figure'), "Listed: 1 · in all: 9,801");
  page.click("#setup-save");
  const saved = JSON.parse(page.window.localStorage.getItem(SETUP_KEY))[GAME];
  assert.deepEqual(saved.troops, [{ id: "marauders", count: 9801 }]);
  page.click("#setup-troop-remove-marauders");
  assert.equal(page.$$("#setup-troop-list li").length, 0);
});

test("CFG-08 D-34 the lab says what is owned of each troop and warns above it, never capping the count", () => {
  const saved = JSON.stringify({
    [GAME]: { format: "army-simulator/setup", version: 1, game: GAME, troops: [{ id: "marauders", count: 9801 }] },
  });
  const page = openPage({ stored: { [SETUP_KEY]: saved } });
  addTroops(page, ["marauders", "pestigor"]);
  assert.equal(page.text("#owned-marauders"), "", "the setup not loaded: nothing said");
  page.tick("#load-setup-toggle");
  assert.equal(page.text("#owned-marauders"), "✓ You own 9,801");
  page.type("#count-marauders", 12000);
  assert.equal(page.text("#owned-marauders"), "⚠ 2,199 more than the 9,801 you own");
  assert.equal(page.$("#count-marauders").value, "12000", "warned, not capped");
  assert.match(page.text("#owned-pestigor"), /more than the 0 you own/, "a troop not owned at all");
  assert.match(page.text("#load-setup-status"), /the troops you own \(1 listed\)/);
});
