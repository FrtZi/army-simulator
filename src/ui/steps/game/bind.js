// Changing the game starts over: its troops and bonuses would mean nothing in another game.
import { byId } from "../../dom.js";
import { selectGame } from "../../state.js";
import { renderAll } from "../../render.js";

export function bindGame() {
  byId("game-select").addEventListener("change", (event) => {
    selectGame(event.target.value);
    renderAll();
  });
}
