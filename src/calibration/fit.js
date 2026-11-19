// One parameter fitted on the battle reports (SIM-04, docs/spec/calibration.md): every candidate value of
// calibration.json tried, the best kept only if it also improves the reports it was not fitted on, each left out in
// turn, so that a value never fits noise. The replay is passed in: this module knows neither the engine nor the files.

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;

/** A parameter's candidate values, named: a list given as is, or a range walked by its step. */
export function candidatesOf({ candidates }) {
  if (!candidates) return [];
  if (candidates.values) return candidates.values;
  const values = [];
  for (let value = candidates.from; value <= candidates.to; value += candidates.step) {
    values.push({ name: String(value), value });
  }
  return values;
}

/** The combat rules with one value changed, at its dotted key ("model.tierFactors"); the rules given stay as they are. */
export function withValue(rules, key, value) {
  const copy = structuredClone(rules);
  const path = key.split(".");
  const parent = path.slice(0, -1).reduce((node, step) => node[step], copy);
  parent[path.at(-1)] = value;
  return copy;
}

/** The candidate with the lowest mean score on the reports given (the first on a tie: the list's order decides). */
function bestOn(reports, candidates, scoreFor) {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: mean(reports.map((report) => scoreFor(report, candidate.value))),
  }));
  return scored.reduce((best, entry) => (entry.score < best.score ? entry : best));
}

/**
 * The fit of one parameter: `scoreFor(report, value)` replays a report with the value and scores it (measures.js).
 * Returns the value now and its score, the best value on every report and its score, and the out of sample score:
 * each report scored with the value fitted on the others. The value is kept only if that beats today's score, and
 * called fitted only with the reports calibration.json asks for; with fewer than two, there is nothing to leave out.
 */
export function fit(parameter, current, reports, scoreFor, settings) {
  const candidates = candidatesOf(parameter);
  const now = mean(reports.map((report) => scoreFor(report, current)));
  if (reports.length < 2 || candidates.length === 0) return { now, verdict: "too few reports" };
  const best = bestOn(reports, candidates, scoreFor);
  const outOfSample = mean(
    reports.map((left, index) => {
      const others = reports.filter((_, other) => other !== index);
      return scoreFor(left, bestOn(others, candidates, scoreFor).candidate.value);
    }),
  );
  const improves = outOfSample < now;
  const enough = reports.length >= settings.reportsNeeded;
  const verdict = !improves ? "no better" : enough ? "fitted" : "better, too few reports";
  return { now, best: best.candidate, inSample: best.score, outOfSample, verdict };
}
