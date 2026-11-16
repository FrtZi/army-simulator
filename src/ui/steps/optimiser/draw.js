// The optimiser block (SIM-05, D-40): the goal, the button, and the army found — its troops within the capacity, its
// heroes at their levels, its talents — with how it compares with the composition being edited as it stands, a state
// always said with an icon and a word. Without Your setup loaded, or its troops owned, it says what is missing.
import { CONFIG } from "../../config.js";
import { byId, escape, options } from "../../dom.js";
import { label, number } from "../../format.js";
import { blocked, goalOf } from "../../optimiser.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { talentName } from "../heroes/draw.js";
import { offeredTalents } from "../../../engine/index.js";

export const compositionName = () => state.composition.name || String(state.active + 1);

/** A battle's margin in words: won, lost or a draw, with its icon. */
function battleWords(margin) {
  if (margin > 0) return t("optimiser.won", { margin: number(margin) });
  return margin < 0 ? t("optimiser.lost", { margin: number(-margin) }) : t("optimiser.draw");
}

/** The army found against the composition edited as it stands: by how much better, or both battles. */
function comparedLine({ goal, score, current }) {
  const name = compositionName();
  if (current === null) return t("optimiser.emptyNow", { name });
  if (goalOf(goal).battle) {
    return t("optimiser.battleLine", { found: battleWords(score), name, current: battleWords(current) });
  }
  if (!(current > 0)) return t("optimiser.nothingNow", { name });
  const percent = number(Math.abs(score / current - 1) * 100, 1);
  if (score > current) return t("optimiser.better", { percent, name });
  return score < current ? t("optimiser.worse", { percent, name }) : t("optimiser.same", { name });
}

const list = (items, empty) =>
  items.length
    ? `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escape(empty)}</p>`;

function foundHtml(result) {
  const { catalogue, warlords, game } = currentGame();
  const { troops, heroes, talents } = result.composition;
  const placed = Object.values(troops).reduce((sum, count) => sum + count, 0);
  const offered = offeredTalents(heroes.map(({ id, level }) => ({ warlord: warlords.get(id), level })));
  const percentOf = (id) => offered.find((talent) => talent.id === id).percent;
  return `<p>${escape(comparedLine(result))}</p>
    <h3>${escape(t("optimiser.troops", { n: number(placed), capacity: number(result.capacity) }))}</h3>
    ${list(
      Object.entries(troops).map(([id, count]) => `${label(catalogue.units.get(id))} × ${number(count)}`),
      "",
    )}
    <h3>${escape(t("optimiser.heroes"))}</h3>
    ${list(
      heroes.map(({ id, level }) => `${label(warlords.get(id))} · ${t("optimiser.heroLevel", { level })}`),
      t("optimiser.noHero"),
    )}
    <h3>${escape(t("optimiser.talents", { n: talents.length, max: game.heroRules.talentsPerArmy }))}</h3>
    ${list(
      talents.map((id) => `${talentName(id)} +${number(percentOf(id), 1)} %`),
      t("optimiser.noTalent"),
    )}
    <button id="optimiser-use" type="button" class="secondary">${escape(t("optimiser.use", { name: compositionName() }))}</button>`;
}

/** The status line: why it cannot run, or what the last run found, or what was put in the composition. */
function statusText(reason) {
  const { result, applied } = state.optimiser;
  if (reason) return `ⓘ ${t(reason)}`;
  if (applied) return t("optimiser.used", { name: compositionName() });
  if (result === false) return `ⓘ ${t("optimiser.none")}`;
  return result ? t("optimiser.found", { goal: t(`optimiser.goal-${result.goal}`), n: number(result.judged) }) : "";
}

/** The goals to choose from, the one chosen selected (redrawn with the page, not while the figures change). */
export function drawOptimiserGoals() {
  const goals = CONFIG.optimiser.goals.map(({ id }) => [id, t(`optimiser.goal-${id}`)]);
  byId("optimiser-goal").innerHTML = options(goals, state.optimiser.goal);
}

/**
 * Whether it can run, its status and the army found: with the figures, as troops added to a composition or a side
 * compared may let it run or not (DEF-045).
 */
export function drawOptimiser() {
  const reason = blocked(goalOf(state.optimiser.goal));
  byId("optimiser-run").disabled = Boolean(reason);
  const { result } = state.optimiser;
  const status = byId("optimiser-status");
  status.textContent = statusText(reason);
  status.classList.toggle("pending", Boolean(reason) || result === false); // still to act on: not a success's colour
  byId("optimiser-result").innerHTML = result && !reason ? foundHtml(result) : "";
}
