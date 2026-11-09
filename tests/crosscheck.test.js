// Our troops, defences and warlords against the game's data as published by cctools.cc (D-25): saved locally in
// captures/chaos-conquest/sources/, never committed, so this test is skipped where the file is absent (CI).
// Names and stats must match one for one; food upkeep differs by a constant factor (open question 13).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildWarlords, formatWarlords, readGame, savedPages } from "../scripts/import-warlords.mjs";
import { buildItems, formatItems, searchedName } from "../scripts/import-items.mjs";
import { buildChampion, formatChampion, savedChampion } from "../scripts/import-champion.mjs";
import { buildPve, formatPve, savedPve } from "../scripts/import-pve.mjs";
import { buildRituals, formatRituals, savedRituals } from "../scripts/import-rituals.mjs";
import { buildStructures, formatStructures, savedStructures } from "../scripts/import-structures.mjs";
import { buildItemSources, formatItemSources, readItems, savedAnswer } from "../scripts/import-item-sources.mjs";

const GAME = "chaos-conquest";
const reference = new URL(`../captures/${GAME}/sources/cctools-troops.json`, import.meta.url);
const read = (file) => JSON.parse(readFileSync(new URL(`../data/${GAME}/${file}`, import.meta.url), "utf8"));
// our stat → its field in the reference (squadPower is the power one troop adds: "power" there)
const FIELDS = { squadSize: "squad_size", squadPower: "power", meleeAttack: "melee_attack" };
Object.assign(FIELDS, { meleeDamage: "melee_damage", rangedAttack: "ranged_attack", rangedDamage: "ranged_damage" });
Object.assign(FIELDS, { morale: "morale", armour: "armour", health: "health", speed: "speed", load: "load" });
const FOOD_FACTOR = 6; // our upkeep, read on the unit sheets, is 6 times the reference's (open question 13)

test(
  "DATA-03 LANG-01 DEF-025 every troop and defence has the game's English name and stats",
  { skip: !existsSync(reference) },
  () => {
    const theirs = new Map(JSON.parse(readFileSync(reference, "utf8")).troops.map((troop) => [troop.name, troop]));
    const ours = [...read("units.json"), ...read("defences.json")];
    assert.equal(ours.length, theirs.size);
    const problems = ours.flatMap((unit) => {
      const twin = theirs.get(unit.labels.en);
      if (!twin) return [`${unit.id}: "${unit.labels.en}" is not a name of the game`];
      const stats = Object.entries(FIELDS)
        .filter(([stat, field]) => (unit.stats[stat] ?? 0) !== (twin[field] ?? 0))
        .map(([stat, field]) => `${unit.id}: ${stat} ${unit.stats[stat]} ≠ ${twin[field]}`);
      const food = unit.stats.foodUpkeep;
      if (food !== undefined && food !== twin.food_upkeep * FOOD_FACTOR) stats.push(`${unit.id}: food ${food}`);
      return stats;
    });
    assert.deepEqual(problems, []);
  },
);

const gearPages = new URL(`../captures/${GAME}/sources/cctools/gear/pieces/`, import.meta.url);
const warlordPages = new URL(`../captures/${GAME}/sources/cctools/warlords/`, import.meta.url);

test(
  "DATA-05 the warlords file is exactly what the import makes from the saved pages",
  { skip: !existsSync(warlordPages) },
  () => {
    const made = formatWarlords(buildWarlords(savedPages(warlordPages), readGame()));
    assert.equal(readFileSync(new URL(`../data/${GAME}/warlords.json`, import.meta.url), "utf8"), made);
  },
);

test(
  "DATA-06 the items file is exactly what the import makes from the saved pages",
  { skip: !existsSync(warlordPages) },
  () => {
    const levelled = existsSync(ritualPages) ? [...savedRituals().pages, ...savedStructures()] : [];
    const gear = existsSync(gearPages) ? savedChampion().piecePages : [];
    const made = formatItems(buildItems(savedPages(warlordPages), levelled, searchedName, gear));
    assert.equal(readFileSync(new URL(`../data/${GAME}/items.json`, import.meta.url), "utf8"), made);
  },
);

const ritualPages = new URL(`../captures/${GAME}/sources/cctools/rituals/`, import.meta.url);

test(
  "DATA-07 the rituals and structures files are exactly what the imports make from the saved pages",
  { skip: !existsSync(ritualPages) },
  () => {
    const { categories, pages } = savedRituals();
    const file = (name) => readFileSync(new URL(`../data/${GAME}/${name}`, import.meta.url), "utf8");
    assert.equal(file("rituals.json"), formatRituals(buildRituals(categories, pages, readGame())));
    assert.equal(file("structures.json"), formatStructures(buildStructures(savedStructures(), readGame())));
  },
);

const itemAnswers = new URL(`../captures/${GAME}/sources/cctools/items/`, import.meta.url);

test(
  "DATA-08 the item sources file is exactly what the import makes from the saved answers",
  { skip: !existsSync(itemAnswers) },
  () => {
    const made = formatItemSources(buildItemSources(readItems(), savedAnswer));
    assert.equal(readFileSync(new URL(`../data/${GAME}/item-sources.json`, import.meta.url), "utf8"), made);
  },
);

test(
  "DATA-09 the champion file is exactly what the import makes from the saved pages",
  { skip: !existsSync(gearPages) },
  () => {
    const { championPage, piecePages, sets } = savedChampion();
    const made = formatChampion(buildChampion(championPage, piecePages, sets, readGame()));
    assert.equal(readFileSync(new URL(`../data/${GAME}/champion.json`, import.meta.url), "utf8"), made);
  },
);

const pveAnswers = new URL(`../captures/${GAME}/sources/cctools/armies/`, import.meta.url);

test(
  "DATA-10 the PvE file is exactly what the import makes from the saved answers",
  { skip: !existsSync(pveAnswers) },
  () => {
    const { places, answers, npcTroops } = savedPve();
    const made = formatPve(buildPve(places, answers, npcTroops, readGame()));
    assert.equal(readFileSync(new URL(`../data/${GAME}/pve.json`, import.meta.url), "utf8"), made);
  },
);
