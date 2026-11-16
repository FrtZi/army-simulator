// The tab "With what I have", in detail (SIM-19, SIM-20, D-48): what weighs most among the sources, the champion with
// its stats and set, the rituals acting on the army, the bonuses summed by stat and source, the power two ways.
import { escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { championFiguresHtml } from "../../champion-figures.js";
import { championInPlay } from "../../lab-setup.js";
import { SOURCES } from "../../optimiser-detail.js";
import { currentGame, state } from "../../state.js";
import { t } from "../../texts/index.js";
import { block, godClass } from "./blocks.js";

const percent = (share) => number(share * 100, 1);
const signed = (value) => `${value > 0 ? "+" : ""}${number(value, 1)} %`;

/** A bonus in words: its stat and the troops it counts for (the whole march when none). */
function effectLabel({ stat, target }) {
  const name = stat === "marchCapacity" ? t("capacity.label") : nameOf("troopStats", stat);
  const [filter, [value] = []] = Object.entries(target ?? {})[0] ?? [];
  return t("talents.label", { stat: name, target: filter ? nameOf(filter, value) : t("talents.march") });
}

/** One weight as a bar (a raw share for its width, DEF-051) and its figure. */
const weightRow = (name, share, mark = "") =>
  `<li class="share"><span>${escape(name)}</span><span class="share-bar" aria-hidden="true"><span class="${mark}" data-share="${Math.round(Math.max(0, share) * 1000) / 10}"></span></span><span class="share-value">${escape(`−${percent(Math.max(0, share))} %`)}</span></li>`;

/** The power two ways: the game's, and with every bonus (SIM-20). */
export function powerText({ power }) {
  const ratio = power.game > 0 ? number(power.buffed / power.game, 2) : "—";
  return t("optimiser.powerLine", { game: number(power.game), buffed: number(Math.round(power.buffed)), ratio });
}

function weightsBlock({ weights }) {
  const ranked = SOURCES.map((source) => [source, weights[source]]).sort((a, b) => b[1] - a[1]);
  const rows = ranked.map(([source, share]) => weightRow(t(`optimiser.source-${source}`), share));
  const line = ranked
    .filter(([, share]) => share > 0)
    .map(([source, share]) => `${t(`optimiser.source-${source}`)} −${percent(share)} %`)
    .join(" · ");
  const body = `<p class="hint">${escape(t("optimiser.weightsHint"))}</p><ul class="opt-list">${rows.join("")}</ul>`;
  return block("weights", t("optimiser.weightsTitle"), line || t("optimiser.weightsNone"), body);
}

function championBlock({ weights }) {
  const champion = championInPlay(state);
  if (!champion.level && !champion.gear?.length) {
    return block("champion", t("optimiser.championTitle"), t("optimiser.championNone"), "");
  }
  const line = t("optimiser.championLine", { level: champion.level ?? "—", weight: percent(weights.champion) });
  return block("champion", t("optimiser.championTitle"), line, championFiguresHtml(champion));
}

/** A ritual's god, for its mark: the god its effects target, else none (a ritual for every troop). */
const ritualGod = (ritual) => ritual.effects.find((effect) => effect.target?.alignments)?.target.alignments[0];

function ritualsBlock({ rituals, weights }) {
  const entries = new Map(currentGame().rituals.rituals.map((entry) => [entry.id, entry]));
  const rows = rituals.map((ritual) => {
    const name = `${label(entries.get(ritual.id))} · ${t("optimiser.ritualLevel", { level: ritual.level })} · ${ritual.effects
      .map((effect) => `${effectLabel(effect)} ${signed(effect.percent)}`)
      .join(", ")}`;
    const god = ritualGod(ritual);
    return weightRow(name, ritual.weight, god ? godClass(god) : "");
  });
  const held = state.savedPlayerSetup.rituals.length;
  const line = t("optimiser.ritualsLine", { n: rituals.length, held, weight: percent(weights.rituals) });
  const body = rows.length
    ? `<ul class="opt-list">${rows.join("")}</ul>`
    : `<p class="empty">${escape(t("optimiser.ritualsNone"))}</p>`;
  return block("rituals", t("optimiser.ritualsTitle"), line, body);
}

function synthesisBlock({ synthesis }) {
  const head = [t("optimiser.synthesisBonus"), ...SOURCES.map((source) => t(`optimiser.source-${source}`))];
  const cell = (value) => `<td class="num">${value ? escape(signed(value)) : "—"}</td>`;
  const rows = synthesis.map(
    (row) => `<tr><td>${escape(effectLabel(row))}</td>${SOURCES.map((source) => cell(row.by[source])).join("")}</tr>`,
  );
  const table = `<div class="table-wrap"><table class="guide-table"><thead><tr>${head
    .map((text, index) => `<th scope="col"${index ? ' class="num"' : ""}>${escape(text)}</th>`)
    .join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  return block(
    "synthesis",
    t("optimiser.synthesisTitle"),
    t("optimiser.synthesisLine", { n: synthesis.length }),
    table,
  );
}

/** The detail's blocks, in the agreed order: what weighs most, the champion, the rituals, the synthesis. */
export const detailBlocks = (detail) =>
  `${weightsBlock(detail)}${championBlock(detail)}${ritualsBlock(detail)}${synthesisBlock(detail)}`;
