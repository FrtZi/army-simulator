# The player's setup (BL-08) — spec, agreed with Frantz on 2026-11-09

[← Overview](../../ARCHITECTURE.md) · Catalogue: CFG-04, CFG-05, CFG-06, NAV-01 · Why: D-27 · [The guide](setup-guide.md) · [The dictionary](setup-dictionary.md)

## The need

What a player has in game changes slowly (warlords and their levels, rituals, buildings, champion, gear),
while compositions change all the time. The setup holds **everything** the player has, entered once, by hand
or uploaded from a file an agent filled by reading screenshots. Compositions draw on it, or the player opens
the lab and tries anything.

## What it holds (shaped on cctools.cc's player profile)

| Section                                   | Version | Note                                                       |
| ----------------------------------------- | ------- | ---------------------------------------------------------- |
| Warlords owned, each with rank and level  | 1.1     | 33 warlords, ranks 1 to 7, levels 1 to 5                   |
| March capacity and bonus rows             | 1.1     | moved from each composition; they shrink as sources arrive |
| Rituals and their levels                  | 1.2     | BL-10: 153 combat rituals; Defence Capacity I and II       |
| Buildings and their levels                | 1.2     | BL-14: 10 with combat bonuses; Fortress Walls              |
| Champion, skills, gear and sets           | 1.3     | BL-13                                                      |
| Troops owned, each with its number        | 1.2     | BL-26, D-34: warned above in the lab, never capped         |
| Prestige, skins, titles, cities, alliance | later   | bonus rows until each source has its data                  |

The file carries every section from the start; a section the site cannot use yet is kept and shown as
"coming", never refused, so a file filled today stays valid.

## How it behaves (Frantz, 2026-11-09)

- **Two page tabs:** "Battle lab" (the page as it is today) and **"Your setup"**.
- **In the Battle lab, a switch "Load your setup"**, above the compositions: on, compositions pick only the
  warlords owned, at their levels, with the setup's capacity and bonuses; off, free play (any warlord at
  any level, capacity and bonuses entered in the lab). The setup is kept either way. Each thing the saved
  setup holds replaces the lab's; what it does not hold (no capacity entered, no bonus yet) is taken from the
  lab, and the switch says which. A composition's hero the setup does not own is named and left out.
- **Your setup, one view:** a summary of everything (one tile per section, its key figure, its state with
  an icon and a word, and where the last change came from), then the sections. What is typed and what a
  file brings land in the same fields, each editable; a row says whether it came by hand or from a file.
- **Import and export:** upload a whole or partial file; only what it holds changes (sections absent are
  left alone, list entries matched by id, nothing removed by a file). Before applying: added, updated,
  kept, unchanged, in colour with an icon and a word, and every refused value with where, what and why. A
  value a list can fix (a hero's id, rank or level, a bonus's stat, a target's value) is parked with its list,
  the nearest chosen for a misread name: the player chooses another or leaves it out (Frantz, 2026-11-09).
  Download the whole setup.
- **Under import, the file:** the empty template or the setup filled (download either), the guide, the
  brief for an agent (copied by a button) and the dictionary; `setup.schema.json` and
  `setup-dictionary.json` published with the site.
- **A Save button:** edits and applied uploads change the view at once, marked as unsaved (the state with
  an icon and a word, the changed rows marked); Save keeps them in this browser, Discard changes goes back
  to the last save, and leaving with unsaved changes asks first. The Battle lab uses the saved setup.
  Never sent anywhere (D-01).
- **The data dictionary** (`dictionary-setup.md`): every element per ISO/IEC 11179 (definition, type, value
  domain, obligation, EN and FR labels, where in game, example) and the value lists (33 warlords, stats,
  target filters), with examples from the game's wording to the file. Generated from the game's data,
  published as `setup-dictionary.json`, and pasted whole into the agent brief.

## The file format

A setup file stands alone (`"format": "army-simulator/setup"`, its own `version`, `game`), so an agent can
produce it without knowing the configuration. The configuration (version 3) carries it as `setup` beside the
`scenarios`; a scenario's `heroes` lists the warlords it uses. A version 2 file is brought up to date: its
compositions' warlords become owned, at the highest level found.

## Choices taken (D-27)

Agreed on the prototypes; where Frantz had not chosen, the proposal was taken (easy to change):

1. One "Load your setup" switch for the whole lab (one per composition set aside for now).
2. A file never removes anything; removal by hand only.
3. A warlord's level is set in the setup only; to try another level, switch the setup off.
4. Every section in the file from version 1, unused ones kept and shown as coming.
5. Saved with a Save button (not at every change): unsaved changes are shown, and leaving asks first.
