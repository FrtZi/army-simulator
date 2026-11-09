// Your setup's heroes (CFG-04, D-27): the warlords the player owns, each at its rank and level as the game shows
// them, with the power the site works out at that level, marked when new or changed since the last save; the
// ones removed since are named under the list. A choice of the others adds one, at rank 1, level 1.
import { byId, escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { ICONS, troopIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { heroUnit, rankOf } from "../../../engine/index.js";
import { warlordChanges } from "../../player-setup.js";
import { heroMeta } from "../heroes/draw.js";
import { t } from "../../texts/index.js";

const numbers = (count, selected) =>
  Array.from({ length: count }, (_, index) => index + 1)
    .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`)
    .join("");

function choice(key, id, name, count, selected) {
  const field = `setup-${key}-${id}`;
  return `<label for="${field}"><span aria-hidden="true">${escape(t(`heroes.${key}`))}</span><span class="visually-hidden">${escape(t(`heroes.${key}Of`, { name }))}</span></label>
    <select id="${field}" data-setup-${key}="${id}">${numbers(count, selected)}</select>`;
}

function line({ id, level }, mark) {
  const { warlords, game } = currentGame();
  const warlord = warlords.get(id);
  const unit = heroUnit(warlord, level);
  const name = label(warlord);
  const at = rankOf(level, game.heroRules);
  const power = t("heroes.at", { level, power: number(unit.stats.squadPower) });
  const badge = mark ? ` <span class="setup-mark">${escape(t(`setup.${mark}`))}</span>` : "";
  return `<li class="army-line hero-line${mark ? " setup-changed" : ""}">
    ${troopIcon(unit)}
    <div class="who"><span class="name">${escape(name)}</span>${badge}<span class="meta">${escape(`${heroMeta(unit)} · ${power}`)}</span></div>
    <div class="hero-level">${choice("rank", id, name, game.heroRules.ranks, at.rank)}${choice("level", id, name, game.heroRules.levelsPerRank, at.level)}</div>
    <button type="button" class="icon" id="setup-remove-${id}" data-setup-remove="${id}" aria-label="${escape(t("heroes.remove", { name }))}">${ICONS.close}</button>
  </li>`;
}

/** The warlords not owned yet, by god then name, for the choice that adds one. */
function addChoice() {
  const owned = new Set(state.playerSetup.warlords.map((warlord) => warlord.id));
  const others = [...currentGame().warlords.values()].filter((warlord) => !owned.has(warlord.id));
  const select = byId("setup-warlord-select");
  byId("setup-warlord-add").disabled = others.length === 0;
  if (!others.length) {
    select.innerHTML = `<option value="">${escape(t("setup.allOwned"))}</option>`;
    return;
  }
  // the gods in the game's order, each with its warlords not owned yet
  const gods = currentGame()
    .game.alignments.map((god) => god.id)
    .filter((god) => others.some((warlord) => warlord.alignment === god));
  select.innerHTML = gods
    .map((god) => {
      const choices = others
        .filter((warlord) => warlord.alignment === god)
        .sort((a, b) => label(a).localeCompare(label(b)))
        .map((warlord) => `<option value="${warlord.id}">${escape(label(warlord))}</option>`);
      return `<optgroup label="${escape(nameOf("alignments", god))}">${choices.join("")}</optgroup>`;
    })
    .join("");
}

export function drawSetupWarlords() {
  const { marks, removed } = warlordChanges();
  const owned = state.playerSetup.warlords;
  byId("setup-warlord-list").innerHTML = owned.length
    ? owned.map((warlord) => line(warlord, marks[warlord.id])).join("")
    : `<li class="empty">${escape(t("setup.noWarlord"))}</li>`;
  const names = removed.map((id) => label(currentGame().warlords.get(id)));
  byId("setup-warlords-removed").textContent = names.length ? t("setup.removed", { names: names.join(", ") }) : "";
  addChoice();
}
