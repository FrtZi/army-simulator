// The game's rarities (GUIDE-05): a hero's, an item's, and each level of a piece of gear, Core to Eternal, as the
// game's forge names them. Always a small diamond in the rarity's colour with its name: never the colour alone.
import { escape, options } from "./dom.js";
import { nameOf } from "./format.js";
import { ICONS } from "./icons.js";
import { currentGame } from "./state.js";
import { t } from "./texts/index.js";

/** A rarity as a badge: its diamond and its name, in its colour (CSS class rarity-<id>); nothing without one. */
export const rarityBadge = (id) =>
  id ? `<span class="rarity rarity-${id}">${ICONS.diamond}${escape(nameOf("rarities", id))}</span>` : "";

/** The rarity of a piece of gear at a level (1 is the first). */
export const gearRarity = (level) => currentGame().champion.levelRarities[level - 1];

/** A piece's levels as choices in a list, 1 to `count`: each its diamond, number and rarity's name. */
const gearLevelOptions = (count) =>
  Array.from({ length: count }, (_, index) => [
    index + 1,
    `◆ ${t("gear.level", { level: index + 1, rarity: nameOf("rarities", gearRarity(index + 1)) })}`,
  ]);

/**
 * A piece's level as a list in the colour of the level chosen, its options with their diamond (Frantz, 2026-11-11:
 * no badge beside it, the list says it all). `attributes`: the list's id, data and label attributes.
 */
export const gearLevelSelect = (attributes, count, level) =>
  `<select ${attributes} class="rarity-${gearRarity(level)}">${options(gearLevelOptions(count), level)}</select>`;
