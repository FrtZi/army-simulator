// The path drawn as branches (SIM-22, D-51): from the army chosen, one branch per step, thicker for a larger gain,
// coloured by kind (ritual, hero, building, champion), each named with its gain; its cost in its tooltip. The same
// steps are listed in words in the tab "To improve".
import { escape } from "../../dom.js";
import { t } from "../../texts/index.js";
import { label } from "../../format.js";
import { costText, entryOf, gainText, whatText } from "./path.js";

const ROOT = { x: 20, width: 150, height: 56 };
const LEAF_X = 350;
const ROW = 31;
const LONGEST = 26; // characters a step's name keeps beside its leaf before an ellipsis
const THICKEST = 8;

const KIND_MARK = {
  ritual: "kind-ritual",
  hero: "kind-hero",
  structure: "kind-structure",
  gear: "kind-champion",
  skill: "kind-champion",
};

const short = (text) => (text.length > LONGEST ? `${text.slice(0, LONGEST - 1)}…` : text);

/** A leaf's words: its name, short, and its levels (its kind is its colour, named in the legend). */
function leafText(step) {
  const name = short(label(entryOf(step)));
  return step.from ? `${name} ${step.from} → ${step.to}` : `${name} · ${t("optimiser.leafNew")}`;
}

/** A branch from the root to its leaf, its words and its gain; its cost in a tooltip. */
function branch(result, step, index, { rootY, most }) {
  const y = 20 + index * ROW;
  const width = Math.max(1.5, (step.gain / most) * THICKEST);
  const mark = KIND_MARK[step.kind];
  const curve = `M${ROOT.x + ROOT.width} ${rootY} C 260 ${rootY}, 260 ${y}, ${LEAF_X} ${y}`;
  return `<g class="opt-branch ${mark}"><title>${escape(`${whatText(step)} · ${gainText(result, step.gain)} · ${costText(step)}`)}</title>
    <path class="branch" d="${curve}" stroke-width="${Math.round(width * 10) / 10}"/>
    <circle class="leaf" cx="${LEAF_X + 6}" cy="${y}" r="4.5"/>
    <text class="leaf-text" x="${LEAF_X + 18}" y="${y}" dominant-baseline="central">${escape(leafText(step))}</text>
    <text class="leaf-gain" x="672" y="${y}" text-anchor="end" dominant-baseline="central">${escape(gainText(result, step.gain))}</text></g>`;
}

/** The kinds the steps hold, each named by its mark. */
function legend(steps) {
  const kinds = [...new Set(steps.map((step) => step.kind))];
  return `<ul class="opt-legend">${kinds
    .map(
      (kind) =>
        `<li><span class="opt-dot ${KIND_MARK[kind]}" aria-hidden="true"></span>${escape(t(`optimiser.kind-${kind}`))}</li>`,
    )
    .join("")}</ul>`;
}

/** The path as branches, and its line; nothing to draw when no step adds to the army. */
export function pathPicture(result) {
  const { steps } = result.path;
  if (!steps.length) {
    return { body: `<p class="empty">${escape(t("optimiser.pathNone"))}</p>`, line: t("optimiser.pathNone") };
  }
  const height = 20 + steps.length * ROW;
  const rootY = Math.max(ROOT.height / 2 + 4, (20 + (steps.length - 1) * ROW + 20) / 2);
  const most = Math.max(...steps.map((step) => step.gain)) || 1;
  const root = `<g class="opt-root"><rect x="${ROOT.x}" y="${rootY - ROOT.height / 2}" width="${ROOT.width}" height="${ROOT.height}" rx="8"/>
    <text x="${ROOT.x + ROOT.width / 2}" y="${rootY}" text-anchor="middle" dominant-baseline="central">${escape(t("optimiser.treeRoot"))}</text></g>`;
  const name = t("optimiser.treePicture", { n: steps.length });
  const svg = `<svg class="opt-tree" viewBox="0 0 680 ${height}" role="img" aria-label="${escape(name)}">${root}${steps
    .map((step, index) => branch(result, step, index, { rootY, most }))
    .join("")}</svg>`;
  return {
    body: `${svg}${legend(steps)}`,
    line: t("optimiser.treeLine", { n: steps.length, gain: gainText(result, steps[0].gain) }),
  };
}
