const DATA = require('../demo/data.js');
const MAPS = require('../demo/maps.js');
const PACK = require('./maps.js');
Object.assign(MAPS, PACK);
const Engine = require('../demo/engine.js');
const ATK = DATA.ROSTER.filter(op => Engine.sideOf(op) === 'ATK');
const DEF = DATA.ROSTER.filter(op => Engine.sideOf(op) === 'DEF');
const ARCHETYPES = Object.keys(DATA.ARCHETYPES);
const hash = value => [...String(value)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
const seedFor = (root, ...parts) => hash([root, ...parts].join('|'));

function freshOptions(map, seed, index, atk = ATK, def = DEF, forcedSpawn = null) {
  const attackStyle = ARCHETYPES[index % ARCHETYPES.length];
  const defenseStyle = ARCHETYPES[Math.floor(index / ARCHETYPES.length) % ARCHETYPES.length];
  const setup = Engine.suggestSetup(map, def, Engine.mulberry32(seedFor(seed, 'setup')), DATA.ARCHETYPES[defenseStyle].ai);
  const squad = [...atk, ...def];
  const briefing = Engine.briefing({ map, player: squad, enemy: squad, rounds: [null], used: {} }, { setup, seed, armed: null, enemyArmed: null });
  const plan = Engine.suggestPlan(map, atk, briefing.revealed, Engine.mulberry32(seedFor(seed, 'plan')), DATA.ARCHETYPES[attackStyle].ai);
  if (forcedSpawn) {
    const options = Engine.paths(map, forcedSpawn, MAPS[map].site, 40);
    const random = Engine.mulberry32(seedFor(seed, 'spawn'));
    for (const group of plan.groups) {
      const short = options.filter(path => path.length <= options[0].length + 1);
      group.path = [...short[Math.floor(random() * short.length)]];
    }
    plan.gadgets = {};
    for (const group of plan.groups) for (const id of group.ops) {
      const use = DATA.GADGET_USE[atk.find(op => op.id === id).gadget.class];
      if (use === 'smoke') plan.gadgets[id] = MAPS[map].site;
      if (use === 'reveal') plan.gadgets[id] = group.path[group.path.length - 2];
    }
  }
  return { seed, setup, plan };
}

const tally = () => ({ rounds: 0, atkWins: 0, timeouts: 0, steps: 0, plants: 0, reasons: {}, attackPolicies: {}, defensePolicies: {} });
function add(result, round, policies = null) {
  result.rounds++;
  result.atkWins += Number(round.result.winner === 'ATK');
  result.timeouts += Number(round.result.reason === 'Time out');
  result.steps += round.step;
  result.plants += Number(round.log.some(step => step.events.some(event => event.type === 'planted')));
  const reason = round.result.winner + ': ' + round.result.reason;
  result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
  if (policies) for (const [key, policy] of [['attackPolicies', policies[0]], ['defensePolicies', policies[1]]]) {
    const row = result[key][policy] ??= { rounds: 0, atkWins: 0 };
    row.rounds++;
    row.atkWins += Number(round.result.winner === 'ATK');
  }
}

function interval(wins, rounds) {
  const z = 1.959963984540054, p = wins / rounds, denominator = 1 + z * z / rounds;
  const center = (p + z * z / (2 * rounds)) / denominator;
  const spread = z * Math.sqrt(p * (1 - p) / rounds + z * z / (4 * rounds * rounds)) / denominator;
  return [center - spread, center + spread];
}

function summarize(result) {
  return {
    ...result,
    atkRate: result.atkWins / result.rounds,
    defRate: 1 - result.atkWins / result.rounds,
    atkWilson95: interval(result.atkWins, result.rounds),
    timeoutRate: result.timeouts / result.rounds,
    averageSteps: result.steps / result.rounds,
  };
}

function sample(map, mode, rounds, root, { audit, atk = ATK, def = DEF, spawn = null, templates = null } = {}) {
  const result = tally();
  for (let i = 0; i < rounds; i++) {
    const seed = seedFor(root, map, mode, spawn ?? '', templates?.join('') ?? '', i);
    const options = mode === 'fresh' || mode === 'spawn' ? freshOptions(map, seed, i, atk, def, spawn)
      : mode === 'template' ? { seed, atkTemplate: templates[0], defTemplate: templates[1] }
      : { seed };
    const round = Engine.playRound(atk, def, map, options);
    if (spawn && !Object.values(round.log[0].attackers).every(zone => zone === spawn)) throw new Error('Spawn stress test changed its starting area');
    if (audit) audit(round);
    const policies = mode === 'fresh' || mode === 'spawn'
      ? [ARCHETYPES[i % 4], ARCHETYPES[Math.floor(i / 4) % 4]]
      : mode === 'pool' ? ['ATK', 'DEF'].map(side => round.pools[side].split('#')[0]) : null;
    add(result, round, policies);
  }
  return summarize(result);
}

module.exports = { DATA, MAPS, PACK, Engine, ATK, DEF, ARCHETYPES, hash, seedFor, freshOptions, tally, add, interval, summarize, sample };
