/* ============ 私语 · 第六批 · 双人回合制小游戏 ============ */
/* 约定：你一次我一次，我方操作后立即（同步）触发对方 AI；不用定时器驱动 AI 逻辑 */
const Features6 = (() => {
  const esc = (s) => UI.escapeHtml(String(s ?? ''));
  const DIFFS = [
    { k: 'easy',   name: '简单' },
    { k: 'medium', name: '中等' },
    { k: 'hard',   name: '困难' }
  ];
  const diffLabel = (d) => DIFFS.find(x => x.k === d)?.name || d;

  function ensureData() {
    const d = Core.State.data;
    if (!d.games) d.games = { stats: { wins: 0, losses: 0, draws: 0 }, records: [] };
    if (!d.games.stats) d.games.stats = { wins: 0, losses: 0, draws: 0 };
    if (!d.games.records) d.games.records = [];
    return d;
  }

  function peerName() {
    const sid = Core.State.currentChatId;
    if (!sid) return '对方';
    const s = Core.State.data.sessions[sid];
    if (!s || s.type !== 'private') return '对方';
    const peer = s.members.find(x => x !== Core.State.user.username);
    const c = Core.State.data.contacts.find(c => c.username === peer);
    return c?.nickname || peer || '对方';
  }

  /* 记录战绩 + 发结果卡片到聊天 */
  function recordResult(game, diff, outcome, scoreMe, scorePeer) {
    const d = ensureData();
    if (outcome === 'win') d.games.stats.wins++;
    else if (outcome === 'lose') d.games.stats.losses++;
    else d.games.stats.draws++;
    d.games.records.unshift({ game, diff, outcome, scoreMe, scorePeer, time: Core.now() });
    d.games.records = d.games.records.slice(0, 50);
    Core.State.save();
    const labels = { win: '胜利', lose: '失利', draw: '平局' };
    const icon = outcome === 'win' ? 'fa-trophy' : outcome === 'lose' ? 'fa-face-frown' : 'fa-handshake';
    if (Core.State.currentChatId) {
      Messaging.sendMessage({
        type: 'card',
        cardIcon: icon,
        cardTitle: `${game} · ${labels[outcome]}`,
        lines: [`难度：${diffLabel(diff)}`, `我方 ${scoreMe} : ${scorePeer} ${peerName()}`]
      });
    }
  }

  const rnd = (n) => Math.floor(Math.random() * n);
  const choice = (arr) => arr[rnd(arr.length)];

  /* ==================== 游戏选择面板 ==================== */
  function openGames() {
    const d = ensureData();
    const GAMES = [
      { k: 'ttt',    name: '井字棋',   icon: 'fa-hashtag',     fn: openTicTacToe,  hint: '三连成线' },
      { k: 'match3', name: '消消乐',   icon: 'fa-grip',        fn: openMatch3,     hint: '三连消除' },
      { k: 'onet',   name: '连连看',   icon: 'fa-link',        fn: openOnet,        hint: '折线配对' },
      { k: 'draw',   name: '你画我猜', icon: 'fa-paintbrush',  fn: openDrawGuess,   hint: '画词猜词' },
      { k: 'g2048',  name: '2048',     icon: 'fa-table-cells', fn: open2048,        hint: '合并数字' },
      { k: 'sheep',  name: '羊了个羊', icon: 'fa-paw',         fn: openSheep,       hint: '堆叠消三层' },
      { k: 'snake',  name: '贪吃蛇',   icon: 'fa-staff-snake', fn: openSnake,      hint: '回合走位' }
    ];
    const { overlay, close } = UI.modal({
      title: '小游戏中心',
      body: `
        <p style="text-align:center;color:var(--c-text-soft)">选择游戏与难度，与 ${esc(peerName())} 回合对战</p>
        <div class="f6-stats">
          <span class="f6-st win"><i class="fas fa-trophy"></i> 胜 ${d.games.stats.wins}</span>
          <span class="f6-st lose"><i class="fas fa-face-frown"></i> 负 ${d.games.stats.losses}</span>
          <span class="f6-st draw"><i class="fas fa-handshake"></i> 平 ${d.games.stats.draws}</span>
        </div>
        <div class="f6-diff">
          <span class="f6-diff-label">难度</span>
          ${DIFFS.map((x, i) => `<button class="f6-diff-btn${i === 1 ? ' active' : ''}" data-diff="${x.k}">${x.name}</button>`).join('')}
        </div>
        <div class="f6-grid">
          ${GAMES.map(g => `
            <button class="f6-game" data-game="${g.k}">
              <span class="f6-game-icon"><i class="fas ${g.icon}"></i></span>
              <span class="f6-game-name">${g.name}</span>
              <span class="f6-game-hint">${g.hint}</span>
            </button>`).join('')}
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    let curDiff = 'medium';
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('.f6-diff-btn').forEach(b => b.addEventListener('click', () => {
      overlay.querySelectorAll('.f6-diff-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); curDiff = b.dataset.diff;
    }));
    overlay.querySelectorAll('.f6-game').forEach(b => b.addEventListener('click', () => {
      const g = GAMES.find(x => x.k === b.dataset.game);
      close(); g.fn(curDiff);
    }));
  }

  /* ==================== 1. 井字棋 ==================== */
  function openTicTacToe(diff) {
    let board = Array(9).fill(null), turn = 'X', over = false;
    const { overlay, close } = UI.modal({
      title: '井字棋',
      body: `
        <p style="text-align:center;color:var(--c-text-soft)">你执 X，${esc(peerName())} 执 O · ${diffLabel(diff)}</p>
        <div class="game-board f6-ttt" id="ttt-board">
          ${Array.from({ length: 9 }).map((_, i) => `<div class="game-cell" data-i="${i}"></div>`).join('')}
        </div>
        <p style="text-align:center" id="ttt-status">轮到你了 (X)</p>`,
      footer: `<button class="btn-ghost" id="ttt-reset">重新开始</button><button class="btn-primary" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    const cells = () => overlay.querySelectorAll('.game-cell');
    $('[data-close]').addEventListener('click', close);
    $('#ttt-reset').addEventListener('click', reset);
    cells().forEach(c => c.addEventListener('click', () => playerMove(+c.dataset.i)));
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const win = (b, t) => LINES.some(l => l.every(i => b[i] === t));
    const empties = (b) => b.map((v, i) => v ? null : i).filter(i => i !== null);
    function reset() {
      board = Array(9).fill(null); turn = 'X'; over = false;
      cells().forEach(c => { c.textContent = ''; c.classList.remove('x', 'o', 'win'); });
      $('#ttt-status').textContent = '轮到你了 (X)';
    }
    function playerMove(i) {
      if (board[i] || over || turn !== 'X') return;
      board[i] = 'X'; const c = cells()[i]; c.textContent = 'X'; c.classList.add('x');
      if (win(board, 'X')) return end('你获胜！', 'win');
      if (board.every(Boolean)) return end('平局！', 'draw');
      turn = 'O'; $('#ttt-status').textContent = `${peerName()}思考中...`;
      aiMove();
    }
    function aiMove() {
      if (over) return;
      let move = null;
      if (diff === 'easy') {
        move = Math.random() < 0.5 ? (winBlock('O') ?? winBlock('X') ?? choice(empties(board)))
                                    : choice(empties(board));
      } else if (diff === 'medium') {
        move = winBlock('O') ?? winBlock('X') ?? choice(empties(board));
      } else {
        move = bestMove();
      }
      board[move] = 'O'; const c = cells()[move]; c.textContent = 'O'; c.classList.add('o');
      if (win(board, 'O')) return end(`${peerName()}获胜！`, 'lose');
      if (board.every(Boolean)) return end('平局！', 'draw');
      turn = 'X'; $('#ttt-status').textContent = '轮到你了 (X)';
    }
    function winBlock(t) {
      for (const i of empties(board)) { const c = [...board]; c[i] = t; if (win(c, t)) return i; }
      return null;
    }
    function bestMove() {
      let best = -Infinity, mv = null;
      for (const i of empties(board)) { const c = [...board]; c[i] = 'O'; const s = minimax(c, 0, false); if (s > best) { best = s; mv = i; } }
      return mv ?? choice(empties(board));
    }
    function minimax(b, depth, isO) {
      if (win(b, 'O')) return 10 - depth;
      if (win(b, 'X')) return depth - 10;
      if (b.every(Boolean)) return 0;
      const e = empties(b);
      if (isO) { let best = -Infinity; for (const i of e) { const c = [...b]; c[i] = 'O'; best = Math.max(best, minimax(c, depth + 1, false)); } return best; }
      else { let best = Infinity; for (const i of e) { const c = [...b]; c[i] = 'X'; best = Math.min(best, minimax(c, depth + 1, true)); } return best; }
    }
    function end(text, outcome) {
      over = true; $('#ttt-status').textContent = text;
      if (outcome !== 'draw') LINES.filter(l => l.every(i => board[i] === (outcome === 'win' ? 'X' : 'O')))[0]?.forEach(i => cells()[i].classList.add('win'));
      recordResult('井字棋', diff, outcome, '-', '-');
    }
  }

  /* ==================== 2. 消消乐（回合制） ==================== */
  function openMatch3(diff) {
    const N = diff === 'easy' ? 5 : diff === 'medium' ? 6 : 7;
    const NC = 6;
    const PAL = ['#e57373','#f4a261','#f1c40f','#76c893','#5fa8d3','#b388eb'];
    const ROUNDS = 8;
    let grid = [], scoreMe = 0, scorePeer = 0, turn = 'me', round = 0, over = false, sel = null;
    const idx = (r, c) => r * N + c;
    const rc = (i) => [Math.floor(i / N), i % N];
    function newGrid() { do { grid = Array.from({ length: N * N }, () => rnd(NC)); } while (findMatches(grid).length); }
    function findMatches(g) {
      const m = new Set();
      for (let r = 0; r < N; r++) { let c = 0; while (c < N) { const cur = g[idx(r, c)]; let len = 1; while (c + 1 < N && g[idx(r, c + 1)] === cur) { len++; c++; } if (len >= 3) for (let k = 0; k < len; k++) m.add(idx(r, c - k)); c++; } }
      for (let c = 0; c < N; c++) { let r = 0; while (r < N) { const cur = g[idx(r, c)]; let len = 1; while (r + 1 < N && g[idx(r + 1, c)] === cur) { len++; r++; } if (len >= 3) for (let k = 0; k < len; k++) m.add(idx(r - k, c)); r++; } }
      return [...m];
    }
    function adjacent(i, j) { const [r1, c1] = rc(i); const [r2, c2] = rc(j); return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1; }
    function trySwap(g, i, j) { const a = [...g]; [a[i], a[j]] = [a[j], a[i]]; const m = findMatches(a); return { valid: m.length > 0, grid: a, matched: m }; }
    function applyClear(g, matched) {
      matched.forEach(i => g[i] = -1);
      for (let c = 0; c < N; c++) { const col = []; for (let r = N - 1; r >= 0; r--) { const v = g[idx(r, c)]; if (v !== -1) col.push(v); } for (let r = N - 1; r >= 0; r--) g[idx(r, c)] = col.shift() ?? rnd(NC); }
    }
    function resolve(g) { let total = 0; let m = findMatches(g); let guard = 0; while (m.length && guard++ < 10) { total += m.length; applyClear(g, m); m = findMatches(g); } return total; }
    function validSwaps(g) { const list = []; for (let i = 0; i < N * N; i++) { const [r, c] = rc(i); if (c + 1 < N) { const t = trySwap(g, i, idx(r, c + 1)); if (t.valid) list.push({ i, j: idx(r, c + 1), grid: t.grid, matched: t.matched }); } if (r + 1 < N) { const t = trySwap(g, i, idx(r + 1, c)); if (t.valid) list.push({ i, j: idx(r + 1, c), grid: t.grid, matched: t.matched }); } } return list; }

    const { overlay, close } = UI.modal({
      title: `消消乐 · ${diffLabel(diff)} (${N}×${N})`,
      body: `
        <div class="f6-score-row">
          <span class="f6-score me">我方 <b id="m3-me">0</b></span>
          <span id="m3-round">回合 1/${ROUNDS}</span>
          <span class="f6-score peer">${esc(peerName())} <b id="m3-peer">0</b></span>
        </div>
        <div class="f6-m3" id="m3-board" style="grid-template-columns:repeat(${N},1fr)"></div>
        <p style="text-align:center" id="m3-status">轮到你了：点一格再点相邻格交换</p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    $('[data-close]').addEventListener('click', close);
    newGrid(); render();
    function render() {
      $('#m3-me').textContent = scoreMe; $('#m3-peer').textContent = scorePeer;
      $('#m3-round').textContent = `回合 ${Math.min(round + 1, ROUNDS)}/${ROUNDS}`;
      const board = $('#m3-board');
      board.innerHTML = grid.map((v, i) => `<div class="f6-m3-cell${sel === i ? ' sel' : ''}" data-i="${i}" style="background:${PAL[v]}"></div>`).join('');
      board.querySelectorAll('.f6-m3-cell').forEach(c => c.addEventListener('click', () => click(+c.dataset.i)));
    }
    function click(i) {
      if (over || turn !== 'me') return;
      if (sel === null) { sel = i; render(); return; }
      if (sel === i) { sel = null; render(); return; }
      if (!adjacent(sel, i)) { sel = i; render(); return; }
      const t = trySwap(grid, sel, i); sel = null;
      if (!t.valid) { $('#m3-status').textContent = '无效交换，请重选'; render(); return; }
      const g = t.grid; const gained = resolve(g); grid = g; scoreMe += gained;
      $('#m3-status').textContent = `消除 ${gained} 颗，得 ${gained} 分`;
      render();
      afterMine();
    }
    function afterMine() {
      if (round + 1 >= ROUNDS) return finish();
      turn = 'ai'; $('#m3-status').textContent = `${peerName()}思考中...`; render();
      aiMove();
    }
    function aiMove() {
      if (over) return;
      const swaps = validSwaps(grid);
      let pick = null;
      if (!swaps.length) pick = null;
      else if (diff === 'easy') {
        swaps.forEach(s => { const sc = resolve([...s.grid]); s._sc = sc; });
        swaps.sort((a, b) => a._sc - b._sc);
        pick = choice(swaps.slice(0, Math.ceil(swaps.length / 2))); // 从差的一半里乱选
      } else if (diff === 'medium') {
        swaps.forEach(s => { const sc = resolve([...s.grid]); s._sc = sc; });
        swaps.sort((a, b) => b._sc - a._sc);
        pick = choice(swaps.slice(0, Math.max(1, Math.ceil(swaps.length / 3)))); // 从前 1/3 里选
      } else {
        let best = -1;
        swaps.forEach(s => { const sc = resolve([...s.grid]); s._sc = sc; if (sc > best) best = sc; });
        pick = choice(swaps.filter(s => s._sc === best));
      }
      if (!pick) { $('#m3-status').textContent = `${peerName()}无可消步，跳过`; round++; turn = 'me'; render(); return; }
      const g = [...pick.grid]; const gained = resolve(g); grid = g; scorePeer += gained;
      $('#m3-status').textContent = `${peerName()}消除 ${gained} 颗，得 ${gained} 分`;
      round++; render();
      if (round >= ROUNDS) return finish();
      turn = 'me'; render();
    }
    function finish() {
      over = true;
      const out = scoreMe > scorePeer ? 'win' : scoreMe < scorePeer ? 'lose' : 'draw';
      $('#m3-status').textContent = `结束！我方 ${scoreMe} : ${scorePeer} ${peerName()} → ${out === 'win' ? '你胜' : out === 'lose' ? '你负' : '平局'}`;
      recordResult('消消乐', diff, out, scoreMe, scorePeer);
    }
  }

  /* ==================== 3. 连连看（回合制） ==================== */
  function openOnet(diff) {
    const cols = diff === 'easy' ? 4 : diff === 'medium' ? 6 : 6;
    const rows = diff === 'easy' ? 4 : diff === 'medium' ? 4 : 6;
    const NC = 8; // 图案种类
    const SYMS = ['★','♥','♦','♣','◆','●','▲','✿'];
    const total = rows * cols;
    const pairs = total / 2;
    let tiles = [], scoreMe = 0, scorePeer = 0, turn = 'me', over = false, sel = null;
    const idx = (r, c) => r * cols + c;
    function deal() {
      const arr = []; for (let i = 0; i < pairs; i++) { arr.push(i % NC, i % NC); }
      for (let i = arr.length - 1; i > 0; i--) { const j = rnd(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      tiles = arr;
    }
    // 路径连接：≤2 拐点（≤3 线段），BFS 以 (格子,方向) 状态记录拐点数
    function pathable(a, b) {
      if (a === b || tiles[a] === -1 || tiles[b] === -1 || tiles[a] !== tiles[b]) return false;
      const pass = (i) => tiles[i] === -1;          // 中间格必须真空
      const adj = (i, d) => {
        const r = Math.floor(i / cols), c = i % cols;
        if (d === 0) return r - 1 >= 0 ? (r - 1) * cols + c : null;          // 上
        if (d === 1) return c + 1 < cols ? r * cols + (c + 1) : null;          // 右
        if (d === 2) return r + 1 < rows ? (r + 1) * cols + c : null;        // 下
        if (d === 3) return c - 1 >= 0 ? r * cols + (c - 1) : null;           // 左
        return null;
      };
      const seen = new Set();
      const q = [];
      for (let d = 0; d < 4; d++) { const n = adj(a, d); if (n === b) return true; if (n !== null && pass(n)) q.push([n, d, 0]); }
      while (q.length) {
        const [i, dir, turns] = q.shift();
        const key = i * 4 + dir;
        if (seen.has(key)) continue; seen.add(key);
        for (let d = 0; d < 4; d++) {
          const n = adj(i, d); if (n === null) continue;
          const nt = d === dir ? turns : turns + 1;
          if (nt > 2) continue;
          if (n === b) return true;
          if (pass(n)) q.push([n, d, nt]);
        }
      }
      return false;
    }
    function allValidPairs() {
      const live = tiles.map((v, i) => v === -1 ? -1 : i).filter(i => i !== -1);
      const list = [];
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
        if (pathable(live[a], live[b])) list.push([live[a], live[b]]);
      }
      return list;
    }

    const { overlay, close } = UI.modal({
      title: `连连看 · ${diffLabel(diff)} (${rows}×${cols})`,
      body: `
        <div class="f6-score-row">
          <span class="f6-score me">我方 <b id="on-me">0</b></span>
          <span id="on-turn">轮到你</span>
          <span class="f6-score peer">${esc(peerName())} <b id="on-peer">0</b></span>
        </div>
        <div class="f6-onet" id="on-board" style="grid-template-columns:repeat(${cols},1fr)"></div>
        <p style="text-align:center" id="on-status">点两个相同图案，可由≤2拐点路径连接</p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    $('[data-close]').addEventListener('click', close);
    deal(); render();
    function render() {
      $('#on-me').textContent = scoreMe; $('#on-peer').textContent = scorePeer;
      $('#on-turn').textContent = turn === 'me' ? '轮到你' : `${peerName()}回合`;
      const board = $('#on-board');
      board.innerHTML = tiles.map((v, i) => `<div class="f6-onet-cell${v === -1 ? ' gone' : ''}${sel === i ? ' sel' : ''}" data-i="${i}">${v === -1 ? '' : SYMS[v]}</div>`).join('');
      board.querySelectorAll('.f6-onet-cell').forEach(c => c.addEventListener('click', () => click(+c.dataset.i)));
    }
    function click(i) {
      if (over || turn !== 'me' || tiles[i] === -1) return;
      if (sel === null) { sel = i; render(); return; }
      if (sel === i) { sel = null; render(); return; }
      if (pathable(sel, i)) {
        tiles[sel] = -1; tiles[i] = -1; scoreMe++; sel = null;
        $('#on-status').textContent = '消除一对 +1';
        render();
        if (tiles.every(v => v === -1)) return finish();
        turn = 'ai'; render(); aiMove();
      } else {
        sel = i; $('#on-status').textContent = '路径不通，请重选'; render();
      }
    }
    function aiMove() {
      if (over) return;
      const pairs = allValidPairs();
      let pick = null;
      if (!pairs.length) {
        $('#on-status').textContent = `${peerName()}无可消对，跳过`; turn = 'me'; render(); return;
      }
      if (diff === 'easy') pick = choice(pairs);
      else if (diff === 'medium') pick = choice(pairs);
      else { pick = choice(pairs); }
      tiles[pick[0]] = -1; tiles[pick[1]] = -1; scorePeer++;
      $('#on-status').textContent = `${peerName()}消除一对 +1`;
      render();
      if (tiles.every(v => v === -1)) return finish();
      turn = 'me'; render();
    }
    function finish() {
      over = true;
      const out = scoreMe > scorePeer ? 'win' : scoreMe < scorePeer ? 'lose' : 'draw';
      $('#on-status').textContent = `结束！我方 ${scoreMe} : ${scorePeer} ${peerName()} → ${out === 'win' ? '你胜' : out === 'lose' ? '你负' : '平局'}`;
      recordResult('连连看', diff, out, scoreMe, scorePeer);
    }
  }

  /* ==================== 4. 你画我猜（回合制） ==================== */
  function openDrawGuess(diff) {
    const WORDS = {
      easy: ['苹果','太阳','月亮','猫咪','小狗','花朵','雨伞','帽子','房子','大树','小鱼','钟表'],
      medium: ['钢琴','风筝','蝴蝶','彩虹','望远镜','宇航员','潜水艇','长城','吉他','火锅','机器人','滑板'],
      hard: ['量子物理','蒙娜丽莎','银河系','人工智能','丝绸之路','交响乐','拓扑学','光合作用','黑洞','元宇宙','哲学','基因编辑']
    };
    // 用户自定义词库优先；不足 4 个时用当前难度内置词补足选项
    const customWords = (Core.State.data.drawGuessWords || []).map(w => w.trim()).filter(Boolean);
    const pool = customWords.length ? customWords.concat(WORDS[diff].filter(w => !customWords.includes(w))) : WORDS[diff];
    // 谜底优先取自用户自定义词；自定义词不足 4 个时选项用内置词补足
    const secretPool = customWords.length ? customWords : WORDS[diff];
    const ROUNDS = 6;
    let round = 0, scoreMe = 0, scorePeer = 0, over = false;
    let secret = null, options = [], drawer = 'me', canvasCtx = null, drawing = false;

    const { overlay, close } = UI.modal({
      title: `你画我猜 · ${diffLabel(diff)} (共${ROUNDS}轮)`,
      body: `
        <div class="f6-score-row">
          <span class="f6-score me">我方 <b id="dg-me">0</b></span>
          <span id="dg-round">轮 1/${ROUNDS} · 你画${esc(peerName())}猜</span>
          <span class="f6-score peer">${esc(peerName())} <b id="dg-peer">0</b></span>
        </div>
        <div class="f6-dg-secret" id="dg-secret"></div>
        <canvas class="f6-canvas" id="dg-canvas" width="360" height="240"></canvas>
        <div class="f6-dg-opts" id="dg-opts"></div>
        <p style="text-align:center" id="dg-status"></p>`,
      footer: `<button class="btn-ghost" id="dg-words">⚙️ 自定义词库${customWords.length ? '(' + customWords.length + ')' : ''}</button><button class="btn-ghost" id="dg-clear">清空画板</button><button class="btn-primary" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    $('[data-close]').addEventListener('click', close);
    $('#dg-clear').addEventListener('click', () => { clearCanvas(); });
    $('#dg-words').addEventListener('click', () => {
      const wm = UI.modal({
        title: '⚙️ 你画我猜 · 自定义词库',
        body: `
          <p style="font-size:12px;color:var(--c-text-faint);margin-bottom:8px">每行一个词（也可用逗号分隔）。设置后游戏优先使用你的词；不足 4 个时用内置词补足选项。留空则恢复全内置词。</p>
          <textarea class="f2-textarea" id="dgw-area" rows="10" placeholder="苹果&#10;独角兽&#10;深夜食堂&#10;…">${esc((Core.State.data.drawGuessWords || []).join('\n'))}</textarea>`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="dgw-save">保存并应用</button>`,
        size: 'modal-lg'
      });
      wm.overlay.querySelector('[data-close]').addEventListener('click', wm.close);
      wm.overlay.querySelector('#dgw-save').addEventListener('click', () => {
        const raw = wm.overlay.querySelector('#dgw-area').value;
        const words = raw.split(/[\n,，、;；]/).map(w => w.trim()).filter(Boolean).slice(0, 200);
        Core.State.data.drawGuessWords = words;
        Core.State.save();
        Core.Toast.show(words.length ? `已启用自定义词库（${words.length} 词），下一局生效` : '已清空，使用内置词库', 'success');
        wm.close();
      });
    });
    const canvas = $('#dg-canvas');
    canvasCtx = canvas.getContext('2d');
    canvasCtx.lineCap = 'round'; canvasCtx.lineWidth = 3; canvasCtx.strokeStyle = '#3a4a6b';
    function pos(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; }
    function down(e) { e.preventDefault(); drawing = true; canvasCtx.moveTo(...pos(e)); canvasCtx.beginPath(); }
    function move(e) { if (!drawing) return; e.preventDefault(); canvasCtx.lineTo(...pos(e)); canvasCtx.stroke(); }
    function up() { drawing = false; }
    canvas.addEventListener('mousedown', down); canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', up);
    function clearCanvas() { canvasCtx.clearRect(0, 0, canvas.width, canvas.height); }

    newRound();
    function newRound() {
      if (round >= ROUNDS) return finish();
      round++; drawer = round % 2 === 1 ? 'me' : 'ai';
      clearCanvas();
      secret = choice(secretPool);
      // 4 选项含 secret
      const others = pool.filter(w => w !== secret);
      const opt = [secret];
      while (opt.length < 4 && others.length) { const w = choice(others); opt.push(w); others.splice(others.indexOf(w), 1); }
      opt.sort(() => Math.random() - 0.5); options = opt;
      $('#dg-me').textContent = scoreMe; $('#dg-peer').textContent = scorePeer;
      $('#dg-round').textContent = `轮 ${round}/${ROUNDS} · ${drawer === 'me' ? '你画' + esc(peerName()) + '猜' : esc(peerName()) + '画你猜'}`;
      if (drawer === 'me') {
        $('#dg-secret').innerHTML = `你要画：<b>${esc(secret)}</b>（对方看不到）`;
        $('#dg-opts').innerHTML = `<span style="color:var(--c-text-faint)">画完后，${esc(peerName())} 将从下面选项猜：</span>` + options.map(o => `<button class="f6-dg-opt" data-o="${esc(o)}">${esc(o)}</button>`).join('');
        $('#dg-status').textContent = '尽情涂鸦，画好点选项确认对方答案';
        $('#dg-opts').querySelectorAll('.f6-dg-opt').forEach(b => b.addEventListener('click', () => playerPick(b.dataset.o)));
      } else {
        $('#dg-secret').innerHTML = `${esc(peerName())} 正在画一个词...`;
        $('#dg-opts').innerHTML = options.map(o => `<button class="f6-dg-opt" data-o="${esc(o)}">${esc(o)}</button>`).join('');
        $('#dg-status').textContent = '猜猜画的是什么？点选项作答';
        $('#dg-opts').querySelectorAll('.f6-dg-opt').forEach(b => b.addEventListener('click', () => playerPick(b.dataset.o)));
      }
    }
    function playerPick(o) {
      if (over) return;
      if (drawer === 'me') {
        // 玩家画，AI 猜：玩家点选项=认为对方会猜哪个？实际以AI判断
        aiGuess();
      } else {
        // AI 画，玩家猜
        const correct = o === secret;
        if (correct) { scoreMe++; $('#dg-status').textContent = '猜对了 +1'; }
        else { $('#dg-status').textContent = `猜错了，答案是「${secret}」`; }
        $('#dg-opts').querySelectorAll('.f6-dg-opt').forEach(b => { b.disabled = true; if (b.dataset.o === secret) b.classList.add('correct'); });
        setTimeout(newRound, 900);
      }
    }
    function aiGuess() {
      // AI 根据难度猜
      const acc = diff === 'easy' ? 0.4 : diff === 'medium' ? 0.6 : 0.85;
      const correct = Math.random() < acc;
      const guess = correct ? secret : choice(options.filter(o => o !== secret));
      if (correct) { scorePeer++; $('#dg-status').textContent = `${peerName()} 猜对「${secret}」+1`; }
      else { $('#dg-status').textContent = `${peerName()} 猜「${guess}」，错了（答案 ${secret}）`; }
      $('#dg-opts').querySelectorAll('.f6-dg-opt').forEach(b => { b.disabled = true; if (b.dataset.o === secret) b.classList.add('correct'); if (b.dataset.o === guess) b.classList.add('peer-guess'); });
      setTimeout(newRound, 1100);
    }
    function finish() {
      over = true;
      const out = scoreMe > scorePeer ? 'win' : scoreMe < scorePeer ? 'lose' : 'draw';
      $('#dg-status').textContent = `结束！我方 ${scoreMe} : ${scorePeer} ${peerName()} → ${out === 'win' ? '你胜' : out === 'lose' ? '你负' : '平局'}`;
      $('#dg-round').textContent = '已结束';
      recordResult('你画我猜', diff, out, scoreMe, scorePeer);
    }
  }

  /* ==================== 5. 2048（回合制） ==================== */
  function open2048(diff) {
    const N = 4;
    let board = [], scoreMe = 0, scorePeer = 0, turn = 'me', over = false;
    function newTile() { return Math.random() < 0.9 ? 2 : 4; }
    function spawn(b) { const e = b.map((v, i) => v ? null : i).filter(i => i !== null); if (!e.length) return false; b[choice(e)] = newTile(); return true; }
    function init() { board = Array(N * N).fill(0); spawn(board); spawn(board); }
    const idx = (r, c) => r * N + c;
    function slide(row) { const a = row.filter(x => x); let gained = 0; for (let i = 0; i < a.length - 1; i++) { if (a[i] === a[i + 1]) { a[i] *= 2; gained += a[i]; a.splice(i + 1, 1); } } while (a.length < N) a.push(0); return { row: a, gained }; }
    function move(dir) { // 0左 1右 2上 3下
      let gained = 0, moved = false; const before = [...board];
      for (let i = 0; i < N; i++) {
        let line = [];
        if (dir === 0) { for (let c = 0; c < N; c++) line.push(board[idx(i, c)]); const r = slide(line); gained += r.gained; for (let c = 0; c < N; c++) board[idx(i, c)] = r.row[c]; }
        else if (dir === 1) { for (let c = N - 1; c >= 0; c--) line.push(board[idx(i, c)]); const r = slide(line); gained += r.gained; for (let c = N - 1, k = 0; c >= 0; c--, k++) board[idx(i, c)] = r.row[k]; }
        else if (dir === 2) { for (let r = 0; r < N; r++) line.push(board[idx(r, i)]); const s = slide(line); gained += s.gained; for (let r = 0; r < N; r++) board[idx(r, i)] = s.row[r]; }
        else { for (let r = N - 1; r >= 0; r--) line.push(board[idx(r, i)]); const s = slide(line); gained += s.gained; for (let r = N - 1, k = 0; r >= 0; r--, k++) board[idx(r, i)] = s.row[k]; }
      }
      if (board.some((v, i) => v !== before[i])) moved = true;
      return { gained, moved };
    }
    function canMove() { for (let d = 0; d < 4; d++) { const b = [...board]; const t = moveOn(d, b); if (t.moved) return true; } return false; }
    function moveOn(dir, b) { const save = [...board]; board = b; const r = move(dir); board = save; return r; }
    function emptyCount(b) { return b.filter(v => !v).length; }

    const COLORS = { 0: 'rgba(255,255,255,.5)', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
    const { overlay, close } = UI.modal({
      title: `2048 · ${diffLabel(diff)}`,
      body: `
        <div class="f6-score-row">
          <span class="f6-score me">我方 <b id="g2-me">0</b></span>
          <span id="g2-turn">轮到你</span>
          <span class="f6-score peer">${esc(peerName())} <b id="g2-peer">0</b></span>
        </div>
        <div class="f6-2048" id="g2-board"></div>
        <div class="f6-2048-pad">
          <button class="f6-pad" data-d="2">↑</button>
          <div><button class="f6-pad" data-d="0">←</button><button class="f6-pad" data-d="3">↓</button><button class="f6-pad" data-d="1">→</button></div>
        </div>
        <p style="text-align:center" id="g2-status">点方向键移动（也支持键盘）</p>`,
      footer: `<button class="btn-ghost" id="g2-reset">重新开始</button><button class="btn-primary" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    $('[data-close]').addEventListener('click', close);
    $('#g2-reset').addEventListener('click', () => { init(); scoreMe = 0; scorePeer = 0; turn = 'me'; over = false; render(); });
    overlay.querySelectorAll('.f6-pad').forEach(b => b.addEventListener('click', () => playerMove(+b.dataset.d)));
    const keymap = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3 };
    function onKey(e) { if (keymap[e.key] !== undefined && turn === 'me' && !over) { e.preventDefault(); playerMove(keymap[e.key]); } }
    document.addEventListener('keydown', onKey);
    // modal 关闭时移除键盘监听
    const obs = new MutationObserver(() => { if (!document.contains(overlay)) { document.removeEventListener('keydown', onKey); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });

    init(); render();
    function render() {
      $('#g2-me').textContent = scoreMe; $('#g2-peer').textContent = scorePeer;
      $('#g2-turn').textContent = turn === 'me' ? '轮到你' : `${peerName()}回合`;
      $('#g2-board').innerHTML = board.map(v => `<div class="f6-2048-cell" style="background:${COLORS[v] || '#3c3a32'};color:${v > 4 ? '#fff' : '#776e65'}">${v || ''}</div>`).join('');
    }
    function playerMove(dir) {
      if (over || turn !== 'me') return;
      const r = move(dir);
      if (!r.moved) { $('#g2-status').textContent = '无法移动，换个方向'; return; }
      scoreMe += r.gained; spawn(board);
      $('#g2-status').textContent = r.gained ? `合并得 ${r.gained} 分` : '已移动';
      render();
      if (!canMove()) return finish();
      turn = 'ai'; render(); aiMove();
    }
    function aiMove() {
      if (over) return;
      let dir = null;
      if (diff === 'easy') { dir = rnd(4); }
      else if (diff === 'medium') { const order = [3, 0, 2, 1]; dir = choice(order); }
      else {
        let best = -1; dir = 0;
        for (let d = 0; d < 4; d++) { const b = [...board]; const t = moveOn(d, b); if (!t.moved) continue; const score = t.gained + emptyCount(b) * 2; if (score > best) { best = score; dir = d; } }
        if (best < 0) dir = rnd(4);
      }
      const r = move(dir);
      if (!r.moved) { $('#g2-status').textContent = `${peerName()}无有效移动，跳过`; turn = 'me'; render(); return; }
      scorePeer += r.gained; spawn(board);
      $('#g2-status').textContent = `${peerName()}${r.gained ? '合并得 ' + r.gained + ' 分' : '已移动'}`;
      render();
      if (!canMove()) return finish();
      turn = 'me'; render();
    }
    function finish() {
      over = true;
      const out = scoreMe > scorePeer ? 'win' : scoreMe < scorePeer ? 'lose' : 'draw';
      $('#g2-status').textContent = `结束！我方 ${scoreMe} : ${scorePeer} ${peerName()} → ${out === 'win' ? '你胜' : out === 'lose' ? '你负' : '平局'}`;
      recordResult('2048', diff, out, scoreMe, scorePeer);
    }
  }

  /* ==================== 6. 羊了个羊（回合制堆叠） ==================== */
  function openSheep(diff) {
    const STACKS = diff === 'easy' ? 3 : diff === 'medium' ? 4 : 5;
    const TILES_PER = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 10;
    const KINDS = 6;
    const SYMS = ['★','♥','◆','●','▲','✿'];
    const HAND_CAP = 7;
    let stacks = [], handMe = [], handPeer = [], clearedMe = 0, clearedPeer = 0, turn = 'me', over = false;
    function deal() {
      const total = STACKS * TILES_PER;
      const arr = []; for (let i = 0; i < total; i++) arr.push(rnd(KINDS));
      stacks = []; for (let s = 0; s < STACKS; s++) { stacks.push(arr.slice(s * TILES_PER, (s + 1) * TILES_PER)); }
    }
    function take(s) {
      if (!stacks[s].length) return null;
      return stacks[s].pop();
    }
    function addToHand(hand, tile) {
      hand.push(tile);
      // 检查同色≥3
      const cnt = hand.filter(t => t === tile).length;
      if (cnt >= 3) { hand = hand.filter(t => t !== tile); }
      return hand;
    }

    const { overlay, close } = UI.modal({
      title: `羊了个羊 · ${diffLabel(diff)} (${STACKS}堆)`,
      body: `
        <div class="f6-score-row">
          <span class="f6-score me">消 <b id="sp-me">0</b></span>
          <span id="sp-turn">轮到你</span>
          <span class="f6-score peer">${esc(peerName())}消 <b id="sp-peer">0</b></span>
        </div>
        <div class="f6-sheep" id="sp-stacks" style="grid-template-columns:repeat(${STACKS},1fr)"></div>
        <div class="f6-hands">
          <div class="f6-hand"><span>你的手牌(${HAND_CAP}上限)</span><div id="sp-hand-me"></div></div>
          <div class="f6-hand"><span>${esc(peerName())}手牌</span><div id="sp-hand-peer"><span class="f6-hand-cnt">0</span></div></div>
        </div>
        <p style="text-align:center" id="sp-status">点一堆取顶牌，手牌同色3张自动消除</p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    $('[data-close]').addEventListener('click', close);
    deal(); render();
    function render() {
      $('#sp-me').textContent = clearedMe; $('#sp-peer').textContent = clearedPeer;
      $('#sp-turn').textContent = turn === 'me' ? '轮到你' : `${peerName()}回合`;
      $('#sp-stacks').innerHTML = stacks.map((st, si) => `<button class="f6-stack" data-s="${si}" ${!st.length ? 'disabled' : ''}>${st.length ? SYMS[st[st.length - 1]] : '空'}<span class="f6-stack-cnt">${st.length}</span></button>`).join('');
      $('#sp-stacks').querySelectorAll('.f6-stack').forEach(b => b.addEventListener('click', () => click(+b.dataset.s)));
      $('#sp-hand-me').innerHTML = handMe.map(t => `<span class="f6-tile" style="color:${['#e57373','#f4a261','#f1c40f','#76c893','#5fa8d3','#b388eb'][t]}">${SYMS[t]}</span>`).join('') || '<span class="f6-tile-empty">空</span>';
      $('#sp-hand-peer').innerHTML = `<span class="f6-hand-cnt">${handPeer.length}</span>`;
    }
    function click(s) {
      if (over || turn !== 'me') return;
      const t = take(s); if (t === null) return;
      if (handMe.length >= HAND_CAP) { $('#sp-status').textContent = '你的手牌已满，失败！'; over = true; finish(); return; }
      const before = handMe.length;
      handMe = addToHand(handMe, t);
      if (handMe.length < before) { clearedMe++; $('#sp-status').textContent = `取牌触发三连消除！(${SYMS[t]})`; }
      else $('#sp-status').textContent = `你取了一张 ${SYMS[t]}`;
      render();
      if (stacks.every(st => !st.length)) return finish();
      turn = 'ai'; render(); aiMove();
    }
    function aiMove() {
      if (over) return;
      // 选堆
      let s = -1;
      const live = stacks.map((st, i) => st.length ? i : null).filter(i => i !== null);
      if (!live.length) { turn = 'me'; render(); return; }
      if (diff === 'easy') { s = choice(live); }
      else {
        // 优先选手牌中已有2张同色的堆顶
        let best = null, bestC = -1;
        for (const i of live) {
          const top = stacks[i][stacks[i].length - 1];
          const cnt = handPeer.filter(t => t === top).length;
          if (cnt > bestC && handPeer.length < HAND_CAP - 1) { bestC = cnt; best = i; }
        }
        s = best ?? choice(live);
      }
      const t = take(s);
      if (handPeer.length >= HAND_CAP) { $('#sp-status').textContent = `${peerName()}手牌已满，失败！`; over = true; finish(); return; }
      const before = handPeer.length;
      handPeer = addToHand(handPeer, t);
      if (handPeer.length < before) { clearedPeer++; $('#sp-status').textContent = `${peerName()}三连消除！(${SYMS[t]})`; }
      else $('#sp-status').textContent = `${peerName()}取了一张 ${SYMS[t]}`;
      render();
      if (stacks.every(st => !st.length)) return finish();
      turn = 'me'; render();
    }
    function finish() {
      over = true;
      let out;
      if (clearedMe > clearedPeer) out = 'win';
      else if (clearedMe < clearedPeer) out = 'lose';
      else out = 'draw';
      $('#sp-status').textContent = `结束！我方消${clearedMe}组 : ${peerName()}消${clearedPeer}组 → ${out === 'win' ? '你胜' : out === 'lose' ? '你负' : '平局'}`;
      recordResult('羊了个羊', diff, out, clearedMe, clearedPeer);
    }
  }

  /* ==================== 7. 贪吃蛇（回合制走位） ==================== */
  function openSnake(diff) {
    const N = diff === 'easy' ? 20 : diff === 'medium' ? 15 : 12;
    let me = [], peer = [], food = null, scoreMe = 0, scorePeer = 0, turn = 'me', over = false;
    const idx = (r, c) => r * N + c;
    function init() {
      me = [{ r: Math.floor(N / 2), c: Math.floor(N / 2) - 1 }];
      peer = [{ r: Math.floor(N / 2), c: Math.floor(N / 2) + 1 }];
      placeFood();
    }
    function placeFood() { let r, c; do { r = rnd(N); c = rnd(N); } while (cell(r, c) !== 0); food = { r, c }; }
    function cell(r, c) { if (r < 0 || c < 0 || r >= N || c >= N) return -1; if (me.some(s => s.r === r && s.c === c)) return 1; if (peer.some(s => s.r === r && s.c === c)) return 2; if (food && food.r === r && food.c === c) return 3; return 0; }
    function step(body, dr, dc) {
      const head = body[0];
      const nr = head.r + dr, nc = head.c + dc;
      if (cell(nr, nc) === -1) return 'wall';
      if (me.some(s => s.r === nr && s.c === nc) || peer.some(s => s.r === nr && s.c === nc)) return 'hit';
      body.unshift({ r: nr, c: nc });
      if (food && food.r === nr && food.c === nc) { placeFood(); return 'eat'; }
      body.pop(); return 'ok';
    }
    function validDirs(body) {
      const head = body[0]; const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      return dirs.filter(([dr, dc]) => { const nr = head.r + dr, nc = head.c + dc; return cell(nr, nc) === 0 || (food && food.r === nr && food.c === nc); });
    }

    const { overlay, close } = UI.modal({
      title: `贪吃蛇 · ${diffLabel(diff)} (${N}×${N})`,
      body: `
        <div class="f6-score-row">
          <span class="f6-score me">我方 <b id="sn-me">0</b></span>
          <span id="sn-turn">轮到你</span>
          <span class="f6-score peer">${esc(peerName())} <b id="sn-peer">0</b></span>
        </div>
        <div class="f6-snake" id="sn-board" style="grid-template-columns:repeat(${N},1fr)"></div>
        <div class="f6-2048-pad">
          <button class="f6-pad" data-d="U">↑</button>
          <div><button class="f6-pad" data-d="L">←</button><button class="f6-pad" data-d="D">↓</button><button class="f6-pad" data-d="R">→</button></div>
        </div>
        <p style="text-align:center" id="sn-status">你(蓝)与${esc(peerName())}(红)轮流走一步，吃食得1分，撞墙/身体则败</p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    const $ = (s) => overlay.querySelector(s);
    $('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('.f6-pad').forEach(b => b.addEventListener('click', () => playerMove(b.dataset.d)));
    const keymap = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' };
    function onKey(e) { if (keymap[e.key] && turn === 'me' && !over) { e.preventDefault(); playerMove(keymap[e.key]); } }
    document.addEventListener('keydown', onKey);
    const obs = new MutationObserver(() => { if (!document.contains(overlay)) { document.removeEventListener('keydown', onKey); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });

    init(); render();
    function render() {
      $('#sn-me').textContent = scoreMe; $('#sn-peer').textContent = scorePeer;
      $('#sn-turn').textContent = turn === 'me' ? '轮到你' : `${peerName()}回合`;
      let html = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        let cls = 'f6-snake-cell'; if (food && food.r === r && food.c === c) cls += ' food'; if (me.some(s => s.r === r && s.c === c)) cls += ' me'; if (peer.some(s => s.r === r && s.c === c)) cls += ' peer';
        html += `<div class="${cls}"></div>`;
      }
      $('#sn-board').innerHTML = html;
    }
    const DMAP = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
    function playerMove(d) {
      if (over || turn !== 'me') return;
      const [dr, dc] = DMAP[d];
      const res = step(me, dr, dc);
      if (res === 'eat') scoreMe++;
      if (res === 'wall' || res === 'hit') return finish('lose', '你撞了！');
      $('#sn-status').textContent = res === 'eat' ? '你吃到食物 +1' : '你走了一步';
      render();
      turn = 'ai'; render(); aiMove();
    }
    function aiMove() {
      if (over) return;
      let d = null;
      const dirs = validDirs(peer);
      if (diff === 'easy') { d = dirs.length ? choice(dirs) : [-1, 0]; }
      else {
        // 贪心向食物
        const head = peer[0];
        let best = null, bestDist = Infinity;
        for (const [dr, dc] of dirs) { const nr = head.r + dr, nc = head.c + dc; const dist = Math.abs(nr - food.r) + Math.abs(nc - food.c); if (dist < bestDist) { bestDist = dist; best = [dr, dc]; } }
        d = best || (dirs.length ? choice(dirs) : [-1, 0]);
      }
      const res = step(peer, d[0], d[1]);
      if (res === 'eat') scorePeer++;
      if (res === 'wall' || res === 'hit') return finish('win', `${peerName()}撞了！`);
      $('#sn-status').textContent = res === 'eat' ? `${peerName()}吃到食物 +1` : `${peerName()}走了一步`;
      render();
      // 双方都无路可走时结束
      if (!validDirs(me).length && !validDirs(peer).length) return finish('draw', '双方都无路可走');
      turn = 'me'; render();
    }
    function finish(outcome, reason) {
      over = true;
      $('#sn-status').textContent = `${reason} 我方 ${scoreMe} : ${scorePeer} ${peerName()} → ${outcome === 'win' ? '你胜' : outcome === 'lose' ? '你负' : '平局'}`;
      recordResult('贪吃蛇', diff, outcome, scoreMe, scorePeer);
    }
  }

  /* ==================== 初始化 ==================== */
  function init() {
    // 覆盖 extras.js 的 btn-game 绑定（井字棋已迁移到本面板）
    const btn = document.getElementById('btn-game');
    if (btn) {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', openGames);
    }
  }

  return { init, openGames, ensureData };
})();
