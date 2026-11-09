// The Guides on the published page in jsdom (GUIDE-01, GUIDE-02): the block tabs, the heroes found by god, rarity
// or name, a hero in detail at a rank and level, figures checked against data/chaos-conquest/warlords.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openPage } from "./page.js";

const { warlords } = JSON.parse(readFileSync(new URL("../data/chaos-conquest/warlords.json", import.meta.url), "utf8"));
const azazel = warlords.find((warlord) => warlord.id === "azazel");
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

test("GUIDE-01 a tab per type of block: the heroes' guide drawn, each other says the version that brings its data", () => {
  const page = openGuides();
  assert.deepEqual(page.$$(".guide-tabs [role=tab]").map(textOf), [
    "Heroes",
    "Rituals",
    "Buildings",
    "Champion and gear",
  ]);
  assert.equal(listed(page).length, warlords.length);
  page.click("#guide-tab-rituals");
  assert.match(page.text("#guide-panel"), /^Comes with its data in version 1\.2: the 153 combat rituals/);
  page.click("#guide-tab-champion");
  assert.match(page.text("#guide-panel"), /version 1\.3/);
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
  assert.equal(row("Azazel Favour"), "Azazel Favour 375 375");
  assert.equal(row("Iron"), "Iron — 1,800,000");
  assert.equal(row("Warlord Honour"), "Warlord Honour — 765");
  assert.match(page.text(".guide-detail"), /From yours \(rank 2, level 3\)/);
  page.click("#guide-hero-skulltaker"); // not owned: from nothing, at level 35 by default
  assert.match(page.text(".guide-detail"), /From nothing, its unlock included/);
});

test("GUIDE-01 the guides read in French", () => {
  const page = openGuides({ saved: "fr" });
  assert.equal(page.text("#page-tab-guides"), "Guides");
  assert.equal(page.text("#guide-tab-heroes"), "Héros");
});
