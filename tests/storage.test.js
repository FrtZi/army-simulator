// Saving and reading setups (CFG-01, CFG-02, REL-01), on the real game data and the example configuration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexCatalogue } from "../src/engine/index.js";
import { fromConfiguration, toConfiguration } from "../src/storage/configuration.js";
import { deleteSetup, saveSetup, savedSetups } from "../src/storage/browser.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const games = {
  [GAME]: {
    game: read(`data/${GAME}/game.json`),
    catalogue: indexCatalogue(read(`data/${GAME}/units.json`), read(`data/${GAME}/defences.json`)),
  },
};
const example = read("examples/configuration.example.json");

/** A storage like the browser's, in memory; `blocked` makes every write fail, as in a private window. */
function memoryStorage({ blocked = false } = {}) {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem(key, value) {
      if (blocked) throw new Error("blocked");
      items.set(key, value);
    },
  };
}

test("REL-01 the example configuration reads into a setup, and writes back identical", () => {
  const { setup, problems } = fromConfiguration(example, games);
  assert.equal(problems, undefined);
  assert.equal(setup.marchCapacity, 50000);
  assert.equal(setup.capacityBonus, 10);
  assert.equal(setup.compositions.length, 2);
  const written = toConfiguration(setup, example.name);
  assert.deepEqual(fromConfiguration(written, games).setup, setup);
  assert.deepEqual(written.scenarios[0].troops, example.scenarios[0].troops);
});

test("CFG-02 a file the game cannot use is refused, with the reasons", () => {
  const codes = (configuration) => fromConfiguration(configuration, games).problems.map((problem) => problem.code);
  assert.deepEqual(codes({ ...example, schemaVersion: 99 }), ["version"]);
  assert.deepEqual(codes({ ...example, game: "chess" }), ["game"]);
  assert.deepEqual(codes({ ...example, scenarios: [{ name: "x", troops: { "not-a-troop": 1 } }] }), ["unknown-troop"]);
  assert.deepEqual(codes({ ...example, scenarios: [{ name: "x", troops: { "razor-walls": 1 } }] }), ["unknown-troop"]);
  const fixedStat = { ...example, sources: [{ kind: "manual", effects: [{ stat: "squadPower", percent: 5 }] }] };
  assert.deepEqual(codes(fixedStat), ["fixed-stat"]);
  assert.deepEqual(codes({ ...example, limits: { marchCapacity: -1 } }), ["capacity"]);
  assert.deepEqual(codes(null), ["version"]);
});

test("CFG-01 setups are saved in the browser by name, newest first, replaced and deleted", () => {
  const storage = memoryStorage();
  assert.deepEqual(savedSetups(storage), []);
  assert.ok(saveSetup(storage, { ...example, name: "Raid" }, new Date("2026-10-22T10:00:00Z")));
  assert.ok(saveSetup(storage, { ...example, name: "Defence" }, new Date("2026-10-22T11:00:00Z")));
  assert.ok(saveSetup(storage, { ...example, name: "Raid" }, new Date("2026-10-22T12:00:00Z")));
  assert.deepEqual(
    savedSetups(storage).map((save) => [save.name, save.savedAt]),
    [
      ["Raid", "2026-10-22T12:00:00.000Z"],
      ["Defence", "2026-10-22T11:00:00.000Z"],
    ],
  );
  deleteSetup(storage, "Raid");
  assert.deepEqual(
    savedSetups(storage).map((save) => save.name),
    ["Defence"],
  );
});

test("CFG-01 blocked storage: saving reports it, reading finds nothing, nothing throws", () => {
  const storage = memoryStorage({ blocked: true });
  assert.equal(saveSetup(storage, example), false);
  assert.deepEqual(savedSetups({ getItem: () => "not json" }), []);
});
