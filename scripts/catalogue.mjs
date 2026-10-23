// Reads the feature catalogue, docs/features.md: one row per feature, | ID | Feature | Type | Status | Proof |.
// Shared by the defects register (links to features) and the check of the proofs (tests/catalogue.test.js).
import { readFileSync } from "node:fs";

export const FEATURE_ID = /^[A-Z]+-\d{2}$/;
const CATALOGUE = new URL("../docs/features.md", import.meta.url);

export function catalogueFeatures(text = readFileSync(CATALOGUE, "utf8")) {
  return (
    text
      .split("\n")
      // "\|" is a pipe within a cell; it once shifted the cells (DEF-021)
      .map((row) => row.split(/(?<!\\)\|/).map((cell) => cell.trim()))
      .filter((cells) => FEATURE_ID.test(cells[1] ?? ""))
      .map(([, id, , , status, proof]) => ({ id, status, proof }))
  );
}
