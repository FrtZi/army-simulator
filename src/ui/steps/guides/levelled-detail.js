// A ritual or a structure in its guide (GUIDE-03, GUIDE-04), at the level chosen (the player's own by default, else
// the first): its power, its bonuses then and at most (those applied in battle apart from the others), what reaching
// that level requires, each requirement marked as met or not by the saved setup, and what it costs.
import { escape, options } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { costsTable } from "./costs.js";
import { LEVELLED, guideOf, savedLevel } from "./levelled.js";
import { ritualMapHtml } from "./ritual-map.js";

const TARGET_LISTS = { unitTypes: "unitTypes", alignments: "alignments" };

/** A bonus applied in battle, named by its stat and its troops (a god's, a type's, the whole march). */
function effectName(effect) {
  const stat = nameOf("troopStats", effect.stat);
  const [field, [value] = []] = Object.entries(effect.target ?? {})[0] ?? [];
  const target = field ? nameOf(TARGET_LISTS[field], value) : t("talents.march");
  return t("talents.label", { stat, target });
}

function bonusRows(values, nameOfId, index, battle) {
  return Object.entries(values).map(([id, levels]) => {
    const now = levels[index];
    const word = battle ? t("guides.inBattle") : t("guides.notInBattle");
    return `<tr${battle ? "" : ' class="locked"'}><td>${escape(nameOfId(id))}</td><td>${escape(word)}</td>
      <td class="num">${now === null ? "—" : `+${number(now, 2)} %`}</td><td class="num">+${number(levels.at(-1), 2)} %</td></tr>`;
  });
}

function bonusesTable(kind, entry, index) {
  const file = kind === "rituals" ? currentGame().rituals : currentGame().structures;
  const effects = new Map(file.effects.map((effect) => [effect.id, effect]));
  const other = new Map(file.other.map((bonus) => [bonus.id, bonus]));
  const rows = [
    ...bonusRows(entry.effects, (id) => effectName(effects.get(id)), index, true),
    ...bonusRows(entry.other, (id) => label(other.get(id)), index, false),
  ];
  const head = ["guides.bonus", "guides.where", "guides.now", "guides.most"].map(
    (key, column) => `<th scope="col"${column > 1 ? ' class="num"' : ""}>${escape(t(key))}</th>`,
  );
  const body = rows.length ? rows.join("") : `<tr><td colspan="4">${escape(t("guides.noBonus"))}</td></tr>`;
  return `<h4>${escape(t("guides.bonuses"))}</h4><table class="guide-table"><thead><tr>${head.join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

/** What reaching the level asks: each ritual or structure at its level, met (✓) or not (✗) by the saved setup. */
function requirementsList(entry, index) {
  const names = { ritual: currentGame().rituals.rituals, structure: currentGame().structures.structures };
  const kinds = { ritual: "rituals", structure: "buildings" };
  const items = Object.entries(entry.requires).flatMap(([kind, needs]) =>
    Object.entries(needs)
      .filter(([, levels]) => levels[index] !== null)
      .map(([id, levels]) => {
        const asked = levels[index];
        const met = savedLevel(kinds[kind], id) >= asked;
        const name = label(names[kind].find((other) => other.id === id)) || id;
        const words = t(met ? "guides.met" : "guides.notMet");
        return `<li class="${met ? "met" : "not-met"}"><span aria-hidden="true">${met ? "✓" : "✗"}</span> ${escape(t("guides.needs", { name, level: asked }))} <span class="meta">${escape(words)}</span></li>`;
      }),
  );
  const list = items.length
    ? `<ul class="guide-requires">${items.join("")}</ul>`
    : `<p class="hint">${escape(t("guides.nothingRequired"))}</p>`;
  return `<h4>${escape(t("guides.requires"))}</h4>${list}`;
}

/** The entry chosen, in detail at the level chosen. */
export function entryDetailHtml(kind, entry) {
  const mine = savedLevel(kind, entry.id);
  const max = entry.power.length;
  const level = Math.min(guideOf(kind).level ?? Math.max(mine, 1), max);
  const index = level - 1;
  const levels = Array.from({ length: max }, (_, n) => [n + 1, String(n + 1)]);
  const yours = mine
    ? ` <span class="badge-yours"><span aria-hidden="true">✓</span> ${escape(t("guides.yoursLevel", { level: mine }))}</span>`
    : "";
  const from = mine ? t("guides.fromYourLevel", { level: mine }) : t("guides.fromStart");
  const group = LEVELLED[kind].groups?.().find((entryGroup) => entryGroup.id === entry.category);
  return `<h3 id="guide-${kind}-title">${escape(label(entry))}${yours}</h3>
    ${group ? `<p class="meta">${escape(label(group))}</p>` : ""}
    <div class="guide-level">
      <div class="field"><label for="guide-${kind}-level">${escape(t("guides.levelChoice"))}</label><select id="guide-${kind}-level" data-guide-field="level">${options(levels, level)}</select></div>
      <span class="meta">${escape(t("guides.levelOf", { level, max }))}</span>
    </div>
    <div class="metrics"><div class="metric key"><span class="metric-label">${escape(t("guides.power"))}</span><span class="metric-value">${number(entry.power[index])}</span></div></div>
    ${bonusesTable(kind, entry, index)}
    ${requirementsList(entry, index)}
    ${kind === "rituals" ? ritualMapHtml(entry, level) : ""}
    ${costsTable(entry, level, mine, from)}`;
}

/** Keeps the entry chosen in view: the one chosen if the filters let it through, else the first. */
export function chosenEntry(kind, shown) {
  const chosen = shown.find((entry) => entry.id === guideOf(kind).id) ?? shown[0];
  if (chosen && chosen.id !== guideOf(kind).id) Object.assign(guideOf(kind), { id: chosen.id, level: null });
  return chosen;
}
