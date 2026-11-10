// Your setup's files on the published page in jsdom (CFG-05, CFG-06, D-27): a file uploaded, reviewed, applied or
// cancelled; the setup, an empty file and the agent's brief downloaded; the brief copied where the browser allows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./page.js";

const GAME = "chaos-conquest";
const setupFile = (sections) => ({ format: "army-simulator/setup", version: 1, game: GAME, ...sections });
const settle = () => new Promise((resolve) => setTimeout(resolve, 50)); // FileReader answers after the event

/** Picks a file on the upload, as the player would; jsdom, like some browsers, reads it with FileReader (DEF-007). */
async function upload(page, content, name = "mine.json") {
  const input = page.$("#setup-import");
  const text = typeof content === "string" ? content : JSON.stringify(content);
  Object.defineProperty(input, "files", { value: [new page.window.File([text], name)], configurable: true });
  input.dispatchEvent(new page.window.Event("change", { bubbles: true }));
  await settle();
}

/** What the page offers to download: each file's name and text. */
function downloads(page) {
  const files = [];
  const blobs = [];
  Object.assign(page.window.URL, {
    createObjectURL: (blob) => blobs.push(blob) && `blob:${blobs.length}`,
    revokeObjectURL: () => {},
  });
  page.window.HTMLAnchorElement.prototype.click = function () {
    const blob = blobs[Number(this.href.split(":")[1]) - 1];
    const reader = new page.window.FileReader();
    reader.onload = () => files.push({ name: this.download, text: reader.result });
    reader.readAsText(blob);
  };
  return files;
}

const textOf = (element) => element.textContent.replace(/\s+/g, " ").trim();
const rows = (page) => page.$$("#setup-review .report-row").map(textOf);
/** Each parked value: what was read, and what its list has chosen. */
const parked = (page) =>
  page
    .$$(".parked-row")
    .map((row) => `${textOf(row.querySelector("span"))} → ${textOf(row.querySelector("option:checked"))}`);
const chooseParked = (page, path, name) => {
  const select = page.$(`[data-parked="${path}"]`);
  const option = [...select.options].find((entry) => entry.textContent === name);
  select.focus(); // as the player does: the list rebuilt under it must keep the focus
  page.choose(`#${select.id}`, option.value);
};

test("CFG-05 a partial file reviewed before anything changes: what it brings, in colour with its words", async () => {
  const page = openPage();
  page.choose("#setup-warlord-select", "karanak");
  page.click("#setup-warlord-add");
  page.click("#setup-save");
  await upload(
    page,
    setupFile({
      warlords: [{ id: "azazel", rank: 5, level: 4 }],
      capacity: { base: 110000 },
      bonuses: [{ stat: "health", percent: 150 }],
      rituals: [{ id: "defense-capacity-1", level: 10 }],
    }),
  );
  assert.deepEqual(rows(page), [
    "Heroes + 1 added • 1 kept",
    "March capacity ↻ 1 values changed",
    "Bonuses = nothing to apply",
    "Rituals + 1 added",
  ]);
  assert.equal(page.$$(".chip-added").length, 2, "each addition stands out in its colour: a hero, a ritual");
  assert.deepEqual(page.$$(".left-list li").map(textOf), [
    'bonuses[0], read {"stat":"health","percent":150}: Enter a percentage from 0 to 100.',
  ]);
  assert.equal(page.$$("#setup-warlord-list .name").length, 1, "nothing changes before Apply");
  page.click("#setup-import-apply");
  assert.deepEqual(
    page.$$("#setup-warlord-list .name").map((name) => name.textContent),
    ["Karanak", "Azazel"],
    "added beside the one already there, which is kept",
  );
  assert.match(page.text("#setup-warlord-list li:last-child .meta"), /level 24/);
  // a hero added, the capacity's base, the rituals: three changes not saved yet
  assert.equal(page.text("#setup-status"), "⚠ 3 unsaved changes: Save keeps them in this browser.");
  assert.match(page.text("#setup-review"), /Applied: the changes show in your setup, not saved yet\./);
});

test("CFG-05 a value a list can fix is parked: the nearest chosen for a misread name, the player chooses or leaves it out", async () => {
  const page = openPage();
  page.click("#page-tab-setup"); // shown: its controls can take the focus
  await upload(
    page,
    setupFile({
      warlords: [
        { id: "Azazael", rank: 5, level: 4 },
        { id: "skulltaker", rank: 8, level: 1 },
      ],
      bonuses: [{ stat: "meleeAtack", percent: 10, target: { unitTypes: ["infantery"] } }],
    }),
  );
  assert.deepEqual(parked(page), [
    'warlords[0].id, read "Azazael": no hero has this id. → Azazel',
    "warlords[1].rank, read 8: outside 1 to 7. → Leave it out",
    'bonuses[0].stat, read "meleeAtack": Unknown stat. → Melee Attack',
    'bonuses[0].target.unitTypes[0], read "infantery": Choose a value. → Infantry',
  ]);
  assert.deepEqual(rows(page), ["Heroes + 1 added", "Bonuses + 1 added"], "the nearest values count already");
  chooseParked(page, "warlords[1].rank", "3");
  assert.deepEqual(rows(page)[0], "Heroes + 2 added");
  assert.equal(page.$("[data-parked='warlords[1].rank']").id, page.window.document.activeElement.id, "focus kept");
  chooseParked(page, "warlords[0].id", "Leave it out");
  assert.deepEqual(rows(page)[0], "Heroes + 1 added");
  page.click("#setup-import-apply");
  assert.deepEqual(
    page.$$("#setup-warlord-list .name").map((name) => name.textContent),
    ["Skulltaker"],
  );
  assert.match(page.text("#setup-warlord-list .meta"), /level 11/); // rank 3, level 1
});

