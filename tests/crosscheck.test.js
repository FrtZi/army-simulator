// Our troops and defences against the game's data as published by cctools.cc (D-25): saved locally in
// captures/chaos-conquest/sources/, never committed, so this test is skipped where the file is absent (CI).
// Names and stats must match one for one; food upkeep differs by a constant factor (open question 13).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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
