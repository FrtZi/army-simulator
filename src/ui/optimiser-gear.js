// The champion's gear chosen for an army (SIM-26, D-52, Frantz, 2026-11-17): when Your setup lists pieces owned
// besides those worn, each slot takes the piece that raises the army's score most, the others held, in two rounds (a
// set's tier may need two slots to move together); the troops are then settled again in that gear, every branch
// linked. Without pieces owned, the gear worn stays and nothing is judged.
import { CONFIG } from "./config.js";
import { currentGame, state, validEffects } from "./state.js";
import { offered, scores } from "./optimiser-scores.js";
import { settle } from "../engine/index.js";

const ROUNDS = 2;

const slotOf = (id) => currentGame().champion.pieces.find((piece) => piece.id === id)?.slot;
const same = (a, b) => a?.id === b?.id && a?.level === b?.level;

/** The state as the optimiser sees it with the champion in this gear. */
const seenIn = (gear) => ({
  ...state,
  labChampion: "",
  savedPlayerSetup: { ...state.savedPlayerSetup, champion: { ...state.savedPlayerSetup.champion, gear } },
});

/** A gear's score on this army, for the goal. */
const scoreIn = (goal, composition) => (gear) => {
  const seen = seenIn(gear);
  return scores(goal, validEffects(seen), seen).score(composition);
};

/**
 * The gear that serves this army best among the pieces worn and owned: { gear, changes: [{ slot, worn, chosen }],
 * gain } (the score's rise against the gear worn, as a share); null when Your setup lists no piece owned.
 */
export function chooseGear(goal, composition) {
  const champion = state.savedPlayerSetup.champion;
  if (!state.useSetup || !champion?.owned?.length) return null;
  const judge = scoreIn(goal, composition);
  const worn = champion.gear ?? [];
  let gear = [...worn];
  for (let round = 0; round < ROUNDS; round += 1) {
    for (const slot of currentGame().champion.slots) {
      const others = gear.filter(({ id }) => slotOf(id) !== slot);
      // the piece in place first: on a tie it stays
      const options = [...gear, ...champion.owned].filter(({ id }) => slotOf(id) === slot);
      gear = options
        .map((piece) => [...others, piece])
        .map((tried) => ({ tried, score: judge(tried) }))
        .reduce((best, next) => (next.score > best.score ? next : best), { tried: gear, score: judge(gear) }).tried;
    }
  }
  const inSlot = (list, slot) => list.find(({ id }) => slotOf(id) === slot);
  const changes = currentGame()
    .champion.slots.filter((slot) => !same(inSlot(worn, slot), inSlot(gear, slot)))
    .map((slot) => ({ slot, worn: inSlot(worn, slot) ?? null, chosen: inSlot(gear, slot) }));
  const before = judge(worn);
  return { gear, changes, gain: before > 0 ? judge(gear) / before - 1 : 0 };
}

/** What `run` returns with the champion in this gear for its length (none: as it is); the setup left as it was. */
export function wearing(gear, run) {
  if (!gear) return run();
  const saved = state.savedPlayerSetup;
  state.savedPlayerSetup = { ...saved, champion: { ...saved.champion, gear } };
  try {
    return run();
  } finally {
    state.savedPlayerSetup = saved;
  }
}

/** The army found settled again in the gear chosen (to be called while wearing it): its talents, then its troops. */
export function settledAgain(found, goal, owned) {
  const judges = scores(goal);
  const settings = { ...CONFIG.optimiser, ...currentGame().game.heroRules };
  const done = settle(found.composition, {
    owned: [...owned],
    capacity: judges.capacity,
    offered,
    score: judges.score,
    ...settings,
  });
  return { ...found, ...done };
}
