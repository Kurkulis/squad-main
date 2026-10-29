const $ = id => document.getElementById(id);
const num = x => x.toFixed(1);
const signed = x => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(Number.isInteger(x) ? 0 : 1)}`;
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');
const avgScore = op => (op.fights ? op.scoreSum / op.fights : 0);
const statMods = mods => Object.entries(mods).map(([s, v]) => `${signed(v)} ${s}`).join(' ');
const other = side => (side === 'ATK' ? 'DEF' : 'ATK');
function inputNumber(id, min, max) {
  const el = $(id);
  el.value = Math.min(max, Math.max(min, Math.round(+el.value) || min));
  return +el.value;
}
const opById = id => [...match.player, ...match.enemy].find(x => x.id === id);
const named = id => {
  const op = opById(id);
  return op ? `${Visuals.icon(op)}${op.name}` : id;
};
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const zoneLabel = (map, z) => MAPS2[map].zones[z]?.label ?? z;
const sideOps = (squad, side) => squad.filter(op => Engine.sideOf(op) === side);
const gadgetUse = op => DATA.GADGET_USE[op.gadget.class];
const { whyPanel, replay, stepRows, stepTable } = Playback;
let live = null;
const stopLive = () => {
  live = null;
  Playback.stop();
};
const failure = fn => {
  try {
    fn();
    return '';
  } catch (e) {
    return e.message;
  }
};

let player = Engine.cloneSquad(DATA.ROSTER);
let enemy = Engine.generateSquad(58);
let match = null;
if (Ladder.load() && Ladder.state.player) player = Engine.cloneSquad(Ladder.state.player);
if (!Ladder.state.run) Ladder.newRun(newSeed(), player);
function squadTable(ops, editable) {
  const head = `<thead><tr><th>Operator</th><th>Role</th><th>Gadget</th><th>Weapon / Armor</th><th>Playstyle</th>${DATA.STATS.map(s => `<th class="num" title="${DATA.STAT_LABELS[s]}">${s}</th>`).join('')}</tr></thead>`;
  const rows = ops.map((op, i) => {
    const es = Engine.effectiveStats(op);
    const style = editable
      ? `<select data-i="${i}">${Engine.allowedPlaystyles(op).map(p => `<option${p === op.playstyle ? ' selected' : ''}>${p}</option>`).join('')}</select>`
      : op.playstyle;
    return `<tr><td class="${Engine.sideOf(op)}">${Visuals.icon(op)}${op.name}</td><td>${op.role}</td><td>${op.gadget.class}</td><td>${CATALOG.weapon(op.primary.id)?.name ?? op.primary.class} / ${op.armor.class}</td><td>${style}</td>${DATA.STATS.map(s => `<td class="num" title="base ${op.stats[s]}">${es[s]}</td>`).join('')}</tr>`;
  });
  return `<div class="scroll"><table>${head}${rows.join('')}</table></div>`;
}

function matchStrip(rounds, liveRound) {
  const chips = rounds.map((r, i) => {
    const won = r.result.winner === r.playerSide;
    return `<li class="chip ${won ? 'win' : 'loss'}" title="Round ${i + 1}: you ${r.playerSide}, ${r.result.winner} wins by ${r.result.reason} in ${r.step} steps"><b>${won ? 'W' : 'L'}</b> <span class="${r.playerSide}">${r.playerSide}</span> ${r.result.reason} · ${r.step}</li>`;
  });
  if (liveRound) chips.push(`<li class="chip live">Round ${liveRound} live</li>`);
  return chips.length ? `<ol class="strip" aria-label="Rounds">${chips.join('')}</ol>` : '';
}

function difficulty(p) {
  const [text, cls] = p < 0.42 ? ['Hard', 'loss'] : p > 0.58 ? ['Favourable', 'win'] : ['Even', ''];
  return `<span class="badge odds ${cls}" title="Expected ATK round win ≈ ${(100 * p).toFixed(0)}% against this opponent's usual defence">${text}</span>`;
}

function roundView(r, n, open) {
  const won = r.result.winner === r.playerSide;
  const ops = [...r.ops.ATK, ...r.ops.DEF];
  const mvp = ops.reduce((best, op) => (op.kills > best.kills || (op.kills === best.kills && avgScore(op) > avgScore(best)) ? op : best));
  const opRows = ops.map(op => {
    const side = Engine.sideOf(op);
    return `<tr class="${op.alive ? '' : 'dead'}"><td class="${side}">${Visuals.icon(op)}${op.name}</td><td>${side} (${side === r.playerSide ? 'you' : 'opponent'})</td><td class="num">${num(avgScore(op))}</td><td class="num">${op.fights}</td><td class="num">${op.kills}</td><td>${op.diedAt ? `step ${op.diedAt}` : ''}</td></tr>`;
  });
  const groups = r.plan.groups.map(g => g.ops.length).join(' + ');
  return `<details${open ? ' open' : ''}><summary><b class="badge ${won ? 'win' : 'loss'}">${won ? 'WON' : 'LOST'}</b> <b>Round ${n}</b> <span class="hint">· you <span class="${r.playerSide}">${r.playerSide}</span> · <span class="${r.result.winner}">${r.result.winner}</span> wins by ${r.result.reason} in ${r.step} steps · seed ${r.seed} · attack ${groups} · MVP ${Visuals.icon(mvp)}${mvp.name}</span></summary>
