// 學生頁與課堂看板共用的工具
window.MPG = (() => {
  const t = (k, v) => window.I18N.t(k, v);
  const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL || '').trim();

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const signed = (v, d = 2) => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%';
  const dirClass = v => v > 0 ? 'up-text' : v < 0 ? 'down-text' : '';
  const arrow = v => v > 0 ? '▲' : v < 0 ? '▼' : '';
  const md = s => { const [, m, d] = s.split('-'); return `${+m}/${+d}`; };
  const price = v => v == null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v, d = 0) => v == null ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const signedMoney = (v, d = 0) => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const sameSign = (a, b) => (a > 0 && b > 0) || (a < 0 && b < 0) || (a === 0 && b === 0);
  const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r;
  const fmtDeadline = iso => new Date(iso).toLocaleString(window.I18N.locale(), {
    timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  async function api(body) {
    if (!API_URL) {
      try { return await window.DemoAPI.handle(body); } catch (e) { throw new Error(window.I18N.err(e.message)); }
    }
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 避免 CORS 預檢
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(t('err.server', { s: res.status }));
    const out = await res.json();
    if (!out.ok) throw new Error(window.I18N.err(out.error || '發生錯誤'));
    return out;
  }

  function grade(err) {
    if (err == null) return null;
    if (err < 0.5) return { name: t('grade.bull'), cls: 'bull', emoji: '🎯' };
    if (err < 1) return { name: t('grade.inner'), cls: '', emoji: '🟢' };
    if (err < 2) return { name: t('grade.mid'), cls: '', emoji: '🔵' };
    return { name: t('grade.outer'), cls: '', emoji: '⚪' };
  }

  function dirHits(p, w) {
    if (!w || w.spx == null || p.spx == null) return 0;
    return (sameSign(p.spx, w.spx) ? 1 : 0) + (sameSign(p.ixic, w.ixic) ? 1 : 0);
  }

  /**
   * 依平均誤差排名；filter(week) 決定納入哪些週。同分並列。
   * 缺交懲罰：有人交的週次，沒交（或只填一個指數）的同學以該週全班最差誤差計。
   */
  function standings(board, filter) {
    const weeks = [...new Set(board.flatMap(b => Object.keys(b.errors).map(Number)))].filter(filter);
    const worst = Object.fromEntries(weeks.map(w => [w, Math.max(...board.map(b => b.errors[w]).filter(e => e != null))]));
    const rows = board.map(b => {
      const errs = weeks.map(w => b.errors[w] != null ? b.errors[w] : worst[w]);
      const n = weeks.filter(w => b.errors[w] != null).length;
      return { name: b.name, n, missed: weeks.length - n, avg: errs.length ? errs.reduce((a, c) => a + c, 0) / errs.length : null };
    });
    const ranked = rows.filter(r => r.avg != null).sort((a, b) => a.avg - b.avg);
    ranked.forEach(r => { r.rank = 1 + ranked.filter(o => o.avg < r.avg - 1e-9).length; });
    return { ranked, unranked: rows.filter(r => r.avg == null) };
  }

  /**
   * 靶心圖。points: [{ label, dx, dy, tip, strong }]
   * 點到中心的距離 = |dx| + |dy|（就是每週誤差），方向 = atan2(dy, dx)。
   */
  function renderTarget(el, points, opts = {}) {
    const axes = opts.axes || t('target.axes');
    const pts = points.map(p => ({ ...p, err: Math.abs(p.dx) + Math.abs(p.dy), ang: Math.atan2(p.dy, p.dx) }));
    const R = 150, rMax = Math.ceil(Math.max(opts.minRange || 2, ...pts.map(t => t.err)));
    const scale = R / rMax;
    const rings = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 15, 20].filter(v => v <= rMax);
    if (rings[rings.length - 1] !== rMax) rings.push(rMax);
    const ringFill = i => i === 0 ? css('--accent-wash') : (i % 2 ? css('--ring-1') : css('--ring-2'));
    let svg = `<svg viewBox="-235 -185 470 370" role="img" aria-label="${esc(opts.label || t('target.label'))}">`;
    for (let i = rings.length - 1; i >= 0; i--) {
      svg += `<circle r="${rings[i] * scale}" fill="${ringFill(i)}" stroke="${css('--grid')}" stroke-width="1"/>`;
    }
    svg += `<line x1="${-R}" y1="0" x2="${R}" y2="0" stroke="${css('--axis')}" stroke-width="1"/>
            <line x1="0" y1="${-R}" x2="0" y2="${R}" stroke="${css('--axis')}" stroke-width="1"/>`;
    rings.forEach(v => { svg += `<text class="t-ring-label" x="${v * scale * Math.SQRT1_2 + 2}" y="${-v * scale * Math.SQRT1_2 - 2}">${v}</text>`; });
    svg += `<text class="t-axis" x="${R + 4}" y="4">${esc(axes[0])}</text>
            <text class="t-axis" x="${-R - 4}" y="4" text-anchor="end">${esc(axes[1])}</text>
            <text class="t-axis" x="0" y="${-R - 10}" text-anchor="middle">${esc(axes[2])}</text>
            <text class="t-axis" x="0" y="${R + 20}" text-anchor="middle">${esc(axes[3])}</text>`;
    if (opts.center) svg += `<path d="M0,-9 L2.6,-2.8 9,-2.8 3.9,1.1 5.8,7.5 0,3.7 -5.8,7.5 -3.9,1.1 -9,-2.8 -2.6,-2.8Z" fill="${css('--ink')}"/>`;
    // 先畫一般的點，再畫強調的點（在上層）
    const order = pts.map((t, i) => i).sort((a, b) => (pts[a].strong ? 1 : 0) - (pts[b].strong ? 1 : 0));
    pts.forEach(t => { const r = Math.min(t.err, rMax) * scale; t.x = r * Math.cos(t.ang); t.y = -r * Math.sin(t.ang); });
    // 標籤避開彼此：強調的點先挑位置，依序嘗試點的四周
    const boxes = [];
    const textW = s => [...String(s)].reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? 6 : 10.5), 0);
    const labels = {};
    [...order].reverse().filter(i => opts.labelAll || pts[i].strong).forEach(i => {
      const t = pts[i], w = textW(t.label), h = 11;
      const spots = [[9, -7], [9, 12], [-9 - w, -7], [-9 - w, 12], [-w / 2, -12], [-w / 2, 20], [9, 26], [-9 - w, 26], [9, -21], [-9 - w, -21]];
      let pick = spots[0];
      for (const [ox, oy] of spots) {
        const b = { x: t.x + ox, y: t.y + oy - h + 2, w, h };
        if (!boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)) { pick = [ox, oy]; break; }
      }
      boxes.push({ x: t.x + pick[0], y: t.y + pick[1] - h + 2, w, h });
      labels[i] = pick;
    });
    order.forEach(i => {
      const t = pts[i], { x, y } = t;
      const lp = labels[i];
      svg += `<g class="t-pt${t.strong ? ' strong' : ''}" data-i="${i}" tabindex="0">
        <circle cx="${x}" cy="${y}" r="14" fill="transparent"/>
        <circle cx="${x}" cy="${y}" r="${t.strong ? 7 : 5.5}" fill="${css(t.strong ? '--series-2' : opts.dim ? '--series-1' : '--series-2')}" stroke="${css('--surface')}" stroke-width="2"/>
        ${lp ? `<text class="t-pt-label" x="${x + lp[0]}" y="${y + lp[1]}">${esc(t.label)}</text>` : ''}</g>`;
    });
    if (!pts.length) svg += `<text class="t-axis" x="0" y="${R * 0.55}" text-anchor="middle">${esc(opts.empty || t('target.empty'))}</text>`;
    svg += `</svg>`;
    el.innerHTML = svg;

    const tip = document.getElementById('tip');
    if (!tip) return;
    el.querySelectorAll('.t-pt').forEach(g => {
      const t = pts[+g.dataset.i];
      const show = ev => {
        tip.innerHTML = t.tip; tip.hidden = false;
        const rect = ev.currentTarget.getBoundingClientRect();
        const x = ev.clientX || rect.left + rect.width / 2, y = ev.clientY || rect.top;
        tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, x + 12) + 'px';
        tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + 'px';
      };
      g.addEventListener('mousemove', show);
      g.addEventListener('focus', show);
      g.addEventListener('mouseleave', () => { tip.hidden = true; });
      g.addEventListener('blur', () => { tip.hidden = true; });
    });
  }

  /** 前三名卡片（含理由）。 */
  function podiumHtml(top, opts = {}) {
    if (!top || !top.length) return `<p class="muted">${opts.empty || t('podium.empty')}</p>`;
    return `<ol class="podium">${top.map(p => `
      <li class="podium-item r${p.rank}${opts.me && p.name === opts.me ? ' me' : ''}">
        <div class="podium-head">
          <span class="podium-medal" aria-label="${t('podium.rank', { n: p.rank })}">${medal(p.rank)}</span>
          <span class="podium-name">${esc(p.name)}</span>
          <span class="podium-err">${t('podium.err')} <b>${p.error.toFixed(2)}</b></span>
        </div>
        <div class="podium-preds">S&amp;P <b class="${dirClass(p.spx)}">${signed(p.spx)}</b> · NASDAQ <b class="${dirClass(p.ixic)}">${signed(p.ixic)}</b></div>
        <blockquote class="podium-why">${p.rationale ? esc(p.rationale) : `<span class="muted">${t('podium.noWhy')}</span>`}</blockquote>
      </li>`).join('')}</ol>`;
  }

  /** Chart.js 的共用外觀，顏色從 CSS 變數讀。 */
  function chartOptions() {
    return {
      responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: css('--surface'), titleColor: css('--ink'), bodyColor: css('--ink-2'),
          borderColor: css('--axis'), borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
        },
      },
      scales: {
        x: { grid: { display: false }, border: { color: css('--axis') }, ticks: { color: css('--muted'), font: { size: 11 }, maxRotation: 0, autoSkip: true } },
        y: { grid: { color: css('--grid') }, border: { display: false }, ticks: { color: css('--muted'), font: { size: 11 } } },
      },
    };
  }

  /** 資產排名：依某一週結算後的總資產由高到低。 */
  function assetStandings(board, week) {
    const rows = board.filter(b => b.assets && b.assets[week] != null).map(b => ({ name: b.name, equity: b.assets[week] }));
    rows.sort((a, b) => b.equity - a.equity);
    rows.forEach(r => { r.rank = 1 + rows.filter(o => o.equity > r.equity + 1e-6).length; });
    return rows;
  }

  return { API_URL, api, esc, css, signed, dirClass, arrow, md, price, money, signedMoney, assetStandings, sameSign, medal, fmtDeadline, grade, dirHits, standings, renderTarget, podiumHtml, chartOptions };
})();
