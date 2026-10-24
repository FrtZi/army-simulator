// The catalogue says what proves each feature; these tests keep that true: a test file given as a proof has a
// test whose name carries the feature's id, and every id a test names is in the catalogue. Before this check,
// three proofs cited files whose tests did not carry the id (DEF-012).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { catalogueFeatures } from "../scripts/catalogue.mjs";

const features = catalogueFeatures();
const TEST_TITLE = /\btest\(\s*(["`])([\s\S]*?)\1/g;
// a feature's category has two letters or more: D-26, a decision, is not a feature (DEF-028)
const NAMED_ID = /\b[A-Z]{2,}-\d{2}\b/g;
const PROOF_FILE = /tests\/[\w.-]+\.test\.js/g;
// a proof that is not a test says what it is: a check, a manual verification, or another feature's proof
const STATED_PROOF = /^(Check|Manual|manual|see)\b/;

const testFiles = readdirSync(new URL(".", import.meta.url)).filter((file) => file.endsWith(".test.js"));
const namedIds = (file) => {
  const text = readFileSync(new URL(file, import.meta.url), "utf8");
  return new Set([...text.matchAll(TEST_TITLE)].flatMap((match) => match[2].match(NAMED_ID) ?? []));
};
const idsByFile = Object.fromEntries(testFiles.map((file) => [`tests/${file}`, namedIds(file)]));

test("MAINT-02 a feature done has a proof, and each test file it cites names the feature", () => {
  const problems = [];
  for (const { id, proof } of features.filter((feature) => feature.status === "Done")) {
    const files = proof.match(PROOF_FILE) ?? [];
    if (!files.length && !STATED_PROOF.test(proof)) problems.push(`${id}: no proof`);
    for (const file of files) {
      if (!idsByFile[file]?.has(id)) problems.push(`${id}: ${file} has no test named ${id}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("MAINT-02 every id a test names is a feature of the catalogue", () => {
  const known = new Set(features.map((feature) => feature.id));
  const unknown = Object.entries(idsByFile).flatMap(([file, ids]) =>
    [...ids].filter((id) => !known.has(id)).map((id) => `${file}: ${id}`),
  );
  assert.deepEqual(unknown, []);
});

test("MAINT-02 DEF-021 an escaped pipe in a feature's text stays in its cell", () => {
  const row = String.raw`| GAME-99 | picks a \| b | Business | Done | tests/data.test.js |`;
  assert.deepEqual(catalogueFeatures(row), [{ id: "GAME-99", status: "Done", proof: "tests/data.test.js" }]);
});
