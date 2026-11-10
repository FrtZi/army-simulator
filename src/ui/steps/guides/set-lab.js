// The set lab (GUIDE-09): a piece per slot at a rarity, each slot with its pictogram and its level and rarity in one
// list; a set chosen puts its pieces in their slots and keeps only them in the lists (Frantz, 2026-11-10). It shows
// what the gear gives in all (the champion's figures, BONUS-08) and what it asks from nothing: the buildings, and
// every resource and item, each a way to its page. It starts from the gear of the saved setup; nothing is saved.
import { escape, options } from "../../dom.js";
import { label, number } from "../../format.js";
import { slotIcon } from "../../icons.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { costBetween } from "../../../engine/index.js";
import { pieceLevels } from "../../../storage/setup-champion.js";
import { championFiguresHtml } from "../../champion-figures.js";
import { gearLevelOptions, gearRarity, rarityBadge } from "../../rarity.js";
import { itemLink } from "./costs.js";

const data = () => currentGame().champion;
const piece = (id) => data().pieces.find((entry) => entry.id === id);

/** The lab's own state: the set chosen, and the gear tried (the saved setup's at first). */
export function labState() {
  const guide = state.guide.champion;
  guide.lab ??= { set: "", gear: (state.savedPlayerSetup.champion?.gear ?? []).map((entry) => ({ ...entry })) };
  return guide.lab;
}

const wornIn = (slot) => labState().gear.find((entry) => piece(entry.id)?.slot === slot);

/** A set chosen: its pieces in their slots, at the level each slot had (1 when empty, at most the piece's top). */
export function chooseSet(id) {
  const lab = labState();
  lab.set = id;
  const set = data().sets.find((entry) => entry.id === id);
  if (!set) return;
  lab.gear = data()
    .slots.map((slot) => {
      const fromSet = set.pieces.map(piece).find((entry) => entry?.slot === slot);
      const current = wornIn(slot);
      if (!fromSet) return current;
      return { id: fromSet.id, level: Math.min(current?.level ?? 1, pieceLevels(fromSet)) };
    })
    .filter(Boolean);
}

/** A slot's piece or level chosen; an empty piece leaves the slot empty. */
export function chooseInSlot(slot, field, value) {
  const lab = labState();
  const others = lab.gear.filter((entry) => piece(entry.id)?.slot !== slot);
  const current = wornIn(slot);
  if (field === "piece") {
    lab.gear = value ? [...others, { id: value, level: current?.id === value ? current.level : 1 }] : others;
  } else lab.gear = [...others, { id: current.id, level: Number(value) }];
}

function slotRow(slot) {
  const set = data().sets.find((entry) => entry.id === labState().set);
  const inSlot = data().pieces.filter((entry) => entry.slot === slot);
  const ofSet = inSlot.filter((entry) => set?.pieces.includes(entry.id));
  const pieces = (ofSet.length ? ofSet : inSlot).sort((a, b) => label(a).localeCompare(label(b))); // the set's, if any
  const current = wornIn(slot);
  const name = t(`guides.slot-${slot}`);
  const choice = options(
    [["", t("setup.noPiece")], ...pieces.map((entry) => [entry.id, label(entry)])],
    current?.id ?? "",
  );
  const rarity = current && gearRarity(current.level);
  const levels = current
    ? `<select id="lab-level-${slot}" class="rarity-${rarity}" data-set-lab="level" data-slot="${slot}" aria-label="${escape(t("setup.pieceLevel", { slot: name }))}">${options(
        gearLevelOptions(pieceLevels(piece(current.id))).map(([level, text]) => [level, `◆ ${text}`]),
        current.level,
      )}</select>`
    : "";
  return `<li class="lab-slot"><label for="lab-piece-${slot}">${slotIcon(slot)} ${escape(name)}</label>
    <select id="lab-piece-${slot}" data-set-lab="piece" data-slot="${slot}">${choice}</select>${levels}</li>`;
}

/** What the gear asks from nothing: the buildings (the highest level asked), and each resource and item in all. */
function asksHtml(gear) {
  const totals = {};
  const buildings = {};
  for (const { id, level } of gear) {
    for (const [item, quantity] of Object.entries(costBetween(piece(id), 0, level))) {
      totals[item] = (totals[item] ?? 0) + quantity;
    }
    for (const [building, levels] of Object.entries(piece(id).requires.structure ?? {})) {
      buildings[building] = Math.max(
        buildings[building] ?? 0,
        ...levels.slice(0, level).filter((asked) => asked !== null),
      );
    }
  }
  const structures = currentGame().structures.structures;
  const needs = Object.entries(buildings).map(
    ([id, level]) =>
      `<li>${escape(t("guides.needs", { name: label(structures.find((entry) => entry.id === id)) || id, level }))}</li>`,
  );
  const rows = Object.entries(totals).map(
    ([item, quantity]) =>
      `<tr><td>${itemLink(item)} ${rarityBadge(currentGame().items.get(item)?.rarity)}</td><td class="num">${number(quantity)}</td></tr>`,
  );
  return `<h4>${escape(t("lab.asks"))}</h4>${needs.length ? `<ul class="guide-requires">${needs.join("")}</ul>` : ""}
    <table class="guide-table"><thead><tr><th scope="col">${escape(t("guides.resource"))}</th><th scope="col" class="num">${escape(t("guides.fromStart"))}</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

export function setLabHtml() {
  const lab = labState();
  const sets = [["", t("lab.everySet")], ...data().sets.map((set) => [set.id, label(set)])];
  return `<h3 id="guide-champion-title">${escape(t("guides.view-lab"))}</h3>
    <p class="hint">${escape(t("lab.hint"))}</p>
    <div class="field"><label for="lab-set">${escape(t("lab.set"))}</label><select id="lab-set" data-set-lab="set">${options(sets, lab.set)}</select></div>
    <ul class="lab-slots">${data().slots.map(slotRow).join("")}</ul>
    ${lab.gear.length ? `${championFiguresHtml({ gear: lab.gear })}${asksHtml(lab.gear)}` : ""}`;
}
