// The page's texts in the current language. A key missing from a language shows the key itself, which the
// page tests catch.
import { state } from "../state.js";
import { EN } from "./en.js";
import { EN_MORE } from "./en-more.js";
import { EN_DASH } from "./en-dash.js";
import { FR } from "./fr.js";
import { FR_MORE } from "./fr-more.js";
import { FR_DASH } from "./fr-dash.js";

export const TEXTS = { en: { ...EN, ...EN_MORE, ...EN_DASH }, fr: { ...FR, ...FR_MORE, ...FR_DASH } };

/** The text of a key, its {placeholders} filled from vars. */
export function t(key, vars = {}) {
  const text = TEXTS[state.language][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}
