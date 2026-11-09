// The stylesheets, read as text (jsdom lays nothing out): each look in one place (DRY), a selector's property set in
// one stylesheet only, so a change of look is made once; within one file, a shared group then a specific rule is
// allowed (the second wins, on purpose, a few lines below); across files it is a copy that will drift (DEF-031).
// And every grid of four columns or more has its phone layout, or its last columns get crushed (DEF-032).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const SRC = new URL("../src/", import.meta.url);
const STYLESHEETS = readdirSync(SRC, { recursive: true })
  .map((path) => path.split("\\").join("/"))
  .filter((path) => path.endsWith(".css"));
const read = (path) => readFileSync(new URL(path, SRC), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
// rules inside these are another layout or another case, not a copy
const CONDITIONAL = /^@(media|supports|container)\b/;
const PHONE = "@media (max-width: 40rem)"; // responsive.css: phones and narrow windows
const MANY_COLUMNS = 4; // from four columns, a phone's width no longer holds them side by side

/** The text outside the conditional blocks, and the text of the phone's blocks. */
function split(text) {
  let outside = "";
  let phone = "";
  for (let index = 0; index < text.length;) {
    if (!CONDITIONAL.test(text.slice(index, index + 12))) {
      outside += text[index++];
      continue;
    }
    const start = text.indexOf("{", index);
    const isPhone = text.slice(index, start).trim() === PHONE;
    let depth = 0;
    index = start;
    do {
      depth += { "{": 1, "}": -1 }[text[index]] ?? 0;
      index += 1;
    } while (depth > 0 && index < text.length);
    if (isPhone) phone += text.slice(start + 1, index - 1);
  }
  return { outside, phone };
}

/** Each rule's selectors, one by one, with each property and its value. */
function declarations(text) {
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selectors, body]) => {
    const properties = [...body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)];
    return selectors
      .split(",")
      .map((selector) => selector.trim().replace(/\s+/g, " "))
      .filter((selector) => selector && !selector.startsWith("@"))
      .flatMap((selector) => properties.map(([, property, value]) => ({ selector, property, value: value.trim() })));
  });
}

const SHEETS = STYLESHEETS.map((path) => ({ path, ...split(read(path)) }));

test("MAINT-01 DEF-031 a selector's property is set in one stylesheet only", () => {
  const where = new Map();
  for (const { path, outside } of SHEETS) {
    const keys = new Set(declarations(outside).map(({ selector, property }) => `${selector} { ${property} }`));
    for (const key of keys) where.set(key, [...(where.get(key) ?? []), path]);
  }
  const copies = [...where].filter(([, paths]) => paths.length > 1).map(([key, paths]) => `${key}: ${paths}`);
  assert.deepEqual(copies, []);
  assert.ok(STYLESHEETS.length > 5, "the stylesheets are found");
});

test("COMP-01 DEF-032 every grid of four columns or more has its own layout on a phone", () => {
  const phone = new Set(
    SHEETS.flatMap((sheet) => declarations(sheet.phone))
      .filter(({ property }) => property === "grid-template-columns")
      .map(({ selector }) => selector),
  );
  assert.ok(phone.size > 0, "the phone's rules are found");
  // each selector's columns as the cascade leaves them: the last value it is given wins
  const columns = new Map(
    SHEETS.flatMap((sheet) => declarations(sheet.outside))
      .filter(({ property }) => property === "grid-template-columns")
      .map(({ selector, value }) => [selector, value]),
  );
  const crushed = [...columns]
    .filter(([selector, value]) => value.split(/\s+/).length >= MANY_COLUMNS && !phone.has(selector))
    .map(([selector, value]) => `${selector}: ${value}`);
  assert.deepEqual(crushed, []);
});
