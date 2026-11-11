// Imports the champion and its gear from cctools.cc's saved pages (D-25, BL-13, D-29) into
// data/<game>/champion.json: the champion level by level (power, tier, the experience each level asks, its skill
// points and its own stats), every piece of gear level by level (its bonuses, cost and requirements) and the sets
// (their bonuses by the number of pieces worn). A bonus that reads as one of our troop effects is listed among the
// effects; those for the march it leads (hero_march_unit_*) among the march's; the others (the heroes, vanquishing,
// the fortress) are kept by name, not applied in battle.
//
//   node scripts/import-champion.mjs   reads captures/<game>/sources/cctools/gear/ (saved pages, never committed)
//                                      and writes data/<game>/champion.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { itemOf, pageData } from "./cctools.mjs";
import { readGame } from "./import-warlords.mjs";
import { effectOf, formatLevelled, kebab, labels, percent, put, sortedById, structureId } from "./levels.mjs";

const GAME = "chaos-conquest";
const root = new URL("../", import.meta.url);
const PAGES = new URL(`captures/${GAME}/sources/cctools/gear/`, root);
const OUTPUT = new URL(`data/${GAME}/champion.json`, root);
const SOURCE =
  "cctools.cc, the champion's and gear's pages (D-25); written by scripts/import-champion.mjs: never edit by hand";
const camel = (snake) => snake.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());

/** A bonus: one of our effects (applied in battle), else kept by name for the guides. */
// a bonus for the troops of the march the champion leads (open question 22, settled 2026-11-09): its stat
const MARCH = /^hero_march_unit_([a-z_]+)_modifier$/;

function bonusOf(stat, context) {
  const marchStat = stat.code.match(MARCH)?.[1]?.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());
  if (marchStat && context.game.troopStats.some((entry) => entry.id === marchStat)) {
    const id = kebab(stat.code);
    context.march.set(id, { id, code: stat.code, stat: marchStat });
    return ["march", id];
  }
  const effect = effectOf(stat.code, context.game);
  if (effect) context.effects.set(effect.id, effect);
  else context.other.set(kebab(stat.code), { id: kebab(stat.code), code: stat.code, labels: labels(stat.name) });
  return effect ? ["effects", effect.id] : ["other", kebab(stat.code)];
}

/** The champion, level by level: its figures, its own stats under our ids, its other attributes by name. */
function championOf(levels, context) {
  const size = levels.length;
  const own = { stats: {}, other: {} };
  const troopStats = new Set(context.game.troopStats.map((stat) => stat.id));
  levels.forEach((level, index) => {
    for (const attribute of level.attributes) {
      const id = camel(attribute.code);
      if (!troopStats.has(id)) {
        context.other.set(kebab(attribute.code), {
          id: kebab(attribute.code),
          code: attribute.code,
          labels: labels(attribute.name),
        });
      }
      put(
        troopStats.has(id) ? own.stats : own.other,
        troopStats.has(id) ? id : kebab(attribute.code),
        size,
        index,
        attribute.value,
      );
    }
  });
  const list = (field) => levels.map((level) => level[field]);
  return {
    power: list("power"),
    tier: list("tier"),
    xp: list("xp_required"),
    skillPoints: list("skill_points"),
    monsterSkillPoints: list("monster_skill_points"), // the conquest skills' points (BL-30)
    ...own,
  };
}

/** A piece of gear, level by level: its bonuses, its cost, the structures it requires. */
function pieceOf({ gear, levels }, context) {
  const size = levels.length;
  const piece = {
    id: gear.slug,
    code: gear.code,
    slot: kebab(gear.slot_name),
    rarity: gear.rarity_meta.key,
    labels: labels(gear.display_name),
  };
  const figures = { effects: {}, march: {}, other: {}, costs: {}, requires: {} };
  [...levels]
    .sort((a, b) => a.level - b.level)
    .forEach((level, index) => {
      for (const stat of level.stats) {
        const [kind, id] = bonusOf(stat, context);
        put(figures[kind], id, size, index, percent(stat.modifier));
      }
      for (const cost of level.costs) {
        put(figures.costs, itemOf({ ...cost, label: cost.name }).id, size, index, cost.quantity);
      }
      for (const need of level.requirements) {
        put((figures.requires.structure ??= {}), structureId(need.name, context.game), size, index, need.level);
      }
    });
  return { ...piece, sets: gear.gear_sets.map((set) => kebab(set.code)), ...figures };
}

/** A set: its pieces, and per bonus what it gives for each number of pieces worn (a percentage, or a flat value). */
function setOf(set, gearSets, context) {
  const bonuses = {};
  for (const stat of gearSets.find((entry) => entry.code === set.code)?.stats ?? []) {
    const [, id] = bonusOf(stat, context);
    bonuses[id] = Object.fromEntries(
      Object.entries(stat.pieces).map(([count, { value, modifier }]) => [
        count,
        modifier ? percent(modifier) : { flat: value },
      ]),
    );
  }
  return {
    id: kebab(set.code),
    code: set.code,
    labels: labels(set.name),
    pieces: set.slots.map((slot) => slot.item.slug),
    bonuses,
  };
}

export function buildChampion(championPage, piecePages, sets, game) {
  const context = { game, effects: new Map(), march: new Map(), other: new Map() };
  const champion = championOf(
    [...championPage.levels].sort((a, b) => a.level - b.level),
    context,
  );
  const pieces = piecePages.map((page) => pieceOf(page, context)).sort((a, b) => a.id.localeCompare(b.id));
  const gearSets = piecePages.flatMap((page) => page.gear.gear_sets);
  // the slots in the game's order (hero_slot1 to hero_slot6: head, chest, gloves, weapon, boots, relic)
  const slotCodes = new Map(piecePages.map((page) => [page.gear.slot_code, kebab(page.gear.slot_name)]));
  const slots = [...slotCodes].sort(([a], [b]) => a.localeCompare(b)).map(([, slot]) => slot);
  return {
    source: SOURCE,
    champion,
    slots,
    // a piece's level n is the n-th rarity, as the game's forge names them (Core to Eternal)
    levelRarities: piecePages[0].rarityLabels.map((rarity) => rarity.key),
    pieces,
    sets: sets.map((set) => setOf(set, gearSets, context)).sort((a, b) => a.id.localeCompare(b.id)),
    effects: sortedById(context.effects),
    march: sortedById(context.march),
    other: sortedById(context.other),
  };
}

export const formatChampion = formatLevelled;

/** The saved pages: the champion's, every piece's, the sets' index. */
export function savedChampion(folder = PAGES) {
  const read = (file) => pageData(readFileSync(new URL(file, folder), "utf8"));
  const pieceFiles = readdirSync(new URL("pieces/", folder)).filter((file) => file.endsWith(".html"));
  return {
    championPage: read("champion-index.html"),
    piecePages: pieceFiles.map((file) => read(`pieces/${file}`)),
    sets: read("gear-sets-index.html").sets,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { championPage, piecePages, sets } = savedChampion();
  const data = buildChampion(championPage, piecePages, sets, readGame());
  writeFileSync(OUTPUT, formatChampion(data));
  console.log(
    `✓ the champion's ${data.champion.power.length} levels, ${data.pieces.length} pieces, ${data.sets.length} sets; ${data.effects.length} bonuses applied in battle, ${data.other.length} kept by name`,
  );
}
