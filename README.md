# Army simulator for Warhammer: Chaos & Conquest — v1.0

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Unofficial fan tool.** Not affiliated with, endorsed by or connected to Games Workshop or Tilting Point.
> The combat formula of the game is not published: the simulator is an approximation, to be calibrated on
> real battle reports.

A browser page to evaluate an army: pick the troops, enter your bonuses, and see what the army is worth —
power, damage per strike, effective health (its tanking), morale, speed, load and upkeep — within the march
capacity. In English or French. Everything stays in your browser: no account, no server, nothing sent.

**Status, as of 23 October 2026:** version 1.0 — the troop catalogue (82 troops, 15 defences), the engine
(effective stats, power, battle), the page with its compositions, comparison, six dashboards and saves. Next:
calibration on battle reports, the fortress, heroes, skill tree and champion ([docs/roadmap.md](docs/roadmap.md)).

## Using it

Open the published page, or save it: it is one self-contained file that also works offline.

1. **Game:** Warhammer: Chaos & Conquest (more can be added).
2. **Your bonuses:** one row per bonus shown in the game — the stat, the percentage (0 to 100), and what it
   applies to (all troops, a troop type, a god, a tier, melee or ranged, a building).
3. **Your army:** the march capacity (your base plus its bonus), then "Add troops": search, filter, tick
   several, add them; type each count.
4. **Army profile:** the figures update as you type; the key columns open their details.
5. **Compare** any two compositions, then explore the six **dashboards**: efficiency per slot, battle by round,
   army balance, damage vs tanking, pros and cons, raiding.
6. **Save** your setup in the browser, or export it to a file and import it back.

## Running it locally

Requires [Node.js](https://nodejs.org) 22 or later. The published page has no runtime dependency; the tools
below are development dependencies only.

```bash
npm ci                                 # install the development tools
npm run dev                            # serves the source page at http://localhost:5173 (edit, reload)
npm run build                          # bundles everything into the single file dist/index.html
npm run check                          # formatting, lint, tests (data, engine, page, accessibility), HTML
git config core.hooksPath .githooks    # once per clone: run the checks before each commit
```

Every push to `main` runs `npm run check` and deploys the page to GitHub Pages.

## Where to change things

| To change                                         | Edit                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A troop type and its stats                        | `data/chaos-conquest/units.json`                                                       |
| Tiers, unit types, alignments, buildings, stats   | `data/chaos-conquest/game.json`                                                        |
| The combat rules and the model's parameters       | `data/chaos-conquest/combat-rules.json`                                                |
| Add a game                                        | a folder `data/<game>/`, a line in `data/games.json`, its imports in `src/ui/games.js` |
| The page's texts (English, French)                | `src/ui/texts/en.js`, `src/ui/texts/fr.js`                                             |
| Default capacity, new troop count, picker filters | `CONFIG` in `src/ui/config.js`                                                         |
| Colours                                           | tokens in `src/styles/tokens.css` (their contrast is tested)                           |

How it is built: [ARCHITECTURE.md](ARCHITECTURE.md). The data model: [docs/data-model.md](docs/data-model.md).

## Sources

- **Troop stats:** transcribed from the game's unit sheets, and checked against the game's data published by
  [CCTools](https://cctools.cc), which also gives the English names. The warlords, rituals, champion and gear to
  come will be taken from CCTools too, with thanks to its author.
- **Combat rules:** the official combat tips (Steam community) and the community wiki's
  [Combat Mechanics](https://warhammer-cnc.fandom.com/wiki/Combat_Mechanics) (CC-BY-SA).

## Contributors

- **Frantz Zizzari**: author.
- **Grimm**, of the warband: cross-checking the figures.

## Licence

[MIT](LICENSE). Game names, unit names and art belong to their owners.
