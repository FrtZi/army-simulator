// The tab "With what I have" (SIM-18, SIM-19): the army found in folding blocks: a summary against the composition
// edited, its troops each in its god's colour, its heroes with the talents they give under them; then the buttons
// that put it in the composition edited or in a new one.
import { escape } from "../../dom.js";
import { label, nameOf, number } from "../../format.js";
import { currentGame } from "../../state.js";
import { t } from "../../texts/index.js";
import { talentName } from "../heroes/draw.js";
import { offeredTalents } from "../../../engine/index.js";
import { block, godClass } from "./blocks.js";
import { aimLine, comparedLine, compositionName } from "./words.js";

const total = (troops) => Object.values(troops).reduce((sum, count) => sum + count, 0);

function summaryBlock(result) {
  const aim = aimLine(result);
  const line = t("optimiser.troops", {
    n: number(total(result.composition.troops)),
    capacity: number(result.capacity),
  });
  const body = `<p>${escape(comparedLine(result))}</p>${aim ? `<p>${escape(aim)}</p>` : ""}`;
  return block("summary", t("optimiser.summary"), line, body);
}

/** The troops, the most first, each a bar in its god's colour, its god and its count written beside. */
function troopsBlock(result) {
  const { units } = currentGame().catalogue;
  const lines = Object.entries(result.composition.troops)
    .map(([id, count]) => ({ unit: units.get(id), count }))
    .sort((a, b) => b.count - a.count);
  const all = total(result.composition.troops);
  const gods = new Map();
  for (const { unit, count } of lines) gods.set(unit.alignment, (gods.get(unit.alignment) ?? 0) + count);
  const shares = [...gods].map(([god, count]) => `${nameOf("alignments", god)} ${number((count / all) * 100)} %`);
  const rows = lines.map(({ unit, count }) => {
    // a raw figure, not the page's language's: "58,1" is no CSS width
    const share = Math.round((count / all) * 1000) / 10;
    return `<li class="share"><span>${escape(label(unit))} <span class="meta">· ${escape(nameOf("alignments", unit.alignment))}</span></span>
      <span class="share-bar" aria-hidden="true"><span class="${godClass(unit.alignment)}" data-share="${share}"></span></span>
      <span class="share-value">${escape(number(count))}</span></li>`;
  });
  const line = t("optimiser.troopsLine", { kinds: lines.length, gods: shares.join(", ") });
  return block("troops", t("optimiser.troopsTitle"), line, `<ul class="opt-list">${rows.join("")}</ul>`);
}

/** The heroes at their levels, each edged in its god's colour; under them the talents, each with the hero it is from. */
function heroesBlock(result) {
  const { warlords, game } = currentGame();
  const { heroes, talents } = result.composition;
  const offered = offeredTalents(heroes.map(({ id, level }) => ({ warlord: warlords.get(id), level })));
  const cards = heroes.map(({ id, level }) => {
    const warlord = warlords.get(id);
    const god = nameOf("alignments", warlord.alignment);
    return `<li class="opt-hero ${godClass(warlord.alignment)}"><span class="name">${escape(label(warlord))}</span>
      <span class="meta">${escape(`${t("optimiser.heroLevel", { level })} · ${god}`)}</span></li>`;
  });
  const chips = talents.map((id) => {
    const talent = offered.find((entry) => entry.id === id);
    const from = talent.from.map((hero) => label(warlords.get(hero))).join(", ");
    return `<li>${escape(`${talentName(id)} +${number(talent.percent, 1)} %`)} <span class="meta">· ${escape(t("optimiser.talentFrom", { name: from }))}</span></li>`;
  });
  const max = game.heroRules.talentsPerArmy;
  const body = `${cards.length ? `<ul class="opt-heroes">${cards.join("")}</ul>` : `<p class="empty">${escape(t("optimiser.noHero"))}</p>`}
    <h4>${escape(t("optimiser.talents", { n: talents.length, max }))}</h4>
    ${chips.length ? `<ul class="opt-list">${chips.join("")}</ul>` : `<p class="empty">${escape(t("optimiser.noTalent"))}</p>`}`;
  const line = t("optimiser.heroesLine", { n: heroes.length, talents: talents.length, max });
  return block("heroes", t("optimiser.heroesTitle"), line, body);
}

/** The tab: the summary, the troops, the heroes and talents, and where to put the army found. */
export const havePanel = (result) => `${summaryBlock(result)}${troopsBlock(result)}${heroesBlock(result)}
  <div class="file-actions">
    <button id="optimiser-use" type="button" class="secondary">${escape(t("optimiser.use", { name: compositionName() }))}</button>
    <button id="optimiser-new" type="button" class="secondary">${escape(t("optimiser.useNew"))}</button>
  </div>`;
