// The champion's gear made easy to read, on the published page in jsdom (BL-23): each level of a piece named by
// its rarity, as the game's forge does (GUIDE-05); figures checked against data/chaos-conquest/champion.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./page.js";

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
