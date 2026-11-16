// The path's champion steps (SIM-12, D-44): each gear piece worn one level up, each piece of an empty slot put on at
// level 1, both when the buildings held allow that level (the forge); and each skill one level up whose requirements
// are held, with a point free in its tree. Pure: the champion's gear and skills, the game's pieces and trees in.

/** A piece's last level: as many as its costs list (one per rarity). */
const lastPiece = (piece) => Math.max(0, ...Object.values(piece.costs ?? {}).map((levels) => levels.length));

/** A skill's last level: its maximum, else the last level its bonuses are known at. */
const lastSkill = (skill) =>
  skill.max ?? Math.max(0, ...Object.values(skill.gives ?? {}).map((levels) => levels.length));

/** Whether the buildings held (Map id → level) allow a piece's level: each building it asks there held. */
const allowed = (piece, level, buildings) =>
  Object.entries(piece.requires?.structure ?? {}).every(
    ([id, levels]) => (levels[level - 1] ?? 0) <= (buildings.get(id) ?? 0),
  );

/** Each piece worn one level up, below its last; each piece of a slot left empty at level 1; those allowed. */
export function gearSteps(gear, pieces, buildings) {
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const worn = new Map(gear.map(({ id, level }) => [id, level]));
  const filled = new Set(gear.map(({ id }) => byId.get(id)?.slot));
  const up = pieces
    .filter((piece) => worn.has(piece.id) && worn.get(piece.id) < lastPiece(piece))
    .map((piece) => ({ kind: "gear", id: piece.id, from: worn.get(piece.id), to: worn.get(piece.id) + 1 }));
  const put = pieces
    .filter((piece) => !filled.has(piece.slot))
    .map((piece) => ({ kind: "gear", id: piece.id, from: 0, to: 1 }));
  return [...up, ...put].filter((step) => allowed(byId.get(step.id), step.to, buildings));
}

/**
 * Each skill one level up, below its last, its requirements held, in a tree with a point free: `held` Map id →
 * level; `given(tree)` the points the champion's level gives in it (each level of a skill takes one).
 */
export const skillSteps = (trees, held, given) =>
  trees.flatMap((tree) => {
    const spent = tree.skills.reduce((sum, skill) => sum + (held.get(skill.id) ?? 0), 0);
    if (spent >= given(tree)) return [];
    return tree.skills
      .map((skill) => ({ skill, from: held.get(skill.id) ?? 0 }))
      .filter(({ skill, from }) => from < lastSkill(skill))
      .filter(({ skill }) => Object.entries(skill.requires ?? {}).every(([id, level]) => (held.get(id) ?? 0) >= level))
      .map(({ skill, from }) => ({ kind: "skill", id: skill.id, tree: tree.id, from, to: from + 1 }));
  });
