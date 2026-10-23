// End-to-end tests of the published page (dist/index.html) in jsdom, one per feature the page shows. Figures
// are worked out by hand from the units' sheets (see the comments), and checked as the page prints them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEXTS } from "../src/ui/texts/index.js";
import { PAGE, addTroops, openPage } from "./page.js";

const games = JSON.parse(readFileSync(new URL("../data/games.json", import.meta.url), "utf8"));

test("COMP-01 the published page is one file: no script, style or data loaded from elsewhere", () => {
  assert.doesNotMatch(PAGE, /<script[^>]+src=/);
  assert.doesNotMatch(PAGE, /<link[^>]+stylesheet/);
  assert.doesNotMatch(PAGE, /(src|href)="https?:/);
  assert.match(PAGE, /<meta name="viewport"/);
});

test("SEC-01 the page sends nothing: no network call in its code", () => {
  for (const call of ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "document.cookie"]) {
    assert.ok(!PAGE.includes(call), call);
  }
});

test("GAME-01 the page offers every game of data/games.json", () => {
  const page = openPage();
  assert.deepEqual(
    page.$$("#game-select option").map((option) => option.value),
    games.map((game) => game.id),
  );
});

test("LANG-02 the page follows the browser's language, and switches on demand", () => {
  const english = openPage({ language: "en-GB" });
  assert.equal(english.window.document.title, "Army Simulator");
  assert.equal(english.text("#army-title"), "Your army");
  const french = openPage({ language: "fr-FR" });
  assert.equal(french.window.document.documentElement.lang, "fr");
  assert.equal(french.text("#army-title"), "Votre armée");
  // switching to French translates the page and the game's names, and is remembered
  english.click('[data-lang="fr"]');
  assert.equal(english.window.document.title, "Simulateur d'armée");
  assert.equal(english.$('[data-lang="fr"]').getAttribute("aria-pressed"), "true");
  english.click("#picker-toggle");
  assert.match(english.text('label[for="pick-khorne-gor"]'), /^Gor de Khorne/);
  assert.equal(english.savedLanguage(), "fr");
  assert.equal(openPage({ language: "en-GB", saved: "fr" }).text("#army-title"), "Votre armée");
});

test("LANG-02 both languages hold the same texts", () => {
  assert.deepEqual(Object.keys(TEXTS.fr).sort(), Object.keys(TEXTS.en).sort());
});

test("ARMY-01 the picker: filters, accent-free search, several troops added at once", () => {
  const page = openPage();
  page.click("#picker-toggle");
  assert.equal(page.$("#picker-toggle").getAttribute("aria-expanded"), "true");
  page.tick("#filter-tier-6");
  page.tick("#filter-alignment-khorne");
  assert.deepEqual(
    page.$$("#picker-list input").map((box) => box.dataset.pick),
    ["khorne-minotaurs", "khorne-chaos-lord-on-dragon"],
  );
  // several values at once: tiers V and VI of Khorne add the Gor, the Skullcrushers, the Daemon Prince and Skull Cannons
  page.tick("#filter-tier-5");
  assert.equal(page.$$("#picker-list input").length, 6);
  assert.match(page.text("#filter-tier summary"), /Tier V, Tier VI/);
  page.untick("#filter-tier-6");
  page.untick("#filter-tier-5");
  page.untick("#filter-alignment-khorne");
  page.type("#picker-search", "elu"); // finds "Élu du Chaos"
  assert.deepEqual(
    page.$$("#picker-list input").map((box) => box.dataset.pick),
    ["chaos-chosen"],
  );
  page.type("#picker-search", "");
  addTroops(page, ["khorngor", "khorne-gor"]);
  assert.ok(page.$("#picker").hidden, "the picker closes once the troops are added");
  assert.deepEqual(
    page.$$("[data-count]").map((input) => [input.dataset.count, input.value]),
    [
      ["khorngor", "1000"],
      ["khorne-gor", "1000"],
    ],
  );
  page.click("#picker-toggle");
  assert.ok(page.$("#pick-khorngor").disabled && page.$("#pick-khorngor").checked, "already in the army");
});

