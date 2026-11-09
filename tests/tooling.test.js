// The tools around the page: the assembler shared by the build and the dev server (scripts/page.mjs), and the
// dev server's answer when the page cannot be assembled (scripts/serve.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assemblePage } from "../scripts/page.mjs";
import { pageResponse, requestPath } from "../scripts/serve.mjs";

// a source folder: a page shell and its English texts (file name → texts), removed after use
const withSourcePage = async (html, use, texts = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "army-page-"));
  try {
    mkdirSync(join(dir, "ui", "texts"), { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
    for (const [file, content] of Object.entries(texts)) writeTexts(dir, file, content);
    return await use(dir);
  } finally {
    rmSync(dir, { recursive: true });
  }
};
const writeTexts = (dir, file, content) =>
  writeFileSync(join(dir, "ui", "texts", file), `export const TEXTS = ${JSON.stringify(content)};\n`);
// an element whose text was removed from the texts, as a leftover button once was (DEF-005)
const LEFTOVER = '<button data-text="no-such-text"></button>';

test("MAINT-01 DEF-005 the build refuses an element whose text does not exist", async () => {
  await withSourcePage(LEFTOVER, (dir) => assert.rejects(assemblePage(dir), /no text "no-such-text"/));
});

test("MAINT-01 DEF-003 the dev server answers 500 with the reason, instead of crashing", async () => {
  await withSourcePage(LEFTOVER, async (dir) => {
    const { status, body } = await pageResponse(() => assemblePage(dir));
    assert.equal(status, 500);
    assert.match(body, /^<pre>.*no text "no-such-text".*<\/pre>$/);
  });
  assert.deepEqual(await pageResponse(() => "<p>page</p>"), { status: 200, body: "<p>page</p>" });
});

test("MAINT-01 DEF-033 the page is assembled with the texts as they are now, a text added since included", async () => {
  const page = (key) => `<p data-text="${key}"></p>`;
  await withSourcePage(
    page("a.one"),
    async (dir) => {
      assert.match(await assemblePage(dir), /One/);
      writeTexts(dir, "en-a.js", { "a.one": "One", "a.two": "Two" }); // edited while the server runs
      writeFileSync(join(dir, "index.html"), page("a.two"));
      assert.match(await assemblePage(dir), /Two/);
    },
    { "en-a.js": { "a.one": "One" } },
  );
});

test("LANG-02 DEF-033 every text file of the folder is in the page's texts, in both languages", () => {
  const folder = new URL("../src/ui/texts/", import.meta.url);
  const index = readFileSync(new URL("index.js", folder), "utf8");
  const files = readdirSync(folder).filter((file) => /^(en|fr)(-[\w-]+)?\.js$/.test(file));
  for (const file of files) assert.ok(index.includes(`"./${file}"`), `${file} is not imported by texts/index.js`);
  assert.equal(
    files.filter((file) => file.startsWith("en")).length,
    files.filter((file) => file.startsWith("fr")).length,
  );
});

test("MAINT-01 DEF-016 the dev server reads a malformed address as no path, instead of crashing", () => {
  assert.equal(requestPath("/%E0"), null);
  assert.equal(requestPath("/data/a%20b.json?x=1"), "/data/a b.json");
});

test("MAINT-04 the hook and the CI run the same checks, on the same Node version", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const ci = read(".github/workflows/ci.yml");
  const minimum = JSON.parse(read("package.json")).engines.node.match(/\d+/)[0];
  assert.equal(ci.match(/node-version:\s*(\d+)/)?.[1], minimum, "the CI's Node major is package.json's minimum");
  assert.match(read(".githooks/pre-commit"), /^npm run check\b/m);
  assert.match(ci, /run: npm run check$/m);
});

// git-ignored folders hold other people's files (the cctools.cc scan's minified scripts): linting them failed the
// hook on this computer only, the CI having no such folder (DEF-030)
test("MAINT-04 DEF-030 the linter skips every folder git ignores", async () => {
  const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  const folders = gitignore.match(/^[^#!\s][^*\s]*\/(?=\**$)/gm);
  const { default: config } = await import("../eslint.config.mjs");
  const ignored = config.flatMap((entry) => entry.ignores ?? []);
  for (const folder of folders) assert.ok(ignored.includes(folder), `${folder} is linted`);
});
