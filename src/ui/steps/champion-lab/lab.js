// The Champion lab's own state (BONUS-09): a level, two gear sets (the saved setup's first), the set each filters
// on, the skills' levels by tree (the saved setup's: BONUS-10), the tree shown and the skill chosen in it. Made at
// first use; saved by name only when asked (CFG-10).
import { currentGame, state } from "../../state.js";

/** The saved skills' levels, by tree: { conquest: { id: level }, champion: {…} }. */
function savedSkills(saved) {
  const levels = new Map((saved?.skills ?? []).map(({ id, level }) => [id, level]));
  const inTree = (tree) =>
    tree.skills.filter((skill) => levels.has(skill.id)).map((skill) => [skill.id, levels.get(skill.id)]);
  return Object.fromEntries(
    currentGame().championSkills.trees.map((tree) => [tree.id, Object.fromEntries(inTree(tree))]),
  );
}

export function lab() {
  const saved = state.savedPlayerSetup.champion;
  state.championLab ??= {
    level: saved?.level ?? 1,
    gear: { a: (saved?.gear ?? []).map((entry) => ({ ...entry })), b: [] },
    set: { a: "", b: "" },
    skills: savedSkills(saved),
    tree: "conquest",
    chosen: null,
  };
  return state.championLab;
}
