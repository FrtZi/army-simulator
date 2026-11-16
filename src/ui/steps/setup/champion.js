// Your setup's champion (BL-13, D-30): its level, per slot the piece it wears at its level, as the game shows them,
// and its skills (BONUS-10). A choice shows at once, unsaved until Save; nothing set leaves the champion out.
import { byId, escape, keepingFocus, options } from "../../dom.js";
import { label } from "../../format.js";
import { slotIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { drawSetupStatus } from "./draw.js";
import { pieceLevels } from "../../../storage/setup-champion.js";
import { gearLevelSelect } from "../../rarity.js";
import { championFiguresHtml } from "../../champion-figures.js";
import { chooseSkill, drawSetupSkills, skillsWith } from "./champion-skills.js";

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
  drawSetupSkills();
}

/** The champion with a change ({ level }, { gear } or { skills }): only what is set; nothing set leaves it out. */
function changeChampion(change) {
  const merged = { ...state.playerSetup.champion, ...change };
  const set = Object.entries(merged).filter(([, value]) => (Array.isArray(value) ? value.length : value));
  state.playerSetup.champion = set.length ? Object.fromEntries(set) : null;
}

function setChampion(change) {
  changeChampion(change);
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
  setChampion({ gear: id ? [...others, { id, level }] : others });
}

/** A skill's level typed: kept with the champion, the tree redrawn, the field kept as typed. */
function typeSkill(input) {
  const skills = skillsWith(input);
  if (!skills) return;
  changeChampion({ skills });
  drawSetupSkills({ editor: false });
  drawSetupStatus();
}

export function bindSetupChampion() {
  const section = byId("setup-champion");
  section.addEventListener("input", (event) => {
    if (event.target.dataset.setupSkill) typeSkill(event.target);
  });
  section.addEventListener("click", (event) => {
    const node = event.target.closest("[data-setup-skill-node]");
    if (node) chooseSkill(node.dataset.setupSkillNode);
  });
  section.addEventListener("change", (event) => {
    const { setupGear, setupGearLevel } = event.target.dataset;
    if (event.target.id === "setup-champion-level") {
      setChampion({ level: Number(event.target.value) || undefined });
    } else if (event.target.id === "setup-skill-tree") {
      Object.assign(state, { setupSkillTree: event.target.value, setupSkillChosen: null });
      keepingFocus(() => drawSetupSkills());
    } else if (setupGear) {
      chooseGear(setupGear);
    } else if (setupGearLevel) {
      const id = byId(`setup-gear-${setupGearLevel}`).value;
      const gear = worn().map((entry) => (entry.id === id ? { id, level: Number(event.target.value) } : entry));
      setChampion({ gear });
    }
  });
}