${whyPanel(r)}
<p class="replay"><label>Replay <input type="range" min="0" max="${r.step}" value="${r.step}" data-round="${n - 1}"></label></p><div id="replay-${n - 1}">${replay(r, r.step)}</div>
<details class="sub"><summary>Play-by-play</summary><ol class="pbp" start="0">${r.log.map(s => `<li>${Narrate.step(s, r)}</li>`).join('')}</ol></details>
<details class="sub"><summary>Step table</summary>${stepTable(`<tbody>${r.log.map(s => stepRows(s, r)).join('')}</tbody>`)}</details>
<div class="scroll"><table><thead><tr><th>Operator</th><th>Side</th><th class="num">Avg score</th><th class="num">Fights</th><th class="num">Kills</th><th>Died</th></tr></thead>${opRows.join('')}</table></div></details>`;
}

function matchMvp() {
  const kills = {};
  for (const r of match.rounds) for (const op of [...r.ops.ATK, ...r.ops.DEF]) kills[op.id] = (kills[op.id] ?? 0) + op.kills;
  const [id, n] = Object.entries(kills).sort((a, b) => b[1] - a[1])[0];
  return `${named(id)} (${n} kills)`;
}

let prep = null;
const abilityLine = a => `${a.situations.length === DATA.SITUATIONS.length ? 'any situation' : a.situations.join(' or ')}${a.zone ? ` on the ${a.zone}` : ''}: ${[a.stats && statMods(a.stats), a.add && `${signed(a.add)} score`].filter(Boolean).join(' ')}`;
const isDoor = t => String(t).includes('|');
const doorLabel = (map, d) => d.split('|').map(z => zoneLabel(map, z)).join(' – ');
const targetLabel = (map, t) => (isDoor(t) ? `${doorLabel(map, t)} door` : zoneLabel(map, t));
const count = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
const PLACED = { ATK: ['reveal', 'breach', 'smoke', 'emp'], DEF: ['trap', 'alarm', 'camera'] };
const placeable = (op, side) => PLACED[side].includes(gadgetUse(op));
const setupKey = op => (gadgetUse(op) === 'camera' ? 'cameras' : 'traps');
const targetKinds = op => DATA.GADGET_TARGETS[gadgetUse(op)] ?? [];
const emptySetup = () => ({ positions: {}, reinforcements: [], traps: {}, cameras: {}, roam: {} });
const emptyPlan = () => ({ groups: [{ ops: [], path: [] }], gadgets: {} });
const USE_TEXT = {
  reveal: 'drone: shows the defenders in the zone and next to it, the reinforced doors around them and the traps on the zone doors',
  breach: 'hard breach: opens a reinforced door before the round; kept, its carrier breaches the first reinforced door it leads to',
  smoke: `zone: +${DATA.CONFIG.smokeBonus} in Breach and Objective fights there; door: the defender behind it loses the hold bonus`,
  emp: 'disarms the revealed traps on the doors of the zone',
  trap: `wire: the first group through gets −${DATA.CONFIG.trapDebuff} every stat in its next fight, is slowed and spotted; a drone that sees it lets them cross carefully`,
  alarm: 'alarm: spots the first group through, no debuff',
  camera: 'spots the groups in the zone and next to it every step, so your roamers rotate toward them',
};

function brief(p) {
  p.b = Engine.briefing(match, { armed: p.armed, enemyArmed: p.b?.enemyArmed, seed: p.seed });
}

function ensurePrep() {
  if (prep && prep.match === match && prep.round === match.rounds.length) return prep;
  const side = Engine.nextPlayerSide(match);
  const m = MAPS2[match.map];
  prep = {
    match, round: match.rounds.length, side, seed: newSeed(), ops: sideOps(match.player, side), foes: sideOps(match.enemy, other(side)), armed: [],
    selected: m.site, tool: 'position', group: 0, gadgetOp: null, notice: '', odds: null, oddsKey: '', timer: 0,
    routes: m.spawns.flatMap(s => Engine.paths(m, s, m.site, 3)).sort((a, b) => a.length - b.length),
  };
  if (side === 'DEF') prep.setup = emptySetup();
  else {
    brief(prep);
    prep.plan = emptyPlan();
  }
  return prep;
}

const pressed = on => ` aria-pressed="${!!on}"`;

function abilityPanel(p) {
  const rows = p.ops.filter(op => op.active).map(op => {
    const used = op.id in match.used;
    const on = p.armed.includes(op.id);
    const status = used ? `<b class="badge loss">used in round ${match.used[op.id]}</b>` : `<b class="badge${on ? ' win' : ''}">${on ? 'armed' : 'ready'}</b>`;
    return `<li><label><input type="checkbox" data-act="arm" data-op="${op.id}"${on ? ' checked' : ''}${used ? ' disabled' : ''}> ${Visuals.icon(op)}<b>${op.name}</b> · ${op.active}</label> ${status}<br><small>${abilityLine(DATA.ACTIVES[op.active])}</small></li>`;
  }).join('');
  return `<details class="abilities" open><summary>Arm abilities <small>(${p.armed.length} armed)</small></summary><ul class="ability-list">${rows}</ul><p class="hint">Each ability works once per match: armed, it applies for this round whenever its situation comes up.</p></details>`;
}

const examples = table => `<label>Examples <select data-act="example"><option value="">Pick an example…</option>${Object.entries(table).map(([k, t]) => `<option value="${k}">Example: ${t.name}</option>`).join('')}</select></label>`;

function gadgetCell(p, op, target) {
  if (!placeable(op, p.side)) return '<small>kept</small>';
  const back = p.side === 'ATK' ? 'Keep' : 'Remove';
  return `<button data-act="gadget" data-op="${op.id}"${pressed(p.gadgetOp === op.id)}>${target ? targetLabel(match.map, target) : 'Place'}</button>${target ? ` <button data-act="clear-gadget" data-op="${op.id}" aria-label="${back} the gadget of ${op.name}">${back}</button>` : ''}`;
}

const placeHint = op => `Click ${targetKinds(op).map(t => `a ${t}`).join(' or ')} on the plan for ${op.name}'s ${op.gadget.class}.`;

