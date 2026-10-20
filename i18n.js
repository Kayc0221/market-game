// 中 / EN 雙語。所有畫面文字都從這裡取；切換語言時會發出 'langchange' 事件讓頁面重畫。
window.I18N = (() => {
  const KEY = 'mpg.lang';
  const load = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch {} };
  let lang = load() === 'en' ? 'en' : 'zh';

  const D = {
    // ---------- 共用 ----------
    'app.name': ['華爾街預言家', 'Wall Street Oracle'],
    'app.desc': ['16 週股市預測挑戰：預測 S&P 500 與 NASDAQ 每週漲跌，看誰最準。', '16-week market prediction challenge: predict the weekly moves of the S&P 500 and NASDAQ.'],
    'lang.label': ['語言', 'Language'],
    'demo': ['示範模式', 'Demo mode'],
    'err.server': ['伺服器沒有回應（{s}）', 'Server not responding ({s})'],
    'err.generic': ['發生錯誤', 'Something went wrong'],
    'grade.bull': ['靶心', 'Bullseye'], 'grade.inner': ['內環', 'Inner ring'], 'grade.mid': ['中環', 'Middle ring'], 'grade.outer': ['外環', 'Outer ring'],
    'target.label': ['靶心圖', 'Bullseye chart'],
    'target.empty': ['還沒有資料', 'No data yet'],
    'target.axes': [['S&P 猜高 ▶', '◀ 猜低', '▲ NASDAQ 猜高', '▼ NASDAQ 猜低'], ['S&P high ▶', '◀ S&P low', '▲ NASDAQ high', '▼ NASDAQ low']],
    'podium.empty': ['這週還沒有結算的成績', 'No settled results this week yet'],
    'podium.rank': ['第 {n} 名', 'Rank {n}'],
    'podium.err': ['誤差', 'Error'],
    'podium.noWhy': ['（沒有填寫理由）', '(no rationale given)'],
    'week.n': ['第 {n} 週', 'Week {n}'],
    'close': ['收盤', 'close'],
    'people': ['{n} 人', '{n}'],

    // ---------- 學生頁：登入 ----------
    'login.tagline': ['16 週股市預測挑戰 · 預測 S&amp;P 500 與 NASDAQ 每週漲跌，誤差越小排名越前面',
      '16-week market prediction challenge · Predict the weekly moves of the S&amp;P 500 and NASDAQ — the smaller your error, the higher you rank'],
    'login.sid': ['學號', 'Student ID'],
    'login.sidPh': ['例如 114AB0001', 'e.g. 114AB0001'],
    'login.remember': ['在這台裝置記住我', 'Remember me on this device'],
    'login.go': ['開始挑戰', 'Start'],
    'login.demo': ['目前是<strong>示範模式</strong>（尚未連接試算表）。試試學號 <code>DEMO01</code>。',
      'This is <strong>demo mode</strong> (not connected to the sheet). Try student ID <code>DEMO01</code>.'],
    'logout': ['登出', 'Log out'],
    'xp': ['經驗值', 'XP'],
    'xp.max': ['{xp} XP · 最高等級', '{xp} XP · Max level'],
    'lv.0': ['實習生', 'Intern'], 'lv.1': ['初級交易員', 'Junior Trader'], 'lv.2': ['分析師', 'Analyst'],
    'lv.3': ['資深分析師', 'Senior Analyst'], 'lv.4': ['基金經理', 'Fund Manager'], 'lv.5': ['市場預言家', 'Market Oracle'],

    // ---------- 學生頁：本週任務 ----------
    'm.last': ['上一個結算週 W{w}：S&amp;P 500 {spx}、NASDAQ {ixic}', 'Last settled week W{w}: S&amp;P 500 {spx}, NASDAQ {ixic}'],
    'm.lastErr': ['，你的誤差 <b>{e}</b> {g}', ' · your error <b>{e}</b> {g}'],
    'm.none.title': ['目前沒有開放的週次', 'No week is open right now'],
    'm.none.body': ['賽季已結束，或下一週還沒開放。看看下面的排行榜吧！', 'The season is over or the next week isn’t open yet. Check out the leaderboard below!'],
    'm.title': ['第 {w} 週任務 · R{r}', 'Week {w} mission · R{r}'],
    'm.period': ['預測 {a}（五）收盤 → {b} 收盤的漲跌幅', 'Predict the % change from the {a} (Fri) close → {b} close'],
    'm.base': ['起始收盤：S&amp;P 500 <b>{spx}</b> · NASDAQ <b>{ixic}</b>', 'Starting close: S&amp;P 500 <b>{spx}</b> · NASDAQ <b>{ixic}</b>'],
    'm.dec': ['減少 0.1', 'Decrease 0.1'], 'm.inc': ['增加 0.1', 'Increase 0.1'],
    'm.predAria': ['{i} 預測漲跌 (%)', '{i} predicted change (%)'],
    'm.up': ['▲ 看漲', '▲ Up'], 'm.down': ['▼ 看跌', '▼ Down'], 'm.flat': ['持平', 'Flat'],
    'm.why': ['預測理由（選填，寫 3 次可解鎖徽章；如果進入前三名，理由會在課堂上展示）',
      'Rationale (optional — write 3 to unlock a badge; if you make the top 3, it will be shown in class)'],
    'm.whyPh': ['例如：CPI 數據高於預期，科技股承壓…', 'e.g. CPI came in hot, tech stocks under pressure…'],
    'm.submit': ['送出預測', 'Submit prediction'], 'm.update': ['更新預測', 'Update prediction'],
    'm.saved': ['已提交：S&amp;P {spx}、NASDAQ {ixic} · 截止前可以修改', 'Submitted: S&amp;P {spx}, NASDAQ {ixic} · you can change it before the deadline'],
    'm.unsaved': ['截止前可以重複修改，以最後一次為準', 'You can resubmit until the deadline — the last one counts'],
    'm.closed': ['已截止', 'Closed'],
    'm.left': ['⏳ 剩 {d}{h} 小時 {m} 分', '⏳ {d}{h}h {m}m left'],
    'm.leftDays': ['{d} 天 ', '{d}d '],
    'm.deadline': ['截止：{t}', 'Deadline: {t}'],
    'm.toast': ['✅ 第 {w} 週預測已送出', '✅ Week {w} prediction submitted'],

    // ---------- 學生頁：模擬投資配置 ----------
    't.soon': ['💰 模擬投資：這週會依你的預測方向自動配置（每個指數 {a}%），第 {w} 週起可以自己調整。目前資產 <b>{eq}</b>',
      '💰 Simulated investing: this week your positions follow your predicted direction ({a}% per index). You can set your own from week {w}. Current assets <b>{eq}</b>'],
    't.title': ['💰 模擬投資 · 這週怎麼配置？', '💰 Simulated investing · How will you position this week?'],
    't.start': ['本週起始資產 <b>{eq}</b>', 'Starting assets this week <b>{eq}</b>'],
    't.short100': ['放空 −100%', 'Short −100%'], 't.long100': ['做多 +100%', 'Long +100%'],
    't.allocAria': ['{i} 配置 (%)', '{i} allocation (%)'],
    't.auto': ['依我的預測自動配置', 'Auto-allocate from my prediction'],
    't.cash': ['全部換成現金', 'Go all cash'],
    't.note': ['以 {a} 收盤價建倉、{b} 收盤價結算。沒有自己調整的話，會依你的預測方向各配置 {w}%；沒交預測的週次全部持有現金。兩個部位加總最多 {m}%。',
      'Positions open at the {a} close and settle at the {b} close. If you don’t adjust, each index gets {w}% in your predicted direction; weeks with no prediction are all cash. Both positions combined can’t exceed {m}%.'],
    't.modeAuto': ['<span class="chip">🤖 自動</span> 依你的預測方向，每個指數 {a}%', '<span class="chip">🤖 Auto</span> {a}% per index in your predicted direction'],
    't.modeManual': ['<span class="chip bull">✋ 自訂</span> 你自己設定的配置', '<span class="chip bull">✋ Custom</span> Your own allocation'],
    't.none': ['不持有', 'No position'],
    't.long': ['做多', 'Long'], 't.short': ['放空', 'Short'],
    't.summary': ['總曝險 <b>{g}%</b> / {m}% · 沒用到的現金 <b>{c}</b>（{p}%）', 'Gross exposure <b>{g}%</b> / {m}% · Idle cash <b>{c}</b> ({p}%)'],
    't.allCash': ['全部持有現金：不管漲跌，這週資產都不變。', 'All cash: your assets won’t change this week, up or down.'],
    't.whatIf': ['如果實際漲跌和你的預測一樣，這週會 <b class="{cls}">{verb} {amt}</b>（{pct}）', 'If the market moves exactly as you predicted, you’d <b class="{cls}">{verb} {amt}</b> ({pct}) this week'],
    't.earn': ['賺', 'make'], 't.lose': ['賠', 'lose'],
    't.contra': ['⚠️ 你的部位方向和預測相反', '⚠️ Your positions go against your own prediction'],
    't.fillFirst': ['填好預測後，這裡會算出「如果你猜對，這週會賺多少」。', 'Fill in your prediction and this will show how much you’d make if you’re right.'],

    // ---------- 學生頁：方塊 ----------
    'tile.rank': ['R{r} 誤差名次', 'R{r} error rank'],
    'tile.avg': ['平均誤差 {a}', 'Avg error {a}'],
    'tile.avgMissed': ['（含缺交 {n} 週）', ' (incl. {n} missed)'],
    'tile.noScore': ['還沒有已結算的預測', 'No settled predictions yet'],
    'tile.assets': ['模擬資產', 'Simulated assets'],
    'tile.assetRank': [' · 第 {n} 名', ' · #{n}'],
    'tile.hit': ['方向命中率', 'Direction hit rate'],
    'tile.hitSub': ['{h} / {n} 次猜對漲跌', '{h} of {n} directions right'],
    'tile.weeks': ['參與週數', 'Weeks played'],
    'tile.settled': ['已結算 {n} 週', '{n} weeks settled'],
    'tile.missed': [' · 缺交 {n} 週', ' · {n} missed'],

    // ---------- 學生頁：區塊標題 ----------
    'podium.title': ['第 {w} 週預測最準前三名', 'Week {w} — most accurate top 3'],
    'podium.titleNone': ['每週前三名', 'Weekly top 3'],
    'podium.sub': ['看看最準的同學怎麼想', 'See how the most accurate classmates thought'],
    'pf.title': ['💰 模擬投資', '💰 Simulated investing'],
    'pf.sub': ['把預測變成部位，看看猜對能賺多少（不計入排名）', 'Turn predictions into positions and see what being right is worth (not part of the ranking)'],
    'pf.total': ['總資產', 'Total assets'],
    'pf.ret': ['{gain} · 起始資金 {s}', '{gain} · Starting cash {s}'],
    'pf.gain': ['{g}（{p}）', '{g} ({p})'],
    'pf.mine': ['我的資產', 'My assets'],
    'pf.bhSpx': ['一開始全買 S&P 500', 'All-in S&P 500 from the start'],
    'pf.bhIxic': ['一開始全買 NASDAQ', 'All-in NASDAQ from the start'],
    'pf.rank': ['資產排名', 'Asset rank'],
    'pf.details': ['每週部位與損益', 'Weekly positions & P/L'],
    'pf.th': [['週次', '配置', 'S&P 500', 'NASDAQ', '週初資產', '損益', '報酬', '週末資產'], ['Week', 'Mode', 'S&P 500', 'NASDAQ', 'Start', 'P/L', 'Return', 'End']],
    'pf.manual': ['自訂', 'Custom'], 'pf.autoChip': ['自動', 'Auto'], 'pf.cashChip': ['未提交·現金', 'No entry · cash'],
    'pf.long': ['多', 'L'], 'pf.short': ['空', 'S'],
    'pf.start': ['起始', 'Start'],
    'status.open': ['進行中', 'In progress'], 'status.pending': ['等待結算', 'Awaiting close'], 'status.none': ['未提交', 'Not submitted'],
    'chart.title': ['預測 vs 實際', 'Prediction vs actual'],
    'chart.actual': ['實際漲跌', 'Actual change'], 'chart.actualShort': ['實際', 'Actual'],
    'chart.mine': ['我的預測', 'My prediction'],
    'chart.spx': ['S&amp;P 500 每週漲跌（週五收盤對週五收盤, %）', 'S&amp;P 500 weekly change (Fri close to Fri close, %)'],
    'chart.ixic': ['NASDAQ 每週漲跌（週五收盤對週五收盤, %）', 'NASDAQ weekly change (Fri close to Fri close, %)'],
    'chart.tipTitle': ['W{w}（{a} → {b} 收盤）', 'W{w} ({a} → {b} close)'],
    'chart.na': ['尚未公布', 'Not yet'],
    'my.target': ['我的靶心', 'My bullseye'],
    'my.targetNote': ['每一週是一個點。<strong>離中心的距離 = 該週誤差</strong>；點偏向哪一邊，代表哪個指數猜太高或太低。',
      'Each week is one dot. <strong>Distance from the center = that week’s error</strong>; the direction shows which index you over- or under-shot.'],
    'my.targetEmpty': ['結算後，你的預測會出現在這裡', 'Your predictions appear here once weeks settle'],
    'my.tip': ['<b>W{w} · 誤差 {e} {g}</b><br>S&amp;P：猜 {ps}，實際 {as}<br>NASDAQ：猜 {pi}，實際 {ai}', '<b>W{w} · error {e} {g}</b><br>S&amp;P: guessed {ps}, actual {as}<br>NASDAQ: guessed {pi}, actual {ai}'],
    'rank.title': ['名次變化', 'Rank history'],
    'rank.note': ['每週結算後，依全季累積平均誤差（含缺交懲罰）的排名。', 'Your rank after each settled week, by season-to-date average error (missed-week penalty included).'],
    'rank.tick': ['第 {n} 名', '#{n}'],
    'rank.after': ['W{w} 結算後', 'After W{w}'],
    'rank.none': [' 尚未排名', ' Not ranked'],
    'board.title': ['排行榜', 'Leaderboard'],
    'board.all': ['全季', 'Season'], 'board.assets': ['💰 資產', '💰 Assets'],
    'board.noteErr': ['名次依平均誤差（|S&P 預測 − 實際| + |NASDAQ 預測 − 實際|）由小到大排列。缺交的週次以該週全班最差誤差計。',
      'Ranked by average error (|S&P pred − actual| + |NASDAQ pred − actual|), lowest first. A missed week counts as that week’s worst error in class.'],
    'board.noteAssets': ['模擬投資的總資產（不計入排名）。過去的週次依預測方向自動配置估算，沒交預測的週次持有現金。',
      'Simulated-investing assets (not part of the ranking). Past weeks are estimated by auto-allocating in your predicted direction; weeks with no prediction are cash.'],
    'board.empty': ['這個階段還沒有成績', 'No results in this round yet'],
    'board.you': ['你', 'You'],
    'board.weeks': ['{n} 週', '{n} wk'],
    'board.missed': [' · 缺 {n}', ' · {n} missed'],
    'board.avgTitle': ['平均誤差 {a}', 'Average error {a}'],
    'board.tradingOff': ['模擬投資功能尚未啟用', 'Simulated investing isn’t enabled yet'],
    'board.assetsSoon': ['第一週結算後就會有資產排名', 'Asset rankings appear after the first week settles'],
    'badges.title': ['成就徽章', 'Badges'],
    'badges.count': ['已解鎖 {a} / {b}', '{a} / {b} unlocked'],
    'rec.title': ['我的預測紀錄', 'My predictions'],
    'rec.th': [['週次', '期間', 'S&P 預測', 'S&P 實際', 'NASDAQ 預測', 'NASDAQ 實際', '誤差', '評等', '理由'], ['Week', 'Period', 'S&P pred', 'S&P actual', 'NASDAQ pred', 'NASDAQ actual', 'Error', 'Grade', 'Rationale']],
    'rec.empty': ['還沒有紀錄', 'No records yet'],

    // ---------- 徽章 ----------
    'b.first': [['初次出手', '第一次送出預測'], ['First move', 'Submit your first prediction']],
    'b.bull': [['正中靶心', '單週誤差小於 0.5'], ['Bullseye', 'Weekly error under 0.5']],
    'b.dir': [['方向達人', '單週兩個指數漲跌方向都猜對'], ['Direction master', 'Get both directions right in one week']],
    'b.streak': [['三連擊', '連續 3 週都有提交'], ['Hat trick', 'Submit 3 weeks in a row']],
    'b.podium': [['登上頒獎台', '某一週進入全班前三名'], ['On the podium', 'Make the class top 3 in any week']],
    'b.champ': [['單週冠軍', '某一週全班誤差最低'], ['Weekly champion', 'Lowest error in class for a week']],
    'b.bear': [['熊市獵人', '指數大跌超過 1% 時你也猜跌'], ['Bear hunter', 'Predict a drop when an index falls over 1%']],
    'b.steady': [['穩定輸出', '連續 3 週誤差都小於 1.5'], ['Steady hand', 'Error under 1.5 for 3 weeks in a row']],
    'b.writer': [['分析師筆記', '寫下 3 次以上的預測理由'], ['Analyst notes', 'Write 3 or more rationales']],
    'b.money': [['第一桶金', '模擬投資某一週賺錢'], ['First profit', 'Make money in a simulated week']],
    'b.shortWin': [['放空獲利', '有放空部位的那一週賺錢'], ['Short winner', 'Profit in a week with a short position']],
    'b.r1': [['R1 全勤', '第 2–8 週每週都提交'], ['R1 perfect attendance', 'Submit every week from 2 to 8']],

    // ---------- 課堂看板 ----------
    'd.title': ['課堂看板 · 華爾街預言家', 'Class dashboard · Wall Street Oracle'],
    'd.brand': ['課堂看板', 'Class dashboard'],
    'd.weekNav': ['切換週次', 'Switch week'], 'd.prev': ['上一週', 'Previous week'], 'd.next': ['下一週', 'Next week'], 'd.select': ['選擇週次', 'Choose week'],
    'd.refresh': ['重新整理', 'Refresh'], 'd.theme': ['切換深淺色', 'Toggle light/dark'], 'd.fullscreen': ['全螢幕（F）', 'Fullscreen (F)'],
    'd.loading': ['載入中…', 'Loading…'],
    'd.updated': ['更新於 {t}', 'Updated {t}'],
    'd.loadFail': ['讀取失敗：{e}', 'Failed to load: {e}'],
    'd.noWeeks': ['賽季還沒有結算的週次', 'No settled weeks yet this season'],
    'd.option': ['第 {w} 週 · {a} → {b}', 'Week {w} · {a} → {b}'],
    'd.optionPending': ['（待收盤）', ' (awaiting close)'],
    'd.closeRange': ['{a} → {b} 收盤', '{a} → {b} close'],
    'd.waitClose': ['⏳ 等待 {b} 收盤', '⏳ Waiting for {b} close'],
    'd.startClose': ['起始收盤 {p}', 'Starting close {p}'],
    'd.classAvg': ['全班平均預測', 'Class avg prediction'],
    'd.rightDir': ['猜對方向', 'Right direction'],
    'd.bullsBears': ['看漲 / 看跌', 'Up / down calls'],
    'd.ofPeople': ['{a} / {b} 人', '{a} / {b}'],
    'd.classPerf': ['全班表現', 'Class performance'],
    'd.weekRound': ['第 {w} 週 · R{r}', 'Week {w} · R{r}'],
    'd.participated': [' / {n} 人參與', ' / {n} took part'],
    'd.closedWait': ['預測已截止，週五收盤後結算', 'Predictions closed — settles after Friday’s close'],
    'd.classErr': ['全班平均誤差', 'Class avg error'],
    'd.bestErr': ['最佳誤差', 'Best error'],
    'd.consensus': ['「全班平均」的誤差', 'Error of the class average'],
    'd.consensusTip': ['把全班平均預測當成一個人來算的誤差', 'The error if the class-average prediction were one player'],
    'd.target': ['全班靶心', 'Class bullseye'],
    'd.targetNote': ['每位同學一個點，<strong>離中心越近越準</strong>（距離 = 誤差）。橘色是本週前三名。',
      'One dot per student — <strong>closer to the center is more accurate</strong> (distance = error). Orange dots are this week’s top 3.'],
    'd.dist': ['全班預測分布', 'Class prediction spread'],
    'd.distNote': ['每位同學一個點。中心 = 預測持平；越往右越看好 S&amp;P 500，越往上越看好 NASDAQ。',
      'One dot per student. Center = flat; further right = more bullish on the S&amp;P 500, further up = more bullish on NASDAQ.'],
    'd.distAxes': [['S&P 看漲 ▶', '◀ 看跌', '▲ NASDAQ 看漲', '▼ NASDAQ 看跌'], ['S&P up ▶', '◀ down', '▲ NASDAQ up', '▼ NASDAQ down']],
    'd.nobody': ['這週沒有人提交', 'Nobody submitted this week'],
    'd.tip': ['<b>{n} · 誤差 {e}</b><br>S&amp;P：猜 {ps}，實際 {as}<br>NASDAQ：猜 {pi}，實際 {ai}', '<b>{n} · error {e}</b><br>S&amp;P: guessed {ps}, actual {as}<br>NASDAQ: guessed {pi}, actual {ai}'],
    'd.showNames': ['顯示所有姓名', 'Show all names'],
    'd.podiumEmpty': ['這週沒有完整提交的預測', 'No complete predictions this week'],
    'd.podiumWait': ['週五收盤後就會公布前三名和他們的理由。', 'The top 3 and their rationales appear after Friday’s close.'],
    'd.board': ['R{r} 排行榜（累積到第 {w} 週）', 'R{r} leaderboard (through week {w})'],
    'd.boardNote': ['平均誤差越小越前面 · 缺交的週次以該週最差誤差計 · ▲▼ 為與上週相比的名次變化',
      'Lower average error ranks higher · a missed week counts as that week’s worst error · ▲▼ = change vs last week'],
    'd.up': ['上升 {n} 名', 'Up {n}'], 'd.down': ['下降 {n} 名', 'Down {n}'],
    'd.noScore': ['尚無成績', 'No score'],
    'd.assets': ['💰 模擬投資資產', '💰 Simulated assets'],
    'd.assetsAt': ['💰 模擬投資資產（第 {w} 週結算後）', '💰 Simulated assets (after week {w})'],
    'd.assetsNote': ['起始資金 $10,000 · 不計入排名 · ▲▼ 為與上週相比的名次變化', 'Starting cash $10,000 · not part of the ranking · ▲▼ = change vs last week'],
    'd.assetsSoon': ['結算後就會有資產排名', 'Asset rankings appear after settlement'],
    'd.invest': ['第 {w} 週投資表現', 'Week {w} investing results'],
    'd.winLose': ['賺錢 / 賠錢', 'Made / lost money'],
    'd.avgAssets': ['全班平均資產', 'Class avg assets'],
    'd.investNote': ['沒有自己設定部位的同學，依預測方向每個指數配置 {a}%；沒交預測的週次持有現金。',
      'Students without a custom allocation get {a}% per index in their predicted direction; weeks with no prediction are cash.'],
    'd.status': ['預測狀態', 'Prediction status'],
    'd.noOpen': ['目前沒有開放提交的週次。', 'No week is open for submissions.'],
    'd.open': ['第 {w} 週預測進行中', 'Week {w} predictions open'],
    'd.deadline': ['截止 {t}', 'Due {t}'],
    'd.submitted': [' / {n} 人已提交', ' / {n} submitted'],
    'd.scan': ['掃描 QR code 或前往', 'Scan the QR code or go to'],
    'd.qr': ['學生頁面 QR code', 'Student page QR code'],
  };

  // 後端（Code.gs／示範模式）回傳的中文錯誤訊息 → 英文
  const ERRORS = [
    [/^請輸入學號$/, 'Please enter your student ID'],
    [/^查無此學號，請確認後再試，或聯絡老師$/, 'Student ID not found. Please check it or contact your teacher.'],
    [/^查無此學號（示範模式請用 (.+)）$/, 'Student ID not found (demo mode: use $1)'],
    [/^請填入 S&P 500 與 NASDAQ 的預測漲跌幅$/, 'Please enter predictions for both the S&P 500 and NASDAQ'],
    [/^預測值需介於 ±(\d+)% 之間$/, 'Predictions must be between −$1% and +$1%'],
    [/^這一週已截止或尚未開放$/, 'This week is closed or not open yet'],
    [/^第 (\d+) 週起才能自己設定部位$/, 'Custom positions are available from week $1'],
    [/^單一部位需介於 −100% 到 \+100%$/, 'Each position must be between −100% and +100%'],
    [/^兩個部位的絕對值加總不能超過總資產的 (\d+)%$/, 'Both positions combined can’t exceed $1% of total assets'],
    [/^找不到「(.+)」分頁，請先在 Apps Script 執行 setup$/, 'Sheet “$1” not found — the teacher needs to run setup in Apps Script'],
    [/^讀取收盤價失敗（(\d+)）$/, 'Failed to load closing prices ($1)'],
    [/^伺服器沒有回應（(\d+)）$/, 'Server not responding ($1)'],
    [/^發生錯誤$/, 'Something went wrong'],
    [/^未知的動作$/, 'Unknown action'],
  ];

  function t(key, vars) {
    const entry = D[key];
    if (!entry) return key;
    const s = entry[lang === 'en' ? 1 : 0];
    if (typeof s !== 'string') return s; // 陣列（表頭、軸標籤、徽章）
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '') : s;
  }

  const err = msg => {
    if (lang !== 'en') return msg;
    for (const [re, en] of ERRORS) if (re.test(msg)) return msg.replace(re, en);
    return msg;
  };

  /** 套用 data-i18n（innerHTML）、data-i18n-ph（placeholder）、data-i18n-aria（aria-label）、data-i18n-title（title）。 */
  function apply(root = document) {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
    root.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll('.lang-toggle button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  }

  function set(next) {
    if (next === lang) return;
    lang = next === 'en' ? 'en' : 'zh';
    save(lang);
    apply();
    document.dispatchEvent(new CustomEvent('langchange'));
  }

  // 「中 / EN」切換按鈕：放 <div class="lang-toggle"></div> 在頁面上即可
  document.addEventListener('click', e => {
    const b = e.target.closest('.lang-toggle button');
    if (b) set(b.dataset.lang);
  });
  function mountToggles() {
    document.querySelectorAll('.lang-toggle').forEach(el => {
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', 'Language / 語言');
      el.innerHTML = '<button type="button" data-lang="zh">中</button><button type="button" data-lang="en">EN</button>';
    });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountToggles); else mountToggles();

  return { t, err, apply, set, get lang() { return lang; }, locale: () => lang === 'en' ? 'en-US' : 'zh-TW' };
})();
