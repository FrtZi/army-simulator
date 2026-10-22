// Step 1 · the game: one choice per game listed in data/games.json (GAME-01).
import { byId, options } from "../../dom.js";
import { GAMES } from "../../games.js";
import { label } from "../../format.js";
import { state } from "../../state.js";

export function drawGame() {
  byId("game-select").innerHTML = options(
    GAMES.map((game) => [game.id, label(game)]),
    state.gameId,
  );
}
