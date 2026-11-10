// The items' guide as tables (GUIDE-08): every resource and item by family (the rules of data/<game>/game.json
// `itemFamilies`, first match on its game code), each family a block that folds, a row per item with its rarity,
// how many places it drops in and what asks for it; the item chosen opens its detail under its row.
import { escape } from "../../dom.js";
import { label, searchable } from "../../format.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { rarityBadge } from "../../rarity.js";

const RARITY_ORDER = ["core", "uncommon", "rare", "epic", "legendary", "eternal"];
const USERS = ["heroes", "rituals", "buildings", "gear"];
const guide = () => state.guide.items;

/** An item's family: the first rule its kind or game code matches. */
export function familyOf(item, families) {
  return families.find(
    (family) => (family.kind && item.kind === family.kind) || (family.code && new RegExp(family.code).test(item.code)),
  )?.id;
}

const askedByCache = new WeakMap();
/** What asks for each item, worked out once per game: item id → the kinds of block whose levels cost it. */
function askedBy(game) {
  if (!askedByCache.has(game)) {
    const users = new Map();
    const blocks = {
      heroes: [...game.warlords.values()],
      rituals: game.rituals.rituals,
      buildings: game.structures.structures,
      gear: game.champion.pieces,
    };
    for (const [kind, entries] of Object.entries(blocks)) {
      for (const entry of entries) {
        for (const item of Object.keys(entry.costs ?? {})) users.set(item, new Set([...(users.get(item) ?? []), kind]));
      }
    }
    askedByCache.set(game, users);
  }
  return askedByCache.get(game);
}

/** The items the rarity and the search let through. */
function shownItems() {
  const { rarity, search } = guide();
  const query = searchable(search.trim());
  return [...currentGame().items.values()].filter(
    (item) => (!rarity || item.rarity === rarity) && (!query || searchable(label(item)).includes(query)),
  );
}

function rowHtml(item, detailHtml) {
  const game = currentGame();
  const places = new Set((game.itemSources.items[item.id] ?? []).map((drop) => drop.place)).size;
  const users = USERS.filter((kind) => askedBy(game).get(item.id)?.has(kind));
  const open = item.id === guide().id;
  const row = `<tr${open ? ' class="chosen"' : ""}><th scope="row"><button type="button" class="link-button" id="guide-item-${item.id}" data-guide-item="${item.id}" aria-expanded="${open}">${escape(label(item))}</button></th>
    <td>${rarityBadge(item.rarity)}</td><td class="num">${places ? escape(t("items.places", { n: places })) : "—"}</td>
    <td>${users.map((kind) => `<span class="tag">${escape(t(`guides.${kind}`))}</span>`).join(" ")}</td></tr>`;
  return open
    ? `${row}<tr class="item-detail-row"><td colspan="4"><div class="guide-detail">${detailHtml(item)}</div></td></tr>`
    : row;
}

/** A block per family holding items shown: open when it holds the item chosen, or while a filter is on. */
export function itemsTablesHtml(detailHtml) {
  const { itemFamilies } = currentGame().game;
  const shown = shownItems();
  const filtering = Boolean(guide().rarity || guide().search.trim());
  const blocks = itemFamilies.map((family) => {
    const items = shown
      .filter((item) => familyOf(item, itemFamilies) === family.id)
      .sort(
        (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || label(a).localeCompare(label(b)),
      );
    if (!items.length) return "";
    const open = filtering || guide().open[family.id] || items.some((item) => item.id === guide().id);
    const head = ["items.item", "guides.rarity", "items.dropsIn", "items.askedBy"].map(
      (key, column) => `<th scope="col"${column === 2 ? ' class="num"' : ""}>${escape(t(key))}</th>`,
    );
    return `<details class="item-family" data-family="${family.id}"${open ? " open" : ""}>
      <summary>${escape(label(family))} <span class="meta">${escape(t("items.count", { n: items.length }))}</span></summary>
      <table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${items.map((item) => rowHtml(item, detailHtml)).join("")}</tbody></table></details>`;
  });
  return blocks.join("") || `<p class="hint">${escape(t("guides.noneFound"))}</p>`;
}
