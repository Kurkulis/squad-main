const FloorPlan = (() => {
  const V = typeof Visuals !== 'undefined' ? Visuals : require('./visuals.js');
  const allMaps = () => (typeof MAPS2 !== 'undefined' ? MAPS2 : require('./maps.js'));
  const engine = () => (typeof Engine !== 'undefined' ? Engine : require('./engine.js'));
  const CH = 7.5;
  const GAP = 25;
  const LEGEND_ROW = 28;
  let seq = 0;

  const GADGET_KIND = {
    'Drone': 'drone', 'Scout Drone': 'drone', 'Camera Network': 'camera',
    'Breaching Charge': 'breach', 'Thermite Charge': 'breach', 'EMP Grenade': 'emp',
    'Smoke Grenade': 'smoke', 'Barbed Wire': 'trap', 'Flank Wire': 'trap', 'Proximity Alarm': 'trap',
  };
  const did = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const isDoorId = t => String(t).includes('|');
  const doorList = v => (Array.isArray(v) ? v : Object.values(v ?? {}));

  const n = v => Math.round(v * 10) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const range = k => Array.from({ length: k }, (_, i) => i);
  const pts = poly => poly.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
  const star = (k, r1, r2) => `M${range(k * 2).map(i => {
    const a = (Math.PI * i) / k - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    return `${n(r * Math.cos(a))} ${n(r * Math.sin(a))}`;
  }).join('L')}z`;

  const SHAPES = {
    site: `<g class="glyph" transform="translate(-8.7 -8.7) scale(1.45)">${V.ZONE_GLYPHS.Site}</g>`,
    trap: '<path class="tri" d="M0-7.5 7.5 6h-15z"/><path class="bang" d="M0-3v3.5m0 2.6v.1"/>',
    fight: `<path class="burst" d="${star(8, 9.5, 4.2)}"/>`,
    smoke: '<circle class="puff" cx="-3.5" cy="1.5" r="4.5"/><circle class="puff" cx="2.5" cy="-2" r="4.5"/><circle class="puff" cx="3.5" cy="3" r="3.5"/>',
    drone: '<path d="M-4.5-4.5 4.5 4.5M4.5-4.5-4.5 4.5"/><circle cx="-4.5" cy="-4.5" r="2.2"/><circle cx="4.5" cy="-4.5" r="2.2"/><circle cx="-4.5" cy="4.5" r="2.2"/><circle cx="4.5" cy="4.5" r="2.2"/>',
    breach: '<path d="M0-6.5v13M-6.5 0h13M-4.6-4.6l9.2 9.2M4.6-4.6l-9.2 9.2"/>',
    gadget: '<circle class="dot" r="3"/>',
    hold: '<path class="bars" d="M-2.8-4.5v9M2.8-4.5v9"/>',
    camera: '<rect x="-6.5" y="-4" width="9" height="8" rx="1.5"/><path d="M2.5-1.5 6.5-4v8l-4-2.5"/>',
    emp: '<path d="M1.5-7-4 1h4l-1.5 6L4-1H0z"/>',
  };
  const CROSS = 'M-4-4 4 4M4-4-4 4';
  const ROAM = '<g class="roam" transform="translate(9 -9)"><circle r="5.5"/><path d="M-2.5 2.5 2.5-2.5M-.5-2.5h3v3"/></g>';

  const box = poly => {
    const xs = poly.map(p => p[0]);
    const ys = poly.map(p => p[1]);
    const b = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    return { ...b, w: b.x1 - b.x0, h: b.y1 - b.y0 };
  };

  const inside = ([x, y], poly) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };

  const wrap = (text, room) => {
    if (text.length * CH <= room || !text.includes(' ')) return [text];
    const words = text.split(' ');
    let best = [text];
    let widest = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      if (Math.max(a.length, b.length) < widest) [widest, best] = [Math.max(a.length, b.length), [a, b]];
    }
    return best;
  };

  const wallDir = (p, poly) => {
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      const cross = (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax);
      const within = p[0] >= Math.min(ax, bx) - 0.5 && p[0] <= Math.max(ax, bx) + 0.5 && p[1] >= Math.min(ay, by) - 0.5 && p[1] <= Math.max(ay, by) + 0.5;
      if (Math.abs(cross) < 0.5 * Math.hypot(bx - ax, by - ay) && within) {
        const len = Math.hypot(bx - ax, by - ay) || 1;
        return [(bx - ax) / len, (by - ay) / len];
      }
    }
    return null;
  };

  const eventType = e => String(e?.type ?? e?.kind ?? e?.event ?? e).toLowerCase();
  const asZoneMap = v => (Array.isArray(v) ? Object.fromEntries(v.map(d => [d.id, d.zone])) : v ?? {});
  const statusOf = s => (s === undefined || s === null ? '' : typeof s === 'string' ? s : s >= 1 ? 'ATK' : s <= -1 ? 'DEF' : 'contested');
  const mapOf = m => (typeof m === 'string' ? allMaps()[m] : m);
  const groupZone = (st, g, i) => {
    const s = st.groups?.[i];
    const path = (s && typeof s === 'object' && s.path) || g.path || [];
    return (typeof s === 'string' ? s : s?.zone) ?? path[0];
  };

  const layouts = new WeakMap();
  function layout(map) {
    if (layouts.has(map)) return layouts.get(map);
    const geom = {};
    for (const [id, z] of Object.entries(map.zones)) {
      const b = box(z.poly);
      const rotated = b.w < 90 && b.h > b.w * 1.5;
      const lines = wrap(z.label, (rotated ? b.h : b.w) - 30);
      const half = (17 + Math.max(...lines.map(l => l.length)) * CH) / 2;
      geom[id] = { b, rotated, lines, half, anchor: z.anchor ?? [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2] };
    }
    const doors = {};
    for (const [a, b, p] of map.doors ?? []) doors[`${a}|${b}`] = doors[`${b}|${a}`] = p;
    const out = { geom, doors };
    layouts.set(map, out);
    return out;
  }

  const place = ({ b, rotated, lines, half, anchor: [ax, ay] }, count) => {
    if (rotated) return range(count).map(i => [ax + 12, ay + (i - (count - 1) / 2) * GAP]);
    const rowY = ay + 7.5 * lines.length + 14;
    if (rowY + 11 <= b.y1) {
      const per = Math.max(1, Math.floor((b.w - 6) / GAP));
      return range(count).map(i => {
        const row = Math.floor(i / per);
        const inRow = Math.min(per, count - row * per);
        return [ax + ((i % per) - (inRow - 1) / 2) * GAP, rowY + row * GAP];
      });
    }
    return range(count).map(i => [ax + (i % 2 ? -1 : 1) * (half + 14 + Math.floor(i / 2) * GAP), ay]);
  };

  const centre = (map, z) => (layout(map).geom[z] ? place(layout(map).geom[z], 1)[0] : [0, 0]);

  function route(mapArg, from, to) {
    const map = mapOf(mapArg);
    if (from === to) return [centre(map, from)];
    const door = layout(map).doors[`${from}|${to}`];
    if (door) return [centre(map, from), door, centre(map, to)];
    const path = engine().paths(map, from, to, 1)[0];
    return path && path.length > 2 ? chain(map, path) : [centre(map, from), centre(map, to)];
  }

  function chain(mapArg, zones) {
    const map = mapOf(mapArg);
    if (!zones.length) return [];
    return zones.slice(1).reduce((line, z, i) => line.concat(route(map, zones[i], z).slice(1)), [centre(map, zones[0])]);
  }

  function tokens(mapArg, state = {}, ops = state.ops ?? []) {
    const map = mapOf(mapArg);
    const { geom } = layout(map);
    const st = state.step ?? {};
    const groupOf = {};
    (state.plan?.groups ?? []).forEach((g, i) => (g.ops ?? []).forEach(id => (groupOf[id] = i)));
    const defenders = { ...(state.setup?.positions ?? {}), ...asZoneMap(st.defenders) };
    const list = ops.map(op => {
      const atk = op.id in groupOf;
      const zone = op.zone ?? (atk ? st.attackers?.[op.id] ?? groupZone(st, state.plan.groups[groupOf[op.id]], groupOf[op.id]) : defenders[op.id]);
      return { id: op.id, side: atk ? 'ATK' : 'DEF', group: atk ? groupOf[op.id] : undefined, zone, alive: op.alive !== false };
    });
    const byZone = {};
    for (const t of list) if (t.alive && geom[t.zone]) (byZone[t.zone] ??= []).push(t);
    for (const [z, ts] of Object.entries(byZone)) {
      ts.sort((a, b) => (a.side === b.side ? 0 : a.side === 'ATK' ? -1 : 1));
      place(geom[z], ts.length).forEach(([x, y], i) => Object.assign(ts[i], { x, y }));
    }
    for (const t of list) if (t.x === undefined) [t.x, t.y] = centre(map, t.zone);
    return list;
  }

  function plan(mapArg, state = {}, opts = {}) {
    const map = mapOf(mapArg);
    const name = typeof mapArg === 'string' ? mapArg : '';
    const mode = opts.mode ?? 'static';
    const planning = mode === 'planning';
    const playback = mode === 'playback';
    const { setup = {}, plan: atk = {}, ops = [] } = state;
    const st = playback ? state.step ?? {} : {};
    const [W, H] = map.size;
    const u = opts.uid ?? `fp${++seq}`;
    const zones = map.zones;
    const ids = Object.keys(zones);
    const has = id => Object.prototype.hasOwnProperty.call(zones, id);
    const { geom, doors: doorAt } = layout(map);

    const adj = Object.fromEntries(ids.map(id => [id, []]));
    for (const [a, b] of map.edges ?? []) if (has(a) && has(b)) adj[a].push(b), adj[b].push(a);
    const spawns = new Set(map.spawns ?? []);

    const opById = Object.fromEntries(ops.map(o => [o.id, o]));
    const opName = id => opById[id]?.name ?? id;
    const positions = setup.positions ?? {};
    const defenders = asZoneMap(st.defenders);
    const defIds = [...new Set([...Object.keys(positions), ...Object.keys(defenders)])];
    const defZone = id => defenders[id] ?? positions[id];

    const fights = st.fights ?? [];
    const stepKills = [...fights.flatMap(f => (f.kills ?? []).map(k => ({ ...k, zone: k.zone ?? f.zone }))), ...(st.kills ?? [])];
    const killed = new Set(stepKills.map(k => k.victimId ?? k.victim));
    const alive = id => opById[id]?.alive !== false && !killed.has(id) && !killed.has(opById[id]?.name);

    const groups = (atk.groups ?? []).map((g, i) => {
      const s = st.groups?.[i];
      const path = (s && typeof s === 'object' && s.path) || g.path || [];
      return { i, ops: g.ops ?? [], path, walked: g.walked, zone: groupZone(st, g, i) };
    });
    const active = planning && Number.isInteger(opts.group) ? opts.group : undefined;

    const control = id => statusOf(st.control?.[id]);
    const fightZones = new Set(fights.map(f => f.zone));
    const reinforced = new Set(setup.reinforcements ?? []);
    const trapDoors = new Set(doorList(setup.traps));
    const targets = new Set(opts.targets ?? []);
    const events = (st.events ?? []).map(e => ({ ...e, type: eventType(e) }));
    const supporting = new Set(fights.flatMap(f => [...(f.supporters?.ATK ?? []), ...(f.supporters?.DEF ?? [])]));
    const bombNow = events.some(e => /defus|detonat|plant/.test(e.type));
    const bomb = events.some(e => e.type.includes('defus')) ? 'defused'
      : events.some(e => e.type.includes('detonat')) ? 'detonated'
      : st.planted || st.phase === 'Post-plant' || events.some(e => e.type.includes('plant')) ? 'planted' : '';

    const killZone = id => stepKills.find(k => (k.victimId ?? k.victim) === id)?.zone;
    const shown = playback ? ops.filter(o => o.alive !== false || killed.has(o.id)).map(o => (killed.has(o.id) ? { ...o, alive: true, zone: killZone(o.id) ?? o.zone } : o)) : [];
    const opTokens = playback ? tokens(map, state, shown) : [];

    const zoneToks = {};
    const put = (zone, t) => has(zone) && (zoneToks[zone] ??= []).push(t);
    if (playback) opTokens.forEach(t => put(t.zone, { op: t }));
    else {
      groups.forEach(g => put(g.zone, { atk: g }));
      defIds.forEach(id => put(defZone(id), { def: id }));
    }

    const marks = {};
    const mark = (zone, kind, title, cls = '') => has(zone) && (marks[zone] ??= []).push({ kind, title, cls });
    if (has(map.site)) mark(map.site, 'site', bomb ? `Bomb ${bomb}` : 'Bomb site', [bomb, bomb && bombNow && 'now'].filter(Boolean).join(' '));
    const signedTenth = v => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * 10) / 10)}`;
    fights.forEach(f => {
      const e = f.entrySides;
      const v = e?.occupant ? Math.round(e.value * 10) / 10 : 0;
      const text = v ? ` · ${e.occupant} ${v > 0 ? 'holds the entry' : `is split across ${e.doors.length} doors`} ${signedTenth(v)}` : '';
      (marks[f.zone] ??= []).push({ kind: 'fight', title: `Fight${f.situation ? ` · ${f.situation}` : ''}${text}`, cls: v ? (v > 0 ? 'hold-up' : 'hold-down') : '', badge: v ? signedTenth(v) : '' });
    });
    (st.waiting ?? []).forEach(i => mark(groups[i]?.zone, 'hold', `Group ${i + 1} holds for the other groups`, 'now'));
    for (const [id, z] of Object.entries(setup.cameras ?? {})) mark(z, 'camera', `Camera Network · ${opName(id)}`);
    const doorState = {};
    const ds = d => (doorState[d] ??= { gadgets: [], ev: [], queued: 0 });
    reinforced.forEach(d => (ds(d).reinforced = true));
    trapDoors.forEach(d => (ds(d).trap = true));
    (state.canceled ?? []).forEach(d => ds(d).ev.push('breach'));
    for (const [id, t] of Object.entries(atk.gadgets ?? {})) {
      const cls = opById[id]?.gadget?.class ?? opById[id]?.gadget;
      const title = `${cls ?? 'Gadget'} · ${opName(id)}`;
      if (isDoorId(t)) ds(t).gadgets.push({ kind: GADGET_KIND[cls] ?? 'gadget', title });
      else mark(t, GADGET_KIND[cls] ?? 'gadget', title);
    }
    for (const [d, e] of Object.entries(st.doors ?? {})) {
      const s = ds(d);
      s.queued = e.queued?.length ?? 0;
      if (e.breached) s.ev.push('breach');
      if (e.blocked?.length) s.ev.push('blocked');
      if (e.trap) s.ev.push(e.trap);
    }

    const kills = {};
    const seen = new Set();
    for (const k of stepKills) {
      const who = k.victimId ?? k.victim;
      if (seen.has(who)) continue;
      seen.add(who);
      const zone = k.zone ?? defenders[k.victimId] ?? groups.find(g => g.ops.includes(k.victimId))?.zone;
      const side = k.side ?? (defIds.includes(k.victimId) ? 'DEF' : 'ATK');
      if (has(zone)) (kills[zone] ??= []).push({ ...k, side });
    }

    const slotsOf = id => {
      const { b, anchor } = geom[id];
      const all = [[b.x0 + 14, b.y0 + 14], [b.x1 - 14, b.y0 + 14], [b.x0 + 14, b.y1 - 14], [b.x1 - 14, b.y1 - 14], [anchor[0], b.y0 + 14]];
      const ok = all.filter(p => inside(p, zones[id].poly));
      return ok.length ? ok : [[anchor[0], anchor[1] - 22]];
    };

    const zoneTitle = (id, z) => [z.label, z.type, spawns.has(id) && 'ATK spawn', id === map.site && 'bomb site'].filter(Boolean).join(' · ');

    const zoneSvg = id => {
      const z = zones[id];
      const ctl = control(id);
      const cls = ['zone', `t-${z.type}`, ctl && `c-${ctl}`, id === map.site && 'site', spawns.has(id) && 'spawn', id === opts.selected && 'selected', fightZones.has(id) && 'fight', targets.has(id) && 'target'].filter(Boolean).join(' ');
      const p = pts(z.poly);
      const fill = ctl === 'contested' ? ` style="fill:url(#${u}-mix)"` : '';
      const focus = planning ? ` tabindex="0" role="button" aria-label="${esc(z.label)}"` : '';
      const ext = z.type === 'Exterior' ? `<polygon class="hatch" points="${p}" style="fill:url(#${u}-ext)"/>` : '';
      return `<g class="${cls}" data-zone="${esc(id)}" data-adj="${esc(adj[id].join(' '))}"${focus}><title>${esc(zoneTitle(id, z))}</title><polygon class="room" points="${p}"${fill}/>${ext}</g>`;
    };

    const doorSvg = ([a, b, p]) => {
      const id = did(a, b);
      const s = doorState[id] ?? { gadgets: [], ev: [], queued: 0 };
      const [ux, uy] = (has(a) && wallDir(p, zones[a].poly)) || (has(b) && wallDir(p, zones[b].poly)) || [1, 0];
      const cls = ['dr', s.reinforced && 'reinforced', s.trap && 'trapped', id === opts.door && 'selected', targets.has(id) && 'target', ...s.ev.map(e => `ev-${e}`)].filter(Boolean).join(' ');
      const title = [`Door ${zones[a]?.label ?? a} – ${zones[b]?.label ?? b}`, s.reinforced && 'reinforced', s.trap && 'trap', ...s.gadgets.map(g => g.title), s.queued && `${s.queued} waiting`, ...s.ev].filter(Boolean).join(' · ');
      const focus = planning ? ` tabindex="0" role="button" aria-label="${esc(title)}"` : '';
      const line = `<line class="door" x1="${n(-ux * 11)}" y1="${n(-uy * 11)}" x2="${n(ux * 11)}" y2="${n(uy * 11)}"/>`;
      const at = (k, body, c) => `<g class="${c}" transform="translate(${n(ux * k)} ${n(uy * k)})">${body}</g>`;
      const glyphs = [
        s.trap && at(0, `<g transform="scale(.62)">${SHAPES.trap}</g>`, 'dr-trap'),
        ...s.gadgets.map((g, k) => at(17 + k * 15, `<circle class="mk-bg" r="7"/><g transform="scale(.6)">${SHAPES[g.kind] ?? SHAPES.gadget}</g>`, `dr-gadget mk-${g.kind}`)),
        s.queued && at(-17, `<circle r="7"/><text y="3.6">${s.queued}</text>`, 'dr-queue'),
      ].filter(Boolean).join('');
      return `<g class="${cls}" data-door="${esc(id)}" transform="translate(${n(p[0])} ${n(p[1])})"${focus}><title>${esc(title)}</title><circle class="dr-hit" r="11"/>${line}<circle class="dr-ring" r="12"/>${glyphs}</g>`;
    };

    const routeSvg = g => {
      const off = (g.i - (groups.length - 1) / 2) * 7;
      const line = [];
      g.path.forEach((z, j) => {
        if (!has(z)) return;
        const door = j && doorAt[`${g.path[j - 1]}|${z}`];
        if (door) line.push(door);
        line.push(geom[z].anchor);
      });
      const cls = `route${g.i === active ? ' active' : ''}`;
      return `<polyline class="${cls}" data-group="${g.i}" data-path="${esc(g.path.join(' '))}" points="${pts(line.map(([x, y]) => [x + off, y + off]))}"${line.length > 1 ? ` marker-end="url(#${u}-arrow)"` : ''}/>`;
    };

    const trailSvg = t => {
      const g = groups[t.group];
      const rotation = t.side === 'DEF' && events.find(e => e.type === 'rotate' && e.op === t.id);
      let walked = [];
      let rest = [];
      if (g) {
        const at = g.path.indexOf(g.zone);
        walked = chain(map, (g.walked ?? [g.zone]).filter(has));
        rest = chain(map, [g.zone, ...g.path.slice(at + 1)].filter(has));
      } else if (rotation) walked = route(map, rotation.from, rotation.to);
      const cls = `trail ${t.side === 'ATK' ? 'atk' : 'def'}`;
      return `<polyline class="${cls} walked" data-trail="${esc(t.id)}" points="${walked.length > 1 ? pts(walked) : ''}"/><polyline class="${cls} rest" data-trail="${esc(t.id)}" points="${rest.length > 1 ? pts(rest) : ''}"/>`;
    };

    const labelSvg = id => {
      const z = zones[id];
      const { rotated, lines, half, anchor: [ax, ay] } = geom[id];
      const shift = rotated && (playback || zoneToks[id]?.length) ? -12 : 0;
      const top = -(lines.length - 1) * 7.5;
      const glyph = V.ZONE_GLYPHS[z.type] ? `<g class="glyph" transform="translate(${n(-half)} ${n(top - 6)})">${V.ZONE_GLYPHS[z.type]}</g>` : '';
      const text = lines.map((l, k) => `<text x="${n(-half + 17)}" y="${n(top + 4.5 + k * 15)}">${esc(l)}</text>`).join('');
      const at = rotated ? `translate(${n(ax + shift)} ${n(ay)}) rotate(-90)` : `translate(${n(ax)} ${n(ay)})`;
      return `<g class="lbl t-${z.type}" transform="${at}">${glyph}${text}</g>`;
    };

    const markSvg = (m, [x, y], zone) => `<g class="mk mk-${m.kind}${m.cls ? ` ${m.cls}` : ''}" data-zone="${esc(zone)}" transform="translate(${n(x)} ${n(y)})"><title>${esc(m.title)}</title><circle class="mk-bg" r="10.5"/>${SHAPES[m.kind]}${m.badge ? `<g class="mk-n" transform="translate(13 -10)"><rect x="-12" y="-7.5" width="24" height="15" rx="7.5"/><text y="4">${esc(m.badge)}</text></g>` : ''}</g>`;

    const iconBody = (op, id) => {
      const icon = V.ROLE_ICONS[op.role];
      return icon ? `<g class="ico" transform="translate(-7 -7) scale(.58)">${icon}</g>` : `<text y="4">${esc(String(opName(id))[0])}</text>`;
    };

    const defTok = (id, [x, y], zone) => {
      const op = opById[id] ?? {};
      const dead = !alive(id);
      const roam = setup.roam?.[id];
      const title = [opName(id), op.role, roam && 'roams', dead && 'dead'].filter(Boolean).join(' · ');
      return `<g class="tok def${dead ? ' dead' : ''}" data-zone="${esc(zone)}" data-op="${esc(id)}" transform="translate(${n(x)} ${n(y)})"><title>${esc(title)}</title><circle class="disc" r="11"/>${iconBody(op, id)}${roam ? ROAM : ''}${dead ? `<path class="x" d="${CROSS}"/>` : ''}</g>`;
    };

    const opTok = (t, [x, y]) => {
      const op = opById[t.id] ?? {};
      const dead = killed.has(t.id);
      const roam = t.side === 'DEF' && setup.roam?.[t.id];
      const side = t.side === 'ATK' ? 'atk' : 'def';
      const sup = supporting.has(t.id) && !dead;
      const title = [opName(t.id), op.role, t.side === 'ATK' && `Group ${t.group + 1}`, roam && 'roams', sup && 'supports from next door', dead && 'dead'].filter(Boolean).join(' · ');
      const face = op.portrait
        ? `<circle class="disc" r="10"/><image href="${esc(op.portrait)}" x="-10" y="-10" width="20" height="20" preserveAspectRatio="xMidYMid slice" clip-path="url(#${u}-clip)"/>`
        : `<circle class="disc" r="10"/>${iconBody(op, t.id)}`;
      return `<g class="tok op ${side}${dead ? ' dead' : ''}${sup ? ' support' : ''}" data-zone="${esc(t.zone)}" data-op="${esc(t.id)}" transform="translate(${n(x)} ${n(y)})"><title>${esc(title)}</title>${face}<circle class="ring" r="11"/><circle class="sup-ring" r="14"/><text class="sup" y="24">support</text>${roam ? ROAM : ''}${dead ? `<path class="x" d="${CROSS}"/>` : ''}</g>`;
    };

    const atkTok = (g, [x, y], zone) => {
      const live = g.ops.filter(alive).length;
      const dead = g.ops.length > 0 && live === 0;
      const title = `Group ${g.i + 1}: ${g.ops.map(id => `${opName(id)}${alive(id) ? '' : ' (dead)'}`).join(', ')}`;
      return `<g class="tok atk${dead ? ' dead' : ''}${g.i === active ? ' active' : ''}" data-zone="${esc(zone)}" data-squad="${g.i}" transform="translate(${n(x)} ${n(y)})"><title>${esc(title)}</title><circle class="disc" r="12.5"/><text class="num" y="4.5">${g.i + 1}</text><g transform="translate(10 -10)"><circle class="badge" r="7.5"/><text class="badge-n" y="3.8">${live}</text></g></g>`;
    };

    const zoneMarks = ids.map(id => {
      const slots = slotsOf(id);
      return (marks[id] ?? []).map((m, k) => markSvg(m, slots[k % slots.length], id)).join('');
    }).join('');

    const zoneTokens = playback
      ? opTokens.filter(t => has(t.zone)).map(t => opTok(t, [t.x, t.y])).join('')
      : ids.map(id => {
        const list = zoneToks[id] ?? [];
        const at = place(geom[id], list.length);
        return list.map((t, k) => (t.atk ? atkTok(t.atk, at[k], id) : defTok(t.def, at[k], id))).join('');
      }).join('');

    const zoneKills = ids.map(id => {
      const list = kills[id] ?? [];
      const { b, anchor: [ax] } = geom[id];
      return list.map((k, i) => `<g class="kill ${k.side}" data-zone="${esc(id)}" transform="translate(${n(ax + (i - (list.length - 1) / 2) * 12)} ${n(b.y1 - 10)})"><title>${esc(`${k.victim ?? opName(k.victimId)} killed${k.killer ? ` by ${k.killer}` : ''}`)}</title><path class="halo" d="${CROSS}"/><path d="${CROSS}"/></g>`).join('');
    }).join('');

    const legend = opts.legend ? legendSvg(u, W, H, playback) : { svg: '', height: 0 };
    const height = H + legend.height;
    const selected = has(opts.selected) ? `<polygon class="sel" points="${pts(zones[opts.selected].poly)}"/>` : '';

    const defs = `<defs><pattern id="${u}-ext" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="hatch-ext" d="M0 0v12"/></pattern><pattern id="${u}-mix" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="mix-a" width="8" height="16"/><rect class="mix-d" x="8" width="8" height="16"/></pattern><marker id="${u}-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path class="arrow" d="M0 0 10 5 0 10z"/></marker><clipPath id="${u}-clip"><circle r="10"/></clipPath></defs>`;

    const parts = {
      rooms: `<g class="rooms">${ids.map(zoneSvg).join('')}</g>`,
      routes: playback ? `<g class="trails">${opTokens.map(trailSvg).join('')}</g>` : `<g class="routes">${groups.map(routeSvg).join('')}</g>`,
      marks: `<g class="marks">${zoneMarks}</g>`,
      doors: `<g class="doors">${(map.doors ?? []).map(doorSvg).join('')}</g>`,
      tokens: `<g class="tokens">${zoneTokens}</g>`,
      kills: `<g class="kills">${zoneKills}</g>`,
    };
    if (opts.parts) return parts;

    const cls = ['plan', mode, opts.side && `side-${opts.side}`, active !== undefined && 'has-active', bomb && `bomb-${bomb}`].filter(Boolean).join(' ');
    const label = `${name ? `${name} ` : ''}floor plan`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 ${W} ${height}" role="${planning ? 'group' : 'img'}" aria-label="${esc(label)}"${name ? ` data-map="${esc(name)}"` : ''}${active !== undefined ? ` data-active="${active}"` : ''} data-uid="${u}">${defs}<rect class="bg" width="${W}" height="${height}"/>${parts.rooms}${selected}${parts.routes}<g class="labels">${ids.map(labelSvg).join('')}</g>${parts.marks}${parts.doors}${parts.tokens}${parts.kills}${legend.svg}</svg>`;
  }

  function legendSvg(u, W, H, playback) {
    const swatch = (cls, style = '') => `<g class="${cls}"><rect class="room" x="0" y="-7" width="18" height="14"${style}/></g>`;
    const icon = kind => `<g class="mk mk-${kind}" transform="translate(9 0)"><circle class="mk-bg" r="10.5"/>${SHAPES[kind]}</g>`;
    const pieces = playback
      ? [
        ['<g class="tok op def" transform="translate(9 0)"><circle class="disc" r="8"/><circle class="ring" r="9"/></g>', 'Defender'],
        ['<g class="tok op atk" transform="translate(9 0)"><circle class="disc" r="8"/><circle class="ring" r="9"/></g>', 'Attacker'],
        ['<polyline class="trail atk walked" points="0,0 9,0"/><polyline class="trail atk rest" points="9,0 18,0"/>', 'Path walked / ahead'],
        ['<g class="tok op atk support" transform="translate(9 0)"><circle class="disc" r="6"/><circle class="sup-ring" r="9"/></g>', 'Supports next door'],
        ['<g class="dr" transform="translate(9 0)"><g class="dr-queue"><circle r="7"/><text y="3.6">2</text></g></g>', 'Waiting at a door'],
        [icon('hold'), 'Holding'],
      ]
      : [
        ['<g class="tok def" transform="translate(9 0)"><circle class="disc" r="9"/></g>', 'Defender'],
        ['<g class="tok atk" transform="translate(9 0)"><circle class="disc" r="9"/><text class="num" y="4">1</text></g>', 'Attack group'],
        ['<polyline class="route" points="0,0 18,0"/>', 'Planned path'],
      ];
    const items = [
      [swatch('c-DEF'), 'DEF held'],
      [swatch('c-ATK'), 'ATK held'],
      [swatch('c-contested', ` style="fill:url(#${u}-mix)"`), 'Contested'],
      ['<g class="dr reinforced" transform="translate(9 0)"><line class="door" x1="-9" y1="0" x2="9" y2="0"/></g>', 'Reinforced door'],
      [icon('site'), 'Bomb site'],
      [icon('trap'), 'Trap'],
      [icon('camera'), 'Camera'],
      [icon('smoke'), 'Smoke'],
      [icon('drone'), 'Drone'],
      [icon('breach'), 'Breach'],
      [icon('fight'), 'Fight'],
      [`<g class="kill DEF" transform="translate(9 0)"><path class="halo" d="${CROSS}"/><path d="${CROSS}"/></g>`, 'Kill'],
      ...pieces,
    ];
    let x = 12;
    let row = 0;
    const out = items.map(([sw, text]) => {
      const w = 26 + text.length * 6.6 + 18;
      if (x + w > W - 8) [x, row] = [12, row + 1];
      const g = `<g transform="translate(${n(x)} ${n(H + 20 + row * LEGEND_ROW)})">${sw}<text x="26" y="4">${esc(text)}</text></g>`;
      x += w;
      return g;
    }).join('');
    const height = (row + 1) * LEGEND_ROW + 12;
    return { svg: `<g class="legend"><line class="legend-rule" x1="0" y1="${H}" x2="${W}" y2="${H}"/>${out}</g>`, height };
  }

  function bindPlan(svg, { onZone, onPath, onDoor, group } = {}) {
    const active = Number.isInteger(group) ? group : svg.dataset.active !== undefined ? Number(svg.dataset.active) : undefined;
    const pick = (id, e) => {
      onZone?.(id, e);
      if (active === undefined || !onPath) return;
      const route = svg.querySelector(`[data-group="${active}"]`);
      const path = route?.dataset.path ? route.dataset.path.split(' ') : [];
      const zone = [...svg.querySelectorAll('.zone[data-zone]')].find(el => el.dataset.zone === id);
      if (!zone) return;
      const last = path[path.length - 1];
      const near = last === undefined ? zone.classList.contains('spawn') : zone.dataset.adj.split(' ').includes(last) && !path.includes(id);
      if (id === last) onPath(active, path.slice(0, -1));
      else if (near) onPath(active, [...path, id]);
    };
    svg.addEventListener('click', e => {
      const door = e.target.closest('[data-door]');
      if (door && svg.contains(door)) return onDoor?.(door.dataset.door, e);
      const el = e.target.closest('[data-zone]');
      if (el && svg.contains(el)) pick(el.dataset.zone, e);
    });
    svg.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const { door, zone } = e.target.dataset ?? {};
      if (!door && !zone) return;
      e.preventDefault();
      if (door) onDoor?.(door, e);
      else pick(zone, e);
    });
    return svg;
  }

  return { plan, bindPlan, tokens, route, chain };
})();

if (typeof Visuals !== 'undefined') Object.assign(Visuals, FloorPlan);
if (typeof module === 'object') module.exports = FloorPlan;
