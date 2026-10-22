// `npm run dev`: serves the source page without a build (edit a file, reload the page). The page is assembled
// from its sections on each request; the ES modules, stylesheets and the game data (data/, imported by the
// modules) are served as they are. Browsers refuse ES modules from file://, hence this small server.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { assemblePage } from "./page.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const dataDir = join(root, "data");
const port = Number(process.env.PORT) || 5173;
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const HTML = { "Content-Type": "text/html; charset=utf-8" };

// /data/… comes from data/, everything else from src/; nothing outside those two folders is served
const resolve = (path) => (path.startsWith("/data/") ? [dataDir, path.slice("/data".length)] : [srcDir, path]);

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (path === "/" || path === "/index.html") {
    try {
      const page = assemblePage(srcDir); // built first: an error must not follow sent headers
      res.writeHead(200, HTML).end(page);
    } catch (error) {
      // a missing text or section: say it in the browser, keep the server running
      res.writeHead(500, HTML).end(`<pre>${String(error.message).replace(/</g, "&lt;")}</pre>`);
    }
    return;
  }
  const [base, rest] = resolve(path);
  const file = normalize(join(base, rest));
  const type = TYPES[extname(file)];
  if (!type || !file.startsWith(base + sep) || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": type.startsWith("image/") ? type : `${type}; charset=utf-8` });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Army simulator (source): http://localhost:${port}/`));
