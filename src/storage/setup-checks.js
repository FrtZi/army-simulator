// What a setup file's readers share (CFG-05): a value's shape, a whole number in its range, a list read entry by
// entry, and a refused value told with where it is, what was read and why. No DOM here.

export const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export const refuse = (path, read, code, extra = {}) => ({ path, read, code, ...extra });

/** A whole number in its range, or the problem saying why not. */
export const rangeProblem = (path, read, min, max) =>
  isInteger(read, min, max) ? [] : [refuse(path, read, "out-of-range", { min, max })];

/** A list section: each entry read on its own; the refused ones reported, the others kept. */
export function readList(list, name, readEntry) {
  if (!Array.isArray(list)) return { problems: [refuse(name, list, "not-list")] };
  const results = list.map((entry, index) => readEntry(entry, `${name}[${index}]`));
  return {
    value: results.filter((result) => result.value).map((result) => result.value),
    problems: results.flatMap((result) => result.problems),
  };
}
