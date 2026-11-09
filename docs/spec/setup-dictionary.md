# The setup file's data dictionary — its elements, agreed 2026-11-09

[← The spec](setup.md) · [The guide](setup-guide.md)

Generated at build time from `game.json` and `warlords.json` (one source, DRY), published as
`setup-dictionary.json` and shown in the page; **pasted whole into the agent brief**, so the agent needs
nothing else (no link to follow). Each element follows ISO/IEC 11179: name, definition, data type, value
domain, obligation, labels on screen (EN / FR), where in game, example.

_(to confirm)_: what I can't check without the game's screens. FR labels marked * in the data are not
verified yet.

## 1. The file

| Element                                                               | Definition                               | Type, domain                        | Obligation                                        |
| --------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- | ------------------------------------------------- |
| `format`                                                              | Says the file is an Army Simulator setup | text, always `army-simulator/setup` | required                                          |
| `version`                                                             | The format's version                     | integer, `1`                        | required                                          |
| `game`                                                                | The game the setup belongs to            | text, `chaos-conquest`              | required                                          |
| `warlords`, `capacity`, `bonuses`, `rituals`, `buildings`, `champion` | The sections                             | see below                           | each optional: absent means "leave mine as it is" |

## 2. Warlords — a list, one entry per warlord the player owns

| Element            | Definition                | Type, domain                  | Labels EN / FR                | Where in game                                        | Example  |
| ------------------ | ------------------------- | ----------------------------- | ----------------------------- | ---------------------------------------------------- | -------- |
| `warlords[].id`    | The warlord, by its id    | text, one of the 33 ids below | the warlord's name            | Warlords screen, the name on the card _(to confirm)_ | `azazel` |
| `warlords[].rank`  | The warlord's rank        | integer, 1 to 7               | Rank / Rang _(to confirm)_    | the warlord's card _(to confirm: stars or a figure)_ | `5`      |
| `warlords[].level` | The level within the rank | integer, 1 to 5               | Level / Niveau _(to confirm)_ | the warlord's card _(to confirm)_                    | `4`      |

The site works out the overall level (rank 5, level 4 = level 24 of 35) and the power, which the player can
compare with the game's: a check, not an input.

**The ids**: the 33 warlords of `data/chaos-conquest/warlords.json`, with their names and rarity, listed in the
generated dictionary.

The FR names are the EN ones for now, all marked * (not verified): the French game's names are to collect.

## 3. Capacity

| Element                 | Definition                                                    | Type, domain        | Labels EN / FR                                     | Where in game  | Example  |
| ----------------------- | ------------------------------------------------------------- | ------------------- | -------------------------------------------------- | -------------- | -------- |
| `capacity.base`         | March capacity before bonuses: the most troops one army takes | integer ≥ 0, troops | March Capacity / Capacité de marche _(to confirm)_ | _(to confirm)_ | `110000` |
| `capacity.bonusPercent` | The march capacity bonus, all sources added                   | number, 0 to 100, % | _(to confirm)_                                     | _(to confirm)_ | `35`     |

## 4. Bonuses — a list, one entry per bonus as the game shows it

A bonus raises one stat by a percentage, for every troop or only some of them.

| Element             | Definition                                                                                                        | Type, domain           | Example                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------- |
| `bonuses[].stat`    | The stat raised                                                                                                   | one of the stats below | `meleeAttack`                   |
| `bonuses[].percent` | By how much                                                                                                       | number, 0 to 100, %    | `12`                            |
| `bonuses[].target`  | Which troops; absent = every troop. Each filter lists the values a troop must have; several filters must all hold | object, filters below  | `{ "unitTypes": ["infantry"] }` |
| `bonuses[].source`  | Where the bonus comes from, for the player's memory; not used in the calculation                                  | text, free             | `"titles"`                      |

**Stats and target filters**: listed in the generated dictionary from `data/chaos-conquest/game.json`: the
boostable `troopStats` (squad size, food upkeep, squad power and protection are never raised), and the
filters `unitTypes`, `tiers`, `attackTypes`, `alignments`, `recruitments`, `buildings` (where the troop is
recruited) and `units` (one troop or defence by its id), each value with its EN and FR label.

Reading examples (from the game's wording to the file):

| On screen (EN or FR)         | In the file                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| "Infantry Melee Attack +12%" | `{ "stat": "meleeAttack", "percent": 12, "target": { "unitTypes": ["infantry"] } }`                                              |
| "Santé des troupes +8 %"     | `{ "stat": "health", "percent": 8 }`                                                                                             |
| "Tier V cavalry armour +5%"  | `{ "stat": "armour", "percent": 5, "target": { "tiers": [5], "unitTypes": ["cavalry"] } }`                                       |
| "Khorne troops' damage +10%" | two entries, `meleeDamage` and `rangedDamage`, each with `{ "alignments": ["khorne"] }` _(to confirm: does "damage" mean both?)_ |

## 5. Rituals, buildings, champion (kept, used from 1.2 and 1.3)

| Element                                                  | Definition                            | Type, domain                                                      | Example                    |
| -------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| `rituals[].id`, `rituals[].level`                        | A ritual and the level reached        | id from the ritual list (1.2); integer, 0 to the ritual's maximum | `defence-capacity-1`, `10` |
| `buildings[].id`, `buildings[].level`                    | A building and its level              | id from the building list (1.2); integer ≥ 1                      | `fortress-walls`, `25`     |
| `champion.level`, `champion.skills[]`, `champion.gear[]` | The champion, its skills and its gear | defined in 1.3                                                    |                            |

Until their version, these sections are kept as they are and shown as "coming": a file filled today stays
valid.
