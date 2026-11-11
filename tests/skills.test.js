// The champion's two skill trees (BL-30): the conquest tree from cctools.cc, the champion tree from Frantz's screenshots
// (2026-11-11), both named in French as the game does; each skill's prerequisites in its own tree; the points by level.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const { trees } = read("champion-skills.json");
const { champion } = read("champion.json");

test("BONUS-09 the two skill trees: 26 conquest skills, 52 champion skills, each asking only skills of its tree", () => {
  const [conquest, own] = trees;
  assert.deepEqual(
    trees.map((tree) => [tree.id, tree.skills.length, tree.points]),
    [
      ["conquest", 26, "monsterSkillPoints"],
      ["champion", 52, "skillPoints"],
    ],
  );
  for (const tree of trees) {
    const ids = new Set(tree.skills.map((skill) => skill.id));
    for (const skill of tree.skills) {
      for (const need of Object.keys(skill.requires)) assert.ok(ids.has(need), `${tree.id}: ${skill.id} asks ${need}`);
    }
  }
  // the game's names (Frantz's screenshots): no conquest skill left in English
  assert.deepEqual(
    conquest.skills.filter((skill) => skill.labels.fr.endsWith("*")).map((skill) => skill.id),
    [],
  );
  assert.equal(conquest.skills.find((skill) => skill.id === "gloat-1").labels.fr, "Jubiler I");
  // the screen hangs Bane of the Undead under Bane of the Dwarfs II, not cctools.cc's Bane of the Empire II
  assert.deepEqual(conquest.skills.find((skill) => skill.id === "bane-of-the-undead-1").requires, {
    "bane-of-the-dwarfs-2": 3,
  });
  assert.equal(own.skills.find((skill) => skill.id === "production-de-fer-iii")?.max ?? own.skills.at(-1).max, 50);
});

test("BONUS-09 the champion's points by level, one pool per tree: 560 and 237 at level 85", () => {
  assert.equal(champion.skillPoints.at(-1), 560);
  assert.equal(champion.monsterSkillPoints.at(-1), 237);
  assert.equal(champion.monsterSkillPoints.length, 85);
});
