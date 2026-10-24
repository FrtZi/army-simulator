// Builds the single self-contained page dist/index.html from src/: the page is assembled from its parts,
// esbuild bundles the ES modules (src/main.js, with the game data it imports) and the stylesheets
// (src/styles/index.css), then both are inlined so the published page is one file that works offline.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { assemblePage } from "./page.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");

const bundle = async (entry, options = {}) => {
  const result = await build({
    entryPoints: [join(srcDir, entry)],
    bundle: true,
    write: false,
    charset: "utf8",
    ...options,
  });
  return result.outputFiles[0].text.trimEnd();
};

const [js, init, css] = await Promise.all([
  bundle("main.js", { format: "iife", target: "es2022" }),
  bundle("theme-init.js", { format: "iife", target: "es2022" }),
  bundle("styles/index.css", { loader: { ".png": "dataurl" } }), // the flags, inlined
]);

// each tag must appear exactly once in src/index.html
const replaceOnce = (html, tag, replacement) => {
  const found = html.split(tag).length - 1;
  if (found !== 1) throw new Error(`src/index.html: expected one ${tag}, found ${found}`);
  return html.replace(tag, () => replacement); // a function, so "$" in the bundle is never interpreted
};

let html = assemblePage(srcDir);
html = replaceOnce(html, '<script src="theme-init.js"></script>', `<script>\n${init}\n</script>`);
html = replaceOnce(html, '<link rel="stylesheet" href="styles/index.css" />', `<style>\n${css}\n</style>`);
html = replaceOnce(html, '<script type="module" src="main.js"></script>', `<script>\n${js}\n</script>`);

const out = join(root, "dist", "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${html}\n`);
console.log(`${out}: scripts, styles and data bundled and inlined (${Math.round(statSync(out).size / 1024)} KB)`);
