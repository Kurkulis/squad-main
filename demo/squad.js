const Squad = (() => {
  const other = side => (side === 'ATK' ? 'DEF' : 'ATK');

  function summary(ops, label) {
    if (!ops.length) return `<p class="squad-summary"><b>${label}</b> · no operators</p>`;
    const es = ops.map(op => Engine.effectiveStats(op));
    const avg = DATA.STATS.map(s => `<span title="${DATA.STAT_LABELS[s]}">${s} <b>${Math.round(es.reduce((a, x) => a + x[s], 0) / es.length)}</b></span>`).join(' ');
    const roles = ops.map(op => `<span>${Visuals.icon(op)}${op.role}</span>`).join(' ');
    return `<p class="squad-summary"><b>${label}</b> · ${ops.length} operators · avg effective ${avg} · ${roles}</p>`;
  }

  function mount(el, side, player, enemy, match) {
    const open = sel => (el.querySelector?.(sel)?.open ? ' open' : '');
    const mine = player.filter(op => Engine.sideOf(op) === side);
    const theirs = enemy.filter(op => Engine.sideOf(op) === other(side));
    el.innerHTML = `${summary(mine, `Your ${side} squad`)}
<details class="stat-guide-panel"${open('.stat-guide-panel')}><summary>Stat guide</summary>${Cards.statGuide()}</details>
${Cards.toggle()}${Cards.view(mine, true, match, 'large')}
<details class="squad-opponent"${open('.squad-opponent')}><summary>Opponent ${other(side)} squad (${theirs.length})</summary>${summary(theirs, `Opponent ${other(side)}`)}${Cards.view(theirs, false, match, 'compact')}</details>`;
    Cards.bind(el, mine, () => mount(el, side, player, enemy, match));
  }

  return { mount };
})();

if (typeof module === 'object') module.exports = Squad;
