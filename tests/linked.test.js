// Every branch linked (D-45, DEF-048; Frantz, 2026-11-16: "these parameters, even in different branches, are all
// linked"): a talent that raises the march capacity lets troops in, in the search and in the path. On the published
// page in jsdom, with Your setup loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./page.js";

const GAME = "chaos-conquest";
const level20 = (id) => ({ id, rank: 4, level: 5 }); // 5 levels a rank, as a setup file says it
const setup = (warlords) => ({
  format: "army-simulator/setup",
  version: 1,
  game: GAME,
  capacity: { base: 50000 },
  warlords: warlords.map(level20),
  troops: [{ id: "khorngor", count: 80000 }], // more troops owned than places
});

function run(warlords) {
  const page = openPage({ stored: { "army-simulator.player-setup": JSON.stringify({ [GAME]: setup(warlords) }) } });
  page.tick("#load-setup-toggle");
  page.choose("#optimiser-goal", "power");
  page.click("#optimiser-run");
  return page;
}

test("SIM-05 DEF-048 a talent raising the march capacity lets troops in: the search takes it", () => {
  const page = run(["chosen-standard-bearer", "doom-knight", "daemon-prince", "chosen-champion"]);
  // the Chosen Standard Bearer at level 20: march capacity +3.3 %, 50,000 × 1.033 = 51,650 places, all filled
  assert.match(page.text("#optimiser-result"), /Troops: 51,650 of 51,650/);
  assert.match(page.text("#optimiser-result"), /Heroes .*Chosen Standard Bearer/);
});

test("SIM-12 DEF-048 a hero raising the march capacity: its next level counted with the troops it lets in", () => {
  const page = run(["chosen-standard-bearer", "doom-knight", "daemon-prince", "chosen-champion"]);
  const steps = page.$$("#optimiser-path li").map((step) => step.textContent);
  // army power 51,650 Khorngor × 60 ≈ 3.1 million; the Bearer at 21: its own power +500 (+0.02 %), and its talent
  // 3.3 → 3.5 %, 100 places more, +6,000 power (+0.19 %): +0.2 % with its troops, "< 0.1 %" without them
  assert.match(steps[0], /^Raise Chosen Standard Bearer from level 20 to 21 · ▲ \+0\.2 % · costs /, steps.join("\n"));
});
