const assert = require('node:assert/strict');
const { DATA, MAPS, Engine } = require('./balance-core.js');
const pairs = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const onSegment = (p, a, b) => Math.abs(cross(a, b, p)) < 1e-5 && p.every((v, i) => v >= Math.min(a[i], b[i]) - 1e-6 && v <= Math.max(a[i], b[i]) + 1e-6);
const inside = (point, poly) => {
  const signs = pairs(poly).map(([a, b]) => cross(a, b, point));
  return signs.every(x => x > 1e-6) || signs.every(x => x < -1e-6);
};
const overlaps = (a, b) => ![...pairs(a), ...pairs(b)].some(([p, q]) => {
  const axis = [p[1] - q[1], q[0] - p[0]];
  const project = poly => poly.map(v => v[0] * axis[0] + v[1] * axis[1]);
  const left = project(a), right = project(b);
  return Math.max(...left) <= Math.min(...right) + 1e-6 || Math.max(...right) <= Math.min(...left) + 1e-6;
});

function edgeDisjoint(map) {
  const adj = Object.fromEntries([...Object.keys(map.zones), '#start'].map(id => [id, []]));
  const capacity = new Map();
  const link = (a, b, n) => {
    adj[a].push(b);
    adj[b].push(a);
    capacity.set(a + '>' + b, n);
    capacity.set(b + '>' + a, n === Infinity ? 0 : n);
  };
  for (const [a, b] of map.edges) link(a, b, 1);
  for (const spawn of map.spawns) link('#start', spawn, Infinity);
  let count = 0;
  for (;;) {
    const previous = { '#start': null }, queue = ['#start'];
    for (const id of queue) for (const next of adj[id]) {
      if (Object.hasOwn(previous, next) || capacity.get(id + '>' + next) <= 0) continue;
      previous[next] = id;
      queue.push(next);
    }
    if (!Object.hasOwn(previous, map.site)) return count;
    for (let id = map.site; previous[id] !== null; id = previous[id]) {
      const a = previous[id] + '>' + id, b = id + '>' + previous[id];
      capacity.set(a, capacity.get(a) - 1);
      capacity.set(b, capacity.get(b) + 1);
    }
    count++;
  }
}

