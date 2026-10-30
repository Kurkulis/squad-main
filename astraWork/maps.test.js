const assert = require('node:assert/strict');
const { PACK, Engine, ATK, DEF, DATA, seedFor, freshOptions } = require('./balance-core.js');
const { validateMap, auditRound } = require('./validate.js');
const Tutorial = require('./tutorial.js');

assert.equal(Object.values(PACK).filter(map => map.meta.kind === 'competitive').length, 3);
assert.equal(Object.values(PACK).filter(map => map.meta.kind === 'tutorial').length, 1);
assert.equal(new Set(Object.values(PACK).map(map => map.meta.shape)).size, 4);

for (const [name, map] of Object.entries(PACK)) {
  console.log(name, JSON.stringify(validateMap(name, map)));
  for (const archetype of Object.keys(DATA.ARCHETYPES)) {
    for (const plan of Engine.pool(name, ATK, 'ATK', archetype)) assert.ok(Engine.validatePlan(name, ATK, plan));
    for (const setup of Engine.pool(name, DEF, 'DEF', archetype)) assert.ok(Engine.validateSetup(name, DEF, setup));
  }
  for (const a of Object.keys(DATA.ATK_TEMPLATES)) for (const d of Object.keys(DATA.DEF_TEMPLATES)) {
    const round = Engine.playRound(ATK, DEF, name, { atkTemplate: a, defTemplate: d, seed: seedFor(1, name, a, d) });
    auditRound(round);
  }
  for (let i = 0; i < 200; i++) {
    const options = freshOptions(name, seedFor(2, name, i), i);
    assert.ok(Engine.validatePlan(name, ATK, options.plan));
    assert.ok(Engine.validateSetup(name, DEF, options.setup));
    auditRound(Engine.playRound(ATK, DEF, name, options));
  }
  for (const seed of [0, 1, 777]) {
    const first = Engine.playRound(ATK, DEF, name, { seed });
    assert.deepEqual(Engine.playRound(ATK, DEF, name, { seed }), first, 'seeded replay');
  }
  const damaged = structuredClone(map);
  damaged.doors[0][2] = [-1, -1];
  assert.throws(() => validateMap(name, damaged), /shared-wall door/, 'off-wall doors are rejected');
  const overlap = structuredClone(map);
  const keys = Object.keys(overlap.zones).filter(id => !map.spawns.includes(id) && id !== map.site);
  overlap.zones[keys[1]].poly = structuredClone(overlap.zones[keys[0]].poly);
  overlap.zones[keys[1]].anchor = [...overlap.zones[keys[0]].anchor];
  assert.throws(() => validateMap(name, overlap), /overlap/, 'overlapping rooms are rejected');
}

for (const lesson of Tutorial.lessons) {
  const options = Tutorial.options(lesson.id, ATK, DEF, 20261029);
  assert.ok(Engine.validatePlan(Tutorial.map, ATK, options.plan));
  assert.ok(Engine.validateSetup(Tutorial.map, DEF, options.setup));
  assert.ok(lesson.rooms.every(id => PACK[Tutorial.map].zones[id]), 'lesson rooms exist');
  const round = Engine.playRound(ATK, DEF, Tutorial.map, options);
  auditRound(round);
  if (lesson.id === 'queues') assert.ok(round.log.some(step => Object.values(step.doors).some(door => door.queued.length)), 'queue lesson actually queues an operator');
  if (lesson.id === 'recon') {
    assert.ok(round.log[0].canceled.includes('site|support-room'), 'breach lesson opens its reinforced door');
    assert.ok(Object.values(round.log[0].revealed.positions).includes('support-room'), 'drone lesson observes an occupied room');
  }
  if (lesson.id === 'support') assert.ok(round.log.some(step => step.fights.some(fight => fight.supporters.ATK.length + fight.supporters.DEF.length > 0)), 'support lesson includes actual support');
}

console.log('PASS: four maps; geometry, routes, plans, seeded replays, six tutorial fixtures, and 842 audited rounds.');
