// Your setup's summary and its save state (CFG-04, D-27): one tile per section, with its key figure and its state in
// an icon and a word (entered, not entered, coming); then whether the edits are saved, and the Save and Discard
// buttons, usable only when there is something to save. Redrawn after every edit, typed values included.
import { byId, escape, keepingFocus } from "../../dom.js";
import { drawSetupTroops } from "./troops.js";
import { number } from "../../format.js";
import { CONFIG } from "../../config.js";
import { currentGame, state } from "../../state.js";
import { marchCapacity } from "../../../engine/index.js";
import { unsavedCount } from "../../player-setup.js";
import { t } from "../../texts/index.js";
import { drawSetupWarlords } from "./warlords.js";
import { drawSetupLevelled } from "./levelled.js";
import { drawSetupChampion } from "./champion.js";

const STATES = { entered: "✓", empty: "○", coming: "◌" };

/** The setup's march capacity, its bonus applied; null while no base is entered. */
export function setupCapacity() {
  const { base, bonusPercent = 0 } = state.playerSetup.capacity;
  if (base === undefined) return null;
  return marchCapacity({ marchCapacity: base }, [{ stat: "marchCapacity", percent: bonusPercent }]);
}

function tile(section, figure, kind, words) {
  return `<li class="setup-tile setup-tile-${kind}" data-tile="${section}">
    <span class="tile-name">${escape(t(`tile.${section}`))}</span>
    <span class="tile-figure">${escape(figure)}</span>
    <span class="tile-state"><span aria-hidden="true">${STATES[kind]}</span> ${escape(words)}</span>
  </li>`;
}

/** The champion's tile: its level and how many pieces it wears, or not entered. */
function championTile(filled) {
  const { champion } = state.playerSetup;
  const figure = champion
    ? t("tile.championFigure", { level: champion.level ?? "—", n: champion.gear?.length ?? 0 })
    : "—";
  return tile("champion", figure, ...filled(champion !== null));
}

/** The troops owned: how many kinds, and how many in all (CFG-08). */
function troopsTile(filled) {
  const { troops } = state.playerSetup;
  const total = troops.reduce((sum, troop) => sum + troop.count, 0);
  const figure = troops.length ? t("tile.troopsFigure", { n: troops.length, total: number(total) }) : "—";
  return tile("troops", figure, ...filled(troops.length > 0));
}

function tiles() {
  const owned = state.playerSetup.warlords.length;
  const capacity = setupCapacity();
  const filled = (yes) => (yes ? ["entered", t("tile.entered")] : ["empty", t("tile.empty")]);
  const coming = Object.entries(CONFIG.setupComing).map(([section, version]) =>
    tile(section, "—", "coming", version === "next" ? t("tile.next") : t("tile.coming", { version })),
  );
  return [
    tile("warlords", t("tile.owned", { n: owned, total: currentGame().warlords.size }), ...filled(owned > 0)),
    tile("capacity", capacity ? number(capacity.total) : "—", ...filled(capacity !== null)),
    ...["rituals", "buildings"].map((section) => {
      const entries = section === "rituals" ? currentGame().rituals.rituals : currentGame().structures.structures;
      const n = state.playerSetup[section].length;
      return tile(section, t("tile.owned", { n, total: entries.length }), ...filled(n > 0));
    }),
    championTile(filled),
    troopsTile(filled),
    ...coming,
  ].join("");
}

/** The save state in words with its icon, and the buttons usable only when there is something to save. */
function drawStatus() {
  const count = unsavedCount();
  const nothingSaved = !state.savedPlayerSetup.warlords.length && state.savedPlayerSetup.capacity.base === undefined;
  const [icon, words, tone] = state.setupSaveFailed
    ? ["⚠", t("setup.failed"), "critical"]
    : count > 0
      ? ["⚠", count === 1 ? t("setup.unsavedOne") : t("setup.unsaved", { n: count }), "pending"]
      : nothingSaved
        ? ["○", t("setup.never"), "pending"]
        : ["✓", t("setup.saved"), "good"];
  const status = byId("setup-status");
  status.innerHTML = `<span aria-hidden="true">${icon}</span> ${escape(words)}`;
  status.classList.toggle("critical", tone === "critical");
  status.classList.toggle("pending", tone === "pending");
  byId("setup-save").disabled = count === 0;
  byId("setup-discard").disabled = count === 0;
}

/** The capacity's total under its fields, in the words the Battle lab uses. */
function drawCapacityTotal() {
  const capacity = setupCapacity();
  byId("setup-capacity-total").textContent = capacity
    ? t("capacity.summary", {
        base: number(capacity.base),
        bonus: number(capacity.bonus),
        percent: number(capacity.percent, 1),
        total: number(capacity.total),
      })
    : "";
}

/** What changes as values are typed: the tiles, the save state and the capacity's total. */
export function drawSetupStatus() {
  byId("setup-summary").innerHTML = tiles();
  drawStatus();
  drawCapacityTotal();
}

/** The capacity's fields, from the setup (not while typed in: only on a full redraw). */
export function drawSetupCapacityFields() {
  const { base, bonusPercent } = state.playerSetup.capacity;
  byId("setup-capacity-base").value = base ?? "";
  byId("setup-capacity-bonus").value = bonusPercent ?? "";
}

/** Your setup redrawn whole: after a hero is added, removed or levelled, a save or a discard. */
export function drawSetup() {
  keepingFocus(() => {
    drawSetupWarlords();
    drawSetupCapacityFields();
    drawSetupLevelled();
    drawSetupChampion();
    drawSetupTroops();
  });
  drawSetupStatus();
}
