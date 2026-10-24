// Imports the game's warlords from cctools.cc (D-25) into data/<game>/warlords.json, in the format of
// docs/data-model.md: one list of 35 values per stat and talent, level 1 first.
//
//   node scripts/import-warlords.mjs     reads captures/<game>/sources/cctools/warlords/*.html (saved pages,
//                                        never committed) and writes data/<game>/warlords.json
//
// A talent's effect is worked out from its game code (chaos_slaanesh_health_modifier → health, target
// alignments slaanesh); the codes that cannot be are named by hand in game.json's talentCodes. An unknown code,
// stat or value stops the import: nothing is guessed.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const GAME = "chaos-conquest";
const root = new URL("../", import.meta.url);
const PAGES = new URL(`captures/${GAME}/sources/cctools/warlords/`, root);
const OUTPUT = new URL(`data/${GAME}/warlords.json`, root);
const LEVELS = 35;
const SOURCE = "cctools.cc, the warlords' pages (D-25); written by scripts/import-warlords.mjs: never edit by hand";
const ALIASES = { defenses: "defences" }; // the game's codes spell it the American way
const ENTITIES = { "&quot;": '"', "&#039;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&" };

const camel = (snake) => snake.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());
const snake = (camelCase) => camelCase.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const kebab = (text) => text.replace(/_/g, "-");
const ids = (list) => list.map((entry) => entry.id);
const percent = (modifier) => Math.round(modifier * 1000) / 10; // 0.015 → 1.5, without float noise

/** A saved page's data (Inertia's data-page attribute). */
export function pageData(html) {
  const match = html.match(/data-page="([^"]*)"/);
  if (!match) throw new Error("no data-page in the saved page");
  return JSON.parse(match[1].replace(/&(quot|#039|lt|gt|amp);/g, (entity) => ENTITIES[entity])).props;
}

/** What a talent code does, as an effect shape: { id, code, stat, target? }, or the hand-named entry. */
export function talentOf(code, game) {
  const named = game.talentCodes.find((entry) => entry.code === code);
  if (named) return { id: named.id };
  const body = code.replace(/_modifier$/, "");
  const stat = ids(game.troopStats)
    .filter((id) => body.endsWith(`_${snake(id)}`))
    .sort((a, b) => b.length - a.length)[0];
  if (!stat) throw new Error(`talent ${code}: no stat of game.json`);
  const holder = body.slice(0, -snake(stat).length - 1);
  if (holder === "march") return { id: `march-${kebab(snake(stat))}`, code, stat };
  const god = holder.replace(/^chaos_/, "");
  if (holder.startsWith("chaos_") && ids(game.alignments).includes(god)) {
    return { id: `${god}-${kebab(snake(stat))}`, code, stat, target: { alignments: [god] } };
  }
  const type = ALIASES[holder] ?? kebab(holder);
  if (!ids(game.unitTypes).includes(type)) throw new Error(`talent ${code}: no god or troop type "${holder}"`);
  return { id: `${type}-${kebab(snake(stat))}`, code, stat, target: { unitTypes: [type] } };
}

/** One warlord, from its page's data: every per-level figure as a list of 35 values. */
export function warlordOf(data, game, talents) {
  const { warlord, levelData } = data;
  const levels = Object.values(levelData).sort((a, b) => a.summary.level - b.summary.level);
  if (levels.length !== LEVELS) throw new Error(`${warlord.slug}: ${levels.length} levels`);
  const stats = {};
  const own = {};
  levels.forEach((level, index) => {
    for (const { code, value } of level.attributes) {
      if (!ids(game.troopStats).includes(camel(code))) throw new Error(`${warlord.slug}: unknown stat ${code}`);
      (stats[camel(code)] ??= Array(LEVELS).fill(null))[index] = value;
    }
    for (const { code, modifier } of level.stats) {
      const talent = talentOf(code, game);
      if (talent.code) talents.set(talent.id, talent);
      (own[talent.id] ??= Array(LEVELS).fill(null))[index] = percent(modifier);
    }
  });
  const alignment = warlord.race_code.replace(/^chaos_/, "");
  return {
    id: warlord.slug,
    labels: { en: warlord.display_name, fr: `${warlord.display_name}*` }, // English until read in French (D-08)
    alignment,
    rarity: warlord.rarity_meta.key,
    tier: levels.map((level) => level.summary.tier),
    power: levels.map((level) => level.summary.power),
    stats,
    talents: own,
  };
}

/** The whole file: the talents worked out from their codes, then the warlords, both sorted by id. */
export function buildWarlords(pages, game) {
  const talents = new Map();
  const warlords = pages.map((data) => warlordOf(data, game, talents)).sort((a, b) => a.id.localeCompare(b.id));
  const sortedTalents = [...talents.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { source: SOURCE, talents: sortedTalents, warlords };
}

/** A value on one line, spaced like the rest of the file: {"id": "x", "target": {"unitTypes": ["cavalry"]}}. */
const oneLine = (value) =>
  JSON.stringify(value, null, 1)
    .replace(/\n\s*/g, " ")
    .replace(/([[{]) /g, "$1")
    .replace(/ ([\]}])/g, "$1");

/** JSON where each talent, each label and each list of values sits on one line: a warlord reads as a block. */
export function formatWarlords({ source, talents, warlords }) {
  const blocks = JSON.stringify(warlords, null, 2)
    .replace(/\[[^[\]{}]*\]/g, (list) => oneLine(JSON.parse(list)))
    .replace(/\{[^{}]*\}/g, (object) => (object.includes("[") ? object : oneLine(JSON.parse(object))))
    .replace(/\n/g, "\n  ");
  const talentLines = talents.map((talent) => `    ${oneLine(talent)}`).join(",\n");
  return `{\n  "source": ${JSON.stringify(source)},\n  "talents": [\n${talentLines}\n  ],\n  "warlords": ${blocks}\n}\n`;
}

/** The saved pages of the warlords. */
export function savedPages(folder = PAGES) {
  return readdirSync(folder)
    .filter((file) => file.endsWith(".html"))
    .map((file) => pageData(readFileSync(new URL(file, folder), "utf8")));
}

export const readGame = () => JSON.parse(readFileSync(new URL(`data/${GAME}/game.json`, root), "utf8"));

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const data = buildWarlords(savedPages(), readGame());
  writeFileSync(OUTPUT, formatWarlords(data));
  console.log(`✓ ${data.warlords.length} warlords, ${data.talents.length} talents worked out from their codes`);
}
