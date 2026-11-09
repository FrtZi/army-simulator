// The Guides (GUIDE-01): one tab per type of block. The heroes', rituals' and structures' guides are drawn from their
// data; the champion's says what it will show and the version that brings its data (CONFIG.setupComing).
import { byId, escape } from "../../dom.js";
import { CONFIG } from "../../config.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { guideHeroes, heroDetailHtml, heroFiltersHtml, heroListHtml } from "./heroes.js";
import { LEVELLED, entryFiltersHtml, entryListHtml, shownEntries } from "./levelled.js";
import { chosenEntry, entryDetailHtml } from "./levelled-detail.js";

export const GUIDES = ["heroes", "rituals", "buildings", "champion"];

/** The hero shown: the one chosen if the filters still let it through, else the first they do. */
function shownHero() {
  const heroes = guideHeroes();
  const chosen = heroes.find((warlord) => warlord.id === state.guide.hero) ?? heroes[0];
  state.guide.hero = chosen?.id ?? state.guide.hero;
  return chosen;
}

/** Only the hero list and the detail: a search typed in keeps its field. */
export function drawGuideHeroes() {
  const hero = shownHero();
  byId("guide-hero-list").innerHTML = heroListHtml();
  byId("guide-hero-detail").innerHTML = hero ? heroDetailHtml(hero) : "";
}

function drawHeroesGuide(panel) {
  panel.innerHTML = `${heroFiltersHtml()}
    <div class="guide-layout">
      <ul id="guide-hero-list" class="guide-list" aria-label="${escape(t("guides.heroes"))}"></ul>
      <div id="guide-hero-detail" class="guide-detail" aria-live="polite"></div>
    </div>`;
  drawGuideHeroes();
}

/** Only a ritual or structure list and the detail: a search typed in keeps its field. */
export function drawGuideEntries(kind) {
  const entry = chosenEntry(kind, shownEntries(kind));
  byId(`guide-${kind}-list`).innerHTML = entryListHtml(kind);
  byId(`guide-${kind}-detail`).innerHTML = entry ? entryDetailHtml(kind, entry) : "";
}

function drawLevelledGuide(panel, kind) {
  panel.innerHTML = `${entryFiltersHtml(kind)}
    <div class="guide-layout">
      <ul id="guide-${kind}-list" class="guide-list" aria-label="${escape(t(`guides.${kind}`))}"></ul>
      <div id="guide-${kind}-detail" class="guide-detail" aria-live="polite"></div>
    </div>`;
  drawGuideEntries(kind);
}

export function drawGuides() {
  for (const kind of GUIDES) {
    const tab = byId(`guide-tab-${kind}`);
    tab.setAttribute("aria-selected", String(kind === state.guide.kind));
    tab.tabIndex = kind === state.guide.kind ? 0 : -1;
  }
  const panel = byId("guide-panel");
  panel.setAttribute("aria-labelledby", `guide-tab-${state.guide.kind}`);
  if (state.guide.kind === "heroes" && currentGame().warlords.size) {
    drawHeroesGuide(panel);
    return;
  }
  if (state.guide.kind in LEVELLED) {
    drawLevelledGuide(panel, state.guide.kind);
    return;
  }
  const what = t(`guides.${state.guide.kind}What`);
  panel.innerHTML = `<p class="hint">${escape(t("guides.coming", { version: CONFIG.setupComing[state.guide.kind], what }))}</p>`;
}
