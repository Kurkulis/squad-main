const assert = require('node:assert');
const DATA = require('./data.js');
const Engine = require('./engine.js');
const MAPS2 = require('./maps.js');
const C = DATA.CONFIG;

Engine.setRandom(Engine.mulberry32(12345));

const mvpDraftBaseSituationScores = {
  Breach:   [51.50, 61.60, 51.90, 54.20, 67.20, 52.80, 66.75],
  Haze:     [51.05, 60.20, 50.80, 54.70, 64.95, 53.10, 64.10],
  Watcher:  [68.55, 58.90, 67.15, 65.25, 54.70, 67.55, 53.45],
  Volt:     [67.95, 61.80, 69.80, 63.65, 56.10, 65.55, 55.70],
  Mirage:   [59.75, 60.30, 58.20, 60.70, 61.70, 59.75, 61.10],
  Fortress: [60.20, 62.70, 58.85, 62.10, 63.90, 60.60, 62.70],
  Jackal:   [55.70, 60.40, 50.75, 57.20, 68.35, 53.15, 67.00],
  Shade:    [60.25, 60.30, 55.25, 60.70, 64.85, 56.30, 64.00],
  Wire:     [62.85, 59.40, 67.00, 59.55, 52.90, 61.95, 53.45],
  Lens:     [68.00, 58.20, 67.60, 64.45, 52.95, 67.25, 52.05],
};
for (const op of DATA.ROSTER) {
  DATA.SITUATIONS.forEach((t, i) => {
    const got = Engine.situationScore(Engine.effectiveStats({ ...op, trait: null, primary: { ...op.primary, id: undefined }, secondary: { ...op.secondary, id: undefined } }), t);
    assert.ok(Math.abs(got - mvpDraftBaseSituationScores[op.name][i]) < 0.006, `${op.name} ${t}: ${got}`);
  });
}

const weaponMods = w => DATA.WEAPON_CATALOG.find(x => x.id === w.id)?.mods;
const classes = ['SMG', 'AR', 'DMR', 'Shotgun', 'Pistol'];
assert.deepEqual(classes.map(c => DATA.WEAPON_CATALOG.filter(w => w.class === c).length), [3, 3, 3, 3, 2], 'catalog: 3 weapons per class, 2 pistols');
assert.equal(new Set(DATA.WEAPON_CATALOG.map(w => w.id)).size, DATA.WEAPON_CATALOG.length, 'catalog: unique ids');
for (const w of DATA.WEAPON_CATALOG) {
  const v = DATA.STATS.map(s => w.mods[s]);
  const net = v.reduce((a, b) => a + b, 0);
  assert.ok(Object.keys(w.mods).length === DATA.STATS.length && v.every(x => Number.isInteger(x) && Math.abs(x) <= 4) && (net === 0 || net === 1), `${w.id}: mods within -4..+4, net 0 or +1`);
  if (w.class !== 'Pistol') assert.ok(v.some(x => x > 0) && v.some(x => x < 0), `${w.id}: a trade-off`);
}
assert.deepEqual(Object.keys(DATA.ROLE_CLASSES).sort(), Object.keys(DATA.ROLES).sort(), 'every role has weapon classes');
for (const op of DATA.ROSTER) assert.ok(weaponMods(op.primary) && DATA.ROLE_CLASSES[op.role].includes(op.primary.class) && weaponMods(op.secondary)?.dc === 1, `${op.name}: default weapon allowed by role`);
for (const op of Engine.generateSquad(58, 'Rush')) assert.equal(DATA.WEAPON_CATALOG.find(w => w.id === op.primary.id)?.class, op.primary.class, `${op.name}: generated weapon of its class`);
const shareSum = Object.values(DATA.SITUATION_SHARE).reduce((a, b) => a + b, 0);
assert.ok(DATA.SITUATIONS.every(t => DATA.SITUATION_SHARE[t] >= 0) && Math.abs(shareSum - 1) < 0.005, `SITUATION_SHARE sums to ${shareSum}`);


