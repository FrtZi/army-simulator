// The Guides on the published page in jsdom (GUIDE-01, GUIDE-02): the block tabs, the heroes found by god, rarity
// or name, a hero in detail at a rank and level, figures checked against data/chaos-conquest/warlords.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openPage } from "./page.js";

const { warlords } = JSON.parse(readFileSync(new URL("../data/chaos-conquest/warlords.json", import.meta.url), "utf8"));
const azazel = warlords.find((warlord) => warlord.id === "azazel");
const data = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const { rituals } = data("rituals.json");
const { structures } = data("structures.json");
const textOf = (element) => element.textContent.replace(/\s+/g, " ").trim();
const SETUP_KEY = "army-simulator.player-setup";
const SAVED = JSON.stringify({
  "chaos-conquest": {
    format: "army-simulator/setup",
    version: 1,
    game: "chaos-conquest",
    warlords: [{ id: "azazel", rank: 2, level: 3 }],
  },
});

function openGuides(options) {
  const page = openPage(options);
  page.click("#page-tab-guides");
  return page;
}
const listed = (page) => page.$$("#guide-hero-list [data-guide-hero]").map((button) => button.dataset.guideHero);

test("GUIDE-03 the champion level by level, a piece of gear at its level, a set's bonuses by pieces worn", () => {
  const page = openGuides();
  page.click("#guide-tab-champion");
  // champion.json: power 200 at level 1, 550,000 at level 85; 1,000 experience to reach level 2
  assert.equal(page.text("#guide-champion-detail .metric.key .metric-value"), "550,000");
  page.choose("#guide-champion-level", 2);
  assert.match(page.text("#guide-champion-detail"), /Experience to reach it\s*1,000/);
  page.choose("#guide-champion-view", "gear");
  page.choose("#guide-champion-slot", "weapon");
  page.click("#guide-champion-chaos-gear-weapon");
  assert.equal(page.text("#guide-champion-title"), "Great Axe of the Chosen");
  assert.match(page.text("#guide-champion-detail"), /Daemonic Forge, level 15/);
  assert.match(page.text("#guide-champion-detail"), /Applied with Your setup loaded/);
  page.choose("#guide-champion-view", "sets");
  page.click("#guide-champion-chosen-set-bonus");
  const head = page.$$("#guide-champion-detail thead th").map(textOf);
  assert.deepEqual(head, ["Bonus", "3 pieces", "4 pieces", "5 pieces", "6 pieces"]);
  assert.equal(page.$$("#guide-champion-detail li").length, 6, "its six pieces");
});

test("GUIDE-01 a tab per type of block: heroes, rituals, buildings, champion and items drawn", () => {
  const page = openGuides();
  assert.deepEqual(page.$$(".guide-tabs [role=tab]").map(textOf), [
    "Heroes",
    "Rituals",
    "Buildings",
    "Champion and gear",
    "Items",
  ]);
  assert.equal(listed(page).length, warlords.length);
  page.click("#guide-tab-rituals");
  assert.equal(page.$$("#guide-rituals-list [data-guide-entry]").length, rituals.length);
  page.click("#guide-tab-buildings");
  assert.equal(page.$$("#guide-buildings-list [data-guide-entry]").length, structures.length);
  page.click("#guide-tab-champion");
  assert.match(page.text("#guide-champion-title"), /The champion/);
});

const SAVED_RITUALS = JSON.stringify({
  "chaos-conquest": {
    format: "army-simulator/setup",
    version: 1,
    game: "chaos-conquest",
    rituals: [
      { id: "cavalry-and-chariot-morale", level: 2 },
      { id: "cavalry-and-chariot-health", level: 2 },
    ],
    buildings: [{ id: "sorcerers-citadel", level: 20 }],
  },
});

test("GUIDE-03 the rituals found by category, battle bonuses or name; one in detail with what each level requires", () => {
  const page = openGuides({ stored: { [SETUP_KEY]: SAVED_RITUALS } });
  page.click("#guide-tab-rituals");
  page.choose("#guide-rituals-group", "battle");
  const battle = rituals.filter((ritual) => ritual.category === "battle");
  assert.equal(page.$$("#guide-rituals-list [data-guide-entry]").length, battle.length);
  page.tick("#guide-rituals-battle");
  const fighting = battle.filter((ritual) => Object.keys(ritual.effects).length > 0);
  assert.equal(page.$$("#guide-rituals-list [data-guide-entry]").length, fighting.length);
  page.type("#guide-rituals-search", "armoured");
  page.click("#guide-rituals-cavalry-and-chariot-morale");
  // Armoured Zeal, in the setup at level 2: shown at level 2 (rituals.json, from cctools.cc)
  assert.match(page.text("#guide-rituals-title"), /Armoured Zeal ✓ in your setup, level 2/);
  assert.match(page.text(".guide-detail"), /Cavalry Morale|Morale, Cavalry/);
  page.choose("#guide-rituals-level", 3);
  const needs = page.$$(".guide-requires li").map(textOf);
  // level 3 asks Chaos Infused Construction at level 2 (met: level 2 in the setup) and Sorcerer's Citadel 21 (not: 20)
  assert.deepEqual(needs, [
    "✓ Chaos Infused Construction, level 2 met in your setup",
    "✗ Sorcerer's Citadel, level 21 not met in your setup",
  ]);
  assert.match(page.text(".guide-detail"), /From yours \(level 2\)/);
});

