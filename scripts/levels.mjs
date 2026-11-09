// What a ritual's and a structure's saved pages share (D-25, D-29): each level's power, cost, requirements and
// bonuses, read into lists by level, level 1 first. A bonus whose code reads as one of our effects (the warlords'
// reading: cavalry_morale_modifier → morale for cavalry) can be applied; the others are kept for the guides.
import { itemOf } from "./cctools.mjs";
import { talentOf } from "./import-warlords.mjs";

const REQUIREMENT_KINDS = { research: "ritual", structure: "structure" };

export const kebab = (text) =>
  text
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const labels = (name) => ({ en: name, fr: `${name}*` }); // English until read in French (D-08)
export const percent = (modifier) => Math.round(modifier * 10000) / 100; // 0.015 → 1.5, without float noise

/** The building of game.json of this English name, if any: its id and its names in both languages are ours. */
const knownBuilding = (name, game) => game.buildings.find((building) => building.labels.en === name);

/** A structure's id: game.json's for a building it has (Chaotic Rift → chaos-rift), else from its name. */
export const structureId = (name, game) => knownBuilding(name, game)?.id ?? kebab(name);

/** A structure's names: game.json's, read in both languages, for a building it has; else the English one. */
export const structureLabels = (name, game) => knownBuilding(name, game)?.labels ?? labels(name);

/** What a requirement asks: a ritual (by its code) or a structure (by its name), at a level. */
const requirementOf = (need, game) => ({
  kind: REQUIREMENT_KINDS[need.requirement_type],
  id: need.requirement_type === "structure" ? structureId(need.name, game) : kebab(need.target_code),
  level: need.required_level,
});

/** Fills a requirement in: `requires[kind][id][index]`, the level asked, the lists `size` long. */
function putRequirement(requires, need, size, index) {
  put((requires[need.kind] ??= {}), need.id, size, index, need.level);
}

/** A bonus code as one of our effects, or null when it is not about battle (kept, never applied). */
export function effectOf(code, game) {
  try {
    const talent = talentOf(code, game);
    return talent.stat ? talent : null;
  } catch {
    return null;
  }
}

/** Fills `table[key][index]`, the table's lists `size` long. */
export const put = (table, key, size, index, value) => ((table[key] ??= Array(size).fill(null))[index] = value);

function readStats(level, index, size, figures, context) {
  for (const stat of level.stats) {
    const effect = effectOf(stat.code, context.game);
    const id = effect ? effect.id : kebab(stat.code);
    if (effect) context.effects.set(id, effect);
    else context.other.set(id, { id, code: stat.code, labels: labels(stat.name) });
    put(effect ? figures.effects : figures.other, id, size, index, percent(stat.modifier));
  }
}

/** Every per-level figure of a page's levels (sorted); `context` collects the effects and other bonuses met. */
export function levelFigures(levels, context) {
  const size = levels.length;
  // each requirement stored like a stat: per ritual or structure required, the level asked at each level
  const figures = { power: levels.map((level) => level.power), costs: {}, effects: {}, other: {}, requires: {} };
  levels.forEach((level, index) => {
    for (const [type, list] of Object.entries(level.costs ?? {})) {
      for (const cost of list) {
        put(figures.costs, itemOf({ type, code: cost.code, label: cost.name }).id, size, index, cost.quantity);
      }
    }
    readStats(level, index, size, figures, context);
    for (const need of level.requirements) {
      putRequirement(figures.requires, requirementOf(need, context.game), size, index);
    }
  });
  return figures;
}

/** A context for one import: the game, and the effects and other bonuses met, sorted by id once read. */
export const newContext = (game) => ({ game, effects: new Map(), other: new Map() });
export const sortedById = (map) => [...map.values()].sort((a, b) => a.id.localeCompare(b.id));

/** JSON where each list of values, each label and each requirement sits on one line: an entry reads as a block. */
export const formatLevelled = (data) =>
  `${JSON.stringify(data, null, 2)
    .replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inside) => `[${inside.replace(/\s*\n\s*/g, " ")}]`)
    .replace(/\{\s+([^{}[\]]*?)\s+\}/g, (_, inside) => `{${inside.replace(/\s*\n\s*/g, " ")}}`)}\n`;
