// The player's setup file (CFG-05, D-27): read whole or in part, each value checked on its own, merged without
// removing anything, and written back as the game shows it. On the real game data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexCatalogue } from "../src/engine/index.js";
import { readSetupFile, writeSetupFile } from "../src/storage/setup-file.js";
import { emptySetup, mergeSetup } from "../src/storage/setup-merge.js";
import { nearestId } from "../src/storage/nearest.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const warlords = read(`data/${GAME}/warlords.json`).warlords;
const target = {
  game: read(`data/${GAME}/game.json`),
  catalogue: indexCatalogue(read(`data/${GAME}/units.json`), read(`data/${GAME}/defences.json`)),
  warlords: new Map(warlords.map((warlord) => [warlord.id, warlord])),
};
const games = { [GAME]: target };
const file = (sections) => ({ format: "army-simulator/setup", version: 1, game: GAME, ...sections });
const INFANTRY_ATTACK = { stat: "meleeAttack", percent: 12, target: { unitTypes: ["infantry"] } };
const CAVALRY_ATTACK = { stat: "meleeAttack", percent: 6, target: { unitTypes: ["cavalry"] } };

test("CFG-05 a file that is not a setup, of another version or another game, is refused whole", () => {
  assert.deepEqual(readSetupFile({ scenarios: [] }, games).problems, [{ code: "not-setup" }]);
  assert.deepEqual(readSetupFile({ ...file({}), version: 2 }, games).problems, [{ code: "version", read: 2 }]);
  assert.deepEqual(readSetupFile({ ...file({}), game: "other" }, games).problems, [{ code: "game", read: "other" }]);
});

test("CFG-05 a whole file: warlords at the game's rank and level, capacity, bonuses, the later sources kept", () => {
  const result = readSetupFile(
    file({
      warlords: [{ id: "azazel", rank: 5, level: 4 }],
      capacity: { base: 110000, bonusPercent: 35 },
      bonuses: [{ ...INFANTRY_ATTACK, source: "titles" }],
      rituals: [{ id: "defence-capacity-1", level: 10 }],
    }),
    games,
  );
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.sections, {
    warlords: [{ id: "azazel", level: 24 }],
    capacity: { base: 110000, bonusPercent: 35 },
    bonuses: [{ ...INFANTRY_ATTACK, source: "titles" }],
    rituals: [{ id: "defence-capacity-1", level: 10 }],
  });
});

test("CFG-05 each refused value says where, what was read and why; the others are kept", () => {
  const { sections, problems } = readSetupFile(
    file({
      warlords: [
        { id: "Azazael", rank: 5, level: 4 },
        { id: "skulltaker", rank: 8, level: 1 },
        { id: "karanak", rank: 2, level: 3 },
        { id: "karanak", rank: 3, level: 3 },
      ],
      capacity: { base: 110000, bonusPercent: 150 },
      bonuses: [{ stat: "marchCapacity", percent: 5 }, { stat: "squadPower", percent: 5 }, INFANTRY_ATTACK],
    }),
    games,
  );
  assert.deepEqual(sections.warlords, [{ id: "karanak", level: 8 }]);
  assert.deepEqual(sections.capacity, { base: 110000 });
  assert.deepEqual(sections.bonuses, [INFANTRY_ATTACK]);
  const where = problems.map(({ path, code, suggestion }) => [path, code, suggestion].filter(Boolean).join(" "));
  assert.deepEqual(where, [
    "warlords[0].id unknown-warlord azazel",
    "warlords[1].rank out-of-range",
    "warlords[3].id duplicate",
    "capacity.bonusPercent out-of-range",
    "bonuses[0].stat capacity-bonus",
    "bonuses[1] fixed-stat",
  ]);
  assert.equal(problems[1].read, 8);
});

test("CFG-05 a partial file holds only its sections; a section of the wrong shape is refused, not read", () => {
  const partial = readSetupFile(file({ warlords: [{ id: "azazel", rank: 1, level: 1 }] }), games);
  assert.deepEqual(Object.keys(partial.sections), ["warlords"]);
  const wrong = readSetupFile(file({ warlords: { id: "azazel" }, champion: 3 }), games);
  assert.deepEqual(wrong.sections, {});
  assert.deepEqual(
    wrong.problems.map((problem) => `${problem.path} ${problem.code}`),
    ["warlords not-list", "champion not-object"],
  );
});

test("CFG-05 merging adds, updates and keeps, never removes; a bonus is matched by its stat and troops", () => {
  const setup = {
    ...emptySetup(GAME),
    warlords: [
      { id: "azazel", level: 20 },
      { id: "karanak", level: 8 },
      { id: "slambo", level: 3 },
    ],
    capacity: { base: 100000, bonusPercent: 30 },
    bonuses: [
      { ...INFANTRY_ATTACK, percent: 10 },
      { stat: "health", percent: 8 },
    ],
  };
  const sections = {
    warlords: [
      { id: "azazel", level: 24 },
      { id: "karanak", level: 8 },
      { id: "skulltaker", level: 1 },
    ],
    capacity: { base: 110000 },
    bonuses: [INFANTRY_ATTACK, CAVALRY_ATTACK],
  };
  const { setup: merged, report } = mergeSetup(setup, sections);
  assert.deepEqual(report.warlords, { added: 1, updated: 1, unchanged: 1, kept: 1 });
  assert.deepEqual(
    merged.warlords.map((warlord) => `${warlord.id} ${warlord.level}`),
    ["azazel 24", "karanak 8", "slambo 3", "skulltaker 1"],
  );
  assert.deepEqual(merged.capacity, { base: 110000, bonusPercent: 30 });
  // the same stat for other troops is another bonus: added beside it, not written over it
  assert.deepEqual(merged.bonuses, [INFANTRY_ATTACK, { stat: "health", percent: 8 }, CAVALRY_ATTACK]);
  assert.deepEqual(report.bonuses, { added: 1, updated: 1, unchanged: 0, kept: 1 });
  assert.equal(report.rituals, undefined, "a section the file does not hold is not reported");
  assert.deepEqual(merged.rituals, []);
});

test("CFG-05 a downloaded setup reads back the same", () => {
  const setup = {
    ...emptySetup(GAME),
    warlords: [{ id: "azazel", level: 24 }],
    capacity: { base: 110000, bonusPercent: 35 },
    bonuses: [INFANTRY_ATTACK],
  };
  const written = writeSetupFile(setup, target.game);
  assert.deepEqual(written.warlords, [{ id: "azazel", rank: 5, level: 4 }]);
  const back = readSetupFile(JSON.parse(JSON.stringify(written)), games);
  assert.deepEqual(back.problems, []);
  assert.deepEqual(mergeSetup(emptySetup(GAME), back.sections).setup, setup);
});

test("CFG-05 a misread name gets the nearest id, by id or by label; a name too far gets none", () => {
  assert.equal(nearestId("Throgg, King of Trolls", warlords), "throgg-king-of-trolls");
  assert.equal(nearestId("Skulltaker", warlords), "skulltaker");
  assert.equal(nearestId("Skullhuntr", warlords), "skullhunter");
  assert.equal(nearestId("Bloodthister", warlords), "bloodthirster");
  assert.equal(nearestId("Gandalf", warlords), null);
});
