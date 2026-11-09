// What every import from cctools.cc's saved pages shares (D-25): a page's data, and the id of a resource or item
// a cost names, so the warlords, and later the rituals, buildings and gear, point at one list (data/<game>/items.json).

const ENTITIES = { "&quot;": '"', "&#039;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&" };

/** A saved page's data (Inertia's data-page attribute). */
export function pageData(html) {
  const match = html.match(/data-page="([^"]*)"/);
  if (!match) throw new Error("no data-page in the saved page");
  return JSON.parse(match[1].replace(/&(quot|#039|lt|gt|amp);/g, (entity) => ENTITIES[entity])).props;
}

const kebab = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * A cost's resource or item, as our list holds it: an id (a currency's code says nothing, "currency7": its name
 * does, "iron"; an item's code is kept, "carrier-xp-token"), the game's code, its kind and rarity.
 */
export function itemOf({ type, code, label, rarity }) {
  const kind = type === "currency" ? "currency" : "item";
  return { id: kind === "currency" ? kebab(label) : kebab(code), code, kind, rarity: rarity?.key ?? null, label };
}
