(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const names = Object.keys(ASTRA_MAPS);
  const atk = DATA.ROSTER.filter(op => Engine.sideOf(op) === 'ATK');
  const def = DATA.ROSTER.filter(op => Engine.sideOf(op) === 'DEF');
  let requested;
  try { requested = decodeURIComponent(location.hash.slice(1)); } catch { requested = ''; }
  let selected = names.includes(requested) ? requested : names[0];
  let lesson = null;
  let prepared = null;
  const seed = () => {
    const n = Number($('round-seed').value);
    const value = Number.isFinite(n) ? Math.max(0, Math.min(4294967295, Math.trunc(n))) : 20261029;
    $('round-seed').value = value;
    return value;
  };

  function inspectZone(id) {
    const map = ASTRA_MAPS[selected], zone = map.zones[id];
    $('map-view').querySelectorAll('.zone').forEach(el => el.classList.toggle('selected', el.dataset.zone === id));
    const neighbors = map.edges.filter(edge => edge.includes(id)).map(edge => edge.find(x => x !== id));
    $('inspector').innerHTML = '<p class="eyebrow">' + esc(zone.type) + '</p><h3>' + esc(zone.label) + '</h3><p>' +
      (map.spawns.includes(id) ? 'Attacker starting area. No indoor room capacity limit.' : 'Capacity: 3 operators per side. Space: ' + esc(zone.space) + '.') +
      '</p><p><strong>Connected rooms</strong></p><ul>' + neighbors.map(next => '<li>' + esc(map.zones[next].label) + '</li>').join('') + '</ul>';
  }

  function inspectDoor(id) {
    const map = ASTRA_MAPS[selected], [a, b] = id.split('|');
    $('inspector').innerHTML = '<p class="eyebrow">DOOR</p><h3>' + esc(map.zones[a].label) + ' ↔ ' + esc(map.zones[b].label) + '</h3><p>Normally 2 operators per side can cross per step. A breached door allows 1 per side per step under current V4 rules.</p><p>Reinforcement must keep every room reachable and at least 2 objective doors open.</p>';
  }

  function buildRound() {
    const options = lesson ? AstraTutorial.options(lesson, atk, def, seed()) : {
      seed: seed(), atkTemplate: $('attack-plan').value || undefined, defTemplate: $('defense-plan').value || undefined,
    };
    prepared = Engine.playRound(atk, def, selected, options);
  }

  function drawMap() {
    const state = $('show-plans').checked ? { setup: prepared.setup, plan: prepared.plan, ops: [...atk, ...def] } : {};
    $('map-view').innerHTML = FloorPlan.plan(selected, state, { mode: 'planning', legend: true, selected: ASTRA_MAPS[selected].site });
    FloorPlan.bindPlan($('map-view').querySelector('svg'), { onZone: inspectZone, onDoor: inspectDoor });
    const rooms = AstraTutorial.lessons.find(item => item.id === lesson)?.rooms ?? [];
    $('map-view').querySelectorAll('.zone').forEach(el => el.classList.toggle('lesson-room', rooms.includes(el.dataset.zone)));
    inspectZone(ASTRA_MAPS[selected].site);
  }

  function changeMap(name) {
    Playback.stop();
    $('round-review').hidden = true;
    selected = name;
    lesson = null;
    $('attack-plan').disabled = false;
    $('defense-plan').disabled = false;
    location.hash = encodeURIComponent(name);
    const map = ASTRA_MAPS[name];
    $('map-kind').textContent = map.meta.kind === 'tutorial' ? 'TUTORIAL FOUNDATION' : 'COMPETITIVE MAP';
    $('map-title').textContent = name;
    $('map-description').textContent = map.meta.description;
    const facts = [
      map.meta.shape, Object.keys(map.zones).length + ' zones', map.doors.length + ' doors',
      map.spawns.length + ' starting areas', map.edges.filter(edge => edge.includes(map.site)).length + ' objective doors',
    ];
    $('map-facts').innerHTML = facts.map(value => '<span>' + esc(value) + '</span>').join('');
    $('map-cards').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.map === name)));
    $('tutorial').hidden = map.meta.kind !== 'tutorial';
    $('lesson-detail').textContent = '';
    $('lesson-buttons').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    buildRound();
    drawMap();
  }

  $('map-cards').innerHTML = names.map((name, i) => {
    const map = ASTRA_MAPS[name];
    return '<button class="map-card" data-map="' + esc(name) + '" aria-pressed="false"><span class="thumb" aria-hidden="true">' +
      FloorPlan.plan(name, {}, { legend: false, uid: 'thumb-' + i }) + '</span><strong>' + esc(name) +
      '</strong><small>' + esc(map.meta.shape) + '</small><span class="tag">' + (map.meta.kind === 'tutorial' ? 'LEARN THE BASICS' : 'MAP 0' + (i + 1)) + '</span></button>';
  }).join('');
  $('map-cards').querySelectorAll('button').forEach(button => button.onclick = () => changeMap(button.dataset.map));
  for (const [id, templates] of [['attack-plan', DATA.ATK_TEMPLATES], ['defense-plan', DATA.DEF_TEMPLATES]]) {
    $(id).insertAdjacentHTML('beforeend', Object.entries(templates).map(([key, value]) => '<option value="' + esc(key) + '">' + esc(key + ' · ' + value.name) + '</option>').join(''));
    $(id).onchange = () => { Playback.stop(); $('round-review').hidden = true; buildRound(); drawMap(); };
  }
  $('round-seed').onchange = () => { Playback.stop(); $('round-review').hidden = true; buildRound(); drawMap(); };
  $('show-plans').onchange = drawMap;
  $('next-seed').onclick = () => {
    $('round-seed').value = (seed() + 1) >>> 0;
    $('round-seed').onchange();
  };
  $('play-round').onclick = () => {
    const round = prepared;
    $('round-review').hidden = false;
    $('round-result').textContent = 'Round playing · seed ' + round.seed;
    $('round-events').innerHTML = Playback.stepTable('<tbody>' + round.log.map(step => Playback.stepRows(step, round)).join('') + '</tbody>');
    const finish = () => {
      $('round-result').textContent = round.result.winner + ' wins · ' + round.result.reason + ' · ' + round.step + ' steps · seed ' + round.seed;
      $('round-playback').innerHTML = Playback.replay(round, round.step);
    };
    Playback.start(round, $('round-playback'), { title: selected, onEnd: finish });
    $('round-review').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  };
  $('export-map').onclick = () => {
    const blob = new Blob([JSON.stringify({ formatVersion: 1, name: selected, map: ASTRA_MAPS[selected] }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = selected.toLowerCase().replaceAll(' ', '-') + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('lesson-buttons').innerHTML = AstraTutorial.lessons.map(item => '<button data-lesson="' + item.id + '" aria-pressed="false">' + esc(item.title) + '</button>').join('');
  $('lesson-buttons').querySelectorAll('button').forEach(button => button.onclick = () => {
    Playback.stop();
    $('round-review').hidden = true;
    lesson = button.dataset.lesson;
    const item = AstraTutorial.lessons.find(value => value.id === lesson);
    $('lesson-buttons').querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other.dataset.lesson === lesson)));
    $('lesson-detail').innerHTML = '<strong>' + esc(item.goal) + '</strong><p>' + esc(item.detail) + '</p>';
    $('attack-plan').disabled = true;
    $('defense-plan').disabled = true;
    $('show-plans').checked = true;
    buildRound();
    drawMap();
  });
  changeMap(selected);
})();
