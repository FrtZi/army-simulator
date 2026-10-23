// The tools around the page: the assembler shared by the build and the dev server (scripts/page.mjs), and the
// dev server's answer when the page cannot be assembled (scripts/serve.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assemblePage } from "../scripts/page.mjs";
import { pageResponse, requestPath } from "../scripts/serve.mjs";

// a page shell with an element whose text was removed from the texts, as a leftover button once was (DEF-005)
const withSourcePage = (html, use) => {
  const dir = mkdtempSync(join(tmpdir(), "army-page-"));
  try {
    writeFileSync(join(dir, "index.html"), html);
    return use(dir);
  } finally {
    rmSync(dir, { recursive: true });
  }
};
const LEFTOVER = '<button data-text="no-such-text"></button>';

test("MAINT-01 DEF-005 the build refuses an element whose text does not exist", () => {
  withSourcePage(LEFTOVER, (dir) => assert.throws(() => assemblePage(dir), /no text "no-such-text"/));
});

test("MAINT-01 DEF-003 the dev server answers 500 with the reason, instead of crashing", () => {
  withSourcePage(LEFTOVER, (dir) => {
    const { status, body } = pageResponse(() => assemblePage(dir));
    assert.equal(status, 500);
    assert.match(body, /^<pre>.*no text "no-such-text".*<\/pre>$/);
  });
  assert.deepEqual(
    pageResponse(() => "<p>page</p>"),
    { status: 200, body: "<p>page</p>" },
  );
});

test("MAINT-01 DEF-016 the dev server reads a malformed address as no path, instead of crashing", () => {
  assert.equal(requestPath("/%E0"), null);
  assert.equal(requestPath("/data/a%20b.json?x=1"), "/data/a b.json");
});
