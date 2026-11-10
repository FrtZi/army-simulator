// The page's icons, drawn as small inline SVGs (no game art: D-06). Each is decorative: the text next to it, or
// its button's accessible name, says what it means.

const svg = (body, { fill = "none", size = 16 } = {}) =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="${fill}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  close: svg('<path d="M4 4l8 8M12 4l-8 8"/>', { size: 14 }),
  sun: svg(
    '<circle cx="8" cy="8" r="3"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3"/>',
  ),
  // a rarity's mark, as the game's forge shows its levels (GUIDE-05)
  diamond: svg('<path d="M8 1.5 14.5 8 8 14.5 1.5 8Z"/>', { fill: "currentColor", size: 12 }),
  moon: svg('<path d="M14 9.8A6.2 6.2 0 1 1 6.2 2a5 5 0 0 0 7.8 7.8Z" fill="currentColor" stroke="none"/>'),
};

// one pictogram per troop type: what the troop is, at a glance
const TYPE_ICONS = {
  infantry: '<path d="M8 1.5v9M5.5 8.5h5M8 10.5v2.5M6.5 14.5h3"/>',
  "monstrous-infantry": '<path d="M5 2.5v8M3 8.5h4M11 2.5v8M9 8.5h4M5 10.5v3M11 10.5v3"/>',
  "war-beasts":
    '<circle cx="8" cy="10" r="2.6"/><circle cx="4" cy="6" r="1.3"/><circle cx="8" cy="4" r="1.3"/><circle cx="12" cy="6" r="1.3"/>',
  "monstrous-beasts": '<path d="M3 13c1-4 1-7 0-10M7 13c1-4 1-7 0-10M11 13c1-4 1-7 0-10"/>',
  monsters: '<path d="M2 11l6-8 6 8M5 7.5l3 2 3-2M8 9.5v4"/>',
  cavalry: '<path d="M4 14v-4l2-4 3-3 1 2 3 1-1 2-3-.5L8 14"/>',
  "monstrous-cavalry": '<path d="M4 14v-4l2-4 3-3 1 2 3 1-1 2-3-.5L8 14"/><path d="M11.5 1.5l1 1"/>',
  chariots: '<circle cx="8" cy="9" r="4.5"/><path d="M8 4.5v9M3.5 9h9M5 6l6 6M11 6l-6 6"/>',
  defences: '<path d="M3 14V5h2v2h2V5h2v2h2V5h2v9Z"/>',
  hero: '<path d="M2 12.5 3 5l3 3 2-5 2 5 3-3 1 7.5Z"/><path d="M3 14.5h10"/>', // a crown: a warlord
};

// one pictogram per slot of the champion's gear, in the game's order (GUIDE-09)
const SLOT_ICONS = {
  head: '<path d="M3 10a5 5 0 0 1 10 0v3H3Z"/><path d="M6 10v3M10 10v3"/>',
  chest: '<path d="M3 3l3-1 2 2 2-2 3 1-1 5 1 6H3l1-6Z"/>',
  gloves: '<path d="M5 14V6l1-3 1 3V3l1 3V2.5l1 3.5V4l1 3v3l-2 4Z"/>',
  weapon: '<path d="M3 13 11 5M9 3l4 4-2 2-4-4Z"/>',
  boots: '<path d="M5 2h4v8l4 2v2H4Z"/>',
  relic: '<path d="M8 2v3"/><circle cx="8" cy="9.5" r="4"/><path d="M8 7.5v4M6 9.5h4"/>',
};

/** The pictogram of a slot of the champion's gear; decorative, its name is written beside it. */
export const slotIcon = (slot) =>
  `<span class="slot-icon" aria-hidden="true">${svg(SLOT_ICONS[slot] ?? SLOT_ICONS.relic)}</span>`;

/** The icon of a troop's type, in its god's colour (CSS class god-<alignment>). */
export const troopIcon = (unit) =>
  `<span class="troop-icon god-${unit.alignment}">${svg(TYPE_ICONS[unit.unitType] ?? TYPE_ICONS.infantry, { size: 20 })}</span>`;