const other = side => (side === 'ATK' ? 'DEF' : 'ATK');
const close = (a, b) => Math.abs(a - b) < 1e-9;
const allStats = n => Object.fromEntries(DATA.STATS.map(s => [s, n]));
const fatigue = op => Object.fromEntries(DATA.STATS.map(s => [s, C.cleanupFatigue + (op.stats.lk > C.cleanupLuckAbove && (s === 'sh' || s === 'dc') ? C.cleanupLuckBonus : 0)]));
const fitOf = (lists, key) => (lists.up.includes(key) ? DATA.FIT.up : lists.down.includes(key) ? DATA.FIT.down : 1);
const traitOf = (op, ctx) => (op.trait ? DATA.TRAITS[op.trait](op, ctx) : null);
const activeOf = (r, side, op, situation, zoneType) => {
  const a = r.armed[side].includes(op.id) ? DATA.ACTIVES[op.active] : null;
  return a && a.situations.includes(situation) && (!a.zone || a.zone === zoneType) ? a : null;
};
function addStats(list) {
  const out = {};
  for (const t of list) for (const k in t) out[k] = (out[k] ?? 0) + t[k];
  return Object.keys(out).length ? out : null;
}
const adjOf = m => {
  const adj = Object.fromEntries(Object.keys(m.zones).map(z => [z, []]));
  for (const [a, b] of m.edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
};
const door = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const doorsOn = path => path.slice(1).map((z, i) => door(path[i], z));
const sumOf = (list, f) => list.reduce((a, x) => a + f(x), 0);
const v4 = { doorMax: 0, zoneMax: 0, crossings: 0, trap: { drone: [0, 0], blind: [0, 0] }, reinforced: [0, 0], rounds: 0 };

function checkRound(r) {
  const m = MAPS2[r.map];
  const adj = adjOf(m);
  const zones = Object.keys(m.zones);
  const [planning, ...steps] = r.log;
  const { setup, plan, intel } = planning;
  const gadgets = plan.gadgets ?? {};
  const ops = Object.fromEntries([...r.ops.ATK, ...r.ops.DEF].map(op => [op.id, op]));
  const useOf = id => DATA.GADGET_USE[ops[id].gadget.class];
  v4.rounds++;
  assert.deepEqual([planning.step, planning.phase, planning.fights, planning.kills, planning.events, planning.waiting, planning.doors, planning.spotted], [0, 'Planning', [], [], [], [], {}, {}], 'planning entry');
  assert.ok(Engine.validateSetup(r.map, r.ops.DEF, setup) && Engine.validatePlan(r.map, r.ops.ATK, plan), 'setup and plan are valid');
  assert.deepEqual([r.setup, r.plan], [setup, plan], 'round keeps its setup and plan');
  assert.ok(['ATK', 'DEF'].every(side => Array.isArray(r.armed[side]) && new Set(r.armed[side]).size === r.armed[side].length && r.armed[side].every(id => r.ops[side].some(op => op.id === id && op.active))), 'armed operators play on their side');
  const bucket = DATA.INTEL_BUCKETS.filter(b => Math.abs(intel.diff) >= b.min).pop();
  const learned = intel.winner === 'ATK' ? bucket.reveal : [];
  assert.equal(intel.winner, intel.diff > 0 ? 'ATK' : 'DEF', 'intel winner');
  assert.ok(intel.buff === bucket.win && intel.debuff === bucket.lose, 'intel bucket');
  assert.deepEqual(intel.learned, learned, 'intel reveal');
  const bucketRevealed = Engine.reveal(r.map, setup, learned, {}, [], r.ops.DEF);
  assert.ok(!(r.templates.DEF && r.pools.DEF) && !(r.templates.ATK && r.pools.ATK), 'a side is a template or a pool pick');
  if (r.templates.DEF) assert.deepEqual(setup, Engine.defaultSetup(r.map, r.ops.DEF, r.templates.DEF), 'DEF template setup');
  if (r.templates.ATK) assert.deepEqual(plan, Engine.defaultPlan(r.map, r.ops.ATK, r.templates.ATK, bucketRevealed), 'ATK template plan');
  const fromPool = (key, side) => {
    const [a, i] = key.split('#');
    return Engine.pool(r.map, r.ops[side], side, a)[+i];
  };
  if (r.pools.DEF) assert.deepEqual(setup, fromPool(r.pools.DEF, 'DEF'), 'DEF setup from the pool');
  if (r.pools.ATK) assert.deepEqual(plan, Engine.adaptPlan(r.map, r.ops.ATK, fromPool(r.pools.ATK, 'ATK'), bucketRevealed), 'ATK plan from the pool, adapted to intel');
  const exact = new Set();
  const seen = new Set();
  for (const [id, z] of Object.entries(gadgets)) if (useOf(id) === 'reveal') {
    exact.add(z);
    for (const x of [z, ...adj[z]]) seen.add(x);
  }
  const touches = (d, set) => d.split('|').some(z => set.has(z));
  const droned = (id, d) => touches(d, exact) || (ops[id].gadget.tier < C.trapRevealTier && touches(d, seen));
  const revealed = {
    reinforcements: setup.reinforcements.filter(d => learned.includes('reinforcements') || touches(d, seen)),
    traps: Object.entries(setup.traps).filter(([id, d]) => learned.includes('traps') || droned(id, d)).map(([, d]) => d),
    positions: Object.fromEntries(Object.entries(setup.positions).filter(([, z]) => learned.includes('positions') || seen.has(z))),
  };
  assert.deepEqual(planning.revealed, revealed, 'revealed to ATK');
  const canceled = Object.entries(gadgets).filter(([id, t]) => useOf(id) === 'breach' && setup.reinforcements.includes(t)).map(([, t]) => t);
  assert.deepEqual(planning.canceled, canceled, 'planned hard breaches open reinforced doors');
  const reinforced = new Set(setup.reinforcements.filter(d => !canceled.includes(d)));
  const opened = new Set(canceled);
  const placed = use => Object.entries(gadgets).filter(([id]) => useOf(id) === use).map(([, t]) => t);
  const smokeZones = new Set(placed('smoke').filter(t => !t.includes('|')));
  const smokeDoors = new Set(placed('smoke').filter(t => t.includes('|')));
  const emp = new Set(placed('emp'));
  const traps = new Map(Object.entries(setup.traps).map(([id, d]) => [d, { kind: useOf(id) === 'trap' ? 'wire' : 'alarm', revealed: revealed.traps.includes(d), droned: droned(id, d) }]));
  const cameras = new Set(Object.values(setup.cameras));
  const known = new Set(revealed.reinforcements.filter(d => reinforced.has(d)));
  const gadgetUse = Object.fromEntries(r.ops.ATK.map(op => [op.id, op.id in gadgets ? 0 : C.unspentGadgetFactor]));
  const control = Object.fromEntries(zones.map(z => [z, m.spawns.includes(z) ? 1 : -1]));
  const groups = plan.groups.map(g => ({ ops: g.ops, path: [...g.path], at: 0, utility: false, trapped: false, waited: 0 }));
  const groupOf = Object.fromEntries(groups.flatMap((g, i) => g.ops.map(id => [id, i])));
  const hazard = groupOps => {
    const closed = new Set(revealed.reinforcements);
    const trapped = new Set(revealed.traps);
    const spotted = Object.values(revealed.positions);
    const canBreach = groupOps.some(id => useOf(id) === 'breach');
    const canDisarm = groupOps.some(id => ops[id].role === 'Utility Specialist');
    return p => p.length + sumOf(doorsOn(p), d => (closed.has(d) ? (canBreach ? 1 : 6) : 0) + (trapped.has(d) && !canDisarm ? 1 : 0)) + sumOf(p.slice(1, -1), z => spotted.filter(x => x === z).length / 2);
  };
  const replanned = {};
  groups.forEach((g, i) => {
    const hit = doorsOn(g.path).filter(d => known.has(d));
    if (!hit.length || (hit.length === 1 && g.ops.some(id => useOf(id) === 'breach' && gadgetUse[id] > 0))) return;
    const cost = hazard(g.ops);
    g.path = [...(Engine.paths(m, g.path[0], m.site, 40).filter(p => !doorsOn(p).some(d => known.has(d))).sort((x, y) => cost(x) - cost(y))[0] ?? Engine.route(m, g.path[0], m.site, null, [...known]))];
    replanned[i] = [...g.path];
  });
  assert.deepEqual(planning.replanned, replanned, 'groups replan around revealed reinforcements');
  const onPlan = [...new Set(plan.groups.flatMap(g => doorsOn(g.path)))].filter(d => reinforced.has(d));
  const changed = new Set(onPlan.filter(d => Object.keys(replanned).some(i => doorsOn(plan.groups[i].path).includes(d))));
  const idx = Object.fromEntries(r.ops.ATK.map(op => [op.id, 0]));
  const since = Object.fromEntries(Object.keys(ops).map(id => [id, 0]));
  const via = Object.fromEntries(Object.keys(ops).map(id => [id, null]));
  const pos = { ...setup.positions };
  const roam = new Set(Object.keys(setup.roam).filter(id => setup.roam[id]));
  const seenAt = {};
  const fronts = {};
  const dead = new Set();
  const live = side => r.ops[side].filter(op => !dead.has(op.id));
  const liveIds = g => g.ops.filter(id => !dead.has(id));
  const lead = g => {
    const l = liveIds(g);
    if (l.length) g.at = Math.max(...l.map(id => idx[id]));
    return g.at;
  };
  const zoneOfOp = id => groups[groupOf[id]].path[idx[id]];
  const atkAt = z => live('ATK').filter(op => zoneOfOp(op.id) === z);
  const defAt = z => live('DEF').filter(op => pos[op.id] === z);
  const room = z => (m.spawns.includes(z) ? Infinity : C.zoneCapacity - atkAt(z).length);
  const snapshot = () => ({
    groups: Object.fromEntries(groups.map((g, i) => [i, g.path[lead(g)]])),
    attackers: Object.fromEntries(r.ops.ATK.map(op => [op.id, zoneOfOp(op.id)])),
    defenders: Object.fromEntries(r.ops.DEF.map(op => [op.id, pos[op.id]])),
    control: { ...control },
  });
  const queuedNow = () => Object.fromEntries(groups.map((g, i) => [i, liveIds(g).filter(id => idx[id] < lead(g))]));
  assert.deepEqual({ groups: planning.groups, attackers: planning.attackers, defenders: planning.defenders, control: planning.control, queued: planning.queued }, { ...snapshot(), queued: queuedNow() }, 'planning state');
  const tally = Object.fromEntries(Object.keys(ops).map(id => [id, { kills: 0, fights: 0, scoreSum: 0, diedAt: null }]));
  let planted = false, plantedAt = null, momentum = null, result = null;
  const take = (z, events) => {
    if (z !== m.site) events.push({ type: 'taken', zone: z });
    else if (!planted) {
      planted = true;
      plantedAt = step;
      control[z] = 0;
      events.push({ type: 'planted', zone: z });
    }
  };
  let step = 0;
  for (const [si, s] of steps.entries()) {
    step = si + 1;
    assert.ok(!result && s.step === step, 'steps run until the round is decided');
    const phase = planted ? 'Post-plant' : step >= C.cleanupFrom ? 'Cleanup' : step <= C.entryUntil ? 'Entry' : 'Main';
    assert.equal(s.phase, phase, `step ${step} phase`);
    const events = [];
    const doorLog = {};
    const used = { ATK: {}, DEF: {} };
    const slow = new Set();
    const spotted = new Set();
    const entryOf = d => (doorLog[d] ??= { crossed: [], queued: [], blocked: [], trap: null, breached: null });
    const cap = (side, d) => (opened.has(d) || (side === 'ATK' && slow.has(d)) ? 1 : C.doorCapacity) - (used[side][d] ?? 0);
    const crossing = (gi, ids, from, to) => {
      const g = groups[gi];
      const d = door(from, to);
      const entry = entryOf(d);
      let n = Math.max(0, Math.min(cap('ATK', d), room(to), ids.length));
      const trap = n ? traps.get(d) : null;
      if (trap && trap.kind === 'wire') v4.trap[trap.droned ? 'drone' : 'blind'][0]++;
      if (trap && !trap.revealed) {
        traps.delete(d);
        entry.trap = trap.kind === 'wire' ? 'sprung' : 'alarm';
        if (trap.kind === 'wire') {
          v4.trap[trap.droned ? 'drone' : 'blind'][1]++;
          g.trapped = true;
          slow.add(d);
          n = 1;
        }
        events.push({ type: trap.kind === 'wire' ? 'trap' : 'alarm', group: gi, door: d, zone: to }, { type: 'reveal', group: gi, zone: to });
        spotted.add(gi);
      } else if (trap) {
        if (liveIds(g).some(id => ops[id].role === 'Utility Specialist') || d.split('|').some(z => emp.has(z))) {
          traps.delete(d);
          entry.trap = 'disarmed';
          events.push({ type: 'disarm', group: gi, door: d });
        } else {
          entry.trap = 'careful';
          slow.add(d);
          n = 1;
        }
      }
      for (const id of ids.slice(0, n)) {
        idx[id]++;
        via[id] = from;
        since[id] = step;
      }
      used.ATK[d] = (used.ATK[d] ?? 0) + n;
      entry.crossed.push(...ids.slice(0, n));
      entry.queued.push(...ids.slice(n));
      return n;
    };
    const advance = gi => {
      const g = groups[gi];
      const F = g.at;
      const from = g.path[F];
      const to = g.path[F + 1];
      const d = door(from, to);
      const ids = liveIds(g).filter(id => idx[id] === F);
      if (reinforced.has(d)) {
        const entry = entryOf(d);
        const breacher = ids.find(id => useOf(id) === 'breach' && gadgetUse[id] > 0);
        if (!breacher) {
          entry.blocked.push(gi);
          known.add(d);
          if (onPlan.includes(d)) changed.add(d);
          const coming = liveIds(g).find(id => useOf(id) === 'breach' && gadgetUse[id] > 0);
          events.push({ type: 'blocked', group: gi, door: d, zone: from, ...(coming ? { waitFor: coming } : {}) });
          if (coming) return;
          const detour = Engine.route(m, from, m.site, null, [...known]);
          assert.ok(detour && !doorsOn(detour).some(x => known.has(x)), 'a blocked group finds a way around every reinforcement it knows');
          g.path = [...g.path.slice(0, F), ...detour];
          events.push({ type: 'reroute', group: gi, from: to, to: from, path: [...g.path], door: d });
          return;
        }
        reinforced.delete(d);
        opened.add(d);
        known.delete(d);
        gadgetUse[breacher] = 0;
        entry.breached = breacher;
        events.push({ type: 'breach', group: gi, op: breacher, door: d });
      }
      if (crossing(gi, ids, from, to)) g.at = F + 1;
    };
    for (const g of groups) lead(g);
    const hopsLeft = g => g.path.length - 1 - g.at;
    const stuck = g => !hopsLeft(g) || control[g.path[g.at]] < 1 || defAt(g.path[g.at]).length > 0;
    const behind = groups.map(g => (liveIds(g).length && hopsLeft(g) ? hopsLeft(g) - 1 + (stuck(g) ? 1 : 0) : 0));
    const waiting = [];
    groups.forEach((g, gi) => {
      if (!liveIds(g).length) return;
      const F = g.at;
      const trailing = liveIds(g).filter(id => idx[id] < F).sort((a, b) => idx[b] - idx[a]);
      if (!stuck(g)) {
        if (hopsLeft(g) === 1 && !planted && g.waited < C.syncWait && behind.some((n, j) => j !== gi && n > C.syncHops && groups[j].path[groups[j].path.length - 2] !== g.path[g.path.length - 2])) {
          waiting.push(gi);
          g.waited++;
        } else advance(gi);
      }
      for (const id of trailing) {
        const k = idx[id];
        if (!defAt(g.path[k]).length) crossing(gi, [id], g.path[k], g.path[k + 1]);
      }
    });
    assert.deepEqual(s.waiting, waiting, `step ${step} groups holding for the others`);
    const contested = new Set(zones.filter(z => atkAt(z).length && defAt(z).length));
    const supporting = new Set();
    const fightZones = [];
    for (const z of zones) {
      if (!atkAt(z).length || !defAt(z).length) continue;
      const f = s.fights[fightZones.length];
      fightZones.push(z);
      assert.equal(f?.zone, z, `step ${step} contested zones`);
      const zoneType = m.zones[z].type;
      const fighters = { ATK: atkAt(z), DEF: defAt(z) };
      assert.ok(fighters.ATK.length <= C.zoneCapacity && fighters.DEF.length <= C.zoneCapacity, 'room capacity');
      const here = [...new Set(fighters.ATK.map(op => groupOf[op.id]))].sort((a, b) => a - b);
      const situation = planted && z === m.site ? 'Objective'
        : Math.abs(live('ATK').length - live('DEF').length) >= C.clutchGap ? 'Clutch'
        : step >= C.cleanupFrom ? 'Gunfight'
        : control[z] === 1 ? 'Gunfight'
        : here.some(gi => groups[gi].path[1] === z) ? 'Breach'
        : zoneType === 'Site' ? 'Objective'
        : here.some(gi => !groups[gi].utility) ? 'Utility' : DATA.ZONES[zoneType].situation;
      if (situation === 'Utility') for (const gi of here) groups[gi].utility = true;
      const supportOk = (op, at) => adj[z].includes(at) && !contested.has(at) && !reinforced.has(door(at, z)) && !supporting.has(op.id);
      const supporters = { ATK: live('ATK').filter(op => supportOk(op, zoneOfOp(op.id))), DEF: live('DEF').filter(op => supportOk(op, pos[op.id])) };
      for (const side of ['ATK', 'DEF']) for (const op of supporters[side]) supporting.add(op.id);
      assert.deepEqual(f.supporters, { ATK: supporters.ATK.map(op => op.id), DEF: supporters.DEF.map(op => op.id) }, `step ${step} ${z} supporters`);
      const sinceOf = side => Math.min(...fighters[side].map(op => since[op.id]));
      const occupant = sinceOf('ATK') < sinceOf('DEF') ? 'ATK' : sinceOf('DEF') < sinceOf('ATK') ? 'DEF' : null;
      let entry = { occupant, doors: [], value: 0 };
      if (occupant) {
        const side = other(occupant);
        const byDoor = new Map();
        const add = (op, from, weight) => {
          const e = byDoor.get(from) ?? { from, door: door(from, z), ops: [], weight: 0 };
          e.ops.push(op.id);
          e.weight += weight;
          byDoor.set(from, e);
        };
        for (const op of fighters[side]) add(op, via[op.id] ?? z, 1);
        for (const op of supporters[side]) add(op, side === 'ATK' ? zoneOfOp(op.id) : pos[op.id], C.supportFactor);
        const first = (fronts[z] ??= {});
        for (const from of byDoor.keys()) first[from] ??= step;
        const list = [...byDoor.values()];
        const firsts = list.map(e => first[e.from]);
        const earliest = Math.min(...firsts);
        const latest = Math.max(...firsts);
        const doors = list.map(e => {
          const smoke = side === 'ATK' && smokeDoors.has(e.door);
          const base = list.length === 1 ? C.holdBonus : list.length >= 3 ? -C.splitPenalty : first[e.from] === earliest && earliest < latest ? C.holdBonus : -C.splitPenalty;
          return { ...e, groups: side === 'ATK' ? [...new Set(e.ops.map(id => groupOf[id]))].sort((a, b) => a - b) : [], first: first[e.from], smoke, value: smoke ? Math.min(0, base) : base };
        });
        entry = { occupant, doors, value: sumOf(doors, e => e.value * e.weight) / sumOf(doors, e => e.weight) };
      }
      assert.deepEqual(f.entrySides, entry, `step ${step} ${z} entry sides`);
      const trappedGroups = here.filter(gi => groups[gi].trapped);
      const trappedOps = trappedGroups.flatMap(gi => groups[gi].ops);
      const modifiers = { reinforced: adj[z].some(n => reinforced.has(door(n, z))), trapped: trappedGroups, smoke: smokeZones.has(z), revealed: Object.values(revealed.positions).includes(z) };
      assert.deepEqual([f.step, f.phase, f.zoneType, f.groups, f.situation, f.modifiers, f.statusBefore], [step, phase, zoneType, here, situation, modifiers, control[z]], `step ${step} ${z} fight`);
      const pressure = situation === 'Breach' || situation === 'Objective';
      const planningBonus = pressure && modifiers.smoke ? C.smokeBonus : 0;
      for (const side of ['ATK', 'DEF']) {
        const t = f[side];
        const intelMods = side === intel.winner ? intel.buff : intel.debuff;
        const ctx = { side, situation, phase, step };
        const team = addStats(live(side).map(op => traitOf(op, ctx)?.team));
        assert.deepEqual([t.scores.map(x => x.id), t.support.map(x => x.id)], [fighters[side].map(op => op.id), supporters[side].map(op => op.id)], `step ${step} ${z} ${side} fighters and supporters`);
        for (const x of [...t.scores, ...t.support]) {
          const op = ops[x.id];
          const p = x.parts;
          const trait = op.trait === 'Unstable' ? { stats: p.stats.trait } : traitOf(op, ctx);
          if (op.trait === 'Unstable') assert.ok(DATA.STATS.every(k => p.stats.trait[k] === p.stats.trait.sh) && Number.isInteger(p.stats.trait.sh) && Math.abs(p.stats.trait.sh) <= 6, `${op.name} unstable roll`);
          const armorTier = DATA.ARMOR_TIER[op.armor.tier - 1];
          const active = activeOf(r, side, op, situation, zoneType);
          const statParts = Object.fromEntries(Object.entries({
            playstyle: DATA.PLAYSTYLES[op.playstyle], intel: intelMods, fatigue: step >= C.cleanupFrom ? fatigue(op) : undefined,
            primary: addStats([{ sh: DATA.WEAPON_TIER_SH[op.primary.tier - 1] }, weaponMods(op.primary)]), secondary: weaponMods(op.secondary), armor: { aw: armorTier, dc: armorTier }, trait: trait?.stats, active: active?.stats,
            trap: side === 'ATK' && trappedOps.includes(op.id) ? allStats(-C.trapDebuff) : undefined, team,
          }).filter(([, v]) => v));
          const es = Object.fromEntries(DATA.STATS.map(k => [k, Math.min(C.statCap, Math.max(0, Object.values(statParts).reduce((a, mod) => a + (mod[k] ?? 0), op.stats[k])))]));
          const gadget = DATA.GADGETS[op.gadget.class][situation] * DATA.GADGET_TIER_MULT[op.gadget.tier - 1] * fitOf(DATA.SPACES[DATA.ZONES[zoneType].space], op.gadget.class) * (side === 'ATK' ? gadgetUse[op.id] : 1);
          assert.equal(x.name, op.name, `${op.name} name`);
          assert.deepEqual(p.stats, statParts, `${op.name} stat parts`);
          assert.deepEqual([p.risk, p.add.trait], [trait?.risk === undefined ? {} : { trait: trait.risk }, trait?.add], `${op.name} trait risk and add`);
          assert.equal(p.add.active, active?.add, `${op.name} active add`);
          assert.ok(close(p.add.gadget, gadget), `${op.name} gadget tier, space and planning use`);
          assert.ok(close(p.base, Engine.situationScore(es, situation)) && p.mult.role === DATA.ROLES[op.role].mult[situation] && p.mult.zoneFit === fitOf(DATA.ZONES[zoneType], op.role), `${op.name} base, role and zone fit`);
          assert.ok(close(x.score, Object.values(p.mult).reduce((a, k) => a * k, p.base) + Object.values(p.add).reduce((a, v) => a + v, 0)), `${op.name} score from parts`);
        }
        for (const x of t.scores) {
          tally[x.id].fights++;
          tally[x.id].scoreSum += x.score;
        }
        const weight = n => n.scores.length + C.supportFactor * n.support.length;
        assert.ok(close(t.avg * weight(t), sumOf(t.scores, x => x.score) + C.supportFactor * sumOf(t.support, x => x.score)), 'avg with supporters at the support factor');
        const gap = fighters[side].length + C.supportFactor * supporters[side].length - (fighters[other(side)].length + C.supportFactor * supporters[other(side)].length);
        assert.ok(close(t.numbers, C.numbersBonus * Math.max(-C.numbersCap, Math.min(C.numbersCap, gap))), 'local numbers with supporters, capped');
        assert.deepEqual([t.crowd, t.pinch], [0, 0], 'crowding and pinch are retired');
        assert.equal(t.hold, entry.occupant === side ? entry.value : 0, 'hold and split for the occupant');
        assert.equal(t.zone, C.zoneControlBonus * Math.max(-1, control[z]) * (side === 'ATK' ? 1 : -1), 'zone control');
        assert.equal(t.momentum, momentum === side ? C.momentumBonus : 0, 'momentum');
        assert.equal(t.planning, side === 'ATK' ? planningBonus : 0, 'smoke');
        assert.ok(Math.abs(t.random) <= C.randomRange, 'random');
        assert.ok(close(t.total, t.avg + t.numbers + t.hold + t.zone + t.momentum + t.planning + t.random), 'total');
      }
      for (const gi of trappedGroups) groups[gi].trapped = false;
      for (const gi of here) spotted.add(gi);
      const winner = f.diff > 0 ? 'ATK' : 'DEF';
      const loser = other(winner);
      const strength = Math.abs(f.diff) >= C.dominantAt ? 2 : Math.abs(f.diff) >= C.clearAt ? 1 : 0;
      assert.ok(close(f.diff, f.ATK.total - f.DEF.total) && f.winner === winner && f.strength === DATA.STRENGTHS[strength], 'fight result');
      const lost = { ATK: 0, DEF: 0 };
      let supportKills = 0;
      for (const k of f.kills) {
        const pool = k.supporter ? supporters[k.side] : fighters[k.side];
        assert.ok(pool.some(op => op.id === k.victimId && op.name === k.victim) && fighters[other(k.side)].some(op => op.id === k.killerId && op.name === k.killer) && k.zone === z, 'kills between local fighters, or a supporter');
        assert.ok(!dead.has(k.victimId), `${k.victim} died twice`);
        if (k.supporter) supportKills++;
        dead.add(k.victimId);
        tally[k.killerId].kills++;
        tally[k.victimId].diedAt = step;
        lost[k.side]++;
      }
      assert.ok(supportKills <= (strength === 2 ? 1 : 0), 'at most one supporter dies, only in a Dominant fight');
      assert.deepEqual([lost[loser], lost[winner]], [Math.min(DATA.CASUALTIES[situation][strength], fighters[loser].length + (strength === 2 && supporters[loser].length ? 1 : 0)), 0], 'casualties');
      const before = control[z];
      control[z] = Math.max(-1, Math.min(1, before + C.zoneShift[strength] * (winner === 'ATK' ? 1 : -1)));
      const mark = events.length;
      if (winner === 'ATK' && before < 1 && control[z] === 1) take(z, events);
      if (winner === 'DEF' && strength > 0 && before < 1 && !(planted && z === m.site)) {
        for (const gi of here) {
          const g = groups[gi];
          if (!liveIds(g).length || g.path[lead(g)] !== z || g.at === 0) continue;
          const k = g.at;
          const back = g.path[k - 1];
          const detour = Engine.route(m, back, m.site, z, [...known]);
          if (!detour || detour.length - (g.path.length - 1 - k) > C.rerouteMaxExtra) continue;
          const ids = liveIds(g).filter(id => idx[id] === k);
          const d = door(back, z);
          if (ids.length > Math.min(cap('ATK', d), room(back))) continue;
          assert.ok(!detour.includes(z) && detour[detour.length - 1] === m.site, 'detour avoids the lost zone');
          for (const id of ids) {
            idx[id] = k - 1;
            via[id] = z;
            since[id] = step;
          }
          used.ATK[d] = (used.ATK[d] ?? 0) + ids.length;
          entryOf(d).crossed.push(...ids);
          g.path = [...g.path.slice(0, k - 1), ...detour];
          g.at = k - 1;
          events.push({ type: 'reroute', group: gi, from: z, to: back, path: [...g.path] });
        }
      }
      assert.deepEqual([f.status, f.event], [control[z], events.slice(mark).find(e => e.type === 'taken' || e.type === 'planted')?.type ?? null], `step ${step} ${z} control`);
    }
    assert.equal(s.fights.length, fightZones.length, `step ${step} fight count`);
    for (const z of zones) {
      if (fightZones.includes(z)) continue;
      const atkHere = atkAt(z).length > 0;
      const defHere = defAt(z).length > 0;
      if (atkHere && !defHere && control[z] < 1) {
        control[z] = Math.min(1, control[z] + C.zoneShift[1]);
        if (control[z] === 1) take(z, events);
      } else if (!atkHere && defHere && planted && z === m.site) {
        control[z] = Math.max(-1, control[z] - C.zoneShift[1]);
      }
    }
    for (const cam of cameras) {
      const view = [cam, ...adj[cam]];
      groups.forEach((g, gi) => {
        if (liveIds(g).some(id => view.includes(zoneOfOp(id)))) spotted.add(gi);
      });
    }
    const spottedList = [...spotted].filter(gi => liveIds(groups[gi]).length).sort((a, b) => a - b);
    for (const gi of spottedList) seenAt[gi] = groups[gi].path[lead(groups[gi])];
    const fought = new Set(fightZones);
    const free = op => !fought.has(pos[op.id]);
    for (const f of s.fights) {
      if (f.winner !== 'ATK' || f.strength !== 'Dominant') continue;
      const holder = live('DEF').filter(op => free(op) && !roam.has(op.id) && pos[op.id] !== m.site)
        .sort((a, b) => Engine.dist(r.map, pos[a.id], f.zone) - Engine.dist(r.map, pos[b.id], f.zone))[0];
      if (holder) roam.add(holder.id);
    }
    const targets = planted ? [m.site] : [...new Set(groups.map((g, gi) => (liveIds(g).length ? seenAt[gi] : undefined)).filter(z => z !== undefined))];
    for (const op of live('DEF')) {
      if (!free(op) || !(planted || roam.has(op.id))) continue;
      const from = pos[op.id];
      const target = targets.map(z => [z, Engine.route(r.map, from, z, null, [...reinforced])]).filter(([, p]) => p).sort((a, b) => a[1].length - b[1].length)[0];
      if (!target || target[1].length === 1) continue;
      if (!planted && target[1].length === 2 && atkAt(target[0]).length > C.roamHold) continue;
      const to = target[1][1];
      if (m.spawns.includes(to)) continue;
      const d = door(from, to);
      assert.ok(adj[from].includes(to) && !reinforced.has(d), 'a rotation is one step through an open door');
      if (cap('DEF', d) < 1 || defAt(to).length >= C.zoneCapacity) {
        entryOf(d).queued.push(op.id);
        continue;
      }
      pos[op.id] = to;
      via[op.id] = from;
      since[op.id] = step;
      used.DEF[d] = (used.DEF[d] ?? 0) + 1;
      entryOf(d).crossed.push(op.id);
      events.push({ type: 'rotate', op: op.id, from, to });
    }
    for (const z of Object.keys(fronts)) if (!fought.has(z)) delete fronts[z];
    const wins = side => s.fights.filter(f => f.winner === side).length;
    momentum = wins('ATK') > wins('DEF') ? 'ATK' : wins('DEF') > wins('ATK') ? 'DEF' : null;
    assert.deepEqual({ groups: s.groups, attackers: s.attackers, defenders: s.defenders, control: s.control }, snapshot(), `step ${step} state`);
    assert.deepEqual(s.doors, doorLog, `step ${step} doors`);
    assert.deepEqual(s.queued, queuedNow(), `step ${step} queues`);
    assert.deepEqual(s.spotted, Object.fromEntries(spottedList.map(gi => [gi, seenAt[gi]])), `step ${step} groups DEF has spotted`);
    assert.deepEqual(s.kills, s.fights.flatMap(f => f.kills), 'step kills');
    for (const [d, e] of Object.entries(doorLog)) for (const side of ['ATK', 'DEF']) {
      const n = e.crossed.filter(id => r.ops[side].some(op => op.id === id)).length;
      v4.doorMax = Math.max(v4.doorMax, n);
      v4.crossings += n;
      assert.ok(n <= C.doorCapacity, `step ${step}: ${n} ${side} operators through ${d}`);
    }
    for (const z of zones.filter(x => !m.spawns.includes(x))) for (const side of ['ATK', 'DEF']) {
      const n = (side === 'ATK' ? atkAt(z) : defAt(z)).length;
      v4.zoneMax = Math.max(v4.zoneMax, n);
      assert.ok(n <= C.zoneCapacity, `step ${step}: ${n} ${side} operators in ${z}`);
    }
    result = !live('ATK').length ? { winner: 'DEF', reason: 'Elimination' }
      : !live('DEF').length ? { winner: 'ATK', reason: 'Elimination' }
      : planted && control[m.site] === -1 ? { winner: 'DEF', reason: 'Defused', event: 'defused' }
      : planted && step - plantedAt >= C.bombSteps ? { winner: 'ATK', reason: 'Detonation', event: 'detonated' }
      : !planted && step >= C.maxSteps ? { winner: 'DEF', reason: 'Time out', event: 'timeout' }
      : null;
    if (result?.event) events.push({ type: result.event });
    assert.deepEqual(s.events, events, `step ${step} events`);
  }
  assert.deepEqual(r.result, { winner: result.winner, reason: result.reason }, 'round result');
  assert.equal(r.step, steps.length);
  for (const op of [...r.ops.ATK, ...r.ops.DEF]) {
    const t = tally[op.id];
    assert.ok(op.alive === (t.diedAt === null) && op.diedAt === t.diedAt && op.kills === t.kills && op.fights === t.fights && close(op.scoreSum, t.scoreSum), `${op.name} bookkeeping`);
  }
  v4.reinforced[0] += onPlan.length;
  v4.reinforced[1] += changed.size;
}

const player = Engine.cloneSquad(DATA.ROSTER);
const mapNames = Object.keys(MAPS2);
const lastRound = 2 * C.roundsToWin - 1;
let tiebreaks = 0;
for (let i = 0; i < 300; i++) {
  const match = Engine.newMatch(Engine.cloneSquad(player), Engine.generateSquad(40 + (i % 40)), mapNames[i % mapNames.length]);
  const own = match.enemy[0].archetype;
  while (!match.over) {
    const shown = Engine.nextPlayerSide(match);
    const r = Engine.playMatchRound(match, { enemyArmed: null });
    const n = match.rounds.length;
    const enemySide = other(r.playerSide);
    assert.equal(r.map, match.map, 'round map');
    assert.ok(own === 'Balanced' || r.pools[enemySide].startsWith(`${own}#`), 'the opponent plays from its archetype pool');
    assert.ok(r.pools[r.playerSide], 'a player without a plan gets an AI pick');
    assert.equal(r.playerSide, shown, 'the side shown before a round is the side played');
    assert.equal(r.playerSide, n < lastRound ? (n % 2 ? 'ATK' : 'DEF') : match.tiebreakSide, 'side order');
    if (n === lastRound) tiebreaks++;
    checkRound(r);
  }
  assert.equal(Math.max(match.score.player, match.score.enemy), C.roundsToWin);
  assert.ok(match.rounds.length >= C.roundsToWin && match.rounds.length <= lastRound);
}
assert.ok(tiebreaks > 0, 'tiebreak rounds were played');
assert.throws(() => Engine.newMatch(player, player, 'Crosspoint Mall'), /unknown map/, 'v1 maps are retired');

const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
const total = list => list.reduce((a, b) => a + b, 0);
function report(label, t) {
  const reasons = Object.entries(t.reasons);
  for (const table of [t.maps, t.plans]) {
    const rows = Object.values(table);
    assert.deepEqual([total(rows.map(v => v.rounds)), total(rows.map(v => v.atkWins)), total(rows.map(v => v.steps))], [t.rounds, t.atkWins, t.steps], 'map and plan tallies');
  }
  assert.equal(total(reasons.map(([, v]) => v)), t.rounds, 'one ending per round');
  assert.equal(total(reasons.filter(([k]) => k.startsWith('ATK')).map(([, v]) => v)), t.atkWins, 'ATK endings');
  assert.ok(t.roundsWon >= C.roundsToWin * t.won && t.rounds - t.roundsWon >= C.roundsToWin * (t.matches - t.won), 'match winners took roundsToWin rounds');
  assert.ok(t.firstBloodWon <= t.firstBlood && t.firstBlood <= t.rounds, 'first kill tallies');
  console.log(`\n${label}: ${t.matches} matches, ${t.rounds} rounds`);
  console.log(`  your match win ${pct(t.won, t.matches)} | your round win ${pct(t.roundsWon, t.rounds)} | ATK round win ${pct(t.atkWins, t.rounds)} | avg steps ${(t.steps / t.rounds).toFixed(2)} | first kill -> round win ${pct(t.firstBloodWon, t.firstBlood)}`);
  console.log('  ' + reasons.sort().map(([k, v]) => `${k} ${pct(v, t.rounds)}`).join(' | '));
  return t;
}

const mirror = report('Mirror (MVP roster both sides, AI plan pools)', Engine.simulate({ player, matches: 2000, mirror: true }));
console.log('  per map: ' + Object.entries(mirror.maps).sort().map(([k, v]) => `${k} ATK ${pct(v.atkWins, v.rounds)}, ${(v.steps / v.rounds).toFixed(2)} steps, time out ${pct(v.timeouts, v.rounds)}`).join(' | '));
const roundWinRates = Object.fromEntries([44, 52, 58, 64, 72].map(q => {
  const t = report(`vs random quality ${q}`, Engine.simulate({ player, matches: 1000, quality: q }));
  return [q, t.roundsWon / t.rounds];
}));
if (process.argv.includes('--routes')) {
  const byPool = {};
  for (const [k, v] of Object.entries(mirror.plans)) {
    const [map, pair] = k.split(' · ');
    const atkKey = `${map} · ATK ${pair.slice(1, pair.indexOf(')')).split('#')[0]}`;
    const row = (byPool[atkKey] ??= { rounds: 0, atkWins: 0, steps: 0, timeouts: 0 });
    for (const f of ['rounds', 'atkWins', 'steps', 'timeouts']) row[f] += v[f];
  }
  console.log('\nMirror ATK round win by map and ATK pool archetype:');
  for (const [k, v] of Object.entries(byPool).sort()) console.log(`  ${k}: ${pct(v.atkWins, v.rounds)} of ${v.rounds}, ${(v.steps / v.rounds).toFixed(2)} steps, time out ${pct(v.timeouts, v.rounds)}`);
}
const pinned = Engine.simulate({ player, matches: 20, mirror: true, map: mapNames[2], atkTemplate: 'C', defTemplate: 'P' });
assert.deepEqual(Object.keys(pinned.plans), [`${mapNames[2]} · CP`], 'simulate pins the templates and the map');

const atkOps = player.filter(op => Engine.sideOf(op) === 'ATK');
const defOps = player.filter(op => Engine.sideOf(op) === 'DEF');
const ATK_T = Object.keys(DATA.ATK_TEMPLATES);
const DEF_T = Object.keys(DATA.DEF_TEMPLATES);
const cellRounds = 400;
const matrix = {};
Engine.setRandom(Engine.mulberry32(2026));
for (const map of mapNames) {
  for (const a of ATK_T) for (const d of DEF_T) {
    let wins = 0;
    for (let i = 0; i < cellRounds; i++) if (Engine.playRound(atkOps, defOps, map, { atkTemplate: a, defTemplate: d }).result.winner === 'ATK') wins++;
    matrix[`${map}|${a}|${d}`] = wins / cellRounds;
  }
}
const mean = list => total(list) / list.length;
const atkAvg = (a, maps = mapNames) => mean(maps.flatMap(map => DEF_T.map(d => matrix[`${map}|${a}|${d}`])));
const defAvg = (d, maps = mapNames) => 1 - mean(maps.flatMap(map => ATK_T.map(a => matrix[`${map}|${a}|${d}`])));
const bestOn = (keys, score, map) => [...keys].sort((x, y) => score(y, [map]) - score(x, [map]))[0];
console.log(`\nATK round win by template (rows ATK, columns DEF, ${cellRounds} rounds per cell, MVP roster both sides):`);
for (const map of mapNames) {
  console.log(`  ${map}: ${DEF_T.join('      ')}   | avg   (best ATK ${bestOn(ATK_T, atkAvg, map)}, best DEF ${bestOn(DEF_T, defAvg, map)})`);
  for (const a of ATK_T) console.log(`    ${a}  ${DEF_T.map(d => pct(matrix[`${map}|${a}|${d}`], 1).padStart(6)).join(' ')} | ${pct(atkAvg(a, [map]), 1)}`);
  console.log(`    DEF win ${DEF_T.map(d => pct(defAvg(d, [map]), 1).padStart(6)).join(' ')}`);
}
console.log(`  averaged over maps: ATK ${ATK_T.map(a => `${a} ${pct(atkAvg(a), 1)}`).join(', ')} | DEF win ${DEF_T.map(d => `${d} ${pct(defAvg(d), 1)}`).join(', ')}`);
const sameBest = (keys, score) => new Set(mapNames.map(map => bestOn(keys, score, map))).size === 1;
const dominant = [
  ...ATK_T.filter(a => atkAvg(a) >= 0.55).map(a => `ATK ${a} wins ${pct(atkAvg(a), 1)}`),
  ...DEF_T.filter(d => defAvg(d) >= 0.55).map(d => `DEF ${d} wins ${pct(defAvg(d), 1)}`),
  ...(sameBest(ATK_T, atkAvg) ? [`ATK ${bestOn(ATK_T, atkAvg, mapNames[0])} is best on every map`] : []),
  ...(sameBest(DEF_T, defAvg) ? [`DEF ${bestOn(DEF_T, defAvg, mapNames[0])} is best on every map`] : []),
];

const flankGap = {};
for (const map of mapNames) {
  const m = MAPS2[map];
  const byHops = m.spawns.flatMap(s => Engine.paths(m, s, m.site, 40)).sort((a, b) => a.length - b.length);
  const entries = new Set(byHops.slice(0, 2).map(p => p[p.length - 2]));
  const flank = byHops.find(p => !entries.has(p[p.length - 2]));
  const gadgetFor = (op, path) => ({ smoke: m.site, reveal: path[path.length - 2] })[DATA.GADGET_USE[op.gadget.class]];
  const lane = path => ({
    groups: DATA.ATK_TEMPLATES.A.groups.reduce((out, n) => [...out, { ops: atkOps.slice(total(out.map(g => g.ops.length)), total(out.map(g => g.ops.length)) + n).map(op => op.id), path }], []),
    gadgets: Object.fromEntries(atkOps.filter(op => gadgetFor(op, path)).map(op => [op.id, gadgetFor(op, path)])),
  });
  const odds = path => mean(DEF_T.map(d => Engine.planOdds(atkOps, defOps, map, lane(path), Engine.defaultSetup(map, defOps, d), cellRounds)));
  const [short, side] = [odds(byHops[0]), odds(flank)];
  flankGap[map] = side - short;
  console.log(`  flank ${map}: all five on ${flank.join('>')} ${pct(side, 1)} vs shortest ${byHops[0].join('>')} ${pct(short, 1)}`);
}

Engine.setRandom(Engine.mulberry32(4040));
const variety = { ATK: new Set(), DEF: new Set() };
for (let rounds = 0, i = 0; rounds < 200; i++) {
  const match = Engine.newMatch(Engine.cloneSquad(player), Engine.generateSquad(58), mapNames[0]);
  while (!match.over && rounds < 200) {
    const r = Engine.playMatchRound(match, { armed: null, enemyArmed: null });
    variety.ATK.add(JSON.stringify(r.plan));
    variety.DEF.add(JSON.stringify(r.setup));
    rounds++;
  }
}
const rate = ([n, k]) => (n ? k / n : 0);
const share = re => total(Object.entries(mirror.reasons).filter(([k]) => re.test(k)).map(([, v]) => v)) / mirror.rounds;
const targets = [
  ['ATK round win', mirror.atkWins / mirror.rounds, 0.45, 0.55],
  ['time out endings', share(/Time out/), 0.05, 0.15],
  ['avg steps (planning excluded)', mirror.steps / mirror.rounds, 7, 12],
  ['6-pt weaker squad round win (quality 52)', 1 - roundWinRates[52], 0.15, 0.21],
  ...mapNames.map(map => [`flank minus shortest path, ${map}`, flankGap[map], -0.1, 0.1, 'soft']),
  ['no dominant plan (violations)', dominant.length, 0, 0],
  ['door realism: most operators of one side through one door in a step', v4.doorMax, 0, C.doorCapacity],
  ['door realism: most operators of one side in one zone', v4.zoneMax, 0, C.zoneCapacity],
  ['trap debuff rate with a drone on the zone', rate(v4.trap.drone), 0, 0.4],
  ['trap debuff rate without a drone', rate(v4.trap.blind), 0.8, 1],
  ['reinforced door on the planned path changes the path', rate(v4.reinforced), 0.5, 1],
  ['distinct ATK plans in 200 AI rounds on one map', variety.ATK.size, 8, Infinity],
  ['distinct DEF setups in 200 AI rounds on one map', variety.DEF.size, 8, Infinity],
];
const show = v => (Number.isInteger(v) || Math.abs(v) > 1 ? v.toFixed(Number.isInteger(v) ? 0 : 2) : `${(100 * v).toFixed(1)}%`);
console.log('\nBalance targets (mirror unless noted):');
for (const [name, v, min, max, soft] of targets) console.log(`  ${name} ${show(v)} (target ${show(min)}-${max === Infinity ? 'any' : show(max)})${v < min || v > max ? (soft ? '  OUT OF TARGET (reported, not asserted)' : '  OUT OF TARGET') : ''}`);
if (dominant.length) console.log(`  no dominant plan: ${dominant.join('; ')}`);
console.log(`  info: first kill -> round win ${pct(mirror.firstBloodWon, mirror.firstBlood)} | elimination ${pct(share(/Elimination/), 1)} | bomb ${pct(share(/Detonation|Defused/), 1)} | trapped-door crossings with / without drone ${v4.trap.drone[0]} / ${v4.trap.blind[0]} | reinforced doors on planned paths ${v4.reinforced[0]} in ${v4.rounds} checked rounds`);
assert.ok(targets.every(([, v, min, max, soft]) => soft || (v >= min && v <= max)), 'balance is outside the targets listed above');
Object.values(roundWinRates).reduce((prev, w) => (assert.ok(w < prev, 'stronger opponents should win more rounds'), w), Infinity);

for (const q of [-20, 0, 100, 150]) {
  const squad = Engine.generateSquad(q);
  assert.ok(squad.every(op => DATA.STATS.every(s => Number.isInteger(op.stats[s]) && op.stats[s] >= 0 && op.stats[s] <= C.statCap)), `quality ${q} stats`);
  const match = Engine.newMatch(Engine.cloneSquad(player), squad, mapNames[0]);
  while (!match.over) checkRound(Engine.playMatchRound(match));
}

const replayMatch = Engine.newMatch(Engine.cloneSquad(player), Engine.generateSquad(58), mapNames[1]);
for (const seed of [0, 1, 777, 2 ** 31 - 1]) {
  const side = Engine.nextPlayerSide(replayMatch);
  const mine = player.filter(op => Engine.sideOf(op) === side);
  const setup = Engine.defaultSetup(replayMatch.map, mine, 'P');
  const plan = Engine.defaultPlan(replayMatch.map, mine, 'C');
  const r = Engine.playMatchRound(replayMatch, side === 'ATK' ? { plan, seed } : { setup, seed });
  if (side === 'DEF') assert.deepEqual([r.setup, r.templates.DEF, r.pools.DEF], [setup, null, null], 'the player sets up the defence');
  else assert.deepEqual([r.plan, r.templates.ATK, r.pools.ATK], [plan, null, null], 'the player plans the attack');
  const again = Engine.playRound(r.ops.ATK, r.ops.DEF, r.map, { setup: r.setup, plan: r.plan, seed: r.seed, armed: r.armed });
  assert.equal(r.seed, seed, 'round stores its seed');
  assert.deepEqual([again.log, again.result], [r.log, r.result], `seed ${seed} replays the identical round`);
  checkRound(r);
}
for (const seed of [5, 6]) {
  const a = Engine.playRound(atkOps, defOps, mapNames[2], { seed });
  const b = Engine.playRound(atkOps, defOps, mapNames[2], { seed });
  assert.deepEqual([a.log, a.pools], [b.log, b.pools], 'AI picks follow the round seed');
}

for (let i = 0; i < 40; i++) {
  const match = Engine.newMatch(Engine.cloneSquad(player), Engine.generateSquad(58), mapNames[i % mapNames.length]);
  while (!match.over) {
    const b = Engine.briefing(match, { setup: Engine.nextPlayerSide(match) === 'DEF' ? Engine.defaultSetup(match.map, defOps, 'R') : undefined });
    const plan = b.side === 'ATK' ? (i % 2 ? Engine.defaultPlan(match.map, atkOps, ATK_T[i % 3], b.revealed) : Engine.suggestPlan(match.map, atkOps, b.revealed, Engine.mulberry32(i))) : undefined;
    const r = Engine.playMatchRound(match, { setup: b.side === 'DEF' ? b.defSetup : undefined, defSetup: b.side === 'ATK' ? b.defSetup : undefined, plan, seed: b.seed, armed: b.armed, enemyArmed: b.enemyArmed });
    assert.deepEqual([r.log[0].intel, r.setup], [b.intel, b.defSetup], 'the briefing shows the round intel and DEF setup');
    const later = r.log[0].revealed;
    assert.ok(['reinforcements', 'traps'].every(k => b.revealed[k].every(x => later[k].includes(x))) && Object.entries(b.revealed.positions).every(([id, z]) => later.positions[id] === z), 'briefing reveal is part of the round reveal');
    if (b.side === 'ATK') {
      const fresh = Engine.playRound(atkOps, match.enemy.filter(op => Engine.sideOf(op) === 'DEF'), match.map, { seed: b.seed, plan, armed: r.armed });
      assert.deepEqual(fresh.setup, b.defSetup, 'the briefing draws the same AI setup as the round');
    }
    checkRound(r);
  }
}

for (const map of mapNames) {
  for (const [side, ops] of [['ATK', atkOps], ['DEF', defOps]]) {
    for (const a of Object.keys(DATA.ARCHETYPES)) {
      const list = Engine.pool(map, ops, side, a);
      assert.equal(list.length, C.poolSize, `${map} ${side} ${a}: pool size`);
      for (const v of list) assert.ok(side === 'ATK' ? Engine.validatePlan(map, ops, v) : Engine.validateSetup(map, ops, v), 'pool entries are valid');
      assert.deepEqual(list, Engine.pool(map, ops, side, a), 'pools are fixed per map and archetype');
    }
  }
  const draw = Engine.mulberry32(99);
  const kinds = new Set();
  for (let i = 0; i < 150; i++) {
    const plan = Engine.suggestPlan(map, atkOps, {}, draw);
    const setup = Engine.suggestSetup(map, defOps, draw);
    assert.ok(Engine.validatePlan(map, atkOps, plan) && Engine.validateSetup(map, defOps, setup), 'suggestions are valid');
    assert.ok(plan.groups.every(g => g.ops.length <= C.maxGroupSize), 'suggested groups have 1 to 3 operators');
    kinds.add(plan.groups.map(g => g.ops.length).sort().join(''));
  }
  assert.ok(kinds.size >= 3, `${map}: suggestions vary the group sizes`);
}
assert.equal(Engine.reinforceCharges(defOps), C.reinforceCharges + C.panelCharges, 'the Anchor with a Reinforcement Panel adds a charge');
assert.equal(Engine.reinforceCharges(defOps.map(op => (op.role === 'Anchor' ? { ...op, gadget: { class: 'Camera Network', tier: 1 } } : op))), C.reinforceCharges, 'no panel, no extra charge');
assert.deepEqual(Engine.doors(mapNames[0]).map(d => d.id), MAPS2[mapNames[0]].doors.map(([a, b]) => Engine.doorId(a, b)), 'doors list the map doors');

const tower = mapNames[0];
const goodSetup = Engine.defaultSetup(tower, defOps, 'P');
const goodPlan = Engine.defaultPlan(tower, atkOps, 'B');
const bad = [
  [{ ...goodSetup, positions: { ...goodSetup.positions, r06: 'roof' } }, null, /non-spawn/],
  [{ ...goodSetup, positions: { ...goodSetup.positions, r06: 'ext-s' } }, null, /non-spawn/],
  [{ ...goodSetup, positions: Object.fromEntries(defOps.map(op => [op.id, 'site'])) }, null, /at most 3 defenders/],
  [{ ...goodSetup, reinforcements: ['ext-s|lobby', 'glass|hall-w', 'lobby|open', 'hall-w|open'] }, null, /at most 3 reinforcements/],
  [{ ...goodSetup, reinforcements: ['site', 'glass|hall-w'] }, null, /distinct doors/],
  [{ ...goodSetup, reinforcements: ['ext-s|lobby'] }, null, /cut a room off/],
  [{ ...goodSetup, reinforcements: ['hall-n|site', 'glass|site'] }, null, /cut a room off/],
  [{ ...goodSetup, traps: ['site'] }, null, /traps must map/],
  [{ ...goodSetup, traps: { r09: 'site' } }, null, /needs an unreinforced door/],
  [{ ...goodSetup, traps: { r09: goodSetup.reinforcements[0] } }, null, /needs an unreinforced door/],
  [{ ...goodSetup, traps: { r06: 'glass|hall-w' } }, null, /no gadget for traps/],
  [{ ...goodSetup, traps: { r08: 'glass|hall-w', r09: 'glass|hall-w' } }, null, /distinct targets/],
  [{ ...goodSetup, cameras: { r10: 'roof' } }, null, /needs a zone/],
  [{ ...goodSetup, roam: { r01: true } }, null, /unknown operator/],
  [null, { ...goodPlan, groups: [{ ops: atkOps.slice(0, 3).map(op => op.id), path: ['ext-s', 'lobby', 'site'] }, { ops: atkOps.slice(3).map(op => op.id), path: goodPlan.groups[1].path }] }, /follow edges/],
  [null, { ...goodPlan, groups: [{ ...goodPlan.groups[0], path: ['lobby', 'open', 'hall-n', 'site'] }, goodPlan.groups[1]] }, /from a spawn to the site/],
  [null, { ...goodPlan, groups: [{ ...goodPlan.groups[0], path: ['ext-s', 'lobby', 'open', 'hall-n'] }, goodPlan.groups[1]] }, /from a spawn to the site/],
  [null, { ...goodPlan, groups: [goodPlan.groups[0], { ...goodPlan.groups[1], ops: [...goodPlan.groups[1].ops, goodPlan.groups[0].ops[0]] }] }, /exactly one group/],
  [null, { ...goodPlan, groups: [goodPlan.groups[0]] }, /exactly one group/],
  [null, { ...goodPlan, groups: [{ ops: atkOps.map(op => op.id), path: goodPlan.groups[0].path }] }, /1 to 3 operators per group/],
  [null, { ...goodPlan, groups: [...goodPlan.groups, ...goodPlan.groups, ...goodPlan.groups].map(g => ({ ...g, ops: [] })) }, /1 to 5 groups/],
  [null, { ...goodPlan, gadgets: { r01: 'ext-e' } }, /off its path/],
  [null, { ...goodPlan, gadgets: { r01: 'lobby' } }, /cannot target a zone/],
  [null, { ...goodPlan, gadgets: { r03: 'ext-s|lobby' } }, /cannot target a door/],
  [null, { ...goodPlan, gadgets: { r01: 'glass|site' } }, /off its path/],
  [null, { ...goodPlan, gadgets: { r99: 'site' } }, /no gadget/],
];
for (const [setup, plan, re] of bad) {
  assert.throws(() => (setup ? Engine.validateSetup(tower, defOps, setup) : Engine.validatePlan(tower, atkOps, plan)), re, `${re} is rejected`);
  assert.throws(() => Engine.playRound(atkOps, defOps, tower, { setup: setup ?? goodSetup, plan: plan ?? goodPlan, seed: 1 }), re, `playRound rejects ${re}`);
}

const intelOf = (round, side) => round.log[0].intel[side === 'ATK' ? 'atkIntel' : 'defIntel'];
const armedSides = { ATK: 0, DEF: 0 };
for (let i = 0; i < 200; i++) {
  const match = Engine.newMatch(Engine.cloneSquad(player), Engine.generateSquad(45 + (i % 25)), mapNames[i % mapNames.length]);
  const seen = new Set();
  while (!match.over) {
    const mine = Engine.armable(match, 'player');
    const enemyLeft = Engine.armable(match, 'enemy').length;
    const choice = i % 4 === 0 ? mine.map(op => op.id) : mine.length ? [mine[i % mine.length].id] : [];
    const side = Engine.nextPlayerSide(match);
    assert.deepEqual(Engine.unusedAbilities(match, side).map(a => a.id), mine.map(op => op.id), 'unused abilities are the armable ones of the side');
    const r = Engine.playMatchRound(match, { armed: choice, seed: 1000 * i + match.rounds.length });
    const enemySide = other(r.playerSide);
    assert.deepEqual(r.armed[r.playerSide], choice, 'the player arms the chosen abilities');
    assert.equal(r.armed[enemySide].length, enemyLeft > 0 ? 1 : 0, 'the opponent arms one unused ability each round');
    for (const s of ['ATK', 'DEF']) {
      for (const id of r.armed[s]) {
        armedSides[s]++;
        assert.ok(!seen.has(id) && match.used[id] === match.rounds.length, 'each ability is used at most once per match');
        seen.add(id);
        const a = DATA.ACTIVES[r.ops[s].find(op => op.id === id).active];
        const delta = intelOf(r, s) - intelOf(Engine.playRound(r.ops.ATK, r.ops.DEF, r.map, { setup: r.setup, plan: r.plan, seed: r.seed, armed: { ...r.armed, [s]: r.armed[s].filter(x => x !== id) } }), s);
        if (!a.situations.includes('Info')) assert.equal(delta, 0, 'no intel effect outside Info');
        else assert.ok(a.add ? close(delta, a.add) : delta > 0, 'intel effect of an Info ability');
      }
    }
    assert.deepEqual(Object.keys(match.used).sort(), [...seen].sort(), 'used holds exactly the armed operators');
    checkRound(r);
    const usedOp = match.player.find(op => op.id in match.used);
    if (usedOp && !match.over) assert.throws(() => Engine.playMatchRound(match, { armed: [usedOp.id] }), /cannot arm/, 'a used ability cannot be armed again');
  }
  assert.deepEqual(Engine.unusedAbilities(match).map(a => a.id), match.player.filter(op => op.active && !(op.id in match.used)).map(op => op.id), 'the match summary lists the abilities never armed');
}
assert.ok(armedSides.ATK > 0 && armedSides.DEF > 0, 'abilities were armed on both sides');

const oddsPlan = Engine.defaultPlan(tower, atkOps, 'A');
const odds = DEF_T.map(d => Engine.planOdds(atkOps, defOps, tower, oddsPlan, Engine.defaultSetup(tower, defOps, d)));
assert.deepEqual(odds, DEF_T.map(d => Engine.planOdds(atkOps, defOps, tower, oddsPlan, Engine.defaultSetup(tower, defOps, d))), 'planOdds is deterministic');
assert.ok(odds.every(p => p > 0 && p < 1), 'planOdds is a share');
const squadIds = Engine.generateSquad(50).map(op => op.id);
assert.ok(new Set([...player.map(op => op.id), ...squadIds]).size === 20 && squadIds.every(id => /^g\d+$/.test(id)), 'unique ids');

if (process.argv.includes('--sens')) {
  const matches = 2000;
  const quality = 58.6;
  const run = (squad, archetype = 'Balanced', arms = {}) => {
    Engine.setRandom(Engine.mulberry32(777));
    const t = Engine.simulate({ player: squad, matches, quality, archetype, ...arms });
    return { round: t.roundsWon / t.rounds, match: t.won / t.matches };
  };
  const withTier = (squad, slots, tier) => squad.map(op => ({ ...op, ...Object.fromEntries(slots.map(k => [k, { ...op[k], tier }])) }));
  const withTrait = (squad, f) => squad.map(op => ({ ...op, trait: f(op) }));
  const items = ['primary', 'armor', 'gadget'];
  const base = run(player);
  const rows = [
    ['baseline (roster: tier 1, traits on)', base],
    ...items.map(k => [`${k} tier 6 for everyone`, run(withTier(player, [k], 6))]),
    ['all items tier 6', run(withTier(player, items, 6))],
    ...Object.keys(DATA.TRAITS).map(name => {
      const owners = player.filter(op => op.trait === name);
      if (owners.length) return [`${name} off (${owners.map(op => op.name).join(', ')})`, run(withTrait(player, op => (op.trait === name ? null : op.trait)))];
      return [`${name} on Breach instead of Cold Blooded`, run(withTrait(player, op => (op.name === 'Breach' ? name : op.trait)))];
    }),
    ['all traits off', run(withTrait(player, () => null))],
    ...Object.keys(DATA.ARCHETYPES).map(a => [`opponent archetype ${a}`, run(player, a)]),
  ];
  const armedRows = [
    ['player arms every round (best unused)', run(player, 'Balanced', { playerArms: true })],
    ['opponent arms every round', run(player, 'Balanced', { enemyArms: true })],
  ];
  rows.push(...armedRows);
  const neutral = (op, w) => {
    const armed = { ...op, primary: { ...op.primary, id: w.id } };
    return DATA.SITUATIONS.reduce((a, t) => a + DATA.SITUATION_SHARE[t] * Engine.operatorScore(armed, { side: Engine.sideOf(op), situation: t, phase: 'Main', step: 1 }).score, 0);
  };
  const weaponRows = classes.filter(c => c !== 'Pistol').flatMap(c => {
    const op = player.find(x => x.primary.class === c);
    const ranked = DATA.WEAPON_CATALOG.filter(w => w.class === c).sort((a, b) => neutral(op, b) - neutral(op, a));
    return [ranked[0], ranked[ranked.length - 1]].map((w, i) => [`${op.name} ${i ? 'worst' : 'best'} ${c}: ${w.name}`, run(player.map(x => (x === op ? { ...x, primary: { ...x.primary, id: w.id } } : x)))]);
  });
  rows.push(...weaponRows);
  const signed = v => `${v >= 0 ? '+' : ''}${(100 * v).toFixed(1)}`;
  console.log(`\nSensitivity vs generated quality ${quality} (Balanced unless noted), ${matches} matches per row, seed 777:`);
  console.log('  change | your round win | delta vs baseline | your match win');
  for (const [label, v] of rows) console.log(`  ${label} | ${pct(v.round, 1)} | ${signed(v.round - base.round)} | ${pct(v.match, 1)}`);
  const bare = run(withTrait(player, () => null));
  const full = run(withTier(player, items, 6));
  const budget = full.round - bare.round;
  console.log(`  power budget: bare (tier 1, no traits) ${pct(bare.round, 1)} -> full (tier 6, traits) ${pct(full.round, 1)} = ${signed(budget)} round-win points (target +7 to +13)${budget < 0.07 || budget > 0.13 ? '  OUT OF TARGET (reported, not asserted)' : ''}`);
  for (const [label, v] of armedRows) assert.ok(Math.abs(v.round - base.round) <= 0.04, `${label} moves the round win by ${signed(v.round - base.round)}, more than 4 points`);
  for (const [label, v] of weaponRows) assert.ok(Math.abs(v.round - base.round) <= 0.03, `${label} moves the round win by ${signed(v.round - base.round)}, more than 3 points`);
}

if (process.argv.includes('--share')) {
  Engine.setRandom(Engine.mulberry32(4242));
  const counts = Object.fromEntries(DATA.SITUATIONS.map(t => [t, 0]));
  for (let i = 0; i < 1000; i++) {
    const match = Engine.newMatch(Engine.cloneSquad(player), Engine.cloneSquad(player).map((op, j) => ({ ...op, id: `m${j + 1}` })), mapNames[i % mapNames.length]);
    while (!match.over) for (const s of Engine.playMatchRound(match, { armed: null, enemyArmed: null }).log) for (const f of s.fights) counts[f.situation]++;
  }
  const fights = total(Object.values(counts));
  const measured = DATA.SITUATIONS.map(t => (counts[t] / fights).toFixed(3));
  const drift = Math.max(...DATA.SITUATIONS.map((t, i) => Math.abs(measured[i] - DATA.SITUATION_SHARE[t])));
  console.log(`
Situation share of ${fights} fights (mirror, 1000 matches, seed 4242), for DATA.SITUATION_SHARE:`);
  console.log(`  ${DATA.SITUATIONS.map((t, i) => `${t} ${measured[i]}`).join(' | ')}`);
  console.log(`  bySituation([${measured.join(', ')}]) | largest difference to data.js ${drift.toFixed(3)}`);
}

const sides = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
const inside = ([x, y], poly) => sides(poly).reduce((c, [[x1, y1], [x2, y2]]) => (y1 > y !== y2 > y && x < x1 + ((y - y1) * (x2 - x1)) / (y2 - y1) ? !c : c), false);
const bbox = poly => [0, 1].map(i => [Math.min(...poly.map(p => p[i])), Math.max(...poly.map(p => p[i]))]);
const segDist = ([px, py], [[x1, y1], [x2, y2]]) => {
  const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / len2));
  return Math.hypot(px - x1 - t * (x2 - x1), py - y1 - t * (y2 - y1));
};
const sharedLength = (a, b, tol) => {
  let total = 0;
  for (const [[x1, y1], [x2, y2]] of sides(a)) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const along = ([x, y]) => ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / len;
    const off = ([x, y]) => Math.abs((x - x1) * (y2 - y1) - (y - y1) * (x2 - x1)) / len;
    for (const r of sides(b)) if (r.every(p => off(p) <= tol)) {
      const [lo, hi] = r.map(along).sort((u, v) => u - v);
      total += Math.max(0, Math.min(len, hi) - Math.max(0, lo));
    }
  }
  return total;
};
const edgeDisjoint = (m, adj) => {
  const cap = new Map();
  const key = (a, b) => `${a}|${b}`;
  for (const [a, b] of m.edges) {
    cap.set(key(a, b), 1);
    cap.set(key(b, a), 1);
  }
  const source = '#source';
  for (const s of m.spawns) cap.set(key(source, s), Infinity);
  const next = z => (z === source ? m.spawns : adj[z]);
  let flow = 0;
  for (;;) {
    const prev = { [source]: null };
    const queue = [source];
    for (const z of queue) for (const n of next(z)) if (!(n in prev) && cap.get(key(z, n)) > 0) {
      prev[n] = z;
      queue.push(n);
    }
    if (!(m.site in prev)) return flow;
    for (let z = m.site; prev[z] !== null; z = prev[z]) {
      cap.set(key(prev[z], z), cap.get(key(prev[z], z)) - 1);
      cap.set(key(z, prev[z]), (cap.get(key(z, prev[z])) ?? 0) + 1);
    }
    flow++;
  }
};
const allSimple = (adj, from, to, path = [from]) => (from === to ? 1 : adj[from].reduce((n, z) => n + (path.includes(z) ? 0 : allSimple(adj, z, to, [...path, z])), 0));
const mapReport = [];
for (const [name, m] of Object.entries(MAPS2)) {
  const ids = Object.keys(m.zones);
  const [W, H] = m.size;
  const adj = Object.fromEntries(ids.map(z => [z, []]));
  assert.ok(ids.length >= 14 && ids.length <= 18, `${name}: ${ids.length} zones`);
  assert.ok(m.spawns.length >= 2 && m.spawns.length <= 3 && m.spawns.every(s => m.zones[s]?.type === 'Exterior'), `${name}: spawns must be 2-3 Exterior zones`);
  assert.deepEqual(ids.filter(z => m.zones[z].type === 'Site'), [m.site], `${name}: exactly one site`);
  for (const [id, z] of Object.entries(m.zones)) {
    assert.ok(z.label && z.type in DATA.ZONES && z.space === DATA.ZONES[z.type].space, `${name} ${id}: type/space`);
    assert.ok(z.poly.length >= 3 && z.poly.every(([x, y]) => x >= 0 && y >= 0 && x <= W && y <= H), `${name} ${id}: poly inside size`);
    assert.ok(inside(z.anchor, z.poly), `${name} ${id}: anchor inside poly`);
  }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const [a, b] = [bbox(m.zones[ids[i]].poly), bbox(m.zones[ids[j]].poly)];
    const [x0, x1, y0, y1] = [Math.max(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1]), Math.max(a[1][0], b[1][0]), Math.min(a[1][1], b[1][1])];
    for (let x = Math.floor(x0) + 0.5; x < x1; x++) for (let y = Math.floor(y0) + 0.5; y < y1; y++) {
      assert.ok(!(inside([x, y], m.zones[ids[i]].poly) && inside([x, y], m.zones[ids[j]].poly)), `${name}: ${ids[i]} overlaps ${ids[j]} at ${x},${y}`);
    }
  }
  const seenEdges = new Set();
  for (const [a, b] of m.edges) {
    assert.ok(a in m.zones && b in m.zones && a !== b, `${name}: edge ${a}-${b} has unknown zones`);
    const k = [a, b].sort().join('|');
    assert.ok(!seenEdges.has(k), `${name}: duplicate edge ${k}`);
    seenEdges.add(k);
    adj[a].push(b);
    adj[b].push(a);
    assert.ok(sharedLength(m.zones[a].poly, m.zones[b].poly, 2) >= 20, `${name}: ${a} and ${b} do not share a wall`);
  }
  assert.deepEqual(m.doors.map(([a, b]) => [a, b].sort().join('|')).sort(), [...seenEdges].sort(), `${name}: one door per edge`);
  for (const [a, b, p] of m.doors) {
    assert.ok([a, b].every(z => sides(m.zones[z].poly).some(s => segDist(p, s) <= 2)), `${name}: door ${a}-${b} is not on their shared wall`);
  }
  for (const a of ids) {
    assert.equal(Engine.dist(m, a, a), 0);
    for (const b of ids) {
      const d = Engine.dist(m, a, b);
      assert.ok(Number.isFinite(d), `${name}: ${b} unreachable from ${a}`);
      assert.equal(d, Engine.dist(m, b, a), `${name}: dist ${a}-${b} is not symmetric`);
    }
  }
  const disjoint = edgeDisjoint(m, adj);
  assert.ok(disjoint >= 3, `${name}: only ${disjoint} edge-disjoint spawn-site paths`);
  const k = 40;
  const all = m.spawns.flatMap(s => {
    const got = Engine.paths(m, s, m.site, k);
    assert.equal(got.length, Math.min(k, allSimple(adj, s, m.site)), `${name}: paths count from ${s}`);
    assert.deepEqual(got, Engine.paths(name, s, m.site, k), `${name}: paths by name`);
    assert.equal(got[0].length - 1, Engine.dist(m, s, m.site), `${name}: first path is shortest from ${s}`);
    got.forEach((p, i) => {
      assert.ok(p[0] === s && p[p.length - 1] === m.site && new Set(p).size === p.length, `${name}: path is simple spawn-site`);
      assert.ok(p.every((z, j) => j === 0 || adj[z].includes(p[j - 1])), `${name}: path follows edges`);
      assert.ok(i === 0 || got[i - 1].length <= p.length, `${name}: paths sorted by hops`);
    });
    return got;
  });
  const byHops = [...all].sort((a, b) => a.length - b.length);
  const entries = new Set(byHops.slice(0, 2).map(p => p[p.length - 2]));
  const flank = byHops.find(p => !entries.has(p[p.length - 2]));
  assert.ok(flank, `${name}: no flank path`);
  mapReport.push(name);
}
assert.equal(mapReport.length, 3, 'three maps');

console.log('\nall checks passed');
console.log(`maps: ${mapReport.length} checked`);
