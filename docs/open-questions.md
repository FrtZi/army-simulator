# Open questions and next steps

[← Overview](../ARCHITECTURE.md) · Why: [decisions.md](decisions.md) · Plan: [roadmap.md](roadmap.md)

What we do not know yet, how to find out, and who can tell. Each answer goes into the data or the rules
(`data/<game>/`), with its source, and moves out of this list.

## To confirm: the combat model

| #   | Question                                                                                                                                                                                         | What the simulator does today       | How to settle it                                                                                         | Who                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | **Tier bonus**: the official Steam tips say a troop gets a bonus against lower tiers and a penalty against higher ones. How much per tier?                                                       | 0 % (`tierModifierPercent`)         | Battle reports with troops of several tiers on both sides; fit the value until the losses match (SIM-04) | Frantz, battle reports            |
| 2   | **Morale**: a squad that loses more than 25 % of its squad size tests its morale (wiki). The simulator counts losses per troop type, not per squad, and breaks (100 − morale) % of the survivors | approximation                       | Battle reports showing broken troops                                                                     | Frantz                            |
| 3   | **Broken troops**: how much extra damage do ranged attacks deal them?                                                                                                                            | 0 % (`brokenRangedBonusPercent`)    | The ritual that changes it shows its value in game                                                       | Frantz (screenshot of the ritual) |
| 4   | **Bonuses**: do two bonuses on the same stat add up (+10 % and +15 % = +25 %) or multiply?                                                                                                       | they add up (as the wiki's formula) | One stat with two known bonuses, read on the unit's sheet in game                                        | Frantz (screenshot)               |
| 5   | **Speed**: does an army march at its slowest troop's speed?                                                                                                                                      | the profile shows the slowest       | Two marches, with and without a slow troop                                                               | Frantz                            |
| 6   | **Fortress battles**: a fourth, first round where only the defences strike (wiki); Hellcannon emplacements                                                                                       | not modelled                        | With the fortress (ARMY-04)                                                                              | —                                 |
| 7   | **Warlords and champions**: their bonuses in battle                                                                                                                                              | not modelled                        | In game: each warlord's bonuses on its sheet                                                             | Frantz                            |

Settled on 2026-10-22: damage per strike = attack × damage / 200 and effective health = armour × health / 40,
bonuses included — the game's community wiki, confirmed by the control calculation (D-16, D-10); a troop strikes with its
stronger attack; within a tier, higher morale is hit first; broken troops are only hit by ranged attacks.

## To confirm: names and rights

| #   | Question                                                                                                       | As of 2026-10-22 | Who |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------- | --- |
| 11  | **Game art**: the troop pictures need the publishers' permission; the page uses its own icons meanwhile (D-06) | own icons        | —   |

Settled on 2026-10-23: the contributor named in the README agreed to be credited (question 10); the
repo is named "army-simulator" (question 12), published on 2026-10-22.

Settled on 2026-10-24: the English names (questions 8 and 9) are the game's own, as published by cctools.cc
(D-25): 34 troops and defences renamed, the Herald of Slaanesh is in fact the Hellstriders of Slaanesh; only
"Food Upkeep" keeps its star.

## To confirm: data

| #   | Question                                                                                                                                                               | As of 2026-10-24       | Who                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------- |
| 13  | **Food upkeep**: our figures, read on the unit sheets, are exactly 6 times those of cctools.cc (Marauder 6 against 1). Which one is per hour, and per how many troops? | ours kept (the sheets) | Frantz (a unit sheet, later) |

## To confirm: heroes (D-26)

| #   | Question                                                                                                                                                                                                  | What the simulator will do                                                             | Who    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| 14  | **Talents on the heroes themselves**: does an active talent (Slaanesh Health +45 %) also raise a Slaanesh hero's stats?                                                                                   | troops only; Frantz does not know (2026-10-24): to settle with battle reports (SIM-04) | Frantz |
| 15  | **Protection**: cctools gives each hero a "Protection" stat (Azazel at level 35: 1,625). What does it do in battle?                                                                                       | ignored until known                                                                    | Frantz |
| 16  | **Context bonuses** of the warlords: March Combat (5 warlords), Fortress Combat, Warband Combat, Combat vs Empire, Enemy Attack Debuff. On which stats does a "combat" bonus apply, and in which battles? | kept in the data, not applied                                                          | Frantz |

Settled on 2026-10-24: the warlords' French names (question 17) are their English names with a star (D-08) until
the game's French names are read on a screenshot.

## Next steps

1. **Calibrate** on battle reports (SIM-04): questions 1 to 4. Send detailed reports, troops and losses per
   round, both sides.
2. **The fortress** (ARMY-04): defences within the walls' capacity, the garrison, the fourth round.
3. **Heroes' stats, the skill tree, the champion's stats and sets** (BONUS-03 to 06), then buildings (BONUS-07):
   each as a source that turns levels into
   bonuses, instead of typing the totals.
4. **Optimiser** (SIM-05): the best troop mix within the march capacity.