test("ARMY-01 counts are typed in, troops removed", () => {
  const page = openPage();
  addTroops(page, ["khorngor", "marauders"]);
  page.type("#count-khorngor", 2500);
  assert.equal(page.metric("troops"), "3,500");
  page.click("#remove-marauders");
  assert.equal(page.$("#count-marauders"), null);
  assert.equal(page.metric("troops"), "2,500");
});

test("ARMY-02 the march capacity: base, bonus and total, and the troops over it", () => {
  const page = openPage();
  page.type("#capacity-bonus", 10);
  assert.equal(page.text(".capacity-total"), "March capacity: 50,000 base + 5,000 bonus (10 %) = 55,000");
  addTroops(page, ["khorngor"]);
  assert.equal(page.text("#capacity .status"), "✓ 1,000 troops · 54,000 free");
  page.type("#count-khorngor", 60000);
  assert.ok(page.$("#capacity .status").classList.contains("critical"));
  assert.equal(page.text("#capacity .status"), "⚠ 5,000 troops over the march capacity");
  page.type("#capacity-bonus", 150);
  assert.match(page.text("#capacity .problem"), /Enter a percentage from 0 to 100/);
});

test("BONUS-01 a bonus row: only stats that can be boosted, 0 to 100 %, a target with its values", () => {
  const page = openPage();
  page.click("#bonus-add");
  const stats = page.$$("#bonus-stat-0 option").map((option) => option.value);
  for (const fixed of ["squadSize", "foodUpkeep", "squadPower"]) assert.ok(!stats.includes(fixed), fixed);
  assert.ok(stats.includes("morale") && stats.includes("armour"));
  page.type("#bonus-percent-0", 101);
  assert.equal(page.$("#bonus-percent-0").getAttribute("aria-invalid"), "true");
  assert.match(page.text("#bonus-problem-0"), /from 0 to 100/);
  page.choose("#bonus-target-0", "alignments");
  assert.ok(page.$$("#bonus-value-0 option").some((option) => option.textContent === "Khorne"));
  page.click("#bonus-remove-0");
  assert.equal(page.$("#bonus-stat-0"), null);
});

test("BONUS-02 SIM-01 SIM-08 the profile shows the army with its bonuses", () => {
  const page = openPage();
  addTroops(page, ["khorngor", "khorne-gor"]);
  // 1 000 Khorngor × 60 + 1 000 Gor de Khorne × 150
  assert.equal(page.metric("power"), "210,000");
  // health per troop: Khorngor 55 × 1 950 / 40 = 2 681.25; Gor 45 × 1 100 / 40 = 1 237.5
  assert.equal(page.metric("health"), "3,918,750");
  // +10 % health, Khorne only: (2 681.25 + 1 237.5) × 1.1 × 1 000
  page.click("#bonus-add");
  page.choose("#bonus-stat-0", "health");
  page.choose("#bonus-target-0", "alignments");
  page.choose("#bonus-value-0", "khorne");
  page.type("#bonus-percent-0", 10);
  assert.equal(page.metric("health"), "4,310,625");
  assert.equal(page.metric("power"), "210,000", "bonuses do not change power");
  // damage: Khorngor 58 × 800 / 200 = 232; Gor 48 × 1 500 / 200 = 360
  assert.equal(page.metric("damage"), "592,000");
  assert.equal(page.$$("#profile-lines tbody tr").length, 2);
});

