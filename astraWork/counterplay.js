const C = require('./balance-core.js');

function candidates(name) {
  const map = C.MAPS[name], routes = new Map();
  for (const spawn of map.spawns) for (const path of C.Engine.paths(name, spawn, map.site, 40)) {
    if (path.slice(1).some(zone => map.spawns.includes(zone))) continue;
    const key = spawn + ':' + path.at(-2);
    if (!routes.has(key)) routes.set(key, path);
  }
  const paths = [...routes.values()], plans = [];
  for (let a = 0; a < paths.length; a++) for (let b = a; b < paths.length; b++) {
    if (Math.abs(paths[a].length - paths[b].length) > 1) continue;
    const groups = [
      { ops: C.ATK.slice(0, 3).map(op => op.id), path: paths[a] },
      { ops: C.ATK.slice(3).map(op => op.id), path: paths[b] },
    ];
    const gadgets = {};
    for (const group of groups) for (const id of group.ops) {
      const use = C.DATA.GADGET_USE[C.ATK.find(op => op.id === id).gadget.class];
      if (use === 'smoke') gadgets[id] = map.site;
      if (use === 'reveal') gadgets[id] = group.path.at(-2);
    }
    const plan = { groups, gadgets };
    C.Engine.validatePlan(name, C.ATK, plan);
    plans.push(plan);
  }
  return plans;
}

function evaluate(name, setup, plan, seeds, audit) {
  const result = C.tally();
  for (const seed of seeds) {
    const briefing = C.Engine.briefing({
      map: name, player: C.DATA.ROSTER, enemy: C.DATA.ROSTER, rounds: [null], used: {},
    }, { setup, seed, armed: null, enemyArmed: null });
    const adapted = C.Engine.adaptPlan(name, C.ATK, plan, briefing.revealed);
    const round = C.Engine.playRound(C.ATK, C.DEF, name, { setup, plan: adapted, seed });
    audit?.(round);
    C.add(result, round);
  }
  return C.summarize(result);
}

function measure(name, validationRoot, audit, searchRounds = 80, validationRounds = 600) {
  const plans = candidates(name), rows = {};
  for (const defense of Object.keys(C.DATA.DEF_TEMPLATES)) {
    const setup = C.Engine.defaultSetup(name, C.DEF, defense);
    const selectionSeeds = Array.from({ length: searchRounds }, (_, i) => C.seedFor(274901, name, defense, 'counter', i));
    let chosen = null;
    for (const plan of plans) {
      const score = evaluate(name, setup, plan, selectionSeeds, audit);
      if (!chosen || score.atkWins > chosen.search.atkWins) chosen = { plan, search: score };
    }
    const validationSeeds = Array.from({ length: validationRounds }, (_, i) => C.seedFor(validationRoot, name, defense, 'counter-validation', i));
    rows[defense] = {
      candidateCount: plans.length,
      selectionSeed: 274901,
      plan: chosen.plan,
      search: chosen.search,
      validation: evaluate(name, setup, chosen.plan, validationSeeds, audit),
    };
  }
  return rows;
}

module.exports = { candidates, evaluate, measure };
