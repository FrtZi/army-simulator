// Each block's summary when folded (FOLD-01): one line by rules from its figures, its state with an icon and a word
// where it has one. A figure the page already shows (the capacity's status, the profile's metrics, a tile of Your
// setup) is read from it, so the summary says what the block says. The Battle lab's blocks here; Your setup's and
// the Guides' in fold-summaries-setup.js.
import { shownText as shown } from "./dom.js";
import { nameOf, number } from "./format.js";
import { state } from "./state.js";
import { t } from "./texts/index.js";
import { SETUP_SUMMARIES } from "./fold-summaries-setup.js";

function loadSetup() {
  if (!state.useSetup) return `○ ${t("fold.loadOff")}`;
  const saved = state.savedPlayerSetup;
  return `✓ ${t("fold.loadOn", { heroes: saved.warlords.length, troops: saved.troops?.length ?? 0 })}`;
}

function bonuses() {
  if (!state.bonuses.length) return t("fold.noBonus");
  const best = state.bonuses.reduce((top, bonus) => (bonus.percent > top.percent ? bonus : top));
  return t("fold.bonuses", {
    n: state.bonuses.length,
    percent: number(best.percent, 1),
    stat: nameOf("troopStats", best.stat),
  });
}

function army() {
  const kinds = Object.keys(state.troops).length;
  return `${shown("#capacity .status")} · ${t("fold.kinds", { n: kinds })}`;
}

function heroes() {
  return `${t("fold.heroes", { n: state.composition.heroes?.length ?? 0 })} · ${shown("#talents-title")}`;
}

function profile() {
  const metric = (key) =>
    `${shown(`[data-metric="${key}"] .metric-label`)} ${shown(`[data-metric="${key}"] .metric-value`)}`;
  return ["power", "damage", "health"].map(metric).join(" · ");
}

function compare() {
  const verdicts = [...document.querySelectorAll("#compare-battles .battle-verdict")].map(
    (verdict) => verdict.textContent,
  );
  return verdicts.length ? verdicts.join(" · ") : shown("#compare .empty") || t("fold.noCompare");
}

function saves() {
  const names = [...document.querySelectorAll("#save-list .name")].map((name) => name.textContent);
  return names.length ? t("fold.saves", { n: names.length, last: names[0] }) : t("fold.noSave");
}

/** Each block, by its id: the line it folds to. */
export const SUMMARIES = {
  game: () => shown("#game-select option:checked"),
  "load-setup": loadSetup,
  bonuses,
  army,
  heroes,
  profile,
  compare,
  dashboards: () =>
    `${shown("#dashboards [role=tab][aria-selected=true]")} · ${shown("#compare-a option:checked")} / ${shown("#compare-b option:checked")}`,
  saves,
  ...SETUP_SUMMARIES,
};
