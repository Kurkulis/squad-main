const ASTRA_MAPS = (() => {
  const spaces = { Exterior: 'Open', Entry: 'Narrow', Hallway: 'Narrow', Stairs: 'Narrow', Rotation: 'Connector', Power: 'Open', Site: 'Fortified' };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const room = (label, type, poly) => ({
    label, type, space: spaces[type], poly,
    anchor: [0, 1].map(axis => poly.reduce((sum, p) => sum + p[axis], 0) / poly.length),
  });
  const sides = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
  const sharedDoor = (a, b) => {
    const spans = [];
    for (const [p, q] of sides(a)) {
      const dx = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(dx, dy);
      for (const [r, s] of sides(b)) {
        const off = v => Math.abs(dx * (v[1] - p[1]) - dy * (v[0] - p[0])) / length;
        if (off(r) > 1e-6 || off(s) > 1e-6) continue;
        const along = v => ((v[0] - p[0]) * dx + (v[1] - p[1]) * dy) / length;
        const lo = Math.max(0, Math.min(along(r), along(s)));
        const hi = Math.min(length, Math.max(along(r), along(s)));
        if (hi - lo >= 20) spans.push({ length: hi - lo, point: [p[0] + dx * (lo + hi) / (2 * length), p[1] + dy * (lo + hi) / (2 * length)] });
      }
    }
    if (!spans.length) throw new Error('Connected rooms must share at least 20 units of wall');
    return spans.sort((x, y) => y.length - x.length)[0].point;
  };
  const finish = map => ({ ...map, doors: map.edges.map(([a, b]) => [a, b, sharedDoor(map.zones[a].poly, map.zones[b].poly)]) });
  const box = (label, type, ...coords) => room(label, type, rect(...coords));

  const courtyard = finish({
    size: [800, 560], spawns: ['west-yard', 'east-yard'], site: 'site',
    meta: {
      kind: 'competitive', shape: 'U-shaped courtyard', version: 1,
      description: 'Two deep wings wrap around an inaccessible courtyard. Inner stairs are quicker; outer laboratories offer a third objective approach.',
      focus: 'Coordinate both wings, retain adjacent support, and choose between the inner gallery and an outer flank.',
    },
    zones: {
      'west-yard': box('West yard', 'Exterior', 0, 500, 300, 560),
      'east-yard': box('East yard', 'Exterior', 500, 500, 800, 560),
      'archive': box('Archive', 'Power', 60, 60, 180, 260),
      'control-w': box('West control', 'Rotation', 180, 60, 300, 160),
      'gallery-w': box('West gallery', 'Hallway', 180, 160, 300, 260),
      'site': box('Research vault', 'Site', 300, 60, 500, 160),
      'gallery': box('Cross gallery', 'Hallway', 300, 160, 500, 260),
      'control-e': box('East control', 'Power', 500, 60, 620, 160),
      'gallery-e': box('East gallery', 'Hallway', 500, 160, 620, 260),
      'cleanroom': box('Clean room', 'Power', 620, 60, 740, 260),
      'lab-w': box('Sample lab', 'Hallway', 60, 260, 180, 380),
      'loading-w': box('West loading', 'Entry', 60, 380, 180, 500),
      'stairs-w': box('West stairs', 'Stairs', 180, 260, 300, 500),
      'stairs-e': box('East stairs', 'Stairs', 500, 260, 620, 500),
      'lab-e': box('Optics lab', 'Rotation', 620, 260, 740, 380),
      'loading-e': box('East loading', 'Entry', 620, 380, 740, 500),
    },
    edges: [
      ['west-yard', 'loading-w'], ['west-yard', 'stairs-w'],
      ['east-yard', 'loading-e'], ['east-yard', 'stairs-e'],
      ['loading-w', 'lab-w'], ['loading-w', 'stairs-w'], ['lab-w', 'stairs-w'],
      ['lab-w', 'archive'], ['stairs-w', 'gallery-w'],
      ['archive', 'control-w'], ['archive', 'gallery-w'], ['control-w', 'gallery-w'],
      ['control-w', 'site'], ['gallery-w', 'gallery'],
      ['gallery', 'site'], ['gallery', 'gallery-e'], ['gallery-e', 'control-e'],
      ['control-e', 'site'], ['control-e', 'cleanroom'], ['gallery-e', 'cleanroom'],
      ['gallery-e', 'stairs-e'], ['cleanroom', 'lab-e'], ['lab-e', 'stairs-e'],
      ['lab-e', 'loading-e'], ['loading-e', 'stairs-e'],
    ],
  });

  const diagonal = ([x, y]) => [500 + x - y, 60 + (x + y) * 0.6];
  const diamondRoom = (label, type, ...coords) => room(label, type, rect(...coords).map(diagonal));
  const relay = finish({
    size: [1140, 720], spawns: ['service-road', 'tram-stop', 'canal-walk'], site: 'site',
    meta: {
      kind: 'competitive', shape: 'Diagonal diamond', version: 1,
      description: 'An angled communications complex with three external approaches, a compact core, and crossed internal routes.',
      focus: 'Use the connected laboratory grid to change entry direction without sending every operator through one door.',
    },
    zones: {
      'service-road': diamondRoom('Service road', 'Exterior', -60, 0, 0, 420),
      'tram-stop': diamondRoom('Tram stop', 'Exterior', 0, 420, 560, 480),
      'canal-walk': diamondRoom('Canal walk', 'Exterior', 560, 0, 620, 420),
      'reception': diamondRoom('Reception', 'Entry', 0, 0, 140, 140),
      'archive': diamondRoom('Archive', 'Hallway', 140, 0, 280, 140),
      'uplink': diamondRoom('Uplink gallery', 'Rotation', 280, 0, 420, 140),
      'antenna': diamondRoom('Antenna room', 'Power', 420, 0, 560, 140),
      'stairwell': diamondRoom('Service stairs', 'Stairs', 0, 140, 140, 280),
      'switchboard': diamondRoom('Switch gallery', 'Hallway', 140, 140, 280, 280),
      'site': diamondRoom('Relay core', 'Site', 280, 140, 420, 280),
      'cooling': diamondRoom('Cooling room', 'Hallway', 420, 140, 560, 280),
      'delivery': diamondRoom('Delivery', 'Entry', 0, 280, 140, 420),
      'workshop': diamondRoom('Workshop', 'Hallway', 140, 280, 280, 420),
      'transfer': diamondRoom('Transfer hall', 'Rotation', 280, 280, 420, 420),
      'security': diamondRoom('Security entry', 'Entry', 420, 280, 560, 420),
    },
    edges: [
      ['service-road', 'reception'], ['service-road', 'delivery'],
      ['tram-stop', 'delivery'], ['tram-stop', 'workshop'], ['canal-walk', 'security'],
      ['reception', 'archive'], ['archive', 'uplink'], ['uplink', 'antenna'],
      ['stairwell', 'switchboard'], ['switchboard', 'site'], ['site', 'cooling'],
      ['delivery', 'workshop'], ['workshop', 'transfer'], ['transfer', 'security'],
      ['reception', 'stairwell'], ['stairwell', 'delivery'],
      ['archive', 'switchboard'], ['switchboard', 'workshop'],
      ['uplink', 'site'], ['site', 'transfer'], ['antenna', 'cooling'], ['cooling', 'security'],
    ],
  });

  const terminal = finish({
    size: [900, 600], spawns: ['north-road', 'quay', 'rail-yard'], site: 'site',
    meta: {
      kind: 'competitive', shape: 'L-shaped waterfront', version: 1,
      description: 'A narrow administration wing meets a broad cargo pier at the customs objective. Three entrances create short and long rotation choices.',
      focus: 'Control the elbow of the building without abandoning the quay-side support rooms.',
    },
    zones: {
      'north-road': box('North road', 'Exterior', 60, 0, 360, 60),
      'quay': box('Quay', 'Exterior', 840, 300, 900, 540),
      'rail-yard': box('Rail yard', 'Exterior', 60, 540, 840, 600),
      'ticket': box('Ticket office', 'Entry', 60, 60, 210, 180),
      'lobby': box('Public lobby', 'Entry', 210, 60, 360, 180),
      'records': box('Records', 'Hallway', 60, 180, 210, 300),
      'stairs': box('Admin corridor', 'Hallway', 210, 180, 360, 300),
      'crew': box('Crew room', 'Rotation', 60, 300, 210, 420),
      'site': box('Customs office', 'Site', 210, 300, 360, 420),
      'cargo': box('Cargo lanes', 'Hallway', 360, 300, 600, 420),
      'dock': box('Dock entry', 'Entry', 600, 300, 840, 420),
      'lockers': box('Lockers', 'Hallway', 60, 420, 210, 540),
      'sorting': box('Sorting corridor', 'Hallway', 210, 420, 360, 540),
      'conveyor': box('Conveyor', 'Hallway', 360, 420, 600, 540),
      'freight': box('Freight entry', 'Entry', 600, 420, 840, 540),
    },
    edges: [
      ['north-road', 'ticket'], ['north-road', 'lobby'], ['quay', 'dock'], ['quay', 'freight'],
      ['rail-yard', 'lockers'], ['rail-yard', 'conveyor'],
      ['ticket', 'lobby'], ['ticket', 'records'], ['lobby', 'stairs'], ['records', 'stairs'],
      ['records', 'crew'], ['stairs', 'site'], ['crew', 'lockers'],
      ['site', 'cargo'], ['site', 'sorting'], ['cargo', 'dock'], ['cargo', 'conveyor'],
      ['dock', 'freight'], ['lockers', 'sorting'], ['sorting', 'conveyor'], ['conveyor', 'freight'],
    ],
  });

  const training = finish({
    size: [720, 440], spawns: ['west-start', 'east-start'], site: 'site',
    meta: {
      kind: 'tutorial', shape: 'Compact training house', version: 1,
      description: 'Six clearly named indoor rooms, two starting areas, and three objective doors. A small reusable foundation for future guided lessons.',
      focus: 'Learn room selection, door queues, split routes, recon, breaching, adjacent support, and the objective.',
    },
    zones: {
      'west-start': box('West start', 'Exterior', 0, 40, 60, 400),
      'east-start': box('East start', 'Exterior', 660, 40, 720, 400),
      'support-room': box('Support room', 'Rotation', 60, 40, 260, 220),
      'site': box('Training objective', 'Site', 260, 40, 460, 220),
      'observation': box('Observation room', 'Power', 460, 40, 660, 220),
      'west-entry': box('West entry', 'Entry', 60, 220, 260, 400),
      'practice-hall': box('Practice hall', 'Hallway', 260, 220, 460, 400),
      'east-entry': box('East entry', 'Entry', 460, 220, 660, 400),
    },
    edges: [
      ['west-start', 'west-entry'], ['east-start', 'east-entry'],
      ['west-start', 'support-room'], ['east-start', 'observation'],
      ['west-entry', 'support-room'], ['west-entry', 'practice-hall'],
      ['east-entry', 'observation'], ['east-entry', 'practice-hall'],
      ['support-room', 'site'], ['observation', 'site'], ['practice-hall', 'site'],
    ],
  });

  return {
    'Aster Research Courtyard': courtyard,
    'Helix Relay': relay,
    'Breakwater Terminal': terminal,
    'Astra Training House': training,
  };
})();

if (typeof module === 'object') module.exports = ASTRA_MAPS;
