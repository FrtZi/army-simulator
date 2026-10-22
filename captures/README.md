# Captures (local only)

In-game screenshots, the raw material of `data/`. **Everything in this folder except this file is ignored by
git**: the art belongs to the game's publishers, and some screens show other players' names
([docs/decisions.md](../docs/decisions.md), D-06).

| Folder                   | What to put in it                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `units/<building>/`      | one folder per building that lists troops, named after its id in `data/<game>/game.json`    |
| `defences/`              | the Fortress Walls screen and one card and stats sheet per defence, as for the units        |
| `boosts/`                | the in-game boost summary                                                                   |
| `battle-reports/`        | detailed battle reports: troops and losses on each side, turn by turn (for the calibration) |
| `sources/`               | other people's work used as a control, never published (D-10)                               |
| `unit-descriptions.json` | the units' in-game descriptions, extracted from the cards (French)                          |

In a building's folder, the files starting with `_` show the building itself (`_building.png`, the unit list
`_units.png`); every other file is named after the unit's id in `data/<game>/units.json`: `khorngor.png` for its card,
`khorngor-stats.png` for its stats table. For example `units/beastmen-herdstone/khorngor-stats.png`.
