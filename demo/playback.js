const Playback = (() => {
  const SPEEDS = [0.5, 1, 2, 4];
  const MOVE = 0.6;
  const BACK = 0.85;
  const $ = id => document.getElementById(id);
  const num = x => x.toFixed(1);
  const signed = x => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(Number.isInteger(x) ? 0 : 1)}`;
  const statMods = mods => Object.entries(mods).map(([s, v]) => `${signed(v)} ${s}`).join(' ');
  const statusName = s => (s >= 1 ? 'ATK' : s <= -1 ? 'DEF' : 'contested');
  const other = side => (side === 'ATK' ? 'DEF' : 'ATK');
  const zoneLabel = (map, z) => MAPS2[map].zones[z]?.label ?? z;
  const doorLabel = (map, d) => String(d).split('|').map(z => zoneLabel(map, z)).join(' – ');
  const opOf = (r, id) => [...r.ops.ATK, ...r.ops.DEF].find(x => x.id === id);
  const named = (r, id) => {
    const op = opOf(r, id);
    return op ? `${Visuals.icon(op)}${op.name}` : id;
  };

  function teamCell(t) {
    const parts = [['numbers', t.numbers], ['hold', t.hold], ['zone', t.zone], ['momentum', t.momentum], ['planning', t.planning]].filter(([, v]) => v);
    const support = t.support?.length ? [`support ${t.support.map(x => num(x.score)).join(' / ')}`] : [];
    const detail = [`avg ${num(t.avg)}`, ...support, ...parts.map(([k, v]) => `${k} ${signed(v)}`), `random ${signed(t.random)}`].map(x => `<span>${x}</span>`).join(' · ');
    const perOperator = [...t.scores.map(x => `${x.name}: ${num(x.score)}`), ...(t.support ?? []).map(x => `${x.name} (support from next door): ${num(x.score)}`)].join('\n');
    return `<td class="score" title="${perOperator}"><b>${num(t.total)}</b><br><small>${detail}</small></td>`;
  }

  const MODIFIER_NAMES = { reinforced: 'reinforced door', smoke: 'smoke', revealed: 'spotted' };
  const modifierTags = f => [...Object.keys(MODIFIER_NAMES).filter(k => f.modifiers[k]).map(k => MODIFIER_NAMES[k]), f.modifiers.trapped.length && 'trapped'].filter(Boolean);

  function eventLine(e, r) {
    const z = id => zoneLabel(r.map, id);
    const op = id => opOf(r, id)?.name ?? id;
    const door = d => `the ${doorLabel(r.map, d)} door`;
    const via = () => e.path.slice(e.path.indexOf(e.to) + 1).map(z).join(' → ');
    switch (e.type) {
      case 'taken': return `<span class="ATK">ATK</span> takes ${z(e.zone)}`;
      case 'planted': return `<b>Bomb planted</b> at ${z(e.zone)}`;
      case 'reroute': return e.door ? `Group ${e.group + 1} reroutes around ${door(e.door)} via ${via()}` : `Group ${e.group + 1} falls back to ${z(e.to)} and reroutes via ${via()}`;
      case 'rotate': return `<span class="DEF">${op(e.op)}</span> rotates ${z(e.from)} → ${z(e.to)}`;
      case 'trap': return `Group ${e.group + 1} springs a trap on ${door(e.door)}: −${DATA.CONFIG.trapDebuff} every stat in its next fight`;
      case 'alarm': return `Group ${e.group + 1} trips an alarm on ${door(e.door)}`;
      case 'disarm': return `Group ${e.group + 1} disarms the trap on ${door(e.door)}`;
      case 'breach': return `<span class="ATK">${op(e.op)}</span> breaches ${door(e.door)}`;
      case 'blocked': return `Group ${e.group + 1} is blocked by ${door(e.door)}${e.waitFor ? ` and waits for ${op(e.waitFor)}'s charge` : ''}`;
      case 'reveal': return `DEF tracks Group ${e.group + 1} from now on`;
      case 'defused': return '<b>Bomb defused</b>';
      case 'detonated': return '<b>Bomb detonates</b>';
      case 'timeout': return '<b>Time out</b>';
      default: return e.type;
    }
  }

  const waitLines = (s, r) => [...(s.waiting ?? []).map(g => `Group ${g + 1} holds for the other groups`), ...Narrate.queues(s, r)];
  const eventList = (s, r) => {
    const waits = waitLines(s, r);
    return s.events.length || waits.length ? `<ul class="events">${waits.map(x => `<li class="ev-waiting">${x}</li>`).join('')}${s.events.map(e => `<li class="ev-${e.type}">${eventLine(e, r)}</li>`).join('')}</ul>` : '';
  };

  function fightRow(f, r) {
    const kills = f.kills.map(k => `<span class="${k.side}">${named(r, k.victimId)}</span> killed by ${named(r, k.killerId)}`);
    const after = f.event === 'planted' ? 'planted' : statusName(f.status);
    const tags = modifierTags(f);
    return `<tr><td>${f.step}</td><td>${zoneLabel(r.map, f.zone)}<br><small>${f.phase} · ${statusName(f.statusBefore)} → ${after}</small></td><td>${f.situation}${tags.length ? `<br><small>${tags.join(', ')}</small>` : ''}</td>${teamCell(f.ATK)}${teamCell(f.DEF)}<td class="${f.winner}">${f.winner} ${f.strength} <small>(${signed(f.diff)})</small></td><td>${[...kills, f.event && `<b>${f.event}</b>`].filter(Boolean).join('<br>')}</td></tr>`;
  }

  function stepRows(s, r) {
    if (s.step === 0) {
      const i = s.intel;
      const loser = other(i.winner);
      const effects = [`${i.winner} ${statMods(i.buff)}`, Object.keys(i.debuff).length && `${loser} ${statMods(i.debuff)}`].filter(Boolean).join(', ');
      return `<tr><td>0</td><td>Planning</td><td>Info</td><td><b>${num(i.atkIntel)}</b></td><td><b>${num(i.defIntel)}</b></td><td class="${i.winner}">${i.winner} intel <small>(${signed(i.diff)})</small></td><td>${effects}${i.learned.length ? `<br><small>ATK learns ${i.learned.join(', ')}</small>` : ''}</td></tr>`;
    }
    const notes = [...waitLines(s, r), ...s.events.map(e => eventLine(e, r))];
    const events = notes.length ? `<tr class="ev-row"><td>${s.step}</td><td colspan="6"><small>${notes.join(' · ')}</small></td></tr>` : '';
    return s.fights.length || events ? s.fights.map(f => fightRow(f, r)).join('') + events : `<tr class="ev-row"><td>${s.step}</td><td colspan="6"><small>No contact</small></td></tr>`;
  }

  const stepTable = body => `<div class="scroll"><table class="steps"><thead><tr><th>#</th><th>Zone</th><th>Situation</th><th class="ATK">ATK</th><th class="DEF">DEF</th><th>Result</th><th>Kills</th></tr></thead>${body}</table></div>`;

  function walkedZones(r, i, n) {
    const zones = [];
    for (const s of r.log.slice(0, n + 1)) {
      const back = s.events.find(e => e.type === 'reroute' && e.group === i);
      for (const z of [back?.from, s.groups[i]]) if (z && zones[zones.length - 1] !== z) zones.push(z);
    }
    return zones;
  }

  function stepState(r, n) {
    const done = r.log.slice(1, n + 1).flatMap(s => s.events);
    const groups = r.plan.groups.map((g, i) => ({ ops: g.ops, path: [...g.path], walked: walkedZones(r, i, n) }));
    for (const e of done) if (e.type === 'reroute') groups[e.group].path = e.path;
    const opened = new Set([...(r.log[0].canceled ?? []), ...done.filter(e => e.type === 'breach').map(e => e.door)]);
    const cleared = new Set(r.log.slice(1, n).flatMap(s => s.events).filter(e => ['trap', 'alarm', 'disarm'].includes(e.type)).map(e => e.door));
    const setup = { ...r.setup, reinforcements: (r.setup.reinforcements ?? []).filter(d => !opened.has(d)), traps: Object.values(r.setup.traps ?? {}).filter(d => !cleared.has(d)) };
    const ops = [...r.ops.ATK, ...r.ops.DEF].map(op => ({ ...op, alive: !op.diedAt || op.diedAt > n }));
    return { setup, plan: { groups, gadgets: r.plan.gadgets ?? {} }, step: r.log[n], ops, canceled: n === 0 ? r.log[0].canceled ?? [] : [] };
  }

  const quiet = s => ({ ...s, fights: [], events: [], kills: [], waiting: [], doors: {} });
  function calmState(r, k) {
    if (k === 0) return { ...stepState(r, 0), setup: { ...r.setup, traps: Object.values(r.setup.traps ?? {}) }, canceled: [], step: quiet(r.log[0]) };
    const s = stepState(r, k - 1);
    return { ...s, setup: { ...s.setup, traps: stepState(r, k).setup.traps }, canceled: [], step: quiet(r.log[k - 1]) };
  }

  const aliveAt = (r, side, n) => r.ops[side].filter(op => !op.diedAt || op.diedAt > n).length;

  function hintLine(r, n) {
    const s = r.log[n];
    return `Step ${n} of ${r.step} · ${s.phase} · alive <span class="ATK">ATK ${aliveAt(r, 'ATK', n)}</span> <span class="DEF">DEF ${aliveAt(r, 'DEF', n)}</span>${s.fights.length ? ` · ${s.fights.length} fight${s.fights.length > 1 ? 's' : ''}` : ''}`;
  }

  function replay(r, n) {
    return `<p class="hint">${hintLine(r, n)}</p><div class="plan-host">${FloorPlan.plan(r.map, stepState(r, n), { mode: 'playback', legend: true })}</div>`;
  }

  function stepDetail(r, n) {
    const s = r.log[n];
    if (n === 0) {
      const count = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
      const known = Object.keys(s.revealed.positions).length;
      const replanned = Object.keys(s.replanned ?? {}).map(i => `Group ${+i + 1}`);
      return `<p class="hint">Planning: ${count(s.plan.groups.length, 'ATK group')}, ${count(s.setup.reinforcements.length, 'reinforced door')}, ${count(Object.keys(s.setup.traps ?? {}).length, 'trap')}. ATK knew ${count(known, 'defender position')}, ${count(s.revealed.reinforcements.length, 'reinforced door')} and ${count(s.revealed.traps.length, 'trap')}${s.canceled.length ? `; a planned breach opened the ${s.canceled.map(d => doorLabel(r.map, d)).join(', ')} door` : ''}${replanned.length ? `; ${replanned.join(', ')} replanned around known reinforcements` : ''}.</p>`;
    }
    const fights = s.fights.length ? stepTable(`<tbody>${s.fights.map(f => fightRow(f, r)).join('')}</tbody>`) : '<p class="hint">No contact this step.</p>';
    return `${eventList(s, r)}${fights}`;
  }

  const TERMS = ['avg', 'zone', 'momentum', 'random'];
  const PRESSURE = ['Breach', 'Objective'];
  const breakdown = x => `${x.name} ${num(x.score)} = base ${num(x.parts.base)}${Object.entries(x.parts.mult).map(([k, v]) => ` × ${k} ${v.toFixed(2)}`).join('')}${Object.entries(x.parts.add).map(([k, v]) => ` ${signed(v)} ${k}`).join('')}`;

  function whyPanel(r) {
    const fights = r.log.flatMap(s => s.fights);
    const f = fights.findLast(x => x.kills.length) ?? fights[fights.length - 1];
    if (!f) return `<div class="why"><p><b>Why:</b> no fight decided this round; it ended by ${r.result.reason}.</p></div>`;
    const me = r.playerSide;
    const sign = me === 'ATK' ? 1 : -1;
    const item = (text, d) => `<li class="${d > 0 ? 'win' : 'loss'}">${text} ${signed(Math.round(d))}</li>`;
    const label = { avg: 'Operator scores', zone: `${f.statusBefore > 0 ? 'Attacker' : 'Defender'} zone control`, momentum: 'Momentum', random: 'Luck' };
    const factors = TERMS.map(t => [t, sign * (f.ATK[t] - f.DEF[t])])
      .filter(([, d]) => Math.round(d))
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([t, d]) => item(label[t], d));
    const pressure = PRESSURE.includes(f.situation);
    const C = DATA.CONFIG;
    const mine = me === 'ATK' ? f.ATK.scores.length : f.DEF.scores.length;
    const theirs = me === 'ATK' ? f.DEF.scores.length : f.ATK.scores.length;
    const good = (text, forAtk) => `<li class="${(me === 'ATK') === forAtk ? 'win' : 'loss'}">${text}</li>`;
    const door = d => `the ${doorLabel(r.map, d)} door`;
    const occupant = f.entrySides?.occupant;
    const entries = f.entrySides?.doors.length ?? 0;
    const hold = f.ATK.hold - f.DEF.hold;
    const sup = side => f[side].support?.length ?? 0;
    const events = r.log.flatMap(s => s.events);
    const planning = [
      occupant && Math.round(hold) && item(entries === 1 ? `${occupant} held the only entry door` : `${occupant} was split across ${entries} entry doors`, sign * hold),
      f.modifiers.trapped.length && good(`Trap on ${f.modifiers.trapped.map(i => `Group ${i + 1}`).join(', ')}: ATK −${C.trapDebuff} every stat`, false),
      f.modifiers.smoke && pressure && item('Smoke', sign * C.smokeBonus),
      Math.round(f.ATK.numbers - f.DEF.numbers) && item(`Numbers ${mine}${sup(me) ? ` + ${sup(me)} next door` : ''} v ${theirs}${sup(other(me)) ? ` + ${sup(other(me))} next door` : ''}`, sign * (f.ATK.numbers - f.DEF.numbers)),
      ...(r.log[0].canceled ?? []).map(d => good(`A planned breach opened ${door(d)} before the round`, true)),
      ...events.filter(e => e.type === 'breach').map(e => good(`${opOf(r, e.op)?.name ?? e.op} breached ${door(e.door)}`, true)),
      ...events.filter(e => e.type === 'blocked').map(e => good(`Group ${e.group + 1} was blocked by ${door(e.door)}`, false)),
      ...events.filter(e => e.type === 'trap').map(e => good(`Group ${e.group + 1} sprang the trap on ${door(e.door)}`, false)),
      r.log[f.step]?.waiting?.length && `<li>${r.log[f.step].waiting.map(g => `Group ${g + 1}`).join(', ')} held back to go in together</li>`,
    ].filter((x, i, all) => x && all.indexOf(x) === i);
    const title = ` title="${['ATK', 'DEF'].map(side => `${side}\n${f[side].scores.map(breakdown).join('\n')}`).join('\n\n')}"`;
    return `<div class="why"${title}><p><b>Why:</b> decisive fight on step ${f.step}, ${f.situation} at ${zoneLabel(r.map, f.zone)}. You ${f.winner === me ? 'won' : 'lost'} it by ${num(Math.abs(f.diff))}.</p>${factors.length ? `<ul>${factors.join('')}</ul>` : ''}${planning.length ? `<ul class="plan-mods">${planning.join('')}</ul>` : ''}</div>`;
  }

  function sidePanel(r, n) {
    const kills = r.log.slice(0, n + 1).flatMap(s => s.kills.map(k => ({ ...k, step: s.step })));
    const dead = new Set(kills.map(k => k.victimId));
    const lineup = ['ATK', 'DEF'].map(side => `<p class="lineup"><b class="${side}">${side}${side === r.playerSide ? ' (you)' : ''}</b> ${r.ops[side].map(op => `<span class="chip${dead.has(op.id) ? ' dead' : ''}">${Visuals.icon(op)}${op.name}</span>`).join('')}</p>`).join('');
    const feed = kills.length
      ? `<ol class="feed">${kills.map(k => `<li${k.step === n ? ' class="new"' : ''}><small>Step ${k.step}</small> ${named(r, k.killerId)} <span class="${k.side}">✕</span> <span class="victim">${named(r, k.victimId)}</span></li>`).join('')}</ol>`
      : '<p class="hint">No kills yet.</p>';
    return `${stepDetail(r, n)}${lineup}<h4>Kill feed</h4>${feed}`;
  }

  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raf = cb => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(() => cb(Date.now()), 16));
  const caf = id => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));
  const fmt = list => (list.length > 1 ? list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') : '');

  function track(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }

  function pointAt({ pts, cum }, l) {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < l) i++;
    if (pts.length < 2) return pts[0];
    const span = cum[i] - cum[i - 1];
    const f = span ? clamp((l - cum[i - 1]) / span) : 1;
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  }

  function cut(tr, l, stop = tr.len) {
    const p = pointAt(tr, l);
    const head = [...tr.pts.filter((_, i) => tr.cum[i] < l), p];
    const tail = [p, ...tr.pts.filter((_, i) => tr.cum[i] > l && tr.cum[i] <= stop + 1e-6)];
    return { head, tail };
  }

  function build(r) {
    const ops = [...r.ops.ATK, ...r.ops.DEF];
    const atk = new Set(r.ops.ATK.map(op => op.id));
    const groupOf = {};
    r.plan.groups.forEach((g, i) => g.ops.forEach(id => (groupOf[id] = i)));
    const slots = (k, during) => {
      const s = r.log[k];
      const attackers = { ...s.attackers };
      if (during) {
        for (const e of s.events) {
          if (e.type !== 'reroute' || e.door) continue;
          for (const id of s.doors[Engine.doorId(e.from, e.to)]?.crossed ?? []) if (groupOf[id] === e.group && attackers[id] === e.to) attackers[id] = e.from;
        }
      }
      const list = ops.map(op => ({ ...op, alive: !op.diedAt || (during ? op.diedAt >= k : op.diedAt > k) }));
      return Object.fromEntries(FloorPlan.tokens(r.map, { plan: r.plan, setup: r.setup, step: { groups: s.groups, attackers, defenders: s.defenders } }, list).map(t => [t.id, t]));
    };
    const leg = (a, b) => track(a.zone === b.zone ? [[a.x, a.y], [b.x, b.y]] : [[a.x, a.y], ...FloorPlan.route(r.map, a.zone, b.zone).slice(1, -1), [b.x, b.y]]);
    const ends = r.log.map((_, k) => slots(k, false));
    const segs = r.log.map((_, k) => {
      const mids = k ? slots(k, true) : ends[0];
      return Object.fromEntries(ops.map(op => {
        const a = k ? ends[k - 1][op.id] : ends[0][op.id];
        const b = mids[op.id];
        const dying = !!op.diedAt && op.diedAt === k;
        const c = dying ? b : ends[k][op.id];
        const rotate = !atk.has(op.id) && a.zone !== b.zone ? track(FloorPlan.route(r.map, a.zone, b.zone)) : null;
        return [op.id, { a, b, c, dying, gone: !!op.diedAt && op.diedAt < k, move: leg(a, b), back: leg(b, c), rotate }];
      }));
    });
    const trails = r.plan.groups.map((g, i) => {
      const zones = [r.log[0].groups[i]];
      let path = [...g.path];
      const marks = [];
      const future = [];
      r.log.forEach((s, k) => {
        const start = k ? marks[k - 1].end : 0;
        const back = k ? s.events.find(e => e.type === 'reroute' && e.group === i) : null;
        const add = z => zones[zones.length - 1] !== z && zones.push(z);
        add(back ? back.from : s.groups[i]);
        const mid = zones.length - 1;
        add(s.groups[i]);
        const end = zones.length - 1;
        if (back) path = back.path;
        marks.push({ start, mid, end });
        const at = path.indexOf(zones[end]);
        future.push(FloorPlan.chain(r.map, [zones[end], ...path.slice(at + 1)]).slice(1));
      });
      const pts = FloorPlan.chain(r.map, zones.slice(0, 1));
      const zoneAt = [0];
      for (let j = 1; j < zones.length; j++) {
        pts.push(...FloorPlan.route(r.map, zones[j - 1], zones[j]).slice(1));
        zoneAt.push(pts.length - 1);
      }
      const tr = track(pts);
      return { tr, future, lens: marks.map(m => ({ start: tr.cum[zoneAt[m.start]], mid: tr.cum[zoneAt[m.mid]], end: tr.cum[zoneAt[m.end]] })) };
    });
    return { ops: ops.map(op => op.id), atk, groupOf, segs, trails };
  }

  let pb = null;
  let speed = 1;
  let uidSeq = 0;

  function frame(time) {
    const { stepMs, N } = pb;
    const k = Math.min(N, Math.floor(time / stepMs));
    const t = Math.min(1, time / stepMs - k);
    const ease = reduced() ? x => (x > 0 ? 1 : 0) : smooth;
    const mv = ease(clamp(t / MOVE));
    const bk = ease(clamp((t - BACK) / (1 - BACK)));
    const fade = ease(clamp((t - MOVE) / (BACK - MOVE)));
    const tokens = {};
    const trails = {};
    for (const id of pb.ops) {
      const s = pb.segs[k][id];
      const [x, y] = t < MOVE ? pointAt(s.move, mv * s.move.len) : t < BACK || s.dying ? [s.b.x, s.b.y] : pointAt(s.back, bk * s.back.len);
      const zone = bk >= 1 && !s.dying ? s.c.zone : mv >= 1 ? s.b.zone : s.a.zone;
      tokens[id] = { x, y, zone, opacity: s.gone ? 0 : s.dying ? 1 - fade : 1 };
      if (s.gone) trails[id] = { walked: '', rest: '' };
      else if (pb.atk.has(id)) {
        const g = pb.trails[pb.groupOf[id]];
        const L = g.lens[k];
        const l = t < MOVE ? L.start + (L.mid - L.start) * mv : L.mid + (L.end - L.mid) * bk;
        const { head, tail } = cut(g.tr, l, L.end);
        trails[id] = { walked: fmt(head), rest: fmt([...tail, ...g.future[k]]) };
      } else if (s.rotate) {
        const { head, tail } = cut(s.rotate, mv * s.rotate.len);
        trails[id] = { walked: fmt(head), rest: fmt(tail) };
      } else trails[id] = { walked: '', rest: '' };
    }
    return { k, t, fight: t >= MOVE, tokens, trails };
  }

  const setAttr = (el, name, value) => {
    if (!el || el[`_${name}`] === value) return;
    el[`_${name}`] = value;
    el.setAttribute(name, value);
  };

  function swapLayers(k, fight) {
    const r = pb.round;
    const svg = pb.svg;
    if (!svg?.querySelector) return;
    const parts = FloorPlan.plan(r.map, fight ? stepState(r, k) : calmState(r, k), { mode: 'playback', uid: pb.uid, parts: true });
    for (const key of ['rooms', 'marks', 'doors', 'kills']) {
      svg.querySelectorAll(`.${key}.old`).forEach(el => el.remove());
      const cur = svg.querySelector(`.${key}:not(.old)`);
      if (!cur) continue;
      cur.insertAdjacentHTML('afterend', parts[key]);
      const fresh = cur.nextElementSibling;
      if (key === 'rooms') {
        cur.classList?.add('old');
        fresh?.classList?.add('enter');
      } else cur.remove?.();
    }
  }

  function panels(n) {
    const r = pb.round;
    const set = (id, html) => {
      const el = $(id);
      if (el) el.innerHTML = html;
    };
    set('pb-narration', `<p class="narration">${Narrate.step(r.log[n], r)}</p>`);
    set('pb-hint', hintLine(r, n));
    set('pb-detail', sidePanel(r, n));
    set('pb-steps', r.log.slice(0, n + 1).map(s => stepRows(s, r)).join(''));
  }

  function render() {
    const f = frame(pb.time);
    const key = `${f.k}${f.fight ? 'f' : 'c'}`;
    if (pb.key !== key) {
      pb.key = key;
      swapLayers(f.k, f.fight);
      const sup = new Set(f.fight ? pb.round.log[f.k].fights.flatMap(x => [...x.supporters.ATK, ...x.supporters.DEF]) : []);
      for (const [id, el] of Object.entries(pb.els)) el?.classList?.toggle('support', sup.has(id));
    }
    const n = f.fight ? f.k : Math.max(0, f.k - 1);
    if (pb.panel !== n) {
      pb.panel = n;
      panels(n);
    }
    for (const [id, p] of Object.entries(f.tokens)) {
      const el = pb.els[id];
      setAttr(el, 'transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      setAttr(el, 'opacity', p.opacity >= 1 ? '1' : p.opacity.toFixed(2));
      setAttr(el, 'data-zone', p.zone);
    }
    for (const [id, tr] of Object.entries(f.trails)) {
      setAttr(pb.trailEls[id]?.walked, 'points', tr.walked);
      setAttr(pb.trailEls[id]?.rest, 'points', tr.rest);
    }
    const scrub = $('pb-scrub');
    if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round((pb.time / pb.stepMs) * 1000));
    pb.frame = f;
  }

  function shell() {
    const r = pb.round;
    const title = pb.options.title ?? `Round · ${r.map}`;
    return `<div class="panel playback"><h3>${title}</h3>
<p class="actions"><button id="pb-pause">${pb.paused ? 'Resume' : 'Pause'}</button> <span class="speed" role="group" aria-label="Speed">${SPEEDS.map(x => `<button data-speed="${x}" aria-pressed="${x === speed}">×${x}</button>`).join('')}</span> <button id="pb-skip">Skip to end</button> <small>Space pauses</small></p>
<p class="pb-scrub"><label>Timeline <input id="pb-scrub" type="range" min="0" max="${(pb.N + 1) * 1000}" step="1" value="0"></label></p>
<div id="pb-narration" aria-live="polite"></div>
<div class="playfield"><div><p class="hint" id="pb-hint"></p><div class="plan-host" id="pb-plan"></div></div><div id="pb-detail"></div></div>
<details id="pb-table" class="sub"${pb.tableOpen ? ' open' : ''}><summary>Step table</summary>${stepTable('<tbody id="pb-steps"></tbody>')}</details></div>`;
  }

  function mount(container) {
    pb.container = container;
    container.innerHTML = shell();
    const host = $('pb-plan');
    host.innerHTML = FloorPlan.plan(pb.round.map, calmState(pb.round, 0), { mode: 'playback', legend: true, uid: pb.uid });
    pb.svg = host.querySelector('svg');
    pb.els = {};
    pb.trailEls = {};
    for (const el of pb.svg?.querySelectorAll?.('.tokens [data-op]') ?? []) pb.els[el.dataset.op] = el;
    for (const el of pb.svg?.querySelectorAll?.('[data-trail]') ?? []) (pb.trailEls[el.dataset.trail] ??= {})[el.classList.contains('walked') ? 'walked' : 'rest'] = el;
    pb.svg?.style?.setProperty('--fp-speed', speed);
    pb.svg?.classList?.toggle('paused', pb.paused);
    pb.key = null;
    pb.panel = null;
    $('pb-pause').onclick = togglePause;
    $('pb-skip').onclick = finish;
    $('pb-table').ontoggle = e => pb && (pb.tableOpen = e.target.open);
    $('pb-scrub').oninput = e => seek((+e.target.value / 1000) * pb.stepMs);
    container.querySelectorAll('[data-speed]').forEach(btn => (btn.onclick = () => setSpeed(+btn.dataset.speed)));
    render();
  }

  function loop() {
    caf(pb.raf);
    pb.last = null;
    pb.raf = pb.paused ? 0 : raf(tick);
  }

  function tick(ts) {
    if (!pb) return;
    pb.raf = 0;
    if (pb.last !== null) pb.time = Math.min(pb.total, pb.time + Math.min(250, ts - pb.last) * speed);
    pb.last = ts;
    render();
    if (pb.time >= pb.total) return finish();
    if (!pb.paused) pb.raf = raf(tick);
  }

  function seek(time) {
    if (!pb) return;
    pb.time = Math.max(0, Math.min(pb.total, time));
    render();
  }

  function togglePause() {
    if (!pb) return;
    pb.paused = !pb.paused;
    const btn = $('pb-pause');
    if (btn) btn.textContent = pb.paused ? 'Resume' : 'Pause';
    pb.svg?.classList?.toggle('paused', pb.paused);
    loop();
  }

  function setSpeed(x) {
    if (!SPEEDS.includes(x)) return;
    speed = x;
    if (!pb) return;
    pb.container.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.speed === x));
    pb.svg?.style?.setProperty('--fp-speed', x);
  }

  function finish() {
    if (!pb) return;
    const { onEnd } = pb.options;
    caf(pb.raf);
    pb = null;
    onEnd?.();
  }

  function stop() {
    if (pb) caf(pb.raf);
    pb = null;
  }

  function start(round, container, options = {}) {
    if (pb?.round === round) {
      pb.options = { ...pb.options, ...options };
      mount(container);
      return loop();
    }
    stop();
    const stepMs = options.stepMs ?? 2400;
    pb = { round, options, stepMs, N: round.step, total: (round.step + 1) * stepMs, time: 0, paused: false, last: null, raf: 0, uid: `pb${++uidSeq}`, tableOpen: false, ...build(round) };
    mount(container);
    loop();
  }

  const playing = () => pb?.round ?? null;
  const state = () => (pb ? { time: pb.time, total: pb.total, stepMs: pb.stepMs, paused: pb.paused, speed, k: pb.frame.k, t: pb.frame.t, tokens: pb.frame.tokens, trails: pb.frame.trails } : null);

  if (typeof document === 'object') {
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' || !pb || pb.container.closest?.('section')?.hidden || pb.container.isConnected === false || ['INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'BUTTON'].includes(e.target.tagName)) return;
      e.preventDefault();
      togglePause();
    });
  }

  return { SPEEDS, start, stop, playing, state, seek, togglePause, setSpeed, skip: finish, stepState, replay, whyPanel, stepRows, stepTable, fightRow, stepDetail, eventLine };
})();

if (typeof module === 'object') module.exports = Playback;
