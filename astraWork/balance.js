const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('./balance-core.js');
const { validateMap, auditRound } = require('./validate.js');
const Counterplay = require('./counterplay.js');
const arg = (name, fallback) => process.argv.find(x => x.startsWith('--' + name + '='))?.split('=').slice(1).join('=') ?? fallback;
const rounds = Number(arg('rounds', '2000'));
const seeds = arg('seeds', '193751,9518427').split(',').map(Number);
const templateRounds = Number(arg('template-rounds', '200'));
const spawnRounds = Number(arg('spawn-rounds', '400'));
const matches = Number(arg('matches', '200'));
if (![rounds, templateRounds, spawnRounds, matches].every(n => Number.isInteger(n) && n > 0) || !seeds.length || !seeds.every(Number.isInteger)) throw new Error('Counts must be positive integers; seeds must be integers');
const out = path.resolve(arg('out', __dirname));
fs.mkdirSync(out, { recursive: true });
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex');
const pct = value => (100 * value).toFixed(1) + '%';
const ci = row => row.atkWilson95.map(pct).join('–');
const combined = rows => {
  const total = C.tally();
  for (const row of rows) {
    for (const key of ['rounds', 'atkWins', 'timeouts', 'steps', 'plants']) total[key] += row[key];
    for (const [reason, n] of Object.entries(row.reasons)) total.reasons[reason] = (total.reasons[reason] ?? 0) + n;
    for (const key of ['attackPolicies', 'defensePolicies']) for (const [policy, value] of Object.entries(row[key])) {
      const entry = total[key][policy] ??= { rounds: 0, atkWins: 0 };
      entry.rounds += value.rounds;
      entry.atkWins += value.atkWins;
    }
  }
  return C.summarize(total);
};
const report = {
  formatVersion: 1,
  rules: 'Existing V4 engine and roster; no combat constants changed',
  settings: { roundsPerSeedAndMode: rounds, seeds, developmentSeedsExcluded: [274901, 812042, 4420913, 732419], templateRounds, spawnRounds, matches, primaryAbilities: 'none', matchAbilities: 'one available ability per side per round' },
  sources: Object.fromEntries(['maps.js', 'balance-core.js', 'balance.js', 'counterplay.js', '../demo/engine.js', '../demo/data.js', '../demo/catalog.js'].map(file => [file, sha(file)])),
  maps: {}, totalAuditedRounds: 0,
};
const audit = round => { auditRound(round); report.totalAuditedRounds++; };

