// The figures a battle report gives and the engine's replay of it, set side by side (SIM-04, docs/spec/calibration.md):
// for each measure of calibration.json, the gap as a log ratio of predicted to actual, and one score per report.
// Nothing here knows the page or the files: the reports, the replays and the settings are passed in.

const sum = (values) => values.reduce((total, value) => total + value, 0);

/** Each troop's dead in a replay's side: its count deployed minus its survivors, heroes left out (they are no troop). */
function deadOf(battle, side) {
  const dead = {};
  for (const [index, group] of battle.deployed[side].entries()) {
    if (group.hero) continue;
    dead[group.id] = (dead[group.id] ?? 0) + group.count - battle.survivors[side][index].count;
  }
  return dead;
}

/** A replay's figures, in the shape a report gives them. */
export function replayFigures(battle) {
  const yours = deadOf(battle, "attacker");
  return {
    enemyDead: sum(Object.values(deadOf(battle, "defender"))),
    yourDead: sum(Object.values(yours)),
    yourPowerLost: battle.powerLost.attacker,
    yourDeadByTroop: yours,
  };
}

/** A report's figures: its two sides' dead, troop by troop, and the power you lost. */
export function reportFigures({ figures }) {
  return {
    enemyDead: sum(Object.values(figures.defender.lost)),
    yourDead: sum(Object.values(figures.attacker.lost)),
    yourPowerLost: figures.attacker.powerLost,
    yourDeadByTroop: figures.attacker.lost,
  };
}

/** The log ratio of predicted to actual; the offset lets a count of none on one side still compare. */
const logRatio = (predicted, actual, offset) => Math.log((predicted + offset) / (actual + offset));

/** The troop by troop gap: the mean squared log ratio over every troop either side names, as one log ratio. */
function byTroop(predicted, actual, offset) {
  const ids = [...new Set([...Object.keys(predicted), ...Object.keys(actual)])];
  const squares = ids.map((id) => logRatio(predicted[id] ?? 0, actual[id] ?? 0, offset) ** 2);
  return ids.length ? Math.sqrt(sum(squares) / ids.length) : 0;
}

/** Each measure's gap (a log ratio: 0 when the replay matches, log 2 when it predicts twice the dead). */
export function gapsOf(predicted, actual, settings) {
  const offset = settings.countOffset;
  return Object.fromEntries(
    settings.measures.map(({ id }) => [
      id,
      id === "yourDeadByTroop"
        ? byTroop(predicted[id], actual[id], offset)
        : logRatio(predicted[id], actual[id], offset),
    ]),
  );
}

/** One report's score: the weighted mean of its squared gaps (0 when the replay matches the report). */
export function scoreOf(gaps, settings) {
  const weights = sum(settings.measures.map(({ weight }) => weight));
  return sum(settings.measures.map(({ id, weight }) => weight * gaps[id] ** 2)) / weights;
}

/** Whether a gap is within the noise calibration.json states: the same battle fought twice differs that much. */
export const withinNoise = (gap, settings) => Math.abs(Math.expm1(gap)) * 100 <= settings.noiseGapPercent.value;
