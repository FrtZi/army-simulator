# Army simulator

This personal project follows the same golden rules as every project we work on:
@../Altaira/CLAUDE.md

(That file sits outside this repo, next to it on the author's computer. The rules it holds are summarised in
the "Design principles" of [ARCHITECTURE.md](ARCHITECTURE.md).)

Specific to this repo:

- Documents, code and comments in British English. In-game names are copied from the game in each
  language, under `labels.fr` and `labels.en` in `data/<game>/`; one we must translate ourselves ends with `*`.
- Commits in Frantz's name only, never a "Co-Authored-By" line.
- Nothing from `captures/` is ever committed (game art, other players' names).
- The "Forteresse" count on a unit sheet is the player's own number of troops: it is not a unit fact and never
  goes into `data/`.
