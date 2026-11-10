# A PvE army as the opponent (BL-20) — spec, to agree with Frantz

[← Overview](../../ARCHITECTURE.md) · Catalogue: SIM-11 · Data: [data-model.md](../data-model.md) (`pve.json`,
DATA-10) · Status: agreed with Frantz on 2026-11-10

## The need

Most battles a player fights are against the game's computer-controlled armies: an army on the map, a raid, a
city. Today the Battle lab only sets one composition against another, so the player has to copy a PvE army by
hand, troop by troop, to know whether a march can beat it and what it will lose.

## What the data holds

`pve.json`, imported from cctools.cc (D-25): 104 places, each at its level with its exact troops.

| Kind | Places | Levels   | Example                                |
| ---- | ------ | -------- | -------------------------------------- |
| Army | 74     | 1 to 40  | Marauders Army, level 1: 1,000 troops  |
| Raid | 17     | 35 to 70 | Chaos Dragon, level 35: 600,000 troops |
| City | 13     | 1        | Altdorf: 840,000 troops                |

The 47 troops they field each have a tier, a type, an attack type, a race and their fighting stats; their morale
comes from cctools.cc's page of PvE troops (3 Chaos troops of the cities are not listed there).

## How it behaves

1. **Choosing the opponent.** In the Battle lab, the battle's second side is either _a composition_ (as today) or
   _a PvE army_. For a PvE army, the player picks the kind (army, raid, city), then the place, then its level
   (only the levels that exist; a city has one). The place's troops are listed with their counts, tier and type.
   **The player sub-selects them** (Frantz, 2026-11-10): each troop of the army can be left out or given a
   smaller count (what is left of it after an earlier attack, or one part of it); "the whole army" puts it back.
2. **What fights.** The place's troops at their counts, with their own stats and tiers. No hero, no bonus (none
   is known for them). The tier factor (BL-21) and morale work as in any battle.
3. **Your side.** The composition as it is: its heroes, its bonuses, the setup if loaded, the champion if it
   leads it (D-30). The player always attacks.
4. **Bonuses that name the enemy.** The champion's Vanquish bonuses for the PvE army's race (Beastmen,
   Greenskins…) and a warlord's Combat vs Empire against the Empire's troops apply in this battle only. They are
   marked _to verify_ until a battle report confirms them (open question 16).
5. **The result.** As for any battle today: the rounds, the losses on both sides, the survivors, the power lost,
   who wins.
6. **In the Guides** (optional, cheap): a PvE tab with each place by kind and level and its troops, a way from
   there to "fight it in the lab".

## Out of scope

Rallies (several marches against one target), rewards and loot, a city's defences striking first (BL-11), travel
time. The optimiser that finds the smallest march able to win is BL-16.

## Questions for Frantz

1. **The counts.** Some places field millions of troops (Beastmen Army level 25: 12.7 million). Is that what the
   game shows, a target for rallies only? Or does cctools.cc give something else than a count?
2. **Cities.** Do they have walls or defences that strike before the troops (as a keep attack)?
3. **PvE bonuses.** Does the game give the PvE armies bonuses of their own, by level?
4. **An empty army.** One Beastmen Army of level 1 has no troop in cctools.cc's answer: left out of the list?
5. **Morale.** For the 3 troops whose morale is not listed: the morale of the same troop type, or another value?

## Proof planned

SIM-11 tests: a PvE army chosen by kind, place and level gives the troops of `pve.json`, a troop left out or
lowered changes only that troop; a battle against it gives
the same figures as the same troops entered by hand as a composition; a Vanquish bonus counts only against its race.
