# Army simulator

This personal project follows the same golden rules as every project we work on. They live in
`Workspaces/CLAUDE.md`, one level above this repo on the author's computer, and Claude Code loads them
automatically. The rules it holds are summarised in the "Design principles" of [ARCHITECTURE.md](ARCHITECTURE.md).

Specific to this repo:

- Documents, code and comments in British English. In-game names are copied from the game in each
  language, under `labels.fr` and `labels.en` in `data/<game>/`; one we must translate ourselves ends with `*`.
- Commits in Frantz's name only, never a "Co-Authored-By" line.
- Nothing from `captures/` is ever committed (game art, other players' names).
- The "Forteresse" count on a unit sheet is the player's own number of troops: it is not a unit fact and never
  goes into `data/`.
- Scripted edits replace text with `split`/`join` or a replacement function, never a replacement string, where
  `$$`, `$&` and `$1` are patterns (DEF-006).
- A test's expected figure is worked out from the data and the formula, the working written in the test, never
  guessed from what seems likely (DEF-010).
- Before publishing a version: bring the dated status lines up to date (README, ARCHITECTURE.md, roadmap, open
  questions), run the code-review and accessibility-review skills, then `npm run check` (DEF-013).
