// DATA-05: the game's warlords (data/<game>/warlords.json), imported from cctools.cc (D-25, D-26): complete at
// each of their 35 levels, on the game's vocabulary, and every talent a bonus the engine can apply or a code
// named by hand. That the file is what the import makes from the saved pages is checked in
// tests/crosscheck.test.js (local only: the pages are never committed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { effectProblems, indexCatalogue } from "../src/engine/index.js";

const GAME = "chaos-conquest";
const read = (file) => JSON.parse(readFileSync(new URL(`../data/${GAME}/${file}`, import.meta.url), "utf8"));
const game = read("game.json");
const { talents, warlords } = read("warlords.json");
const catalogue = indexCatalogue(read("units.json"), read("defences.json"));
const ids = (list) => list.map((entry) => entry.id);
const LEVELS = 35;
const WARLORDS = 33;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const rising = (values) => values.every((value, index) => index === 0 || value >= values[index - 1]);
const isLevelList = (values) => Array.isArray(values) && values.length === LEVELS;

test("DATA-05 the game's 33 warlords, each complete at its 35 levels, on the game's vocabulary", () => {
  assert.equal(warlords.length, WARLORDS);
  assert.equal(new Set(ids(warlords)).size, WARLORDS, "unique ids");
  const stats = ids(game.troopStats);
  for (const warlord of warlords) {
    const name = warlord.id;
    assert.match(name, KEBAB_CASE);
    assert.ok(warlord.labels.en && warlord.labels.fr === `${warlord.labels.en}*`, `${name}: labels (D-08)`);
    assert.ok(ids(game.alignments).includes(warlord.alignment), `${name}: alignment`);
    assert.ok(ids(game.rarities).includes(warlord.rarity), `${name}: rarity`);
    assert.ok(
      isLevelList(warlord.tier) && warlord.tier.every((tier) => ids(game.tiers).includes(tier)),
      `${name}: tier`,
    );
    assert.ok(rising(warlord.tier), `${name}: a tier never falls as the level rises`);
    assert.ok(
      isLevelList(warlord.power) && warlord.power.every((power) => power > 0) && rising(warlord.power),
      `${name}: power`,
    );
    for (const [stat, values] of Object.entries(warlord.stats)) {
      assert.ok(stats.includes(stat), `${name}: unknown stat ${stat}`);
      assert.ok(
        isLevelList(values) && values.every((value) => Number.isFinite(value) && value >= 0),
        `${name}: ${stat}`,
      );
    }
  }
});

test("DATA-05 every talent is a bonus the engine can apply, or a code named by hand", () => {
  const named = game.talentCodes;
  assert.equal(new Set([...ids(talents), ...ids(named)]).size, talents.length + named.length, "unique talent ids");
  for (const talent of talents) {
    const effect = { stat: talent.stat, percent: 1, ...(talent.target && { target: talent.target }) };
    assert.deepEqual(effectProblems(effect, game, catalogue), [], talent.id);
  }
  for (const entry of named) {
    assert.ok(
      entry.stat ? ids(game.armyStats).includes(entry.stat) : entry.context && entry.labels?.fr && entry.labels?.en,
      entry.id,
    );
  }
});

// A debuff lowers the enemy: its values are negative (Gutrot Spume's Enemy Attack Debuff, −0.9 % to −37 %), so a
// talent is checked on its size; assuming every talent positive was a mistake of ours (DEF-027).
test("DATA-05 a warlord's talents: unlocked at a level, kept and never weaker above it, at most 100 %", () => {
  const known = new Set([...ids(talents), ...ids(game.talentCodes)]);
  const { max } = game.bonusPercent;
  for (const warlord of warlords) {
    for (const [id, values] of Object.entries(warlord.talents)) {
      const where = `${warlord.id}: ${id}`;
      assert.ok(known.has(id), `${where}: unknown talent`);
      assert.ok(isLevelList(values), `${where}: 35 levels`);
      const unlocked = values.slice(values.findIndex((value) => value !== null));
      const sign = Math.sign(unlocked[0]);
      assert.ok(
        unlocked.every((value) => value !== null && Math.sign(value) === sign && Math.abs(value) <= max),
        `${where}: kept once unlocked, one sign, at most 100 %`,
      );
      assert.ok(sign !== 0 && rising(unlocked.map(Math.abs)), `${where}: never weaker as the level rises`);
    }
  }
});
