// The tab "X or Y" (SIM-21, D-48): two aims ticked freely (gods, troop types), each side's best army for the goal chosen,
// against the best with no aim; the better of the two marked with an icon and a word.
import { CONFIG } from "../../config.js";
import { escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { multiFilter } from "../../filters.js";
import { block } from "./blocks.js";
import { battleWords } from "./words.js";

const SIDES = ["x", "y"];

/** An aim in words: the gods and types ticked, or "any troop". */
function aimText(aim) {
  const names = CONFIG.optimiser.aimFilters.flatMap((field) =>
    (aim[field] ?? []).map((value) => nameOf({ alignment: "alignments", unitType: "unitTypes" }[field], value)),
  );
  return names.length ? names.join(", ") : t("optimiser.xyAny");
}

/** A side's army against the best with no aim: what it costs, or its battle. */
function againstFree(side, { goal, free }) {
  if (goalOf(goal).battle) return battleWords(side.score);
  if (!(free > 0) || !(free > side.score)) return t("optimiser.xyFree");
  return t("optimiser.xyCost", { percent: number((1 - side.score / free) * 100, 1) });
}

/** A side's card: its aim, its verdict against the other, its heroes and its largest troops. */
function card(name, side, other, result) {
  const aim = aimText(state.optimiserXY.aims[name]);
  if (!side) {
    return `<li class="opt-xy"><strong>${escape(aim)}</strong> <p class="empty">${escape(t("optimiser.xyNone"))}</p></li>`;
  }
  const { warlords, catalogue } = currentGame();
  const verdict =
    !other || side.score > other.score
      ? t("optimiser.xyBetter")
      : side.score === other.score
        ? t("optimiser.xySame")
        : "";
  const heroes = side.composition.heroes.map(({ id, level }) => `${label(warlords.get(id))} ${level}`).join(", ");
  const troops = Object.entries(side.composition.troops)
    .sort((a, b) => b[1] - a[1])
    .slice(0, CONFIG.optimiser.xyTroops)
    .map(([id, count]) => `${label(catalogue.units.get(id))} × ${number(count)}`)
    .join(", ");
  return `<li class="opt-xy"><strong>${escape(aim)}</strong>${verdict ? ` <span class="opt-badge">${escape(verdict)}</span>` : ""}
    <p>${escape(againstFree(side, result))}</p><p class="meta">${escape(heroes)}</p><p class="meta">${escape(troops)}</p></li>`;
}

/** The tab: each side's filters, the button, and the two cards once compared. */
export function xyPanel() {
  const { aims, result } = state.optimiserXY;
  const pickers = SIDES.map(
    (name) => `<fieldset class="opt-aim"><legend>${escape(t(`optimiser.xy-${name}`))}</legend>
      <div class="filters" id="optimiser-xy-${name}">${CONFIG.optimiser.aimFilters
        .map((field) => multiFilter(`xy-${name}`, field, aims[name][field]))
        .join("")}</div></fieldset>`,
  ).join("");
  const cards = result
    ? `<ul class="opt-list opt-xys">${card("x", result.x, result.y, result)}${card("y", result.y, result.x, result)}</ul>`
    : "";
  const line = result ? t("optimiser.xyLine", { x: aimText(aims.x), y: aimText(aims.y) }) : t("optimiser.xyEmpty");
  const body = `<p class="hint">${escape(t("optimiser.xyHint"))}</p>${pickers}
    <button id="optimiser-xy-run" type="button" class="secondary">${escape(t("optimiser.xyRun"))}</button>${cards}`;
  return block("xy", t("optimiser.xyTitle"), line, body);
}
