(() => {
  const { API_URL, api, esc, css, signed, dirClass, arrow, md, price, money, signedMoney, assetStandings,
    grade, dirHits, standings, renderTarget, podiumHtml, chartOptions } = window.MPG;
  const t = (k, v) => window.I18N.t(k, v);
  const STORE_KEY = 'mpg.studentId';
  const $ = id => document.getElementById(id);

  let studentId = null;
  let data = null;
  let boardScope = null;
  let charts = {};
  let countdownTimer = null;
  let trade = null; // 本週表單裡的投資配置

  const store = {
    get() { try { return localStorage.getItem(STORE_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORE_KEY, v); } catch {} },
    clear() { try { localStorage.removeItem(STORE_KEY); } catch {} },
  };

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  const loading = on => { $('loading').hidden = !on; };

  // ---------- 計分 ----------
  const weekMap = () => Object.fromEntries(data.weeks.map(w => [w.week, w]));
  const lastSettled = () => [...data.weeks].reverse().find(w => w.status === 'settled');
  const scopeFilter = scope => scope === 'all' ? () => true
    : scope === '1' ? wk => wk <= data.roundSplit : wk => wk > data.roundSplit;
  const pfRows = () => (data.portfolio && data.portfolio.rows) || [];

  const LEVELS = [[0, 'lv.0', '🐣'], [60, 'lv.1', '📈'], [150, 'lv.2', '🧐'], [260, 'lv.3', '📊'], [400, 'lv.4', '💼'], [600, 'lv.5', '🔮']];

  function computeXP() {
    const wm = weekMap();
    let xp = 0;
    data.me.forEach(p => {
      if (p.spx == null || p.ixic == null) return;
      xp += 10;
      if (p.error != null) xp += Math.max(0, Math.round(50 - 15 * p.error)) + 10 * dirHits(p, wm[p.week]);
    });
    let i = LEVELS.length - 1;
    while (i > 0 && xp < LEVELS[i][0]) i--;
    const next = LEVELS[i + 1];
    return { xp, level: LEVELS[i], index: i, next, pct: next ? (xp - LEVELS[i][0]) / (next[0] - LEVELS[i][0]) : 1 };
  }

  function computeBadges() {
    const wm = weekMap();
    const sub = data.me.filter(p => p.spx != null && p.ixic != null);
    const subWeeks = new Set(sub.map(p => p.week));
    const scored = sub.filter(p => p.error != null).sort((a, b) => a.week - b.week);

    let best = 0, cur = 0, prev = null;
    [...subWeeks].sort((a, b) => a - b).forEach(w => { cur = prev === w - 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = w; });
    let steady = 0, run = 0, prevWk = null;
    scored.forEach(p => { run = p.error < 1.5 ? (prevWk === p.week - 1 ? run + 1 : 1) : 0; steady = Math.max(steady, run); prevWk = p.week; });

    const tops = Object.values(data.highlights || {});
    const champ = tops.some(top => top.some(x => x.rank === 1 && x.name === data.student.name));
    const podium = tops.some(top => top.some(x => x.name === data.student.name));
    const bear = sub.some(p => { const w = wm[p.week]; return w && w.spx != null && ((w.spx <= -1 && p.spx < 0) || (w.ixic <= -1 && p.ixic < 0)); });
    const r1Weeks = data.weeks.filter(w => w.round === 1 && w.week !== 1).map(w => w.week);
    const writer = sub.filter(p => (p.rationale || '').length >= 10).length;

    return [
      ['🚀', 'b.first', sub.length >= 1],
      ['🎯', 'b.bull', scored.some(p => p.error < 0.5)],
      ['🧭', 'b.dir', scored.some(p => dirHits(p, wm[p.week]) === 2)],
      ['🔥', 'b.streak', best >= 3],
      ['🥉', 'b.podium', podium],
      ['🏆', 'b.champ', champ],
      ['🐻', 'b.bear', bear],
      ['💎', 'b.steady', steady >= 3],
      ['✍️', 'b.writer', writer >= 3],
      ['💰', 'b.money', pfRows().some(r => r.pnl > 0)],
      ['🩳', 'b.shortWin', pfRows().some(r => r.pnl > 0 && (r.wSpx < 0 || r.wIxic < 0))],
      ['📅', 'b.r1', r1Weeks.length > 0 && r1Weeks.every(w => subWeeks.has(w))],
    ].map(([ic, key, ok]) => { const [name, desc] = t(key); return { ic, name, desc, ok }; });
  }

  // ---------- 畫面 ----------
  function show(view) {
    $('login').hidden = view !== 'login';
    $('app').hidden = view !== 'app';
  }

  function renderAll() {
    renderHeader();
    renderMission();
    renderTiles();
    renderPodium();
    renderPortfolio();
    renderCharts();
    renderMyTarget();
    renderBoard();
    renderBadges();
    renderRecords();
  }

  function renderHeader() {
    const s = data.student;
    const lv = computeXP();
    $('avatar').textContent = lv.level[2];
    $('who-name').textContent = s.name;
    $('who-sub').textContent = [s.dept, API_URL ? '' : t('demo')].filter(Boolean).join(' · ');
    $('level-name').textContent = `Lv.${lv.index + 1} ${t(lv.level[1])}`;
    $('level-xp').textContent = lv.next ? `${lv.xp} / ${lv.next[0]} XP` : t('xp.max', { xp: lv.xp });
    requestAnimationFrame(() => { $('xpfill').style.width = Math.round(lv.pct * 100) + '%'; });
    $('xpbar').setAttribute('aria-valuenow', lv.xp);
  }

  function renderMission() {
    const el = $('mission');
    clearInterval(countdownTimer);
    trade = null;
    const ls = lastSettled();
    const mineLast = ls && data.me.find(p => p.week === ls.week);
    const lastHtml = ls ? `<div class="last-result">${t('m.last', {
      w: ls.week,
      spx: `<b class="${dirClass(ls.spx)}">${arrow(ls.spx)} ${signed(ls.spx)}</b>`,
      ixic: `<b class="${dirClass(ls.ixic)}">${arrow(ls.ixic)} ${signed(ls.ixic)}</b>`,
    })}${mineLast && mineLast.error != null ? t('m.lastErr', { e: mineLast.error.toFixed(2), g: grade(mineLast.error).emoji }) : ''}</div>` : '';

    const w = data.openWeek && weekMap()[data.openWeek];
    if (!w) {
      el.innerHTML = `<div class="empty-state"><div class="big">🏁</div><h2>${t('m.none.title')}</h2>
        <p>${t('m.none.body')}</p></div>${lastHtml}`;
      return;
    }
    const mine = data.me.find(p => p.week === w.week) || {};
    const has = mine.spx != null && mine.ixic != null;
    const base = w.startClose && w.startClose.spx != null
      ? `<div class="base-close">${t('m.base', { spx: price(w.startClose.spx), ixic: price(w.startClose.ixic) })}</div>` : '';
    const idx = k => k === 'spx' ? 'S&P 500' : 'NASDAQ';
    el.innerHTML = `
      <div class="card-head"><h2>${t('m.title', { w: w.week, r: w.round })}</h2><span class="countdown" id="countdown"></span></div>
      <div class="period">${t('m.period', { a: md(w.start), b: md(w.end) })}</div>${base}
      <form id="pred-form">
        <div class="pred-grid">
          ${['spx', 'ixic'].map(k => `
            <div class="pred">
              <div class="pred-label"><span>${esc(idx(k))}</span><span class="pred-dir" id="dir-${k}"></span></div>
              <div class="stepper">
                <button type="button" data-k="${k}" data-d="-0.1" aria-label="${t('m.dec')}">−</button>
                <input id="in-${k}" type="number" step="0.01" min="-${data.maxAbsPred}" max="${data.maxAbsPred}" inputmode="decimal" placeholder="0.00" value="${mine[k] != null ? mine[k] : ''}" required aria-label="${esc(t('m.predAria', { i: idx(k) }))}">
                <span class="pct">%</span>
                <button type="button" data-k="${k}" data-d="0.1" aria-label="${t('m.inc')}">+</button>
              </div>
            </div>`).join('')}
        </div>
        <label for="in-why" class="small muted">${t('m.why')}</label>
        <textarea id="in-why" maxlength="500" placeholder="${esc(t('m.whyPh'))}">${esc(mine.rationale || '')}</textarea>
        ${tradeHtml(w, mine)}
        <div class="row-end">
          <button class="btn primary" type="submit" id="pred-btn">${has ? t('m.update') : t('m.submit')}</button>
          <span class="saved-note">${has ? t('m.saved', { spx: signed(mine.spx), ixic: signed(mine.ixic) }) : t('m.unsaved')}</span>
        </div>
        <p class="error" id="pred-error" role="alert"></p>
      </form>${lastHtml}`;

    const deadline = new Date(w.deadline);
    const tick = () => {
      const ms = deadline - Date.now();
      const cd = $('countdown');
      if (!cd) return;
      if (ms <= 0) { cd.textContent = t('m.closed'); clearInterval(countdownTimer); return; }
      const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
      cd.textContent = t('m.left', { d: d ? t('m.leftDays', { d }) : '', h, m });
      cd.classList.toggle('urgent', ms < 6 * 3600000);
      cd.title = t('m.deadline', { t: MPG.fmtDeadline(w.deadline) });
    };
    tick();
    countdownTimer = setInterval(tick, 30000);

    const updateDir = k => {
      const v = parseFloat($('in-' + k).value);
      const d = $('dir-' + k);
      d.className = 'pred-dir ' + (v > 0 ? 'up' : v < 0 ? 'down' : '');
      d.textContent = !isFinite(v) ? '' : v > 0 ? t('m.up') : v < 0 ? t('m.down') : t('m.flat');
    };
    ['spx', 'ixic'].forEach(k => { updateDir(k); $('in-' + k).addEventListener('input', () => { updateDir(k); updateTrade(); }); });
    el.querySelectorAll('.stepper button').forEach(b => b.addEventListener('click', () => {
      const inp = $('in-' + b.dataset.k);
      const v = (parseFloat(inp.value) || 0) + parseFloat(b.dataset.d);
      inp.value = (Math.round(v * 100) / 100).toFixed(2);
      updateDir(b.dataset.k);
      updateTrade();
    }));
    bindTrade();
    $('pred-form').addEventListener('submit', onSubmit);
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const btn = $('pred-btn');
    const errEl = $('pred-error');
    errEl.textContent = '';
    const before = computeXP();
    btn.disabled = true;
    try {
      const out = await api({
        action: 'submit', id: studentId, week: data.openWeek,
        spx: $('in-spx').value, ixic: $('in-ixic').value, rationale: $('in-why').value,
        ...tradeValues(),
      });
      data = out;
      renderAll();
      const gained = computeXP().xp - before.xp;
      toast(t('m.toast', { w: out.saved.week }) + (gained > 0 ? `　+${gained} XP` : ''));
    } catch (e) {
      errEl.textContent = e.message;
      btn.disabled = false;
    }
  }

  // ---------- 模擬投資：本週配置 ----------
  function tradeHtml(w, mine) {
    if (!data.trading) return '';
    const tr = data.trading;
    const row = pfRows().find(r => r.week === w.week);
    const equity = row ? row.start : data.portfolio.equity;
    if (w.week < tr.startWeek) {
      return `<div class="trade trade-soon">${t('t.soon', { a: tr.autoWeight, w: tr.startWeek, eq: money(equity, 2) })}</div>`;
    }
    const manual = mine.wSpx != null && mine.wIxic != null;
    trade = { equity, mode: manual ? 'manual' : 'auto', spx: manual ? mine.wSpx : 0, ixic: manual ? mine.wIxic : 0, max: tr.maxExposure, auto: tr.autoWeight };
    const slider = (k, label) => `
      <div class="alloc">
        <div class="alloc-label"><span>${esc(label)}</span><span class="alloc-val" id="alloc-val-${k}"></span></div>
        <input type="range" id="alloc-${k}" min="-100" max="100" step="5" value="${trade[k]}" aria-label="${esc(t('t.allocAria', { i: label }))}">
        <div class="alloc-scale"><span>${t('t.short100')}</span><span>0</span><span>${t('t.long100')}</span></div>
      </div>`;
    return `<div class="trade" id="trade">
      <div class="trade-head"><h3>${t('t.title')}</h3>
        <span class="small muted">${t('t.start', { eq: money(equity, 2) })}</span></div>
      <div class="trade-mode" id="trade-mode"></div>
      ${slider('spx', 'S&P 500')}${slider('ixic', 'NASDAQ')}
      <div class="alloc-summary" id="alloc-summary"></div>
      <div class="trade-actions">
        <button type="button" class="btn small" id="alloc-auto">${t('t.auto')}</button>
        <button type="button" class="btn small" id="alloc-cash">${t('t.cash')}</button>
      </div>
      <div class="what-if" id="what-if"></div>
      <p class="small muted trade-note">${t('t.note', { a: md(w.start), b: md(w.end), w: trade.auto, m: trade.max })}</p>
    </div>`;
  }

  /** 自動配置：每個指數 autoWeight%，方向跟著預測。 */
  function autoWeights() {
    const s = k => { const n = parseFloat($('in-' + k).value); return !isFinite(n) || n === 0 ? 0 : Math.sign(n); };
    return { spx: s('spx') * trade.auto, ixic: s('ixic') * trade.auto };
  }

  function bindTrade() {
    if (!trade || !$('trade')) return;
    ['spx', 'ixic'].forEach(k => $('alloc-' + k).addEventListener('input', () => {
      if (trade.mode === 'auto') Object.assign(trade, autoWeights());
      const other = k === 'spx' ? 'ixic' : 'spx';
      let v = +$('alloc-' + k).value;
      const room = trade.max - Math.abs(trade[other]);
      if (Math.abs(v) > room) v = Math.sign(v) * room; // 超過上限時自動夾住
      trade[k] = v; trade.mode = 'manual';
      updateTrade();
    }));
    $('alloc-auto').addEventListener('click', () => { trade.mode = 'auto'; updateTrade(); });
    $('alloc-cash').addEventListener('click', () => { Object.assign(trade, { mode: 'manual', spx: 0, ixic: 0 }); updateTrade(); });
    updateTrade();
  }

  function updateTrade() {
    if (!trade || !$('trade')) return;
    if (trade.mode === 'auto') Object.assign(trade, autoWeights());
    $('alloc-spx').value = trade.spx; $('alloc-ixic').value = trade.ixic;
    $('trade-mode').innerHTML = trade.mode === 'auto' ? t('t.modeAuto', { a: trade.auto }) : t('t.modeManual');
    const amt = k => trade.equity * trade[k] / 100;
    ['spx', 'ixic'].forEach(k => {
      const v = trade[k];
      $('alloc-val-' + k).innerHTML = v === 0 ? t('t.none')
        : `<b class="${v > 0 ? 'up-text' : 'down-text'}">${v > 0 ? t('t.long') : t('t.short')} ${Math.abs(v)}%</b> · ${money(Math.abs(amt(k)))}`;
    });
    const gross = Math.abs(trade.spx) + Math.abs(trade.ixic);
    $('alloc-summary').innerHTML = t('t.summary', { g: gross, m: trade.max, c: money(trade.equity * (100 - gross) / 100), p: 100 - gross });
    const ps = parseFloat($('in-spx').value), pi = parseFloat($('in-ixic').value);
    if (isFinite(ps) && isFinite(pi)) {
      const pnl = trade.equity * (trade.spx * ps + trade.ixic * pi) / 10000;
      $('what-if').innerHTML = gross === 0 ? t('t.allCash')
        : t('t.whatIf', { cls: pnl > 0 ? 'up-text' : pnl < 0 ? 'down-text' : '', verb: pnl >= 0 ? t('t.earn') : t('t.lose'),
          amt: money(Math.abs(pnl), 2), pct: signed(pnl / trade.equity * 100) })
          + (pnl < 0 ? `<br><span class="small muted">${t('t.contra')}</span>` : '');
    } else {
      $('what-if').textContent = t('t.fillFirst');
    }
  }

  /** 送出的配置：自動模式送空白（後端依預測方向配置）。 */
  function tradeValues() {
    if (!trade || !$('trade')) return {};
    return trade.mode === 'auto' ? { wSpx: '', wIxic: '' } : { wSpx: trade.spx, wIxic: trade.ixic };
  }

  // ---------- 數據方塊 ----------
  function tile(label, value, sub) {
    return `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div><div class="tile-sub">${sub || ''}</div></div>`;
  }

  function currentRound() {
    const ls = lastSettled();
    const ref = data.openWeek || (ls || data.weeks[0]).week;
    return ref <= data.roundSplit ? '1' : '2';
  }

  function renderTiles() {
    const wm = weekMap();
    const round = currentRound();
    const st = standings(data.board, scopeFilter(round));
    const me = st.ranked.find(r => r.name === data.student.name);
    const scored = data.me.filter(p => p.error != null);
    const hits = scored.reduce((a, p) => a + dirHits(p, wm[p.week]), 0);
    const settledCount = data.weeks.filter(w => w.status === 'settled').length;
    const ls = lastSettled();
    const ar = ls ? assetStandings(data.board, ls.week).find(r => r.name === data.student.name) : null;
    const pf = data.portfolio;
    $('tiles').innerHTML = [
      tile(t('tile.rank', { r: round }), me ? `${me.rank}<span class="small muted"> / ${st.ranked.length}</span>` : '—',
        me ? t('tile.avg', { a: me.avg.toFixed(2) }) + (me.missed ? t('tile.avgMissed', { n: me.missed }) : '') : t('tile.noScore')),
      tile(t('tile.assets'), pf ? money(pf.equity) : '—',
        pf ? `<span class="${dirClass(pf.totalReturn)}">${signed(pf.totalReturn)}</span>${ar ? t('tile.assetRank', { n: ar.rank }) : ''}` : ''),
      tile(t('tile.hit'), scored.length ? Math.round(hits / (scored.length * 2) * 100) + '%' : '—',
        scored.length ? t('tile.hitSub', { h: hits, n: scored.length * 2 }) : ''),
      tile(t('tile.weeks'), `${data.me.filter(p => p.spx != null && p.ixic != null).length}`,
        t('tile.settled', { n: settledCount }) + (me && me.missed ? t('tile.missed', { n: me.missed }) : '')),
    ].join('');
  }

  function renderPodium() {
    const ls = lastSettled();
    $('podium-title').textContent = ls ? t('podium.title', { w: ls.week }) : t('podium.titleNone');
    $('podium').innerHTML = podiumHtml(ls && data.highlights && data.highlights[ls.week], { me: data.student.name });
  }

  // ---------- 模擬投資：資產卡 ----------
  function renderPortfolio() {
    const card = $('portfolio-card');
    if (!data.trading || !data.portfolio) { card.hidden = true; return; }
    card.hidden = false;
    const tr = data.trading, pf = data.portfolio;
    $('pf-equity').textContent = money(pf.equity, 2);
    const gain = pf.equity - tr.startingCash;
    const g = `<span class="${dirClass(gain)}">${t('pf.gain', { g: signedMoney(gain, 2), p: signed(pf.totalReturn) })}</span>`;
    $('pf-ret').innerHTML = t('pf.ret', { gain: g, s: money(tr.startingCash) });

    const ls = lastSettled();
    const ranks = ls ? assetStandings(data.board, ls.week) : [];
    const me = ranks.find(r => r.name === data.student.name);
    const first = data.weeks[0];
    const bh = k => first && ls && first.startClose[k] ? tr.startingCash * ls.endClose[k] / first.startClose[k] : null;
    $('pf-stats').innerHTML = `
      <div><span>${t('pf.rank')}</span><b>${me ? `${me.rank} / ${ranks.length}` : '—'}</b></div>
      <div><span>${esc(t('pf.bhSpx'))}</span><b>${money(bh('spx'), 2)}</b></div>
      <div><span>${esc(t('pf.bhIxic'))}</span><b>${money(bh('ixic'), 2)}</b></div>`;

    const src = r => r.source === 'manual' ? `<span class="chip bull">${t('pf.manual')}</span>`
      : r.source === 'auto' ? `<span class="chip">${t('pf.autoChip')}</span>` : `<span class="chip">${t('pf.cashChip')}</span>`;
    $('pf-rows').innerHTML = [...pfRows()].reverse().map(r => {
      const st = r.status === 'settled' ? '' : `<span class="chip">${r.status === 'open' ? t('status.open') : t('status.pending')}</span>`;
      const pos = v => v === 0 ? '—' : `<span class="${dirClass(v)}">${v > 0 ? t('pf.long') : t('pf.short')} ${Math.abs(v)}%</span>`;
      return `<tr class="${r.status === 'open' ? 'open' : ''}"><td>W${r.week}</td><td>${src(r)}</td>
        <td class="num">${pos(r.wSpx)}</td><td class="num">${pos(r.wIxic)}</td><td class="num">${money(r.start, 2)}</td>
        <td class="num ${dirClass(r.pnl)}">${r.pnl == null ? st : signedMoney(r.pnl, 2)}</td>
        <td class="num ${dirClass(r.ret)}">${r.ret == null ? '' : signed(r.ret)}</td><td class="num">${money(r.end, 2)}</td></tr>`;
    }).join('') || `<tr><td colspan="8" class="muted">${t('rec.empty')}</td></tr>`;
  }

  // ---------- 圖表 ----------
  function destroyCharts() { Object.values(charts).forEach(c => c.destroy()); charts = {}; }

  function renderCharts() {
    if (!window.Chart) return;
    destroyCharts();
    const labels = data.weeks.map(w => 'W' + w.week);
    const mineByWeek = Object.fromEntries(data.me.map(p => [p.week, p]));
    const s1 = css('--series-1'), s2 = css('--series-2'), s3 = css('--series-3'), surface = css('--surface');
    ['spx', 'ixic'].forEach(k => {
      const actual = data.weeks.map(w => w[k]);
      const mine = data.weeks.map(w => mineByWeek[w.week] && mineByWeek[w.week][k] != null ? mineByWeek[w.week][k] : null);
      const all = actual.concat(mine).filter(v => v != null);
      const lim = Math.max(1, Math.ceil(Math.max(...all.map(Math.abs), 0)));
      const opts = chartOptions();
      opts.scales.y.min = -lim; opts.scales.y.max = lim;
      opts.scales.y.ticks.callback = v => (v > 0 ? '+' : '') + v + '%';
      opts.scales.y.grid.color = ctx => ctx.tick.value === 0 ? css('--axis') : css('--grid');
      opts.plugins.tooltip.callbacks = {
        title: items => { const w = data.weeks[items[0].dataIndex]; return t('chart.tipTitle', { w: w.week, a: md(w.start), b: md(w.end) }); },
        label: item => ` ${item.dataset.label}: ${item.raw == null ? t('chart.na') : signed(item.raw)}`,
      };
      opts.plugins.tooltip.filter = item => item.raw != null || item.datasetIndex === 0;
      charts[k] = new Chart($('chart-' + k), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: t('chart.actualShort'), data: actual, borderColor: s1, backgroundColor: s1, borderWidth: 2, tension: 0.25,
              pointRadius: 3, pointHoverRadius: 5, pointBorderColor: surface, pointBorderWidth: 2, spanGaps: false },
            { label: t('chart.mine'), data: mine, showLine: false, backgroundColor: s2, borderColor: surface, borderWidth: 2,
              pointRadius: 6, pointHoverRadius: 8, pointStyle: 'circle' },
          ],
        },
        options: opts,
      });
    });

    // 名次變化：每個已結算週，以全季累積平均誤差（含缺交懲罰）排名
    const settled = data.weeks.filter(w => w.status === 'settled');
    const ranks = settled.map(w => {
      const r = standings(data.board, wk => wk <= w.week).ranked.find(x => x.name === data.student.name);
      return r ? r.rank : null;
    });
    const n = data.board.length;
    const ro = chartOptions();
    ro.scales.y.reverse = true; ro.scales.y.min = 1; ro.scales.y.max = n;
    ro.scales.y.ticks.stepSize = 1;
    ro.scales.y.ticks.callback = v => (Number.isInteger(v) && (v === 1 || v % 3 === 0 || v === n)) ? t('rank.tick', { n: v }) : '';
    ro.plugins.tooltip.callbacks = {
      title: items => t('rank.after', { w: settled[items[0].dataIndex].week }),
      label: item => item.raw == null ? t('rank.none') : ' ' + t('rank.tick', { n: item.raw }),
    };
    charts.rank = new Chart($('chart-rank'), {
      type: 'line',
      data: {
        labels: settled.map(w => 'W' + w.week),
        datasets: [{ label: 'rank', data: ranks, borderColor: s1, backgroundColor: s1, borderWidth: 2, tension: 0.2,
          pointRadius: 4, pointHoverRadius: 6, pointBorderColor: surface, pointBorderWidth: 2, spanGaps: true }],
      },
      options: ro,
    });

    // 資產走勢：我的資產 vs 一開始全買某個指數
    if (data.trading && data.portfolio && $('chart-assets')) {
      const tr = data.trading, first = data.weeks[0];
      const mineEq = Object.fromEntries(pfRows().filter(r => r.end != null).map(r => [r.week, r.end]));
      const bh = k => [tr.startingCash].concat(data.weeks.map(w => w.status === 'settled' && first.startClose[k] ? tr.startingCash * w.endClose[k] / first.startClose[k] : null));
      const ao = chartOptions();
      ao.scales.y.ticks.callback = v => money(v);
      ao.plugins.tooltip.callbacks = { label: item => ` ${item.dataset.label}: ${item.raw == null ? '—' : money(item.raw, 2)}` };
      ao.plugins.tooltip.filter = item => item.raw != null;
      const line = (label, values, color, bold) => ({ label, data: values, borderColor: color, backgroundColor: color,
        borderWidth: bold ? 3 : 2, tension: 0.2, pointRadius: bold ? 4 : 0, pointHoverRadius: 6,
        pointBorderColor: surface, pointBorderWidth: 2, spanGaps: false });
      charts.assets = new Chart($('chart-assets'), {
        type: 'line',
        data: { labels: [t('pf.start')].concat(labels), datasets: [
          line(t('pf.mine'), [tr.startingCash].concat(data.weeks.map(w => mineEq[w.week] ?? null)), s2, true),
          line(t('pf.bhSpx'), bh('spx'), s1),
          line(t('pf.bhIxic'), bh('ixic'), s3),
        ] },
        options: ao,
      });
    }
  }

  function renderMyTarget() {
    const wm = weekMap();
    const points = data.me.filter(p => p.error != null).map(p => {
      const w = wm[p.week];
      return {
        label: 'W' + p.week, dx: p.spx - w.spx, dy: p.ixic - w.ixic, strong: true,
        tip: t('my.tip', { w: p.week, e: p.error.toFixed(2), g: grade(p.error).emoji, ps: signed(p.spx), as: signed(w.spx), pi: signed(p.ixic), ai: signed(w.ixic) }),
      };
    });
    renderTarget($('target'), points, { empty: t('my.targetEmpty') });
  }

  // ---------- 排行榜 ----------
  function renderBoard() {
    if (!boardScope) boardScope = currentRound();
    $('board-tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.scope === boardScope));
    $('board-note').textContent = boardScope === 'assets' ? t('board.noteAssets') : t('board.noteErr');
    if (boardScope === 'assets') { renderAssetBoard(); return; }
    const { ranked } = standings(data.board, scopeFilter(boardScope));
    const max = Math.max(...ranked.map(r => r.avg), 0.01);
    const meName = data.student.name;
    const you = name => name === meName ? `<span class="you">${t('board.you')}</span>` : '';
    $('board').innerHTML = ranked.map(r => `<li class="${r.name === meName ? 'me' : ''}">
        <span class="rk">${MPG.medal(r.rank)}</span>
        <span class="nm">${esc(r.name)}${you(r.name)}</span>
        <span class="bar" title="${t('board.avgTitle', { a: r.avg.toFixed(3) })}"><span style="width:${Math.max(3, r.avg / max * 100)}%"></span></span>
        <span class="val"><b>${r.avg.toFixed(2)}</b><br>${t('board.weeks', { n: r.n })}${r.missed ? t('board.missed', { n: r.missed }) : ''}</span></li>`).join('')
      || `<li class="none"><span></span><span>${t('board.empty')}</span></li>`;
  }

  function renderAssetBoard() {
    const ls = lastSettled();
    if (!data.trading) { $('board').innerHTML = `<li class="none"><span></span><span>${t('board.tradingOff')}</span></li>`; return; }
    if (!ls) { $('board').innerHTML = `<li class="none"><span></span><span>${t('board.assetsSoon')}</span></li>`; return; }
    const rows = assetStandings(data.board, ls.week);
    const meName = data.student.name;
    const start = data.trading.startingCash;
    const span = Math.max(...rows.map(r => Math.abs(r.equity - start)), 1);
    $('board').innerHTML = rows.map(r => {
      const d = r.equity - start;
      return `<li class="${r.name === meName ? 'me' : ''}">
        <span class="rk">${MPG.medal(r.rank)}</span>
        <span class="nm">${esc(r.name)}${r.name === meName ? `<span class="you">${t('board.you')}</span>` : ''}</span>
        <span class="pnl-bar" title="${signedMoney(d, 2)}"><span class="${d >= 0 ? 'gain' : 'loss'}" style="width:${Math.abs(d) / span * 50}%"></span></span>
        <span class="val"><b>${money(r.equity)}</b><br><span class="${dirClass(d)}">${signed(d / start * 100)}</span></span></li>`;
    }).join('');
  }

  function renderBadges() {
    const list = computeBadges();
    $('badge-count').textContent = t('badges.count', { a: list.filter(b => b.ok).length, b: list.length });
    $('badges').innerHTML = list.map(b => `<li class="badge ${b.ok ? 'earned' : 'locked'}" title="${esc(b.desc)}">
      <div class="ic" aria-hidden="true">${b.ic}</div><div class="bn">${esc(b.name)}</div><div class="bd">${esc(b.desc)}</div></li>`).join('');
  }

  function renderRecords() {
    const mineByWeek = Object.fromEntries(data.me.map(p => [p.week, p]));
    const rows = data.weeks.filter(w => w.status !== 'upcoming' || mineByWeek[w.week]).map(w => {
      const p = mineByWeek[w.week] || {};
      const g = grade(p.error);
      const status = w.status === 'open' ? `<span class="chip">${t('status.open')}</span>` : w.status === 'pending' ? `<span class="chip">${t('status.pending')}</span>`
        : g ? `<span class="chip ${g.cls}">${g.emoji} ${g.name}</span>` : (p.spx == null ? `<span class="chip">${t('status.none')}</span>` : '');
      const cell = v => `<td class="num ${dirClass(v)}">${signed(v)}</td>`;
      return `<tr class="${w.status === 'open' ? 'open' : ''}"><td>W${w.week}</td><td>${md(w.start)} → ${md(w.end)}</td>
        ${cell(p.spx)}${cell(w.spx)}${cell(p.ixic)}${cell(w.ixic)}
        <td class="num">${p.error != null ? p.error.toFixed(2) : '—'}</td><td>${status}</td><td class="why">${esc(p.rationale || '')}</td></tr>`;
    }).reverse();
    $('records').innerHTML = rows.join('') || `<tr><td colspan="9" class="muted">${t('rec.empty')}</td></tr>`;
  }

  /** 表頭這類固定的多欄文字。 */
  function renderStaticTables() {
    const fill = (id, key, isNum) => { const el = $(id); if (el) el.innerHTML = t(key).map((h, i) => `<th${isNum(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join(''); };
    fill('pf-head', 'pf.th', i => i >= 2);
    fill('rec-head', 'rec.th', i => i >= 2 && i <= 6);
  }

  // ---------- 登入流程 ----------
  async function login(id, remember) {
    loading(true);
    try {
      data = await api({ action: 'login', id });
      studentId = id.trim().toUpperCase();
      if (remember) store.set(studentId); else store.clear();
      boardScope = null;
      show('app');
      renderAll();
    } catch (e) {
      $('login-error').textContent = e.message;
      show('login');
    } finally {
      loading(false);
    }
  }

  $('login-form').addEventListener('submit', ev => {
    ev.preventDefault();
    $('login-error').textContent = '';
    login($('sid').value, $('remember').checked);
  });
  $('logout').addEventListener('click', () => {
    store.clear(); studentId = null; data = null;
    destroyCharts(); clearInterval(countdownTimer);
    $('sid').value = '';
    show('login');
    $('sid').focus();
  });
  $('board-tabs').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    boardScope = b.dataset.scope;
    renderBoard();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (data) { renderCharts(); renderMyTarget(); }
  });
  // 切換語言：保留表單裡還沒送出的內容，再整頁重畫
  document.addEventListener('langchange', () => {
    renderStaticTables();
    $('login-error').textContent = '';
    if (!data) return;
    const keep = ['in-spx', 'in-ixic', 'in-why'].map(id => $(id) ? $(id).value : null);
    const keepTrade = trade && { ...trade };
    renderAll();
    ['in-spx', 'in-ixic', 'in-why'].forEach((id, i) => { if ($(id) && keep[i] != null) { $(id).value = keep[i]; $(id).dispatchEvent(new Event('input')); } });
    if (keepTrade && trade) { Object.assign(trade, { mode: keepTrade.mode, spx: keepTrade.spx, ixic: keepTrade.ixic }); updateTrade(); }
  });

  renderStaticTables();
  $('demo-hint').hidden = !!API_URL;
  const saved = store.get();
  if (saved) login(saved, true); else show('login');
})();
