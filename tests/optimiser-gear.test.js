// The champion's pieces owned (SIM-26, D-52): read in a setup file beside the pieces worn, each checked as they are;
// then the optimiser puts on each slot the piece that serves the army found, the setup itself left as it was. On a
// made-up setup: a Nurgle army, a champion in an Undivided chest, a Nurgle chest owned.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readSetupFile } from "../src/storage/setup-file.js";
import { openPage } from "./page.js";

const GAME = "chaos-conquest";
const read = (path) => JSON.parse(readFileSync(new URL(`../data/${GAME}/${path}`, import.meta.url), "utf8"));
const games = { [GAME]: { game: read("game.json"), champion: read("champion.json"), warlords: new Map() } };
const file = (champion) => ({ format: "army-simulator/setup", version: 1, game: GAME, champion });

test("SIM-26 a setup file's pieces owned: read as the worn ones, an unknown piece or level refused", () => {
  const kept = readSetupFile(file({ owned: [{ id: "maggot-plate-of-rot", level: 2 }] }), games);
  assert.deepEqual(kept.sections.champion, { owned: [{ id: "maggot-plate-of-rot", level: 2 }] });
  const wrong = readSetupFile(
    file({
      owned: [
        { id: "maggot-plate-of-rott", level: 2 },
        { id: "cleaver-of-bile", level: 9 },
      ],
    }),
    games,
  );
  assert.deepEqual(
    wrong.problems.map(({ path, code, suggestion }) => [path, code, suggestion]),
    [
      ["champion.owned[0].id", "unknown-gear", "maggot-plate-of-rot"],
      ["champion.owned[1].level", "out-of-range", undefined],
    ],
  );
});

const SETUP_KEY = "army-simulator.player-setup";
const setup = (champion) => ({
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  troops: [{ id: "pestigor", count: 60000 }],
  champion,
});

function run(champion) {
  const page = openPage({ stored: { [SETUP_KEY]: JSON.stringify({ [GAME]: setup(champion) }) } });
  page.tick("#load-setup-toggle");
  page.click("#optimiser-run");
  return page;
}

test("SIM-26 the optimiser puts on the piece owned that serves the army: a Nurgle chest for Nurgle troops", () => {
  const worn = [{ id: "runesmith-chest", level: 1 }];
  const page = run({ level: 40, gear: worn, owned: [{ id: "maggot-plate-of-rot", level: 3 }] });
  const block = '#opt-panel-have [data-block="champion"]';
  assert.match(page.text(block), /^Champion level 40 · −[\d.]+ % without it · pieces to change: 1/);
  assert.match(page.text(block), /Gear chosen for this army among your pieces: 1 changed, \+[\d.]+ % on the army/);
  const chest = page.$$(`${block} .opt-gear`)[1].textContent.replace(/\s+/g, " ");
  assert.match(chest, /Instead of Corrupted Runic Plate \(Core\), worn.*Maggot Plate of Rot.*Nurgle/);
  // the setup itself keeps the gear worn: the player puts the pieces on in the game
  const saved = JSON.parse(page.window.localStorage.getItem(SETUP_KEY))[GAME];
  assert.deepEqual(saved.champion.gear, worn);
});

test("SIM-26 without pieces owned the gear worn stays, and nothing is said of a choice", () => {
  const page = run({ level: 40, gear: [{ id: "runesmith-chest", level: 1 }] });
  const text = page.text('#opt-panel-have [data-block="champion"]');
  assert.doesNotMatch(text, /Gear chosen|pieces to change|already the best/);
  assert.match(text, /Corrupted Runic Plate/);
});
