// The items' guide as tables (GUIDE-08): every item in a family by the rules of data/chaos-conquest/game.json, a
// block per family that folds, a row per item (rarity, places it drops in, what asks for it), its detail under it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { familyOf } from "../src/ui/steps/guides/items-table.js";
import { openPage } from "./page.js";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/chaos-conquest/${file}`, import.meta.url), "utf8"));
const { itemFamilies } = read("game.json");
const { items } = read("items.json");
const textOf = (element) => element.textContent.replace(/\s+/g, " ").trim();

test("GUIDE-08 every item falls in a family: resources, favours, forge materials, ritual, building and gear components", () => {
  assert.deepEqual(
    items.filter((item) => !familyOf(item, itemFamilies)).map((item) => item.id),
    [],
  );
  const byId = (id) =>
    familyOf(
      items.find((item) => item.id === id),
      itemFamilies,
    );
  assert.deepEqual(["iron", "azazel-favour", "carrier-xp-token"].map(byId), ["resources", "warlords", "warlords"]);
});

function openItems() {
  const page = openPage();
  page.click("#page-tab-guides");
  page.click("#guide-tab-items");
  return page;
}
const block = (page, family) => page.$(`.item-family[data-family="${family}"]`);

test("GUIDE-08 a block per family, folded; an item's row opens its detail under it, a second click folds it", () => {
  const page = openItems();
  assert.equal(page.$$(".item-family").length, itemFamilies.length);
  assert.ok(!block(page, "resources").open, "folded at first");
  const resources = items.filter((item) => item.kind === "currency").length;
  assert.equal(block(page, "resources").querySelectorAll("tbody [data-guide-item]").length, resources);
  page.click("#guide-item-iron");
  assert.ok(block(page, "resources").open, "the family of the item chosen opens");
  assert.equal(page.$("#guide-item-iron").getAttribute("aria-expanded"), "true");
  assert.match(textOf(page.$("tr:has(#guide-item-iron) + .item-detail-row")), /No drop known/);
  page.click("#guide-item-iron");
  assert.equal(page.$(".item-detail-row"), null, "folded again");
});

test("GUIDE-08 a row says what asks for the item; the rarity filter opens every block it leaves", () => {
  const page = openItems();
  const tags = page.$$("tr:has(#guide-item-azazel-favour) .tag").map(textOf);
  assert.deepEqual(tags, ["Heroes"], "warlords.json: only heroes ask for a favour");
  page.choose("#guide-items-rarity", "legendary");
  const shown = page.$$(".item-family");
  assert.ok(
    shown.every((family) => family.open),
    "a filter on: every block left open",
  );
  const rarities = new Set(page.$$("#guide-items-list tbody .rarity").map(textOf));
  assert.deepEqual([...rarities], ["Legendary"]);
});

test("GUIDE-08 DEF-038 no text key on the page: each block named; the gear among what asks for an item", () => {
  const page = openItems();
  page.click("#guide-item-iron");
  // a key is words joined by a dot ("guides.gear"): the page shows a text, never one
  assert.doesNotMatch(page.text("#guide-items-list"), /\b[a-z]+\.[a-z][A-Za-z-]+\b/);
  assert.deepEqual(page.$$("tr:has(#guide-item-iron) .tag").map(textOf), ["Heroes", "Rituals", "Buildings", "Gear"]);
  // champion.json: Vambraces of Gore asks 10,000 iron at Core, 1,200,000 at Legendary
  assert.match(page.text(".item-detail-row"), /Vambraces of Gore \(Gear\)/);
});
