// The search drawn (SIM-22, D-53, Frantz, 2026-11-17: one graph, the dots saying what happened): one axis, the score
// as a share of the best army found; every trio at a glance as bars, the kept ones once their talents are chosen,
// the settled ones once their troops have moved, each row under the other. Trios at the same share are one mark,
// as big as their count; a line follows them from row to row; the one chosen is ringed. The rows play one after
// another after a run or on demand, still when the player asks for less motion.
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { goalOf } from "../../optimiser.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";
import { PLOT, axis, bars, focusOf, round, sharesOf, xOf } from "./map-search-axis.js";

const WIDTH = 680;
const HEIGHT = 444;
const ROWS = { tried: 92, kept: 215, settled: 320 }; // each row's middle; the bars stand on PLOT.barsY
const radius = (count) => round(4 + Math.sqrt(count) * 1.6);

/** The marks of a row: its shares grouped to the tenth, each { share, members: [index] }, left to right. */
function groupsOf(shares) {
  const byShare = new Map();
  shares.forEach((share, index) => {
    const key = round(share);
    byShare.set(key, [...(byShare.get(key) ?? []), index]);
  });
  return [...byShare].map(([share, members]) => ({ share, members })).sort((a, b) => a.share - b.share);
}

/** A curve from one row to the next, as thick as the trios it carries. */
const curve = (stage, [x1, y1], [x2, y2], count) => {
  const middle = round((y1 + y2) / 2);
  return `<path class="links ${stage}" d="M${x1} ${y1}C${x1} ${middle} ${x2} ${middle} ${x2} ${y2}" stroke-width="${round(1 + Math.sqrt(count))}"/>`;
};

/** The lines that follow the trios: bars to kept marks, kept marks to settled ones, one per pair of ends. */
function links(trail, shares, x, groups) {
  const keptAt = (index) => x(groups.kept.find(({ members }) => members.includes(index)).share);
  const ends = new Map();
  const add = (key, stage, from, to) => ends.set(key, { stage, from, to, count: (ends.get(key)?.count ?? 0) + 1 });
  shares.keptGlance.forEach((share, index) => {
    const [from, to] = [x(round(share)), keptAt(index)];
    add(`k${from}>${to}`, "stage-kept row-kept", [from, PLOT.barsY], [to, ROWS.kept]);
  });
  trail.settled.forEach(({ rank }, index) => {
    const [from, to] = [keptAt(rank), x(round(shares.settled[index]))];
    add(`s${from}>${to}`, "stage-settled row-settled", [from, ROWS.kept], [to, ROWS.settled]);
  });
  return [...ends.values()].map(({ stage, from, to, count }) => curve(stage, from, to, count)).join("");
}

const CHAR = 6.6; // a character's width at the picture's 12 px, to keep words apart

/**
 * Where each mark's words go: below it, else above it, where they touch no words already placed; the one chosen
 * first, then the marks with the most trios. A mark left without room keeps its words in its title (and the table).
 */
function lanesOf(labels) {
  const taken = { below: [], above: [] };
  const lanes = new Map();
  const order = [...labels.keys()].sort(
    (a, b) => labels[b].chosen - labels[a].chosen || labels[b].count - labels[a].count,
  );
  for (const index of order) {
    const { cx, words } = labels[index];
    const width = words.length * CHAR;
    const anchor = cx > PLOT.right - width / 2 ? "end" : cx < PLOT.left + width / 2 ? "start" : "middle";
    const from = anchor === "end" ? cx - width : anchor === "start" ? cx : cx - width / 2;
    const free = (lane) => taken[lane].every(([left, right]) => from + width + 6 < left || from > right + 6);
    const lane = ["below", "above"].find(free);
    if (!lane) continue;
    taken[lane].push([from, from + width]);
    lanes.set(index, { lane, anchor });
  }
  return lanes;
}

