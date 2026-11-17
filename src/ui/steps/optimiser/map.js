// The tab "Model's map" (SIM-18, SIM-22, D-51): the search drawn, stage by stage, with its figures in words under it;
// the army chosen with its power two ways; the path as branches by gain. Three folding blocks.
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { t } from "../../texts/index.js";
import { block } from "./blocks.js";
import { searchPicture } from "./map-search.js";
import { armyPicture } from "./map-army.js";
import { pathPicture } from "./map-path.js";

/** The search: its picture, then its stages in words with their figures (what the picture shows, read aloud). */
function searchBlock({ map, judged, path, trail }) {
  const stages = [
    t("optimiser.map-setup", { heroes: map.heroes, kinds: map.owned, capacity: number(map.capacity) }),
    ...(map.aimed === map.owned ? [] : [t("optimiser.map-aim", { kinds: map.aimed })]),
    t("optimiser.map-trios", { trios: number(map.trios), kept: map.kept, settled: map.settled }),
    t("optimiser.map-judged", { n: number(judged) }),
    t("optimiser.map-path", { glanced: number(path.glanced), settled: path.settled, shown: path.steps.length }),
  ];
  const words = `<ol class="opt-map">${stages.map((stage) => `<li>${escape(stage)}</li>`).join("")}</ol>`;
  const body = `${searchPicture({ map, judged, trail })}${words}<p class="hint">${escape(t("optimiser.mapHint"))}</p>`;
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
