// The game's screens over cctools.cc's structures (D-50): each troop building's bonus on the troops it produces
// (Frantz, 2026-11-17), the Keep's and the Conclave's march places, a cell corrected; structures.json carries them,
// and the path counts a building's places. In Node on the real game data, then on the published page in jsdom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appliesTo, placesOf, resolveSources } from "../src/engine/index.js";
import { eachCopy } from "../src/storage/setup-buildings.js";
import { openPage } from "./page.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${path}`, import.meta.url), "utf8"));
const structures = read("structures.json");
const screens = read("structures-screens.json");
const units = read("units.json");
const unit = (name) => units.find((entry) => entry.labels.en === name);
const entryOf = (id) => structures.structures.find((entry) => entry.id === id);

/** The armour bonus a troop gets from these buildings, in percent. */
function armourFrom(buildings, troop) {
  const catalogue = { effects: structures.effects, entries: structures.structures };
  return resolveSources([{ kind: "building", catalogue, levels: eachCopy(buildings) }])
    .filter((effect) => effect.stat === "armour" && appliesTo(effect, troop))
    .reduce((sum, effect) => sum + effect.percent, 0);
}

test("DATA-07 BONUS-07 DEF-055 a troop building's bonus goes to the troops it produces, whatever their type", () => {
  const buildings = [
    { id: "dungeon", level: 10 },
    { id: "bestiary", level: 22 },
  ];
  // the Bile Trolls are monstrous infantry from the Dungeon: its 2 %, not the Bestiary's 6 %
  assert.equal(armourFrom(buildings, unit("Bile Trolls of Chaos")), 2);
  // the Chimera, a monster from the Bestiary: the Bestiary's
  assert.equal(armourFrom(buildings, unit("Chimera")), 6);
  // the Pestigor come from the Herdstone: neither
  assert.equal(armourFrom(buildings, unit("Pestigor")), 0);
});

test("DATA-07 DEF-056 structures.json carries the game's screens: places, marches, the cell corrected", () => {
  for (const [id, places] of Object.entries(screens.places)) {
    assert.deepEqual(entryOf(id).places, places, id);
    assert.equal(entryOf(id).effects["march-capacity"], undefined, `${id}: places, not a percent`);
  }
  for (const [id, marches] of Object.entries(screens.marches)) {
    assert.deepEqual(entryOf(id).other["march-maximum"], marches);
  }
  for (const id of screens.producedTroops) {
    const targets = Object.keys(entryOf(id).effects).map(
      (effect) => structures.effects.find((e) => e.id === effect).target,
    );
    assert.deepEqual(targets, [{ buildings: [id] }], id);
  }
  // the Keep and the Conclave at 20: 85,000 and 40,000 places; the Bestiary at 19, 4.5 % as its screen shows
  assert.equal(
    placesOf(
      [
        { id: "chaos-keep", level: 20 },
        { id: "warlord-conclave", level: 20 },
      ],
      structures.structures,
    ),
    125000,
  );
  assert.equal(entryOf("bestiary").effects["bestiary-troops-armour"][18], 4.5);
});

test("SIM-12 DEF-056 on the page: the Conclave one level up in the path, worth the places it gives", () => {
  const setup = {
    format: "army-simulator/setup",
    version: 1,
    game: "chaos-conquest",
    capacity: { base: 50000 },
    troops: [{ id: "khorngor", count: 80000 }],
    // the Conclave's level 16 asks the Sawbones at 16
    buildings: [
      { id: "warlord-conclave", level: 15 },
      { id: "sawbones", level: 16 },
    ],
  };
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ "chaos-conquest": setup }) } });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  const steps = page.$$("#optimiser-path li").map((step) => step.textContent);
  // 25,000 places at 15, 27,500 at 16: 2,500 more Khorngor on 50,000, some 5 %
  const conclave = steps.find((step) => step.startsWith("Warlord Conclave: level 15 → 16"));
  const [, gain] = (conclave ?? steps.join("\n")).match(/▲ \+([\d.]+) %/) ?? [];
  assert.ok(Number(gain) >= 4.5 && Number(gain) <= 5.5, conclave ?? steps.join("\n"));
});
