// The tab "Model's map" (SIM-18, SIM-22, D-51): the search drawn, stage by stage, with its figures in words under it;
// the army chosen with its power two ways; the path as branches by gain. Three folding blocks.
import { CONFIG } from "../../config.js";
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { t } from "../../texts/index.js";
import { block } from "./blocks.js";
import { searchPicture } from "./map-search.js";
import { triosTable } from "./map-trios.js";
import { armyPicture } from "./map-army.js";
import { pathPicture } from "./map-path.js";

/** A stage as a card: its figure in bold, its words, its mark (the picture's colour for it), as the champion's cards. */
const stageCard = (mark, figure, words) =>
  `<li class="opt-stage${mark ? ` ${mark}` : ""}"><b>${escape(String(figure))}</b><span>${escape(words)}</span></li>`;

/** The search's stages in order, each a card: the aim, the trios, kept, settled, chosen, then the path's steps. */
function stageCards({ map, path, trail }) {
  const cards = [
    ...(map.aimed === map.owned ? [] : [stageCard("", map.aimed, t("optimiser.card-aim"))]),
    stageCard("stage-tried", number(map.trios), t("optimiser.card-tried")),
    stageCard("stage-kept", map.kept, t("optimiser.card-kept", { perPair: CONFIG.optimiser.perPair })),
    stageCard("stage-settled", map.settled, t("optimiser.card-settled")),
    stageCard("stage-chosen", 1, t("optimiser.card-chosen", { rank: (trail?.kept[trail.chosen].place ?? 0) + 1 })),
    stageCard(
      "",
      path.steps.length,
      t("optimiser.card-path", { glanced: number(path.glanced), settled: path.settled }),
    ),
  ];
  return `<ol class="opt-stages">${cards.join("")}</ol>`;
}

/** The search: the setup's figures, its picture, its stages as cards (its legend), the branches' links. */
function searchBlock(result) {
  const { map, judged } = result;
  const body = `${searchPicture(result)}${stageCards(result)}${triosTable(result)}<p class="hint">${escape(t("optimiser.mapHint"))}</p>`;
  const line = t("optimiser.mapLine", {
    judged: number(judged),
    trios: number(map.trios),
    kept: map.kept,
    settled: map.settled,
  });
  return block("map", t("optimiser.mapTitle"), line, body);
}

/** The tab: the search, the army chosen, the path's branches. */
export function mapPanel(result) {
  const army = armyPicture(result);
  const tree = pathPicture(result);
  return `${searchBlock(result)}${block("army", t("optimiser.armyTitle"), army.line, army.body)}${block(
    "tree",
    t("optimiser.treeTitle"),
    tree.line,
    tree.body,
  )}`;
}
