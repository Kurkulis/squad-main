const Cards = (() => {
  let tableView = false;
  const kind = x => x?.class ?? x?.name ?? x;
  const tier = (x, fallback) => {
    const t = x?.tier ?? fallback;
    return t > 1 ? ` <span class="card-tier">T${t}</span>` : '';
  };
  const pct = v => Math.max(0, Math.min(100, (100 * v) / DATA.CONFIG.statCap));
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const signed = (x, digits = 1) => {
    const t = Math.abs(x).toFixed(digits);
    return `${+t === 0 ? '±' : x < 0 ? '−' : '+'}${t}`;
  };
  const modText = mods => DATA.STATS.filter(s => Math.round(mods?.[s] ?? 0)).map(s => `${s} ${signed(mods[s], 0)}`).join(' ');
  const weaponName = w => CATALOG.weapon(w.id)?.name ?? `Standard ${w.class}`;

  const FIGHTS = DATA.SITUATIONS.filter(t => DATA.SITUATION_SHARE[t]);
  const zoneMixes = {};
  const zoneMix = map => {
    if (!map) return [null];
    const m = MAPS2[map];
    return (zoneMixes[map] ??= m.spawns.flatMap(s => Engine.paths(m, s, m.site, 3)).flatMap(p => p.slice(1)).map(z => m.zones[z].type));
  };
  const sideCtx = (op, situation, zone) => ({ side: Engine.sideOf(op), situation, phase: 'Main', step: 1, zone, space: zone && DATA.ZONES[zone].space });
  const situationScores = (op, map) => {
    const zones = zoneMix(map);
    return Object.fromEntries(FIGHTS.map(t => [t, sum(zones, z => Engine.operatorScore(op, sideCtx(op, t, z)).score) / zones.length]));
  };
  const expected = (op, map) => {
    const scores = situationScores(op, map);
    return sum(FIGHTS, t => DATA.SITUATION_SHARE[t] * scores[t]);
  };
  const scope = map => `averaged over how often each situation occurs${map ? ` and the zones on the ${map} paths` : ''}; no intel, fatigue or traps`;

  function advice(op, map) {
    const now = expected(op, map);
    const rows = Engine.allowedPlaystyles(op).map(p => [p, p === op.playstyle ? 0 : expected({ ...op, playstyle: p }, map) - now]);
    const best = Math.max(...rows.map(r => r[1]));
    const items = rows.map(([p, d]) => `<li class="${d === best ? 'best' : ''}">${p} <b>${p === op.playstyle ? 'now' : signed(d)}</b>${d === best ? ' ✓' : ''}</li>`);
    return `<ul class="card-advice" title="Change in expected operator score vs ${op.playstyle}, ${scope(map)}">${items.join('')}</ul>`;
  }

  function weaponSelect(op, i, slot, map) {
    const list = slot === 'primary' ? CATALOG.allowed(op.role) : CATALOG.ofClass('Pistol');
    const es = Engine.effectiveStats(op);
    const now = expected(op, map);
    const options = list.map(w => {
      if (w.id === op[slot].id) return `<option value="${w.id}" selected>${w.name} (${w.class}) · now</option>`;
      const swapped = { ...op, [slot]: { ...op[slot], id: w.id, class: w.class } };
      const after = Engine.effectiveStats(swapped);
      const delta = Object.fromEntries(DATA.STATS.map(s => [s, after[s] - es[s]]));
      return `<option value="${w.id}">${w.name} (${w.class}) · ${modText(delta) || 'same stats'} · score ${signed(expected(swapped, map) - now)}</option>`;
    });
    const legacy = CATALOG.weapon(op[slot].id) ? '' : `<option value="" selected>${weaponName(op[slot])}</option>`;
    const label = slot === 'primary' ? 'Weapon' : 'Sidearm';
    const image = slot === 'primary' ? gunImage(op.primary) : '';
    return `<div class="card-style card-weapon">${image}<span>${label}</span> <select data-i="${i}" data-slot="${slot}" aria-label="${label} of ${op.name}" title="Stat change and expected score change vs the current ${label.toLowerCase()}, ${scope(map)}">${legacy}${options.join('')}</select><small>${modText(CATALOG.weapon(op[slot].id)?.mods) || 'no stat mods'}</small></div>`;
  }

  const deltaClass = d => (d ? ` stat-${d < 0 ? 'down' : 'up'}-${Math.abs(d) >= 4 ? 2 : 1}` : '');

  const importanceByRole = {};
  const importance = (role, s) => {
    const v = (importanceByRole[role] ??= Object.fromEntries(DATA.STATS.map(k => [k, sum(FIGHTS, t => DATA.SITUATION_SHARE[t] * DATA.WEIGHTS[t][k] * DATA.ROLES[role].mult[t])])));
    const rank = [...DATA.STATS].sort((a, b) => v[b] - v[a]).indexOf(s);
    return { level: ['High', 'Medium', 'Low'][Math.floor(rank / 2)], rank: rank + 1, share: v[s] / sum(DATA.STATS, k => v[k]) };
  };

  const range = list => {
    const lo = Math.min(...list);
    const hi = Math.max(...list);
    return lo === hi ? signed(hi, 0) : `${signed(lo, 0)}…${signed(hi, 0)}`;
  };
  const PROBES = [
    ...FIGHTS.map(t => [`in ${t}`, { situation: t, phase: 'Main', step: 1 }]),
    ['in the entry phase', { situation: 'Gunfight', phase: 'Entry', step: 1 }],
    [`from step ${DATA.CONFIG.cleanupFrom}`, { situation: 'Gunfight', phase: 'Main', step: DATA.CONFIG.cleanupFrom }],
    ['at random', { situation: 'Gunfight', phase: 'Main', step: 1, rand: () => 0 }],
    ['at random', { situation: 'Gunfight', phase: 'Main', step: 1, rand: () => 0.999 }],
  ];
  function traitWhen(op, s, now) {
    const hits = {};
    const apply = ctx => DATA.TRAITS[op.trait](op, { ...ctx, side: Engine.sideOf(op) });
    for (const [label, ctx] of PROBES) {
      const v = apply(ctx)?.stats?.[s] ?? 0;
      if (v !== now) (hits[label] ??= []).push(v);
    }
    const team = apply(PROBES[0][1])?.team?.[s];
    return [...Object.entries(hits).map(([label, vs]) => `${range(vs)} ${label}`), team && `${signed(team, 0)} to the squad in fights`].filter(Boolean).join(', ');
  }

  function changes(op, s) {
    const parts = Engine.operatorScore(op, sideCtx(op, 'Gunfight', null)).parts.stats;
    const v = k => parts[k]?.[s] ?? 0;
    const rows = [
      [`Playstyle ${op.playstyle}`, v('playstyle')],
      [`Weapon ${weaponName(op.primary)}${op.primary.tier > 1 ? ` T${op.primary.tier}` : ''}`, v('primary')],
      [`Sidearm ${weaponName(op.secondary)}`, v('secondary')],
      [`Armor ${kind(op.armor)} T${op.armor.tier ?? 1}`, v('armor')],
    ].map(([label, d]) => `<li>${label} <b>${signed(d, 0)}</b></li>`);
    if (op.trait) {
      const when = traitWhen(op, s, v('trait'));
      rows.push(`<li>Trait ${op.trait} <b>${signed(v('trait'), 0)}</b>${when ? ` (${when})` : ''}</li>`);
    }
    rows.push('<li>Intel <b>n/a</b> (rolled each round)</li>');
    return rows.join('');
  }

  function raise(op, s) {
    const best = list => list.sort((a, b) => b[1] - a[1])[0];
    const styles = DATA.PLAYSTYLES;
    const style = best(Engine.allowedPlaystyles(op).map(p => [p, styles[p][s] - styles[op.playstyle][s]]));
    const now = CATALOG.weapon(op.primary.id)?.mods[s] ?? 0;
    const gun = best(CATALOG.allowed(op.role).map(w => [w.name, w.mods[s] - now]));
    const picks = [style, gun].filter(x => x?.[1] > 0).map(([name, d]) => `${name} (${signed(d, 0)})`);
    return `Raise it with: ${picks.join(' · ') || 'no playstyle or weapon raises it further'}`;
  }

  function tooltip(op, s, base, eff, id) {
    const imp = importance(op.role, s);
    const top = [...FIGHTS].sort((a, b) => DATA.WEIGHTS[b][s] - DATA.WEIGHTS[a][s]).slice(0, 3).map(t => `${t} ${DATA.WEIGHTS[t][s].toFixed(2)}`);
    return `<span class="stat-tip" role="tooltip" id="${id}">
<span><b>${DATA.STAT_LABELS[s]}.</b> ${EFFECTS[s]}</span>
<span>Weighs most in: ${top.join(' · ')}</span>
<span>Importance for ${op.role}: <b>${imp.level}</b> (#${imp.rank} of ${DATA.STATS.length}, ${(100 * imp.share).toFixed(0)}% of the role's stat weight)</span>
<span>Base ${base} → effective ${eff}:</span><ul>${changes(op, s)}</ul>
<span class="stat-tip-hint">${raise(op, s)}</span></span>`;
  }

  let tipSeq = 0;
  const statRow = (op, s, base, eff, large) => {
    const id = `stat-tip-${++tipSeq}`;
    return `<div class="card-stat${deltaClass(eff - base)}" tabindex="0" aria-describedby="${id}">
<span class="card-stat-key">${large ? DATA.STAT_LABELS[s] : s}</span>
<span class="card-track"><span class="card-fill" style="width:${pct(eff)}%"></span><span class="card-base" style="left:${pct(base)}%"></span></span>
<span class="card-stat-val"><small>${base}</small> <b>${eff}</b></span>${tooltip(op, s, base, eff, id)}</div>`;
  };

  function situationLine(op, map) {
    const scores = Object.entries(situationScores(op, map)).sort((a, b) => b[1] - a[1]);
    const [best, worst] = [scores[0], scores.at(-1)];
    return `<p class="card-sits" title="Operator score per situation, ${scope(map)}">Best <b>${best[0]}</b> ${best[1].toFixed(1)} · Weakest <b>${worst[0]}</b> ${worst[1].toFixed(1)}</p>`;
  }

  const matchStats = (op, match) => {
    const r = match?.rounds?.at(-1);
    const m = r && [...r.ops.ATK, ...r.ops.DEF].find(x => x.id === op.id);
    if (!m) return { html: '', dead: false };
    const avg = m.fights ? (m.scoreSum / m.fights).toFixed(1) : '—';
    const html = `<dl class="card-match"><div><dt>Fights</dt><dd>${m.fights}</dd></div><div><dt>Kills</dt><dd>${m.kills}</dd></div><div><dt>Avg</dt><dd>${avg}</dd></div><div><dt>Died</dt><dd>${m.diedAt ? `step ${m.diedAt}` : '—'}</dd></div></dl>`;
    return { html, dead: !m.alive };
  };

  function gunImage(w) {
    const src = CATALOG.weaponImage(w);
    return src ? `<img class="card-gun-img" src="${src}" alt="" loading="lazy">` : '';
  }

  const card = (op, i, editable, match, size) => {
    const es = Engine.effectiveStats(op);
    const side = Engine.sideOf(op);
    const style = editable
      ? `<select data-i="${i}" aria-label="Playstyle of ${op.name}">${Engine.allowedPlaystyles(op).map(p => `<option${p === op.playstyle ? ' selected' : ''}>${p}</option>`).join('')}</select>`
      : `<span>${op.playstyle}</span>`;
    const m = matchStats(op, match);
    const weapons = editable
      ? `${weaponSelect(op, i, 'primary', match?.map)}${weaponSelect(op, i, 'secondary', match?.map)}`
      : `<div class="card-style card-weapon">${gunImage(op.primary)}<span>Weapon</span> ${weaponName(op.primary)}${tier(op.primary)}<small>${modText(CATALOG.weapon(op.primary.id)?.mods) || 'no stat mods'}</small></div>`;
    return `<article class="card card-${size} ${side}-card${m.dead ? ' card-dead' : ''}">
<div class="card-top"><img class="card-portrait" src="${op.portrait ?? CATALOG.portraitFor(op.role)}" alt="" loading="lazy">
<div class="card-id"><header class="card-head"><span class="card-name ${side}">${Visuals.icon(op)}${op.name}</span><span class="card-role">${op.role} · ${side}</span></header>
<ul class="card-kit">
${op.trait ? `<li><span>Trait</span> ${kind(op.trait)}</li>` : ''}
${op.active ? `<li><span>Ability</span> ${op.active}${match ? (match.used?.[op.id] ? ' <b class="badge loss">used</b>' : ' <b class="badge win">ready</b>') : ''}</li>` : ''}
<li><span>Armor</span> ${kind(op.armor)}${tier(op.armor)}</li>
<li><span>Gadget</span> ${kind(op.gadget)}${tier(op.gadget)}</li>
${editable ? '' : `<li><span>Sidearm</span> ${weaponName(op.secondary)}</li>`}
</ul></div></div>
<div class="card-style"><span>Playstyle</span> ${style}</div>
${editable ? advice(op, match?.map) : ''}
${weapons}
${situationLine(op, match?.map)}
<div class="card-stats">${DATA.STATS.map(s => statRow(op, s, op.stats[s], es[s], size === 'large')).join('')}</div>
${m.html}</article>`;
  };

  const toggle = () => `<p class="card-toggle"><button type="button" aria-pressed="${tableView}">Table view</button></p>`;
  const view = (ops, editable, match, size = 'compact') => (tableView && typeof squadTable === 'function'
    ? squadTable(ops, editable)
    : `<div class="cards cards-${size}">${ops.map((op, i) => card(op, i, editable, match, size)).join('')}</div>`);

  function bind(el, ops, rerender) {
    el.querySelector('.card-toggle button').onclick = () => {
      tableView = !tableView;
      rerender();
    };
    el.onchange = e => {
      const { i, slot } = e.target.dataset ?? {};
      if (i === undefined) return;
      const op = ops[i];
      if (!slot) op.playstyle = e.target.value;
      else {
        const w = CATALOG.weapon(e.target.value);
        if (!w) return;
        op[slot] = { ...op[slot], id: w.id, class: w.class };
      }
      render();
    };
  }

  function mount(el, ops, editable, match, size = 'compact') {
    el.innerHTML = toggle() + view(ops, editable, match, size);
    bind(el, ops, () => mount(el, ops, editable, match, size));
  }

  const EFFECTS = {
    sh: 'Wins the trade when both sides shoot: the biggest weight in Gunfight, Clutch and Breach.',
    aw: 'Sees the enemy first: leads Info and Reposition and is the top weight of the intel roll.',
    tw: 'Moves with the group: the top weight in Objective, strong in Reposition.',
    ut: 'Gets value out of gadgets: dominates Utility fights and helps Breach, Objective and intel.',
    dc: 'Picks the right play: a steady weight in every situation, highest in Reposition.',
    lk: 'Swings close calls: weighs most in Clutch; lucky operators keep some shooting and decisions under fatigue.',
  };

  function touches(s) {
    const C = DATA.CONFIG;
    const win = DATA.INTEL_BUCKETS.map(b => b.win[s] ?? 0);
    const lose = DATA.INTEL_BUCKETS.map(b => b.lose[s] ?? 0);
    const roll = ['ATK', 'DEF'].map(side => DATA.INTEL_WEIGHTS[side][s] ?? 0);
    const intel = [
      Math.max(...roll) && `roll weight ATK ${roll[0].toFixed(2)} / DEF ${roll[1].toFixed(2)}`,
      Math.max(...win) && `winner up to ${signed(Math.max(...win), 0)}`,
      Math.min(...lose) && `loser down to ${signed(Math.min(...lose), 0)}`,
    ].filter(Boolean);
    const mods = CATALOG.WEAPON_CATALOG.filter(w => w.class !== 'Pistol').map(w => w.mods[s]);
    const tierSh = Math.max(...DATA.WEAPON_TIER_SH);
    const armor = Math.max(...DATA.ARMOR_TIER);
    const traits = Object.keys(DATA.TRAITS).filter(name => DATA.SITUATIONS.some(situation => {
      const r = DATA.TRAITS[name]({ stats: { lk: C.statCap } }, { situation, side: 'DEF', phase: 'Entry', step: C.maxSteps, rand: () => 0 });
      return r && (s in (r.stats ?? {}) || s in (r.team ?? {}));
    }));
    return [
      intel.length && `intel: ${intel.join(', ')}`,
      `fatigue ${signed(C.cleanupFatigue, 0)} from step ${C.cleanupFrom}${s === 'sh' || s === 'dc' ? ` (${signed(C.cleanupFatigue + C.cleanupLuckBonus, 0)} with luck above ${C.cleanupLuckAbove})` : ''}`,
      `weapon ${range(mods)}${s === 'sh' ? `, tier up to ${signed(tierSh, 0)}` : ''}`,
      (s === 'aw' || s === 'dc') && `armor tier up to ${signed(armor, 0)}`,
      traits.length && `traits: ${traits.join(', ')}`,
    ].filter(Boolean);
  }

  function statGuide() {
    const sits = DATA.SITUATIONS;
    const share = t => DATA.SITUATION_SHARE[t];
    const head = `<thead><tr><th>Stat</th>${sits.map(t => `<th class="num">${t}<br><small>${(100 * share(t)).toFixed(0)}% of fights</small></th>`).join('')}<th class="num">Overall</th><th>Changed by</th></tr></thead>`;
    const rows = DATA.STATS.map(s => {
      const cells = sits.map(t => {
        const w = DATA.WEIGHTS[t][s];
        return `<td class="num"><span class="guide-bar${share(t) ? '' : ' guide-unused'}"><span style="width:${Math.min(100, w * 200)}%"></span></span>${w.toFixed(2)}</td>`;
      });
      const overall = sum(sits, t => share(t) * DATA.WEIGHTS[t][s]);
      return `<tr><td><b>${DATA.STAT_LABELS[s]}</b> <small>${s}</small><br><small>${EFFECTS[s]}</small></td>${cells.join('')}<td class="num"><b>${overall.toFixed(2)}</b></td><td><small>${touches(s).join('<br>')}</small></td></tr>`;
    });
    return `<p class="hint">Each bar is the stat's weight in that situation's score (a row of weights sums to 1). The share under each situation is how often it decides a fight in mirror play; Info is used only by the intel roll, which has its own weights. Overall is the share-weighted weight: what one stat point is worth on average.</p><div class="scroll"><table class="stat-guide">${head}<tbody>${rows.join('')}</tbody></table></div>`;
  }

  return { mount, view, toggle, bind, statGuide, expected, situationScores };
})();
