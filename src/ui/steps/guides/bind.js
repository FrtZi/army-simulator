// The Guides' controls (GUIDE-01, GUIDE-02): the block tabs; in the heroes' guide, the filters, the search, a hero
// chosen in the list, and the rank and level it is shown at.
import { byId, keepingFocus } from "../../dom.js";
import { currentGame, state } from "../../state.js";
import { levelOf } from "../../../engine/index.js";
import { bindTablist } from "../../tablist.js";
import { GUIDES, drawGuideEntries, drawGuideHeroes, drawGuides } from "./draw.js";
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

function show(kind) {
  state.guide.kind = kind;
  drawGuides();
  byId(`guide-tab-${kind}`).focus();
}

export function bindGuides() {
  bindTablist(document.querySelector(".guide-tabs"), GUIDES, () => state.guide.kind, show, "guide");
  const panel = byId("guide-panel");
  bindLevelled(panel);
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
