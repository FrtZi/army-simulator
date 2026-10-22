// The data files are the single source of each game's facts: these tests keep them consistent with the
// game's vocabulary (data/<game>/game.json) and with the shapes described in docs/data-model.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { effectProblems, indexCatalogue } from "../src/engine/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const ids = (entries) => entries.map((entry) => entry.id);
const isCount = (value) => Number.isInteger(value) && value >= 0;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// a name we translated ourselves ends with "*" (D-08); a star anywhere else is a typo
const NAME = /^[^*]+\*?$/;
const GAME_FILES = ["game.json", "units.json", "defences.json", "combat-rules.json"];
const VOCABULARY = ["tiers", "recruitments", "attackTypes", "unitTypes", "alignments", "buildings", "troopStats"];
// each troop field, and the vocabulary list its value comes from
const UNIT_FIELDS = { tier: "tiers", attackType: "attackTypes", unitType: "unitTypes", alignment: "alignments" };
Object.assign(UNIT_FIELDS, { building: "buildings", recruitment: "recruitments" });
const DEFENCE_STATS = ["squadPower", "morale", "armour", "health"];
const ATTACK_STATS = { melee: ["meleeAttack", "meleeDamage"], ranged: ["rangedAttack", "rangedDamage"] };

const games = read("data/games.json");
const loadGame = (id) => {
  const [game, units, defences] = GAME_FILES.slice(0, 3).map((file) => read(`data/${id}/${file}`));
  return { game, units, defences, catalogue: indexCatalogue(units, defences) };
};
const hasNames = (entry) => ["fr", "en"].every((language) => NAME.test(entry.labels?.[language] ?? ""));

test("GAME-01 every game is declared once, with its names and its data files", () => {
  assert.equal(new Set(ids(games)).size, games.length);
  for (const entry of games) {
    assert.match(entry.id, KEBAB_CASE);
    assert.ok(hasNames(entry), `${entry.id}: names`);
    for (const file of GAME_FILES) assert.ok(existsSync(new URL(`../data/${entry.id}/${file}`, import.meta.url)));
  }
});

for (const { id: gameId } of games) {
  const { game, units, defences } = loadGame(gameId);
  const allowed = (list, value) => ids(game[list]).includes(value);

  test(`DATA-01 [${gameId}] the game vocabulary has no duplicate`, () => {
    for (const key of [...VOCABULARY, "armyStats", "sourceKinds"]) {
      assert.equal(new Set(ids(game[key])).size, game[key].length, `duplicate id in ${key}`);
    }
    assert.ok(game.bonusPercent.min <= game.bonusPercent.max);
  });

  test(`DATA-01 [${gameId}] every unit is complete and uses the game vocabulary`, () => {
    const required = ids(game.troopStats.filter((stat) => !stat.optional));
    assert.equal(new Set(ids(units)).size, units.length, "unit ids are unique");
    for (const unit of units) {
      assert.match(unit.id, KEBAB_CASE);
      for (const [field, list] of Object.entries(UNIT_FIELDS)) {
        assert.ok(allowed(list, unit[field]), `${unit.id}: ${field} "${unit[field]}"`);
      }
      for (const stat of required) assert.ok(stat in unit.stats, `${unit.id}: missing ${stat}`);
      for (const [stat, value] of Object.entries(unit.stats)) {
        assert.ok(allowed("troopStats", stat), `${unit.id}: unknown stat ${stat}`);
        assert.ok(isCount(value), `${unit.id}: ${stat} = ${value}`);
      }
      if (unit.attackType === "ranged") assert.ok("rangedAttack" in unit.stats && "rangedDamage" in unit.stats);
    }
  });

  test(`DATA-04 [${gameId}] every defence is complete and uses the game vocabulary`, () => {
    const all = [...ids(units), ...ids(defences)];
    assert.equal(new Set(all).size, all.length, "unit and defence ids are unique together");
    for (const defence of defences) {
      assert.match(defence.id, KEBAB_CASE);
      for (const [field, list] of Object.entries(UNIT_FIELDS).filter(([key]) => key !== "recruitment")) {
        assert.ok(allowed(list, defence[field]), `${defence.id}: ${field} "${defence[field]}"`);
      }
      assert.equal(defence.unitType, "defences", defence.id);
      for (const stat of DEFENCE_STATS) assert.ok(isCount(defence.stats[stat]), `${defence.id}: ${stat}`);
      // a defence attacks with its own type only, or not at all (a wall)
      const permitted = [...DEFENCE_STATS, ...ATTACK_STATS[defence.attackType]];
      for (const stat of Object.keys(defence.stats)) assert.ok(permitted.includes(stat), `${defence.id}: ${stat}`);
      const attack = ATTACK_STATS[defence.attackType].filter((stat) => stat in defence.stats);
      assert.ok(attack.length !== 1, `${defence.id}: attack and damage go together`);
    }
    assert.ok(
      units.every((unit) => unit.unitType !== "defences"),
      "no troop is a defence",
    );
  });

  test(`LANG-01 [${gameId}] every in-game name exists in French and in English`, () => {
    for (const entry of [...VOCABULARY.flatMap((key) => game[key]), ...units, ...defences]) {
      assert.ok(hasNames(entry), `${entry.id}: ${JSON.stringify(entry.labels)}`);
    }
  });
}

test("DATA-02 the example configuration follows the configuration format", () => {
  const example = read("examples/configuration.example.json");
  assert.equal(example.schemaVersion, 1);
  assert.ok(ids(games).includes(example.game), `unknown game "${example.game}"`);
  const { game, catalogue } = loadGame(example.game);
  assert.ok(isCount(example.limits.marchCapacity));
  for (const source of example.sources) {
    assert.ok(ids(game.sourceKinds).includes(source.kind), `unknown source kind "${source.kind}"`);
    for (const effect of source.effects) assert.deepEqual(effectProblems(effect, game, catalogue), [], effect.stat);
  }
  assert.ok(example.scenarios.length >= 1);
  for (const scenario of example.scenarios) {
    assert.match(scenario.id, KEBAB_CASE);
    for (const [unitId, count] of Object.entries(scenario.troops)) {
      assert.ok(catalogue.units.has(unitId), `${scenario.id}: "${unitId}" is not a troop (ARMY-04: no defence)`);
      assert.ok(isCount(count), `${scenario.id}: ${unitId} count`);
    }
  }
});
