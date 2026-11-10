// The Guides' controls (GUIDE-01, GUIDE-02): the block tabs; in the heroes' guide, the filters, the search, a hero
// chosen in the list, and the rank and level it is shown at.
import { byId, keepingFocus } from "../../dom.js";
import { chooseInSlot, chooseSet } from "./set-lab.js";
import { currentGame, state } from "../../state.js";
import { levelOf } from "../../../engine/index.js";
import { bindTablist } from "../../tablist.js";
import { GUIDES, drawGuideChampion, drawGuideEntries, drawGuideHeroes, drawGuideItems, drawGuides } from "./draw.js";
import { LEVELLED, guideOf } from "./levelled.js";

/** A ritual or structure guide's filter, search or level changed, or an entry chosen. */
function bindLevelled(panel) {
  const levelled = () => (state.guide.kind in LEVELLED ? state.guide.kind : null);
  const update = (event, redraw) => {
    const kind = levelled();
    const { guideField: field } = event.target.dataset;
    if (!kind || !field) return;
    const { type, checked, value } = event.target;
    const guide = guideOf(kind);
    guide[field] = type === "checkbox" ? checked : field === "level" ? Number(value) : value;
    if (field !== "level") guide.level = field === "search" ? guide.level : null;
    redraw(kind);
  };
  panel.addEventListener("change", (event) => update(event, (kind) => keepingFocus(() => drawGuideEntries(kind))));
  panel.addEventListener("input", (event) => {
    if (event.target.dataset.guideField === "search") update(event, drawGuideEntries);
  });
  panel.addEventListener("click", (event) => {
    const kind = levelled();
    const button = event.target.closest("[data-guide-entry]");
    if (!kind || !button) return;
    Object.assign(guideOf(kind), { id: button.dataset.guideEntry, level: null }); // its level in the setup, or 1
    keepingFocus(() => drawGuideEntries(kind));
  });
}

/** The items' guide: its filters, an item chosen; and from any cost table, an item's name opens its page here. */
function bindItems(panel) {
  panel.addEventListener("change", (event) => {
    const { guideItems: field } = event.target.dataset;
    if (field !== "rarity") return;
    state.guide.items.rarity = event.target.value;
    keepingFocus(drawGuideItems);
  });
  // a family opened or folded by hand stays so (toggle does not bubble: caught on the way down)
  panel.addEventListener(
    "toggle",
    (event) => {
      const { family } = event.target.dataset ?? {};
      if (family) state.guide.items.open[family] = event.target.open;
    },
    true,
  );
  panel.addEventListener("input", (event) => {
    if (event.target.dataset.guideItems !== "search") return;
    state.guide.items.search = event.target.value;
    drawGuideItems();
  });
  panel.addEventListener("click", (event) => {
    const chosen = event.target.closest("[data-guide-item]");
    const goTo = event.target.closest("[data-goto-item]");
    if (chosen) {
      // a second click folds the detail again (GUIDE-08)
      const id = chosen.dataset.guideItem;
      state.guide.items.id = state.guide.items.id === id ? null : id;
      keepingFocus(drawGuideItems);
    } else if (goTo) {
      Object.assign(state.guide.items, { id: goTo.dataset.gotoItem, rarity: "", search: "" });
      state.guide.kind = "items";
      drawGuides();
      byId("guide-items-title").focus();
    }
  });
}

/** The champion's guide: what it shows, the slot, the search, the level, a piece or a set chosen. */
function bindChampion(panel) {
  const guide = () => state.guide.champion;
  panel.addEventListener("change", (event) => {
    const { guideChampion: field, setLab, slot } = event.target.dataset;
    if (setLab) {
      if (setLab === "set") chooseSet(event.target.value);
      else chooseInSlot(slot, setLab, event.target.value);
      keepingFocus(drawGuideChampion);
      return;
    }
    if (!field || field === "search") return;
    guide()[field] = field === "level" ? Number(event.target.value) : event.target.value;
    if (field === "view") Object.assign(guide(), { id: null, level: null });
    if (field === "view") keepingFocus(drawGuides);
    else keepingFocus(drawGuideChampion);
  });
  panel.addEventListener("input", (event) => {
    if (event.target.dataset.guideChampion !== "search") return;
    guide().search = event.target.value;
    drawGuideChampion();
  });
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-champion-entry]");
    const toSet = event.target.closest("[data-goto-set]"); // a piece's set (GUIDE-06)
    if (toSet) {
      Object.assign(guide(), { view: "sets", id: toSet.dataset.gotoSet, level: null });
      drawGuides();
      byId("guide-champion-title").focus();
    } else if (button) {
      Object.assign(guide(), { id: button.dataset.guideChampionEntry, level: null });
      keepingFocus(drawGuideChampion);
    }
  });
}

function show(kind) {
  state.guide.kind = kind;
  drawGuides();
  byId(`guide-tab-${kind}`).focus();
}

export function bindGuides() {
  bindTablist(document.querySelector(".guide-tabs"), GUIDES, () => state.guide.kind, show, "guide");
  const panel = byId("guide-panel");
  bindLevelled(panel);
  bindItems(panel);
  bindChampion(panel);
  panel.addEventListener("change", (event) => {
    const { id, value } = event.target;
    if (id === "guide-god" || id === "guide-rarity") state.guide[id.slice("guide-".length)] = value;
    else if (id === "guide-rank" || id === "guide-level") {
      const rank = Number(byId("guide-rank").value);
      state.guide.level = levelOf(rank, Number(byId("guide-level").value), currentGame().game.heroRules);
    } else return;
    keepingFocus(drawGuideHeroes);
  });
  panel.addEventListener("input", (event) => {
    if (event.target.id !== "guide-search") return;
    state.guide.search = event.target.value;
    drawGuideHeroes(); // the search field is not redrawn: what is typed stays under the cursor
  });
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-hero]");
    if (!button) return;
    Object.assign(state.guide, { hero: button.dataset.guideHero, level: null }); // its own level, or the highest
    keepingFocus(drawGuideHeroes);
  });
}
