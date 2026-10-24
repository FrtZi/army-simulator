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
    warlords: new Map(read(`data/${GAME}/warlords.json`).warlords.map((warlord) => [warlord.id, warlord])),
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
  assert.deepEqual(written.scenarios[0].heroes, example.scenarios[0].heroes);
  assert.deepEqual(written.scenarios[0].talents, example.scenarios[0].talents);
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

test("CFG-02 DEF-014 a file laid out wrongly is refused, never thrown on", () => {
  const base = { schemaVersion: 1, game: GAME, limits: { marchCapacity: 1 } };
  const shapes = [
    { sources: {} },
    { sources: [{ effects: [null] }] },
    { sources: [{ effects: [{ stat: "armour", percent: 5, target: { tiers: "6" } }] }] },
    { scenarios: [5] },
    { scenarios: [{ troops: [] }] },
  ];
  for (const shape of shapes) {
    assert.deepEqual(fromConfiguration({ ...base, ...shape }, games), { problems: [{ code: "shape" }] });
  }
});

test("CFG-02 DEF-017 capacity bonuses add up, and their sum keeps to 0–100 %", () => {
  const capacity = (percent) => ({ stat: "marchCapacity", percent });
  const file = (...effects) => ({ ...example, sources: [{ kind: "manual", effects }] });
  assert.equal(fromConfiguration(file(capacity(30), capacity(20)), games).setup.capacityBonus, 50);
  const { problems } = fromConfiguration(file(capacity(60), capacity(60)), games);
  assert.deepEqual(problems, [{ code: "percent-out-of-range", percent: 120, min: 0, max: 100 }]);
});

test("CFG-02 a version 1 file still loads: its compositions get no heroes (migrate.js)", () => {
  const version1 = (scenario) =>
    Object.fromEntries(Object.entries(scenario).filter(([key]) => !["heroes", "talents"].includes(key)));
  const old = { ...example, schemaVersion: 1, scenarios: example.scenarios.map(version1) };
  const { setup, problems } = fromConfiguration(old, games);
  assert.equal(problems, undefined);
  assert.deepEqual(
    setup.compositions.map(({ heroes, talents }) => [heroes, talents]),
    [
      [[], []],
      [[], []],
    ],
  );
});

test("CFG-02 heroes and talents against the rules are refused, with the reasons (D-26)", () => {
  const scenario = (heroes, talents = []) => ({ ...example, scenarios: [{ id: "x", troops: {}, heroes, talents }] });
  const codes = (configuration) => fromConfiguration(configuration, games).problems?.map((problem) => problem.code);
  const four = ["azazel", "karanak", "sigvald-the-magnificent", "throgg-king-of-trolls"].map((id) => ({
    id,
    level: 35,
  }));
  assert.deepEqual(codes(scenario(four)), ["too-many-heroes"]);
  assert.deepEqual(codes(scenario([{ id: "azazel", level: 36 }])), ["hero-level"]);
  assert.deepEqual(codes(scenario([{ id: "azazel", level: 35 }], ["march-combat"])), ["talent-not-offered"]);
  assert.deepEqual(codes(scenario([{ id: 7 }])), ["shape"]);
  assert.deepEqual(fromConfiguration(example, games).setup.compositions[0].heroes, [{ id: "azazel", level: 35 }]);
});
