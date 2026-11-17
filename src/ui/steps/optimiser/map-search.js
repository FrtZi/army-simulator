// The search drawn (SIM-22, D-51): every trio of heroes a dot, those kept, settled and the one chosen marked by colour
// and size, from the engine's trail; the stages named beside, their figures in words under it. Played stage by stage
// after a run or on demand, still when the player asks for less motion.
import { escape } from "../../dom.js";
import { number } from "../../format.js";
import { state } from "../../state.js";
import { t } from "../../texts/index.js";

const WIDTH = 680;
const HEIGHT = 150;
// each stage's dot, as a share of a cell: the tried faint and small, the chosen largest (size says it besides colour)
const SIZES = { tried: 0.45, kept: 1.4, settled: 2, chosen: 2.8 };

const PAD = 14; // room round the field, so the chosen dot's ring is never cut
const SEED = 7;

/** The places 0…n−1 shuffled in a fixed order (a seeded shuffle): the dots spread over the field, the same on every draw. */
function shuffled(n) {
  const order = Array.from({ length: n }, (_, index) => index);
  let seed = SEED;
  for (let index = n - 1; index > 0; index -= 1) {
    seed = (seed * 16807) % 2147483647; // the Park–Miller generator: small, enough to look scattered
    const other = seed % (index + 1);
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}

/** The field's grid for `n` dots, about as wide as it is long; each rank's cell centre. */
function grid(n) {
  const [width, height] = [WIDTH - 2 * PAD, HEIGHT - 2 * PAD];
  const rows = Math.max(1, Math.ceil(Math.sqrt((n * height) / width)));
  const cols = Math.ceil(n / rows);
  const order = shuffled(n);
  const cell = Math.min(width / cols, height / rows);
  const at = (rank) => {
    const place = order[rank];
    return [PAD + ((place % cols) + 0.5) * (width / cols), PAD + (Math.floor(place / cols) + 0.5) * (height / rows)];
  };
  return { cell, at };
}

/** One path per stage, each dot a zero-length stroke with round caps: thousands of dots in a few elements. */
const dots = (ranks, at) =>
  ranks
    .map((rank) => at(rank).map((value) => Math.round(value * 10) / 10))
    .map(([x, y]) => `M${x} ${y}h0`)
    .join("");

/** The picture of the search from its trail: { trios, kept, settled, chosen }. */
function picture(trail) {
  const { cell, at } = grid(trail.trios);
  const ranks = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, index) => from + index);
  const stages = {
    tried: ranks(trail.kept, trail.trios),
    kept: ranks(0, trail.kept).filter((rank) => !trail.settled.includes(rank)),
    settled: trail.settled.filter((rank) => rank !== trail.chosen),
    chosen: [trail.chosen],
  };
  const paths = Object.entries(stages).map(
    ([stage, list]) =>
      `<path class="dots stage-${stage}" d="${dots(list, at)}" stroke-width="${Math.max(1.6, cell * SIZES[stage])}"/>`,
  );
  const [x, y] = at(trail.chosen);
  const ring = `<circle class="dots-ring stage-chosen" cx="${x}" cy="${y}" r="${Math.max(5, cell * 2.6)}"/>`;
  const name = t("optimiser.searchPicture", {
    trios: number(trail.trios),
    kept: trail.kept,
    settled: trail.settled.length,
  });
  return `<svg class="opt-search${state.optimiserView.play ? " play" : ""}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escape(name)}">${paths.join("")}${ring}</svg>`;
}

/** The legend: each stage's mark and its words. */
function legend(trail) {
  const words = {
    tried: t("optimiser.stage-tried", { n: number(trail.trios) }),
    kept: t("optimiser.stage-kept", { n: trail.kept }),
    settled: t("optimiser.stage-settled", { n: trail.settled.length }),
    chosen: t("optimiser.stage-chosen", { rank: trail.chosen + 1 }),
  };
  return `<ul class="opt-legend">${Object.entries(words)
    .map(([stage, text]) => `<li><span class="opt-dot stage-${stage}" aria-hidden="true"></span>${escape(text)}</li>`)
    .join("")}</ul>`;
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

/** The search drawn, the button that plays it again, its legend; nothing without a trail (no hero owned). */
export const searchPicture = (result) =>
  `${metrics(result)}${
    result.trail
      ? `<button id="opt-map-replay" type="button" class="secondary">${escape(t("optimiser.replay"))}</button>${picture(result.trail)}${legend(result.trail)}`
      : ""
  }`;
