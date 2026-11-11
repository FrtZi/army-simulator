// Two gear sets side by side in the Champion lab (BONUS-09): each a piece per slot at its rarity, a set chosen to put
// its pieces in place; below, every bonus the two give, in battle and beyond, by domain, with B against A.
import { byId, escape, options } from "../../dom.js";
import { label } from "../../format.js";

import { slotIcon } from "../../icons.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { pieceLevels } from "../../../storage/setup-champion.js";
import { gearLevelSelect } from "../../rarity.js";
import { bonusInfo, gearBonuses, totalText } from "../../champion-bonuses.js";
import { lab } from "./lab.js";

const SIDES = ["a", "b"];
const DOMAINS = ["battle", "conquest", "battle-other", "economy", "other"];
const data = () => currentGame().champion;
const piece = (id) => data().pieces.find((entry) => entry.id === id);
const domainName = (domain) =>
  domain === "battle"
    ? t("clab.domain-battle")
    : label(currentGame().game.bonusDomains.find((entry) => entry.id === domain));
const wornIn = (side, slot) => lab().gear[side].find((entry) => piece(entry.id)?.slot === slot);

/** A set chosen on a side: its pieces in their slots, each at the level its slot had (1 when empty). */
export function chooseSideSet(side, id) {
  lab().set[side] = id;
  const set = data().sets.find((entry) => entry.id === id);
  if (!set) return;
  lab().gear[side] = data()
    .slots.map((slot) => {
      const fromSet = set.pieces.map(piece).find((entry) => entry?.slot === slot);
      const current = wornIn(side, slot);
      if (!fromSet) return current;
      return { id: fromSet.id, level: Math.min(current?.level ?? 1, pieceLevels(fromSet)) };
    })
    .filter(Boolean);
}

/** A slot's piece or level chosen on a side. */
export function chooseSidePiece(side, slot, field, value) {
  const others = lab().gear[side].filter((entry) => piece(entry.id)?.slot !== slot);
  const current = wornIn(side, slot);
  if (field === "piece") lab().gear[side] = value ? [...others, { id: value, level: 1 }] : others;
  else lab().gear[side] = [...others, { id: current.id, level: Number(value) }];
}

function slotRow(side, slot) {
  const set = data().sets.find((entry) => entry.id === lab().set[side]);
  const inSlot = data().pieces.filter((entry) => entry.slot === slot);
  const ofSet = inSlot.filter((entry) => set?.pieces.includes(entry.id));
  const pieces = (ofSet.length ? ofSet : inSlot).sort((a, b) => label(a).localeCompare(label(b)));
  const current = wornIn(side, slot);
  const name = t(`guides.slot-${slot}`);
  const id = `clab-${side}-${slot}`;
  const choice = options(
    [["", t("setup.noPiece")], ...pieces.map((entry) => [entry.id, label(entry)])],
    current?.id ?? "",
  );
  const level = current
    ? gearLevelSelect(
        `data-clab-level="${slot}" data-side="${side}" aria-label="${escape(t("setup.pieceLevel", { slot: name }))}"`,
        pieceLevels(piece(current.id)),
        current.level,
      )
    : "";
  return `<li class="lab-slot"><label for="${id}">${slotIcon(slot)} ${escape(name)}</label>
    <select id="${id}" data-clab-piece="${slot}" data-side="${side}">${choice}</select>${level}</li>`;
}

function sideHtml(side) {
  const sets = [["", t("lab.everySet")], ...data().sets.map((set) => [set.id, label(set)])];
  return `<h3>${escape(t(`clab.side-${side}`))}</h3>
    <div class="field"><label for="clab-set-${side}">${escape(t("lab.set"))}</label><select id="clab-set-${side}" data-clab-set="${side}">${options(sets, lab().set[side])}</select></div>
    <ul class="lab-slots">${data()
      .slots.map((slot) => slotRow(side, slot))
      .join("")}</ul>`;
}

// as the battle comparison: better in green with ▲, weaker in red with ▼, equal in orange with =, and a word for screen readers
const MARK = { win: "▲", lose: "▼", tie: "=" };

/** How A and B fare on a bonus: the one giving more wins, unless less is better (game.json `lowerIsBetter`). */
function outcomes(id, gap) {
  const value = gap.percent || gap.flat;
  if (!value) return ["tie", "tie"];
  const lower = new RegExp(currentGame().game.lowerIsBetter).test(id);
  return value > 0 !== lower ? ["lose", "win"] : ["win", "lose"];
}

const cell = (total, result) =>
  `<td class="num ${result}"><span aria-hidden="true">${MARK[result]}</span> ${totalText(total)}<span class="visually-hidden"> (${escape(t(`compare.${result}`))})</span></td>`;

/** Every bonus of the two sets, by domain: A, B, and how B differs. */
function compareHtml() {
  const [a, b] = SIDES.map((side) => gearBonuses(lab().gear[side]));
  const ids = [...new Set([...a.keys(), ...b.keys()])];
  const none = { percent: 0, flat: 0 };
  const blocks = DOMAINS.map((domain) => {
    const rows = ids
      .map((id) => ({ id, ...bonusInfo(id) }))
      .filter((bonus) => bonus.domain === domain)
      .sort((x, y) => x.name.localeCompare(y.name))
      .map(({ id, name }) => {
        const [one, two] = [a.get(id) ?? none, b.get(id) ?? none];
        const gap = { percent: two.percent - one.percent, flat: two.flat - one.flat };
        const [ofA, ofB] = outcomes(id, gap);
        return `<tr><td>${escape(name)}</td>${cell(one, ofA)}${cell(two, ofB)}${cell(gap, ofB)}</tr>`;
      });
    if (!rows.length) return "";
    const head = ["guides.bonus", "clab.side-a", "clab.side-b", "clab.gap"].map(
      (key, column) => `<th scope="col"${column ? ' class="num"' : ""}>${escape(t(key))}</th>`,
    );
    return `<details class="item-family" open><summary>${escape(domainName(domain))} <span class="meta">${escape(t("clab.bonusCount", { n: rows.length }))}</span></summary>
      <div class="table-wrap"><table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div></details>`;
  });
  return blocks.join("") || `<p class="hint">${escape(t("clab.noGear"))}</p>`;
}

export function drawGear() {
  for (const side of SIDES) byId(`clab-side-${side}`).innerHTML = sideHtml(side);
  byId("clab-compare").innerHTML = compareHtml();
}
