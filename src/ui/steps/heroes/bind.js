// The heroes' controls (ARMY-05, ARMY-06): the picker (open, search, filters, ticks, add), each hero's rank and
// level, removing a hero, and ticking talents. A hero removed or set lower may take away a chosen talent: the
// talents no hero offers any more are dropped (pruneTalents).
import { CONFIG } from "../../config.js";
import { byId, keepingFocus } from "../../dom.js";
import { toggleChoice } from "../../filters.js";
import { pruneTalents } from "../../heroes.js";
import { refresh } from "../../render.js";
import { currentGame, state } from "../../state.js";
import { levelOf } from "../../../engine/index.js";
import { drawHeroes, drawTalents } from "./draw.js";
import { drawHeroFilters, drawHeroPicker, drawHeroPickerButton, drawHeroPickerList } from "./picker.js";

/** After the heroes change: the talents they no longer offer go, every hero part and figure is redrawn. */
function heroesChanged() {
  pruneTalents(state.composition, currentGame());
  keepingFocus(drawHeroes);
  refresh();
}

function addPicked() {
  const { heroPicker, composition } = state;
  if (!heroPicker.picked.size) return;
  for (const id of heroPicker.picked) composition.heroes.push({ id, level: CONFIG.newHeroLevel });
  Object.assign(heroPicker, { picked: new Set(), open: false });
  heroesChanged();
  byId("hero-picker-toggle").focus();
}

function bindPicker() {
  byId("hero-picker-toggle").addEventListener("click", () => {
    state.heroPicker.open = !state.heroPicker.open;
    drawHeroPicker();
    if (state.heroPicker.open) byId("hero-picker-search").focus();
  });
  byId("hero-picker-search").addEventListener("input", (event) => {
    state.heroPicker.search = event.target.value;
    drawHeroPickerList();
  });
  byId("hero-picker-filters").addEventListener("change", (event) => {
    if (!event.target.dataset.multi) return;
    toggleChoice(state.heroPicker.filters, event.target);
    keepingFocus(() => {
      drawHeroFilters();
      drawHeroPickerList();
    });
  });
  byId("hero-picker-list").addEventListener("change", (event) => {
    const id = event.target.dataset.pickHero;
    if (!id) return;
    if (event.target.checked) state.heroPicker.picked.add(id);
    else state.heroPicker.picked.delete(id);
    keepingFocus(drawHeroPickerList); // the others may become (un)available: at most heroesPerArmy
    drawHeroPickerButton();
  });
  byId("hero-picker-add").addEventListener("click", addPicked);
}

/** A rank or a level chosen on a hero's line: its level is worked out from both selects. */
function setLevel(id) {
  const rules = currentGame().game.heroRules;
  const hero = state.composition.heroes.find((entry) => entry.id === id);
  hero.level = levelOf(Number(byId(`rank-${id}`).value), Number(byId(`level-${id}`).value), rules);
  heroesChanged();
}

export function bindHeroes() {
  bindPicker();
  const lines = byId("hero-lines");
  lines.addEventListener("change", (event) => {
    const id = event.target.dataset.rank ?? event.target.dataset.level;
    if (id) setLevel(id);
  });
  lines.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-hero]");
    if (!button) return;
    const { composition } = state;
    composition.heroes = composition.heroes.filter((hero) => hero.id !== button.dataset.removeHero);
    heroesChanged();
    byId("hero-picker-toggle").focus();
  });
  byId("talent-list").addEventListener("change", (event) => {
    const id = event.target.dataset.talent;
    if (!id) return;
    const { composition } = state;
    composition.talents = event.target.checked
      ? [...composition.talents, id]
      : composition.talents.filter((talent) => talent !== id);
    keepingFocus(drawTalents);
    refresh();
  });
}
