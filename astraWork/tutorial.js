const AstraTutorial = (() => {
  const lessons = [
    { id: 'orientation', title: '1. Read the floor plan', goal: 'Find both starting areas, the objective, and its three doors.', detail: 'Select a room or door to inspect its connections. Blue routes are plans, not guaranteed movement times.', rooms: ['west-start', 'east-start', 'site'] },
    { id: 'queues', title: '2. Watch a door queue', goal: 'See why five operators cannot enter together.', detail: 'Both groups use the west entry. At most two operators per side cross a normal door each step, and a room holds three per side.', rooms: ['west-entry', 'practice-hall'] },
    { id: 'split', title: '3. Use different approaches', goal: 'Follow one group through each side of the house.', detail: 'Compare the arrival steps and the objective doors. Splitting creates options, but a separated group can also lose a local fight.', rooms: ['support-room', 'observation', 'site'] },
    { id: 'recon', title: '4. Recon and breach', goal: 'Identify a known reinforcement and watch a planned breach open it.', detail: 'A drone observes the support room. A breach charge targets its reinforced objective door. This uses current V4 utility rules; V5 recon commitment is not implemented here.', rooms: ['support-room', 'site'] },
    { id: 'support', title: '5. Adjacent support', goal: 'Inspect the supporters listed in a fight.', detail: 'Defenders in an uncontested adjacent room can support across an open door. A closed reinforced door or another fight can prevent that support.', rooms: ['practice-hall', 'site', 'support-room'] },
    { id: 'objective', title: '6. Finish the objective', goal: 'Read the actual round-ending event and the site-control changes.', detail: 'Current V4 planting depends on site control. Use this layout for the future V5 planting/defusing lesson after those rules are implemented.', rooms: ['site', 'practice-hall', 'observation'] },
  ];
  function options(id, atk, def, seed) {
    if (!lessons.some(lesson => lesson.id === id)) throw new Error('Unknown tutorial lesson');
    const west = ['west-start', 'west-entry', 'support-room', 'site'];
    const east = ['east-start', 'east-entry', 'observation', 'site'];
    const middle = ['west-start', 'west-entry', 'practice-hall', 'site'];
    const groups = [
      { ops: atk.slice(0, 3).map(op => op.id), path: id === 'queues' || id === 'support' ? middle : west },
      { ops: atk.slice(3).map(op => op.id), path: id === 'queues' || id === 'support' ? middle : east },
    ];
    const locations = { Anchor: 'site', Roamer: 'observation', Lurker: 'support-room', 'Trap Specialist': 'practice-hall', 'Support Defender': 'site' };
    const setup = { positions: Object.fromEntries(def.map(op => [op.id, locations[op.role]])), reinforcements: [], traps: {}, cameras: {}, roam: {} };
    const gadgets = {};
    if (id === 'recon') {
      setup.reinforcements = ['site|support-room'];
      gadgets[atk.find(op => op.role === 'Entry').id] = 'site|support-room';
      gadgets[atk.find(op => op.role === 'Support').id] = 'support-room';
      gadgets[atk.find(op => op.role === 'Flex').id] = 'observation';
    }
    return { seed, setup, plan: { groups, gadgets } };
  }
  return { map: 'Astra Training House', lessons, options };
})();

if (typeof module === 'object') module.exports = AstraTutorial;
