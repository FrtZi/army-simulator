# The optimiser and the path (BL-16, BL-31) — spec

[← Overview](../../ARCHITECTURE.md) · Catalogue: SIM-05, SIM-12, CFG-10 · Status: agreed with Frantz on 2026-11-16

## The need (Frantz, 2026-11-16)

Two questions a player asks:

1. **What is my best army with what I have?** My troops owned, my heroes at their levels, my rituals, buildings and
   champion: which composition, which heroes and talents give the most?
2. **What is my best army if I aim at something?** Being "pro Nurgle", or "pro cavalry and chariots": the best army
   of that kind, and **the path** to it: what to pick, which hero to raise, which talents, rituals, buildings, gear.
   Shown, with a short guide.

## A simple model: vectors

Every candidate (a troop, a hero, a talent, a ritual level, a building level, a gear piece) is turned into the same
**vector of figures**, what it adds to an army per unit of what it costs:

| Figure                              | Read from                                                |
| ----------------------------------- | -------------------------------------------------------- |
| damage per strike, effective health | the engine's profile (D-16), each troop with every bonus |
| power                               | the engine (squad power)                                 |
| morale, speed, load, food per hour  | the profile                                              |
| god and troop type (the "aim")      | the troop's tags; a bonus's target                       |

The player's goal is a **vector of weights** on those figures. "Best" is the highest weighted sum, within the
limits: the march capacity, the troops owned, 3 heroes and 4 talents, the champion's points.

- **Angle 1, with my setup:** the weights the player picks among a few presets (all-round, damage, tanking, power;
  or a battle won against a chosen opponent, a composition or a PvE army). The optimiser fills the capacity with
  the troops owned that give the most per place, then tries the owned heroes and their talents (at most 3 and 4:
  few enough to try every combination), and keeps the best.
- **Angle 2, with an aim:** the same, the troops of the aim weighted up (a god, a troop type, several). Then it
  compares with angle 1: what the aim gains or loses now.

## The path

Against an aim, each thing the player does not have yet (a hero, a hero's next level, a ritual level, a building
level, a gear piece or set tier, a champion skill) is a step. Each step gets **its gain** (how much the weighted
sum of the aimed army rises) and **its cost** (resources and items, as the guides already sum them, D-29). The path
is the steps by gain for their cost, the most worth it first, each one's prerequisites placed before it (the ritual
tree, the forge's building). Shown as an ordered list, each step a way to its guide, and a short summary:
"to be pro Nurgle: these 3 heroes, these 6 rituals first, then…".

## What is out

What the site cannot know: drop luck, time to gather, events. The path ranks by gain for cost; it does not plan
days. The figures only count what is modelled: a bonus kept by name and not applied (open question 16) adds nothing.

## Proof planned

SIM-05: with fixed troops owned and capacity, the optimiser's composition scores at least as high as each simple
one (all of one troop, the owned mix as it stands). SIM-12: an aim weights its troops up; the path's first step is
the one with the best gain for its cost on a small worked case.

## Saving the labs' setups, and using one in the battles (CFG-10)

The Champion lab's setups (its two gear sets, its skills' levels) are saved by name in the browser, like the Battle
lab's saves, and one saved setup can be chosen to play in the Battle lab instead of Your setup's champion.

## Settled with Frantz (2026-11-16)

1. **The labs' setups:** the Champion lab's (its gear sets and skills) are saved, and one can be played in the Battle
   lab instead of Your setup's champion (BL-32).
2. **Angle 1's goal:** both, presets on the profile's figures and a battle won against an opponent the player picks.
3. **The aims:** ticked like the picker's filters (gods, troop types, tiers, several values each).
4. **Every buff counts:** the champion's gear and sets, the heroes and their talents, the champion's skill trees: they
   weigh heavily, so the optimiser and the path must take them all.

## The model, agreed with Frantz (2026-11-16)

A search tree pruned at each level (a beam search; in spirit, a very small cousin of AlphaGo's: a tree explored
with a quick guess, each leaf judged exactly). The battle engine is the judge, since every buff already reaches it
as an effect (setup, rituals, buildings, champion gear and sets, heroes and talents, and the champion's skills once
they count in battle); the vectors are only the quick guess that orders the branches, and the words that explain
the result.

The tree decides, most weighty first, keeping the best branches at each level (20, a setting):

1. **The aim**, when one is ticked: the troops it names, the others out (82 troops to a dozen for one god).
2. **The heroes**: every trio of the heroes owned (220 for 12), ordered by the quick guess.
3. **The talents**: the 4 among those the trio offers.
4. **The champion**: its gear and skills as in Your setup or a Champion lab setup chosen (the player's choice).
5. **The troops**: the capacity filled with the troop worth most per place to the engine, then slices moved
   between troops while the score rises.

What decides: for angle 1, the player's current parameters (troops owned, heroes and levels, setup) against the
goal or the opponent; for angle 2, the aim ticked. The path re-runs the same tree with each step added (a hero, a
level, a ritual…), ranked by its real gain for its cost. A few hundred to a few thousand engine runs: one to a few
seconds in the browser.

- _Set aside:_ every combination (billions); a trained model (random or deep forest: it would learn our own engine
  from its own runs, less exactly and without saying why; worth it only for a slow engine, ours answers in under
  25 ms); a linear score alone (bonuses multiply, the battle has thresholds, the talents act on subsets).
