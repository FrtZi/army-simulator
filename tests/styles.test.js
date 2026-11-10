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

/** How many columns a grid sets: repeat(4, 1fr) is four; one that fills the row by itself (auto-fill) wraps, so 0. */
function columnCount(value) {
  if (/repeat\(\s*auto-(fill|fit)/.test(value)) return 0;
  const flat = value.replace(/minmax\([^)]*\)/g, "column"); // no nested brackets left inside a repeat()
  const repeated = [...flat.matchAll(/repeat\(\s*(\d+)\s*,[^)]*\)/g)].reduce((sum, [, n]) => sum + Number(n), 0);
  const rest = flat.replace(/repeat\([^)]*\)/g, "");
  return repeated + rest.split(/\s+/).filter(Boolean).length;
}

/** Whether a grid needs its own phone layout: four columns or more, or a column that will not shrink below a width. */
const needsPhoneLayout = (value) =>
  columnCount(value) >= MANY_COLUMNS || (columnCount(value) > 1 && /minmax\(\s*[1-9]/.test(value));

test("COMP-01 DEF-032 DEF-034 every wide or unshrinkable grid has its own layout on a phone", () => {
  assert.deepEqual(
    [
      "repeat(4, 1fr)",
      "1fr minmax(10rem, 16rem)",
      "repeat(auto-fill, minmax(9rem, 1fr))",
      "repeat(3, minmax(0, 12rem))",
    ].map(needsPhoneLayout),
    [true, true, false, false],
  );
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
    .filter(([selector, value]) => needsPhoneLayout(value) && !phone.has(selector))
    .map(([selector, value]) => `${selector}: ${value}`);
  assert.deepEqual(crushed, []);
});

test("COMP-01 DEF-035 a tick box keeps its own size: the fields' full width is undone for it, once, in base.css", () => {
  const all = SHEETS.flatMap((sheet) => declarations(sheet.outside).map((entry) => ({ ...entry, path: sheet.path })));
  const field = all.find(({ selector, property }) => selector === "input" && property === "width");
  assert.equal(field?.value, "100%", "base.css sizes every field to its row");
  const box = all.filter(({ selector }) => selector === 'input[type="checkbox"]');
  assert.deepEqual(
    box
      .filter(({ property }) => ["width", "min-height"].includes(property))
      .map(({ property, value, path }) => `${path} ${property} ${value}`),
    ["styles/base.css width auto", "styles/base.css min-height 0"],
  );
});

// rows whose columns after the flexible one hold the same content in every row, so a content-sized column lines up
const SAME_CONTENT_ROWS = {
  ".save-line": "its buttons, the same in every line",
  ".army-line.hero-line": "a hero's rank and level lists, the same in every line",
};

test("MAINT-01 DEF-040 a row's columns after its flexible one have a set width, so its fields line up from row to row", () => {
  // each row is its own grid: a column sized by its content ("/ 3" or "/ 10") moves the fields beside it
  const shifting = SHEETS.flatMap(({ path, outside, phone }) =>
    declarations(outside + phone)
      .filter(({ selector, property }) => property === "grid-template-columns" && /-(row|line)\b/.test(selector))
      .filter(({ selector, value }) => {
        const columns = value.split(/\s+(?![^(]*\))/);
        const flexible = columns.findIndex((column) => /fr$/.test(column));
        return flexible >= 0 && columns.slice(flexible + 1).includes("auto") && !SAME_CONTENT_ROWS[selector];
      })
      .map(({ selector, value }) => `${path} ${selector}: ${value}`),
  );
  assert.deepEqual(shifting, []);
});
