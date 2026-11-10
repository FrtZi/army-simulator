// Several copies of a building (BL-27, D-33): the game's most copies (Frantz, 2026-11-10: 5 Dungeons, Training
// Grounds and Bestiaries, one of the others), copies read and checked in a setup file, each copy's bonus counting,
// and the copies typed in Your setup. Figures from data/chaos-conquest/structures.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveSources } from "../src/engine/index.js";
import { readSetupFile } from "../src/storage/setup-file.js";
import { eachCopy, highestCopy, mostCopies } from "../src/storage/setup-buildings.js";
import { openPage } from "./page.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const game = read(`data/${GAME}/game.json`);
const structures = read(`data/${GAME}/structures.json`);
const games = { [GAME]: { game, structures, warlords: new Map() } };
const file = (buildings) => ({ format: "army-simulator/setup", version: 1, game: GAME, buildings });

test("BONUS-07 the game's most copies: 5 of each troop producer but the Herdstone, the Chaotic Rift and the walls", () => {
  assert.deepEqual(
    [
      "dungeon",
      "training-ground",
      "bestiary",
      "beastmen-herdstone",
      "chaos-rift",
      "fortress-walls",
      "temple-of-khorne",
    ].map((id) => mostCopies(game, id)),
    [5, 5, 5, 1, 1, 1, 1],
  );
});

test("BONUS-07 a setup file's building copies: kept in order, refused beyond the game's most or out of range", () => {
  const kept = readSetupFile(file([{ id: "training-ground", level: 22, copies: [21, 13] }]), games);
  assert.deepEqual(kept.sections.buildings, [{ id: "training-ground", level: 22, copies: [21, 13] }]);
  const tooMany = readSetupFile(file([{ id: "fortress-walls", level: 20, copies: [3] }]), games);
  assert.deepEqual(tooMany.problems, [{ path: "buildings[0].copies", read: [3], code: "too-many-copies", max: 1 }]);
  const beyond = readSetupFile(file([{ id: "bestiary", level: 2, copies: [1, 1, 1, 1, 1] }]), games);
  assert.equal(beyond.problems[0].code, "too-many-copies", "5 in all: the first and 4 more");
  const range = readSetupFile(file([{ id: "dungeon", level: 2, copies: [0, 41] }]), games);
  assert.deepEqual(
    range.problems.map((problem) => problem.path),
    ["buildings[0].copies[0]", "buildings[0].copies[1]"],
  );
});

test("BONUS-07 each copy of a building gives its own bonus in battle (D-33)", () => {
  const trainingGround = structures.structures.find((building) => building.id === "training-ground");
  const atTen = trainingGround.effects["infantry-armour"][9];
  const effects = resolveSources([
    {
      kind: "building",
      catalogue: { effects: structures.effects, entries: structures.structures },
      levels: eachCopy([{ id: "training-ground", level: 10, copies: [10, 10] }]),
    },
  ]);
  assert.deepEqual(
    effects.map((effect) => effect.percent),
    [atTen, atTen, atTen],
  );
  assert.equal(highestCopy({ id: "dungeon", level: 4, copies: [9, 2] }), 9);
});

test("BONUS-07 Your setup: a field per other copy for the Training Ground, usable once its first level is typed", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  const copy = (n) => page.$(`#setup-building-training-ground-copy-${n}`);
  assert.equal(page.$$('[data-setup-copy="training-ground"]').length, 4, "5 in all");
  assert.equal(page.$$('[data-setup-copy="fortress-walls"]').length, 0, "one only");
  assert.ok(copy(2).disabled, "no first copy yet");
  page.type("#setup-building-training-ground", 22);
  assert.ok(!copy(2).disabled);
  page.type("#setup-building-training-ground-copy-2", 21);
  page.type("#setup-building-training-ground-copy-3", 13);
  page.click("#setup-save");
  const saved = JSON.parse(page.window.localStorage.getItem("army-simulator.player-setup"))[GAME];
  assert.deepEqual(saved.buildings, [{ id: "training-ground", level: 22, copies: [21, 13] }]);
  page.type("#setup-building-training-ground-copy-2", "");
  page.click("#setup-save");
  const after = JSON.parse(page.window.localStorage.getItem("army-simulator.player-setup"))[GAME];
  assert.deepEqual(after.buildings, [{ id: "training-ground", level: 22, copies: [13] }], "an empty copy taken out");
});
