// Assembles src/index.html: each `<!-- @include path -->` line is replaced by that file (path relative to src/),
// indented like the marker; then every element marked data-text gets its English text, every data-text-label
// its English accessible name (src/ui/texts/en*.js), and the element marked data-version the version (from
// package.json, the single place it is written). The page so reads in full before its script runs (and the
// HTML validator sees no empty heading), while each text still exists once.
// Shared by the build and the dev server, so both serve exactly the same page.
// The English texts are every en*.js file of the source's texts folder, read afresh at each assembly: the dev server
// runs for hours, and texts it kept from its start made it fail on a text added since (DEF-033).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const VERSION = `v${version.split(".").slice(0, 2).join(".")}`; // 1.0.0 → v1.0

const INCLUDE = /^( *)<!-- @include ([\w/.-]+\.html) -->$/gm;
const EMPTY_TEXT = /(<(\w+)\b[^>]*\sdata-text="([\w.-]+)"[^>]*>)[^<]*(<\/\2>)/g;
const LABEL = /\sdata-text-label="([\w.-]+)"/g;
const VERSION_SLOT = /(<(\w+)\b[^>]*\sdata-version[^>]*>)[^<]*(<\/\2>)/;
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (text) => text.replace(/[&<>"]/g, (char) => ESCAPES[char]);

const ENGLISH_FILE = /^en(-[\w-]+)?\.js$/;
let reading = 0; // each reading its own module address: Node keeps a module once imported

/** Every English text of the source (key → text), from its texts folder's en*.js files as they are now. */
export async function englishTexts(srcDir) {
  const folder = join(srcDir, "ui", "texts");
  const files = readdirSync(folder, { withFileTypes: true }).filter((entry) => ENGLISH_FILE.test(entry.name));
  reading += 1;
  const modules = await Promise.all(
    files.map((entry) => import(`${pathToFileURL(join(folder, entry.name)).href}?reading=${reading}`)),
  );
  return Object.assign({}, ...modules.flatMap((module) => Object.values(module)));
}

function englishOf(texts) {
  return (key) => {
    if (!(key in texts)) throw new Error(`src/ui/texts/en*.js have no text "${key}"`);
    return escape(texts[key]);
  };
}

export async function assemblePage(srcDir) {
  const read = (file) => readFileSync(join(srcDir, file), "utf8").trimEnd();
  const english = englishOf(await englishTexts(srcDir));
  return read("index.html")
    .replace(INCLUDE, (_, indent, file) =>
      read(file)
        .split("\n")
        .map((line) => (line ? indent + line : line))
        .join("\n"),
    )
    .replace(EMPTY_TEXT, (_, open, _tag, key, close) => `${open}${english(key)}${close}`)
    .replace(LABEL, (match, key) => `${match} aria-label="${english(key)}"`)
    .replace(VERSION_SLOT, (_, open, _tag, close) => `${open}${VERSION}${close}`);
}
