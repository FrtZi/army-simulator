// The player's compositions (ARMY-03, D-19): as many as wanted, one edited at a time, any two compared. These
// functions change the state; the step's bind.js redraws.
import { state } from "./state.js";

const LETTERS = 26;

/** The first free name: A, B … Z, then 27, 28 … */
function freeName() {
  const used = new Set(state.compositions.map((composition) => composition.name));
  for (let index = 0; ; index += 1) {
    const name = index < LETTERS ? String.fromCharCode("A".charCodeAt(0) + index) : String(index + 1);
    if (!used.has(name)) return name;
  }
}

/** A new composition, empty or a copy of another's troops, heroes and talents, which becomes the one edited. */
export function addComposition({ troops = {}, heroes = [], talents = [] } = {}) {
  // plain copies: structuredClone is missing where the page tests run (jsdom, DEF-029)
  const copy = { troops: { ...troops }, heroes: heroes.map((hero) => ({ ...hero })), talents: [...talents] };
  state.compositions.push({ name: freeName(), ...copy });
  state.active = state.compositions.length - 1;
}

/** A copy of the composition being edited, which becomes the one edited. */
export const duplicateComposition = () => addComposition(state.composition);

/** Removes the composition being edited (never the last one); the comparison keeps two valid choices. */
export function removeComposition() {
  if (state.compositions.length <= 1) return;
  const removed = state.active;
  state.compositions.splice(removed, 1);
  state.active = Math.min(removed, state.compositions.length - 1);
  const last = state.compositions.length - 1;
  state.compare = state.compare.map((index) => (index > removed ? index - 1 : Math.min(index, last)));
  if (state.compare[0] === state.compare[1] && last > 0) state.compare[1] = state.compare[0] === 0 ? 1 : 0;
}

/** Chooses the composition on one side of the comparison (0: left, 1: right). */
export function chooseCompared(side, index) {
  state.compare[side] = index;
}
