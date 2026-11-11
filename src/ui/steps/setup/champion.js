// Your setup's champion (BL-13, D-30): its level, and per slot the piece it wears at its level, as the
// game shows them. A choice shows at once, unsaved until Save; no level and no piece leave the champion out.
import { byId, escape, keepingFocus, options } from "../../dom.js";
import { label } from "../../format.js";
import { slotIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { drawSetupStatus } from "./draw.js";
import { pieceLevels } from "../../../storage/setup-champion.js";
import { gearLevelSelect } from "../../rarity.js";
import { championFiguresHtml } from "../../champion-figures.js";

const numbers = (count) => Array.from({ length: count }, (_, index) => [index + 1, String(index + 1)]);
const slots = () => currentGame().champion.slots; // in the game's order
const worn = () => state.playerSetup.champion?.gear ?? [];

function slotRow(slot) {
  const pieces = currentGame()
    .champion.pieces.filter((piece) => piece.slot === slot)
    .sort((a, b) => label(a).localeCompare(label(b)));
  const current = worn().find((entry) => pieces.some((piece) => piece.id === entry.id));
  const piece = pieces.find((entry) => entry.id === current?.id);
  const choice = options(
    [["", t("setup.noPiece")], ...pieces.map((entry) => [entry.id, label(entry)])],
    current?.id ?? "",
  );
  const name = t(`guides.slot-${slot}`);
  return `<li class="setup-gear-row">
    <div class="field"><label for="setup-gear-${slot}">${slotIcon(slot)} ${escape(name)}</label><select id="setup-gear-${slot}" data-setup-gear="${slot}">${choice}</select></div>
    <div class="field"><label for="setup-gear-level-${slot}">${escape(t("setup.pieceLevel", { slot: name }))}</label>${piece ? gearLevelSelect(`id="setup-gear-level-${slot}" data-setup-gear-level="${slot}"`, pieceLevels(piece), current.level) : `<select id="setup-gear-level-${slot}" data-setup-gear-level="${slot}" disabled></select>`}</div>
  </li>`;
}

export function drawSetupChampion() {
  const max = currentGame().champion.champion.power.length;
  byId("setup-champion-level").innerHTML = options(
    [["", t("setup.noLevel")], ...numbers(max)],
    state.playerSetup.champion?.level ?? "",
  );
  byId("setup-champion-gear").innerHTML = slots().map(slotRow).join("");
  byId("setup-champion-figures").innerHTML = championFiguresHtml(state.playerSetup.champion); // BONUS-08
}

/** The champion as chosen: only what is set; nothing set leaves it out (null). */
function setChampion(level, gear) {
  const champion = { ...(level && { level }), ...(gear.length && { gear }) };
  state.playerSetup.champion = Object.keys(champion).length ? champion : null;
  keepingFocus(drawSetupChampion);
  drawSetupStatus();
}

/** A slot's piece or level chosen: the other slots' pieces kept, this slot's replaced. */
function chooseGear(slot) {
  const inSlot = new Set(
    currentGame()
      .champion.pieces.filter((piece) => piece.slot === slot)
      .map((piece) => piece.id),
  );
  const others = worn().filter((entry) => !inSlot.has(entry.id));
  const id = byId(`setup-gear-${slot}`).value;
  const before = worn().find((entry) => entry.id === id);
  const level =
    byId(`setup-gear-level-${slot}`).disabled || !before ? 1 : Number(byId(`setup-gear-level-${slot}`).value);
  setChampion(state.playerSetup.champion?.level, id ? [...others, { id, level }] : others);
}

export function bindSetupChampion() {
  byId("setup-champion").addEventListener("change", (event) => {
    const { setupGear, setupGearLevel } = event.target.dataset;
    if (event.target.id === "setup-champion-level") {
      setChampion(Number(event.target.value) || undefined, worn());
    } else if (setupGear) {
      chooseGear(setupGear);
    } else if (setupGearLevel) {
      const id = byId(`setup-gear-${setupGearLevel}`).value;
      const gear = worn().map((entry) => (entry.id === id ? { id, level: Number(event.target.value) } : entry));
      setChampion(state.playerSetup.champion?.level, gear);
    }
  });
}
