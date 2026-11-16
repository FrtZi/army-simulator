// The Champion lab's setups saved by name and one played in the Battle lab (CFG-10, D-39), on the published page in
// jsdom: the lab kept as it is, put back, deleted; in the Battle lab, a saved set plays instead of Your setup's
// champion, with the setup loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addTroops, openPage } from "./page.js";

const GAME = "chaos-conquest";
const SETUP_KEY = "army-simulator.player-setup";
const CHAMPIONS_KEY = "army-simulator.champion-setups";
const setupFile = (sections) => ({ format: "army-simulator/setup", version: 1, game: GAME, ...sections });
const stored = (page) => JSON.parse(page.window.localStorage.getItem(CHAMPIONS_KEY) ?? "[]");

test("CFG-10 the Champion lab saved by name: its level, both sets and skills kept, put back, deleted", () => {
  const page = openPage();
  page.click("#page-tab-champion");
  page.choose("#clab-level", 40);
  page.choose("#clab-b-weapon", "chaos-gear-weapon");
  page.$('#clab-tree-map [data-clab-node="gloat-1"]').click();
  page.type("#clab-skill-level", 5);
  page.type("#clab-save-name", "Raid");
  page.click("#clab-save");
  assert.equal(page.text("#clab-save-status"), "✓ Saved: Raid.");
  const [save] = stored(page);
  assert.equal(save.game, GAME);
  assert.deepEqual(save.champion.gear.b, [{ id: "chaos-gear-weapon", level: 1 }]);
  assert.deepEqual([save.champion.level, save.champion.skills.conquest], [40, { "gloat-1": 5 }]);
  assert.match(page.text("#clab-save-list"), /Raid\s*level 40/);
  // changed, then put back
  page.choose("#clab-level", 85);
  page.click('[data-clab-load="Raid"]');
  assert.equal(page.$("#clab-level").value, "40");
  assert.equal(page.$("#clab-b-weapon").value, "chaos-gear-weapon");
  page.click('[data-clab-delete="Raid"]');
  assert.deepEqual(stored(page), []);
  assert.equal(page.text("#clab-save-list"), "No champion setup saved yet.");
});

test("CFG-10 a saved champion's set plays in the Battle lab instead of Your setup's, the setup loaded", () => {
  const champion = { level: 40, gear: { a: [], b: [{ id: "chaos-gear-weapon", level: 6 }] }, skills: {} };
  const page = openPage({
    stored: {
      [SETUP_KEY]: JSON.stringify({ [GAME]: setupFile({ champion: { level: 40 } }) }),
      [CHAMPIONS_KEY]: JSON.stringify([{ name: "Raid", game: GAME, savedAt: "2026-11-16T10:00:00Z", champion }]),
    },
  });
  addTroops(page, ["marauders"]);
  const health = () => Number(page.metric("health").replace(/\D/g, ""));
  page.tick("#load-setup-toggle");
  page.tick("#composition-champion");
  const own = health();
  assert.deepEqual(
    page.$$("#load-champion option").map((option) => option.textContent),
    ["Your setup's champion", "Raid · Set A", "Raid · Set B"],
  );
  page.choose("#load-champion", "Raid|b");
  // champion.json: the Great Axe of the Chosen at level 6, +20 % health for the troops of the champion's march
  assert.equal(health(), Math.round(own * 1.2));
  assert.match(page.text("#load-setup-status"), /the champion saved in the Champion lab as Raid/);
  page.choose("#load-champion", "Raid|a");
  assert.equal(health(), own, "set A wears nothing");
});