for (const [name, map] of Object.entries(C.PACK)) {
  console.log('Testing ' + name);
  const entry = report.maps[name] = { kind: map.meta.kind, shape: map.meta.shape, geometry: validateMap(name, map) };
  for (const mode of ['pool', 'fresh']) {
    const batches = seeds.map(root => ({ seed: root, ...C.sample(name, mode, rounds, root, { audit }) }));
    entry[mode] = { ...combined(batches), batches };
    console.log('  ' + mode + ': ATK ' + pct(entry[mode].atkRate) + ', 95% CI ' + ci(entry[mode]) + ', timeout ' + pct(entry[mode].timeoutRate));
  }
  entry.templates = {};
  for (const a of Object.keys(C.DATA.ATK_TEMPLATES)) for (const d of Object.keys(C.DATA.DEF_TEMPLATES)) {
    entry.templates[a + d] = C.sample(name, 'template', templateRounds, seeds[0], { templates: [a, d], audit });
  }
  entry.spawns = Object.fromEntries(map.spawns.map(spawn => [spawn, C.sample(name, 'spawn', spawnRounds, seeds[0], { spawn, audit })]));
  const flat = ops => ops.map(op => ({ ...op, stats: Object.fromEntries(C.DATA.STATS.map(stat => [stat, 60])) }));
  entry.uniformStats = C.sample(name, 'fresh', 1000, seeds[seeds.length - 1] + 1, { atk: flat(C.ATK), def: flat(C.DEF), audit });
  const gameStats = C.tally();
  let playerWins = 0;
  for (let i = 0; i < matches; i++) {
    const root = C.seedFor(seeds[0], name, 'match', i);
    C.Engine.setRandom(C.Engine.mulberry32(root));
    const player = C.Engine.cloneSquad(C.DATA.ROSTER);
    const enemy = C.Engine.cloneSquad(C.DATA.ROSTER).map(op => ({ ...op, id: 'enemy-' + op.id }));
    const match = C.Engine.newMatch(player, enemy, name);
    while (!match.over) {
      const armed = C.Engine.armable(match, 'player').slice(0, 1).map(op => op.id);
      const enemyArmed = C.Engine.armable(match, 'enemy').slice(0, 1).map(op => op.id);
      const round = C.Engine.playMatchRound(match, { armed, enemyArmed, seed: C.seedFor(root, match.rounds.length) });
      audit(round);
      C.add(gameStats, round);
    }
    playerWins += Number(match.score.player > match.score.enemy);
  }
  C.Engine.setRandom(Math.random);
  entry.fullMatches = { ...C.summarize(gameStats), matches, playerWins, playerWinRate: playerWins / matches, playerWilson95: C.interval(playerWins, matches) };
  if (map.meta.kind === 'competitive') entry.counterplay = Counterplay.measure(name, seeds[seeds.length - 1], audit);
  const within = row => row.atkWilson95[0] >= 0.45 && row.atkWilson95[1] <= 0.55;
  entry.checks = {
    pooledIntervalInside45to55: within(entry.pool),
    freshIntervalInside45to55: within(entry.fresh),
    pooledTimeoutAtMost15: entry.pool.timeoutRate <= 0.15,
    freshTimeoutAtMost15: entry.fresh.timeoutRate <= 0.15,
    counterToEachDefenseTemplate: !entry.counterplay || Object.values(entry.counterplay).every(row => row.validation.atkRate >= 0.4),
  };
  entry.status = map.meta.kind === 'tutorial' ? 'TRAINING: measured, not a competitive release gate'
    : Object.values(entry.checks).every(Boolean) ? 'PASS' : 'REVIEW';
  console.log('  ' + entry.status);
}
report.competitivePass = Object.values(report.maps).filter(map => map.kind === 'competitive').every(map => map.status === 'PASS');
fs.writeFileSync(path.join(out, 'balance-results.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Astra map pack — balance report', '',
  'This report is generated by `node astraWork/balance.js`. It measures the existing V4 rules, not the planned V5 plant, drone, or order changes.', '',
  '## Release gate', '',
  '**Competitive result: ' + (report.competitivePass ? 'PASS' : 'REVIEW REQUIRED') + '.** Each competitive map must have its entire 95% Wilson ATK interval inside 45–55% in both primary modes, at most 15% timeout endings in each mode, and a tested coordinated attack winning at least 40% against each predefined defense. DEF wins are the complement; there are no drawn rounds.', '',
  '| Map | Shape | Mode | Rounds | ATK win | DEF win | ATK 95% interval | Timeouts | Mean steps |',
  '|---|---|---|---:|---:|---:|---|---:|---:|',
];
for (const [name, map] of Object.entries(report.maps)) for (const mode of ['pool', 'fresh']) {
  const row = map[mode];
  lines.push('| ' + [name, map.shape, mode, row.rounds, pct(row.atkRate), pct(row.defRate), ci(row), pct(row.timeoutRate), row.averageSteps.toFixed(2)].join(' | ') + ' |');
}
lines.push('', '## Method and limits', '',
  '- Primary samples are independent seeded rounds with the same default five attackers and five defenders. Abilities are disabled in these samples to isolate terrain and planning.',
  '- `pool` uses the actual V4 AI pools, with the engine\'s usual intel adaptation. `fresh` regenerates both plans every round, cycling evenly through all 16 ATK/DEF archetype-policy pairs. ATK receives only the intel produced by the normal briefing.',
  '- Each primary mode uses ' + rounds + ' rounds for each held-out root seed: ' + seeds.join(', ') + '. Development used root 274901 and an earlier consecutive-seed probe. An earlier validation with roots 812042 and 4420913 exposed a DEF bias in the terminal; it was corrected before reserving these new final validation seeds. An exploratory counterplay check used root 732419.',
  '- Wilson intervals describe sampling uncertainty for this specific roster and policy distribution. They are per-map/per-mode intervals, not simultaneous guarantees across every possible tactic or roster.',
  '- Template cells and forced-spawn attacks are stress tests. A poor tactic is allowed to lose; these cells are not independently required to be 50/50. Forced-spawn attacks keep every operator at the selected initial spawn; the engine can still reroute around known blocked doors from that starting area.',
  '- Coordinated counterplay searches a bounded set of legal 3+2 attacks: one shortest route per spawn/objective-entry combination, either concentrated or split, with arrival lengths at most one door apart. Selection uses 80 development rounds per candidate; the chosen plan is then evaluated on 600 separate validation rounds. It is a demonstrated response, not an optimal-play proof.',
  '- Uniform-stat rounds set every base stat to 60 while retaining each role, trait, weapon, and gadget. This changes the matchup as well as removing the default roster\'s stat differences, so it is a sensitivity diagnostic rather than the release gate.',
  '- Full matches alternate sides using the existing match rules and arm one remaining ability per side per round. Their player-win interval uses matches as the independent unit. Round statistics from those matches are descriptive.',
  '- The tutorial is reported separately. Its purpose is a compact lesson foundation; scripted drills are not competitive balance claims.',
  '- Human strategy, all possible defensive placements, and future V5 rules remain outside this statistical check. Re-run after changing mechanics, topology, zone types, the roster, or AI policies.',
  '- Every reported round also passed checks for termination, finite scores, valid positions, room/door capacities, unique deaths, and one support assignment per operator per step.',
  '', '**Total audited rounds in this report: ' + report.totalAuditedRounds + '.**', ''
);
for (const [name, map] of Object.entries(report.maps)) {
  lines.push('## ' + name, '', '**' + map.status + '**', '',
    map.geometry.zones + ' zones; ' + map.geometry.doors + ' doors; ' + map.geometry.independentApproaches + ' edge-disjoint spawn-to-site approaches. Shortest routes: ' + Object.entries(map.geometry.shortestRoutes).map(([spawn, n]) => spawn + ' ' + n + ' doors').join(', ') + '.', '',
    '### Held-out batches', '', '| Mode | Root seed | ATK win | Timeouts |', '|---|---:|---:|---:|');
  for (const mode of ['pool', 'fresh']) for (const row of map[mode].batches) lines.push('| ' + [mode, row.seed, pct(row.atkRate), pct(row.timeoutRate)].join(' | ') + ' |');
  lines.push('', '### Template counterplay', '', 'ATK win rate; ' + templateRounds + ' rounds per cell. Template definitions are the unchanged `DATA.ATK_TEMPLATES` and `DATA.DEF_TEMPLATES`.', '',
    '| ATK / DEF | S | P | R |', '|---|---:|---:|---:|');
  for (const a of Object.keys(C.DATA.ATK_TEMPLATES)) lines.push('| ' + a + ' | ' + Object.keys(C.DATA.DEF_TEMPLATES).map(d => pct(map.templates[a + d].atkRate)).join(' | ') + ' |');
  lines.push('', '### Spawn stress test', '', '| Forced starting spawn | Rounds | ATK win | ATK 95% interval | Timeouts |', '|---|---:|---:|---|---:|');
  for (const [spawn, row] of Object.entries(map.spawns)) lines.push('| ' + [spawn, row.rounds, pct(row.atkRate), ci(row), pct(row.timeoutRate)].join(' | ') + ' |');
  lines.push('', '### Fresh policy breakdown', '', 'Each row averages over the opposing policies. A strong policy can exceed the map-wide average.', '',
    '| Side choosing policy | Policy | Rounds | ATK win |', '|---|---|---:|---:|');
  for (const [side, key] of [['ATK', 'attackPolicies'], ['DEF', 'defensePolicies']]) for (const [policy, row] of Object.entries(map.fresh[key])) lines.push('| ' + [side, policy, row.rounds, pct(row.atkWins / row.rounds)].join(' | ') + ' |');
  lines.push('', '### Sensitivity and full matches', '',
    '- Equal base stats: ' + pct(map.uniformStats.atkRate) + ' ATK across ' + map.uniformStats.rounds + ' rounds; interval ' + ci(map.uniformStats) + '.',
    '- ' + map.fullMatches.matches + ' complete mirror matches with abilities: player won ' + pct(map.fullMatches.playerWinRate) + '; match-level interval ' + map.fullMatches.playerWilson95.map(pct).join('–') + '.',
    '- Those matches contained ' + map.fullMatches.rounds + ' rounds: ATK ' + pct(map.fullMatches.atkRate) + ', timeouts ' + pct(map.fullMatches.timeoutRate) + '.', ''
  );
  if (map.counterplay) {
    lines.push('### Coordinated responses to predefined defenses', '',
      'Plans are selected on development seeds and measured below only on the separate validation seeds. The JSON report includes the exact operator assignment, routes, and gadget targets.', '',
      '| DEF setup | Candidate plans | Validation rounds | ATK win | ATK 95% interval | Routes before intel adaptation |',
      '|---|---:|---:|---:|---|---|');
    for (const [defense, row] of Object.entries(map.counterplay)) lines.push('| ' + [
      defense, row.candidateCount, row.validation.rounds, pct(row.validation.atkRate), ci(row.validation),
      row.plan.groups.map(group => group.path.join(' → ')).join(' / '),
    ].join(' | ') + ' |');
    lines.push('');
  }
}
lines.push('## Reproduction', '', '```bash',
  'node astraWork/maps.test.js',
  'node astraWork/balance.js --rounds=' + rounds + ' --seeds=' + seeds.join(',') + ' --template-rounds=' + templateRounds + ' --spawn-rounds=' + spawnRounds + ' --matches=' + matches,
  '```', '', 'The JSON report records SHA-256 hashes for the map pack, harness, engine, data, and equipment catalog. The map hash for this run is `' + report.sources['maps.js'] + '`.', '');
fs.writeFileSync(path.join(out, 'BALANCE.md'), lines.join('\n'));
console.log('Audited rounds: ' + report.totalAuditedRounds + '. Report: ' + path.join(out, 'BALANCE.md'));
if (!report.competitivePass) process.exitCode = 1;
