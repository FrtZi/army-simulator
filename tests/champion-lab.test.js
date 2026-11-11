// The Champion lab (BONUS-09, BL-30): the champion at a level, two gear sets compared with every bonus they give in
// battle and beyond, its two skill trees with the points the level gives. Figures from data/chaos-conquest/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openPage } from "./page.js";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const { champion } = read("champion.json");
const textOf = (element) => element.textContent.replace(/\s+/g, " ").trim();
const SAVED = JSON.stringify({
  "chaos-conquest": {
    format: "army-simulator/setup",
    version: 1,
    game: "chaos-conquest",
    champion: { level: 40, gear: [{ id: "vambraces-of-gore", level: 4 }] },
  },
});

function openLab() {
  const page = openPage({ stored: { "army-simulator.player-setup": SAVED } });
  page.click("#page-tab-champion");
  return page;
}

test("BONUS-09 the champion at the saved level, its figures following the level chosen", () => {
  const page = openLab();
  assert.equal(page.$("#clab-level").value, "40", "the saved setup's level");
  assert.equal(page.text("#clab-figures .metric.key .metric-value"), champion.power[39].toLocaleString("en-GB"));
  page.choose("#clab-level", 85);
  assert.match(page.text("#clab-figures"), new RegExp(`Conquest skill points\\s*${champion.monsterSkillPoints[84]}`));
});

test("BONUS-09 two gear sets side by side: every bonus by domain, in battle and beyond, B against A", () => {
  const page = openLab();
  assert.equal(page.$("#clab-a-gloves").value, "vambraces-of-gore", "set A starts from the saved setup");
  page.choose("#clab-set-b", "chosen-set-bonus");
  assert.equal(page.$("#clab-b-head").value, "chaos-gear-helm", "the set's pieces in place on B");
  const domains = page.$$("#clab-compare summary").map(textOf);
  assert.ok(
    domains.some((name) => name.startsWith("In battle")),
    domains.join(" | "),
  );
  assert.ok(
    domains.some((name) => name.startsWith("Economy and logistics")),
    "beyond battle too",
  );
  // Vambraces of Gore at Epic: lead production +15 % on A, none on B
  const lead = page.$$("#clab-compare tr").find((row) => row.cells[0]?.textContent === "Lead Production Bonus");
  const cells = [...lead.cells].slice(1);
  assert.deepEqual(
    cells.map((cell) => textOf(cell.querySelector(":scope > span[aria-hidden]").nextSibling)),
    ["+15 %", "—", "-15 %"],
  );
  // as the battle comparison: A gives more, in green with ▲; B and the gap in red with ▼ (Frantz, 2026-11-11)
  assert.deepEqual(
    cells.map(
      (cell) => `${cell.classList.contains("win") ? "win" : "lose"} ${cell.querySelector("[aria-hidden]").textContent}`,
    ),
    ["win ▲", "lose ▼", "lose ▼"],
  );
});

test("BONUS-09 the two skill trees drawn as the rituals': a skill's level typed, the points against the level's", () => {
  const page = openLab();
  assert.equal(page.$$("#clab-tree-map .map-node").length, 26, "the conquest tree");
  page.$('#clab-tree-map [data-clab-node="gloat-1"]').click();
  assert.equal(page.window.document.activeElement.id, "clab-skill-level");
  page.type("#clab-skill-level", 5);
  // level 40: 61 conquest points
  assert.equal(page.text("#clab-points"), `✓ Spent: 5 of the ${champion.monsterSkillPoints[39]} points level 40 gives`);
  assert.ok(page.$('#clab-tree-map [data-clab-node="gloat-1"]').classList.contains("partial"));
  page.choose("#clab-tree", "champion");
  assert.equal(page.$$("#clab-tree-map .map-node").length, 52, "the champion tree");
  // cctools.cc's English name where it has the skill, ours marked with a star where it has not
  assert.match(page.text("#clab-tree-map"), /Infantry Training Speed I.*Food Production I\*/);
});

const rowsOf = (page, selector) => page.$$(`${selector} tbody tr`).map((row) => [...row.cells].map(textOf).join(" "));

test("BONUS-09 what a skill gives at its level and at most, and the tree's skills in all; a skill not known says so", () => {
  const page = openLab();
  page.choose("#clab-tree", "champion");
  page.$('#clab-tree-map [data-clab-node="aura-of-chaos"]').click();
  page.type("#clab-skill-level", 20);
  // cctools.cc: Aura of Chaos at 20, +25 % melee and ranged attack of the champion's march
  const skill = rowsOf(page, "#clab-skill-benefits");
  assert.ok(skill.includes("Champion's march: Melee Attack +25 % +25 %"), skill.join(" | "));
  assert.ok(rowsOf(page, "#clab-tree-benefits").includes("Champion's march: Melee Attack +25 %"));
  page.$('#clab-tree-map [data-clab-node="food-production-i"]').click();
  assert.match(page.text("#clab-skill-benefits"), /not known yet/);
});

test("BONUS-09 the Guides show each skill tree, a skill's every level and what it gives", () => {
  const page = openPage();
  page.click("#page-tab-guides");
  page.click("#guide-tab-champion");
  page.choose("#guide-champion-view", "skills");
  assert.equal(page.$$("#guide-champion-detail .map-node").length, 26, "the conquest tree first");
  assert.match(page.text("#guide-champion-detail"), /not known yet/, "the conquest skills' values are not known");
  page.choose("#guide-skill-tree", "champion");
  page.$('#guide-champion-detail [data-guide-skill="aura-of-chaos"]').click();
  const levels = page.$$("#guide-champion-detail tbody tr");
  assert.equal(levels.length, 20);
  assert.equal(textOf(levels[0].cells[1]), "+0.5 %");
});
