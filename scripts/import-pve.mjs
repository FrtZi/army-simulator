// Imports the game's computer-controlled armies from cctools.cc's saved answers (D-25, BL-20) into
// data/<game>/pve.json: the troops they field (each with its tier and stats as the compositions give them, its type,
// attack and morale from the PvE troops' page where it lists them) and the places (armies, raids, cities), each at
// its level with its exact composition. Opponents for the Battle lab once the spec is agreed (BL-20).
//
//   node scripts/import-pve.mjs   reads captures/<game>/sources/cctools/armies/ (saved, never committed) and writes
//                                 data/<game>/pve.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { pageData } from "./cctools.mjs";
import { readGame } from "./import-warlords.mjs";
import { kebab, labels } from "./levels.mjs";

const GAME = "chaos-conquest";
const root = new URL("../", import.meta.url);
const SAVED = new URL(`captures/${GAME}/sources/cctools/armies/`, root);
const OUTPUT = new URL(`data/${GAME}/pve.json`, root);
const SOURCE =
  "cctools.cc, the PvE armies' compositions and troops (D-25); written by scripts/import-pve.mjs: never edit by hand";
// a composition's figures, and our stats' ids
const STATS = { melee_attack: "meleeAttack", melee_damage: "meleeDamage", ranged_attack: "rangedAttack" };
Object.assign(STATS, { ranged_damage: "rangedDamage", health: "health", armour: "armour" });

/** A troop type of the PvE list as our vocabulary names it (game.json's unit types), else from its name. */
const unitTypeOf = (name, game) => game.unitTypes.find((type) => type.labels.en === name)?.id ?? kebab(name);

/** One troop: its tier and stats from a composition, its type, attack and morale from the PvE troops' list if there. */
function troopOf(entry, listed, game) {
  const stats = Object.fromEntries(Object.entries(STATS).map(([field, stat]) => [stat, entry[field]]));
  const known = listed.get(entry.troop_code);
  return {
    id: kebab(entry.troop_code),
    code: entry.troop_code,
    labels: labels(entry.troop_name),
    tier: entry.tier,
    unitType: known ? unitTypeOf(known.unit_type, game) : null,
    attackType: known ? known.combat_type.toLowerCase() : null,
    race: known?.race_code ?? null,
    stats: { ...stats, morale: known?.morale ?? null, squadPower: known?.squad_power ?? null },
  };
}

export function buildPve(places, answers, npcTroops, game) {
  const listed = new Map(npcTroops.map((troop) => [troop.code, troop]));
  const troops = new Map();
  const found = places.map((place) => {
    const composition = answers.get(place.id)?.composition ?? [];
    for (const entry of composition) troops.set(entry.troop_code, troopOf(entry, listed, game));
    return {
      id: kebab(place.code),
      kind: place.location_type,
      labels: labels(place.display_name),
      level: place.level,
      race: place.race_code,
      troops: Object.fromEntries(composition.map((entry) => [kebab(entry.troop_code), entry.quantity])),
    };
  });
  const byId = (a, b) => a.id.localeCompare(b.id);
  return { source: SOURCE, troops: [...troops.values()].sort(byId), places: found.sort(byId) };
}

/** One troop and one place per line. */
export const formatPve = ({ source, troops, places }) =>
  `{\n  "source": ${JSON.stringify(source)},\n  "troops": [\n${troops.map((troop) => `    ${JSON.stringify(troop)}`).join(",\n")}\n  ],\n  "places": [\n${places.map((place) => `    ${JSON.stringify(place)}`).join(",\n")}\n  ]\n}\n`;

/** The saved answers: the places' list, each place's composition, the PvE troops' page. */
export function savedPve(folder = SAVED) {
  const places = JSON.parse(readFileSync(new URL("places.json", folder), "utf8"));
  const answers = new Map(
    readdirSync(folder)
      .filter((file) => /^\d+\.json$/.test(file))
      .map((file) => [Number.parseInt(file, 10), JSON.parse(readFileSync(new URL(file, folder), "utf8"))]),
  );
  const npcTroops = pageData(readFileSync(new URL("npc-troops.html", folder), "utf8")).troops;
  return { places, answers, npcTroops };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { places, answers, npcTroops } = savedPve();
  const data = buildPve(places, answers, npcTroops, readGame());
  writeFileSync(OUTPUT, formatPve(data));
  console.log(`✓ ${data.places.length} PvE places, ${data.troops.length} troops`);
}
