// The Champion lab's own state (BONUS-09): a level, two gear sets (the saved setup's first), the set each filters
// on, the skills' levels by tree, the tree shown and the skill chosen in it. Made at first use; never saved.
import { state } from "../../state.js";

export function lab() {
  const saved = state.savedPlayerSetup.champion;
  state.championLab ??= {
    level: saved?.level ?? 1,
    gear: { a: (saved?.gear ?? []).map((entry) => ({ ...entry })), b: [] },
    set: { a: "", b: "" },
    skills: { conquest: {}, champion: {} },
    tree: "conquest",
    chosen: null,
  };
  return state.championLab;
}
