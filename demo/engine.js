const Engine = (() => {
  const D = typeof DATA === 'object' ? DATA : require('./data.js');
  const M = typeof MAPS2 === 'object' ? MAPS2 : require('./maps.js');
  const C = D.CONFIG;
  const mulberry32 = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hash = text => [...String(text)].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) | 0;
  let rand = Math.random;
  let generated = 0;

  const randInt = (min, max, r = rand) => min + Math.floor(r() * (max - min + 1));
  const noise = range => (rand() * 2 - 1) * range;
  const pick = (list, r = rand) => list[Math.floor(r() * list.length)];
  const shuffle = (list, r = rand) => list.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const weightedPick = (list, weight, r = rand) => {
    const weights = list.map(weight);
    let left = r() * weights.reduce((a, b) => a + b, 0);
    return list.find((_, i) => (left -= weights[i]) < 0) ?? list[list.length - 1];
  };
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const clampStat = x => Math.min(C.statCap, Math.max(0, x));
  const other = side => (side === 'ATK' ? 'DEF' : 'ATK');
  const sideOf = op => D.ROLES[op.role].side;
  const alive = (st, side) => st.ops[side].filter(op => op.alive);

  const allowedPlaystyles = op => Object.keys(D.PLAYSTYLES).filter(p => p !== 'Adaptive' || op.role === 'Flex');

  function contributions(op, ctx) {
    const parts = { base: 0, mult: {}, add: {}, stats: {}, risk: {} };
    for (const c of D.CONTRIBUTORS) {
      const r = c.apply(op, ctx);
      if (!r) continue;
      if (r.stats) parts.stats[c.name] = r.stats;
      if (r.mult !== undefined) parts.mult[c.name] = r.mult;
      if (r.add !== undefined) parts.add[c.name] = r.add;
      if (r.risk !== undefined) parts.risk[c.name] = r.risk;
    }
    return parts;
  }

  function teamStats(mates, ctx) {
    const team = {};
    const probe = { ...ctx, rand: null };
    for (const op of mates) {
      for (const c of D.CONTRIBUTORS) {
        const t = c.apply(op, probe)?.team;
        for (const s in t) team[s] = (team[s] ?? 0) + t[s];
      }
    }
    return Object.keys(team).length ? team : null;
  }

  function foldStats(op, parts) {
    const es = {};
    for (const s of D.STATS) {
      let v = op.stats[s];
      for (const k in parts.stats) v += parts.stats[k][s] ?? 0;
      es[s] = clampStat(v);
    }
    return es;
  }

  const effectiveStats = (op, ctx = {}) => foldStats(op, contributions(op, ctx));
  const weightedScore = (row, es) => sum(Object.keys(row), s => row[s] * es[s]);
  const situationScore = (es, situation) => weightedScore(D.WEIGHTS[situation], es);

  function operatorScore(op, ctx) {
    const parts = contributions(op, ctx);
    parts.base = weightedScore(ctx.phase === 'Intel' ? D.INTEL_WEIGHTS[ctx.side] : D.WEIGHTS[ctx.situation], foldStats(op, parts));
    let score = parts.base;
    for (const k in parts.mult) score *= parts.mult[k];
    for (const k in parts.add) score += parts.add[k];
    return { score, parts };
  }

  const mapOf = map => {
    const m = typeof map === 'string' ? M[map] : map;
    if (!m) throw new Error(`unknown map ${map}`);
    return m;
  };
  const graphs = new WeakMap();
  function graph(map) {
    const m = mapOf(map);
    if (!graphs.has(m)) {
      const adj = Object.fromEntries(Object.keys(m.zones).map(z => [z, []]));
      for (const [a, b] of m.edges) {
        adj[a].push(b);
        adj[b].push(a);
      }
      graphs.set(m, adj);
    }
    return graphs.get(m);
  }

  const doorId = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const doorZones = d => d.split('|');
  const isDoorTarget = target => String(target).includes('|');
  const doorsOf = path => path.slice(1).map((z, i) => doorId(path[i], z));
  const doors = map => mapOf(map).doors.map(([a, b, pos]) => ({ id: doorId(a, b), a, b, pos }));
  const isDoor = (m, d) => typeof d === 'string' && m.edges.some(([a, b]) => doorId(a, b) === d);

  function route(map, from, to, avoid = null, closed = null) {
    const adj = graph(map);
    const shut = closed ? new Set(closed) : null;
    const prev = { [from]: null };
    const queue = [from];
    for (const z of queue) {
      if (z === to) {
        const path = [];
        for (let x = z; x !== null; x = prev[x]) path.unshift(x);
        return path;
      }
      for (const n of adj[z]) if (!(n in prev) && n !== avoid && !shut?.has(doorId(z, n))) {
        prev[n] = z;
        queue.push(n);
      }
    }
    return null;
  }

  const dist = (map, a, b, closed = null) => (route(map, a, b, null, closed)?.length ?? Infinity) - 1;

  function paths(map, from, to, k = 1) {
    const adj = graph(map);
    const found = [];
    const queue = [[from]];
    for (let i = 0; i < queue.length && found.length < k; i++) {
      const path = queue[i];
      const last = path[path.length - 1];
      if (last === to) found.push(path);
      else for (const n of adj[last]) if (!path.includes(n)) queue.push([...path, n]);
    }
    return found;
  }

  const rankBy = list => {
    const count = {};
    for (const x of list) count[x] = (count[x] ?? 0) + 1;
    return [...new Set(list)].sort((a, b) => count[b] - count[a]);
  };

  const laneCache = new WeakMap();
  function lanes(map) {
    const m = mapOf(map);
    if (laneCache.has(m)) return laneCache.get(m);
    const candidates = m.spawns.flatMap(s => paths(m, s, m.site, 40)).sort((a, b) => a.length - b.length);
    const near = candidates.filter(p => p.length <= dist(m, p[0], m.site) + 2);
    const entries = rankBy(near.map(p => p[p.length - 2]));
    const value = {
      candidates, near, entries, chokes: rankBy(near.map(p => p[1])),
      siteDoors: entries.map(e => doorId(e, m.site)),
      approachDoors: rankBy(near.filter(p => p.length >= 3).map(p => doorId(p[p.length - 3], p[p.length - 2]))),
      chokeDoors: rankBy(near.map(p => doorId(p[0], p[1]))),
      nearDoors: rankBy(near.flatMap(doorsOf)),
      nearZones: rankBy(near.flatMap(p => p.slice(1, -1))),
    };
    laneCache.set(m, value);
    return value;
  }

  function cutsOff(m, closed) {
    const adj = graph(m);
    if (adj[m.site].filter(n => !closed.has(doorId(n, m.site))).length < C.siteOpenDoors) return true;
    const seen = new Set([m.site]);
    const queue = [m.site];
    for (const z of queue) for (const n of adj[z]) if (!seen.has(n) && !closed.has(doorId(z, n))) {
      seen.add(n);
      queue.push(n);
    }
    return seen.size < Object.keys(m.zones).length;
  }

  const roleOrder = ops => [...ops].sort((a, b) => Object.keys(D.ROLES).indexOf(a.role) - Object.keys(D.ROLES).indexOf(b.role));
  const useOf = op => D.GADGET_USE[op.gadget.class];
  const isTrapOp = op => useOf(op) === 'trap' || useOf(op) === 'alarm';
  const reinforceCharges = defOps => C.reinforceCharges + (defOps.some(op => op.role === 'Anchor' && useOf(op) === 'panel') ? C.panelCharges : 0);
  const templateKey = (x, table, fallback) => (x in table ? x : fallback);

  function fillReinforcements(m, candidates, max) {
    const out = [];
    for (const d of candidates) if (out.length < max && !out.includes(d) && !cutsOff(m, new Set([...out, d]))) out.push(d);
    return out;
  }

  function defaultSetup(map, defOps, template) {
    const m = mapOf(map);
    const t = D.DEF_TEMPLATES[templateKey(template, D.DEF_TEMPLATES, 'S')];
    const lane = lanes(m);
    const positions = {};
    const roam = {};
    let spread = 0;
    for (const op of roleOrder(defOps)) {
      positions[op.id] = t.spread.includes(op.role) ? lane.entries[spread++ % lane.entries.length] : m.site;
      if (t.roam.includes(op.role)) roam[op.id] = true;
    }
    const reinforcements = fillReinforcements(m, [...lane.siteDoors, ...lane.approachDoors], reinforceCharges(defOps));
    const trapDoors = (t.traps === 'entries' ? lane.approachDoors : lane.chokeDoors).filter(d => !reinforcements.includes(d));
    const traps = {};
    const cameras = {};
    for (const op of roleOrder(defOps)) {
      if (isTrapOp(op) && trapDoors.length) traps[op.id] = trapDoors.shift();
      if (useOf(op) === 'camera') cameras[op.id] = lane.chokes[0];
    }
    return { positions, reinforcements, traps, cameras, roam };
  }

  function planCost(revealed = {}, group = []) {
    const closed = new Set(revealed.reinforcements ?? []);
    const trapped = new Set(revealed.traps ?? []);
    const known = Object.values(revealed.positions ?? {});
    const canBreach = group.some(op => useOf(op) === 'breach');
    const canDisarm = group.some(op => op.role === 'Utility Specialist');
    return p => p.length + sum(doorsOf(p), d => (closed.has(d) ? (canBreach ? 1 : 6) : 0) + (trapped.has(d) && !canDisarm ? 1 : 0)) + sum(p.slice(1, -1), z => known.filter(x => x === z).length / 2);
  }

  function defaultPlan(map, atkOps, template, revealed = {}) {
    const m = mapOf(map);
    const t = D.ATK_TEMPLATES[templateKey(template, D.ATK_TEMPLATES, 'A')];
    const sizes = t.groups;
    const cost = planCost(revealed);
    const byEntry = {};
    for (const p of [...lanes(m).candidates].sort((x, y) => cost(x) - cost(y))) (byEntry[p[p.length - 2]] ??= {})[p.length] ??= p;
    const options = Object.values(byEntry).map(o => Object.values(o));
    let best = null;
    const search = (from, combo) => {
      if (combo.length === Math.min(t.lanes, options.length)) {
        const lengths = combo.map(p => p.length);
        const key = [Math.max(...lengths) - Math.min(...lengths), sum(combo, cost)];
        if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && key[1] < best.key[1])) best = { key, combo };
        return;
      }
      for (let e = from; e < options.length; e++) for (const p of options[e]) search(e + 1, [...combo, p]);
    };
    search(0, []);
    const chosen = best.combo.sort((x, y) => cost(x) - cost(y));
    const distinct = chosen.length;
    while (chosen.length < sizes.length) chosen.push(chosen[chosen.length % distinct]);
    const ops = roleOrder(atkOps);
    let next = 0;
    const groups = sizes.map((n, i) => ({ ops: ops.slice(next, (next += n)).map(op => op.id), path: [...chosen[i]] })).filter(g => g.ops.length);
    const gadgets = {};
    for (const g of groups) {
      for (const id of g.ops) {
        const use = useOf(atkOps.find(op => op.id === id));
        const target = use === 'smoke' ? m.site : use === 'reveal' ? g.path[g.path.length - 2] : use === 'breach' ? doorsOf(g.path).find(d => revealed.reinforcements?.includes(d) && !Object.values(gadgets).includes(d)) : undefined;
        if (target) gadgets[id] = target;
      }
    }
    return { groups, gadgets };
  }

  function groupSizes(n, [lo, hi], r) {
    const min = Math.max(Math.ceil(n / C.maxGroupSize), Math.min(lo, n));
    const count = randInt(min, Math.max(min, Math.min(hi, C.maxGroups, n)), r);
    const sizes = Array(count).fill(1);
    for (let left = n - count; left > 0; left--) sizes[pick(sizes.map((_, i) => i).filter(i => sizes[i] < C.maxGroupSize), r)]++;
    return sizes;
  }

  function suggestPlan(map, atkOps, revealed = {}, r = rand, style = D.ARCHETYPES.Balanced.ai) {
    const m = mapOf(map);
    const near = lanes(m).near;
    const closed = revealed.reinforcements ?? [];
    const trapped = revealed.traps ?? [];
    const ids = shuffle(atkOps.map(op => op.id), r);
    const opOf = id => atkOps.find(op => op.id === id);
    let next = 0;
    const groups = groupSizes(ids.length, style.groups, r).map(n => {
      const ops = ids.slice(next, (next += n));
      const cost = planCost(revealed, ops.map(opOf));
      return { ops, path: [...weightedPick(near, p => cost(p) ** -3, r)] };
    });
    const gadgets = {};
    for (const g of groups) {
      const doorsHere = doorsOf(g.path);
      for (const id of g.ops) {
        const use = useOf(opOf(id));
        let target;
        if (use === 'reveal' && r() < style.drones) target = pick([g.path[1], g.path[g.path.length - 2]], r);
        if (use === 'smoke') target = r() < 0.75 ? m.site : doorsHere[doorsHere.length - 1];
        if (use === 'breach') target = doorsHere.find(d => closed.includes(d) && !Object.values(gadgets).includes(d));
        if (use === 'emp') target = g.path.slice(1).find(z => trapped.some(d => doorZones(d).includes(z) && doorsHere.includes(d)));
        if (target) gadgets[id] = target;
      }
    }
    return { groups, gadgets };
  }

  function suggestSetup(map, defOps, r = rand, style = D.ARCHETYPES.Balanced.ai) {
    const m = mapOf(map);
    const lane = lanes(m);
    const ordered = roleOrder(defOps);
    const onSite = Math.min(C.zoneCapacity, randInt(style.site[0], style.site[1], r));
    const siteOps = [ordered[0], ...shuffle(ordered.slice(1), r).slice(0, onSite - 1)];
    const positions = {};
    const roam = {};
    const count = { [m.site]: 0 };
    const spots = [...lane.entries, ...lane.entries, ...lane.nearZones].filter(z => !m.spawns.includes(z) && z !== m.site);
    for (const op of ordered) {
      const z = siteOps.includes(op) ? m.site : pick(spots.filter(x => (count[x] ?? 0) < C.zoneCapacity), r);
      positions[op.id] = z;
      count[z] = (count[z] ?? 0) + 1;
      if (z !== m.site && (op.role === 'Roamer' || op.role === 'Lurker') && r() < style.roam) roam[op.id] = true;
    }
    const reinforcements = fillReinforcements(m, shuffle([...lane.siteDoors, ...lane.approachDoors, ...lane.siteDoors], r), reinforceCharges(defOps));
    const open = lane.nearDoors.filter(d => !reinforcements.includes(d));
    const traps = {};
    const cameras = {};
    for (const op of ordered) {
      if (isTrapOp(op)) {
        const d = pick(open.filter(x => !Object.values(traps).includes(x)), r);
        if (d) traps[op.id] = d;
      }
      if (useOf(op) === 'camera') cameras[op.id] = pick([...lane.chokes, ...lane.nearZones], r);
    }
    return { positions, reinforcements, traps, cameras, roam };
  }

  const poolCache = new Map();
  function rolePool(m, ops, side, archetype) {
    const key = `${Object.keys(M).find(k => M[k] === m)}|${side}|${archetype}|${roleOrder(ops).map(op => `${op.role}:${op.gadget.class}`).join(',')}`;
    if (!poolCache.has(key)) {
      const r = mulberry32(hash(key));
      const style = D.ARCHETYPES[archetype].ai;
      const roleOps = ops.map(op => ({ ...op, id: op.role }));
      poolCache.set(key, Array.from({ length: C.poolSize }, () => (side === 'ATK' ? suggestPlan(m, roleOps, {}, r, style) : suggestSetup(m, roleOps, r, style))));
    }
    return poolCache.get(key);
  }

  const archetypeOf = ops => ops.find(op => op.archetype)?.archetype ?? null;
  const remap = (value, idOf) => JSON.parse(JSON.stringify(value), (_, v) => (typeof v === 'string' && Object.hasOwn(idOf, v) ? idOf[v] : v));

  function pool(map, ops, side, archetype = archetypeOf(ops) ?? 'Balanced') {
    const m = mapOf(map);
    const roles = ops.map(op => op.role);
    if (new Set(roles).size !== roles.length) return [];
    const idOf = Object.fromEntries(ops.map(op => [op.role, op.id]));
    const fix = v => {
      const out = remap(v, idOf);
      for (const k of ['positions', 'roam', 'traps', 'cameras', 'gadgets']) if (v[k]) out[k] = Object.fromEntries(Object.entries(v[k]).map(([role, x]) => [idOf[role], x]));
      return out;
    };
    return rolePool(m, ops, side, archetype).map(fix);
  }

  function aiPick(map, ops, side, r) {
    const own = archetypeOf(ops);
    const names = !own || own === 'Balanced' ? Object.keys(D.ARCHETYPES) : [own];
    const entries = names.flatMap(a => pool(map, ops, side, a).map((value, i) => ({ value, key: `${a}#${i}`, weight: C.poolWeights[i] ?? 1 })));
    if (!entries.length) return { value: side === 'ATK' ? suggestPlan(map, ops, {}, r) : suggestSetup(map, ops, r), key: 'suggested' };
    return weightedPick(entries, e => e.weight, r);
  }

  function adaptPlan(map, atkOps, plan, revealed) {
    const closed = revealed.reinforcements ?? [];
    const opOf = id => atkOps.find(op => op.id === id);
    const gadgets = { ...(plan.gadgets ?? {}) };
    const groups = plan.groups.map(g => {
      const group = g.ops.map(opOf);
      const breacher = g.ops.find(id => useOf(opOf(id)) === 'breach');
      const hit = doorsOf(g.path).filter(d => closed.includes(d));
      if (!hit.length) return g;
      if (breacher && hit.length === 1) {
        gadgets[breacher] = hit[0];
        return g;
      }
      const cost = planCost(revealed, group);
      const best = [...lanes(map).candidates].sort((x, y) => cost(x) - cost(y))[0];
      if (breacher) delete gadgets[breacher];
      return { ...g, path: [...best] };
    });
    for (const [id, target] of Object.entries(gadgets)) {
      const path = groups.find(g => g.ops.includes(id))?.path;
      if (!path || !(isDoorTarget(target) ? doorsOf(path).includes(target) : path.includes(target))) delete gadgets[id];
    }
    return { groups, gadgets };
  }

  function replan(st) {
    const out = {};
    st.groups.forEach((g, i) => {
      const hit = doorsOf(g.path).filter(d => st.known.has(d));
      const group = g.ops.map(id => st.byId[id]);
      if (!hit.length || (hit.length === 1 && group.some(op => useOf(op) === 'breach' && st.gadgetUse[op.id] > 0))) return;
      const cost = planCost(st.revealed, group);
      const best = paths(st.map, g.path[0], siteOf(st), 40).filter(p => !doorsOf(p).some(d => st.known.has(d))).sort((x, y) => cost(x) - cost(y))[0] ?? route(st.map, g.path[0], siteOf(st), null, st.known);
      g.path = [...best];
      out[i] = [...best];
    });
    return out;
  }

  const sideRand = (seed, side) => (seed === null || seed === undefined ? rand : mulberry32(hash(`${seed}|${side}`)));

  function validateSetup(map, defOps, setup) {
    const m = mapOf(map);
    const fail = msg => {
      throw new Error(`invalid setup: ${msg}`);
    };
    const ids = defOps.map(op => op.id);
    const zoneOk = z => z in m.zones && !m.spawns.includes(z);
    if (!setup || typeof setup.positions !== 'object') fail('positions missing');
    for (const id of ids) if (!zoneOk(setup.positions[id])) fail(`${id} needs a position on a non-spawn zone`);
    for (const id of [...Object.keys(setup.positions), ...Object.keys(setup.roam ?? {})]) if (!ids.includes(id)) fail(`unknown operator ${id}`);
    const count = {};
    for (const z of Object.values(setup.positions)) if ((count[z] = (count[z] ?? 0) + 1) > C.zoneCapacity) fail(`at most ${C.zoneCapacity} defenders in ${z}`);
    const list = setup.reinforcements ?? [];
    const max = reinforceCharges(defOps);
    if (!Array.isArray(list) || list.length > max) fail(`at most ${max} reinforcements`);
    if (new Set(list).size !== list.length || !list.every(d => isDoor(m, d))) fail('reinforcements must be distinct doors');
    if (cutsOff(m, new Set(list))) fail(`reinforcements may not cut a room off from the site or leave it fewer than ${C.siteOpenDoors} open doors`);
    for (const [key, ok, what] of [['traps', d => isDoor(m, d) && !list.includes(d), 'an unreinforced door'], ['cameras', z => z in m.zones, 'a zone']]) {
      const placed = setup[key] ?? {};
      if (typeof placed !== 'object' || Array.isArray(placed)) fail(`${key} must map operators to targets`);
      for (const [id, target] of Object.entries(placed)) {
        const op = defOps.find(o => o.id === id);
        if (!op || !(key === 'traps' ? isTrapOp(op) : useOf(op) === 'camera')) fail(`${id} has no gadget for ${key}`);
        if (!ok(target)) fail(`${id} needs ${what}`);
      }
      if (new Set(Object.values(placed)).size !== Object.keys(placed).length) fail(`${key} must be on distinct targets`);
    }
    return true;
  }

  function validatePlan(map, atkOps, plan) {
    const m = mapOf(map);
    const adj = graph(m);
    const fail = msg => {
      throw new Error(`invalid plan: ${msg}`);
    };
    const groups = plan?.groups ?? [];
    if (groups.length < 1 || groups.length > C.maxGroups) fail(`1 to ${C.maxGroups} groups`);
    const ids = atkOps.map(op => op.id);
    const listed = groups.flatMap(g => g.ops ?? []);
    if (groups.some(g => !g.ops?.length) || listed.length !== ids.length || new Set(listed).size !== ids.length || !ids.every(id => listed.includes(id))) fail('every operator in exactly one group');
    if (groups.some(g => g.ops.length > C.maxGroupSize)) fail(`1 to ${C.maxGroupSize} operators per group`);
    for (const { path } of groups) {
      if (!Array.isArray(path) || !m.spawns.includes(path[0]) || path[path.length - 1] !== m.site) fail('a path runs from a spawn to the site');
      if (new Set(path).size !== path.length || !path.every((z, i) => z in m.zones && (i === 0 || adj[z].includes(path[i - 1])))) fail(`path ${path.join('-')} must be simple and follow edges`);
    }
    for (const [id, target] of Object.entries(plan.gadgets ?? {})) {
      const op = atkOps.find(o => o.id === id);
      const targets = op && D.GADGET_TARGETS[useOf(op)];
      if (!targets || !['reveal', 'breach', 'smoke', 'emp'].includes(useOf(op))) fail(`${id} has no gadget to place`);
      const path = groups.find(g => g.ops.includes(id)).path;
      const door = isDoorTarget(target);
      if (!(door ? doorsOf(path).includes(target) : path.includes(target))) fail(`${id} places its gadget off its path`);
      if (!targets.includes(door ? 'door' : 'zone')) fail(`${id}'s ${op.gadget.class} cannot target a ${door ? 'door' : 'zone'}`);
    }
    return true;
  }

  function reveal(map, setup, learned = [], gadgets = {}, atkOps = [], defOps = []) {
    const adj = graph(map);
    const exact = new Set();
    const seen = new Set();
    for (const [id, z] of Object.entries(gadgets)) {
      const op = atkOps.find(o => o.id === id);
      if (op && useOf(op) === 'reveal') {
        exact.add(z);
        for (const x of [z, ...adj[z]]) seen.add(x);
      }
    }
    const touches = (d, set) => doorZones(d).some(z => set.has(z));
    const tier = id => defOps.find(op => op.id === id)?.gadget.tier ?? 1;
    return {
      reinforcements: (setup.reinforcements ?? []).filter(d => learned.includes('reinforcements') || touches(d, seen)),
      traps: Object.entries(setup.traps ?? {}).filter(([id, d]) => learned.includes('traps') || touches(d, exact) || (tier(id) < C.trapRevealTier && touches(d, seen))).map(([, d]) => d),
      positions: Object.fromEntries(Object.entries(setup.positions).filter(([, z]) => learned.includes('positions') || seen.has(z))),
    };
  }

  function context(st, side, situation, zoneType, phase, zoneId = null, trapped = []) {
    const ctx = {
      side, situation, zone: zoneType, zoneId, space: zoneType && D.ZONES[zoneType].space, step: st.step, phase, intel: st.intel,
      alive: { ATK: alive(st, 'ATK').length, DEF: alive(st, 'DEF').length }, planted: st.planted, rand, armed: st.armed[side],
      trapped, gadgetUse: side === 'ATK' ? st.gadgetUse ?? null : null,
    };
    ctx.team = teamStats(alive(st, side), ctx);
    return ctx;
  }

  function intelScore(st, side) {
    const ctx = context(st, side, 'Info', null, 'Intel');
    return sum(st.ops[side], op => operatorScore(op, ctx).score);
  }

  function resolveIntel(st) {
    const atk = intelScore(st, 'ATK');
    const def = intelScore(st, 'DEF');
    const diff = (atk - def) / (st.ops.ATK.length + st.ops.DEF.length) + noise(C.intelRandom);
    const winner = diff > 0 ? 'ATK' : 'DEF';
    const bucket = D.INTEL_BUCKETS.findLast(b => Math.abs(diff) >= b.min);
    st.intel = { [winner]: bucket.win, [other(winner)]: bucket.lose };
    return { atkIntel: atk, defIntel: def, diff, winner, buff: bucket.win, debuff: bucket.lose, learned: winner === 'ATK' ? bucket.reveal : [] };
  }

  function phaseOf(st) {
    if (st.planted) return 'Post-plant';
    if (st.step >= C.cleanupFrom) return 'Cleanup';
    if (st.step <= C.entryUntil) return 'Entry';
    return 'Main';
  }

  const siteOf = st => M[st.map].site;
  const liveIds = (st, g) => g.ops.filter(id => st.byId[id].alive);
  const liveGroup = (st, g) => liveIds(st, g).length > 0;
  const lead = (st, g) => {
    const ids = liveIds(st, g);
    if (ids.length) g.at = Math.max(...ids.map(id => st.idx[id]));
    return g.at;
  };
  const zoneOf = (st, g) => g.path[lead(st, g)];
  const atkZone = (st, id) => st.groups[st.groupOf[id]].path[st.idx[id]];
  const attackersAt = (st, z) => alive(st, 'ATK').filter(op => atkZone(st, op.id) === z);
  const defendersAt = (st, z) => alive(st, 'DEF').filter(op => st.pos[op.id] === z);
  const roomFor = (st, z) => (M[st.map].spawns.includes(z) ? Infinity : C.zoneCapacity - attackersAt(st, z).length);

  function pickSituation(st, zoneId, zoneType, here) {
    if (st.planted && zoneId === siteOf(st)) return 'Objective';
    if (Math.abs(alive(st, 'ATK').length - alive(st, 'DEF').length) >= C.clutchGap) return 'Clutch';
    if (st.step >= C.cleanupFrom) return 'Gunfight';
    if (st.control[zoneId] === 1) return 'Gunfight';
    if (here.some(i => st.groups[i].path[1] === zoneId)) return 'Breach';
    if (zoneType === 'Site') return 'Objective';
    if (here.some(i => !st.groups[i].utility)) return 'Utility';
    return D.ZONES[zoneType].situation;
  }

  function teamScore(st, ctx, fighters, supporters, enemies, planning, hold) {
    const side = ctx.side;
    const scores = fighters.map(op => ({ op, ...operatorScore(op, ctx) }));
    const support = supporters.map(op => ({ op, ...operatorScore(op, ctx) }));
    const parts = {
      avg: (sum(scores, x => x.score) + C.supportFactor * sum(support, x => x.score)) / (scores.length + C.supportFactor * support.length),
      numbers: C.numbersBonus * Math.max(-C.numbersCap, Math.min(C.numbersCap, fighters.length + C.supportFactor * supporters.length - enemies)),
      crowd: 0,
      pinch: 0,
      hold,
      zone: C.zoneControlBonus * Math.max(-1, st.control[ctx.zoneId]) * (side === 'ATK' ? 1 : -1),
      momentum: st.momentum === side ? C.momentumBonus : 0,
      planning,
      random: noise(C.randomRange),
    };
    return { scores, support, ...parts, total: sum(Object.values(parts), x => x) };
  }

  function pickKills(victims, supporters, killers, count) {
    const pool = [...victims, ...supporters];
    const kills = [];
    while (kills.length < count && pool.length && killers.length) {
      const victim = weightedPick(pool, x => Object.values(x.parts.risk).reduce((a, k) => a * k, 1) / Math.max(1, x.score) ** 2);
      pool.splice(pool.indexOf(victim), 1);
      const supporter = supporters.includes(victim);
      if (supporter) for (const x of supporters) if (pool.includes(x)) pool.splice(pool.indexOf(x), 1);
      kills.push({ victim: victim.op, killer: weightedPick(killers, x => Math.max(1, x.score) ** 2).op, supporter });
    }
    return kills;
  }

  function take(st, z, events) {
    if (z !== siteOf(st)) events.push({ type: 'taken', zone: z });
    else if (!st.planted) {
      st.planted = true;
      st.plantedAt = st.step;
      st.control[z] = 0;
      events.push({ type: 'planted', zone: z });
    }
  }

  const doorEntry = (mv, d) => (mv.doors[d] ??= { crossed: [], queued: [], blocked: [], trap: null, breached: null });
  const doorCap = (st, mv, side, d) => (st.opened.has(d) || (side === 'ATK' && mv.slow.has(d)) ? 1 : C.doorCapacity) - (mv.used[side][d] ?? 0);

  function cross(st, mv, i, ids, from, to) {
    const g = st.groups[i];
    const d = doorId(from, to);
    const entry = doorEntry(mv, d);
    let n = Math.max(0, Math.min(doorCap(st, mv, 'ATK', d), roomFor(st, to), ids.length));
    const trap = n ? st.traps.get(d) : null;
    if (trap && !trap.revealed) {
      st.traps.delete(d);
      entry.trap = trap.kind === 'wire' ? 'sprung' : 'alarm';
      if (trap.kind === 'wire') {
        g.trapped = true;
        mv.slow.add(d);
        n = 1;
      }
      mv.events.push({ type: trap.kind === 'wire' ? 'trap' : 'alarm', group: i, door: d, zone: to }, { type: 'reveal', group: i, zone: to });
      mv.spotted.add(i);
    } else if (trap) {
      if (liveIds(st, g).some(id => st.byId[id].role === 'Utility Specialist') || doorZones(d).some(z => st.emp.has(z))) {
        st.traps.delete(d);
        entry.trap = 'disarmed';
        mv.events.push({ type: 'disarm', group: i, door: d });
      } else {
        entry.trap = 'careful';
        mv.slow.add(d);
        n = 1;
      }
    }
    for (const id of ids.slice(0, n)) {
      st.idx[id]++;
      st.via[id] = from;
      st.since[id] = st.step;
    }
    mv.used.ATK[d] = (mv.used.ATK[d] ?? 0) + n;
    entry.crossed.push(...ids.slice(0, n));
    entry.queued.push(...ids.slice(n));
    return n;
  }

  function advanceFront(st, mv, i) {
    const g = st.groups[i];
    const F = g.at;
    const from = g.path[F];
    const to = g.path[F + 1];
    const d = doorId(from, to);
    const ids = liveIds(st, g).filter(id => st.idx[id] === F);
    if (st.reinforced.has(d)) {
      const entry = doorEntry(mv, d);
      const breacher = ids.find(id => useOf(st.byId[id]) === 'breach' && st.gadgetUse[id] > 0);
      if (!breacher) {
        entry.blocked.push(i);
        st.known.add(d);
        const coming = liveIds(st, g).find(id => useOf(st.byId[id]) === 'breach' && st.gadgetUse[id] > 0);
        mv.events.push({ type: 'blocked', group: i, door: d, zone: from, ...(coming ? { waitFor: coming } : {}) });
        if (coming) return;
        const detour = route(st.map, from, siteOf(st), null, st.known);
        if (detour) {
          g.path = [...g.path.slice(0, F), ...detour];
          mv.events.push({ type: 'reroute', group: i, from: to, to: from, path: [...g.path], door: d });
        }
        return;
      }
      st.reinforced.delete(d);
      st.opened.add(d);
      st.known.delete(d);
      st.gadgetUse[breacher] = 0;
      entry.breached = breacher;
      mv.events.push({ type: 'breach', group: i, op: breacher, door: d });
    }
    if (cross(st, mv, i, ids, from, to)) g.at = F + 1;
  }

  function supportersFor(st, z, contested, taken) {
    const adj = graph(st.map)[z];
    const ok = (op, at) => adj.includes(at) && !contested.has(at) && !st.reinforced.has(doorId(at, z)) && !taken.has(op.id);
    return {
      ATK: alive(st, 'ATK').filter(op => ok(op, atkZone(st, op.id))),
      DEF: alive(st, 'DEF').filter(op => ok(op, st.pos[op.id])),
    };
  }

  function entrySides(st, z, fighters, supporters) {
    const since = side => Math.min(...fighters[side].map(op => st.since[op.id]));
    const occupant = since('ATK') < since('DEF') ? 'ATK' : since('DEF') < since('ATK') ? 'DEF' : null;
    if (!occupant) return { occupant, doors: [], value: 0 };
    const side = other(occupant);
    const at = op => (side === 'ATK' ? atkZone(st, op.id) : st.pos[op.id]);
    const byDoor = new Map();
    const add = (op, from, weight) => {
      const e = byDoor.get(from) ?? { from, door: doorId(from, z), ops: [], weight: 0 };
      e.ops.push(op.id);
      e.weight += weight;
      byDoor.set(from, e);
    };
    for (const op of fighters[side]) add(op, st.via[op.id] ?? z, 1);
    for (const op of supporters[side]) add(op, at(op), C.supportFactor);
    const first = (st.fronts[z] ??= {});
    for (const from of byDoor.keys()) first[from] ??= st.step;
    const list = [...byDoor.values()];
    const earliest = Math.min(...list.map(e => first[e.from]));
    const latest = Math.max(...list.map(e => first[e.from]));
    const doorsOut = list.map(e => {
      const smoke = side === 'ATK' && st.smokeDoors.has(e.door);
      const base = list.length === 1 ? C.holdBonus : list.length >= 3 ? -C.splitPenalty : first[e.from] === earliest && earliest < latest ? C.holdBonus : -C.splitPenalty;
      const groups = side === 'ATK' ? [...new Set(e.ops.map(id => st.groupOf[id]))].sort((a, b) => a - b) : [];
      return { ...e, groups, first: first[e.from], smoke, value: smoke ? Math.min(0, base) : base };
    });
    return { occupant, doors: doorsOut, value: sum(doorsOut, e => e.value * e.weight) / sum(doorsOut, e => e.weight) };
  }

  function retreat(st, mv, i, z, events) {
    const g = st.groups[i];
    const k = g.at;
    if (k === 0) return;
    const back = g.path[k - 1];
    const detour = route(st.map, back, siteOf(st), z, st.known);
    if (!detour || detour.length - (g.path.length - 1 - k) > C.rerouteMaxExtra) return;
    const ids = liveIds(st, g).filter(id => st.idx[id] === k);
    const d = doorId(back, z);
    if (ids.length > Math.min(doorCap(st, mv, 'ATK', d), roomFor(st, back))) return;
    for (const id of ids) {
      st.idx[id] = k - 1;
      st.via[id] = z;
      st.since[id] = st.step;
    }
    mv.used.ATK[d] = (mv.used.ATK[d] ?? 0) + ids.length;
    doorEntry(mv, d).crossed.push(...ids);
    g.path = [...g.path.slice(0, k - 1), ...detour];
    g.at = k - 1;
    events.push({ type: 'reroute', group: i, from: z, to: back, path: [...g.path] });
  }

  function fight(st, mv, z, phase, events) {
    const zoneType = M[st.map].zones[z].type;
    const fighters = { ATK: attackersAt(st, z), DEF: defendersAt(st, z) };
    const here = [...new Set(fighters.ATK.map(op => st.groupOf[op.id]))].sort((a, b) => a - b);
    const situation = pickSituation(st, z, zoneType, here);
    if (situation === 'Utility') for (const i of here) st.groups[i].utility = true;
    const supporters = supportersFor(st, z, mv.contested, mv.supporting);
    for (const side of ['ATK', 'DEF']) for (const op of supporters[side]) mv.supporting.add(op.id);
    const entry = entrySides(st, z, fighters, supporters);
    const trappedGroups = here.filter(i => st.groups[i].trapped);
    const modifiers = {
      reinforced: graph(st.map)[z].some(n => st.reinforced.has(doorId(n, z))), trapped: trappedGroups, smoke: st.smokeZones.has(z),
      revealed: Object.values(st.revealed.positions).includes(z),
    };
    const pressure = situation === 'Breach' || situation === 'Objective';
    const planning = pressure && modifiers.smoke ? C.smokeBonus : 0;
    const trappedOps = trappedGroups.flatMap(i => st.groups[i].ops);
    const team = {};
    for (const side of ['ATK', 'DEF']) {
      const ctx = context(st, side, situation, zoneType, phase, z, side === 'ATK' ? trappedOps : []);
      team[side] = teamScore(st, ctx, fighters[side], supporters[side], fighters[other(side)].length + C.supportFactor * supporters[other(side)].length, side === 'ATK' ? planning : 0, entry.occupant === side ? entry.value : 0);
    }
    for (const i of trappedGroups) st.groups[i].trapped = false;
    for (const i of here) mv.spotted.add(i);
    const diff = team.ATK.total - team.DEF.total;
    const winner = diff > 0 ? 'ATK' : 'DEF';
    const loser = other(winner);
    const strength = Math.abs(diff) >= C.dominantAt ? 2 : Math.abs(diff) >= C.clearAt ? 1 : 0;
    const kills = pickKills(team[loser].scores, strength === 2 ? team[loser].support : [], team[winner].scores, D.CASUALTIES[situation][strength]);
    for (const k of kills) {
      k.victim.alive = false;
      k.victim.diedAt = st.step;
      k.killer.kills++;
    }
    for (const side of ['ATK', 'DEF']) {
      for (const x of team[side].scores) {
        x.op.scoreSum += x.score;
        x.op.fights++;
      }
    }
    const statusBefore = st.control[z];
    st.control[z] = Math.max(-1, Math.min(1, statusBefore + C.zoneShift[strength] * (winner === 'ATK' ? 1 : -1)));
    const before = events.length;
    if (winner === 'ATK' && statusBefore < 1 && st.control[z] === 1) take(st, z, events);
    if (winner === 'DEF' && strength > 0 && statusBefore < 1 && !(st.planted && z === siteOf(st))) {
      for (const i of here) if (liveGroup(st, st.groups[i]) && zoneOf(st, st.groups[i]) === z) retreat(st, mv, i, z, events);
    }
    const summary = t => ({
      ...t, scores: t.scores.map(x => ({ id: x.op.id, name: x.op.name, score: x.score, parts: x.parts })),
      support: t.support.map(x => ({ id: x.op.id, name: x.op.name, score: x.score, parts: x.parts })),
    });
    return {
      step: st.step, phase, situation, zone: z, zoneType, groups: here, modifiers, statusBefore, status: st.control[z],
      ATK: summary(team.ATK), DEF: summary(team.DEF), diff, winner, strength: D.STRENGTHS[strength],
      supporters: { ATK: supporters.ATK.map(op => op.id), DEF: supporters.DEF.map(op => op.id) }, entrySides: entry,
      kills: kills.map(k => ({ killer: k.killer.name, killerId: k.killer.id, victim: k.victim.name, victimId: k.victim.id, side: sideOf(k.victim), zone: z, supporter: k.supporter })),
      event: events.slice(before).find(e => e.type === 'taken' || e.type === 'planted')?.type ?? null,
    };
  }

  function snapshot(st) {
    return {
      groups: Object.fromEntries(st.groups.map((g, i) => [i, zoneOf(st, g)])),
      attackers: Object.fromEntries(st.ops.ATK.map(op => [op.id, atkZone(st, op.id)])),
      defenders: Object.fromEntries(st.ops.DEF.map(op => [op.id, st.pos[op.id]])),
      control: { ...st.control },
    };
  }

  const queuedOf = st => Object.fromEntries(st.groups.map((g, i) => [i, liveIds(st, g).filter(id => st.idx[id] < lead(st, g))]));

  function rotate(st, mv, fights, events) {
    const fought = new Set(fights.map(f => f.zone));
    const free = op => !fought.has(st.pos[op.id]);
    for (const f of fights) {
      if (f.winner !== 'ATK' || f.strength !== 'Dominant') continue;
      const holder = alive(st, 'DEF').filter(op => free(op) && !st.roam.has(op.id) && st.pos[op.id] !== siteOf(st))
        .sort((a, b) => dist(st.map, st.pos[a.id], f.zone) - dist(st.map, st.pos[b.id], f.zone))[0];
      if (holder) st.roam.add(holder.id);
    }
    const targets = st.planted ? [siteOf(st)] : [...new Set(st.groups.map((g, i) => (liveGroup(st, g) ? st.seen[i] : undefined)).filter(z => z !== undefined))];
    for (const op of alive(st, 'DEF')) {
      if (!free(op) || !(st.planted || st.roam.has(op.id))) continue;
      const from = st.pos[op.id];
      const target = targets.map(z => [z, route(st.map, from, z, null, st.reinforced)]).filter(([, p]) => p).sort((a, b) => a[1].length - b[1].length)[0];
      if (!target || target[1].length === 1) continue;
      if (!st.planted && target[1].length === 2 && attackersAt(st, target[0]).length > C.roamHold) continue;
      const to = target[1][1];
      if (M[st.map].spawns.includes(to)) continue;
      const d = doorId(from, to);
      if (doorCap(st, mv, 'DEF', d) < 1 || defendersAt(st, to).length >= C.zoneCapacity) {
        doorEntry(mv, d).queued.push(op.id);
        continue;
      }
      st.pos[op.id] = to;
      st.via[op.id] = from;
      st.since[op.id] = st.step;
      mv.used.DEF[d] = (mv.used.DEF[d] ?? 0) + 1;
      doorEntry(mv, d).crossed.push(op.id);
      events.push({ type: 'rotate', op: op.id, from, to });
    }
  }

  function resolveStep(st) {
    const m = M[st.map];
    const adj = graph(m);
    const phase = phaseOf(st);
    const events = [];
    const mv = { events, doors: {}, used: { ATK: {}, DEF: {} }, slow: new Set(), spotted: new Set(), contested: new Set(), supporting: new Set() };
    for (const g of st.groups) lead(st, g);
    const left = g => g.path.length - 1 - g.at;
    const blocked = g => !left(g) || st.control[g.path[g.at]] < 1 || defendersAt(st, g.path[g.at]).length > 0;
    const lag = st.groups.map(g => (liveGroup(st, g) && left(g) ? left(g) - 1 + (blocked(g) ? 1 : 0) : 0));
    const waiting = [];
    st.groups.forEach((g, i) => {
      if (!liveGroup(st, g)) return;
      const F = g.at;
      const trailing = liveIds(st, g).filter(id => st.idx[id] < F).sort((a, b) => st.idx[b] - st.idx[a]);
      if (!blocked(g)) {
        if (left(g) === 1 && !st.planted && g.waited < C.syncWait && lag.some((n, j) => j !== i && n > C.syncHops && st.groups[j].path[st.groups[j].path.length - 2] !== g.path[g.path.length - 2])) {
          waiting.push(i);
          g.waited++;
        } else advanceFront(st, mv, i);
      }
      for (const id of trailing) {
        const k = st.idx[id];
        if (!defendersAt(st, g.path[k]).length) cross(st, mv, i, [id], g.path[k], g.path[k + 1]);
      }
    });
    for (const z of Object.keys(m.zones)) if (attackersAt(st, z).length && defendersAt(st, z).length) mv.contested.add(z);
    const fights = [];
    for (const z of Object.keys(m.zones)) if (attackersAt(st, z).length && defendersAt(st, z).length) fights.push(fight(st, mv, z, phase, events));
    const fought = new Set(fights.map(f => f.zone));
    for (const z of Object.keys(m.zones)) {
      if (fought.has(z)) continue;
      const atkHere = attackersAt(st, z).length > 0;
      const defHere = defendersAt(st, z).length > 0;
      if (atkHere && !defHere && st.control[z] < 1) {
        st.control[z] = Math.min(1, st.control[z] + C.zoneShift[1]);
        if (st.control[z] === 1) take(st, z, events);
      } else if (!atkHere && defHere && st.planted && z === m.site) {
        st.control[z] = Math.max(-1, st.control[z] - C.zoneShift[1]);
      }
    }
    for (const cam of st.cameras) {
      const view = [cam, ...adj[cam]];
      st.groups.forEach((g, i) => {
        if (liveIds(st, g).some(id => view.includes(atkZone(st, id)))) mv.spotted.add(i);
      });
    }
    const spotted = [...mv.spotted].filter(i => liveGroup(st, st.groups[i])).sort((a, b) => a - b);
    for (const i of spotted) st.seen[i] = zoneOf(st, st.groups[i]);
    rotate(st, mv, fights, events);
    for (const z of Object.keys(st.fronts)) if (!fought.has(z)) delete st.fronts[z];
    const wins = side => fights.filter(f => f.winner === side).length;
    st.momentum = wins('ATK') > wins('DEF') ? 'ATK' : wins('DEF') > wins('ATK') ? 'DEF' : null;
    st.log.push({
      step: st.step, phase, ...snapshot(st), fights, events, kills: fights.flatMap(f => f.kills), waiting,
      doors: mv.doors, queued: queuedOf(st), spotted: Object.fromEntries(spotted.map(i => [i, st.seen[i]])),
    });
  }

  function checkEnd(st) {
    if (!alive(st, 'ATK').length) return { winner: 'DEF', reason: 'Elimination' };
    if (!alive(st, 'DEF').length) return { winner: 'ATK', reason: 'Elimination' };
    if (st.planted && st.control[siteOf(st)] === -1) return { winner: 'DEF', reason: 'Defused', event: 'defused' };
    if (st.planted && st.step - st.plantedAt >= C.bombSteps) return { winner: 'ATK', reason: 'Detonation', event: 'detonated' };
    if (!st.planted && st.step >= C.maxSteps) return { winner: 'DEF', reason: 'Time out', event: 'timeout' };
    return null;
  }

  function withSeed(seed, fn) {
    const shared = rand;
    if (seed !== null && seed !== undefined) rand = mulberry32(seed);
    try {
      return fn();
    } finally {
      rand = shared;
    }
  }

  const armList = ids => (ids === null || ids === undefined ? [] : Array.isArray(ids) ? [...ids] : [ids]);

  function startRound(atkOps, defOps, map, { setup, defTemplate, seed = null, armed = {} }) {
    mapOf(map);
    const prep = op => ({ ...op, alive: true, kills: 0, scoreSum: 0, fights: 0, diedAt: null });
    const st = {
      map, seed, armed: { ATK: armList(armed.ATK), DEF: armList(armed.DEF) }, ops: { ATK: atkOps.map(prep), DEF: defOps.map(prep) },
      step: 0, planted: false, plantedAt: null, momentum: null, intel: {}, log: [], result: null, templates: { ATK: null, DEF: null }, pools: { ATK: null, DEF: null },
    };
    Object.defineProperty(st, 'byId', { value: Object.fromEntries([...st.ops.ATK, ...st.ops.DEF].map(op => [op.id, op])) });
    if (setup) st.setup = setup;
    else if (defTemplate) {
      st.templates.DEF = templateKey(defTemplate, D.DEF_TEMPLATES, 'S');
      st.setup = defaultSetup(map, st.ops.DEF, st.templates.DEF);
    } else {
      const ai = aiPick(map, st.ops.DEF, 'DEF', sideRand(seed, 'DEF'));
      st.setup = ai.value;
      st.pools.DEF = ai.key;
    }
    validateSetup(map, st.ops.DEF, st.setup);
    return { st, intel: resolveIntel(st) };
  }

  function playRound(atkOps, defOps, map, options = {}) {
    return withSeed(options.seed, () => {
      const { st, intel } = startRound(atkOps, defOps, map, options);
      const m = M[map];
      if (options.plan) st.plan = options.plan;
      else if (options.atkTemplate) {
        st.templates.ATK = templateKey(options.atkTemplate, D.ATK_TEMPLATES, 'A');
        st.plan = defaultPlan(map, st.ops.ATK, st.templates.ATK, reveal(map, st.setup, intel.learned, {}, [], st.ops.DEF));
      } else {
        const ai = aiPick(map, st.ops.ATK, 'ATK', sideRand(options.seed, 'ATK'));
        st.plan = adaptPlan(map, st.ops.ATK, ai.value, reveal(map, st.setup, intel.learned, {}, [], st.ops.DEF));
        st.pools.ATK = ai.key;
      }
      validatePlan(map, st.ops.ATK, st.plan);
      const gadgets = st.plan.gadgets ?? {};
      const placed = Object.entries(gadgets).map(([id, target]) => [target, useOf(st.byId[id])]);
      st.reinforced = new Set(st.setup.reinforcements ?? []);
      const canceled = placed.filter(([d, use]) => use === 'breach' && st.reinforced.has(d)).map(([d]) => d);
      for (const d of canceled) st.reinforced.delete(d);
      st.opened = new Set(canceled);
      st.smokeZones = new Set(placed.filter(([t, use]) => use === 'smoke' && !isDoorTarget(t)).map(([t]) => t));
      st.smokeDoors = new Set(placed.filter(([t, use]) => use === 'smoke' && isDoorTarget(t)).map(([t]) => t));
      st.emp = new Set(placed.filter(([, use]) => use === 'emp').map(([t]) => t));
      st.revealed = reveal(map, st.setup, intel.learned, gadgets, st.ops.ATK, st.ops.DEF);
      st.traps = new Map(Object.entries(st.setup.traps ?? {}).map(([id, d]) => [d, { op: id, kind: useOf(st.byId[id]) === 'trap' ? 'wire' : 'alarm', revealed: st.revealed.traps.includes(d) }]));
      st.cameras = new Set(Object.values(st.setup.cameras ?? {}));
      st.known = new Set(st.revealed.reinforcements.filter(d => st.reinforced.has(d)));
      st.gadgetUse = Object.fromEntries(st.ops.ATK.map(op => [op.id, op.id in gadgets ? 0 : C.unspentGadgetFactor]));
      st.control = Object.fromEntries(Object.keys(m.zones).map(z => [z, m.spawns.includes(z) ? 1 : -1]));
      st.groups = st.plan.groups.map(g => ({ ops: [...g.ops], path: [...g.path], at: 0, utility: false, trapped: false, waited: 0 }));
      st.groupOf = Object.fromEntries(st.groups.flatMap((g, i) => g.ops.map(id => [id, i])));
      st.idx = Object.fromEntries(st.ops.ATK.map(op => [op.id, 0]));
      st.since = Object.fromEntries([...st.ops.ATK, ...st.ops.DEF].map(op => [op.id, 0]));
      st.via = Object.fromEntries([...st.ops.ATK, ...st.ops.DEF].map(op => [op.id, null]));
      st.pos = { ...st.setup.positions };
      st.roam = new Set(Object.keys(st.setup.roam ?? {}).filter(id => st.setup.roam[id]));
      st.seen = {};
      st.fronts = {};
      const replanned = replan(st);
      st.log.push({
        step: 0, phase: 'Planning', setup: st.setup, intel, revealed: st.revealed, plan: st.plan, canceled, replanned, ...snapshot(st),
        fights: [], events: [], kills: [], waiting: [], doors: {}, queued: queuedOf(st), spotted: {},
      });
      while (!st.result) {
        st.step++;
        resolveStep(st);
        st.result = checkEnd(st);
      }
      const { event, ...result } = st.result;
      if (event) st.log[st.log.length - 1].events.push({ type: event });
      st.result = result;
      return st;
    });
  }

  function newMatch(player, enemy, map) {
    mapOf(map);
    return { player, enemy, map, score: { player: 0, enemy: 0 }, rounds: [], used: {}, tiebreakSide: null, over: false };
  }

  function nextPlayerSide(match) {
    const n = match.rounds.length + 1;
    if (n < 2 * C.roundsToWin - 1) return n % 2 ? 'ATK' : 'DEF';
    if (!match.tiebreakSide) match.tiebreakSide = randInt(1, 100) > 50 ? 'ATK' : 'DEF';
    return match.tiebreakSide;
  }

  function armable(match, owner) {
    const side = nextPlayerSide(match);
    const own = owner === 'player' ? side : other(side);
    return match[owner].filter(op => sideOf(op) === own && op.active && !(op.id in match.used));
  }

  function armedIds(match, owner, ids) {
    if (ids === undefined) return armList(pick(armable(match, owner))?.id);
    const list = armList(ids);
    const ok = armable(match, owner).map(op => op.id);
    for (const id of list) if (!ok.includes(id)) throw new Error(`${id} cannot arm an ability this round`);
    if (new Set(list).size !== list.length) throw new Error('an ability is armed twice');
    return list;
  }

  function unusedAbilities(match, side = null, owner = 'player') {
    return match[owner].filter(op => op.active && !(op.id in match.used) && (!side || sideOf(op) === side)).map(op => {
      const a = D.ACTIVES[op.active];
      return { id: op.id, name: op.name, role: op.role, side: sideOf(op), active: op.active, situations: [...a.situations], zone: a.zone ?? null };
    });
  }

  function sides(match) {
    const side = nextPlayerSide(match);
    const [atk, def] = side === 'ATK' ? [match.player, match.enemy] : [match.enemy, match.player];
    return { side, atk, def, atkOps: atk.filter(op => sideOf(op) === 'ATK'), defOps: def.filter(op => sideOf(op) === 'DEF') };
  }

  function briefing(match, { setup, armed = null, enemyArmed, seed, defTemplate } = {}) {
    const { side, atkOps, defOps } = sides(match);
    const mine = armedIds(match, 'player', armed);
    const theirs = armedIds(match, 'enemy', enemyArmed);
    const roundSeed = seed ?? randInt(0, 2 ** 31 - 2);
    const defSetup = side === 'DEF' ? setup ?? defaultSetup(match.map, defOps, 'S')
      : defTemplate ? defaultSetup(match.map, defOps, defTemplate) : aiPick(match.map, defOps, 'DEF', sideRand(roundSeed, 'DEF')).value;
    const { intel } = withSeed(roundSeed, () => startRound(atkOps, defOps, match.map, { setup: defSetup, armed: { [side]: mine, [other(side)]: theirs } }));
    return { side, seed: roundSeed, armed: mine, enemyArmed: theirs, defSetup, intel, revealed: reveal(match.map, defSetup, intel.learned, {}, [], defOps) };
  }

  function playMatchRound(match, { setup, plan, defSetup, seed, armed = null, enemyArmed, atkTemplate, defTemplate } = {}) {
    const { side, atkOps, defOps } = sides(match);
    const mine = armedIds(match, 'player', armed);
    const theirs = armedIds(match, 'enemy', enemyArmed);
    const round = playRound(atkOps, defOps, match.map, {
      setup: side === 'DEF' ? setup : defSetup, plan: side === 'ATK' ? plan : undefined, atkTemplate, defTemplate,
      seed, armed: { [side]: mine, [other(side)]: theirs },
    });
    round.playerSide = side;
    for (const id of [...mine, ...theirs]) match.used[id] = match.rounds.length + 1;
    match.score[round.result.winner === side ? 'player' : 'enemy']++;
    match.rounds.push(round);
    match.over = Math.max(match.score.player, match.score.enemy) >= C.roundsToWin;
    return round;
  }

  function planOdds(atk, def, map, plan, setup, n = 300) {
    return withSeed(20261029, () => {
      let wins = 0;
      for (let i = 0; i < n; i++) if (playRound(atk, def, map, { plan, setup }).result.winner === 'ATK') wins++;
      return wins / n;
    });
  }

  function generateOperator(role, quality, name, id, archetype) {
    const template = D.ROSTER.find(op => op.role === role);
    const a = D.ARCHETYPES[archetype];
    const kit = { ...a, ...a.roles[role] };
    const mean = sum(D.STATS, s => template.stats[s]) / D.STATS.length;
    const stats = Object.fromEntries(D.STATS.map(s => [s, Math.round(clampStat(template.stats[s] - mean + quality + (a.shift[s] ?? 0) + noise(C.generatedSpread)))]));
    const gear = (slot, cls) => ({ ...template[slot], class: cls ?? template[slot].class });
    const weapon = cls => ({ ...gear('primary', cls), id: pick(D.WEAPON_CATALOG.filter(w => w.class === (cls ?? template.primary.class))).id });
    return {
      ...template, id, name, stats, archetype, playstyle: kit.playstyle ?? template.playstyle,
      gadget: gear('gadget'), primary: weapon(kit.primary), secondary: gear('secondary'), armor: gear('armor', kit.armor),
    };
  }

  function generateSquad(quality, archetype = pick(Object.keys(D.ARCHETYPES))) {
    const names = shuffle(D.CALLSIGNS);
    return Object.keys(D.ROLES).map((role, i) => generateOperator(role, quality, names[i], `g${++generated}`, archetype));
  }

  const cloneSquad = squad => squad.map(op => ({
    ...op, active: op.active ?? D.ROSTER.find(t => t.role === op.role).active, stats: { ...op.stats }, gadget: { ...op.gadget }, primary: { ...op.primary }, secondary: { ...op.secondary }, armor: { ...op.armor },
  }));

  const coverage = op => D.ACTIVES[op.active].situations.length;
  const bestArmable = (match, owner) => armable(match, owner).sort((a, b) => coverage(b) - coverage(a))[0]?.id ?? null;
  const planLabel = (r, side) => r.templates[side] ?? `(${r.pools[side]})`;

  function simulate({ player, matches, quality, map, mirror, archetype, playerArms, enemyArms, atkTemplate, defTemplate }) {
    const t = { matches, won: 0, rounds: 0, roundsWon: 0, atkWins: 0, steps: 0, reasons: {}, firstBlood: 0, firstBloodWon: 0, maps: {}, plans: {} };
    for (let i = 0; i < matches; i++) {
      const match = newMatch(cloneSquad(player), mirror ? cloneSquad(player).map((op, j) => ({ ...op, id: `m${j + 1}` })) : generateSquad(quality, archetype), map || pick(Object.keys(M)));
      while (!match.over) {
        const r = playMatchRound(match, { armed: playerArms ? bestArmable(match, 'player') : null, enemyArmed: enemyArms ? undefined : null, atkTemplate, defTemplate });
        const atkWon = r.result.winner === 'ATK';
        const reason = `${r.result.winner} · ${r.result.reason}`;
        t.reasons[reason] = (t.reasons[reason] ?? 0) + 1;
        t.rounds++;
        t.steps += r.step;
        if (atkWon) t.atkWins++;
        if (r.result.winner === r.playerSide) t.roundsWon++;
        const firstKill = r.log.find(s => s.kills.length)?.kills[0];
        if (firstKill) {
          t.firstBlood++;
          if (other(firstKill.side) === r.result.winner) t.firstBloodWon++;
        }
        for (const [table, key] of [[t.maps, match.map], [t.plans, `${match.map} · ${planLabel(r, 'ATK')}${planLabel(r, 'DEF')}`]]) {
          const row = (table[key] ??= { rounds: 0, atkWins: 0, steps: 0, timeouts: 0 });
          row.rounds++;
          row.steps += r.step;
          if (atkWon) row.atkWins++;
          if (r.result.reason === 'Time out') row.timeouts++;
        }
      }
      if (match.score.player > match.score.enemy) t.won++;
    }
    return t;
  }

  return {
    setRandom: fn => (rand = fn), mulberry32,
    sideOf, allowedPlaystyles, effectiveStats, situationScore, operatorScore,
    playRound, newMatch, nextPlayerSide, armable, unusedAbilities, briefing, playMatchRound, planOdds, generateSquad, cloneSquad, simulate,
    paths, dist, route, doors, doorId, doorsOf, lanes, reinforceCharges, defaultSetup, defaultPlan, suggestPlan, suggestSetup, pool, adaptPlan, validateSetup, validatePlan, reveal,
  };
})();

if (typeof module === 'object') module.exports = Engine;