function validateMap(name, map) {
  const fail = message => name + ': ' + message;
  const zones = Object.keys(map.zones);
  const training = map.meta.kind === 'tutorial';
  assert.ok(zones.length >= (training ? 6 : 14) && zones.length <= (training ? 10 : 18), fail('zone count'));
  assert.ok(map.size.length === 2 && map.size.every(x => Number.isFinite(x) && x > 0), fail('size'));
  assert.ok(map.spawns.length >= 2 && map.spawns.length <= 3 && new Set(map.spawns).size === map.spawns.length, fail('distinct spawns'));
  assert.deepEqual(zones.filter(id => map.zones[id].type === 'Exterior').sort(), [...map.spawns].sort(), fail('exterior zones equal spawns'));
  assert.deepEqual(zones.filter(id => map.zones[id].type === 'Site'), [map.site], fail('one site'));
  for (const [id, zone] of Object.entries(map.zones)) {
    assert.ok(zone.label && DATA.ZONES[zone.type]?.space === zone.space, fail(id + ' type and space'));
    assert.ok(zone.poly.length >= 3 && zone.poly.every(p => p.length === 2 && p.every((v, i) => Number.isFinite(v) && v >= 0 && v <= map.size[i])), fail(id + ' polygon bounds'));
    const turns = zone.poly.map((p, i) => cross(p, zone.poly[(i + 1) % zone.poly.length], zone.poly[(i + 2) % zone.poly.length]));
    assert.ok(turns.every(x => x > 0) || turns.every(x => x < 0), fail(id + ' nondegenerate convex polygon'));
    assert.ok(inside(zone.anchor, zone.poly), fail(id + ' interior anchor'));
  }
  for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
    assert.ok(!overlaps(map.zones[zones[i]].poly, map.zones[zones[j]].poly), fail(zones[i] + '/' + zones[j] + ' overlap'));
  }
  const edges = map.edges.map(([a, b]) => {
    assert.ok(a !== b && map.zones[a] && map.zones[b], fail('valid edge endpoints'));
    return Engine.doorId(a, b);
  });
  assert.equal(new Set(edges).size, edges.length, fail('unique edges'));
  assert.deepEqual(map.doors.map(([a, b]) => Engine.doorId(a, b)).sort(), [...edges].sort(), fail('one physical door per edge'));
  for (const [a, b, point] of map.doors) {
    assert.ok(point.every(Number.isFinite), fail('finite door'));
    assert.ok([a, b].every(id => pairs(map.zones[id].poly).some(([p, q]) => onSegment(point, p, q))), fail(a + '/' + b + ' shared-wall door'));
    for (const id of [a, b]) assert.ok(map.zones[id].poly.every(p => Math.hypot(p[0] - point[0], p[1] - point[1]) >= 10), fail('door clear of corner'));
  }
  for (const from of zones) for (const to of zones) {
    assert.ok(Number.isFinite(Engine.dist(map, from, to)), fail('connected graph'));
    assert.equal(Engine.dist(map, from, to), Engine.dist(map, to, from), fail('undirected distance'));
  }
  const independent = edgeDisjoint(map);
  assert.ok(independent >= (training ? 2 : 3), fail('independent spawn-to-site approaches'));
  const shortest = {};
  const entries = new Set();
  for (const spawn of map.spawns) {
    const paths = Engine.paths(map, spawn, map.site, 40);
    assert.ok(paths.length >= 3, fail(spawn + ' route choice'));
    shortest[spawn] = paths[0].length - 1;
    assert.ok(shortest[spawn] >= (training ? 2 : 3) && shortest[spawn] <= 5, fail(spawn + ' approach length'));
    for (const path of paths) {
      assert.equal(new Set(path).size, path.length, fail('simple route'));
      assert.ok(path.slice(1).every((id, i) => edges.includes(Engine.doorId(path[i], id))), fail('route follows doors'));
      entries.add(path[path.length - 2]);
    }
  }
  assert.ok(entries.size >= 3, fail('three objective entry rooms'));
  return { zones: zones.length, doors: edges.length, independentApproaches: independent, shortestRoutes: shortest, objectiveEntrances: entries.size };
}

function auditRound(round) {
  const map = MAPS[round.map];
  assert.ok(['ATK', 'DEF'].includes(round.result.winner), 'round has a winner');
  assert.ok(round.step > 0 && round.step <= DATA.CONFIG.maxSteps + DATA.CONFIG.bombSteps, 'round terminates');
  assert.equal(round.log.length, round.step + 1, 'one log entry per step');
  const killed = new Set();
  const sideOf = Object.fromEntries(['ATK', 'DEF'].flatMap(side => round.ops[side].map(op => [op.id, side])));
  for (const step of round.log) {
    for (const kill of step.kills) {
      assert.ok(!killed.has(kill.victimId), 'operator dies once');
      killed.add(kill.victimId);
    }
    for (const side of ['ATK', 'DEF']) {
      const positions = step[side === 'ATK' ? 'attackers' : 'defenders'];
      const counts = {};
      for (const [id, zone] of Object.entries(positions)) {
        assert.equal(sideOf[id], side, 'operator belongs to side');
        assert.ok(map.zones[zone], 'position is a map room');
        if (killed.has(id)) continue;
        counts[zone] = (counts[zone] ?? 0) + 1;
      }
      for (const [zone, count] of Object.entries(counts)) assert.ok(map.spawns.includes(zone) || count <= DATA.CONFIG.zoneCapacity, 'room capacity');
      for (const door of Object.values(step.doors)) assert.ok(door.crossed.filter(id => sideOf[id] === side).length <= DATA.CONFIG.doorCapacity, 'door capacity');
    }
    const supported = new Set();
    for (const fight of step.fights) {
      assert.ok(map.zones[fight.zone], 'fight in a room');
      for (const side of ['ATK', 'DEF']) {
        assert.ok(Number.isFinite(fight[side].total), 'finite combat score');
        for (const id of fight.supporters[side]) {
          assert.ok(!supported.has(id), 'support at most once per step');
          supported.add(id);
        }
      }
    }
  }
}

module.exports = { validateMap, auditRound, edgeDisjoint };