function defPlanning(p) {
  const s = p.setup;
  const map = match.map;
  const z = p.selected;
  const C = DATA.CONFIG;
  const error = failure(() => Engine.validateSetup(map, p.ops, s));
  const charges = Engine.reinforceCharges(p.ops);
  const here = p.ops.filter(op => s.positions[op.id] === z).length;
  const placing = p.gadgetOp ? opById(p.gadgetOp) : null;
  const positioning = p.tool === 'position' && !placing;
  const moves = p.ops.map(op => {
    const on = s.positions[op.id] === z;
    return `<button data-act="move" data-op="${op.id}"${pressed(on)}${!on && here >= C.zoneCapacity ? ' disabled' : ''}>${Visuals.icon(op)}${op.name}</button>`;
  }).join('');
  const mode = placing ? placeHint(placing)
    : p.tool === 'reinforce' ? `Click a door to reinforce it or take it back (${s.reinforcements.length}/${charges}). Attackers cannot pass a reinforced door without a breach charge. Keep at least ${C.siteOpenDoors} site doors open and every room reachable.`
    : `Click a zone, then the operators to place there (at most ${C.zoneCapacity} per zone). Clicking a door reinforces it.`;
  const reinforced = s.reinforcements.map(d => `<li>${doorLabel(map, d)} <button class="link" data-act="unreinforce" data-door="${d}">remove</button></li>`).join('');
  const gadgets = p.ops.filter(op => placeable(op, 'DEF')).map(op => `<tr><td class="DEF">${Visuals.icon(op)}${op.name}</td><td>${op.gadget.class}<br><small>${USE_TEXT[gadgetUse(op)]}</small></td><td>${gadgetCell(p, op, s[setupKey(op)]?.[op.id])}</td></tr>`).join('');
  const rows = p.ops.map(op => `<tr><td class="DEF">${Visuals.icon(op)}${op.name}</td><td>${op.role}</td><td>${s.positions[op.id] ? `<button class="link" data-act="select" data-zone="${s.positions[op.id]}">${zoneLabel(map, s.positions[op.id])}</button>` : '<small>not placed</small>'}</td><td><label><input type="checkbox" data-act="roam" data-op="${op.id}"${s.roam?.[op.id] ? ' checked' : ''}> roam</label></td></tr>`).join('');
  const tools = `<p class="tools" role="group" aria-label="Tool"><button data-act="tool" data-tool="position"${pressed(positioning)}>Position</button> <button data-act="tool" data-tool="reinforce"${pressed(p.tool === 'reinforce' && !placing)}>Reinforce ${s.reinforcements.length}/${charges}</button></p>
<p class="hint">${mode}</p>
${positioning ? `<h4>Selected zone</h4><p><b>${zoneLabel(map, z)}</b> <small>${MAPS2[map].zones[z].type} · ${here}/${C.zoneCapacity}</small></p><p class="tools">${moves}</p>` : ''}
${reinforced ? `<h4>Reinforced doors</h4><ul class="door-list">${reinforced}</ul>` : ''}
${gadgets ? `<h4>Traps and cameras</h4><div class="scroll"><table><thead><tr><th>Operator</th><th>Gadget</th><th>On</th></tr></thead><tbody>${gadgets}</tbody></table></div>` : ''}
<h4>Positions</h4><div class="scroll"><table><thead><tr><th>Operator</th><th>Role</th><th>Zone</th><th>Roam</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const map$ = Visuals.plan(map, { setup: s, ops: p.ops }, { mode: 'planning', side: 'DEF', selected: positioning ? z : undefined, legend: true });
  return `<h3>Round ${match.rounds.length + 1}: you defend · seed ${p.seed}</h3>
<p class="bar-inline"><button data-act="suggest">Suggest setup</button> ${examples(DATA.DEF_TEMPLATES)} <span class="hint">Place every defender, then reinforce doors and set traps and cameras.</span></p>
${abilityPanel(p)}
<div class="planning"><div class="plan-host" id="plan-map">${map$}</div><div class="plan-tools">${tools}</div></div>
${p.notice ? `<p class="error" role="alert">${p.notice}</p>` : ''}${error ? `<p class="error" role="alert">${error}</p>` : ''}
<p class="actions"><button data-act="confirm" class="primary"${error ? ' disabled' : ''}>Confirm setup</button> <button data-act="auto">Auto-play rest</button></p>`;
}

function revealedNow(p) {
  return Engine.reveal(match.map, p.b.defSetup, p.b.intel.learned, p.plan.gadgets, p.ops, p.foes);
}

const breachOn = (p, d) => Object.entries(p.plan.gadgets).some(([id, t]) => t === d && gadgetUse(opById(id)) === 'breach');
const blockedDoors = (p, revealed) => [...new Set(p.plan.groups.flatMap(g => Engine.doorsOf(g.path)))].filter(d => revealed.reinforcements.includes(d) && !breachOn(p, d));
const pathText = (map, path) => (path.length ? path.map(z => zoneLabel(map, z)).join(' → ') : 'No path yet: click a spawn on the plan');

function atkPlanning(p) {
  const map = match.map;
  const m = MAPS2[map];
  const C = DATA.CONFIG;
  const { plan, b } = p;
  const revealed = revealedNow(p);
  const error = failure(() => Engine.validatePlan(map, p.ops, plan));
  const learned = b.intel.learned;
  const drones = Object.entries(plan.gadgets).some(([id]) => gadgetUse(opById(id)) === 'reveal');
  const intelLine = b.intel.winner === 'ATK'
    ? `You win the intel exchange.${learned.length ? ` Intel reveals the ${learned.map(x => (x === 'positions' ? 'defender positions' : x)).join(', ')}.` : ' The edge is too small to reveal anything.'}`
    : 'DEF wins the intel exchange: nothing about the defence is revealed.';
  const known = [count(Object.keys(revealed.positions).length, 'defender'), count(revealed.reinforcements.length, 'reinforced door'), count(revealed.traps.length, 'trap')].join(', ');
  const doorsKnown = [...revealed.reinforcements.map(d => `<li>Reinforced: ${doorLabel(map, d)}</li>`), ...revealed.traps.map(d => `<li>Trap: ${doorLabel(map, d)}</li>`)].join('');
  const briefing = `<div class="why"><p><b>Briefing:</b> ${intelLine} Known: ${known}${drones ? ' (with your drones)' : ''}. <small>${Narrate.intel(b.intel)}</small></p>${doorsKnown ? `<ul>${doorsKnown}</ul>` : ''}</div>`;
  const routeOptions = (g, i) => {
    const key = g.path.join(' ');
    const at = p.routes.findIndex(r => r.join(' ') === key);
    return `<select data-act="route" data-g="${i}" aria-label="Path of group ${i + 1}">${at < 0 ? `<option value="" selected>${g.path.length ? 'Custom path' : 'Pick a path'}</option>` : ''}${p.routes.map((r, k) => `<option value="${k}"${k === at ? ' selected' : ''}>${r.length - 1} steps: ${r.slice(1, -1).map(z => zoneLabel(map, z)).join(' → ')} (from ${zoneLabel(map, r[0])})</option>`).join('')}</select>`;
  };
  const groups = plan.groups.map((g, i) => `<div class="group${i === p.group ? ' active' : ''}"><p class="tools"><button data-act="group" data-g="${i}"${pressed(i === p.group && !p.gadgetOp)}>Group ${i + 1} · ${g.ops.length}/${C.maxGroupSize}</button> ${routeOptions(g, i)}${plan.groups.length > 1 ? ` <button data-act="remove-group" data-g="${i}" aria-label="Remove group ${i + 1}">Remove</button>` : ''}</p><p class="hint">${g.ops.length ? g.ops.map(id => opById(id).name).join(', ') : 'No operators yet'} · ${pathText(map, g.path)}</p></div>`).join('');
  const groupOf = id => plan.groups.findIndex(g => g.ops.includes(id));
  const rows = p.ops.map(op => {
    const use = gadgetUse(op);
    const mine = groupOf(op.id);
    const options = plan.groups.map((g, i) => `<option value="${i}"${i === mine ? ' selected' : ''}${i !== mine && g.ops.length >= C.maxGroupSize ? ' disabled' : ''}>Group ${i + 1}</option>`).join('');
    return `<tr><td class="ATK">${Visuals.icon(op)}${op.name}</td><td><select data-act="assign" data-op="${op.id}" aria-label="Group of ${op.name}"><option value=""${mine < 0 ? ' selected' : ''}>No group</option>${options}</select></td><td>${op.gadget.class}${placeable(op, 'ATK') ? `<br><small>${USE_TEXT[use]}</small>` : ''}</td><td>${gadgetCell(p, op, plan.gadgets[op.id])}</td></tr>`;
  }).join('');
  const blocks = blockedDoors(p, revealed);
  const replan = blocks.length ? `<p class="notice">A known reinforced door blocks a path: ${blocks.map(d => doorLabel(map, d)).join(', ')}. <button data-act="replan">Replan around blocks</button></p>` : '';
  const placing = p.gadgetOp ? opById(p.gadgetOp) : null;
  const mode = placing ? placeHint(placing).replace(' on the plan', ` on its group's path`) : `Editing group ${p.group + 1}: click the next zone to extend the path, a zone on it to cut back to there, a spawn to restart.`;
  const tools = `${groups}${plan.groups.length < C.maxGroups ? '<p><button data-act="add-group">Add group</button></p>' : ''}${replan}
<div class="scroll"><table><thead><tr><th>Operator</th><th>Group</th><th>Gadget</th><th>Use on</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="hint">A placed gadget gives up its fight bonus for the round; a kept one gives half until it is used.</p>`;
  let targets = [];
  if (placing) {
    const path = plan.groups[groupOf(placing.id)]?.path ?? [];
    targets = [...(targetKinds(placing).includes('zone') ? path : []), ...(targetKinds(placing).includes('door') ? Engine.doorsOf(path) : [])];
  }
  const state = { setup: { positions: revealed.positions, reinforcements: revealed.reinforcements, traps: revealed.traps, roam: {} }, plan, ops: [...p.ops, ...p.foes] };
  const map$ = Visuals.plan(map, state, { mode: 'planning', side: 'ATK', group: p.gadgetOp ? undefined : p.group, legend: true, targets });
  return `<h3>Round ${match.rounds.length + 1}: you attack · seed ${b.seed}</h3>${briefing}
<p class="bar-inline"><button data-act="suggest">Suggest plan</button> ${examples(DATA.ATK_TEMPLATES)} <span>Difficulty <span id="plan-odds">${p.odds === null ? '<span class="badge odds">…</span>' : difficulty(p.odds)}</span></span></p>
${abilityPanel(p)}
<div class="planning"><div class="plan-host" id="plan-map">${map$}</div><div class="plan-tools"><p class="hint">${mode}</p>${tools}</div></div>
${p.notice ? `<p class="error" role="alert">${p.notice}</p>` : ''}${error ? `<p class="error" role="alert">${error}</p>` : ''}
<p class="actions"><button data-act="play" class="primary"${error ? ' disabled' : ''}>Play round</button> <button data-act="auto">Auto-play rest</button></p>
<p class="hint">${m.spawns.length} spawns. At most ${C.doorCapacity} operators pass a door per step and ${C.zoneCapacity} fit in a room; the rest wait and support from next door. ${Visuals.notes[map] ?? ''}</p>`;
}

