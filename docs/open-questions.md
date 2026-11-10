# Open questions and next steps

[← Overview](../ARCHITECTURE.md) · Why: [decisions.md](decisions.md) · Plan: [roadmap.md](roadmap.md)

What we do not know yet, how to find out, and who can tell. Each answer goes into the data or the rules
(`data/<game>/`), with its source, and moves out of this list.

## To confirm: the combat model

| #   | Question                                                                                                                                                                                         | What the simulator does today                                               | How to settle it                                                                                         | Who                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | **Tier bonus**: the official Steam tips say a troop gets a bonus against lower tiers and a penalty against higher ones. How much per tier?                                                       | cctools.cc's table, ×0.7 to ×3.25 (`tierFactors`, BL-21): an estimate there | Battle reports with troops of several tiers on both sides; fit the value until the losses match (SIM-04) | Frantz, battle reports            |
| 2   | **Morale**: a squad that loses more than 25 % of its squad size tests its morale (wiki). The simulator counts losses per troop type, not per squad, and breaks (100 − morale) % of the survivors | approximation                                                               | Battle reports showing broken troops                                                                     | Frantz                            |
| 3   | **Broken troops**: how much extra damage do ranged attacks deal them?                                                                                                                            | 0 % (`brokenRangedBonusPercent`)                                            | The ritual that changes it shows its value in game                                                       | Frantz (screenshot of the ritual) |
| 4   | **Bonuses**: do two bonuses on the same stat add up (+10 % and +15 % = +25 %) or multiply?                                                                                                       | they add up (as the wiki's formula)                                         | One stat with two known bonuses, read on the unit's sheet in game                                        | Frantz (screenshot)               |
| 5   | **Speed**: does an army march at its slowest troop's speed?                                                                                                                                      | the profile shows the slowest                                               | Two marches, with and without a slow troop                                                               | Frantz                            |
| 6   | **Fortress battles**: a fourth, first round where only the defences strike (wiki); Hellcannon emplacements                                                                                       | not modelled                                                                | With the fortress (ARMY-04)                                                                              | —                                 |
| 7   | **Warlords and champions**: their bonuses in battle                                                                                                                                              | not modelled                                                                | In game: each warlord's bonuses on its sheet                                                             | Frantz                            |

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

| #   | Question                                                                                                                                                                                                                                                                                                                      | What the simulator will do                                                                                                                     | Who                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 14  | **Talents on the heroes themselves**: does an active talent (Slaanesh Health +45 %) also raise a Slaanesh hero's stats?                                                                                                                                                                                                       | troops only; Frantz does not know (2026-10-24): to settle with battle reports (SIM-04)                                                         | Frantz                                              |
| 15  | **Protection**: cctools gives each hero a "Protection" stat (Azazel at level 35: 1,625). What does it do in battle?                                                                                                                                                                                                           | kept and shown, not used in battle                                                                                                             | Frantz (the stat's tooltip in game)                 |
| 16  | **Context bonuses** of the warlords. Partly answered on 2026-10-24: a "combat" bonus (March, Fortress, Warband) probably raises every fighting stat — attack, damage, armour, health — **to verify**; Combat vs Empire counts only against the Empire's troops (PvE); Enemy Attack Debuff lowers the attacking enemy's attack | kept, not applied; then March Combat on the attacking side, Fortress Combat and the debuff with the keep (BL-11, BL-12), Empire never (no PvE) | Frantz (a battle report with and without the bonus) |
| 18  | **Heroes and the march capacity**: does a hero take a place in the march?                                                                                                                                                                                                                                                     | no: the capacity counts troops only                                                                                                            | Frantz                                              |

## To confirm: the setup (BL-08, D-27)

| #   | Question                                                                                                                                                                                                                 | As of 2026-11-09                                                                                | Who                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 19  | **Where the game shows** a warlord's rank and level, the march capacity and its bonus: the screens an agent is given; the bonuses, rituals and gear: answered (below)                                                    | marked _to confirm_ in the guide and the dictionary                                             | Frantz (screenshots)                                   |
| 23  | **The champion fighting**: is it in the battle as a unit, with its own stats at its level (attack 30 to 66, health 25 to 2,050…)?                                                                                        | not fighting; Frantz, 2026-11-10: "it seems so", to verify; if so, as the heroes fight (SIM-10) | Frantz (a battle report)                               |
| 24  | **The Chaos Keep's totals**: do its Combat tab's bonuses ("Infanterie : attaque de mêlée +50,5 %") already hold the rituals', buildings' and champion's? Then a setup takes either the totals or the sources, never both | the bonus rows are added to the sources (BL-08)                                                 | Frantz (one ritual raised, the total before and after) |

Settled on 2026-11-10: where the game shows the bonuses, rituals and gear (question 19 in part, Frantz). The
bonuses: the Chaos Keep (Donjon du Chaos), Combat tab, summed by troop type ("Infanterie : attaque de mêlée
+50,5 %"); the troops owned are on its Army tab. The rituals: each category's tree, one screenshot per branch; a
ritual bright and ticked is at its top level, the others show theirs ("7/10"). The French word for load is the
game's "charge" ("Infanterie : charge +15 %"; question 20).

Settled on 2026-11-10: a bonus on "damage" raises melee and ranged damage alike, unless the game names one
(question 21, Frantz: the game says which when it is only one).

Settled on 2026-11-10: the champion in a composition (question 22), on cctools.cc's lead, confirmed by Frantz: it
leads one march, whose troops its gear's march bonuses raise; its gear's other troop bonuses count everywhere, as
a ritual's; its heroes' and fortress's bonuses are shown, not applied (D-30). Whether it fights as a unit: question 23.

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
