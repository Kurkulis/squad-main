const Ladder = (() => {
  const KEY = 'squadsim.ladder.v1';
  const QUALITIES = [50, 53, 56, 59, 62, 65, 68];
  const ARCHETYPES = ['Balanced', 'Rush', 'Tactical', 'Utility-heavy', 'Rush', 'Tactical', 'Utility-heavy'];
  const VERSION = 2;
  const state = { run: null, player: null, storageOk: true, notice: '' };

  function newRun(seed, player) {
    Engine.setRandom(Engine.mulberry32(seed));
    let opponents;
    try {
      opponents = QUALITIES.map((quality, i) => ({ quality, archetype: ARCHETYPES[i], squad: Engine.generateSquad(quality, ARCHETYPES[i]) }));
    } finally {
      Engine.setRandom(Math.random);
    }
    state.run = { id: `run-${seed}-${Date.now().toString(36)}`, seed, opponents, results: [], current: 0 };
    state.player = Engine.cloneSquad(player);
    save();
    return state.run;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: VERSION, run: state.run, player: state.player }));
      state.storageOk = true;
    } catch {
      state.storageOk = false;
    }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      state.storageOk = true;
      if (!saved?.run) return state.run;
      const current = saved.version === VERSION && saved.run.opponents?.length === QUALITIES.length && saved.run.results.every(r => !r || r.map in MAPS2);
      if (current) Object.assign(state, { run: saved.run, player: saved.player });
      else {
        state.notice = 'Your saved ladder run was played on the old maps and has been discarded. A new run has started.';
        localStorage.removeItem(KEY);
      }
    } catch {
      state.storageOk = false;
    }
    return state.run;
  }

  const opponent = () => state.run?.opponents[state.run.current] ?? null;
  const finished = () => !!state.run && state.run.current >= state.run.opponents.length;

  function setPlayer(player) {
    state.player = Engine.cloneSquad(player);
    save();
  }

  function record(match, why) {
    const tag = match.ladder;
    const run = state.run;
    if (!tag || !run || tag.runId !== run.id || tag.index !== run.current || run.results[tag.index] || !match.over) return null;
    const last = match.rounds.at(-1);
    const result = {
      index: tag.index, map: match.map, won: match.score.player > match.score.enemy,
      roundsFor: match.score.player, roundsAgainst: match.score.enemy,
      why, lastRound: { playerSide: last.playerSide, winner: last.result.winner, reason: last.result.reason, steps: last.step },
    };
    run.results[tag.index] = result;
    run.current++;
    save();
    return result;
  }

  function standings() {
    const results = state.run?.results.filter(Boolean) ?? [];
    const total = key => results.reduce((a, r) => a + r[key], 0);
    return { wins: results.filter(r => r.won).length, losses: results.filter(r => !r.won).length, roundsFor: total('roundsFor'), roundsAgainst: total('roundsAgainst') };
  }

  return { state, newRun, load, save, opponent, finished, setPlayer, record, standings };
})();

if (typeof module === 'object') module.exports = Ladder;