function scheduleOdds(p) {
  if (p.side !== 'ATK' || failure(() => Engine.validatePlan(match.map, p.ops, p.plan))) return;
  const key = JSON.stringify(p.plan);
  if (key === p.oddsKey) return;
  p.odds = null;
  clearTimeout(p.timer);
  p.timer = setTimeout(() => {
    if (prep !== p || JSON.stringify(p.plan) !== key) return;
    p.odds = Engine.planOdds(p.ops, p.foes, match.map, JSON.parse(key), undefined, 300);
    p.oddsKey = key;
    const el = $('plan-odds');
    if (el) el.innerHTML = difficulty(p.odds);
  }, 250);
}

function renderPrep() {
  const p = ensurePrep();
  const host = $('prep');
  if (!host) return;
  host.innerHTML = p.side === 'DEF' ? defPlanning(p) : atkPlanning(p);
  const svg = host.querySelector('#plan-map svg');
  if (svg) Visuals.bindPlan(svg, p.side === 'DEF' ? { onZone: defZone, onDoor: defDoor } : { onZone: atkZone, onPath: atkPath, onDoor: atkDoor, group: p.gadgetOp ? undefined : p.group });
  scheduleOdds(p);
}

function changed(notice = '') {
  prep.notice = notice;
  const plan = prep.plan;
  if (plan) {
    for (const [id, t] of Object.entries(plan.gadgets)) {
      const path = plan.groups.find(g => g.ops.includes(id))?.path ?? [];
      if (!(isDoor(t) ? Engine.doorsOf(path).includes(t) : path.includes(t))) delete plan.gadgets[id];
    }
  }
  renderPrep();
}

