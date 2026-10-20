(() => {
  const { API_URL, api, esc, signed, dirClass, arrow, md, price, money, signedMoney, assetStandings, sameSign, medal, fmtDeadline, standings, renderTarget, podiumHtml } = window.MPG;
  const $ = id => document.getElementById(id);
  const THEME_KEY = 'mpg.dashTheme';
  const REFRESH_MS = 5 * 60 * 1000;

  let data = null;
  let week = null;

  const pref = {
    get() { try { return localStorage.getItem(THEME_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(THEME_KEY, v); } catch {} },
  };
  const applyTheme = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  applyTheme(pref.get());

  // 可以展示的週次：已結算，或已截止等待收盤
  const viewable = () => data.weeks.filter(w => w.status === 'settled' || w.status === 'pending');
  const wk = n => data.weeks.find(w => w.week === n);

  async function load() {
    try {
      data = await api({ action: 'dashboard' });
      const list = viewable();
      if (!list.some(w => w.week === week)) {
        const settled = list.filter(w => w.status === 'settled');
        week = (settled.length ? settled[settled.length - 1] : list[list.length - 1] || {}).week || null;
      }
      $('msg').hidden = true;
      $('dash').hidden = false;
      $('updated').textContent = '更新於 ' + new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
        + (API_URL ? '' : ' · 示範模式');
      render();
    } catch (e) {
      $('msg').hidden = false;
      $('msg').textContent = '讀取失敗：' + e.message;
    }
  }

  function render() {
    renderNav();
    renderOpen();
    if (week == null) {
      $('hero').innerHTML = '<div class="hero-card"><div class="hero-value wait">賽季還沒有結算的週次</div></div>';
      ['class-target', 'podium', 'board', 'asset-board', 'invest-card'].forEach(id => { $(id).innerHTML = ''; });
      return;
    }
    renderHero();
    renderClassTarget();
    renderPodium();
    renderBoard();
    renderAssets();
  }

  function renderNav() {
    const list = viewable();
    $('week-select').innerHTML = list.map(w => `<option value="${w.week}" ${w.week === week ? 'selected' : ''}>
      第 ${w.week} 週 · ${md(w.start)} → ${md(w.end)}${w.status === 'pending' ? '（待收盤）' : ''}</option>`).join('');
    const i = list.findIndex(w => w.week === week);
    $('prev-week').disabled = i <= 0;
    $('next-week').disabled = i < 0 || i >= list.length - 1;
  }

  function step(d) {
    const list = viewable();
    const i = list.findIndex(w => w.week === week);
    const next = list[i + d];
    if (next) { week = next.week; render(); }
  }

  function renderHero() {
    const w = wk(week);
    const preds = data.weekPreds[week] || [];
    const settled = w.status === 'settled';
    const avg = k => preds.length ? preds.reduce((a, p) => a + p[k], 0) / preds.length : null;

    const idxCard = (k, name) => {
      const right = settled ? preds.filter(p => sameSign(p[k], w[k])).length : null;
      const bulls = preds.filter(p => p[k] > 0).length;
      return `<div class="hero-card">
        <div class="hero-label"><span>${name}</span><span>${md(w.start)} → ${md(w.end)} 收盤</span></div>
        ${settled
          ? `<div class="hero-value ${dirClass(w[k])}">${arrow(w[k])} ${signed(w[k])}</div>
             <div class="hero-sub">${price(w.startClose[k])} → ${price(w.endClose[k])}</div>`
          : `<div class="hero-value wait">⏳ 等待 ${md(w.end)} 收盤</div>
             <div class="hero-sub">起始收盤 ${price(w.startClose[k])}</div>`}
        <div class="hero-stats">
          <div>全班平均預測<b class="${dirClass(avg(k))}">${signed(avg(k))}</b></div>
          ${settled ? `<div>猜對方向<b>${right} / ${preds.length} 人</b></div>` : `<div>看漲 / 看跌<b>${bulls} / ${preds.length - bulls} 人</b></div>`}
        </div></div>`;
    };

    const scored = preds.filter(p => p.error != null).sort((a, b) => a.error - b.error);
    const classErr = scored.length ? scored.reduce((a, p) => a + p.error, 0) / scored.length : null;
    const consensus = settled && preds.length
      ? Math.abs(avg('spx') - w.spx) + Math.abs(avg('ixic') - w.ixic) : null;
    const total = data.board.length;
    $('hero').innerHTML = idxCard('spx', 'S&amp;P 500') + idxCard('ixic', 'NASDAQ') + `
      <div class="hero-card">
        <div class="hero-label"><span>全班表現</span><span>第 ${w.week} 週 · R${w.round}</span></div>
        <div class="hero-value">${preds.length}<span class="small muted"> / ${total} 人參與</span></div>
        <div class="hero-sub">${settled ? '' : '預測已截止，週五收盤後結算'}</div>
        <div class="hero-stats">
          ${settled ? `<div>全班平均誤差<b>${classErr == null ? '—' : classErr.toFixed(2)}</b></div>
          <div>最佳誤差<b>${scored.length ? scored[0].error.toFixed(2) : '—'}</b></div>
          <div title="把全班平均預測當成一個人來算的誤差">「全班平均」的誤差<b>${consensus == null ? '—' : consensus.toFixed(2)}</b></div>` : ''}
        </div></div>`;
  }

  function renderClassTarget() {
    const w = wk(week);
    const preds = data.weekPreds[week] || [];
    const top = new Set((data.highlights[week] || []).map(t => t.name));
    const labelAll = $('show-names').checked;
    if (w.status === 'settled') {
      $('target-title').textContent = '全班靶心';
      $('target-note').innerHTML = '每位同學一個點，<strong>離中心越近越準</strong>（距離 = 誤差）。橘色是本週前三名。';
      const points = preds.map(p => ({
        label: (top.has(p.name) ? medal((data.highlights[week].find(t => t.name === p.name) || {}).rank) + ' ' : '') + p.name,
        dx: p.spx - w.spx, dy: p.ixic - w.ixic, strong: top.has(p.name),
        tip: `<b>${esc(p.name)} · 誤差 ${p.error.toFixed(2)}</b><br>S&amp;P：猜 ${signed(p.spx)}，實際 ${signed(w.spx)}<br>NASDAQ：猜 ${signed(p.ixic)}，實際 ${signed(w.ixic)}`,
      }));
      renderTarget($('class-target'), points, { labelAll, dim: true, label: '全班靶心圖', empty: '這週沒有人提交' });
    } else {
      $('target-title').textContent = '全班預測分布';
      $('target-note').innerHTML = '每位同學一個點。中心 = 預測持平；越往右越看好 S&amp;P 500，越往上越看好 NASDAQ。';
      const points = preds.map(p => ({
        label: p.name, dx: p.spx, dy: p.ixic, strong: false,
        tip: `<b>${esc(p.name)}</b><br>S&amp;P：${signed(p.spx)}<br>NASDAQ：${signed(p.ixic)}`,
      }));
      renderTarget($('class-target'), points, {
        labelAll, dim: true, minRange: 1, label: '全班預測分布',
        axes: ['S&P 看漲 ▶', '◀ 看跌', '▲ NASDAQ 看漲', '▼ NASDAQ 看跌'], empty: '這週沒有人提交',
      });
    }
  }

  function renderPodium() {
    const w = wk(week);
    $('podium-title').textContent = `第 ${w.week} 週預測最準前三名`;
    $('podium').innerHTML = w.status === 'settled'
      ? podiumHtml(data.highlights[week], { empty: '這週沒有完整提交的預測' })
      : '<p class="muted">週五收盤後就會公布前三名和他們的理由。</p>';
  }

  function renderBoard() {
    const w = wk(week);
    const inRound = n => wk(n) && wk(n).round === w.round;
    const now = standings(data.board, n => inRound(n) && n <= week);
    const prevWeeks = data.weeks.filter(x => x.round === w.round && x.week < week && x.status === 'settled');
    const before = prevWeeks.length ? standings(data.board, n => inRound(n) && n < week) : null;
    const prevRank = name => { const r = before && before.ranked.find(x => x.name === name); return r ? r.rank : null; };
    $('board-title').textContent = `R${w.round} 排行榜（累積到第 ${w.week} 週）`;
    const move = r => {
      if (!before) return '';
      const p = prevRank(r.name);
      if (p == null) return '<span class="mv">NEW</span>';
      const d = p - r.rank;
      return d > 0 ? `<span class="mv" title="上升 ${d} 名">▲${d}</span>` : d < 0 ? `<span class="mv" title="下降 ${-d} 名">▼${-d}</span>` : '<span class="mv same">–</span>';
    };
    const rows = now.ranked.length + now.unranked.length;
    $('board').style.setProperty('--rows', Math.ceil(rows / 2));
    $('board').innerHTML = now.ranked.map(r => `<li>
        <span class="rk">${medal(r.rank)}</span><span class="nm">${esc(r.name)}</span>
        <span class="val"><b>${r.avg.toFixed(2)}</b><small>${r.n} 週${r.missed ? ` · 缺 ${r.missed}` : ''}</small></span>${move(r) || '<span></span>'}</li>`).join('')
      + now.unranked.map(r => `<li class="none"><span class="rk">–</span><span class="nm">${esc(r.name)}</span><span class="val">尚無成績</span><span></span></li>`).join('');
  }

  /** 資產排行榜與本週投資表現（以選擇的週次，或它之前最近一個已結算週為準）。 */
  function renderAssets() {
    const t = data.trading;
    const board = $('asset-board'), card = $('invest-card');
    if (!t || !data.board.some(b => b.assets && Object.keys(b.assets).length)) {
      board.innerHTML = '<li class="none"><span></span><span class="nm">結算後就會有資產排名</span></li>';
      card.innerHTML = '';
      return;
    }
    const settled = data.weeks.filter(x => x.status === 'settled' && x.week <= week);
    const at = settled.length ? settled[settled.length - 1].week : null;
    if (at == null) { board.innerHTML = ''; card.innerHTML = ''; return; }
    const prev = settled.length > 1 ? settled[settled.length - 2].week : null;
    const now = assetStandings(data.board, at);
    const before = prev ? assetStandings(data.board, prev) : null;
    const startOf = name => { const b = data.board.find(x => x.name === name); return prev ? b.assets[prev] : t.startingCash; };
    $('asset-title').textContent = `💰 模擬投資資產（第 ${at} 週結算後）`;
    board.style.setProperty('--rows', Math.ceil(now.length / 2));
    board.innerHTML = now.map(r => {
      const p = before && before.find(x => x.name === r.name);
      const d = p ? p.rank - r.rank : 0;
      const mv = !before ? '<span></span>' : d > 0 ? `<span class="mv">▲${d}</span>` : d < 0 ? `<span class="mv">▼${-d}</span>` : '<span class="mv same">–</span>';
      const total = (r.equity / t.startingCash - 1) * 100;
      return `<li><span class="rk">${medal(r.rank)}</span><span class="nm">${esc(r.name)}</span>
        <span class="val"><b>${money(r.equity)}</b><small class="${dirClass(total)}">${signed(total, 1)}</small></span>${mv}</li>`;
    }).join('');

    // 本週報酬：這週誰賺最多
    const weekly = now.map(r => ({ name: r.name, pnl: r.equity - startOf(r.name), ret: (r.equity / startOf(r.name) - 1) * 100 }))
      .sort((a, b) => b.ret - a.ret);
    const winners = weekly.filter(x => x.pnl > 0.005).length, losers = weekly.filter(x => x.pnl < -0.005).length;
    const avgEq = now.reduce((a, r) => a + r.equity, 0) / now.length;
    card.innerHTML = `
      <div class="card-head"><h2>第 ${at} 週投資表現</h2></div>
      <div class="hero-stats invest-stats">
        <div>賺錢 / 賠錢<b><span class="up-text">${winners}</span> / <span class="down-text">${losers}</span> 人</b></div>
        <div>全班平均資產<b>${money(avgEq)}</b></div>
      </div>
      <ol class="invest-top">${weekly.slice(0, 3).map((x, i) => `<li><span>${medal(i + 1)}</span><span class="nm">${esc(x.name)}</span>
        <b class="${dirClass(x.ret)}">${signed(x.ret)}</b><span class="muted">${signedMoney(x.pnl)}</span></li>`).join('')}</ol>
      <p class="muted small">沒有自己設定部位的同學，依預測方向每個指數配置 ${t.autoWeight}%；沒交預測的週次持有現金。</p>`;
  }

  function renderOpen() {
    const s = data.openStats;
    const el = $('open-card');
    const url = new URL('index.html', location.href).href;
    if (!s || s.week == null) {
      el.innerHTML = `<div class="card-head"><h2>預測狀態</h2></div><p class="muted">目前沒有開放提交的週次。</p>`;
      return;
    }
    const w = wk(s.week);
    const pct = s.total ? Math.round(s.submitted / s.total * 100) : 0;
    el.innerHTML = `
      <div class="card-head"><h2>第 ${w.week} 週預測進行中</h2><span class="countdown">截止 ${fmtDeadline(w.deadline)}</span></div>
      <div class="open-body">
        <div class="open-info">
          <div class="muted">${md(w.start)} 收盤 → ${md(w.end)} 收盤</div>
          <div class="open-count">${s.submitted}<small> / ${s.total} 人已提交</small></div>
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
          <div class="open-url">掃描 QR code 或前往<br>${esc(url)}</div>
        </div>
        <div class="qr" id="qr" aria-label="學生頁面 QR code"></div>
      </div>`;
    if (window.QRCode) new QRCode($('qr'), { text: url, width: 220, height: 220, colorDark: '#0b0b0b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }

  // ---------- 操作 ----------
  $('week-select').addEventListener('change', e => { week = +e.target.value; render(); });
  $('prev-week').addEventListener('click', () => step(-1));
  $('next-week').addEventListener('click', () => step(1));
  $('refresh').addEventListener('click', load);
  $('show-names').addEventListener('change', () => data && week != null && renderClassTarget());
  $('theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    applyTheme(next); pref.set(next);
    if (data) render();
  });
  $('fullscreen').addEventListener('click', toggleFullscreen);
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }
  document.addEventListener('keydown', e => {
    if (e.target.closest('select, input, textarea')) return;
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (data && !document.documentElement.dataset.theme) render(); });

  load();
  setInterval(load, REFRESH_MS);
})();