test("GUIDE-02 the heroes found by god, rarity or name, in either language", () => {
  const page = openGuides();
  page.choose("#guide-god", "slaanesh");
  page.choose("#guide-rarity", "legendary");
  const expected = warlords.filter((w) => w.alignment === "slaanesh" && w.rarity === "legendary").map((w) => w.id);
  assert.deepEqual(listed(page), expected);
  page.choose("#guide-god", "");
  page.choose("#guide-rarity", "");
  page.type("#guide-search", "skull");
  assert.deepEqual(listed(page), ["skullhunter", "skulltaker"]);
  page.type("#guide-search", "gandalf");
  assert.equal(page.text("#guide-hero-list"), "No hero matches.");
});

test("GUIDE-02 a hero in detail: its power, tier and talents at the level chosen, the highest by default", () => {
  const page = openGuides();
  page.click("#guide-hero-azazel");
  assert.equal(page.text("#guide-hero-title"), "Azazel");
  const power = () => page.text(".guide-detail .metric.key .metric-value");
  assert.equal(power(), azazel.power.at(-1).toLocaleString("en-GB"), "level 35 by default");
  page.choose("#guide-rank", 1);
  page.choose("#guide-level", 1);
  assert.equal(power(), azazel.power[0].toLocaleString("en-GB"));
  assert.match(page.text(".guide-detail"), /level 1 of 35/);
  // a talent not unlocked yet at level 1 is said locked, with the level that unlocks it
  const locked = Object.values(azazel.talents).filter((values) => values[0] === null).length;
  assert.ok(locked > 0, "Azazel has talents unlocked later (warlords.json)");
  assert.equal(page.$$(".guide-table tr.locked").length, locked);
  assert.match(page.text(".guide-table tr.locked"), /locked/);
  const strip = page.$$(".rank-strip li").map(textOf);
  assert.equal(strip.length, 7);
  assert.equal(strip[6], `Rank 7${azazel.power[34].toLocaleString("en-GB")}`);
});

test("GUIDE-02 a hero in your saved setup is marked, and shown at your level first", () => {
  const page = openGuides({ stored: { [SETUP_KEY]: SAVED } });
  page.click("#guide-hero-azazel");
  assert.match(page.text("#guide-hero-azazel"), /in your setup, rank 2, level 3/);
  assert.match(page.text(".guide-detail"), /level 8 of 35/); // rank 2, level 3
  assert.equal(page.$("#guide-rank").value, "2");
});

test("GUIDE-04 a hero's way up: what the level shown costs, and in all from your level or from its unlock", () => {
  const page = openGuides({ stored: { [SETUP_KEY]: SAVED } }); // Azazel owned at rank 2, level 3 (level 8)
  page.click("#guide-hero-azazel");
  page.choose("#guide-rank", 3);
  page.choose("#guide-level", 1); // level 11: a rank up, favours only
  const rows = () =>
    [...page.$$(".guide-detail table")[0].querySelectorAll("tbody tr")].map((tr) =>
      [...tr.cells].map(textOf).join(" "),
    );
  const row = (name) => rows().find((text) => text.startsWith(name));
  // levels 9 to 11 (warlords.json): iron 800,000 + 1,000,000; honour 360 + 405; favours 375 at level 11
  assert.equal(row("Azazel Favour"), "Azazel Favour Legendary 375 375");
  assert.equal(row("Iron"), "Iron — 1,800,000");
  assert.equal(row("Warlord Honour"), "Warlord Honour Uncommon — 765");
  assert.match(page.text(".guide-detail"), /From yours \(rank 2, level 3\)/);
  page.click("#guide-hero-skulltaker"); // not owned: from nothing, at level 35 by default
  assert.match(page.text(".guide-detail"), /From nothing, its unlock included/);
});

test("GUIDE-01 the guides read in French", () => {
  const page = openGuides({ saved: "fr" });
  assert.equal(page.text("#page-tab-guides"), "Guides");
  assert.equal(page.text("#guide-tab-heroes"), "Héros");
});

test("GUIDE-04 an item's page: where it drops, what asks for it; reached from a cost table, the focus on it", () => {
  const page = openGuides();
  page.click("#guide-hero-azazel");
  page.$('.guide-detail [data-goto-item="azazel-favour"]').click();
  assert.equal(page.$("#guide-tab-items").getAttribute("aria-selected"), "true");
  assert.equal(page.text("#guide-items-title"), "Azazel Favour");
  assert.equal(page.window.document.activeElement.id, "guide-items-title");
  // item-sources.json: the Vampire Lord Foe, levels 8 to 12, up to 1.6 per chest at level 12
  assert.equal(textOf(page.$(".guide-drops summary")), "Vampire Lord (Foe), levels 8 to 12: up to 1.6 per chest");
  // warlords.json: Azazel's favours over its 35 levels, 200 + 250 + … + 2,250 = 20,475
  assert.equal(textOf(page.$(".guide-uses li")), "Azazel (Heroes): 20,475 over all its levels");
  page.choose("#guide-items-kind", "currency");
  assert.ok(page.$$("#guide-items-list [data-guide-item]").length >= 5, "the resources: food, stone, lead, wood, iron");
  page.click("#guide-item-iron");
  assert.match(page.text(".guide-detail"), /No drop known/);
});
