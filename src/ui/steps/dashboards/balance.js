// DASH-03 · how the power of the composition being edited is spread (by tier, god, troop type, attack used),
// as bars with their percentage written, then the weak points in words.
import { escape } from "../../dom.js";
import { nameOf, number, tierName } from "../../format.js";
import { currentArmy, state } from "../../state.js";
import { balance } from "../../../engine/index.js";
import { t } from "../../texts/index.js";

// each spread: its title and how to name one of its values
const SPREADS = [
  ["tiers", (key) => tierName(Number(key))],
  ["alignments", (key) => nameOf("alignments", key)],
  ["unitTypes", (key) => nameOf("unitTypes", key)],
  ["modes", (key) => nameOf("attackTypes", key)],
];

function bars(entries, name) {
  return entries
    .sort((a, b) => b.share - a.share)
    .map(
      (entry) => `<li class="share"><span class="share-label">${escape(name(entry.key))}</span>
        <span class="share-bar" aria-hidden="true"><span data-share="${entry.share}"></span></span>
        <span class="share-value">${number(entry.share, 1)} %</span></li>`,
    )
    .join("");
}

function warningText(warning) {
  const god = warning.alignment ? nameOf("alignments", warning.alignment) : "";
  const tier = warning.tier ? nameOf("tiers", warning.tier) : "";
  return t(`warn.${warning.code}`, {
    ...warning,
    tier,
    god,
    share: number(warning.share ?? 0, 1),
    morale: number(warning.morale ?? 0, 1),
  });
}

export function balancePanel() {
  const { profile } = currentArmy();
  const name = state.compositions[state.active].name || state.active + 1;
  const { spread, warnings } = balance(profile);
  if (!profile.troops) return `<p class="empty">${escape(t("map.empty", { name }))}</p>`;
  const groups = SPREADS.map(
    ([key, namer]) =>
      `<div class="share-group"><h3>${escape(t(`balance.${key}`))}</h3><ul class="share-list">${bars(spread[key], namer)}</ul></div>`,
  );
  const notes = warnings.length
    ? warnings
        .map(
          (warning) =>
            `<li class="status critical"><span aria-hidden="true">⚠</span> ${escape(warningText(warning))}</li>`,
        )
        .join("")
    : `<li class="status"><span aria-hidden="true">✓</span> ${escape(t("balance.ok"))}</li>`;
  return `<p class="hint">${escape(t("balance.hint", { name }))}</p><ul class="warnings">${notes}</ul><div class="share-groups">${groups.join("")}</div>`;
}

/** The bars' widths, set once the panel is in the page (no inline style in the HTML). */
export function sizeBars(panel) {
  for (const bar of panel.querySelectorAll("[data-share]")) bar.style.width = `${bar.dataset.share}%`;
}