test("SIM-08 the tanking is split into health and armour; each troop shows its attack and damage", () => {
  const page = openPage();
  addTroops(page, ["khorngor"]);
  // 1 000 Khorngor: health 1 950 each, armour 55
  assert.equal(page.text('[data-metric="health"] .metric-detail'), "health 1,950,000 · average armour 55");
  const cells = () =>
    page.$$("#profile-lines tbody td").map((cell) => [cell.textContent, cell.classList.contains("key")]);
  // at first: count, then the three key figures, highlighted: power, damage per strike, effective health
  assert.deepEqual(cells(), [
    ["1,000", false],
    ["60,000", true],
    ["232,000", true],
    ["2,681,250", true],
  ]);
  // each key column opens its own details: power per troop; attack (melee) and damage; armour and health
  page.click("#details-power");
  page.click("#details-strike");
  page.click("#details-ehp");
  assert.equal(page.$("#details-strike").getAttribute("aria-expanded"), "true");
  assert.deepEqual(
    cells().map(([text]) => text),
    ["1,000", "60,000", "60", "232,000", "58 (Melee)", "800", "2,681,250", "55", "1,950"],
  );
  page.click("#details-strike");
  assert.equal(cells().length, 7, "closing one column's details hides only those");
});

test("GLOSS-01 dotted terms explain themselves, in the page's language", () => {
  const page = openPage();
  const power = page.$('[data-metric="power"] .term');
  power.dispatchEvent(new page.window.Event("focusin", { bubbles: true }));
  assert.equal(page.$("#tip").getAttribute("aria-hidden"), "false");
  assert.match(page.text("#tip"), /^Power/);
  page.click('[data-lang="fr"]');
  page.$('[data-metric="health"] .term').dispatchEvent(new page.window.Event("focusin", { bubbles: true }));
  assert.match(page.text("#tip"), /^Santé effective.*armure × santé \/ 40/);
});

test("ARMY-03 SIM-03 compositions: as many as wanted, any two compared, better in green, weaker in red", () => {
  const page = openPage();
  addTroops(page, ["bestigor-herd"]);
  page.type("#count-bestigor-herd", 10);
  page.click("#composition-tab-1");
  assert.equal(page.$("#count-bestigor-herd"), null, "composition B starts empty");
  addTroops(page, ["marauders"]);
  page.type("#count-marauders", 100);
  page.type("#composition-name", "Swarm");
  assert.equal(page.text("#composition-tab-1"), "Composition Swarm");
  // power: A 10 × 150 = 1,500 (better: green ▲), Swarm 100 × 4 = 400 (weaker: red ▼)
  const cells = () => page.$$("#compare-figures tbody tr")[0].querySelectorAll("td");
  assert.deepEqual(
    [...cells()].map((cell) => [cell.className, cell.textContent.trim()]),
    [
      ["num win", "▲ 1,500 (better)"],
      ["num lose", "▼ 400 (weaker)"],
      ["num", "-1,100"],
    ],
  );
  assert.equal(page.$$("#compare-battles .battle-list li").length, 2);
  // a third composition, duplicated from Swarm (named B, free again), compared with Swarm: all equal, in orange
  page.click("#composition-duplicate");
  assert.equal(page.text("#composition-tab-2"), "Composition B", "the first free name");
  assert.equal(page.$("#count-marauders").value, "100");
  page.choose("#compare-a", 2);
  assert.deepEqual(
    [...cells()].slice(0, 2).map((cell) => cell.className),
    ["num tie", "num tie"],
  );
  // the same composition on both sides: no table
  page.choose("#compare-a", 1);
  assert.match(page.text("#compare-figures"), /Choose two different compositions/);
  // deleting compositions keeps two valid choices
  page.click("#composition-new");
  assert.equal(page.$$("[data-composition]").length, 4);
  page.click("#composition-delete");
  page.click("#composition-tab-2");
  page.click("#composition-delete");
  assert.equal(page.$$("[data-composition]").length, 2);
  assert.deepEqual(
    page.$$("#compare-a option, #compare-b option").map((option) => option.textContent),
    ["A", "Swarm", "A", "Swarm"],
  );
});

