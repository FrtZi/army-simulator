// Numbers and names, in the current language.
import { CONFIG } from "./config.js";
import { currentGame, state } from "./state.js";
import { t } from "./texts/index.js";

/** A number with the language's separators, rounded to `digits` decimals. */
export function number(value, digits = 0) {
  return new Intl.NumberFormat(CONFIG.locales[state.language], {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

/** An entry's in-game name in the current language (units, defences, vocabulary). */
export const label = (entry) => entry?.labels?.[state.language] ?? entry?.id ?? "";

/** The name of a vocabulary value of the current game, such as an alignment or a unit type. */
export const nameOf = (list, id) => label(currentGame().game[list].find((entry) => entry.id === id));

/** "Tier IV" / "Rang IV". */
export const tierName = (tier) => t("tier", { tier: nameOf("tiers", tier) });

/** A troop's short description: tier, type and god. */
export const troopMeta = (unit) =>
  [tierName(unit.tier), nameOf("unitTypes", unit.unitType), nameOf("alignments", unit.alignment)].join(" · ");

/** Lower case, without accents: "Élu" matches "elu". */
export const searchable = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
