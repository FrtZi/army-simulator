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

test("CFG-05 a partial file reviewed before anything changes: what it brings, each value left out and why", async () => {
  const page = openPage();
  page.choose("#setup-warlord-select", "karanak");
  page.click("#setup-warlord-add");
  page.click("#setup-save");
  await upload(
    page,
    setupFile({
      warlords: [
        { id: "azazel", rank: 5, level: 4 },
        { id: "Azazael", rank: 1, level: 1 },
        { id: "skulltaker", rank: 8, level: 1 },
      ],
      capacity: { base: 110000 },
      rituals: [{ id: "defence-capacity-1", level: 10 }],
    }),
  );
  const lines = page.$$("#setup-review li").map((line) => line.textContent);
  assert.deepEqual(lines, [
    "Heroes: 1 added, 0 updated, 0 unchanged, 1 kept",
    "March capacity: 1 values changed",
    "Rituals: kept, used from version 1.2",
    'warlords[1].id, read "Azazael": no hero has this id; did you mean Azazel (azazel)?',
    "warlords[2].rank, read 8: outside 1 to 7.",
  ]);
  assert.equal(page.$$("#setup-warlord-list .name").length, 1, "nothing changes before Apply");
  page.click("#setup-import-apply");
  assert.deepEqual(
    page.$$("#setup-warlord-list .name").map((name) => name.textContent),
    ["Karanak", "Azazel"],
    "added beside the one already there, which is kept",
  );
  assert.match(page.text("#setup-warlord-list li:last-child .meta"), /level 24/);
  // a hero added, the capacity's base, the rituals (kept for 1.2): three changes not saved yet
  assert.equal(page.text("#setup-status"), "⚠ 3 unsaved changes: Save keeps them in this browser.");
  assert.match(page.text("#setup-review"), /Applied: the changes show in your setup, not saved yet\./);
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
  assert.match(page.text("#setup-review"), /Heroes: 0 added, 0 updated, 1 unchanged, 0 kept/);
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