function reinforceError(list) {
  const m = MAPS2[match.map];
  const spots = Object.keys(m.zones).filter(z => !m.spawns.includes(z));
  return failure(() => Engine.validateSetup(match.map, prep.ops, { positions: Object.fromEntries(prep.ops.map((op, i) => [op.id, spots[i % spots.length]])), reinforcements: list }));
}

function toggleReinforcement(d) {
  const s = prep.setup;
  const next = s.reinforcements.includes(d) ? s.reinforcements.filter(x => x !== d) : [...s.reinforcements, d];
  prep.tool = 'reinforce';
  if (next.includes(d) && Object.values(s.traps).includes(d)) return changed('Move the trap off that door before reinforcing it.');
  const error = reinforceError(next);
  if (error) return changed(error.replace('invalid setup: ', 'Cannot reinforce: '));
  s.reinforcements = next;
  return changed();
}

function defZone(id) {
  const p = prep;
  if (p.gadgetOp) {
    const op = opById(p.gadgetOp);
    p.gadgetOp = null;
    if (!targetKinds(op).includes('zone')) return changed(`${op.name}'s ${op.gadget.class} goes on a door.`);
    p.setup.cameras[op.id] = id;
    return changed();
  }
  if (MAPS2[match.map].spawns.includes(id)) return changed('Spawns are attacker ground: pick a zone inside.');
  p.selected = id;
  p.tool = 'position';
  return changed();
}

function defDoor(d) {
  const p = prep;
  const s = p.setup;
  if (!p.gadgetOp) return toggleReinforcement(d);
  const op = opById(p.gadgetOp);
  p.gadgetOp = null;
  if (!targetKinds(op).includes('door')) return changed(`${op.name}'s ${op.gadget.class} goes on a zone.`);
  if (s.reinforcements.includes(d)) return changed('A reinforced door cannot hold a trap.');
  const taken = Object.entries(s.traps).find(([id, x]) => x === d && id !== op.id);
  if (taken) return changed(`${opById(taken[0]).name} already trapped that door.`);
  s.traps[op.id] = d;
  return changed();
}

function setPath(i, path) {
  prep.plan.groups[i].path = path;
  changed();
}

