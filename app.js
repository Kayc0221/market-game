(() => {
  const { API_URL, api, esc, css, signed, dirClass, arrow, md, price, money, signedMoney, assetStandings,
    grade, dirHits, standings, renderTarget, podiumHtml, chartOptions } = window.MPG;
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
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
  }
  const loading = on => { $('loading').hidden = !on; };

  // ---------- 計分 ----------
  const weekMap = () => Object.fromEntries(data.weeks.map(w => [w.week, w]));
  const lastSettled = () => [...data.weeks].reverse().find(w => w.status === 'settled');
  const scopeFilter = scope => scope === 'all' ? () => true
    : scope === '1' ? wk => wk <= data.roundSplit : wk => wk > data.roundSplit;
  const pfRows = () => (data.portfolio && data.portfolio.rows) || [];

  const LEVELS = [
    [0, '實習生', '🐣'], [60, '初級交易員', '📈'], [150, '分析師', '🧐'],
    [260, '資深分析師', '📊'], [400, '基金經理', '💼'], [600, '市場預言家', '🔮'],
  ];

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
    const champ = tops.some(top => top.some(t => t.rank === 1 && t.name === data.student.name));
    const podium = tops.some(top => top.some(t => t.name === data.student.name));
    const bear = sub.some(p => { const w = wm[p.week]; return w && w.spx != null && ((w.spx <= -1 && p.spx < 0) || (w.ixic <= -1 && p.ixic < 0)); });
    const r1Weeks = data.weeks.filter(w => w.round === 1 && w.week !== 1).map(w => w.week);
    const writer = sub.filter(p => (p.rationale || '').length >= 10).length;

    return [
      { ic: '🚀', name: '初次出手', desc: '第一次送出預測', ok: sub.length >= 1 },
      { ic: '🎯', name: '正中靶心', desc: '單週誤差小於 0.5', ok: scored.some(p => p.error < 0.5) },
      { ic: '🧭', name: '方向達人', desc: '單週兩個指數漲跌方向都猜對', ok: scored.some(p => dirHits(p, wm[p.week]) === 2) },
      { ic: '🔥', name: '三連擊', desc: '連續 3 週都有提交', ok: best >= 3 },
      { ic: '🥉', name: '登上頒獎台', desc: '某一週進入全班前三名', ok: podium },
      { ic: '🏆', name: '單週冠軍', desc: '某一週全班誤差最低', ok: champ },
      { ic: '🐻', name: '熊市獵人', desc: '指數大跌超過 1% 時你也猜跌', ok: bear },
      { ic: '💎', name: '穩定輸出', desc: '連續 3 週誤差都小於 1.5', ok: steady >= 3 },
      { ic: '✍️', name: '分析師筆記', desc: '寫下 3 次以上的預測理由', ok: writer >= 3 },
      { ic: '💰', name: '第一桶金', desc: '模擬投資某一週賺錢', ok: pfRows().some(r => r.pnl > 0) },
      { ic: '🩳', name: '放空獲利', desc: '有放空部位的那一週賺錢', ok: pfRows().some(r => r.pnl > 0 && (r.wSpx < 0 || r.wIxic < 0)) },
      { ic: '📅', name: 'R1 全勤', desc: '第 2–8 週每週都提交', ok: r1Weeks.length > 0 && r1Weeks.every(w => subWeeks.has(w)) },
    ];
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
    $('who-sub').textContent = [s.dept, API_URL ? '' : '示範模式'].filter(Boolean).join(' · ');
    $('level-name').textContent = `Lv.${lv.index + 1} ${lv.level[1]}`;
    $('level-xp').textContent = lv.next ? `${lv.xp} / ${lv.next[0]} XP` : `${lv.xp} XP · 最高等級`;
    requestAnimationFrame(() => { $('xpfill').style.width = Math.round(lv.pct * 100) + '%'; });
    $('xpbar').setAttribute('aria-valuenow', lv.xp);
  }

  function renderMission() {
    const el = $('mission');
    clearInterval(countdownTimer);
    trade = null;
    const ls = lastSettled();
    const mineLast = ls && data.me.find(p => p.week === ls.week);
    const lastHtml = ls ? `<div class="last-result">上一個結算週 W${ls.week}：S&amp;P 500
      <b class="${dirClass(ls.spx)}">${arrow(ls.spx)} ${signed(ls.spx)}</b>、NASDAQ
      <b class="${dirClass(ls.ixic)}">${arrow(ls.ixic)} ${signed(ls.ixic)}</b>${
        mineLast && mineLast.error != null ? `，你的誤差 <b>${mineLast.error.toFixed(2)}</b> ${grade(mineLast.error).emoji}` : ''}</div>` : '';

    const w = data.openWeek && weekMap()[data.openWeek];
    if (!w) {
      el.innerHTML = `<div class="empty-state"><div class="big">🏁</div><h2>目前沒有開放的週次</h2>
        <p>賽季已結束，或下一週還沒開放。看看下面的排行榜吧！</p></div>${lastHtml}`;
      return;
    }
    const mine = data.me.find(p => p.week === w.week) || {};
    const has = mine.spx != null && mine.ixic != null;
    const base = w.startClose && w.startClose.spx != null
      ? `<div class="base-close">起始收盤：S&amp;P 500 <b>${price(w.startClose.spx)}</b> · NASDAQ <b>${price(w.startClose.ixic)}</b></div>` : '';
    el.innerHTML = `
      <div class="card-head"><h2>第 ${w.week} 週任務 · R${w.round}</h2><span class="countdown" id="countdown"></span></div>
      <div class="period">預測 ${md(w.start)}（五）收盤 → ${md(w.end)} 收盤的漲跌幅</div>${base}
      <form id="pred-form">
        <div class="pred-grid">
          ${['spx', 'ixic'].map(k => `
            <div class="pred">
              <div class="pred-label"><span>${k === 'spx' ? 'S&amp;P 500' : 'NASDAQ'}</span><span class="pred-dir" id="dir-${k}"></span></div>
              <div class="stepper">
                <button type="button" data-k="${k}" data-d="-0.1" aria-label="減少 0.1">−</button>
                <input id="in-${k}" type="number" step="0.01" min="-${data.maxAbsPred}" max="${data.maxAbsPred}" inputmode="decimal" placeholder="0.00" value="${mine[k] != null ? mine[k] : ''}" required aria-label="${k === 'spx' ? 'S&P 500' : 'NASDAQ'} 預測漲跌 (%)">
                <span class="pct">%</span>
                <button type="button" data-k="${k}" data-d="0.1" aria-label="增加 0.1">+</button>
              </div>
            </div>`).join('')}
        </div>
        <label for="in-why" class="small muted">預測理由（選填，寫 3 次可解鎖徽章；如果進入前三名，理由會在課堂上展示）</label>
        <textarea id="in-why" maxlength="500" placeholder="例如：CPI 數據高於預期，科技股承壓…">${esc(mine.rationale || '')}</textarea>
        ${tradeHtml(w, mine)}
        <div class="row-end">
          <button class="btn primary" type="submit" id="pred-btn">${has ? '更新預測' : '送出預測'}</button>
          <span class="saved-note">${has ? `已提交：S&amp;P ${signed(mine.spx)}、NASDAQ ${signed(mine.ixic)} · 截止前可以修改` : '截止前可以重複修改，以最後一次為準'}</span>
        </div>
        <p class="error" id="pred-error" role="alert"></p>
      </form>${lastHtml}`;

    const deadline = new Date(w.deadline);
    const tick = () => {
      const ms = deadline - Date.now();
      const cd = $('countdown');
      if (!cd) return;
      if (ms <= 0) { cd.textContent = '已截止'; clearInterval(countdownTimer); return; }
      const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
      cd.textContent = `⏳ 剩 ${d ? d + ' 天 ' : ''}${h} 小時 ${m} 分`;
      cd.classList.toggle('urgent', ms < 6 * 3600000);
      cd.title = '截止：' + MPG.fmtDeadline(w.deadline);
    };
    tick();
    countdownTimer = setInterval(tick, 30000);

    const updateDir = k => {
      const v = parseFloat($('in-' + k).value);
      const d = $('dir-' + k);
      d.className = 'pred-dir ' + (v > 0 ? 'up' : v < 0 ? 'down' : '');
      d.textContent = !isFinite(v) ? '' : v > 0 ? '▲ 看漲' : v < 0 ? '▼ 看跌' : '持平';
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
      toast(`✅ 第 ${out.saved.week} 週預測已送出${gained > 0 ? `　+${gained} XP` : ''}`);
    } catch (e) {
      errEl.textContent = e.message;
      btn.disabled = false;
    }
  }

  // ---------- 模擬投資：本週配置 ----------
  function tradeHtml(w, mine) {
    if (!data.trading) return '';
    const t = data.trading;
    const row = pfRows().find(r => r.week === w.week);
    const equity = row ? row.start : data.portfolio.equity;
    if (w.week < t.startWeek) {
      return `<div class="trade trade-soon">💰 模擬投資：這週會依你的預測方向自動配置（每個指數 ${t.autoWeight}%），
        第 ${t.startWeek} 週起可以自己調整。目前資產 <b>${money(equity, 2)}</b></div>`;
    }
    const manual = mine.wSpx != null && mine.wIxic != null;
    trade = { equity, mode: manual ? 'manual' : 'auto', spx: manual ? mine.wSpx : 0, ixic: manual ? mine.wIxic : 0, max: t.maxExposure, auto: t.autoWeight };
    const slider = (k, label) => `
      <div class="alloc">
        <div class="alloc-label"><span>${label}</span><span class="alloc-val" id="alloc-val-${k}"></span></div>
        <input type="range" id="alloc-${k}" min="-100" max="100" step="5" value="${trade[k]}" aria-label="${label} 配置 (%)">
        <div class="alloc-scale"><span>放空 −100%</span><span>0</span><span>做多 +100%</span></div>
      </div>`;
    return `<div class="trade" id="trade">
      <div class="trade-head"><h3>💰 模擬投資 · 這週怎麼配置？</h3>
        <span class="small muted">本週起始資產 <b>${money(equity, 2)}</b></span></div>
      <div class="trade-mode" id="trade-mode"></div>
      ${slider('spx', 'S&amp;P 500')}${slider('ixic', 'NASDAQ')}
      <div class="alloc-summary" id="alloc-summary"></div>
      <div class="trade-actions">
        <button type="button" class="btn small" id="alloc-auto">依我的預測自動配置</button>
        <button type="button" class="btn small" id="alloc-cash">全部換成現金</button>
      </div>
      <div class="what-if" id="what-if"></div>
      <p class="small muted trade-note">以 ${md(w.start)} 收盤價建倉、${md(w.end)} 收盤價結算。沒有自己調整的話，會依你的預測方向各配置 ${trade.auto}%；
        沒交預測的週次全部持有現金。兩個部位加總最多 ${trade.max}%。</p>
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
    $('trade-mode').innerHTML = trade.mode === 'auto'
      ? `<span class="chip">🤖 自動</span> 依你的預測方向，每個指數 ${trade.auto}%`
      : `<span class="chip bull">✋ 自訂</span> 你自己設定的配置`;
    const amt = k => trade.equity * trade[k] / 100;
    ['spx', 'ixic'].forEach(k => {
      const v = trade[k];
      $('alloc-val-' + k).innerHTML = v === 0 ? '不持有'
        : `<b class="${v > 0 ? 'up-text' : 'down-text'}">${v > 0 ? '做多' : '放空'} ${Math.abs(v)}%</b> · ${money(Math.abs(amt(k)))}`;
    });
    const gross = Math.abs(trade.spx) + Math.abs(trade.ixic);
    $('alloc-summary').innerHTML = `總曝險 <b>${gross}%</b> / ${trade.max}% · 沒用到的現金 <b>${money(trade.equity * (100 - gross) / 100)}</b>（${100 - gross}%）`;
    const ps = parseFloat($('in-spx').value), pi = parseFloat($('in-ixic').value);
    if (isFinite(ps) && isFinite(pi)) {
      const pnl = trade.equity * (trade.spx * ps + trade.ixic * pi) / 10000;
      $('what-if').innerHTML = gross === 0
        ? '全部持有現金：不管漲跌，這週資產都不變。'
        : `如果實際漲跌和你的預測一樣，這週會 <b class="${pnl > 0 ? 'up-text' : pnl < 0 ? 'down-text' : ''}">${pnl >= 0 ? '賺' : '賠'} ${money(Math.abs(pnl), 2)}</b>（${signed(pnl / trade.equity * 100)}）`
          + (pnl < 0 ? '<br><span class="small muted">⚠️ 你的部位方向和預測相反</span>' : '');
    } else {
      $('what-if').textContent = '填好預測後，這裡會算出「如果你猜對，這週會賺多少」。';
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
      tile(`R${round} 誤差名次`, me ? `${me.rank}<span class="small muted"> / ${st.ranked.length}</span>` : '—',
        me ? `平均誤差 ${me.avg.toFixed(2)}${me.missed ? `（含缺交 ${me.missed} 週）` : ''}` : '還沒有已結算的預測'),
      tile('模擬資產', pf ? money(pf.equity) : '—', pf ? `<span class="${dirClass(pf.totalReturn)}">${signed(pf.totalReturn)}</span>${ar ? ` · 第 ${ar.rank} 名` : ''}` : ''),
      tile('方向命中率', scored.length ? Math.round(hits / (scored.length * 2) * 100) + '%' : '—', scored.length ? `${hits} / ${scored.length * 2} 次猜對漲跌` : ''),
      tile('參與週數', `${data.me.filter(p => p.spx != null && p.ixic != null).length}`, `已結算 ${settledCount} 週${me && me.missed ? ` · 缺交 ${me.missed} 週` : ''}`),
    ].join('');
  }

  function renderPodium() {
    const ls = lastSettled();
    $('podium-title').textContent = ls ? `第 ${ls.week} 週預測最準前三名` : '每週前三名';
    $('podium').innerHTML = podiumHtml(ls && data.highlights && data.highlights[ls.week], { me: data.student.name });
  }

  // ---------- 模擬投資：資產卡 ----------
  function renderPortfolio() {
    const card = $('portfolio-card');
    if (!data.trading || !data.portfolio) { card.hidden = true; return; }
    card.hidden = false;
    const t = data.trading, pf = data.portfolio;
    $('pf-equity').textContent = money(pf.equity, 2);
    const gain = pf.equity - t.startingCash;
    $('pf-ret').innerHTML = `<span class="${dirClass(gain)}">${signedMoney(gain, 2)}（${signed(pf.totalReturn)}）</span> · 起始資金 ${money(t.startingCash)}`;

    const ls = lastSettled();
    const ranks = ls ? assetStandings(data.board, ls.week) : [];
    const me = ranks.find(r => r.name === data.student.name);
    const first = data.weeks[0];
    const bh = k => first && ls && first.startClose[k] ? t.startingCash * ls.endClose[k] / first.startClose[k] : null;
    $('pf-stats').innerHTML = `
      <div><span>資產排名</span><b>${me ? `${me.rank} / ${ranks.length}` : '—'}</b></div>
      <div><span>如果一開始全買 S&amp;P 500</span><b>${money(bh('spx'), 2)}</b></div>
      <div><span>如果一開始全買 NASDAQ</span><b>${money(bh('ixic'), 2)}</b></div>`;

    const src = r => r.source === 'manual' ? '<span class="chip bull">自訂</span>' : r.source === 'auto' ? '<span class="chip">自動</span>' : '<span class="chip">未提交·現金</span>';
    $('pf-rows').innerHTML = [...pfRows()].reverse().map(r => {
      const st = r.status === 'settled' ? '' : `<span class="chip">${r.status === 'open' ? '進行中' : '等待結算'}</span>`;
      const pos = v => v === 0 ? '—' : `<span class="${dirClass(v)}">${v > 0 ? '多' : '空'} ${Math.abs(v)}%</span>`;
      return `<tr class="${r.status === 'open' ? 'open' : ''}"><td>W${r.week}</td><td>${src(r)}</td>
        <td class="num">${pos(r.wSpx)}</td><td class="num">${pos(r.wIxic)}</td><td class="num">${money(r.start, 2)}</td>
        <td class="num ${dirClass(r.pnl)}">${r.pnl == null ? st : signedMoney(r.pnl, 2)}</td>
        <td class="num ${dirClass(r.ret)}">${r.ret == null ? '' : signed(r.ret)}</td><td class="num">${money(r.end, 2)}</td></tr>`;
    }).join('') || '<tr><td colspan="8" class="muted">還沒有紀錄</td></tr>';
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
        title: items => { const w = data.weeks[items[0].dataIndex]; return `W${w.week}（${md(w.start)} → ${md(w.end)} 收盤）`; },
        label: item => ` ${item.dataset.label}：${item.raw == null ? '尚未公布' : signed(item.raw)}`,
      };
      opts.plugins.tooltip.filter = item => item.raw != null || item.datasetIndex === 0;
      charts[k] = new Chart($('chart-' + k), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '實際', data: actual, borderColor: s1, backgroundColor: s1, borderWidth: 2, tension: 0.25,
              pointRadius: 3, pointHoverRadius: 5, pointBorderColor: surface, pointBorderWidth: 2, spanGaps: false },
            { label: '我的預測', data: mine, showLine: false, backgroundColor: s2, borderColor: surface, borderWidth: 2,
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
    ro.scales.y.ticks.callback = v => (Number.isInteger(v) && (v === 1 || v % 3 === 0 || v === n)) ? '第 ' + v + ' 名' : '';
    ro.plugins.tooltip.callbacks = {
      title: items => 'W' + settled[items[0].dataIndex].week + ' 結算後',
      label: item => item.raw == null ? ' 尚未排名' : ` 第 ${item.raw} 名`,
    };
    charts.rank = new Chart($('chart-rank'), {
      type: 'line',
      data: {
        labels: settled.map(w => 'W' + w.week),
        datasets: [{ label: '名次', data: ranks, borderColor: s1, backgroundColor: s1, borderWidth: 2, tension: 0.2,
          pointRadius: 4, pointHoverRadius: 6, pointBorderColor: surface, pointBorderWidth: 2, spanGaps: true }],
      },
      options: ro,
    });

    // 資產走勢：我的資產 vs 一開始全買某個指數
    if (data.trading && data.portfolio && $('chart-assets')) {
      const t = data.trading, first = data.weeks[0];
      const mineEq = Object.fromEntries(pfRows().filter(r => r.end != null).map(r => [r.week, r.end]));
      const bh = k => [t.startingCash].concat(data.weeks.map(w => w.status === 'settled' && first.startClose[k] ? t.startingCash * w.endClose[k] / first.startClose[k] : null));
      const ao = chartOptions();
      ao.scales.y.ticks.callback = v => money(v);
      ao.plugins.tooltip.callbacks = { label: item => ` ${item.dataset.label}：${item.raw == null ? '—' : money(item.raw, 2)}` };
      ao.plugins.tooltip.filter = item => item.raw != null;
      const line = (label, values, color, bold) => ({ label, data: values, borderColor: color, backgroundColor: color,
        borderWidth: bold ? 3 : 2, tension: 0.2, pointRadius: bold ? 4 : 0, pointHoverRadius: 6,
        pointBorderColor: surface, pointBorderWidth: 2, spanGaps: false });
      charts.assets = new Chart($('chart-assets'), {
        type: 'line',
        data: { labels: ['起始'].concat(labels), datasets: [
          line('我的資產', [t.startingCash].concat(data.weeks.map(w => mineEq[w.week] ?? null)), s2, true),
          line('全買 S&P 500', bh('spx'), s1),
          line('全買 NASDAQ', bh('ixic'), s3),
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
        tip: `<b>W${p.week} · 誤差 ${p.error.toFixed(2)} ${grade(p.error).emoji}</b><br>
          S&amp;P：猜 ${signed(p.spx)}，實際 ${signed(w.spx)}<br>NASDAQ：猜 ${signed(p.ixic)}，實際 ${signed(w.ixic)}`,
      };
    });
    renderTarget($('target'), points, { label: '靶心圖：每週預測誤差與偏差方向', empty: '結算後，你的預測會出現在這裡' });
  }

  // ---------- 排行榜 ----------
  function renderBoard() {
    if (!boardScope) boardScope = currentRound();
    $('board-tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.scope === boardScope));
    $('board-note').textContent = boardScope === 'assets'
      ? '模擬投資的總資產（不計入排名）。過去的週次依預測方向自動配置估算，沒交預測的週次持有現金。'
      : '名次依平均誤差（|S&P 預測 − 實際| + |NASDAQ 預測 − 實際|）由小到大排列。缺交的週次以該週全班最差誤差計。';
    if (boardScope === 'assets') { renderAssetBoard(); return; }
    const { ranked, unranked } = standings(data.board, scopeFilter(boardScope));
    const max = Math.max(...ranked.map(r => r.avg), 0.01);
    const meName = data.student.name;
    const you = name => name === meName ? '<span class="you">你</span>' : '';
    let html = ranked.map(r => `<li class="${r.name === meName ? 'me' : ''}">
        <span class="rk">${MPG.medal(r.rank)}</span>
        <span class="nm">${esc(r.name)}${you(r.name)}</span>
        <span class="bar" title="平均誤差 ${r.avg.toFixed(3)}"><span style="width:${Math.max(3, r.avg / max * 100)}%"></span></span>
        <span class="val"><b>${r.avg.toFixed(2)}</b><br>${r.n} 週${r.missed ? ` · 缺 ${r.missed}` : ''}</span></li>`).join('');
    if (!ranked.length) html = '<li class="none"><span></span><span>這個階段還沒有成績</span></li>';
    $('board').innerHTML = html;
  }

  function renderAssetBoard() {
    const ls = lastSettled();
    if (!data.trading) { $('board').innerHTML = '<li class="none"><span></span><span>模擬投資功能尚未啟用</span></li>'; return; }
    if (!ls) { $('board').innerHTML = '<li class="none"><span></span><span>第一週結算後就會有資產排名</span></li>'; return; }
    const rows = assetStandings(data.board, ls.week);
    const meName = data.student.name;
    const start = data.trading.startingCash;
    const span = Math.max(...rows.map(r => Math.abs(r.equity - start)), 1);
    $('board').innerHTML = rows.map(r => {
      const d = r.equity - start;
      return `<li class="${r.name === meName ? 'me' : ''}">
        <span class="rk">${MPG.medal(r.rank)}</span>
        <span class="nm">${esc(r.name)}${r.name === meName ? '<span class="you">你</span>' : ''}</span>
        <span class="pnl-bar" title="${signedMoney(d, 2)}"><span class="${d >= 0 ? 'gain' : 'loss'}" style="width:${Math.abs(d) / span * 50}%"></span></span>
        <span class="val"><b>${money(r.equity)}</b><br><span class="${dirClass(d)}">${signed(d / start * 100)}</span></span></li>`;
    }).join('');
  }

  function renderBadges() {
    const list = computeBadges();
    $('badge-count').textContent = `已解鎖 ${list.filter(b => b.ok).length} / ${list.length}`;
    $('badges').innerHTML = list.map(b => `<li class="badge ${b.ok ? 'earned' : 'locked'}" title="${esc(b.desc)}">
      <div class="ic" aria-hidden="true">${b.ic}</div><div class="bn">${b.name}</div><div class="bd">${b.desc}</div></li>`).join('');
  }

  function renderRecords() {
    const mineByWeek = Object.fromEntries(data.me.map(p => [p.week, p]));
    const rows = data.weeks.filter(w => w.status !== 'upcoming' || mineByWeek[w.week]).map(w => {
      const p = mineByWeek[w.week] || {};
      const g = grade(p.error);
      const status = w.status === 'open' ? '<span class="chip">進行中</span>' : w.status === 'pending' ? '<span class="chip">等待結算</span>'
        : g ? `<span class="chip ${g.cls}">${g.emoji} ${g.name}</span>` : (p.spx == null ? '<span class="chip">未提交</span>' : '');
      const cell = v => `<td class="num ${dirClass(v)}">${signed(v)}</td>`;
      return `<tr class="${w.status === 'open' ? 'open' : ''}"><td>W${w.week}</td><td>${md(w.start)} → ${md(w.end)}</td>
        ${cell(p.spx)}${cell(w.spx)}${cell(p.ixic)}${cell(w.ixic)}
        <td class="num">${p.error != null ? p.error.toFixed(2) : '—'}</td><td>${status}</td><td class="why">${esc(p.rationale || '')}</td></tr>`;
    }).reverse();
    $('records').innerHTML = rows.join('') || '<tr><td colspan="9" class="muted">還沒有紀錄</td></tr>';
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

  $('demo-hint').hidden = !!API_URL;
  const saved = store.get();
  if (saved) login(saved, true); else show('login');
})();
