// The tab "Model's map" (SIM-18): the search as it ran, stage by stage with its figures: the setup, the aim, the trios
// tried at a glance, kept and settled, the armies judged, the path's steps; the branches' links said in a line.
// (SIM-14 will draw it as a tree unfolding live.)
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { t } from "../../texts/index.js";
import { block } from "./blocks.js";

export function mapPanel({ map, judged, path }) {
  const stages = [
    t("optimiser.map-setup", { heroes: map.heroes, kinds: map.owned, capacity: number(map.capacity) }),
    ...(map.aimed === map.owned ? [] : [t("optimiser.map-aim", { kinds: map.aimed })]),
    t("optimiser.map-trios", { trios: number(map.trios), kept: map.kept, settled: map.settled }),
    t("optimiser.map-judged", { n: number(judged) }),
    t("optimiser.map-path", { glanced: number(path.glanced), settled: path.settled, shown: path.steps.length }),
  ];
  const body = `<ol class="opt-map">${stages.map((stage) => `<li>${escape(stage)}</li>`).join("")}</ol>
    <p class="hint">${escape(t("optimiser.mapHint"))}</p>`;
  const line = t("optimiser.mapLine", {
    judged: number(judged),
    trios: number(map.trios),
    kept: map.kept,
    settled: map.settled,
  });
  return block("map", t("optimiser.mapTitle"), line, body);
}
