// The Guides (GUIDE-01): one tab per type of block. The heroes' guide is drawn from their complete data; each other
// block says what it will show and the version that brings its data (CONFIG.setupComing, the same as Your setup).
import { byId, escape } from "../../dom.js";
import { CONFIG } from "../../config.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { guideHeroes, heroDetailHtml, heroFiltersHtml, heroListHtml } from "./heroes.js";

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
  const what = t(`guides.${state.guide.kind}What`);
  panel.innerHTML = `<p class="hint">${escape(t("guides.coming", { version: CONFIG.setupComing[state.guide.kind], what }))}</p>`;
}
