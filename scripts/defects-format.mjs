// The format of the defects register (docs/defects.toml), shared by all our repos: the same keys everywhere,
// the values in the repo's language. Read by the checker (defects.mjs) and the page (defects-page.mjs).

export const TYPES = ["code", "configuration", "content", "tool", "environment", "third party", "process"];
export const SEVERITIES = ["blocking", "major", "minor"];
export const STATUSES = { fixed: "✓", "worked around": "↷", open: "○" }; // the symbol goes with the label, never alone
export const TAGS = [
  "accessibility",
  "build",
  "charts",
  "ci",
  "data",
  "dev-server",
  "page",
  "saves",
  "tests",
  "tooling",
  "translation",
];
export const REQUIRED = ["id", "date", "titre", "type", "etiquettes", "gravite", "statut", "constat", "cause"];
REQUIRED.push("solution", "resultat", "preuve");
export const OPTIONAL = ["lecon", "liens", "reconstitue"];
export const LISTS = ["etiquettes", "preuve", "liens"]; // a string there was once read letter by letter (DEF-019)
export const STATED_PROOF = /^(Manual|Rule):/; // a proof without a file: stated and explained, as in the catalogue
export const COMMIT = /^[0-9a-f]{7,40}$/;

/** A TOML date (2026-10-23) as text; null for anything else, a date-time included. */
export const isoDate = (value) => (value instanceof Date && value.isDate?.() ? value.toISOString() : null);
