// SIM-07, the full control (D-10). It needs the control figures, which stay on the author's computer
// (captures/<game>/sources/reference.json): without them,
// as in the CI, the test is skipped. The shared formulas are also checked on every run in battle.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { damagePerTroop, healthPerTroop } from "../src/engine/index.js";

const GAME = "chaos-conquest";
const reference = new URL(`../captures/${GAME}/sources/reference.json`, import.meta.url);
const model = JSON.parse(readFileSync(new URL(`../data/${GAME}/combat-rules.json`, import.meta.url), "utf8")).model;
const near = (actual, expected) => Math.abs(actual - (expected ?? 0)) < 1e-6;

test(
  "SIM-07 every troop of the control figures: same damage and health per troop",
  { skip: !existsSync(reference) },
  (t) => {
    const { rows } = JSON.parse(readFileSync(reference, "utf8"));
    const mismatches = rows.filter((row) => {
      const stats = {
        meleeAttack: row["MELEE ATTACK"],
        meleeDamage: row["MELEE DAMAGE"],
        rangedAttack: row["RANGE ATTACK"],
        rangedDamage: row["RANGE DAMAGE"],
        armour: row.ARMOUR,
        health: row.HEALTH,
      };
      return !(
        near(damagePerTroop(stats, "melee", model), row["BASE M DPU"]) &&
        near(damagePerTroop(stats, "ranged", model), row["BASE R DPU"]) &&
        near(healthPerTroop(stats, model), row["BASE EHPU"])
      );
    });
    t.diagnostic(`${rows.length} troops compared, ${mismatches.length} differ`);
    assert.deepEqual(
      mismatches.map((row) => row["TROOP NAME"]),
      [],
    );
  },
);
