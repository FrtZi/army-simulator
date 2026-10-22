// Morale (official rule): a troop type that loses more than `lossThresholdPercent` of its troops in one turn
// takes a morale test; on a failure, part of it is broken for one turn. The game gives neither the odds nor
// the share: the engine expects (100 − morale) % of the survivors to break (D-16). Defences never break.
// Tests run at the end of each turn, for both sides: the troops that break sit out the whole next turn.

const PERCENT = 100;

/** Breaks the expected share of each group that lost too many troops this turn. */
export function testMorale(side, rules) {
  for (const group of side) {
    const startOfTurn = group.count + group.lostThisTurn;
    const lossPercent = startOfTurn > 0 ? (group.lostThisTurn / startOfTurn) * PERCENT : 0;
    if (group.unit.unitType === "defences" || lossPercent <= rules.morale.lossThresholdPercent) continue;
    const failShare = Math.min(1, Math.max(0, (PERCENT - group.stats.morale) / PERCENT));
    group.broken = Math.min(group.count, group.broken + (group.count - group.broken) * failShare);
  }
}

/** At the end of a turn, the troops that sat it out broken rally (before the new tests). */
export function rally(side) {
  for (const group of side) group.broken = 0;
}
