// The champion's gear made easy to read, on the published page in jsdom (BL-23): each level of a piece named by
// its rarity, as the game's forge does (GUIDE-05); figures checked against data/chaos-conquest/champion.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openPage } from "./page.js";

const champion = JSON.parse(readFileSync(new URL("../data/chaos-conquest/champion.json", import.meta.url), "utf8"));
const SETUP_KEY = "army-simulator.player-setup";
const textOf = (element) => element.textContent.replace(/\s+/g, " ").trim();
const optionsOf = (page, selector) => page.$$(`${selector} option`).map(textOf);

function openPiece(options, slot, id) {
  const page = openPage(options);
  page.click("#page-tab-guides");
  page.click("#guide-tab-champion");
  page.choose("#guide-champion-view", "gear");
  page.choose("#guide-champion-slot", slot);
  page.click(`#guide-champion-${id}`);
  return page;
}

test("GUIDE-05 a piece's levels are the game's rarities, each with its diamond and its colour", () => {
  // Vambraces of Gore, five levels: Core to Legendary (the game's "Brassard d'avant-bras de sang")
  const page = openPiece({}, "gloves", "vambraces-of-gore");
  assert.deepEqual(optionsOf(page, "#guide-champion-level"), [
    "1 · Core",
    "2 · Uncommon",
    "3 · Rare",
    "4 · Epic",
    "5 · Legendary",
  ]);
  page.choose("#guide-champion-level", 3);
  const badge = page.$("#guide-champion-detail .guide-level .rarity");
  assert.equal(textOf(badge), "Rare");
  assert.ok(badge.classList.contains("rarity-rare"), "its colour");
  assert.ok(badge.querySelector("svg"), "its diamond");
  assert.doesNotMatch(page.text("#guide-champion-detail .meta"), /Core/, "no rarity of its own besides its levels");
});

test("GUIDE-05 the rarities read in French as the game writes them, Commun to Éternel", () => {
  // Headsman's Skull Helm has six levels: up to Eternal
  const page = openPiece({ saved: "fr" }, "head", "skull-helm");
  assert.deepEqual(optionsOf(page, "#guide-champion-level"), [
    "1 · Commun",
    "2 · Peu commun",
    "3 · Rare",
    "4 · Épique",
    "5 · Légendaire",
    "6 · Éternel",
  ]);
});

test("GUIDE-05 items and heroes show their rarity; the heroes' filter offers only theirs", () => {
  const page = openPage();
  page.click("#page-tab-guides");
  const azazel = page.$("#guide-hero-azazel .rarity");
  assert.ok(azazel, "a hero's rarity, as a badge");
  const rarities = optionsOf(page, "#guide-rarity");
  assert.ok(!rarities.includes("Eternal"), "no hero is Eternal");
  page.click("#guide-hero-azazel");
  // items.json: Azazel Favour is legendary, in the cost table and on its page
  assert.equal(textOf(page.$('.guide-detail td:has([data-goto-item="azazel-favour"]) .rarity')), "Legendary");
  page.$('.guide-detail [data-goto-item="azazel-favour"]').click();
  assert.equal(textOf(page.$(".guide-detail .meta .rarity")), "Legendary");
  assert.equal(textOf(page.$("#guide-item-azazel-favour .rarity")), "Legendary");
});

test("GUIDE-05 a piece worn in Your setup shows the rarity of its level", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  page.choose("#setup-gear-weapon", "chaos-gear-weapon");
  assert.equal(textOf(page.$("#setup-gear-weapon").closest("li").querySelector(".rarity")), "Core");
  page.choose("#setup-gear-level-weapon", 6);
  assert.equal(textOf(page.$("#setup-gear-weapon").closest("li").querySelector(".rarity")), "Eternal");
  assert.equal(page.$("#setup-gear-level-weapon option:checked").textContent, "6 · Eternal");
});