function placeAtk(target) {
  const p = prep;
  const op = opById(p.gadgetOp);
  const path = p.plan.groups.find(g => g.ops.includes(op.id))?.path ?? [];
  const kind = isDoor(target) ? 'door' : 'zone';
  p.gadgetOp = null;
  if (!targetKinds(op).includes(kind)) return changed(`${op.name}'s ${op.gadget.class} targets a ${kind === 'door' ? 'zone' : 'door'}.`);
  if (!(kind === 'door' ? Engine.doorsOf(path) : path).includes(target)) return changed(`${op.name} can only use the gadget on a ${kind} of its group's path.`);
  p.plan.gadgets[op.id] = target;
  return changed();
}

function atkZone(id) {
  const p = prep;
  const m = MAPS2[match.map];
  if (p.gadgetOp) return placeAtk(id);
  const g = p.plan.groups[p.group];
  if (!g) return;
  const at = g.path.indexOf(id);
  if (at >= 0 && at < g.path.length - 1) setPath(p.group, g.path.slice(0, at + 1));
  else if (at < 0 && m.spawns.includes(id)) setPath(p.group, [id]);
}

function atkDoor(d) {
  if (!prep.gadgetOp) return changed('Doors take breach charges and smoke: press Place next to an operator first.');
  return placeAtk(d);
}

function atkPath(i, path) {
  const m = MAPS2[match.map];
  const old = prep.plan.groups[i]?.path ?? [];
  if (path.slice(1).some(z => m.spawns.includes(z)) || (old[old.length - 1] === m.site && path.length > old.length)) return;
  setPath(i, path);
}

function moveOp(id, to) {
  const groups = prep.plan.groups;
  for (const g of groups) g.ops = g.ops.filter(x => x !== id);
  if (to !== '') groups[+to].ops.push(id);
}

function playPrep() {
  const p = prep;
  let round;
  const error = failure(() => {
    if (p.side === 'DEF') {
      const b = Engine.briefing(match, { setup: p.setup, armed: p.armed, seed: p.seed });
      round = Engine.playMatchRound(match, { setup: p.setup, seed: b.seed, armed: b.armed, enemyArmed: b.enemyArmed });
    } else {
      Engine.validatePlan(match.map, p.ops, p.plan);
      const { b } = p;
      round = Engine.playMatchRound(match, { plan: p.plan, defSetup: b.defSetup, seed: b.seed, armed: b.armed, enemyArmed: b.enemyArmed });
    }
  });
  if (error) return changed(error);
  prep = null;
  live = round;
  render();
}

function autoPlay() {
  stopLive();
  let armed = prep?.armed ?? [];
  prep = null;
  while (!match.over) {
    Engine.playMatchRound(match, { seed: newSeed(), armed });
    armed = [];
  }
  render();
}

function prepAction(act, el) {
  const p = prep;
  const d = el.dataset;
  const s = p.setup;
  switch (act) {
    case 'select': return defZone(d.zone);
    case 'move':
      s.positions[d.op] = p.selected;
      return changed();
    case 'tool':
      p.tool = d.tool;
      p.gadgetOp = null;
      return changed();
    case 'unreinforce': return toggleReinforcement(d.door);
    case 'suggest':
      if (p.side === 'DEF') p.setup = Engine.suggestSetup(match.map, p.ops);
      else {
        p.plan = Engine.suggestPlan(match.map, p.ops, p.b.revealed);
        p.group = 0;
      }
      p.gadgetOp = null;
      return changed();
    case 'replan':
      p.plan = Engine.adaptPlan(match.map, p.ops, p.plan, revealedNow(p));
      return changed();
    case 'confirm': return playPrep();
    case 'play': return playPrep();
    case 'auto': return autoPlay();
    case 'group':
      p.group = +d.g;
      p.gadgetOp = null;
      return changed();
    case 'add-group':
      if (p.plan.groups.length >= DATA.CONFIG.maxGroups) return null;
      p.plan.groups.push({ ops: [], path: [] });
      p.group = p.plan.groups.length - 1;
      p.gadgetOp = null;
      return changed();
    case 'remove-group':
      p.plan.groups.splice(+d.g, 1);
      p.group = 0;
      return changed();
    case 'gadget':
      if (p.side === 'ATK' && !p.plan.groups.some(g => g.ops.includes(d.op))) return changed(`Put ${opById(d.op).name} in a group first.`);
      p.gadgetOp = p.gadgetOp === d.op ? null : d.op;
      return changed();
    case 'clear-gadget':
      if (p.side === 'ATK') delete p.plan.gadgets[d.op];
      else delete s[setupKey(opById(d.op))][d.op];
      return changed();
    default: return null;
  }
}

function prepChange(act, el) {
  const p = prep;
  const d = el.dataset;
  switch (act) {
    case 'arm':
      p.armed = el.checked ? [...new Set([...p.armed, d.op])] : p.armed.filter(id => id !== d.op);
      if (p.side === 'ATK') brief(p);
      return changed();
    case 'example': {
      if (!el.value) return null;
      if (p.side === 'DEF') p.setup = Engine.defaultSetup(match.map, p.ops, el.value);
      else {
        p.plan = Engine.defaultPlan(match.map, p.ops, el.value, p.b.revealed);
        p.group = 0;
      }
      p.gadgetOp = null;
      return changed();
    }
    case 'roam':
      p.setup.roam ??= {};
      if (el.checked) p.setup.roam[d.op] = true;
      else delete p.setup.roam[d.op];
      return changed();
    case 'assign':
      moveOp(d.op, el.value);
      return changed();
    case 'route':
      if (el.value === '') return null;
      p.group = +d.g;
      return setPath(+d.g, [...p.routes[+el.value]]);
    default: return null;
  }
}

