// The optimiser's results in words (SIM-05, SIM-12): the composition edited and the opponent by their names, a
// battle's margin, the army found against the composition as it stands, what the aim costs now. Shared by its tabs.
import { number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";

export const compositionName = () => state.composition.name || String(state.active + 1);

/** An opponent's name: a composition's, or the PvE army's. */
export const opponentName = (value) =>
  value === "pve"
    ? t("pve.option")
    : t("composition.tab", { name: state.compositions[Number(value)].name || String(Number(value) + 1) });

/** A battle's margin in words: won, lost or a draw, with its icon. */
export function battleWords(margin) {
  if (margin > 0) return t("optimiser.won", { margin: number(margin) });
  return margin < 0 ? t("optimiser.lost", { margin: number(-margin) }) : t("optimiser.draw");
}

/** The army found against the composition edited as it stands: by how much better, or both battles. */
export function comparedLine({ goal, score, current, opponent }) {
  const name = compositionName();
  if (current === null) return t("optimiser.emptyNow", { name });
  if (goalOf(goal).battle) {
    const versus = opponentName(opponent);
    return t("optimiser.battleLine", { versus, found: battleWords(score), name, current: battleWords(current) });
  }
  if (!(current > 0)) return t("optimiser.nothingNow", { name });
  const percent = number(Math.abs(score / current - 1) * 100, 1);
  if (score > current) return t("optimiser.better", { percent, name });
  return score < current ? t("optimiser.worse", { percent, name }) : t("optimiser.same", { name });
}

/** What the aim costs now (SIM-12): the best army without it against the one found within it; "" with no aim. */
export function aimLine({ goal, score, free }) {
  if (free === null) return "";
  if (goalOf(goal).battle) return t("optimiser.aimBattle", { free: battleWords(free) });
  if (!(free > score)) return t("optimiser.aimFree");
  return t("optimiser.aimCosts", { percent: number((1 - score / free) * 100, 1) });
}
