// DATA-07: the game's rituals and structures (data/<game>/rituals.json, structures.json), imported from cctools.cc
// (D-25, D-29): every figure a list of one value per level, every cost in items.json, every requirement a ritual or a
// structure that exists at that level, every bonus applied in battle a valid effect. That the files are what the
// imports make from the saved pages is checked in tests/crosscheck.test.js (local only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { effectProblems, indexCatalogue } from "../src/engine/index.js";

const GAME = "chaos-conquest";
const read = (file) => JSON.parse(readFileSync(new URL(`../data/${GAME}/${file}`, import.meta.url), "utf8"));
const game = read("game.json");
const catalogue = indexCatalogue(read("units.json"), read("defences.json"));
const items = new Set(read("items.json").items.map((item) => item.id));
const rituals = read("rituals.json");
const structures = read("structures.json");
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const known = {
  ritual: new Map(rituals.rituals.map((ritual) => [ritual.id, ritual.power.length])),
  structure: new Map(structures.structures.map((structure) => [structure.id, structure.power.length])),
};

/** What a levelled entry requires that does not exist, or at a level beyond the required one's last. */
function requirementProblems(entry, levels) {
  return Object.entries(entry.requires).flatMap(([kind, needs]) =>
    Object.entries(needs).flatMap(([id, asked]) => {
      const max = known[kind]?.get(id);
      if (max === undefined) return [`requires an unknown ${kind} ${id}`];
      if (asked.length !== levels) return [`requires ${id}: not one value per level`];
      const wrong = asked.find((level) => level !== null && (level < 1 || level > max));
      return wrong === undefined ? [] : [`requires ${id} at level ${wrong} of ${max}`];
    }),
  );
}

/** The problems of one levelled entry (a ritual or a structure): its lists, costs, requirements and bonuses. */
function problemsOf(entry, effects, other) {
  const levels = entry.power.length;
  const lists = [...Object.values(entry.costs), ...Object.values(entry.effects), ...Object.values(entry.other)];
  const unknown = (keys, set, what) => keys.filter((key) => !set.has(key)).map((key) => `${what} ${key} not listed`);
  const problems = [
    ...(KEBAB_CASE.test(entry.id) ? [] : ["id"]),
    ...(entry.labels?.en && entry.labels?.fr ? [] : ["names"]),
    ...(lists.every((values) => values.length === levels) ? [] : ["a list not one value per level"]),
    ...unknown(Object.keys(entry.costs), items, "cost in"),
    ...unknown(Object.keys(entry.effects), effects, "effect"),
    ...unknown(Object.keys(entry.other), other, "bonus"),
    ...requirementProblems(entry, levels),
  ];
  return problems.map((problem) => `${entry.id}: ${problem}`);
}

for (const [name, file, entries] of [
  ["rituals", rituals, rituals.rituals],
  ["structures", structures, structures.structures],
]) {
  test(`DATA-07 the ${name}: complete level by level, their costs, requirements and bonuses known`, () => {
    assert.ok(entries.length > 0);
    assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length, "an id once");
    const effects = new Map(file.effects.map((effect) => [effect.id, effect]));
    const other = new Set(file.other.map((bonus) => bonus.id));
    assert.deepEqual(
      entries.flatMap((entry) => problemsOf(entry, effects, other)),
      [],
    );
    // a bonus applied in battle is an effect the engine accepts (any percentage in range)
    for (const effect of file.effects) {
      const { stat, target } = effect;
      assert.deepEqual(effectProblems({ stat, percent: 1, target }, game, catalogue), [], effect.id);
    }
  });
}

test("DATA-07 every ritual in a category of the file; game.json's buildings among the structures, with their names", () => {
  const categories = new Set(rituals.categories.map((category) => category.id));
  assert.deepEqual(
    rituals.rituals.filter((ritual) => !categories.has(ritual.category)).map((ritual) => ritual.id),
    [],
  );
  for (const building of game.buildings) {
    const structure = structures.structures.find((entry) => entry.id === building.id);
    assert.ok(structure, `${building.id} is not a structure`);
    assert.deepEqual(structure.labels, building.labels, `${building.id}: the names read in the game are kept`);
  }
});

test("DATA-08 where each item drops: a known item, a known place, a level, and how many on average", () => {
  const sources = read("item-sources.json");
  const places = new Set(sources.places.map((place) => place.id));
  assert.equal(places.size, sources.places.length, "a place listed once");
  for (const place of sources.places) {
    assert.ok(["army", "raid", "foe", "resource"].includes(place.kind), place.id);
    assert.ok(place.labels.en && place.labels.fr, place.id);
  }
  const problems = Object.entries(sources.items).flatMap(([item, drops]) => [
    ...(items.has(item) ? [] : [`${item} is not in items.json`]),
    ...drops
      .filter((drop) => !places.has(drop.place) || !Number.isInteger(drop.level) || Object.keys(drop).length < 3)
      .map((drop) => `${item}: ${JSON.stringify(drop)}`),
  ]);
  assert.deepEqual(problems, []);
});

test("DATA-09 the champion and its gear: every list one value per level, costs in items.json, sets of known pieces", () => {
  const { champion, pieces, sets, effects, other } = read("champion.json");
  const levels = champion.power.length;
  const lists = [
    champion.tier,
    champion.xp,
    champion.skillPoints,
    ...Object.values(champion.stats),
    ...Object.values(champion.other),
  ];
  assert.ok(
    lists.every((values) => values.length === levels),
    "the champion: one value per level",
  );
  const bonuses = new Set([...effects, ...other].map((bonus) => bonus.id));
  const ids = new Set(pieces.map((piece) => piece.id));
  const problems = pieces.flatMap((piece) => {
    const all = [...Object.values(piece.effects), ...Object.values(piece.other), ...Object.values(piece.costs)];
    const size = all[0]?.length;
    return [
      ...(all.every((values) => values.length === size) ? [] : [`${piece.id}: lists of different lengths`]),
      ...Object.keys(piece.costs)
        .filter((item) => !items.has(item))
        .map((item) => `${piece.id}: ${item}`),
      ...[...Object.keys(piece.effects), ...Object.keys(piece.other)]
        .filter((id) => !bonuses.has(id))
        .map((id) => `${piece.id}: ${id}`),
      ...Object.keys(piece.requires.structure ?? {})
        .filter((id) => !known.structure.has(id))
        .map((id) => `${piece.id}: needs ${id}`),
    ];
  });
  assert.deepEqual(problems, []);
  for (const set of sets) {
    assert.deepEqual(
      set.pieces.filter((id) => !ids.has(id)),
      [],
      set.id,
    );
  }
});
