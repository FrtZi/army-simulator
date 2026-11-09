// The stylesheets keep each look in one place (DRY): a selector's property is set in one stylesheet only, so a
// change of look is made once. Within one file, a shared group then a specific rule is allowed (the second wins,
// on purpose, a few lines below); across files it is a copy that will drift (DEF-031).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const SRC = new URL("../src/", import.meta.url);
const STYLESHEETS = readdirSync(SRC, { recursive: true })
  .map((path) => path.split("\\").join("/"))
  .filter((path) => path.endsWith(".css"));
// rules inside these are another layout or another case, not a copy
const CONDITIONAL = /^@(media|supports|container)\b/;

/** The stylesheet's text outside comments and conditional blocks. */
function unconditional(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let kept = "";
  for (let index = 0; index < text.length;) {
    if (!CONDITIONAL.test(text.slice(index, index + 12))) {
      kept += text[index++];
      continue;
    }
    let depth = 0;
    index = text.indexOf("{", index);
    do {
      depth += { "{": 1, "}": -1 }[text[index]] ?? 0;
      index += 1;
    } while (depth > 0 && index < text.length);
  }
  return kept;
}

/** Each "selector { property }" a stylesheet sets. */
function declarations(css) {
  return [...unconditional(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selectors, body]) => {
    const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map(([, property]) => property);
    return selectors
      .split(",")
      .map((selector) => selector.trim().replace(/\s+/g, " "))
      .filter((selector) => selector && !selector.startsWith("@"))
      .flatMap((selector) => properties.map((property) => `${selector} { ${property} }`));
  });
}

test("MAINT-01 DEF-031 a selector's property is set in one stylesheet only", () => {
  const where = new Map();
  for (const path of STYLESHEETS) {
    for (const declaration of new Set(declarations(readFileSync(new URL(path, SRC), "utf8")))) {
      where.set(declaration, [...(where.get(declaration) ?? []), path]);
    }
  }
  const copies = [...where].filter(([, paths]) => paths.length > 1).map(([key, paths]) => `${key}: ${paths}`);
  assert.deepEqual(copies, []);
  assert.ok(STYLESHEETS.length > 5, "the stylesheets are found");
});
