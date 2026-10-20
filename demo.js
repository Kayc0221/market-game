// 示範模式：config.js 的 API_URL 留空時使用。
// 學生姓名與學號都是虛構的；市場資料是 2026 秋季實際的週五收盤價。
// 回傳格式與 apps-script/Code.gs 相同。
window.DemoAPI = (() => {
  const DATES = ['2026-09-04', '2026-09-11', '2026-09-18', '2026-09-25', '2026-10-02', '2026-10-09', '2026-10-16',
    '2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11',
    '2026-12-18', '2026-12-24'];
  const CLOSES = [[7718.60, 26506.99], [7656.98, 26333.04], [7650.50, 26522.54], [7743.41, 27068.72],
    [7722.72, 27190.86], [7811.54, 27366.17], [7659.44, 26140.03]];
  const ROSTER = [
    ['DEMO01', '王小明', '資財二'], ['DEMO02', '李小華', '資財二'], ['DEMO03', '陳大文', '英文二'],
    ['DEMO04', '林美玲', '英文二'], ['DEMO05', '張志強', '能源四'], ['DEMO06', '黃雅婷', '資財二'],
    ['DEMO07', '吳建宏', '資財二'], ['DEMO08', '周怡君', '互動外生四'], ['DEMO09', '許家豪', '資財二'],
    ['DEMO10', 'Alex Kim', '交換學生'],
  ];
  const RATIONALES = ['科技股動能延續，AI 需求仍強，預期兩大指數小漲。', '油價走高推升通膨疑慮，壓抑市場表現。',
    'Fed 可能再升息，殖利率走高，科技股承壓較重。', 'CPI 公布前市場觀望，預期小幅震盪。',
    '大型科技股財報亮眼，NASDAQ 表現應優於 S&P 500。', ''];

  // 固定亂數，讓每次重新整理看到的示範資料一樣
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const r2 = v => Math.round(v * 20) / 20;
  const TRADING = { startingCash: 10000, startWeek: 7, maxExposure: 100, autoWeight: 50 };
  const deadlineFor = end => new Date(new Date(end + 'T00:00:00+08:00').getTime() - 86400000 + 20 * 3600000);

  const market = DATES.map((date, i) => ({ date, spx: CLOSES[i] ? CLOSES[i][0] : null, ixic: CLOSES[i] ? CLOSES[i][1] : null }));
  const preds = []; // {week, name, spx, ixic, rationale}
  ROSTER.forEach(([, name], si) => {
    for (let wk = 2; wk <= 6; wk++) {
      if (rand() < 0.2 && si !== 0) continue; // 有些週沒交
      const prev = market[wk - 1], cur = market[wk];
      const a = k => (cur[k] - prev[k]) / prev[k] * 100;
      const skill = 0.4 + ((si + 2) % 5) * 0.35;
      preds.push({ week: wk, name, spx: r2(a('spx') + (rand() - 0.5) * 2 * skill), ixic: r2(a('ixic') + (rand() - 0.5) * 3 * skill),
        rationale: RATIONALES[Math.floor(rand() * RATIONALES.length)] });
    }
  });
  // 本週（第 7 週）已經有幾位同學先交了
  ROSTER.slice(1, 7).forEach(([, name], i) => preds.push({ week: 7, name, spx: r2((rand() - 0.5) * 2), ixic: r2((rand() - 0.5) * 3), rationale: '',
    ...(i % 2 ? { wSpx: 60, wIxic: -40 } : {}) }));

  // 與 Code.gs 的 allocation_ / portfolio_ 相同
  function allocation(p, week) {
    if (!p || p.spx == null || p.ixic == null) return { wSpx: 0, wIxic: 0, source: 'cash' };
    if (week >= TRADING.startWeek && p.wSpx != null && p.wIxic != null) return { wSpx: p.wSpx, wIxic: p.wIxic, source: 'manual' };
    return { wSpx: Math.sign(p.spx) * TRADING.autoWeight, wIxic: Math.sign(p.ixic) * TRADING.autoWeight, source: 'auto' };
  }
  function portfolio(weeks, name) {
    let equity = TRADING.startingCash;
    const rows = [];
    for (const w of weeks) {
      if (w.status === 'upcoming') break;
      const a = allocation(preds.find(p => p.name === name && p.week === w.week), w.week);
      const row = { week: w.week, status: w.status, ...a, start: equity, end: null, pnl: null, ret: null };
      if (w.status !== 'settled') { rows.push(row); break; }
      const ret = (a.wSpx * w.spx + a.wIxic * w.ixic) / 100;
      const end = equity * (1 + ret / 100);
      Object.assign(row, { end, pnl: end - equity, ret });
      rows.push(row);
      equity = end;
    }
    return { rows, equity, totalReturn: (equity / TRADING.startingCash - 1) * 100 };
  }

  function game() {
    const now = new Date();
    const weeks = DATES.slice(1).map((end, i) => {
      const prev = market[i], cur = market[i + 1];
      const pct = k => (prev[k] != null && cur[k] != null) ? (cur[k] - prev[k]) / prev[k] * 100 : null;
      return { week: i + 1, round: i + 1 <= 8 ? 1 : 2, start: prev.date, end,
        startClose: { spx: prev.spx, ixic: prev.ixic }, endClose: { spx: cur.spx, ixic: cur.ixic },
        deadline: deadlineFor(end).toISOString(), spx: pct('spx'), ixic: pct('ixic') };
    });
    const open = weeks.find(w => now < new Date(w.deadline));
    const openWeek = open ? open.week : null;
    weeks.forEach(w => {
      w.status = w.spx != null ? 'settled' : w.week === openWeek ? 'open' : now >= new Date(w.deadline) ? 'pending' : 'upcoming';
    });
    const byWeek = Object.fromEntries(weeks.map(w => [w.week, w]));
    const scored = preds.map(p => {
      const w = byWeek[p.week];
      return { ...p, error: w && w.status === 'settled' ? Math.abs(p.spx - w.spx) + Math.abs(p.ixic - w.ixic) : null };
    });
    const board = ROSTER.map(([, name]) => ({ name, errors: {}, submitted: [],
      assets: Object.fromEntries(portfolio(weeks, name).rows.filter(r => r.end != null).map(r => [r.week, r.end])) }));
    scored.forEach(p => {
      const b = board.find(b => b.name === p.name);
      b.submitted.push(p.week);
      if (p.error != null) b.errors[p.week] = p.error;
    });
    const highlights = {};
    weeks.filter(w => w.status === 'settled').forEach(w => {
      const ranked = scored.filter(p => p.week === w.week && p.error != null).sort((a, b) => a.error - b.error);
      highlights[w.week] = ranked.map(p => ({ rank: 1 + ranked.filter(o => o.error < p.error - 1e-9).length, name: p.name,
        error: p.error, spx: p.spx, ixic: p.ixic, rationale: p.rationale })).filter(t => t.rank <= 3);
    });
    return { now, weeks, openWeek, scored, board, highlights };
  }

  function find(id) {
    const key = String(id || '').trim().toUpperCase();
    const row = ROSTER.find(r => r[0] === key);
    if (!row) throw new Error('查無此學號（示範模式請用 DEMO01 ~ DEMO10）');
    return { name: row[1], dept: row[2] };
  }

  function student(s) {
    const g = game();
    const me = g.scored.filter(p => p.name === s.name).map(({ week, spx, ixic, rationale, error, wSpx, wIxic }) =>
      ({ week, spx, ixic, rationale, error, wSpx: wSpx ?? null, wIxic: wIxic ?? null }));
    return { ok: true, now: g.now.toISOString(), student: s, weeks: g.weeks, openWeek: g.openWeek, roundSplit: 8, maxAbsPred: 20,
      me, board: g.board, highlights: g.highlights, trading: TRADING, portfolio: portfolio(g.weeks, s.name) };
  }

  function dashboard() {
    const g = game();
    const weekPreds = {};
    g.weeks.filter(w => w.status === 'settled' || w.status === 'pending').forEach(w => {
      weekPreds[w.week] = g.scored.filter(p => p.week === w.week).map(({ name, spx, ixic, error }) => ({ name, spx, ixic, error }));
    });
    return { ok: true, now: g.now.toISOString(), weeks: g.weeks, openWeek: g.openWeek, roundSplit: 8, board: g.board,
      highlights: g.highlights, weekPreds,
      trading: TRADING,
      openStats: { week: g.openWeek, submitted: new Set(g.scored.filter(p => p.week === g.openWeek).map(p => p.name)).size, total: ROSTER.length } };
  }

  return {
    async handle(body) {
      await new Promise(r => setTimeout(r, 200));
      if (body.action === 'dashboard') return dashboard();
      const s = find(body.id);
      if (body.action === 'submit') {
        const g = game();
        if (body.week !== g.openWeek) throw new Error('這一週已截止或尚未開放');
        const spx = parseFloat(body.spx), ixic = parseFloat(body.ixic);
        if (!isFinite(spx) || !isFinite(ixic)) throw new Error('請填入 S&P 500 與 NASDAQ 的預測漲跌幅');
        if (Math.abs(spx) > 20 || Math.abs(ixic) > 20) throw new Error('預測值需介於 ±20% 之間');
        const i = preds.findIndex(p => p.week === body.week && p.name === s.name);
        const num = v => v === '' || v == null ? null : parseFloat(v);
        const wSpx = num(body.wSpx), wIxic = num(body.wIxic);
        if (wSpx != null || wIxic != null) {
          if (body.week < TRADING.startWeek) throw new Error(`第 ${TRADING.startWeek} 週起才能自己設定部位`);
          if (Math.abs(wSpx || 0) + Math.abs(wIxic || 0) > TRADING.maxExposure) throw new Error('兩個部位的絕對值加總不能超過總資產的 100%');
        }
        const entry = { week: body.week, name: s.name, spx, ixic, rationale: String(body.rationale || '').trim(),
          ...(wSpx != null || wIxic != null ? { wSpx: wSpx || 0, wIxic: wIxic || 0 } : {}) };
        if (i >= 0) preds[i] = entry; else preds.push(entry);
        return { ...student(s), saved: { week: body.week, spx, ixic } };
      }
      return student(s);
    },
  };
})();