test("CFG-01 CFG-02 a setup is saved, loaded back, and refused with reasons when a file is wrong", async () => {
  const page = openPage();
  addTroops(page, ["chimera"]);
  page.type("#save-name", "Raid");
  page.click("#save-button");
  assert.match(page.text("#save-status"), /Saved: Raid/);
  assert.equal(page.$$(".save-line").length, 1);
  page.click("#remove-chimera");
  page.click("#load-0");
  assert.equal(page.$("#count-chimera").value, "1000", "loaded back");
  // a file listing a defence as a troop is refused, with the reason
  const bad = { schemaVersion: 1, game: "chaos-conquest", limits: { marchCapacity: 1 }, sources: [] };
  bad.scenarios = [{ name: "x", troops: { "razor-walls": 5 } }];
  // read with FileReader: jsdom, like some browsers, has no File.text() (DEF-007)
  const input = page.$("#import-file");
  const file = new page.window.File([JSON.stringify(bad)], "bad.json", { type: "application/json" });
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new page.window.Event("change", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.match(page.text("#save-status"), /cannot be loaded.*razor-walls/);
  page.click("#delete-0");
  assert.equal(page.$$(".save-line").length, 0);
});

test("THEME-01 light and dark themes: the button switches and remembers the choice", () => {
  const page = openPage();
  const root = page.window.document.documentElement;
  assert.equal(root.getAttribute("data-theme"), "dark", "dark without a saved choice or system preference");
  assert.equal(page.$("#theme-toggle").getAttribute("aria-label"), "Switch to the light theme");
  page.click("#theme-toggle");
  assert.equal(root.getAttribute("data-theme"), "light");
  assert.equal(page.window.localStorage.getItem("army-simulator.theme"), "light");
  assert.equal(page.$("#theme-toggle").getAttribute("aria-label"), "Switch to the dark theme");
});

test("DASH-01 DASH-02 DASH-03 DASH-04 DASH-05 DASH-06 six dashboards in tabs: efficiency, rounds, balance, map, pros and cons, raiding", () => {
  const page = openPage();
  // efficiency per slot: every troop of the game as a dot; the filters narrow the cloud (tier VI and Khorne: the
  // Khorne Minotaurs and the Chaos Lord of Khorne on Dragon), and a small selection is named in full
  assert.equal(page.$("#dash-tab-efficiency").getAttribute("aria-selected"), "true");
  assert.equal(page.$$("#dash-panel circle").length, 82);
  page.tick("#eff-filter-tier-6");
  page.tick("#eff-filter-alignment-khorne");
  assert.equal(page.$$("#dash-panel circle").length, 2);
  // names show only while the pointer is on a dot
  const name = page.$("#dash-panel [data-hover-name]");
  assert.equal(name.getAttribute("visibility"), "hidden");
  const dot = page.$("#dash-panel .dot");
  dot.dispatchEvent(new page.window.Event("pointerover", { bubbles: true }));
  assert.equal(name.getAttribute("visibility"), "visible");
  assert.equal(name.textContent, dot.getAttribute("data-name"));
  dot.dispatchEvent(new page.window.Event("pointerout", { bubbles: true }));
  assert.equal(name.getAttribute("visibility"), "hidden");
  page.untick("#eff-filter-tier-6");
  page.untick("#eff-filter-alignment-khorne");
  // zoom (DEF-002: "+" once zoomed out): "+" halves both ranges from the bottom-left corner, keeping the crowd and dropping the dragons;
  // "Reset" brings the whole chart back
  page.click("#zoom-in");
  const zoomed = page.$$("#dash-panel circle").length;
  assert.ok(zoomed > 0 && zoomed < 82, `${zoomed} troops in the zoom`);
  assert.ok(page.$("#zoom-reset"), "a reset button once zoomed");
  page.click("#zoom-out");
  page.click("#zoom-reset");
  assert.equal(page.$$("#dash-panel circle").length, 82);
  assert.equal(page.$("#zoom-reset"), null);
  // two compositions with troops for the battles
  addTroops(page, ["bestigor-herd"]);
  page.click("#composition-tab-1");
  addTroops(page, ["marauders"]);
  // the arrow keys move between tabs (ARIA tabs pattern)
  const tabs = page.$(".dash-tabs");
  tabs.dispatchEvent(new page.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  assert.equal(page.$("#dash-tab-rounds").getAttribute("aria-selected"), "true");
  assert.equal(page.$("#dash-tab-efficiency").tabIndex, -1);
  assert.equal(page.$$("#dash-panel table").length, 2, "one table per battle");
  assert.equal(page.$$("#dash-panel table")[0].querySelectorAll("tbody tr").length, 3, "three rounds");
  page.click("#dash-tab-balance");
  assert.ok(page.$$("#dash-panel .share").length > 0);
  assert.equal(page.$("#dash-panel .share-bar span").style.width, "100%", "B holds only Marauders: tier I is 100 %");
  page.click("#dash-tab-map");
  assert.equal(page.$$("#dash-panel circle").length, 1);
  assert.match(page.$("#dash-panel svg").getAttribute("aria-label"), /1 troop types/);
  page.click("#dash-tab-pros");
  assert.ok(page.$$("#dash-panel .pros-list .win").length > 0);
  assert.equal(page.$$("#dash-panel .battle-list li").length, 2);
  // raiding: speed and load per troop, the troops of the composition edited ringed (B: the Marauders)
  page.click("#dash-tab-raid");
  assert.equal(page.$$("#dash-panel circle:not(.map-ring)").length, 82);
  assert.equal(page.$$("#dash-panel .map-ring").length, 1);
  // "highlight": every troop outside composition B (the Marauders) darkened
  page.click("#highlight-toggle");
  assert.equal(page.$("#highlight-toggle").getAttribute("aria-pressed"), "true");
  assert.equal(page.$$("#dash-panel .dot.dimmed").length, 81);
  page.click("#highlight-toggle");
  assert.equal(page.$$("#dash-panel .dot.dimmed").length, 0);
  assert.match(page.$("#dash-panel svg").getAttribute("aria-label"), /speed and load/);
});

test("REL-02 the page shows its version, major.minor of package.json", () => {
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const page = openPage({ saved: "fr" });
  assert.equal(page.text(".version"), `v${version.split(".").slice(0, 2).join(".")}`);
  assert.equal(page.text(".version"), "v1.0");
  assert.match(page.text("h1"), /^Simulateur d'armée v1\.0$/, "switching language keeps the version");
});

test("CFG-01 DEF-015 a save list another tab changed: a click loads nothing wrong, and the list is redrawn", () => {
  const page = openPage();
  page.type("#save-name", "Raid");
  page.click("#save-button");
  page.window.localStorage.setItem("army-simulator.saves", "[]"); // deleted in another tab
  page.click("#load-0");
  assert.equal(page.$$(".save-line").length, 0);
});

test("CFG-02 DEF-022 the exported file's address is revoked after the click, not during it", async () => {
  const page = openPage();
  const revoked = [];
  Object.assign(page.window.URL, { createObjectURL: () => "blob:army", revokeObjectURL: (url) => revoked.push(url) });
  page.click("#export-button");
  assert.deepEqual(revoked, []);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(revoked, ["blob:army"]);
});

test("DASH-01 DEF-018 a zoom drag the browser cancels leaves no box on the chart", () => {
  const page = openPage();
  page.click("#dash-tab-efficiency");
  const svg = page.$("#dash-panel svg[data-frame]");
  svg.dispatchEvent(new page.window.MouseEvent("pointerdown", { bubbles: true, button: 0 }));
  assert.ok(page.$("#dash-panel .zoom-box"), "the box drawn while dragging");
  svg.dispatchEvent(new page.window.MouseEvent("pointercancel", { bubbles: true }));
  assert.equal(page.$("#dash-panel .zoom-box"), null);
});

test("DASH-01 DEF-024 a pointer the chart cannot capture still leaves no box once cancelled", () => {
  const page = openPage();
  const svg = page.$("#dash-panel svg[data-frame]");
  svg.setPointerCapture = () => {
    throw new page.window.DOMException("No active pointer", "NotFoundError");
  };
  svg.dispatchEvent(new page.window.MouseEvent("pointerdown", { bubbles: true, button: 0 }));
  svg.dispatchEvent(new page.window.MouseEvent("pointercancel", { bubbles: true }));
  assert.equal(page.$("#dash-panel .zoom-box"), null);
});