test("CFG-05 BONUS-04 a misread ritual gets the nearest, a level beyond a ritual's last waits for the player", async () => {
  const page = openPage();
  await upload(
    page,
    setupFile({
      rituals: [
        { id: "cavalry-and-chariot-moral", level: 4 }, // misread: the nearest is Armoured Zeal's id
        { id: "cavalry-and-chariot-health", level: 12 }, // 10 levels (rituals.json)
      ],
      buildings: [{ id: "beastmen-herdstone", level: 40 }],
    }),
  );
  assert.deepEqual(parked(page), [
    'rituals[0].id, read "cavalry-and-chariot-moral": no ritual has this id. → Armoured Zeal',
    "rituals[1].level, read 12: outside 0 to 10. → Leave it out",
  ]);
  assert.deepEqual(rows(page), ["Rituals + 1 added", "Buildings + 1 added"]);
  chooseParked(page, "rituals[1].level", "10");
  assert.deepEqual(rows(page)[0], "Rituals + 2 added");
});

test("CFG-05 Cancel leaves the setup as it was; a file that cannot be read says why in one line", async () => {
  const page = openPage();
  await upload(page, setupFile({ warlords: [{ id: "azazel", rank: 1, level: 1 }] }));
  page.click("#setup-import-cancel");
  assert.equal(page.$$("#setup-warlord-list .name").length, 0);
  assert.equal(page.text("#setup-review"), "");
  const refused = {
    "{not json": "notes.txt was not read: it is not a JSON file.",
    [JSON.stringify({ scenarios: [] })]:
      "notes.txt was not read: it is not a setup file (its format should be army-simulator/setup).",
    [JSON.stringify({ ...setupFile({}), version: 2 })]:
      "notes.txt was not read: it is of another version of the setup file (2).",
  };
  for (const [content, said] of Object.entries(refused)) {
    await upload(page, content, "notes.txt");
    assert.equal(page.text("#setup-review"), `⚠ ${said}`);
  }
});

test("CFG-05 CFG-06 the setup, an empty file and the brief downloaded; the setup's file reads back the same", async () => {
  const page = openPage();
  const files = downloads(page);
  page.choose("#setup-warlord-select", "azazel");
  page.click("#setup-warlord-add");
  page.choose("#setup-rank-azazel", 5);
  page.click("#setup-export");
  page.click("#setup-template");
  page.click("#setup-brief-download");
  await settle();
  const [setup, empty, brief] = files;
  assert.equal(setup.name, `army-simulator-setup-${GAME}.json`);
  assert.deepEqual(JSON.parse(setup.text).warlords, [{ id: "azazel", rank: 5, level: 1 }]);
  assert.deepEqual(JSON.parse(empty.text).warlords, []);
  assert.match(brief.text, /^You are filling in a setup file/);
  assert.match(brief.text, /# Data dictionary: Army Simulator setup, version 1/);
  assert.equal(page.text("#setup-files-status"), `Downloaded: army-simulator-brief-${GAME}.md.`);
  // the downloaded file uploaded again changes nothing
  await upload(page, setup.text);
  assert.deepEqual(rows(page).slice(0, 2), ["Heroes = 1 unchanged", "March capacity = nothing to apply"]);
  assert.match(page.text("#setup-review"), /Nothing in this file changes your setup\./);
  assert.equal(page.$("#setup-import-apply"), null, "nothing to apply");
});

test("CFG-07 an example file and the dictionary downloaded; the brief names the screens and what it leaves out", async () => {
  const page = openPage();
  const files = downloads(page);
  page.click("#setup-example");
  page.click("#setup-dictionary-download");
  page.click("#setup-brief-download");
  await settle();
  const [example, dictionary, brief] = files;
  assert.equal(example.name, `army-simulator-setup-example-${GAME}.json`);
  const sections = ["warlords", "capacity", "bonuses", "rituals", "buildings", "champion"];
  assert.deepEqual(
    sections.filter((section) => !JSON.parse(example.text)[section]),
    [],
    "every section filled in",
  );
  assert.match(dictionary.text, /^# Data dictionary: Army Simulator setup/);
  assert.match(brief.text, /The screens to read, and how:\n- Your warlords/);
  assert.match(brief.text, /The Chaos Keep \(in French Donjon du Chaos\), Combat tab/);
  assert.match(brief.text, /a node bright and ticked is at its top level/);
  assert.match(brief.text, /Not part of the setup: the troops you own/);
  // the example is a file the page reads without refusing anything
  await upload(page, example.text);
  assert.doesNotMatch(page.text("#setup-review"), /left out|to check/i);
  assert.ok(page.$("#setup-import-apply"), "something to apply");
});

test("CFG-06 the brief is copied where the browser allows it; elsewhere the page says to download it", async () => {
  const page = openPage();
  await page.$("#setup-brief-copy").click();
  await settle();
  assert.equal(page.text("#setup-files-status"), "This browser did not let the page copy: download the brief instead.");
  let copied = "";
  Object.defineProperty(page.window.navigator, "clipboard", {
    value: { writeText: async (text) => (copied = text) },
  });
  page.click("#setup-brief-copy");
  await settle();
  assert.equal(page.text("#setup-files-status"), "The brief is copied: paste it to the agent with your screenshots.");
  assert.match(copied, /`"azazel"`: Azazel/);
});
