# Guide: filling in your setup — the text to show, agreed 2026-11-09

[← The spec](setup.md) · [The dictionary](setup-dictionary.md)

Shown in Your setup › Import and export › The file. Items marked _(to confirm)_ need checking against the
game's screens.

## 1. What your setup is for

Your setup is what you have in the game: your warlords and their levels, your march capacity, your bonuses,
and later your rituals, buildings, champion and gear. You enter it once and update it when you progress.
In the Battle lab, "Load your setup" builds compositions from it; turn it off to try anything.

Your changes, typed or uploaded, show at once in Your setup, marked as unsaved; **Save** keeps them,
**Discard changes** goes back to the last save. The Battle lab always uses your saved setup, and leaving
the page with unsaved changes asks first.

It stays in this browser. Nothing is sent anywhere. To use it on another device, download it and upload it
there.

## 2. Three ways to fill it

| Way           | Best for                              | Time       |
| ------------- | ------------------------------------- | ---------- |
| By hand       | a few warlords, a quick update        | minutes    |
| From a file   | a setup saved earlier, another device | seconds    |
| With an agent | everything at once, from screenshots  | one prompt |

You can mix them: upload a file, then correct a value by hand. Every value stays editable, wherever it
came from, and the summary says where the last change came from.

## 3. By hand

Open a section, enter what the game shows, and the summary updates at once.

- **Warlords:** add each warlord you own, then pick its rank (1 to 7) and its level within the rank
  (1 to 5), as shown on its card in the game _(to confirm: where the rank and level appear)_. The power
  shown beside them is the site's, so you can check it against the game's.
- **Capacity and bonuses:** your march capacity (base and bonus %) and one row per bonus, as you enter them
  in the lab today. They will shrink as the rituals, buildings and champion get their own sections.
- **Rituals, buildings, champion and gear:** shown as "coming" until their version (1.2 and 1.3).

## 4. From a file

**Upload a file** reads a setup file (JSON). It can hold your whole setup or only part of it:

- a section the file doesn't hold is left unchanged;
- in a list (warlords, rituals, buildings), each entry is matched by its id: a new id is added, a known id
  is updated, and an entry you have that the file doesn't list is kept;
- a file never removes anything: remove a warlord by hand.

Before anything changes, you see what the file brings, section by section (added, updated, kept,
unchanged), and every value refused, with where it is in the file, what was read and why. Apply the
changes (they show in Your setup, unsaved) or cancel, then Save. A refused value never stops the rest.

Values are refused when:

- an id is unknown (a misspelt name): the nearest id is suggested;
- a number is out of range (rank 8, a negative level);
- a value has the wrong type (text where a number is expected);
- the file isn't a setup file, or is for another game.

**Download your setup** saves the whole of it as a file, ready to upload elsewhere or to keep.

## 5. With an agent reading your screenshots

An AI agent (one that reads images) can read your game's screens and write the file for you.

1. Take screenshots of these screens (the brief says how to read each):
   - each rituals category's tree, one screenshot per branch (a ritual bright and ticked is at its top level);
   - your buildings' levels;
   - your champion's screen, and each piece's forge (its rarity is its level, Core to Eternal);
   - your warlords' cards _(to confirm: the screen)_.

   - the Chaos Keep (Donjon du Chaos), Army tab: the troops and defences you own, each with its number.

   Not the Chaos Keep's Combat tab: its totals mix every source (they would count twice).

2. Copy the brief (button below) and give it to the agent with your screenshots.
3. Upload the file it gives back. Check the refused values and correct them by hand.

The agent has what it needs in the brief, which holds the whole data dictionary: what each field means,
its type and range, every id with the names the game shows in English and French, where to find it on
screen, and examples that turn the game's wording into the file's values. It shouldn't guess: what it can't read, it leaves out, and your
setup keeps its current value.

Before sharing screenshots with an agent, crop out what you don't want to share (player names, chat,
alliance).

## 6. The file

- **Empty template:** every section with empty values, to fill by hand in a text editor.
- **Your setup, filled:** what you have today, in the same format.
- **Dictionary:** every field, its values, its label in English and French, and where to find it in the
  game. Also published beside the page as `chaos-conquest/setup.schema.json` (for tools) and
  `chaos-conquest/setup-dictionary.json`.

## 7. Questions

- _Does the site send my setup anywhere?_ No. It stays in this browser until you download it.
- _I cleared my browser._ Your setup is gone with it: upload the file you downloaded.
- _The power shown differs from the game's._ Check the rank and level; if they're right, the site may be
  missing a bonus: tell us (link to the issues page).

---

## The brief for an agent (copied by the button)

```text
You are filling in a setup file for Army Simulator (Warhammer: Chaos & Conquest), from the screenshots I
give you.

Write one JSON file following the data dictionary below. For each field it gives what it means, its type
and range, the ids allowed with the names shown in the game in English and French, the screen where it
appears, and examples turning the game's wording into the file's values.

Rules:
- Start with "format": "army-simulator/setup", "version": 1, "game": "chaos-conquest".
- Use only the ids listed in the dictionary. Match the names on screen to them through the English or
  French labels.
- Write only what you can read clearly. If a value is unreadable or not shown, leave the entry out: do not
  guess, and do not write zero.
- Include only the sections my screenshots show; the others stay as they are in my setup.
- Ignore anything else on the screens (player names, chat, alliance).
- A bonus on screen that matches no stat or filter of the dictionary: leave it out and list it.
- Give back the JSON file only, then a short list of what you left out and why.

<the data dictionary, pasted whole, generated from the game's data>
```
