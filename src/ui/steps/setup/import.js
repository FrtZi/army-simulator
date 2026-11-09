// An uploaded setup file under review (CFG-05, D-27): read, the values a list can fix parked with the nearest entry
// chosen where there is one, read again with the player's choices until nothing new is found, and what it would
// change in the setup shown. The state is the file, the choices made (path → value, null to leave it out) and what
// was parked; everything else is worked out from them.
import { GAMES_BY_ID } from "../../games.js";
import { currentGame, state } from "../../state.js";
import { readSetupFile } from "../../../storage/setup-file.js";
import { mergeSetup } from "../../../storage/setup-merge.js";
import { parkedChoice, readWithChoices } from "../../../storage/setup-parked.js";

// a hero's id chosen may show its rank out of range: one more reading finds it; nothing goes deeper than that
const MAX_READINGS = 3;

/** The review with its figures: the file read with the choices, the values parked, the others left out. */
export function reviewed({ file, parsed, choices = {}, parked = {} }) {
  const chosen = { ...choices };
  const found = { ...parked };
  let result;
  for (let reading = 0; reading < MAX_READINGS; reading += 1) {
    result = readWithChoices(parsed, chosen, GAMES_BY_ID);
    const fresh = result.problems
      .map((problem) => ({ problem, choice: parkedChoice(problem, currentGame()) }))
      .filter(({ choice }) => choice && !found[choice.path]);
    for (const { problem, choice } of fresh) {
      found[choice.path] = { ...choice, problem };
      if (choice.suggestion !== null) chosen[choice.path] = choice.suggestion;
    }
    if (!fresh.some(({ choice }) => choice.suggestion !== null)) break;
  }
  const leftOut = result.problems.filter((problem) => !found[parkedChoice(problem, currentGame())?.path]);
  const { report } = mergeSetup(state.playerSetup, result.sections);
  return { file, parsed, choices: chosen, parked: found, sections: result.sections, leftOut, report };
}

/** The review of a file's text, or why it cannot be read at all. */
export function reviewOf(file, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { file, unreadable: { code: "not-json" } };
  }
  const { game, sections, problems } = readSetupFile(parsed, GAMES_BY_ID);
  if (!sections) return { file, unreadable: problems[0] };
  if (game !== state.gameId) return { file, unreadable: { code: "game", read: game } };
  return reviewed({ file, parsed });
}

/** A choice made in a parked value's list: an entry's id, or null to leave it out. */
export function choose(review, path, value) {
  return reviewed({ ...review, choices: { ...review.choices, [path]: value } });
}
