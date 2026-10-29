const DATA = (() => {
  const CAT = typeof CATALOG === 'object' ? CATALOG : require('./catalog.js');
  const STATS = ['sh', 'aw', 'tw', 'ut', 'dc', 'lk'];
  const SITUATIONS = ['Info', 'Breach', 'Utility', 'Reposition', 'Gunfight', 'Objective', 'Clutch'];
  const byStat = values => Object.fromEntries(STATS.map((s, i) => [s, values[i]]));
  const bySituation = values => Object.fromEntries(SITUATIONS.map((t, i) => [t, values[i]]));

  const CONFIG = {
    statCap: 100,
    roundsToWin: 4,
    maxSteps: 11,
    entryUntil: 2,
    cleanupFrom: 10,
    bombSteps: 2,
    clutchGap: 3,
    randomRange: 14,
    intelRandom: 3,
    numbersBonus: 5,
    numbersCap: 2.5,
    doorCapacity: 2,
    zoneCapacity: 3,
    supportFactor: 0.7,
    holdBonus: 2,
    splitPenalty: 3,
    syncHops: 0,
    syncWait: 2,
    roamHold: 1,
    zoneControlBonus: 2,
    momentumBonus: 2,
    clearAt: 11,
    dominantAt: 27,
    zoneShift: [1, 2, 2],
    cleanupFatigue: -3,
    cleanupLuckAbove: 50,
    cleanupLuckBonus: 2,
    generatedSpread: 8,
    reinforceCharges: 2,
    panelCharges: 1,
    siteOpenDoors: 2,
    trapDebuff: 4,
    trapRevealTier: 3,
    smokeBonus: 12,
    rerouteMaxExtra: 3,
    unspentGadgetFactor: 0.5,
    maxGroups: 5,
    maxGroupSize: 3,
    poolSize: 6,
    poolWeights: [3, 3, 2, 2, 1, 1],
  };

  const STAT_LABELS = { sh: 'Shooting', aw: 'Awareness', tw: 'Teamwork', ut: 'Utility Handling', dc: 'Decision Making', lk: 'Luck' };
  const STRENGTHS = ['Marginal', 'Clear', 'Dominant'];

  const PLAYSTYLES = {
    'Aggressive':    byStat([+8, -2, -2,  0, -1, +1]),
    'Calculated':    byStat([-3, +5,  0,  0, +5, -3]),
    'Slow & Steady': byStat([-3, +2,  0,  0, +5,  0]),
    'Opportunistic': byStat([+4,  0, -6,  0, +2, +4]),
    'Team-first':    byStat([-4, -1, +6, +4, -1,  0]),
    'Adaptive':      byStat([+1, +1, +1,  0, +1,  0]),
  };

  const SITUATION_SHARE = bySituation([0.000, 0.051, 0.162, 0.085, 0.218, 0.408, 0.076]);

  const WEIGHTS = {
    Info:       byStat([0.05, 0.40, 0.15, 0.20, 0.15, 0.05]),
    Breach:     byStat([0.30, 0.10, 0.10, 0.20, 0.20, 0.10]),
    Utility:    byStat([0.05, 0.15, 0.10, 0.45, 0.15, 0.10]),
    Reposition: byStat([0.10, 0.30, 0.20, 0.05, 0.25, 0.10]),
    Gunfight:   byStat([0.45, 0.20, 0.10, 0.00, 0.15, 0.10]),
    Objective:  byStat([0.10, 0.20, 0.25, 0.20, 0.20, 0.05]),
    Clutch:     byStat([0.40, 0.15, 0.05, 0.05, 0.15, 0.20]),
  };

  const ROLES = {
    'Entry':              { side: 'ATK', intel: 0.85, mult: bySituation([0.95, 1.20, 0.95, 1.05, 1.15, 0.95, 1.10]) },
    'Second Entry':       { side: 'ATK', intel: 0.90, mult: bySituation([0.95, 1.15, 1.00, 1.05, 1.10, 1.00, 1.10]) },
    'Support':            { side: 'ATK', intel: 1.25, mult: bySituation([1.15, 0.95, 1.10, 1.00, 0.95, 1.15, 0.95]) },
    'Utility Specialist': { side: 'ATK', intel: 1.15, mult: bySituation([1.10, 1.10, 1.20, 1.00, 1.00, 1.15, 0.95]) },
    'Flex':               { side: 'ATK', intel: 1.05, mult: bySituation([1.00, 1.00, 1.00, 1.15, 1.00, 1.10, 1.10]) },
    'Anchor':             { side: 'DEF', intel: 1.00, mult: bySituation([1.00, 1.10, 1.00, 0.90, 1.10, 1.20, 1.10]) },
    'Roamer':             { side: 'DEF', intel: 1.10, mult: bySituation([1.10, 1.00, 0.95, 1.15, 1.15, 0.90, 1.00]) },
    'Lurker':             { side: 'DEF', intel: 1.10, mult: bySituation([1.10, 0.95, 1.00, 1.15, 1.05, 0.95, 1.15]) },
    'Trap Specialist':    { side: 'DEF', intel: 1.05, mult: bySituation([1.00, 1.10, 1.20, 0.95, 1.00, 1.05, 0.95]) },
    'Support Defender':   { side: 'DEF', intel: 1.20, mult: bySituation([1.15, 1.00, 1.15, 0.95, 0.95, 1.15, 0.95]) },
  };

  const GADGETS = {
    'Breaching Charge':    bySituation([0, 8, 0, 0, 0, 4, 0]),
    'Smoke Grenade':       bySituation([0, 4, 4, 2, 2, 6, 2]),
    'Drone':               bySituation([8, 2, 0, 2, 0, 2, 0]),
    'EMP Grenade':         bySituation([2, 6, 8, 0, 0, 4, 0]),
    'Scout Drone':         bySituation([5, 1, 0, 2, 0, 1, 0]),
    'Reinforcement Panel': bySituation([0, 6, 2, 0, 0, 8, 0]),
    'Proximity Alarm':     bySituation([5, 1, 1, 4, 0, 2, 1]),
    'Flank Wire':          bySituation([4, 0, 3, 5, 0, 2, 2]),
    'Barbed Wire':         bySituation([0, 5, 7, 2, 0, 4, 0]),
    'Camera Network':      bySituation([8, 2, 2, 1, 0, 4, 0]),
  };
  const GADGET_USE = {
    'Drone': 'reveal', 'Scout Drone': 'reveal', 'Camera Network': 'camera',
    'Breaching Charge': 'breach', 'Thermite Charge': 'breach', 'EMP Grenade': 'emp',
    'Smoke Grenade': 'smoke', 'Barbed Wire': 'trap', 'Flank Wire': 'trap', 'Proximity Alarm': 'alarm',
    'Reinforcement Panel': 'panel',
  };
  const GADGET_TARGETS = { reveal: ['zone'], emp: ['zone'], breach: ['door'], smoke: ['zone', 'door'], trap: ['door'], alarm: ['door'], camera: ['zone'] };
  const GADGET_TIER_MULT = [1, 1.03, 1.06, 1.09, 1.12, 1.15];
  const WEAPON_TIER_SH = [0, 0, 1, 1, 1, 2];
  const ARMOR_TIER = [0, 0, 0, 1, 1, 1];

  const FIT = { up: 1.10, down: 0.90 };

  const ZONES = {
    Exterior: { space: 'Open',      situation: 'Gunfight',   up: ['Roamer', 'Lurker'],                         down: ['Anchor', 'Trap Specialist'] },
    Entry:    { space: 'Narrow',    situation: 'Breach',     up: ['Entry', 'Second Entry', 'Trap Specialist'], down: ['Support Defender', 'Anchor'] },
    Hallway:  { space: 'Narrow',    situation: 'Gunfight',   up: ['Entry', 'Second Entry', 'Trap Specialist'], down: ['Support Defender', 'Anchor'] },
    Stairs:   { space: 'Narrow',    situation: 'Gunfight',   up: [],                                           down: [] },
    Rotation: { space: 'Connector', situation: 'Reposition', up: ['Roamer', 'Lurker', 'Flex'],                 down: ['Anchor', 'Utility Specialist'] },
    Power:    { space: 'Open',      situation: 'Gunfight',   up: ['Support', 'Utility Specialist'],            down: ['Entry'] },
    Site:     { space: 'Fortified', situation: 'Objective',  up: ['Anchor', 'Support Defender'],               down: ['Roamer', 'Lurker'] },
  };

  const SPACES = {
    Narrow:    { up: ['Flashbang', 'Barbed Wire', 'Freeze Trap', 'Deployable Shield'], down: ['Smoke Grenade', 'Cover Smoke Launcher'] },
    Open:      { up: ['Smoke Grenade', 'Drone', 'Intel Beacon', 'Recon Pulse'],        down: ['Flashbang', 'Laser Trip Mine'] },
    Fortified: { up: ['Thermite Charge', 'EMP Grenade', 'Breaching Charge'],           down: ['Motion Sensor', 'Decoy Device'] },
    Connector: { up: ['Proximity Alarm', 'Flank Wire', 'Ambush Grenade'],              down: ['Reinforcement Panel'] },
  };

  const WEAPONS = {
    SMG:     { Entry: 6, Hallway: 6, Stairs: 6, Exterior: -6, Power: -6 },
    Shotgun: { Entry: 6, Hallway: 6, Stairs: 6, Exterior: -6, Power: -6 },
    AR:      { Entry: 4, Hallway: 4, Rotation: 4, Site: 4 },
    DMR:     { Exterior: 6, Power: 6, Site: 6, Hallway: -6, Stairs: -6 },
    Pistol:  { any: 2 },
  };

  const ARMOR = {
    Light:  { Reposition: 4, Objective: -2 },
    Medium: { any: 2 },
    Heavy:  { Gunfight: 4, Objective: 4, Breach: -3, Reposition: -3 },
  };

  const CASUALTIES = {
    Breach:     [0, 1, 1],
    Utility:    [0, 0, 1],
    Reposition: [0, 0, 1],
    Gunfight:   [1, 1, 2],
    Objective:  [0, 1, 1],
    Clutch:     [1, 1, 2],
  };

  const INTEL_WEIGHTS = {
    ATK: { aw: 0.35, ut: 0.25, tw: 0.20, dc: 0.10, lk: 0.10 },
    DEF: { aw: 0.30, ut: 0.30, tw: 0.15, dc: 0.15, lk: 0.10 },
  };
  const INTEL_BUCKETS = [
    { min: 0,  win: { aw: 1, dc: 1 },               lose: {},                 reveal: [] },
    { min: 3,  win: { aw: 2, dc: 2, sh: 1 },        lose: { aw: -1 },         reveal: ['reinforcements'] },
    { min: 6,  win: { aw: 3, dc: 3, sh: 2, tw: 1 }, lose: { aw: -2, dc: -1 }, reveal: ['reinforcements', 'traps'] },
    { min: 10, win: { aw: 4, dc: 4, sh: 3, tw: 2 }, lose: { aw: -3, dc: -2 }, reveal: ['reinforcements', 'traps', 'positions'] },
  ];

  const ATK_TEMPLATES = {
    A: { name: 'One lane', groups: [3, 2], lanes: 1 },
    B: { name: 'Split', groups: [3, 2], lanes: 2 },
    C: { name: 'Flank', groups: [2, 2, 1], lanes: 3 },
  };
  const DEF_TEMPLATES = {
    S: { name: 'Stack site', spread: ['Roamer', 'Lurker'], roam: [], traps: 'entries' },
    P: { name: 'Spread', spread: ['Roamer', 'Lurker', 'Trap Specialist'], roam: [], traps: 'chokes' },
    R: { name: 'Roam', spread: ['Roamer', 'Lurker', 'Trap Specialist'], roam: ['Roamer', 'Lurker'], traps: 'chokes' },
  };

  const ACTIVES = {
    'Flash entry':     { role: 'Entry',              situations: ['Breach'],                 stats: { sh: 6 } },
    'Trade push':      { role: 'Second Entry',       situations: ['Gunfight'],               stats: { sh: 4, dc: 2 } },
    'Full recon':      { role: 'Support',            situations: ['Info'],                   add: 6 },
    'Overload':        { role: 'Utility Specialist', situations: ['Utility'],                stats: { ut: 6 } },
    'Read the room':   { role: 'Flex',               situations: SITUATIONS,                 stats: { dc: 4, aw: 2 } },
    'Reinforce':       { role: 'Anchor',             situations: ['Objective'], zone: 'Site', stats: { ut: 4, dc: 2 } },
    'Flank run':       { role: 'Roamer',             situations: ['Reposition', 'Gunfight'], stats: { sh: 4, aw: 2 } },
    'Ambush':          { role: 'Lurker',             situations: ['Clutch', 'Reposition'],   stats: { sh: 6 } },
    'Wire the hall':   { role: 'Trap Specialist',    situations: ['Utility', 'Breach'],      stats: { ut: 6 } },
    'Eyes everywhere': { role: 'Support Defender',   situations: ['Info'],                   add: 6 },
  };
  const activeOf = role => Object.keys(ACTIVES).find(k => ACTIVES[k].role === role);
  const activeOn = (a, ctx) => a.situations.includes(ctx.situation) && (!a.zone || a.zone === ctx.zone);

  const item = cls => ({ class: cls, tier: 1 });
  const weaponItem = id => ({ id, class: CAT.weapon(id).class, tier: 1 });
  const ROSTER = [
    { name: 'Breach',   role: 'Entry',              stats: byStat([78, 52, 45, 48, 55, 60]), gadget: 'Breaching Charge',    primary: 'smg-vector', armor: 'Light',  playstyle: 'Aggressive', trait: 'Cold Blooded' },
    { name: 'Haze',     role: 'Second Entry',       stats: byStat([72, 50, 48, 45, 62, 55]), gadget: 'Smoke Grenade',       primary: 'ar-ak',      armor: 'Medium', playstyle: 'Aggressive', trait: 'Tunnel Vision' },
    { name: 'Watcher',  role: 'Support',            stats: byStat([45, 72, 75, 68, 62, 48]), gadget: 'Drone',               primary: 'ar-aug',     armor: 'Medium', playstyle: 'Team-first', trait: 'Shot Caller' },
    { name: 'Volt',     role: 'Utility Specialist', stats: byStat([50, 65, 55, 80, 70, 45]), gadget: 'EMP Grenade',         primary: 'ar-m4',      armor: 'Light',  playstyle: 'Calculated', trait: 'Drone Expert' },
    { name: 'Mirage',   role: 'Flex',               stats: byStat([62, 60, 58, 55, 62, 58]), gadget: 'Scout Drone',         primary: 'ar-m4',      armor: 'Medium', playstyle: 'Adaptive', trait: 'Unstable' },
    { name: 'Fortress', role: 'Anchor',             stats: byStat([70, 58, 52, 55, 72, 50]), gadget: 'Reinforcement Panel', primary: 'dmr-sr25',   armor: 'Heavy',  playstyle: 'Slow & Steady', trait: 'Veteran' },
    { name: 'Jackal',   role: 'Roamer',             stats: byStat([75, 68, 40, 42, 55, 58]), gadget: 'Proximity Alarm',     primary: 'smg-vector', armor: 'Light',  playstyle: 'Aggressive', trait: 'Aggressive' },
    { name: 'Shade',    role: 'Lurker',             stats: byStat([65, 72, 42, 48, 66, 52]), gadget: 'Flank Wire',          primary: 'smg-mp5',    armor: 'Light',  playstyle: 'Opportunistic', trait: 'Cold Blooded' },
    { name: 'Wire',     role: 'Trap Specialist',    stats: byStat([48, 58, 52, 78, 68, 45]), gadget: 'Barbed Wire',         primary: 'sg-spas',    armor: 'Medium', playstyle: 'Slow & Steady', trait: 'Fortifier' },
    { name: 'Lens',     role: 'Support Defender',   stats: byStat([42, 70, 75, 70, 62, 48]), gadget: 'Camera Network',      primary: 'ar-aug',     armor: 'Medium', playstyle: 'Team-first', trait: 'Shot Caller' },
  ].map((op, i) => ({
    id: `r${String(i + 1).padStart(2, '0')}`, ...op,
    gadget: item(op.gadget), primary: weaponItem(op.primary), secondary: weaponItem('pistol-m9'), armor: item(op.armor), active: activeOf(op.role), portrait: CAT.portraitFor(op.role),
  }));

  const CALLSIGNS = [
    'Viper', 'Talon', 'Nova', 'Spectre', 'Bishop', 'Kestrel', 'Onyx', 'Ember', 'Raven', 'Cipher',
    'Atlas', 'Wraith', 'Sable', 'Havoc', 'Quill', 'Rogue', 'Saber', 'Tundra', 'Vandal', 'Zephyr',
    'Cobalt', 'Drift', 'Fang', 'Hex', 'Lynx', 'Pike', 'Rune', 'Slate', 'Torch', 'Vex',
  ];

  const fit = (lists, key) => (lists.up.includes(key) ? FIT.up : lists.down.includes(key) ? FIT.down : 1);
  const lookup = (table, key) => table[key] ?? table.any ?? 0;
  const cleanupMods = op => {
    const lucky = op.stats.lk > CONFIG.cleanupLuckAbove ? CONFIG.cleanupLuckBonus : 0;
    return Object.fromEntries(STATS.map(s => [s, CONFIG.cleanupFatigue + (s === 'sh' || s === 'dc' ? lucky : 0)]));
  };

  const weaponStats = (w, base = {}) => {
    const out = { ...base };
    for (const [s, v] of Object.entries(CAT.weapon(w.id)?.mods ?? {})) out[s] = (out[s] ?? 0) + v;
    return Object.keys(out).length ? out : undefined;
  };

  const gadgetValue = (gadget, situation) => GADGETS[gadget.class][situation] * GADGET_TIER_MULT[gadget.tier - 1];

  const allStats = n => byStat(STATS.map(() => n));
  const TRAITS = {
    'Cold Blooded':  (op, ctx) => (ctx.situation === 'Clutch' ? { stats: { sh: 3, dc: 2 } } : null),
    'Tunnel Vision': () => ({ stats: { sh: 3, aw: -3 } }),
    'Shot Caller':   () => ({ team: { tw: 2 } }),
    'Breacher':      (op, ctx) => (ctx.situation === 'Breach' ? { stats: { ut: 3, sh: 2 } } : null),
    'Aggressive':    (op, ctx) => (ctx.phase === 'Entry' ? { stats: { sh: 4 }, risk: 1.5 } : null),
    'Unstable':      (op, ctx) => (ctx.rand ? { stats: allStats(Math.floor(ctx.rand() * 13) - 6) } : null),
    'Veteran':       (op, ctx) => (ctx.step >= CONFIG.cleanupFrom ? { stats: allStats(3) } : null),
    'Drone Expert':  (op, ctx) => (ctx.situation === 'Info' ? { add: 4 } : null),
    'Fortifier':     (op, ctx) => (ctx.side === 'DEF' && (ctx.situation === 'Objective' || ctx.situation === 'Utility') ? { stats: { ut: 3 } } : null),
  };

  const ARCHETYPES = {
    'Balanced':      { shift: {}, roles: {}, ai: { groups: [2, 4], site: [2, 3], roam: 0.5, drones: 0.5 } },
    'Rush':          { shift: { sh: 8, aw: -2, tw: -4, dc: -2 }, playstyle: 'Aggressive', primary: 'SMG',        armor: 'Light', ai: { groups: [2, 2], site: [2, 2], roam: 0.8, drones: 0.3 },
                       roles: { 'Utility Specialist': { primary: 'AR' }, 'Anchor': { primary: 'Shotgun',    armor: 'Medium' }, 'Support Defender': { primary: 'AR',         armor: 'Medium' } } },
    'Tactical':      { shift: { aw: 6, dc: 6, sh: -8, ut: -4 }, playstyle: 'Calculated', primary: 'AR',         armor: 'Heavy', ai: { groups: [2, 3], site: [3, 3], roam: 0.2, drones: 0.9 },
                       roles: { 'Entry': { primary: 'SMG',        armor: 'Medium' }, 'Anchor': { primary: 'DMR' }, 'Roamer': { armor: 'Medium' }, 'Lurker': { primary: 'DMR',        armor: 'Medium' } } },
    'Utility-heavy': { shift: { ut: 8, tw: 4, sh: -8, aw: -4 }, playstyle: 'Team-first', primary: 'AR',         armor: 'Medium', ai: { groups: [3, 4], site: [2, 3], roam: 0.4, drones: 0.6 },
                       roles: { 'Entry': { playstyle: 'Aggressive', primary: 'SMG' }, 'Trap Specialist': { playstyle: 'Slow & Steady', primary: 'Shotgun' } } },
  };

  const CONTRIBUTORS = [
    { name: 'playstyle', apply: op => ({ stats: PLAYSTYLES[op.playstyle] }) },
    { name: 'intel',     apply: (op, ctx) => (ctx.intel?.[ctx.side] ? { stats: ctx.intel[ctx.side] } : null) },
    { name: 'fatigue',   apply: (op, ctx) => (ctx.step >= CONFIG.cleanupFrom ? { stats: cleanupMods(op) } : null) },
    { name: 'role',      apply: (op, ctx) => ({ mult: ctx.phase === 'Intel' ? ROLES[op.role].intel : ROLES[op.role].mult[ctx.situation] }) },
    { name: 'zoneFit',   apply: (op, ctx) => (ctx.zone ? { mult: fit(ZONES[ctx.zone], op.role) } : null) },
    { name: 'gadget',    apply: (op, ctx) => ({ add: gadgetValue(op.gadget, ctx.situation) * (ctx.zone ? fit(SPACES[ctx.space], op.gadget.class) : 1) * (ctx.gadgetUse?.[op.id] ?? 1) }) },
    { name: 'primary',   apply: (op, ctx) => ({ stats: weaponStats(op.primary, { sh: WEAPON_TIER_SH[op.primary.tier - 1] }), add: ctx.zone ? lookup(WEAPONS[op.primary.class], ctx.zone) : undefined }) },
    { name: 'secondary', apply: (op, ctx) => ({ stats: weaponStats(op.secondary), add: ctx.zone ? lookup(WEAPONS[op.secondary.class], ctx.zone) : undefined }) },
    { name: 'armor',     apply: (op, ctx) => ({ stats: { aw: ARMOR_TIER[op.armor.tier - 1], dc: ARMOR_TIER[op.armor.tier - 1] }, add: ctx.zone ? lookup(ARMOR[op.armor.class], ctx.situation) : undefined }) },
    { name: 'trait',     apply: (op, ctx) => (op.trait ? TRAITS[op.trait](op, ctx) : null) },
    { name: 'active',    apply: (op, ctx) => ((ctx.armed ?? []).includes(op.id) && activeOn(ACTIVES[op.active], ctx) ? { stats: ACTIVES[op.active].stats, add: ACTIVES[op.active].add } : null) },
    { name: 'trap',      apply: (op, ctx) => (ctx.trapped?.includes(op.id) ? { stats: allStats(-CONFIG.trapDebuff) } : null) },
    { name: 'team',      apply: (op, ctx) => (ctx.team ? { stats: ctx.team } : null) },
  ];

  return {
    STATS, SITUATIONS, CONFIG, STAT_LABELS, STRENGTHS, PLAYSTYLES, WEIGHTS, SITUATION_SHARE, ROLES, GADGETS, GADGET_USE, GADGET_TARGETS, GADGET_TIER_MULT, WEAPON_TIER_SH, ARMOR_TIER,
    FIT, ZONES, SPACES, WEAPONS, ARMOR, CASUALTIES, INTEL_WEIGHTS, INTEL_BUCKETS, ATK_TEMPLATES, DEF_TEMPLATES, ROSTER, CALLSIGNS, TRAITS, ACTIVES, ARCHETYPES, CONTRIBUTORS,
    WEAPON_CATALOG: CAT.WEAPON_CATALOG, ROLE_CLASSES: CAT.ROLE_CLASSES, weaponStats,
  };
})();

if (typeof module === 'object') module.exports = DATA;
