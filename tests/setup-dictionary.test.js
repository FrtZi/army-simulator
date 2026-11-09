// The setup file's dictionary, schema and agent brief (CFG-06, D-27): built from the game's data, they say what the
// reader accepts, no more and no less, and the brief carries the whole dictionary. On the real game data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { GAMES, dictionaryOf } from "../src/ui/games.js";
import { readSetupFile } from "../src/storage/setup-file.js";
import { exampleFile, setupDictionary } from "../src/storage/setup-dictionary.js";
import { setupSchema } from "../src/storage/setup-schema.js";
import { agentBrief } from "../src/storage/setup-brief.js";

const game = GAMES.find((entry) => entry.id === "chaos-conquest");
const games = { [game.id]: game };
const dictionary = dictionaryOf(game);
const validate = new Ajv2020({ allErrors: true }).compile(setupSchema(dictionary));
const example = exampleFile(dictionary);
const withSection = (name, value) => ({ ...example, [name]: value });

test("CFG-06 the dictionary's example file is read without a single refusal, and is valid for the schema", () => {
  assert.deepEqual(readSetupFile(example, games).problems, []);
  assert.ok(validate(example), JSON.stringify(validate.errors));
  for (const section of ["warlords", "capacity", "bonuses", "rituals", "buildings"]) assert.ok(section in example);
});

test("CFG-06 every reading example turns the game's wording into bonuses the reader and the schema accept", () => {
  const bonuses = dictionary.readings.flatMap((reading) => reading.inFile);
  assert.deepEqual(readSetupFile(withSection("bonuses", bonuses), games).problems, []);
  assert.ok(validate(withSection("bonuses", bonuses)), JSON.stringify(validate.errors));
});

test("CFG-06 what the reader refuses, the schema refuses too", () => {
  const refused = {
    "a rank beyond the last": withSection("warlords", [{ id: "azazel", rank: 8, level: 1 }]),
    "a warlord without its rank": withSection("warlords", [{ id: "azazel", level: 1 }]),
    "an unknown warlord": withSection("warlords", [{ id: "gandalf", rank: 1, level: 1 }]),
    "a stat never raised": withSection("bonuses", [{ stat: "squadPower", percent: 5 }]),
    "the march capacity as a bonus": withSection("bonuses", [{ stat: "marchCapacity", percent: 5 }]),
    "an unknown filter": withSection("bonuses", [{ stat: "health", percent: 5, target: { colours: ["red"] } }]),
    "an unknown filter value": withSection("bonuses", [{ stat: "health", percent: 5, target: { tiers: [7] } }]),
    "a percentage over the most": withSection("capacity", { bonusPercent: 150 }),
    "another game": { ...example, game: "other" },
  };
  for (const [what, file] of Object.entries(refused)) {
    assert.notDeepEqual(readSetupFile(file, games).problems, [], `the reader accepts ${what}`);
    assert.equal(validate(file), false, `the schema accepts ${what}`);
  }
});

test("CFG-06 the value lists are the game's: every warlord, the stats a bonus may raise, every filter's values", () => {
  const ids = (name) => dictionary.valueLists[name].map((entry) => entry.id);
  assert.deepEqual(
    ids("warlords"),
    game.heroes.warlords.map((warlord) => warlord.id),
  );
  assert.deepEqual(ids("units").length, game.units.length + game.defences.length);
  for (const stat of game.game.troopStats) {
    const read = readSetupFile(withSection("bonuses", [{ stat: stat.id, percent: 5 }]), games);
    assert.equal(ids("stats").includes(stat.id), read.problems.length === 0, stat.id);
  }
  // a name we translated is given without its star, and said to be ours
  const azazel = dictionary.valueLists.warlords.find((warlord) => warlord.id === "azazel");
  assert.deepEqual(azazel.labels, { en: "Azazel", fr: "Azazel" });
  assert.deepEqual(azazel.translated, ["fr"]);
});

test("CFG-06 the brief holds the rules and the whole dictionary: every element and every allowed id", () => {
  const brief = agentBrief(game.setup.brief, dictionary);
  for (const rule of game.setup.brief.rules) assert.ok(brief.includes(rule), rule);
  for (const element of dictionary.elements) assert.ok(brief.includes(`\`${element.name}\``), element.name);
  for (const [name, entries] of Object.entries(dictionary.valueLists)) {
    for (const { id } of entries) assert.ok(brief.includes(`\`${JSON.stringify(id)}\``), `${name}: ${id}`);
  }
  assert.ok(brief.includes(JSON.stringify(example, null, 2)), "the example file");
});

test("CFG-06 an element without a definition, or a definition without a type, stops the build", () => {
  const without = (name) => ({
    ...game.setup,
    elements: game.setup.elements.filter((element) => element.name !== name),
  });
  assert.throws(
    () => setupDictionary({ ...game, warlords: game.heroes.warlords, setup: without("warlords[].rank") }),
    /warlords\[\]\.rank/,
  );
  const extra = { ...game.setup, elements: [...game.setup.elements, { name: "prestige", definition: "?" }] };
  assert.throws(() => setupDictionary({ ...game, warlords: game.heroes.warlords, setup: extra }), /prestige/);
});

test("CFG-06 the build publishes the dictionary and the schema beside the page", () => {
  const published = (name) => JSON.parse(readFileSync(new URL(`../dist/${game.id}/${name}`, import.meta.url), "utf8"));
  assert.deepEqual(published("setup-dictionary.json"), JSON.parse(JSON.stringify(dictionary)));
  assert.deepEqual(published("setup.schema.json"), setupSchema(dictionary));
});
