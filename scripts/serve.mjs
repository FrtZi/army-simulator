// `npm run dev`: serves the source page without a build (edit a file, reload the page). The page is assembled
// from its sections on each request; the ES modules, stylesheets and the game data (data/, imported by the
// modules) are served as they are. Browsers refuse ES modules from file://, hence this small server.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assemblePage } from "./page.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const dataDir = join(root, "data");
const port = Number(process.env.PORT) || 5173;
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const HTML = { "Content-Type": "text/html; charset=utf-8" };

// /data/… comes from data/, everything else from src/; nothing outside those two folders is served
const resolve = (path) => (path.startsWith("/data/") ? [dataDir, path.slice("/data".length)] : [srcDir, path]);

// The page is assembled before any header is sent: an error must not follow sent headers, which crashed the
// server (DEF-003). A missing text or section is shown in the browser, and the server keeps running.
export function pageResponse(assemble) {
  try {
    return { status: 200, body: assemble() };
  } catch (error) {
    return { status: 500, body: `<pre>${String(error.message).replace(/</g, "&lt;")}</pre>` };
  }
}

/** The decoded path of a request; null for a malformed one ("%E0"), which once crashed the server (DEF-016). */
export function requestPath(url) {
  try {
    return decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
}

function handle(req, res) {
  const path = requestPath(req.url);
  if (path === null) {
    res.writeHead(400).end("Bad request");
    return;
  }
  if (path === "/" || path === "/index.html") {
    const { status, body } = pageResponse(() => assemblePage(srcDir));
    res.writeHead(status, HTML).end(body);
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
}

// run as a script (npm run dev); imported by the tests, it only exports
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  createServer(handle).listen(port, "127.0.0.1", () =>
    console.log(`Army simulator (source): http://localhost:${port}/`),
  );
}
