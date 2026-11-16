// The path under the army found (SIM-12, D-42, D-43, D-44): each hero to get or raise, each ritual or building one
// level up that can be done now, each champion's piece or skill one level up, by what it adds to the goal, the most
// first; its cost summed as the guides sum it (D-29), a skill's a point, shown and not weighed (Frantz: gain first).
import { escape } from "../../dom.js";
import { label, number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { levelledEntries } from "../../optimiser-path.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { costBetween } from "../../../engine/index.js";
import { block } from "./blocks.js";
import { allSkills } from "../../../storage/setup-champion.js";

const TINY = 0.05; // a gain in % that one decimal rounds to 0

const itemName = (id) => label(currentGame().items.get(id)) || id;

const ENTRIES = {
  hero: (game, id) => game.warlords.get(id),
  ritual: (game, id) => levelledEntries(game).ritual.get(id),
  structure: (game, id) => levelledEntries(game).structure.get(id),
  gear: (game, id) => game.champion.pieces.find((piece) => piece.id === id),
  skill: (game, id) => allSkills(game.championSkills).find((skill) => skill.id === id),
};

/** A step's entry: a hero, a ritual, a building, a gear piece or a skill, as the game's data holds it. */
const entryOf = ({ kind, id }) => ENTRIES[kind](currentGame(), id);

/** A step's gain in words: by how much the goal's score rises, or the battle's margin in power. */
function gainText(result, gain) {
  if (goalOf(result.goal).battle) return t("optimiser.pathPower", { gain: number(gain) });
  const percent = (gain / result.score) * 100;
  // below what one decimal shows: said so, not "+0 %"
  return percent < TINY ? t("optimiser.pathTiny") : t("optimiser.pathPercent", { percent: number(percent, 1) });
}

/** What a step costs, each item in the player's language. */
function costText(step) {
  if (step.kind === "skill") return t("optimiser.pathPoint");
  const items = Object.entries(costBetween(entryOf(step), step.from, step.to));
  if (!items.length) return t("guides.free");
  return t("optimiser.pathCost", {
    cost: items.map(([item, count]) => `${number(count)} ${itemName(item)}`).join(" · "),
  });
}

/** What the step does: a hero got or raised, a ritual, a building, a piece or a skill one level up, a piece put on. */
function whatText(step) {
  const name = label(entryOf(step));
  if (step.kind === "gear" && !step.from) return t("optimiser.pathPutOn", { name });
  if (step.kind !== "hero") return t(`optimiser.path-${step.kind}`, { name, from: step.from, to: step.to });
  return step.from
    ? t("optimiser.pathRaise", { name, from: step.from, to: step.to })
    : t("optimiser.pathGet", { name });
}

/** A step that opens on its cost: what it does and its gain, its kind marked on its edge (its words say it too). */
function stepItem(result, step) {
  return `<li class="opt-step" data-kind="${step.kind}"><details><summary>${escape(`${whatText(step)} · ${gainText(result, step.gain)}`)}</summary><span class="opt-cost"> · ${escape(costText(step))}</span></details></li>`;
}

/** The tab "To improve": the path in a block, how it reads, its steps, or that none adds to the army now. */
export function upPanel(result) {
  const { steps } = result.path;
  const body = steps.length
    ? `<ol id="optimiser-path" class="opt-list">${steps.map((step) => stepItem(result, step)).join("")}</ol>`
    : `<p class="empty" id="optimiser-path">${escape(t("optimiser.pathNone"))}</p>`;
  const first = steps[0] ? `${whatText(steps[0])} · ${gainText(result, steps[0].gain)}` : t("optimiser.pathNone");
  const line = t("optimiser.pathLine", { n: steps.length, first });
  return block("path", t("optimiser.pathTitle"), line, `<p class="hint">${escape(t("optimiser.pathHint"))}</p>${body}`);
}
