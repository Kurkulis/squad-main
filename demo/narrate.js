const Narrate = (() => {
  const VERBS = { Marginal: ['edges', 'edge'], Clear: ['wins', 'win'], Dominant: ['overwhelms', 'overwhelm'] };
  const other = side => (side === 'ATK' ? 'DEF' : 'ATK');
  const label = s => (typeof DATA === 'object' && DATA.STAT_LABELS[s]) || s;
  const mods = m => Object.entries(m ?? {}).map(([s, v]) => `${v < 0 ? '−' : '+'}${Math.abs(v)} ${label(s)}`).join(', ');
  const list = names => (names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
  const END = { Elimination: w => `${other(w)} is eliminated`, Defused: () => 'The bomb is defused', Detonation: () => 'The bomb detonates', 'Time out': () => 'Time runs out' };
  const maps = () => (typeof MAPS2 === 'object' ? MAPS2 : require('./maps.js'));
  const zone = (r, z) => maps()[r.map]?.zones[z]?.label ?? z;
  const opName = (r, id) => [...r.ops.ATK, ...r.ops.DEF].find(op => op.id === id)?.name ?? id;
  const group = i => `Group ${i + 1}`;
  const door = (r, d) => `the ${String(d).split('|').map(z => zone(r, z)).join(' – ')} door`;
  const tenth = v => `${v < 0 ? '−' : '+'}${Math.abs(Math.round(v * 10) / 10)}`;

  function queues(s, r) {
    const groupOf = {};
    r.plan.groups.forEach((g, i) => g.ops.forEach(id => (groupOf[id] = i)));
    const out = [];
    for (const [d, e] of Object.entries(s.doors ?? {})) {
      const by = {};
      for (const id of e.queued ?? []) if (id in groupOf) (by[groupOf[id]] ??= []).push(id);
      for (const [g, ids] of Object.entries(by)) out.push(`${group(+g)} queues at ${door(r, d)} (${ids.length} waiting)`);
    }
    return out;
  }

  function intel(i) {
    const loss = mods(i.debuff);
    const effects = [mods(i.buff), loss && `${other(i.winner)} ${loss}`].filter(Boolean).join('; ');
    const learned = i.learned?.length ? ` ATK learns the ${list(i.learned.map(x => (x === 'positions' ? 'defender positions' : x)))}.` : '';
    return `${i.winner} wins the intel exchange${effects ? `: ${effects}` : ''}.${learned}`;
  }

  function fight(f, r) {
    const names = f[f.winner].scores.map(x => x.name);
    const subject = names.length && names.length <= 2 ? list(names) : f.winner;
    const [one, many] = VERBS[f.strength] ?? ['beats', 'beat'];
    const verb = names.length === 2 ? many : one;
    const kills = f.kills.map(k => `${k.victim} falls to ${k.killer}`);
    const outcome = f.event === 'planted' ? 'the bomb is planted' : f.event === 'taken' ? 'ATK takes the zone' : '';
    const helpers = [...(f.supporters?.ATK ?? []), ...(f.supporters?.DEF ?? [])].map(id => opName(r, id));
    const support = helpers.length ? `${list(helpers)} support${helpers.length === 1 ? 's' : ''} from next door` : '';
    const e = f.entrySides;
    const hold = e?.occupant && Math.round(e.value * 10) ? `${e.occupant} ${e.value > 0 ? 'holds the entry' : `is caught between ${e.doors.length} doors`} (${tenth(e.value)})` : '';
    return `${[`${subject} ${verb} the ${f.situation} fight at ${zone(r, f.zone)}`, hold, support, ...kills, outcome].filter(Boolean).join('; ')}.`;
  }

  function events(s, r) {
    const fought = new Set(s.fights.map(f => f.zone));
    const out = [];
    const rotating = s.events.filter(e => e.type === 'rotate').map(e => `${opName(r, e.op)} to ${zone(r, e.to)}`);
    for (const e of s.events) {
      if (e.type === 'trap') out.push(`${group(e.group)} springs a trap on ${door(r, e.door)} and DEF now tracks it.`);
      else if (e.type === 'alarm') out.push(`${group(e.group)} trips an alarm on ${door(r, e.door)}: DEF knows where it is.`);
      else if (e.type === 'disarm') out.push(`${group(e.group)} disarms the trap on ${door(r, e.door)}.`);
      else if (e.type === 'breach') out.push(`${opName(r, e.op)} breaches ${door(r, e.door)}.`);
      else if (e.type === 'blocked') out.push(`${group(e.group)} hits the reinforced ${door(r, e.door).slice(4)}${e.waitFor ? ` and waits for ${opName(r, e.waitFor)} to breach it` : ''}.`);
      else if (e.type === 'reroute') out.push(e.door ? `${group(e.group)} takes another way round.` : `${group(e.group)} falls back to ${zone(r, e.to)} and reroutes.`);
      else if (e.type === 'taken' && !fought.has(e.zone)) out.push(`ATK takes ${zone(r, e.zone)} unopposed.`);
      else if (e.type === 'planted' && !fought.has(e.zone)) out.push(`ATK plants the bomb at ${zone(r, e.zone)}.`);
    }
    if (rotating.length) out.push(`DEF rotates: ${list(rotating)}.`);
    return out;
  }

  function step(s, r) {
    if (s.step === 0) {
      const groups = s.plan?.groups.length ?? 0;
      return `${intel(s.intel)} ATK goes in with ${groups} group${groups === 1 ? '' : 's'}.`;
    }
    const lines = [...s.fights.map(f => fight(f, r)), ...events(s, r), ...queues(s, r).map(x => `${x}.`)];
    if (!lines.length) lines.push('No contact: the groups move up.');
    if (r?.result && s.step === r.step) lines.push(`${END[r.result.reason]?.(r.result.winner) ?? r.result.reason}, ${r.result.winner} wins the round.`);
    return lines.join(' ');
  }

  return { step, intel, fight, queues };
})();

if (typeof module === 'object') module.exports = Narrate;