function renderMatch() {
  const view = $('match-view');
  if (live && !match?.rounds.includes(live)) stopLive();
  if (!match) {
    view.innerHTML = '<p class="hint">Start a match: your squad plays the opponent from the ATK or DEF squad tab.</p>';
    return;
  }
  const done = live ? match.rounds.slice(0, -1) : match.rounds;
  const won = done.filter(r => r.result.winner === r.playerSide).length;
  const head = `<h2 class="scoreline">You <b>${won} : ${done.length - won}</b> Opponent <small>${match.map}</small></h2>${matchStrip(done, live && match.rounds.length)}`;
  const rounds = done.map((r, i) => roundView(r, i + 1, !live && i === done.length - 1)).reverse().join('');
  if (live) {
    const n = match.rounds.length;
    view.innerHTML = `${head}<div id="pb-host"></div>${rounds}`;
    Playback.start(live, $('pb-host'), {
      title: `Round ${n}: you ${live.playerSide === 'ATK' ? 'attack' : 'defend'} · ${live.map} · seed ${live.seed}`,
      onEnd: () => {
        live = null;
        renderMatch();
      },
    });
    return;
  }
  if (match.over) {
    const youWin = match.score.player > match.score.enemy;
    const unused = Engine.unusedAbilities(match, null, 'player');
    const abilities = unused.length ? `Never used: ${unused.map(a => `${a.name} (${a.active}, ${a.side})`).join(', ')}.` : 'Every ability was used this match.';
    view.innerHTML = `${head}<p><b class="badge ${youWin ? 'win' : 'loss'}">${youWin ? 'You win the match.' : 'You lose the match.'}</b> Match MVP: ${matchMvp()}</p><p class="hint">Abilities: ${abilities}</p>${rounds}`;
    if (match.ladder && Ladder.record(match, whyPanel(match.rounds.at(-1)))) renderLadder();
    return;
  }
  const side = ensurePrep().side;
  view.innerHTML = `${head}<div class="panel" id="prep"></div><h4>Your ${side} line-up</h4><div id="lineup"></div>${rounds}`;
  renderPrep();
  Cards.mount($('lineup'), sideOps(player, side), true, match);
}

function simTable(title, first, rows) {
  const body = rows.map(([k, v]) => `<tr><td>${k}</td><td class="num">${pct(v.atkWins, v.rounds)}</td><td class="num">${pct(v.timeouts, v.rounds)}</td><td class="num">${(v.steps / v.rounds).toFixed(2)}</td><td class="num">${v.rounds}</td></tr>`).join('');
  return `<h3>${title}</h3><div class="scroll"><table><thead><tr><th>${first}</th><th class="num">ATK win</th><th class="num">Time outs</th><th class="num">Avg steps</th><th class="num">Rounds</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function planName(key) {
  const at = key.lastIndexOf(' · ');
  const [a = '', d = ''] = key.slice(at + 3).match(/\([^)]*\)|[A-Z]/g) ?? [];
  const name = (x, table) => table[x]?.name ?? x.replace(/[()]/g, '');
  return `${key.slice(0, at)} · ${name(a, DATA.ATK_TEMPLATES)} v ${name(d, DATA.DEF_TEMPLATES)}`;
}

function renderSim(t) {
  const summary = [
    ['Your match win', pct(t.won, t.matches)],
    ['Your round win', pct(t.roundsWon, t.rounds)],
    ['ATK round win', pct(t.atkWins, t.rounds)],
    ['Avg steps per round', (t.steps / t.rounds).toFixed(2)],
    ['First kill → round win', pct(t.firstBloodWon, t.firstBlood)],
  ];
  $('sim-view').innerHTML = `<div class="scroll"><table>${summary.map(([k, v]) => `<tr><th>${k}</th><td class="num">${v}</td></tr>`).join('')}</table></div>
<h3>How rounds end</h3><div class="scroll"><table>${Object.entries(t.reasons).sort().map(([k, v]) => `<tr><td>${k}</td><td class="num">${pct(v, t.rounds)}</td></tr>`).join('')}</table></div>
${simTable('By map', 'Map', Object.entries(t.maps).sort())}
${simTable('By plan (ATK v DEF: template or AI pool entry)', 'Map · Plan', Object.entries(t.plans).sort().map(([k, v]) => [planName(k), v]))}`;
}

let ladderConfirm = false;

function renderLadder() {
  const { run, storageOk, notice } = Ladder.state;
  const s = Ladder.standings();
  const next = Ladder.opponent();
  const last = run.results.at(-1);
  const inProgress = next && match?.ladder?.runId === run.id && match.ladder.index === run.current && !match.over;
  const rows = run.opponents.map((o, i) => {
    const r = run.results[i];
    const result = r ? `<b class="badge ${r.won ? 'win' : 'loss'}">${r.won ? 'W' : 'L'}</b> ${r.roundsFor} : ${r.roundsAgainst} <small>${r.map}</small>` : i === run.current ? 'Next' : '—';
    return `<tr><td class="num">${i + 1}</td><td>${o.archetype}</td><td class="num">${o.quality}</td><td>${result}</td></tr>`;
  });
  const reset = ladderConfirm
    ? '<span>Start a new run? Current results are discarded.</span> <button id="ladder-confirm" class="primary">Yes, new run</button> <button id="ladder-cancel">Cancel</button>'
    : '<button id="ladder-new">New run</button>';
  const lastPanel = last ? `<div class="panel"><h3>Last match: opponent ${last.index + 1} · <span class="badge ${last.won ? 'win' : 'loss'}">${last.won ? 'WON' : 'LOST'}</span> ${last.roundsFor} : ${last.roundsAgainst}</h3>${last.why || `<p>Last round: you ${last.lastRound.playerSide}, ${last.lastRound.winner} won by ${last.lastRound.reason} in ${last.lastRound.steps} steps.</p>`}</div>` : '';
  const nextPanel = next
    ? `<div class="panel"><h3>Next opponent ${run.current + 1} of ${run.opponents.length}: ${next.archetype} · quality ${next.quality}</h3><p class="hint">Their plans and setups are drawn from the ${next.archetype} AI pool: ${DATA.CONFIG.poolSize} small-group plans and ${DATA.CONFIG.poolSize} setups per map, so rounds differ.</p><p class="actions"><button id="ladder-play" class="primary">${inProgress ? 'Continue match' : 'Play match'}</button></p><div id="ladder-opponent"></div></div>`
    : `<p><b class="badge ${s.wins > s.losses ? 'win' : 'loss'}">Run complete: ${s.wins} W / ${s.losses} L</b></p>`;
  $('ladder-view').innerHTML = `${storageOk ? '' : '<p class="hint">Storage is unavailable: this run will not survive a reload.</p>'}${notice ? `<p class="error" role="status">${notice}</p>` : ''}
<div class="bar"><span>Matches <b>${s.wins} W / ${s.losses} L</b> · Rounds <b>${s.roundsFor} : ${s.roundsAgainst}</b></span> ${reset}</div>
${lastPanel}${nextPanel}<h3>Standings</h3><div class="scroll"><table><thead><tr><th class="num">#</th><th>Archetype</th><th class="num">Quality</th><th>Result</th></tr></thead>${rows.join('')}</table></div>`;
  if (next) {
    Cards.mount($('ladder-opponent'), next.squad, false);
    $('ladder-play').onclick = () => {
      if (!inProgress) {
        enemy = Engine.cloneSquad(next.squad);
        $('new-match').onclick();
        match.ladder = { runId: run.id, index: run.current };
        Ladder.setPlayer(player);
      }
      document.querySelector('nav [data-tab="match"]').click();
      render();
    };
  }
  if (ladderConfirm) {
    $('ladder-confirm').onclick = () => {
      ladderConfirm = false;
      Ladder.state.notice = '';
      Ladder.newRun(newSeed(), player);
      renderLadder();
    };
    $('ladder-cancel').onclick = () => {
      ladderConfirm = false;
      renderLadder();
    };
  } else {
    $('ladder-new').onclick = () => {
      ladderConfirm = true;
      renderLadder();
    };
  }
}

