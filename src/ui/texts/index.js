// The page's texts in the current language. A key missing from a language shows the key itself, which the
// page tests catch.
import { state } from "../state.js";
import { EN } from "./en.js";
import { EN_MORE } from "./en-more.js";
import { EN_DASH } from "./en-dash.js";
import { EN_HEROES } from "./en-heroes.js";
import { EN_SETUP } from "./en-setup.js";
import { EN_SETUP_FILES } from "./en-setup-files.js";
import { EN_GUIDES } from "./en-guides.js";
import { EN_CLAB } from "./en-clab.js";
import { FR } from "./fr.js";
import { FR_MORE } from "./fr-more.js";
import { FR_DASH } from "./fr-dash.js";
import { FR_HEROES } from "./fr-heroes.js";
import { FR_SETUP } from "./fr-setup.js";
import { FR_SETUP_FILES } from "./fr-setup-files.js";
import { FR_GUIDES } from "./fr-guides.js";
import { FR_CLAB } from "./fr-clab.js";

export const TEXTS = {
  en: { ...EN, ...EN_MORE, ...EN_DASH, ...EN_HEROES, ...EN_SETUP, ...EN_SETUP_FILES, ...EN_GUIDES, ...EN_CLAB },
  fr: { ...FR, ...FR_MORE, ...FR_DASH, ...FR_HEROES, ...FR_SETUP, ...FR_SETUP_FILES, ...FR_GUIDES, ...FR_CLAB },
};

/** The text of a key, its {placeholders} filled from vars. */
export function t(key, vars = {}) {
  const text = TEXTS[state.language][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}