/** A row's marks with their shares and counts in words, the words placed where they touch no others. */
function marks(row, groups, x, stageOf) {
  const labels = groups.map(({ share, members }) => {
    const [count, stage] = [members.length, stageOf(members)];
    const chosen = stage === "stage-chosen";
    const words = chosen
      ? t("optimiser.markChosen", { percent: number(share, 1) })
      : t(count > 1 ? "optimiser.markMany" : "optimiser.markOne", { percent: number(share, 1), n: count });
    return { cx: x(share), count, stage, chosen, words };
  });
  const lanes = lanesOf(labels);
  return labels
    .map(({ cx, count, stage, chosen, words }, index) => {
      const cy = ROWS[row];
      const place = lanes.get(index);
      const dy = place?.lane === "above" ? -radius(count) - 6 : radius(count) + 15;
      const text = place ? `<text x="${cx}" y="${cy + dy}" text-anchor="${place.anchor}">${escape(words)}</text>` : "";
      const ring = chosen ? `<circle class="ring" cx="${cx}" cy="${cy}" r="${radius(count) + 4}"/>` : "";
      return `<g class="mark ${stage} row-${chosen ? "chosen" : row}"><title>${escape(words)}</title><circle cx="${cx}" cy="${cy}" r="${radius(count)}"/>${ring}${text}</g>`;
    })
    .join("");
}

/** The rows' names and counts at the left. */
const names = (trail) =>
  Object.entries({ tried: trail.glance.length, kept: trail.kept.length, settled: trail.settled.length })
    .map(
      ([row, count]) =>
        `<text class="row-name" x="0" y="${ROWS[row] - 2}">${escape(t(`optimiser.row-${row}`))}</text><text x="0" y="${ROWS[row] + 15}">${escape(t(`optimiser.rowCount-${row}`, { n: number(count) }))}</text>`,
    )
    .join("");

/** The picture of the search from its trail, on one axis of shares of the best army when `shared`. */
function picture(trail, shared) {
  const shares = sharesOf(trail, shared);
  // the axis from the lowest share's whole percent, where its bar begins
  const low = Math.floor(Math.min(...shares.glance, ...shares.kept, ...shares.settled));
  const focus = shared ? focusOf(low, Math.min(...shares.keptGlance, ...shares.kept)) : null;
  const x = xOf(low, focus);
  const groups = { kept: groupsOf(shares.kept), settled: groupsOf(shares.settled) };
  const settledRanks = new Set(trail.settled.map(({ rank }) => rank));
  const chosenAt = trail.settled.findIndex(({ rank }) => rank === trail.chosen);
  const name = t("optimiser.searchPicture", {
    trios: number(trail.glance.length),
    kept: trail.kept.length,
    settled: trail.settled.length,
    rank: trail.kept[trail.chosen].place + 1,
  });
  const play = state.optimiserView.play ? " play" : "";
  return `<svg class="opt-search${play}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escape(name)}">${names(trail)}<g class="row-tried">${bars(shares, shares.keptGlance[trail.chosen], x, { low, focus })}</g>${links(trail, shares, x, groups)}${marks("kept", groups.kept, x, (members) => (members.some((index) => settledRanks.has(index)) ? "stage-settled" : "stage-kept"))}${marks("settled", groups.settled, x, (members) => (members.includes(chosenAt) ? "stage-chosen" : "stage-settled"))}${axis(x, { low, focus, shared })}</svg>`;
}

/** The setup's figures above the picture: heroes, kinds of troops, places, armies judged. */
function metrics({ map, judged }) {
  const figures = [
    [map.heroes, "heroes"],
    [map.aimed, "kinds"],
    [number(map.capacity), "places"],
    [number(judged), "judged"],
  ];
  return `<ul class="opt-metrics">${figures
    .map(
      ([figure, key]) =>
        `<li><b>${escape(String(figure))}</b><span>${escape(t(`optimiser.metric-${key}`))}</span></li>`,
    )
    .join("")}</ul>`;
}

/** The search drawn, the button that plays it again; nothing without a trail (no hero owned). */
export const searchPicture = (result) =>
  `${metrics(result)}${
    result.trail
      ? `<button id="opt-map-replay" type="button" class="secondary">${escape(t("optimiser.replay"))}</button>${picture(result.trail, !goalOf(result.goal).battle)}`
      : ""
  }`;
