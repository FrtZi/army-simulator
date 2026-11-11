# Architecture

The simulator is a plain-JavaScript page with no framework, no server and no runtime dependency, built like
the [banking churn demo](https://github.com/FrtZi/banking-churn-demo): small ES modules, bundled with the game
data into one self-contained `dist/index.html`, published on GitHub Pages. As of 23 October 2026, version 1.0: the game data with their
checks, the engine (effective stats, armies, power, profile, battle, comparison, dashboards' figures) and the
page (game, bonuses, compositions, profile, comparison, six dashboards, saves); what comes next is in
[the product backlog](docs/backlog.md).

Three rules hold the structure together:

1. **The engine knows nothing about the page.** It is pure computation, testable in Node.
2. **Facts live in data, not in code.** The game's facts are JSON files in `data/`; the code holds no figure.
3. **A player's data never leaves their browser.** No server, no shared database, no analytics
   ([docs/decisions.md](docs/decisions.md), D-01).

## Folders

```
data/                    each game's facts (JSON), the same for every player (D-13)
├── games.json           the games the simulator knows: id and names
└── chaos-conquest/      Warhammer: Chaos & Conquest
    ├── game.json        vocabulary: tiers, recruitments, attack types, unit types, alignments, buildings, stats, source kinds
    ├── defences.json    one entry per fortress defence (never part of an army)
    ├── units.json       one entry per troop type, from its in-game sheet
    ├── combat-rules.json  the combat rules the game publishes, with their source
    ├── warlords.json    the 33 warlords, at each of 35 levels: imported (scripts/import-warlords.mjs), never edited
    ├── items.json       the resources and items costs name: imported (scripts/import-items.mjs), never edited (D-29)
    ├── rituals.json     the 373 rituals in 13 categories, level by level: imported (scripts/import-rituals.mjs)
    ├── structures.json  the 32 structures, level by level: imported (scripts/import-structures.mjs)
    ├── item-sources.json  where each item drops: imported (scripts/import-item-sources.mjs)
    ├── champion.json    the champion by level, its gear and sets: imported (scripts/import-champion.mjs)
    ├── pve.json         the PvE places and their troops: imported (scripts/import-pve.mjs), not in the page yet
    └── setup.json       the setup file's words: each element's definition, reading examples, the agent brief (D-28)
src/engine/              pure functions, no DOM, no file access: callers pass the data
├── index.js             public API: the only file the page and the tests import
├── targets.js           which troops an effect selects (TARGET_FIELDS)
├── sources.js           a player's bonus sources → effects (one resolver per kind: manual, ritual, building)
├── prerequisites.js     what reaching a ritual's level asks, back to the roots; each ritual's depth (GUIDE-07)
├── bonuses.js           checks a bonus a player enters: stat, 0–100 %, target (D-14)
├── stats.js             effective stats; march capacity as base, bonus, total (D-12)
├── army.js              an army: lines (troops, then heroes), size against the capacity, power
├── heroes.js            heroes (D-26): rank and level, a hero as a unit of one, talents offered and chosen, rules
├── combat.js            per-troop damage and health, tier modifier, melee or ranged (D-16)
├── allocate.js          where a strike's damage goes: lowest tier first, then the order within a tier
├── morale.js            morale tests and rallying
├── battle.js            the battle: turns, strikes, morale, power lost, winner
├── measures.js          army damage and health in one strike (SIM-07)
├── profile.js           the army's profile: damage, tanking (health, armour), morale, speed, load, upkeep
├── compare.js           two armies: each figure, its difference and the better one, both battles (SIM-03)
└── insights.js          the dashboards' figures: efficiency, rounds, balance and warnings, pros and cons
src/storage/             no DOM: configuration.js (setup ↔ file format version 2, checks), migrate.js (an older
                         file brought up to date), browser.js (saves); the player's setup file (D-27):
                         setup-file.js (read and checked value by value, written back; setup-checks.js: what its
                         readers share; setup-champion.js: the champion read; setup-buildings.js: a building's copies, D-33; setup-troops.js: the troops owned, D-34), setup-merge.js (only
                         what a file holds changes), nearest.js (the id a misread name meant); its dictionary
                         (D-28): setup-dictionary.js (built from the game's data), setup-schema.js (as a JSON
                         Schema), setup-brief.js (the brief for an agent, the whole dictionary in it); and
                         player-setup.js (the setup kept in the browser, one per game, as a setup file),
                         setup-parked.js (a value a list can fix, parked until the player chooses)
src/index.html           page shell: head, header (flags, theme), footer, one include per section
src/theme-init.js        sets the theme before the first paint (inlined in <head>)
src/assets/              the language flags (inlined by the build)
src/main.js              entry point: binds every control, then draws the page
src/ui/                  the page
├── config.js            CONFIG: every tunable value of the interface
├── games.js             the games and their data (the JSON imports the build bundles)
├── state.js             the single mutable state, and what derives from it (effects, army, profile)
├── player-setup.js      the player's setup on the page: the one edited, the last saved, what differs (D-27)
├── lab-setup.js         the saved setup in the Battle lab: heroes owned at their levels, capacity, bonuses
├── render.js            the render pipeline: what to redraw after a change
├── texts/               the page's texts: en.js + en-more, en-dash, en-heroes, en-setup, and the same in French
│                        (same keys), t()
├── format.js, dom.js    numbers and names in the current language; small DOM helpers
├── files.js             a file downloaded from the page, a picked file's text
├── tablist.js           a row of tabs, clicks and keys (the page's, the dashboards', the guides')
├── icons.js             the page's SVG icons and the troop type pictograms (D-18)
├── fold.js              every block folds to its summary line, remembered (FOLD-01, D-35); its lines in
│                        fold-summaries.js (the Battle lab's) and fold-summaries-setup.js (Your setup's, the Guides)
├── ritual-tree.js       a rituals category as the game's tree, and the order and numbers it reads in (GUIDE-07)
├── rarity.js            a rarity as a badge, a piece's levels as rarities (GUIDE-05, D-31)
├── pve.js               a PvE army as the second side: its troops read like ours, a place chosen, its army (SIM-11)
├── champion-bonuses.js  every bonus a gear set or a skill gives, by domain (BONUS-09)
├── skill-benefits.js    what a skill gives at a level, a tree's skills in all (BONUS-09)
├── champion-figures.js  the champion's stats and its gear's bonuses in all, in Your setup and the lab (BONUS-08)
├── charts/             scatter.js: the scatter chart of three dashboards; zoom.js: drag a box, + and −;
│                        hover.js: a dot's name while pointing at it; table.js: the chart as a table (D-24)
├── filters.js           the troop filters (several values each) shared by the picker and the charts
├── glossary/            terms.js (definitions, both languages), tooltip.js (the dotted terms)
└── steps/<part>/        everything a part of the page needs: <part>.html (its markup, included by the build),
                         draw.js (state → DOM), bind.js (controls → state), and its own styles if any:
                         page (language, theme, the page tabs: tabs.html, tabs.js), game, then the Battle lab's:
                         load (the "Load your setup" switch), bonuses, army (+ compositions), picker, heroes
                         (+ picker.js; heroes.js beside state.js works out a composition's heroes),
                         profile (+ table.js: key columns and their details), compare, dashboards
                         (one file per tab: efficiency + raiding, rounds, balance, map, pros; dashboards.css), saves;
                         and Your setup's: setup (the summary's tiles and the save state in draw.js, the heroes
                         in warlords.js, the troops owned in troops.js, the rituals' and buildings' levels in levelled.js (the rituals chosen in their tree in ritual-tree.js), the champion in
                         champion.js, a file uploaded in
                         files.js, under review in import.js, drawn in review.js; D-27);
                         the Champion lab: champion-lab (lab.js its state, draw.js the level, gear.js two sets compared,
                         skills.js the trees, bind.js); and the Guides: guides (the block tabs in draw.js, the heroes' guide in heroes.js, the
                         rituals' and buildings' in levelled.js and levelled-detail.js, the items' in items-table.js (by family) and items.js (one in detail), the champion's in champion.js, what going up costs in costs.js, the map to reach a ritual in ritual-map.js, the set lab in set-lab.js, the skill trees in champion-skills.js)
src/styles/              the shared design: tokens.css (colours, both themes), base, layout, forms, lists, figures,
                         responsive
scripts/
├── page.mjs             assembles index.html from its sections, fills in the English texts
├── build.mjs            bundles and inlines everything (esbuild) → dist/index.html
├── setup-files.mjs      each game's setup dictionary and schema → dist/<game>/ (called by the build, D-28)
├── serve.mjs            npm run dev: serves the source page and data/ (no build)
├── catalogue.mjs        reads the feature catalogue (docs/features.md)
├── import-warlords.mjs  data/<game>/warlords.json from cctools.cc's saved pages (D-25)
├── import-items.mjs     data/<game>/items.json, the resources and items their costs name (D-29)
├── cctools.mjs          what the imports share: a saved page's data, a cost's item
├── import-rituals.mjs, import-structures.mjs   rituals.json and structures.json; levels.mjs: their levels read alike
├── import-item-sources.mjs  item-sources.json, where each item drops
├── import-skills.mjs    champion-skills.json, the champion's two skill trees
├── import-champion.mjs  champion.json, the champion, its gear and sets
├── import-pve.mjs       pve.json, the PvE places and their troops
├── backlog*.mjs         the product backlog: its check and its page docs/backlog.md (npm run backlog)
└── defects*.mjs         the defects register: its format, its check, its page docs/defects.md (npm run defects)
examples/
└── configuration.example.json   a fictitious player configuration, in the saved format
captures/<game>/         in-game screenshots: local only, ignored by git (see captures/README.md)
docs/                    one page per subject, each linking back here
tests/                   node --test; each test names the feature it proves
├── data, engine, battle, dashboards, backtest, storage, setup, setup-dictionary   the data, the engine, the saves
│                        and the setup with its dictionary, in Node
├── page.test.js         the published page, driven in jsdom (page.js: opening it, clicking, typing)
├── setup-page.test.js   the page tabs and Your setup, on the published page (NAV-01, CFG-04)
├── setup-files.test.js  Your setup's files: uploaded and reviewed, downloaded, the brief copied (CFG-05, CFG-06)
├── guides.test.js       the Guides: the block tabs, the heroes found and shown level by level (GUIDE-01, GUIDE-02)
├── gear.test.js         the gear's rarities, a piece's set, the champion's figures, the set lab (GUIDE-05, 06, 09, BONUS-08)
├── ritual-map.test.js   the map to reach a ritual: prerequisites, states, the way, the steps (GUIDE-07)
├── items.test.js        the items by family, folded, a row's detail under it (GUIDE-08)
├── champion-lab.test.js  the Champion lab: level, two sets compared, the trees (BONUS-09)
├── skills.test.js       the champion's two skill trees and their points (BONUS-09)
├── pve.test.js          a PvE army as the opponent: chosen, sub-selected, only your attack (SIM-11, DEF-043)
├── fold.test.js         every block folds to its line, remembered (FOLD-01)
├── troops.test.js       the troops owned: read, typed, warned in the lab (CFG-08, D-34)
├── buildings.test.js    a building's copies: most copies, read, each counting, typed (BONUS-07, D-33)
├── styles.test.js       each selector's look in one stylesheet (DEF-031)
├── accessibility.test.js   axe-core on the page in both languages; colour contrast from the tokens
├── tooling.test.js      the page assembler, the dev server, configurations aligned (MAINT-04)
├── performance.test.js  the worst comparison against a phone's budget (PERF-01)
├── warlords.test.js     the warlords: complete at every level, their talents valid bonuses (DATA-05)
├── rituals.test.js      the rituals and structures: complete, costs, requirements and bonuses known (DATA-07)
├── crosscheck.test.js   data/ against the game's data from cctools.cc (local only, D-25)
└── catalogue, defects, backlog   the catalogue against the tests (MAINT-02); the defects and backlog checkers
```

## Layers

Arrows read "imports". Each layer only imports from the layers below it.

```mermaid
flowchart TD
  main[main.js] --> bind[steps/*/bind.js<br/>controls → state]
  bind --> render[render.js]
  bind --> draw
  render --> draw[steps/*/draw.js<br/>state → DOM]
  draw --> shared[state · format · texts · dom · config · games · icons · glossary]
  bind --> storage[storage/*]
  storage --> engine
  bind --> shared
  shared --> engine[engine/index.js]
  shared --> data[data/*.json]
```

`render.js` never imports a `bind.js`, and a `draw.js` never imports `render.js`: that keeps the graph free of
cycles. The engine imports nothing from the page.

## The render pipeline

`src/ui/render.js` decides what to redraw; every control calls one of its two functions:

| A control changes…                                        | It calls      | Which redraws                                                                      |
| --------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| the language, the game, a bonus or troop added or removed | `renderAll()` | every part, keeping the focus where it was                                         |
| a value typed in: a percentage, a count, the capacity     | `refresh()`   | the bonus problems, the capacity bar, the profile — never the field being typed in |

The picker redraws only itself while searching, filtering and ticking; adding the ticked troops redraws the
army lines and the profile.

## Documentation

| Page                                        | Says                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [data-model.md](docs/data-model.md)         | units, effects, sources (hero, ritual, champion, armour, building), the player's configuration    |
| [features.md](docs/features.md)             | what the simulator does, and what proves it                                                       |
| [spec/](docs/spec/setup.md)                 | the specs of the larger features: the player's setup, its guide and its dictionary; PvE opponents |
| [decisions.md](docs/decisions.md)           | why these choices, and the options set aside                                                      |
| [open-questions.md](docs/open-questions.md) | what is still to confirm, and the next steps                                                      |
| [backlog.md](docs/backlog.md)               | what is left to do: milestones, priorities, dependencies (generated from backlog.toml)            |
| [defects.md](docs/defects.md)               | what broke, and what we learnt (generated from defects.toml)                                      |

## Where things live

| Kind of data                              | Place                                    |
| ----------------------------------------- | ---------------------------------------- |
| A game fact (unit stat, rule, vocabulary) | `data/*.json`                            |
| A player's configuration                  | their browser, and the files they export |
| A player's setup (what they have in game) | their browser, as a setup file (D-27)    |
| A screenshot                              | `captures/`, on this computer only       |
| A tunable value of the interface          | `CONFIG` in `src/ui/config.js`           |
| A text of the page                        | `src/ui/texts/en.js` and `fr.js`         |
| An in-game name                           | `labels` in `data/<game>/*.json`         |
| A colour                                  | tokens in `src/styles/tokens.css`        |
| The page's language choice                | the player's browser (`localStorage`)    |

## Design principles

The golden rules shared by all our projects, applied here with the simplest means that work:

- **DRY.** Each fact exists once: the vocabulary in `data/<game>/game.json`, every bonus as the same effect shape,
  whatever its source.
- **KISS.** No framework, no server, no database: JSON files, pure functions, one page.
- **YAGNI.** The heroes, rituals, champion, armour and buildings have a documented shape, but no file and no
  code until a feature uses them. The interface comes after the engine.
- **Package by feature.** The first level of `src/` separates the functional families — the calculation
  (`engine/`), the access to saves (`storage/`), the screen (`ui/`) — and each part of the page keeps its
  markup, code and own styles together in `ui/steps/<part>/`. The same names run through the tests
  (`engine`, `battle`, `dashboards`, `storage`, `page`). `src/styles/` holds only what every part shares (the
  tokens and common components): one design, checked for contrast in one place.
- **Configurations aligned.** The git hook and the CI run the same command (`npm run check`); the Node
  version of `package.json` and of the CI, and that command in both, are checked to agree (MAINT-04).
- **Single responsibility.** One file, one job. ESLint caps files at 150 lines, functions at 60, complexity
  at 12.
- **Open / closed.** A new source kind is declared (catalogue, resolver, `sourceKinds` entry); the engine
  that applies effects does not change. A new unit is one entry in `units.json`.
- **Small interfaces.** The page and the tests only import `engine/index.js`.
- **Dependency inversion, where it pays.** Engine functions receive the units, effects and rules they work
  on; they never read files or the browser themselves.

## Checks

`npm run check` runs Prettier, the defects register check (it regenerates `docs/defects.md`, the only generated
doc, ignored by Prettier), ESLint, the tests (it builds `dist/` first: the page tests drive the published
file) and html-validate. The git hook (`.githooks/pre-commit`, enabled with `git config core.hooksPath
.githooks`) runs it before each commit, with a secret scan (gitleaks); the CI runs both on every push, then
deploys `dist/` to GitHub Pages from `main`.

## Conventions

- No inline style in the HTML and no colour in JavaScript: colours are tokens.
- A status is never shown by colour alone: an icon (✓, ⚠) and words go with it.
- Every text of the page has a key in both `en.js` and `fr.js` (tested); the build fills the English ones into
  the HTML, so the page reads in full before its script runs.
- Each control has a label; icon buttons have an accessible name.