test("GUIDE-05 DEF-037 a piece's and a set's bonuses for the champion's march are shown, first, by name", () => {
  // champion.json: Vambraces of Gore, melee and ranged attack of the champion's march 1, 2, 4, 7, 10 % (the game, Epic:
  // "Champion : bonus d'attaque de mêlée d'expédition +7%")
  const page = openPiece({}, "gloves", "vambraces-of-gore");
  page.choose("#guide-champion-level", 4);
  const rows = page.$$("#guide-champion-detail tbody tr").map((row) => [...row.cells].map(textOf).join(" "));
  assert.ok(rows.includes("Champion's march: Melee Attack +7 % +10 %"), rows.join(" | "));
  assert.ok(rows[0].startsWith("Champion's march"), "listed first, as in the game");
  page.choose("#guide-champion-view", "sets");
  page.click("#guide-champion-chosen-set-bonus");
  assert.doesNotMatch(page.text("#guide-champion-detail"), /hero-march/, "no bonus left by its id");
  assert.match(page.text("#guide-champion-detail"), /Champion's march: Health/);
});

test("GUIDE-06 a piece shows its set, what it gives by pieces worn, and a way to it; a piece without one says so", () => {
  const page = openPiece({}, "weapon", "chaos-gear-weapon");
  // champion.json: the Great Axe of the Chosen is one of the Chosen Set Bonus's six pieces, its bonuses from 3 worn
  assert.match(page.text("#guide-champion-detail"), /Part of Chosen Set Bonus/);
  const head = page.$$("#guide-champion-detail thead th").map(textOf);
  assert.ok(head.includes("3 pieces") && head.includes("6 pieces"), head.join(" | "));
  page.$('#guide-champion-detail [data-goto-set="chosen-set-bonus"]').click();
  assert.equal(page.text("#guide-champion-title"), "Chosen Set Bonus");
  assert.equal(page.window.document.activeElement.id, "guide-champion-title");
  assert.equal(page.$("#guide-champion-view").value, "sets");
  const alone = openPiece({}, "gloves", "vambraces-of-gore");
  assert.match(alone.text("#guide-champion-detail"), /Not part of a set/);
});

function openLab(options) {
  const page = openPage(options);
  page.click("#page-tab-guides");
  page.click("#guide-tab-champion");
  page.choose("#guide-champion-view", "lab");
  return page;
}

test("GUIDE-09 the set lab: a set chosen puts its pieces in their slots and filters the lists; level and rarity in one list", () => {
  const page = openLab();
  assert.equal(page.$$(".lab-slot .slot-icon svg").length, 6, "a pictogram per slot");
  assert.equal(page.$("#lab-piece-weapon").value, "", "nothing worn: no setup saved");
  page.choose("#lab-set", "chosen-set-bonus");
  // champion.json: the Chosen Set Bonus, a piece for each of the six slots
  assert.equal(page.$("#lab-piece-head").value, "chaos-gear-helm");
  assert.equal(page.$("#lab-piece-boots").value, "chaos-gear-legs");
  assert.deepEqual(optionsOf(page, "#lab-piece-head"), ["None", "Skull Helm of the Chosen"], "only the set's piece");
  assert.equal(page.$("#lab-level-weapon option:checked").textContent, "◆ 1 · Core");
  assert.ok(page.$("#lab-level-weapon").classList.contains("rarity-core"));
  page.choose("#lab-level-weapon", 6);
  assert.ok(page.$("#lab-level-weapon").classList.contains("rarity-eternal"));
  assert.match(page.text("#guide-champion-detail"), /Chosen Set Bonus: 6 of 6 pieces worn, its 6-piece bonus reached/);
  assert.match(page.text("#guide-champion-detail"), /Champion's march: Health/);
  assert.match(page.text("#guide-champion-detail"), /What it asks, from nothing/);
  page.choose("#lab-set", "");
  assert.ok(optionsOf(page, "#lab-piece-head").length > 2, "every piece again");
  assert.equal(page.$("#lab-piece-head").value, "chaos-gear-helm", "the pieces chosen stay");
});

test("GUIDE-09 the set lab starts from the saved setup's gear; what it asks adds each piece's costs from nothing", () => {
  const saved = JSON.stringify({
    "chaos-conquest": {
      format: "army-simulator/setup",
      version: 1,
      game: "chaos-conquest",
      champion: { gear: [{ id: "vambraces-of-gore", level: 2 }] },
    },
  });
  const page = openLab({ stored: { [SETUP_KEY]: saved } });
  assert.equal(page.$("#lab-piece-gloves").value, "vambraces-of-gore");
  // Vambraces of Gore: iron 10,000 at Core, 40,000 at Uncommon (the game's forge, Frantz's screenshots)
  const iron = page.$$("#guide-champion-detail tr").find((row) => row.cells[0]?.textContent.includes("Iron"));
  assert.equal(textOf(iron.cells[1]), "50,000");
  iron.querySelector("[data-goto-item]").click();
  assert.equal(page.text("#guide-items-title"), "Iron");
});

test("BONUS-08 Your setup shows the champion's own stats at its level and what its gear gives in all", () => {
  const page = openPage();
  page.click("#page-tab-setup");
  assert.match(page.text("#setup-champion-figures"), /Choose its level and its gear/);
  page.choose("#setup-champion-level", 40);
  // champion.json: its melee attack at level 40
  const attack = champion.champion.stats.meleeAttack[39].toLocaleString("en-GB");
  const rows = () => page.$$("#setup-champion-figures tr").map((row) => [...row.cells].map(textOf).join(" "));
  assert.ok(rows().includes(`Melee Attack ${attack}`), rows().join(" | "));
  page.choose("#setup-gear-weapon", "chaos-gear-weapon");
  page.choose("#setup-gear-level-weapon", 6);
  // the Great Axe of the Chosen at level 6: +20 % health for the troops of its march
  assert.ok(rows().includes("Champion's march: Health +20 %"), rows().join(" | "));
  assert.match(page.text("#setup-champion-figures"), /Chosen Set Bonus: 1 of 6 pieces worn, its first bonus at 3/);
});

test("BONUS-08 the Battle lab shows what the saved champion brings, its march's once it leads", () => {
  const saved = JSON.stringify({
    "chaos-conquest": {
      format: "army-simulator/setup",
      version: 1,
      game: "chaos-conquest",
      champion: { level: 40, gear: [{ id: "chaos-gear-weapon", level: 6 }] },
    },
  });
  const page = openPage({ stored: { [SETUP_KEY]: saved } });
  assert.ok(page.$("#composition-champion-details").hidden, "the setup not loaded: nothing shown");
  page.tick("#load-setup-toggle");
  assert.ok(!page.$("#composition-champion-details").hidden);
  assert.match(page.text("#composition-champion-summary"), /its march's count once it leads/);
  page.tick("#composition-champion");
  assert.match(page.text("#composition-champion-summary"), /its march's included/);
  assert.match(page.text("#composition-champion-figures"), /Champion's march: Health/);
});
