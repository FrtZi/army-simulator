// The champion's skills in Your setup and in battle (BONUS-10): read from the setup file, chosen in their trees as the
// rituals, and counted as its gear is, a troop bonus everywhere and its march's in the composition it leads. Figures
// from data/chaos-conquest/champion-skills.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveSources } from "../src/engine/index.js";
import { readSetupFile } from "../src/storage/setup-file.js";
import { addTroops, openPage } from "./page.js";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const GAME = "chaos-conquest";
const game = read("game.json");
const champion = read("champion.json");
const championSkills = read("champion-skills.json");
const trees = championSkills.trees;
const skills = trees.flatMap((tree) => tree.skills);
const general = [...champion.effects, ...trees.flatMap((tree) => tree.bonuses ?? [])];
const SETUP_KEY = "army-simulator.player-setup";
const setupFile = (sections) => ({ format: "army-simulator/setup", version: 1, game: GAME, ...sections });

const resolve = (levels, definitions) => resolveSources([{ kind: "skill", definitions, skills, levels }]);

test("BONUS-10 a skill at its level gives its troop bonuses; its march's only for the march; outside battle, nothing", () => {
  // Keen Blades I at 15: infantry and monstrous infantry +17 % melee and ranged damage
  const blades = resolve([{ id: "keen-blades-i", level: 15 }], general);
  assert.deepEqual(
    blades
      .filter((effect) => effect.stat === "meleeDamage")
      .map((effect) => [effect.target.unitTypes[0], effect.percent]),
    [
      ["infantry", 17],
      ["monstrous-infantry", 17],
    ],
  );
  // Aura of Chaos at 20: +25 % melee attack for the troops of the champion's march, none for the others
  const aura = [{ id: "aura-of-chaos", level: 20 }];
  assert.deepEqual(resolve(aura, general), []);
  assert.ok(resolve(aura, champion.march).some((effect) => effect.stat === "meleeAttack" && effect.percent === 25));
  // a training speed is not a battle bonus; a skill whose values are not known gives nothing
  assert.deepEqual(resolve([{ id: "infantry-training-speed-i", level: 10 }], general), []);
  assert.deepEqual(resolve([{ id: "food-production-i", level: 3 }], general), []);
});

test("BONUS-10 the setup file holds the champion's skills, each a skill of its trees at a level it has", () => {
  const games = { [GAME]: { game, champion, championSkills, warlords: new Map() } };
  const champ = (list) => readSetupFile(setupFile({ champion: { level: 40, skills: list } }), games);
  const kept = champ([{ id: "keen-blades-i", level: 15 }]);
  assert.deepEqual(kept.problems, []);
  assert.deepEqual(kept.sections.champion.skills, [{ id: "keen-blades-i", level: 15 }]);
  const unknown = champ([{ id: "keen-blade-i", level: 1 }]).problems[0];
  assert.equal(unknown.code, "unknown-skill");
  assert.equal(unknown.suggestion, "keen-blades-i", "the nearest skill told");
  const beyond = champ([{ id: "keen-blades-i", level: 16 }]).problems[0];
  assert.equal(beyond.code, "out-of-range", "Keen Blades I has 15 levels");
});

test("BONUS-10 Your setup: a skill chosen in its tree, its level typed, the points checked, saved with the champion", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  page.choose("#setup-champion-level", 40);
  page.choose("#setup-skill-tree", "champion");
  page.$('#setup-skill-map [data-setup-skill-node="keen-blades-i"]').click();
  assert.equal(page.window.document.activeElement.id, "setup-skill-level");
  page.type("#setup-skill-level", 15);
  assert.ok(page.$('#setup-skill-map [data-setup-skill-node="keen-blades-i"]').classList.contains("done"));
  assert.equal(
    page.text("#setup-skill-points"),
    `✓ Spent: 15 of the ${champion.champion.skillPoints[39]} points level 40 gives`,
  );
  page.click("#setup-save");
  const file = JSON.parse(page.window.localStorage.getItem(SETUP_KEY))[GAME];
  assert.deepEqual(file.champion, { level: 40, skills: [{ id: "keen-blades-i", level: 15 }] });
});

test("BONUS-10 the saved skills count in battle, the setup loaded: everywhere, and the march's where the champion leads", () => {
  const saved = (list) => JSON.stringify({ [GAME]: setupFile({ champion: { level: 40, skills: list } }) });
  const damageWith = (list, led = false) => {
    const page = openPage({ stored: { [SETUP_KEY]: saved(list) } });
    addTroops(page, ["marauders"]);
    page.tick("#load-setup-toggle");
    if (led) page.tick("#composition-champion");
    return Number(page.metric("damage").replace(/\D/g, ""));
  };
  const none = damageWith([{ id: "infantry-training-speed-i", level: 10 }]);
  assert.ok(damageWith([{ id: "keen-blades-i", level: 15 }]) > none, "Keen Blades raises the marauders' damage");
  const aura = [{ id: "aura-of-chaos", level: 20 }];
  assert.equal(damageWith(aura), none, "the Aura of Chaos is for the champion's march only");
  assert.ok(damageWith(aura, true) > none, "and counts once the champion leads");
});

test("BONUS-10 the Champion lab starts from the saved skills", () => {
  const saved = JSON.stringify({
    [GAME]: setupFile({ champion: { level: 40, skills: [{ id: "gloat-1", level: 5 }] } }),
  });
  const page = openPage({ stored: { [SETUP_KEY]: saved } });
  page.click("#page-tab-champion");
  assert.ok(page.$('#clab-tree-map [data-clab-node="gloat-1"]').classList.contains("partial"));
});
