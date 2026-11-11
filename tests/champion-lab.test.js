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
  assert.match(page.text("#clab-tree-map"), /Vitesse d'entraînement|Infantry Training Speed I\*/);
});
