// ACC-01: WCAG AA. axe-core checks the page with every part open (a bonus row, troops, the picker), in both
// languages. jsdom draws nothing, so axe cannot measure colours there: the contrast of every text colour on
// every surface is computed from the design tokens instead (src/styles/tokens.css).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import axe from "axe-core";
import { addTroops, openPage } from "./page.js";

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3; // focus ring, bar fill, field borders against their surface (WCAG 1.4.11)

async function violations(page) {
  page.window.eval(axe.source);
  const result = await page.window.axe.run(page.window.document, { rules: { "color-contrast": { enabled: false } } });
  // Array.from: a plain array of this realm, not jsdom's, so deepEqual compares contents only (DEF-008)
  return Array.from(
    result.violations,
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`,
  );
}

for (const language of ["en", "fr"]) {
  test(`ACC-01 [${language}] axe finds no violation, with every part of the page open`, async () => {
    const page = openPage({ saved: language });
    page.click("#bonus-add");
    page.type("#bonus-percent-0", 120); // a problem shown
    page.choose("#bonus-target-0", "alignments");
    addTroops(page, ["khorngor", "chimera"]);
    page.click("#composition-tab-1");
    addTroops(page, ["marauders"]);
    page.click("#picker-toggle");
    // a hero with its rank, level and talents, and the hero picker open (D-26)
    page.click("#hero-picker-toggle");
    page.tick("#pick-hero-azazel");
    page.click("#hero-picker-add");
    page.tick("#talent-slaanesh-health");
    page.click("#hero-picker-toggle");
    // a closed table is not checked: open each chart's table (D-24)
    const openTable = () => page.$("#chart-table")?.setAttribute("open", "");
    openTable();
    assert.deepEqual(await violations(page), []);
    for (const dashboard of ["rounds", "balance", "map", "pros", "raid"]) {
      page.click(`#dash-tab-${dashboard}`);
      openTable();
      assert.deepEqual(await violations(page), [], dashboard);
    }
    // Your setup (NAV-01, D-27), a hero in it, marked as not saved
    page.click("#page-tab-setup");
    page.choose("#setup-warlord-select", "azazel");
    page.click("#setup-warlord-add");
    page.type("#setup-capacity-base", 110000);
    // a file uploaded, under review with a value left out; the help on the file open (CFG-05, CFG-06)
    const file = { format: "army-simulator/setup", version: 1, game: "chaos-conquest", warlords: [{ id: "x" }] };
    const input = page.$("#setup-import");
    Object.defineProperty(input, "files", { value: [new page.window.File([JSON.stringify(file)], "mine.json")] });
    input.dispatchEvent(new page.window.Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    page.$(".setup-help").setAttribute("open", "");
    assert.ok(page.$("#setup-import-cancel"), "the review is shown");
    assert.deepEqual(await violations(page), [], "your setup");
    // the Guides, a hero in detail at a level with talents still locked (GUIDE-01, GUIDE-02)
    page.click("#page-tab-guides");
    page.click("#guide-hero-azazel");
    page.choose("#guide-rank", 1);
    assert.deepEqual(await violations(page), [], "guides");
    page.click("#guide-tab-rituals"); // a ritual in detail: its bonuses, requirements, costs (GUIDE-03)
    assert.deepEqual(await violations(page), [], "rituals' guide");
    page.$(".guide-detail [data-goto-item]").click(); // an item's page, its drops open (GUIDE-04)
    page.$$(".guide-drops details").forEach((details) => details.setAttribute("open", ""));
    assert.deepEqual(await violations(page), [], "items' guide");
    page.click("#guide-tab-champion"); // the champion's guide: a piece, then a set (BL-13)
    page.choose("#guide-champion-view", "gear");
    assert.deepEqual(await violations(page), [], "champion's gear");
    page.choose("#guide-champion-view", "sets");
    assert.deepEqual(await violations(page), [], "champion's sets");
    // the Champion lab: two gear sets compared, a skill tree (BONUS-09)
    page.click("#page-tab-champion");
    page.choose("#clab-set-b", "chosen-set-bonus");
    assert.deepEqual(await violations(page), [], "champion lab");
  });
}

// the two themes: the dark values on :root, the light ones override them under :root[data-theme="light"]
const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const [darkBlock, lightBlock] = css.split(':root[data-theme="light"]');
const read = (block) =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex]));
const dark = read(darkBlock);
const THEMES = { dark, light: { ...dark, ...read(lightBlock) } };

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (tokens, one, two) => {
  const [light, darker] = [luminance(tokens[one]), luminance(tokens[two])].sort((a, b) => b - a);
  return (light + 0.05) / (darker + 0.05);
};
const GODS = ["undivided", "khorne", "nurgle", "slaanesh", "tzeentch"];
// a rarity's name is written in its colour (GUIDE-05): text, so 4.5:1
const RARITIES = ["core", "uncommon", "rare", "epic", "legendary", "eternal"].map((id) => `rarity-${id}`);

for (const [theme, tokens] of Object.entries(THEMES)) {
  const check = (pairs, minimum) => {
    for (const [colour, surface] of pairs) {
      const ratio = contrast(tokens, colour, surface);
      assert.ok(ratio >= minimum, `${theme}: ${colour} on ${surface}: ${ratio.toFixed(2)}`);
    }
  };
  // the key columns' tint is a surface too: links on the light tint once fell to 4.44:1 (DEF-004)
  const surfaces = ["bg", "card", "field", "key"];
  const on = (colours) => colours.flatMap((colour) => surfaces.map((surface) => [colour, surface]));

  test(`ACC-01 THEME-01 GUIDE-05 [${theme}] every text colour reads on every surface (WCAG AA, 4.5:1)`, () => {
    check(
      [
        ["on-accent", "accent"],
        ["tip-text", "tip-bg"],
        ...on(["heading", "text", "muted", "link", "good", "critical", "equal", ...RARITIES]),
      ],
      AA_TEXT,
    );
  });

  test(`ACC-01 [${theme}] focus ring, capacity bar and troop icons stand out from their surfaces (3:1)`, () => {
    check([...on(["focus"]), ["good", "field"], ["critical", "field"], ...on(GODS)], AA_NON_TEXT);
  });
}
