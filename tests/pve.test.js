// A PvE army as the battle's second side (SIM-11, BL-20, docs/spec/pve.md): its troops read like ours, a place chosen
// by kind, name and level, its troops sub-selected (Frantz, 2026-11-10), only your attack fought. Figures from
// data/chaos-conquest/pve.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAMES } from "../src/ui/games.js";
import { placesOf, pveCatalogue, pveRaces, raceTalentEffects } from "../src/ui/pve.js";
import { addTroops, openPage } from "./page.js";

const [game] = GAMES;
const goblins = game.pve.places.find((place) => place.labels.en === "Goblin Army" && place.level === 3);

test("SIM-11 DEF-043 every PvE troop reads as a troop: its type, attack, morale and power known; no march, no upkeep", () => {
  const { units } = pveCatalogue(game);
  for (const place of game.pve.places) {
    for (const id of Object.keys(place.troops)) assert.ok(units.has(id), `${place.id}: ${id}`);
  }
  const unknown = game.pve.troops.filter(
    (troop) => !troop.unitType || !troop.attackType || !(troop.stats.morale > 0) || !(troop.stats.squadPower > 0),
  );
  assert.deepEqual(
    unknown.map((troop) => troop.id),
    [],
    "the cities' Marauders… are ours: units.json says",
  );
  // units.json: the Marauder, morale 56, power 4; the cities' woc-infantry-tier-1 is it
  assert.deepEqual(
    [units.get("woc-infantry-tier-1").unitType, units.get("woc-infantry-tier-1").stats.morale],
    ["infantry", 56],
  );
  assert.equal(units.get(goblins && Object.keys(goblins.troops)[0]).stats.speed, 0);
  assert.ok(
    placesOf(game, "army").every((place) => Object.keys(place.troops).length > 0),
    "the empty army left out",
  );
});

test("SIM-11 DEF-062 a PvE troop's power is its tier's, as ours: the rank 15 Greenskin Army weighs what the game says", () => {
  const { units } = pveCatalogue(game);
  // ours: one power per troop for each tier
  for (const troop of game.pve.troops) {
    const ours = game.units.find((unit) => unit.tier === troop.tier);
    assert.equal(troop.stats.squadPower, ours.stats.squadPower, troop.id);
  }
  // the game's battle report (2026-11-17): 4,500,000 troops, power 130,000,000; 805,919 killed, all of tier 3, for
  // 20,147,975 power lost (25 each)
  const army = game.pve.places.find((place) => place.id === "army-southern-empire-rank-15-orc-boarboyz-event-1");
  const power = Object.entries(army.troops).reduce(
    (sum, [id, count]) => sum + count * units.get(id).stats.squadPower,
    0,
  );
  assert.equal(power, 130_000_000);
  assert.equal(805_919 * units.get("oag-cavalry-tier-3-a").stats.squadPower, 20_147_975);
});

function versusGoblins() {
  const page = openPage();
  addTroops(page, ["marauders"]);
  page.choose("#compare-b", "pve");
  page.choose("#pve-kind", "army");
  page.choose("#pve-name", "Goblin Army");
  page.choose("#pve-level", 3);
  return page;
}

test("SIM-11 a PvE army chosen by kind, place and level: its troops listed, only your attack fought", () => {
  const page = versusGoblins();
  assert.ok(!page.$("#compare-pve").hidden);
  assert.deepEqual(
    page.$$("#compare-pve [data-pve-keep]").map((box) => box.dataset.pveKeep),
    Object.keys(goblins.troops),
  );
  const battles = page.$$("#compare-battles .battle-list li");
  assert.equal(battles.length, 1, "you attack; it never comes to you");
  assert.match(page.text("#compare-battles .battle-title"), /Goblin Army, level 3/);
  assert.match(page.text("#compare-battles"), /never comes to you/);
});

test("SIM-25 the battle in full: a victory with its survivors, the losses per troop of both sides as the report gives them", () => {
  const page = versusGoblins();
  // 1,000 Marauders against the Goblin Army, level 3 (1,750 troops): not wiped out, so the survivors are said
  assert.match(
    page.text("#compare-battles .battle-verdict"),
    /^Goblin Army, level 3 wins: [\d,]+ troops of the other side survive, of 1,000 \(\d+(\.\d)? %\)$/,
  );
  assert.match(
    page.text("#compare-battles .battle-losses summary"),
    /^Losses per troop: A [\d,]+ of 1,000 · Goblin Army, level 3 [\d,]+ of 1,750$/,
  );
  // each side a table: every troop line sent = lost + left, the totals adding up
  const tables = page.$$("#compare-battles .battle-losses table");
  assert.equal(tables.length, 2);
  for (const table of tables) {
    const rows = [...table.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((cell) => Number(cell.textContent.replace(/,/g, ""))),
    );
    for (const [sent, lost, left] of rows) assert.equal(sent, lost + left);
    const total = rows.pop();
    assert.deepEqual(
      total,
      [0, 1, 2].map((column) => rows.reduce((sum, row) => sum + row[column], 0)),
    );
  }
  assert.match(tables[0].textContent, /Marauder1,000/);
});

test("SIM-11 its troops sub-selected: one left out or lowered changes the battle; the whole army puts it back", () => {
  const page = versusGoblins();
  const losses = () => page.text("#compare-battles .battle-list .meta");
  const whole = losses();
  const [first] = Object.keys(goblins.troops);
  page.type(`#pve-count-${first}`, Math.floor(goblins.troops[first] / 2));
  const halved = losses();
  assert.notEqual(halved, whole, "a count lowered");
  page.untick(`[data-pve-keep="${first}"]`);
  assert.ok(page.$(`#pve-count-${first}`).disabled, "left out");
  assert.notEqual(losses(), halved);
  page.click("#pve-whole");
  assert.equal(losses(), whole, "back to the whole army");
  page.choose("#compare-b", 1);
  assert.ok(page.$("#compare-pve").hidden, "a composition again");
});

test("SIM-11 a warlord's Combat Bonus vs. Empire counts against an army all of the Empire, and only then", () => {
  const talents = { chosen: ["empire-combat"], offered: [{ id: "empire-combat", percent: 10 }] };
  const { talentCodes } = game.game;
  const raised = raceTalentEffects(talents, talentCodes, new Set(["empire"]));
  // game.json: a "combat" bonus raises every fighting stat (open question 16's lead, to verify)
  assert.deepEqual(
    raised.map((effect) => `${effect.stat} +${effect.percent}`),
    ["meleeAttack +10", "meleeDamage +10", "rangedAttack +10", "rangedDamage +10", "armour +10", "health +10"],
  );
  assert.deepEqual(raceTalentEffects(talents, talentCodes, new Set(["empire", "kislev"])), [], "Bechafen: not all");
  assert.deepEqual(raceTalentEffects(talents, talentCodes, new Set(["greenskins"])), []);
  const altdorf = game.pve.places.find((place) => place.id === "altdorf");
  assert.deepEqual([...pveRaces({ pve: { troops: altdorf.troops } }, game)], ["empire"]);
  // warlords.json: Slambo is the one warlord to offer it
  assert.ok(game.heroes.warlords.find((warlord) => warlord.id === "slambo").talents["empire-combat"]);
});
