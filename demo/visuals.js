const Visuals = (() => {
  const ROLE_ICONS = {
    'Entry': '<path fill="currentColor" d="M12 2l1.5 6.5 3.3-1.7-1.1 3.6 6.1.4-5.6 2.4 2.7 3.3-4.1-.7.8 6.6-3.6-5.6-2.4 2.3-.4-3.3-5.4 1.5 4-4.1-4.2-2.2 4.7-.7-2.7-5.5 4.9 3.7z"/>',
    'Second Entry': '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    'Support': '<path d="M7.2 7.2 10 10m4 0 2.8-2.8m0 9.6L14 14m-4 0-2.8 2.8"/><circle cx="5" cy="5" r="2.8"/><circle cx="19" cy="5" r="2.8"/><circle cx="5" cy="19" r="2.8"/><circle cx="19" cy="19" r="2.8"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>',
    'Utility Specialist': '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    'Flex': '<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8m0-5v5h-5m5 4a9 9 0 0 1-15.4 6.4L3 16m0 5v-5h5"/>',
    'Anchor': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path fill="currentColor" d="M12 2.6v19c-3.7-2.2-7.5-5-7.5-9.6V5.6z"/>',
    'Roamer': '<circle cx="15" cy="4" r="2.2" fill="currentColor"/><path d="M8 9.5 12 8l3 3 3 1m-6-4-2 6 4 2 1 6m-5-8-3 7"/>',
    'Lurker': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><path d="M12 8v8" stroke-width="3"/>',
    'Trap Specialist': '<path d="M3 21 21 3M6 12l6 6m0-12 6 6m-13.5 4.5 3 3m9-15 3 3"/>',
    'Support Defender': '<path fill="currentColor" d="M3 6.5 17 9l-1.2 5.5L2 12z"/><path d="M17.5 9.5H21l-1 5h-3.6M8 13.5V17H3m0-3v6"/>',
  };

  const ZONE_GLYPHS = {
    Exterior: '<path d="M6 1 9.5 6h-7zM6 4l4.5 5.5h-9zM6 9.5v2"/>',
    Entry: '<path d="M2.5 11.5v-10h7v10M1 11.5h10"/><circle cx="7.3" cy="6.5" r=".6"/>',
    Hallway: '<path d="M1 2.5h10M1 9.5h10M3 6h5M6.5 4.5 8 6 6.5 7.5"/>',
    Stairs: '<path d="M1 11h2.5V8h3V5h3V2H11"/>',
    Rotation: '<path d="M1.5 4h9M8 1.5 10.5 4 8 6.5M10.5 8h-9M4 5.5 1.5 8 4 10.5"/>',
    Power: '<path d="m6 1 1.5 3.2 3.5.4-2.6 2.4.7 3.5L6 8.8l-3.1 1.7.7-3.5L1 4.6l3.5-.4z"/>',
    Site: '<circle cx="5.5" cy="7" r="4" fill="currentColor"/><path d="m8.3 4.2 1.8-1.8M11 1h.01"/>',
  };

  const NOTES = {
    'Meridian Office Tower': 'High-rise office: long corridors, glass partitions, stairwells.',
    'St. Mora Hospital': 'Hospital complex: open reception, long wards, narrow service tunnels.',
    'Ironfield Factory': 'Factory: loading bay, machinery cover, elevated catwalks.',
  };

  const icon = op => `<svg class="icon ${Engine.sideOf(op)}" viewBox="0 0 24 24" aria-hidden="true"><title>${op.role}</title>${ROLE_ICONS[op.role]}</svg>`;

  return { icon, notes: NOTES, ROLE_ICONS, ZONE_GLYPHS };
})();

if (typeof module === 'object') module.exports = Visuals;