function render() {
  Squad.mount($('atk-view'), 'ATK', player, enemy, match);
  Squad.mount($('def-view'), 'DEF', player, enemy, match);
  renderMatch();
  renderLadder();
}

document.querySelectorAll('nav button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('section').forEach(sec => (sec.hidden = sec.id !== btn.dataset.tab));
  };
});

for (const id of ['map', 'sim-map']) $(id).insertAdjacentHTML('beforeend', Object.keys(MAPS2).map(m => `<option>${m}</option>`).join(''));
$('sim-atk').insertAdjacentHTML('beforeend', Object.entries(DATA.ATK_TEMPLATES).map(([k, t]) => `<option value="${k}">Template ${k}: ${t.name}</option>`).join(''));
$('sim-def').insertAdjacentHTML('beforeend', Object.entries(DATA.DEF_TEMPLATES).map(([k, t]) => `<option value="${k}">Template ${k}: ${t.name}</option>`).join(''));

$('new-opponent').onclick = () => {
  enemy = Engine.generateSquad(inputNumber('quality', 20, 90));
  match = null;
  render();
};
$('mirror-opponent').onclick = () => {
  enemy = Engine.cloneSquad(player).map((op, i) => ({ ...op, id: `m${i + 1}`, name: `${op.name} II` }));
  match = null;
  render();
};
$('new-match').onclick = () => {
  const maps = Object.keys(MAPS2);
  match = Engine.newMatch(player, enemy, $('map').value || maps[Math.floor(Math.random() * maps.length)]);
  prep = null;
  render();
};
$('match-view').onclick = e => {
  const el = e.target.closest?.('[data-act]');
  if (el && prep && el.tagName === 'BUTTON') prepAction(el.dataset.act, el);
};
$('match-view').onchange = e => {
  const el = e.target.closest?.('[data-act]');
  if (el && prep && el.tagName !== 'BUTTON') prepChange(el.dataset.act, el);
};
$('match-view').oninput = e => {
  const i = e.target.dataset.round;
  if (i) $(`replay-${i}`).innerHTML = replay(match.rounds[i], +e.target.value);
};
$('run-sim').onclick = () => {
  $('sim-view').textContent = 'Running…';
  setTimeout(() => renderSim(Engine.simulate({
    player, matches: inputNumber('sim-matches', 1, 5000), quality: inputNumber('sim-quality', 20, 90), map: $('sim-map').value, mirror: $('sim-mirror').checked,
    atkTemplate: $('sim-atk').value || undefined, defTemplate: $('sim-def').value || undefined,
  })));
};

render();
