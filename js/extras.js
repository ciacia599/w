/* ============ 私语 · 扩展功能 (游戏 / 日记 / 信件 / 一起听歌观影读书) ============ */
const Extras = (() => {
  function init() {
    // btn-game 已由 Features6 接管
    document.getElementById('btn-diary').addEventListener('click', openDiary);
    document.getElementById('btn-letter').addEventListener('click', openLetter);
    document.getElementById('btn-listen').addEventListener('click', () => openMedia('listen'));
    document.getElementById('btn-watch').addEventListener('click', () => openMedia('watch'));
    document.getElementById('btn-read').addEventListener('click', openRead);
  }

  /* ---- 游戏：井字棋 ---- */
  function openGame() {
    let board = Array(9).fill(null);
    let turn = 'X';
    let over = false;

    const { overlay, close } = UI.modal({
      title: '小游戏 · 井字棋',
      body: `
        <p style="text-align:center;color:var(--c-text-soft)">你执 X，对方执 O。点击格子落子。</p>
        <div class="game-board" id="ttt-board">
          ${Array.from({length:9}).map((_,i) => `<div class="game-cell" data-i="${i}"></div>`).join('')}
        </div>
        <p style="text-align:center" id="ttt-status">轮到你了 (X)</p>`,
      footer: `<button class="btn-ghost" id="ttt-reset">重新开始</button><button class="btn-primary" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#ttt-reset').addEventListener('click', () => {
      board = Array(9).fill(null); turn = 'X'; over = false;
      overlay.querySelectorAll('.game-cell').forEach(c => { c.textContent = ''; c.classList.remove('x','o'); });
      overlay.querySelector('#ttt-status').textContent = '轮到你了 (X)';
    });
    overlay.querySelectorAll('.game-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const i = +cell.dataset.i;
        if (board[i] || over) return;
        board[i] = turn;
        cell.textContent = turn;
        cell.classList.add(turn.toLowerCase());
        const win = checkWin(board, turn);
        if (win) { overlay.querySelector('#ttt-status').textContent = `${turn} 获胜！`; over = true; return; }
        if (board.every(Boolean)) { overlay.querySelector('#ttt-status').textContent = '平局！'; over = true; return; }
        turn = turn === 'X' ? 'O' : 'X';
        overlay.querySelector('#ttt-status').textContent = turn === 'X' ? '轮到你了 (X)' : '对方思考中...';
        if (turn === 'O') setTimeout(() => aiMove(board, overlay), 600);
      });
    });

    function checkWin(b, t) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      return lines.some(l => l.every(i => b[i] === t));
    }
    function aiMove(b, ov) {
      const empty = b.map((v,i) => v ? null : i).filter(i => i !== null);
      if (!empty.length) return;
      // 简单 AI: 优先赢, 然后挡, 否则随机
      let move = null;
      for (const i of empty) { const t = [...b]; t[i] = 'O'; if (checkWin(t,'O')) { move = i; break; } }
      if (move === null) for (const i of empty) { const t = [...b]; t[i] = 'X'; if (checkWin(t,'X')) { move = i; break; } }
      if (move === null) move = empty[Math.floor(Math.random() * empty.length)];
      b[move] = 'O';
      const cell = ov.querySelectorAll('.game-cell')[move];
      cell.textContent = 'O'; cell.classList.add('o');
      if (checkWin(b, 'O')) { ov.querySelector('#ttt-status').textContent = 'O 获胜！'; over = true; return; }
      if (b.every(Boolean)) { ov.querySelector('#ttt-status').textContent = '平局！'; over = true; return; }
      turn = 'X';
      ov.querySelector('#ttt-status').textContent = '轮到你了 (X)';
    }
  }

  /* ---- 日记 ---- */
  function openDiary() {
    const diaries = Core.State.data.diaries || [];
    const { overlay, close } = UI.modal({
      title: '我的日记',
      body: `
        <div class="form-row">
          <input type="text" id="diary-title" placeholder="日记标题">
        </div>
        <div class="form-row">
          <textarea class="note-editor" id="diary-content" placeholder="记录此刻的心情..."></textarea>
        </div>
        <button class="btn-primary" id="diary-save"><i class="fas fa-save"></i> 保存日记</button>
        <hr style="margin:16px 0;border-color:rgba(107,130,168,.15)">
        <h4 style="margin-bottom:10px">历史日记 (${diaries.length})</h4>
        <div id="diary-list" style="max-height:240px;overflow-y:auto">
          ${diaries.slice().reverse().map(d => `
            <div style="padding:10px;background:rgba(255,255,255,.4);border-radius:10px;margin-bottom:8px;cursor:pointer" data-did="${d.id}">
              <strong>${d.title || '无标题'}</strong>
              <span style="color:var(--c-text-faint);font-size:11px;margin-left:8px">${UI.fmtTime(d.time)}</span>
              <p style="color:var(--c-text-soft);font-size:12px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.content}</p>
            </div>`).join('')}
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#diary-save').addEventListener('click', () => {
      const title = overlay.querySelector('#diary-title').value.trim();
      const content = overlay.querySelector('#diary-content').value.trim();
      if (!content) { Core.Toast.show('写点什么吧', 'error'); return; }
      Core.State.data.diaries.push({ id: Core.uid(), title, content, time: Core.now() });
      Core.State.save();
      Core.Toast.show('日记已保存', 'success');
      close();
    });
    overlay.querySelectorAll('[data-did]').forEach(el => {
      el.addEventListener('click', () => {
        const d = diaries.find(x => x.id === el.dataset.did);
        overlay.querySelector('#diary-title').value = d.title || '';
        overlay.querySelector('#diary-content').value = d.content;
      });
    });
  }

  /* ---- 写信 ---- */
  function openLetter() {
    const contacts = Core.State.data.contacts;
    const inbox = (Core.State.data.letters || []).filter(l => l.incoming).slice().reverse();
    const { overlay, close } = UI.modal({
      title: '写信',
      body: `
        <h4 style="margin:0 0 8px"><i class="fas fa-inbox"></i> 收到的信 (${inbox.length})</h4>
        <div id="letter-inbox" style="max-height:180px;overflow-y:auto;margin-bottom:14px">
          ${inbox.length ? inbox.map(l => `
            <div style="padding:10px;background:rgba(255,255,255,.4);border-radius:10px;margin-bottom:8px" data-lid="${l.id}">
              <strong><i class="fas fa-envelope-open-text"></i> ${UI.escapeHtml(l.subject || '来自TA的信')}</strong>
              <span style="color:var(--c-text-faint);font-size:11px;margin-left:8px">${UI.fmtTime(l.time)}</span>
              <p style="color:var(--c-text-soft);font-size:12px;margin-top:4px">${UI.escapeHtml(l.body)}</p>
            </div>`).join('') : '<p style="color:var(--c-text-faint);font-size:12px">还没有收到信，对方主动写信的频率可在「对方主动频率」里调高。</p>'}
        </div>
        <hr style="margin:10px 0;border-color:rgba(107,130,168,.15)">
        <h4 style="margin:0 0 8px">写一封新信</h4>
        <div class="form-row">
          <label>收信人</label>
          <select id="letter-to">
            ${contacts.map(c => `<option value="${c.username}">${c.nickname || c.username}</option>`).join('') || '<option value="">请先添加联系人</option>'}
          </select>
        </div>
        <div class="form-row">
          <label>主题</label>
          <input type="text" id="letter-subject" placeholder="信件主题">
        </div>
        <div class="form-row">
          <textarea class="note-editor" id="letter-body" placeholder="展信佳..."></textarea>
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="letter-send"><i class="fas fa-paper-plane"></i> 寄出</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('#letter-inbox [data-lid]').forEach(el => el.addEventListener('click', () => {
      const l = inbox.find(x => x.id === el.dataset.lid);
      l.read = true; Core.State.save();
      const v = UI.modal({
        title: l.subject || '来自TA的信',
        body: `<p style="line-height:1.9;white-space:pre-wrap">${UI.escapeHtml(l.body)}</p><p style="text-align:right;color:var(--c-text-faint);font-size:12px;margin-top:12px">${UI.fmtTime(l.time)}</p>`,
        footer: `<button class="btn-primary" data-close2>知道了</button>`,
        size: 'modal-lg'
      });
      v.overlay.querySelector('[data-close2]').addEventListener('click', v.close);
    }));
    overlay.querySelector('#letter-send').addEventListener('click', () => {
      const to = overlay.querySelector('#letter-to').value;
      const subject = overlay.querySelector('#letter-subject').value.trim();
      const body = overlay.querySelector('#letter-body').value.trim();
      if (!to || !body) { Core.Toast.show('请填写收信人和内容', 'error'); return; }
      Core.State.data.letters.push({ id: Core.uid(), to, subject, body, time: Core.now(), read: false });
      Core.State.save();
      // 在聊天中发送信件卡片
      const sid = Core.State.getOrCreateSession(to, 'private');
      Messaging.sendMessage({ type: 'text', text: `📨 给你写了一封信：《${subject || '无题'}》`, to });
      Core.Toast.show('信件已寄出', 'success');
      close();
    });
  }

  /* ---- 同步互动通用：当前私聊对象 / 频率选择 ---- */
  function currentPeerInfo() {
    const sid = Core.State.currentChatId;
    if (!sid) return null;
    const s = Core.State.data.sessions[sid];
    if (!s || s.type !== 'private') return null;
    const username = s.members.find(x => x !== Core.State.user.username);
    const c = (Core.State.data.contacts || []).find(x => x.username === username);
    return { sid, username, name: c?.nickname || Core.Auth.getUser(username)?.nickname || username };
  }

  const FREQ_OPTIONS = [
    { label: '关闭', val: 'off' },
    { label: '15~30秒', val: 'timer:15000:30000' },
    { label: '30秒~2分', val: 'timer:30000:120000' },
    { label: '1~5分', val: 'timer:60000:300000' },
    { label: '5~15分', val: 'timer:300000:900000' }
  ];

  const PEER_MEDIA_LINES = {
    listen: ['这首好好听，你听到副歌了吗？', '把音量调大一点～', '想和你一起听一辈子的歌。', '这句歌词好像在说我们。', '先别切，让这首放完嘛～', '我跟着哼了一路，哈哈。'],
    watch:  ['这个镜头绝了！', '等我一下，倒回去重看这一段。', '要不要开 1.5 倍速？节奏有点慢。', '暂停暂停，我去倒杯水～', '哈哈哈哈你看到了吗！', '关灯看更有氛围。'],
    read:   ['这一段写得真好，我划线了。', '翻到下一页了吗？', '我读得慢，等我一下下。', '这本书值得慢慢看。', '要不要自动翻页？我可以帮你控制速度。', '看到这页突然想起你。']
  };
  const escHtml = (s) => UI.escapeHtml(String(s ?? ''));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---- 一起听歌 / 观影（可同步互动） ---- */
  function openMedia(kind) {
    const isListen = kind === 'listen';
    const title = isListen ? '一起听歌' : '一起观影';
    const peerInfo = currentPeerInfo();
    const playlist = [];
    let cur = -1;
    let nativeEl = null;

    const { overlay, close } = UI.modal({
      title: '🎧 ' + title + (peerInfo ? ' · 与 ' + peerInfo.name + ' 同步' : ''),
      body: `
        <p style="color:var(--c-text-soft);margin-bottom:10px">上传${isListen ? '音频' : '视频'}或粘贴链接加入播放列表。${peerInfo ? '<b>' + escHtml(peerInfo.name) + '</b> 会在这里和你说话，并能控制播放、上一首/下一首、倍速和快进快退。' : '打开一个私聊会话后即可与 TA 同步互动。'}</p>
        <div class="media-player" id="media-player">
          <p style="text-align:center;color:var(--c-text-faint);padding:20px">还没有加载内容</p>
        </div>
        <div id="ms-track" class="ms-track"></div>
        <div class="ms-ctl-row" id="ms-ctl">
          <button class="f2-chip" data-act="prev" title="上一首"><i class="fas fa-backward-step"></i></button>
          <button class="f2-chip" data-act="playpause" title="播放/暂停"><i class="fas fa-play"></i></button>
          <button class="f2-chip" data-act="next" title="下一首"><i class="fas fa-forward-step"></i></button>
          <span class="ms-sep"></span>
          <button class="f2-chip" data-act="back" title="后退15秒"><i class="fas fa-rotate-left"></i> 15s</button>
          <button class="f2-chip" data-act="fwd" title="前进15秒">15s <i class="fas fa-rotate-right"></i></button>
          <span class="ms-sep"></span>
          <button class="f2-chip" data-rate="0.75">0.75x</button>
          <button class="f2-chip" data-rate="1">1x</button>
          <button class="f2-chip" data-rate="1.5">1.5x</button>
          <button class="f2-chip" data-rate="2">2x</button>
        </div>
        <div class="media-link-row">
          <input type="text" id="media-url" placeholder="粘贴链接 (mp3/mp4/抖音/B站/YouTube等)">
          <button class="btn-primary" id="media-load">加入列表</button>
        </div>
        <div class="media-link-row">
          <input type="file" id="media-file" accept="${isListen ? 'audio/*' : 'video/*'}">
        </div>
        <div class="ms-sync-head">
          <div class="ms-sync-title"><i class="fas fa-comments"></i> 同步互动${peerInfo ? '（TA 主动频率）' : ''}</div>
          ${peerInfo ? `<select id="ms-freq" class="ms-freq-select">
            ${FREQ_OPTIONS.map(o => `<option value="${o.val}">${o.label}</option>`).join('')}
          </select>` : ''}
        </div>
        <div class="ms-feed" id="ms-feed"></div>
        <div class="ms-input-row">
          <input type="text" id="ms-say" maxlength="60" placeholder="在这里和 TA 聊正在看的内容…">
          <button class="btn-primary" id="ms-send">发送</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    const feed = overlay.querySelector('#ms-feed');
    const sayInput = overlay.querySelector('#ms-say');
    function addFeed(who, text) {
      const name = who === 'peer' ? escHtml(peerInfo?.name || 'TA') : who === 'sys' ? '' : '我';
      const cls = who === 'me' ? 'me' : who === 'sys' ? 'sys' : 'peer';
      feed.insertAdjacentHTML('beforeend', who === 'sys'
        ? `<div class="ms-feed-sys">${escHtml(text)}</div>`
        : `<div class="ms-feed-row ${cls}"><span class="ms-feed-name">${name}</span><div class="ms-feed-bubble">${escHtml(text)}</div></div>`);
      feed.scrollTop = feed.scrollHeight;
    }

    function mediaHtml(u, isVideo) {
      const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
      const bili = u.match(/bilibili\.com\/video\/(BV[\w]+)/i) || u.match(/b23\.tv\/[\w]+/i);
      const biliId = u.match(/(BV[\w]+)/i);
      const netease = u.match(/music\.163\.com\/(?:#\/)?song\?id=(\d+)/) || u.match(/music\.163\.com\/(?:#\/)?song\/(\d+)/);
      const qqmusic = u.match(/y\.qq\.com\/.*?[?&]id=(\d+)/);
      const direct = /\.(mp3|wav|ogg|m4a|aac|mp4|webm|mov|m3u8)(\?.*)?$/i.test(u);
      if (yt) return { html: `<iframe src="https://www.youtube.com/embed/${yt[1]}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px"></iframe>`, name: 'YouTube', native: false };
      if (bili && biliId) return { html: `<iframe src="https://player.bilibili.com/player.html?bvid=${biliId[1]}&autoplay=0&high_quality=1" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px"></iframe>`, name: '哔哩哔哩', native: false };
      if (netease) return { html: `<iframe src="https://music.163.com/outchain/player?type=2&id=${netease[1]}&auto=0&height=90" style="width:100%;height:110px;border:0;border-radius:10px"></iframe>`, name: '网易云音乐', native: false };
      if (qqmusic) return { html: `<iframe src="https://i.y.qq.com/n2/m/outchain/player/index.html?songid=${qqmusic[1]}&ADTAG=myqq" style="width:100%;height:110px;border:0;border-radius:10px"></iframe>`, name: 'QQ音乐', native: false };
      if (direct || /^blob:|^data:/.test(u)) return {
        html: isVideo ? `<video src="${u}" controls autoplay playsinline style="width:100%;border-radius:10px"></video>`
                      : `<audio src="${u}" controls autoplay style="width:100%"></audio>`,
        name: isVideo ? '视频' : '音频', native: true
      };
      return { html: `<div style="text-align:center;padding:14px"><a href="${u}" target="_blank" rel="noopener" style="display:inline-block;padding:8px 18px;border-radius:999px;background:var(--c-accent-deep);color:#fff;text-decoration:none;font-size:13px"><i class="fas fa-arrow-up-right-from-square"></i> 新窗口打开</a><iframe src="${u}" style="width:100%;height:${isVideo ? '320px' : '120px'};border:0;border-radius:10px;margin-top:12px;background:#f5f7fa"></iframe></div>`, name: '网页', native: false };
    }

    function renderTrack() {
      nativeEl = null;
      const player = overlay.querySelector('#media-player');
      const tinfo = overlay.querySelector('#ms-track');
      if (cur < 0 || !playlist[cur]) { player.innerHTML = '<p style="text-align:center;color:var(--c-text-faint);padding:20px">还没有加载内容</p>'; tinfo.innerHTML = ''; return; }
      const t = playlist[cur];
      player.innerHTML = t.html;
      tinfo.innerHTML = `<b>${escHtml(t.title)}</b> <span style="color:var(--c-text-faint)">(${t.kindName})</span> · ${cur + 1}/${playlist.length}${t.native ? '' : ' · 网页内嵌内容，倍速/进退请在播放器内操作'}`;
      nativeEl = t.native ? player.querySelector('video,audio') : null;
    }

    function loadUrl() {
      const input = overlay.querySelector('#media-url');
      const url = input.value.trim();
      if (!url) { Core.Toast.show('请先粘贴链接', 'error'); return; }
      if (!/^(https?:|data:|blob:)/i.test(url)) { Core.Toast.show('链接需以 http(s):// 开头', 'error'); return; }
      const m = mediaHtml(url, !isListen);
      let host = url;
      try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
      playlist.push({ url, title: host, kindName: m.name, native: m.native, html: m.html });
      cur = playlist.length - 1;
      renderTrack();
      addFeed('sys', `你加入了：${host}`);
      input.value = '';
    }
    overlay.querySelector('#media-load').addEventListener('click', loadUrl);
    overlay.querySelector('#media-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); loadUrl(); } });
    overlay.querySelector('#media-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const m = mediaHtml(reader.result, !isListen);
        playlist.push({ url: reader.result, title: file.name, kindName: '本地文件', native: m.native, html: m.html });
        cur = playlist.length - 1;
        renderTrack();
        addFeed('sys', `你加入了本地文件：${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    const rateChip = (v) => overlay.querySelectorAll('[data-rate]').forEach(b => b.classList.toggle('selected', Number(b.dataset.rate) === v));
    function applyCtl(act, val) {
      if (act === 'prev' || act === 'next') {
        if (!playlist.length) return false;
        const d = act === 'prev' ? -1 : 1;
        cur = (cur + d + playlist.length) % playlist.length;
        renderTrack();
        return act === 'prev' ? '切到了上一首' : '切到了下一首';
      }
      if (!nativeEl) return null;
      if (act === 'playpause') { if (nativeEl.paused) { nativeEl.play(); return '帮你按了播放 ▶️'; } nativeEl.pause(); return '先暂停一下 ⏸️'; }
      if (act === 'back') { nativeEl.currentTime = Math.max(0, nativeEl.currentTime - 15); return '后退 15 秒'; }
      if (act === 'fwd') { nativeEl.currentTime = Math.min(nativeEl.duration || 1e9, nativeEl.currentTime + 15); return '快进 15 秒'; }
      if (act === 'rate') { nativeEl.playbackRate = val; rateChip(val); return `倍速调成 ${val}x`; }
      return null;
    }
    overlay.querySelectorAll('#ms-ctl [data-act]').forEach(b => b.addEventListener('click', () => {
      const r = applyCtl(b.dataset.act);
      if (r === null) Core.Toast.show('加载本地音频/视频后才能控制播放', 'error');
    }));
    overlay.querySelectorAll('#ms-ctl [data-rate]').forEach(b => b.addEventListener('click', () => {
      const r = applyCtl('rate', Number(b.dataset.rate));
      if (r === null) Core.Toast.show('加载本地音频/视频后才能调倍速', 'error');
    }));

    function sendMine() {
      const text = sayInput.value.trim();
      if (!text) return;
      addFeed('me', text);
      sayInput.value = '';
      // 对方简单回应
      setTimeout(() => { if (Math.random() < 0.7) addFeed('peer', pick(PEER_MEDIA_LINES[kind])); }, 900 + Math.random() * 900);
    }
    overlay.querySelector('#ms-send').addEventListener('click', sendMine);
    sayInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMine(); } });

    // 频率选择
    if (peerInfo) {
      const sel = overlay.querySelector('#ms-freq');
      sel.value = Core.State.data.peerFreq?.mediaCtl || 'off';
      sel.addEventListener('change', () => {
        Core.State.data.peerFreq = Core.State.data.peerFreq || {};
        Core.State.data.peerFreq.mediaCtl = sel.value;
        Core.State.save();
        Features4.rescheduleTimers();
        addFeed('sys', sel.value === 'off' ? '已关闭 TA 的同步互动' : 'TA 的同步互动频率已更新');
      });
    }

    // 对方动作（由定时调度器调用）
    function peerTick() {
      if (!peerInfo) return false;
      const nativeCtl = ['playpause', 'back', 'fwd'];
      const rateCtl = [['rate', 0.75], ['rate', 1], ['rate', 1.5], ['rate', 2]];
      const choices = [];
      if (playlist.length) { choices.push('prev', 'next'); if (nativeEl) choices.push(...nativeCtl, ...rateCtl); }
      const doCtl = choices.length && Math.random() < 0.45;
      if (doCtl) {
        const c = pick(choices);
        let r;
        if (Array.isArray(c)) r = applyCtl(c[0], c[1]); else r = applyCtl(c);
        if (r) addFeed('peer', r);
        return true;
      }
      addFeed('peer', pick(PEER_MEDIA_LINES[kind]));
      return true;
    }
    const ctx = { peerTick };
    if (peerInfo) Features7.registerMedia(ctx);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { Features7.unregisterMedia(ctx); } });
    // 关闭即注销
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => Features7.unregisterMedia(ctx)));
    addFeed('sys', peerInfo ? `已和 ${peerInfo.name} 进入同步${isListen ? '听歌' : '观影'}` : '同步房间（未连接私聊）');
  }

  /* ---- 一起读书（可同步翻页/调速） ---- */
  function openRead() {
    const books = Core.State.data.books || [];
    const peerInfo = currentPeerInfo();
    const { overlay, close } = UI.modal({
      title: '📖 一起读书' + (peerInfo ? ' · 与 ' + peerInfo.name + ' 同步' : ''),
      body: `
        <p style="color:var(--c-text-soft);margin-bottom:10px">上传图书文件 (txt/epub/pdf)，或从书库选择。${peerInfo ? '<b>' + escHtml(peerInfo.name) + '</b> 可以在这里和你讨论，还能帮你翻页、控制自动翻页速度。' : ''}</p>
        <div class="media-link-row" style="margin-bottom:12px">
          <input type="file" id="book-file" accept=".txt,.epub,.pdf">
          <button class="btn-primary" id="book-upload">上传到书库</button>
        </div>
        <h4 style="margin-bottom:10px">我的书库 (${books.length})</h4>
        <div id="book-list" style="max-height:260px;overflow-y:auto">
          ${books.map(b => `
            <div style="padding:12px;background:rgba(255,255,255,.4);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
              <div><i class="fas fa-book" style="color:var(--c-accent)"></i> <strong>${escHtml(b.name)}</strong> <span style="color:var(--c-text-faint);font-size:11px">${(b.size/1024).toFixed(1)}KB</span></div>
              <button class="btn-ghost" data-read="${b.id}">一起读</button>
            </div>`).join('') || '<p style="color:var(--c-text-faint)">书库为空，上传一本书开始吧～</p>'}
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#book-upload').addEventListener('click', () => {
      const file = overlay.querySelector('#book-file').files[0];
      if (!file) { Core.Toast.show('请选择文件', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        Core.State.data.books.push({ id: Core.uid(), name: file.name, size: file.size, content: reader.result });
        Core.State.save();
        Core.Toast.show('已加入书库', 'success');
        close();
        openRead();
      };
      reader.readAsDataURL(file);
    });
    overlay.querySelectorAll('[data-read]').forEach(btn => btn.addEventListener('click', () => openReader(books.find(x => x.id === btn.dataset.read), peerInfo)));
  }

  function openReader(b, peerInfo) {
    const isTxt = /\.txt$/i.test(b.name);
    let pages = [], page = 0, autoTimer = null;
    const { overlay, close } = UI.modal({
      title: '📖 ' + b.name,
      body: `
        <div class="ms-ctl-row">
          <button class="f2-chip" data-page="first"><i class="fas fa-angles-left"></i></button>
          <button class="f2-chip" data-page="prev"><i class="fas fa-chevron-left"></i> 上一页</button>
          <span id="rd-page" class="rd-page-num">第 1 页</span>
          <button class="f2-chip" data-page="next">下一页 <i class="fas fa-chevron-right"></i></button>
          <button class="f2-chip" data-page="last"><i class="fas fa-angles-right"></i></button>
          <span class="ms-sep"></span>
          <button class="f2-chip" id="rd-auto">自动翻页：关</button>
          <select id="rd-speed" class="ms-freq-select">
            <option value="15000">慢速 (15秒/页)</option>
            <option value="8000" selected>中速 (8秒/页)</option>
            <option value="4000">快速 (4秒/页)</option>
          </select>
        </div>
        <div id="rd-view" class="rd-view"></div>
        <div class="ms-sync-head">
          <div class="ms-sync-title"><i class="fas fa-comments"></i> 同步互动${peerInfo ? '（TA 主动频率）' : ''}</div>
          ${peerInfo ? `<select id="ms-freq" class="ms-freq-select">
            ${FREQ_OPTIONS.map(o => `<option value="${o.val}">${o.label}</option>`).join('')}
          </select>` : ''}
        </div>
        <div class="ms-feed" id="ms-feed"></div>
        <div class="ms-input-row">
          <input type="text" id="ms-say" maxlength="60" placeholder="聊聊读到的内容…">
          <button class="btn-primary" id="ms-send">发送</button>
        </div>`,
      footer: `<button class="btn-primary" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', () => { Features7.unregisterMedia(ctx); clearInterval(autoTimer); close(); });

    const view = overlay.querySelector('#rd-view');
    const feed = overlay.querySelector('#ms-feed');
    const sayInput = overlay.querySelector('#ms-say');
    function addFeed(who, text) {
      const name = who === 'peer' ? escHtml(peerInfo?.name || 'TA') : '我';
      const cls = who === 'me' ? 'me' : who === 'sys' ? 'sys' : 'peer';
      feed.insertAdjacentHTML('beforeend', who === 'sys'
        ? `<div class="ms-feed-sys">${escHtml(text)}</div>`
        : `<div class="ms-feed-row ${cls}"><span class="ms-feed-name">${name}</span><div class="ms-feed-bubble">${escHtml(text)}</div></div>`);
      feed.scrollTop = feed.scrollHeight;
    }

    function renderPage() {
      if (isTxt && pages.length) {
        view.innerHTML = `<div class="rd-page">${escHtml(pages[page]).replace(/\n/g, '<br>')}</div>`;
      } else {
        view.innerHTML = `<iframe src="${b.content}" id="rd-frame" style="width:100%;height:46vh;border:none;border-radius:10px;background:#fff"></iframe>`;
      }
      overlay.querySelector('#rd-page').textContent = pages.length ? `第 ${page + 1} / ${pages.length} 页` : '';
    }
    function goPage(deltaOrAbs) {
      if (!pages.length) {
        const f = overlay.querySelector('#rd-frame');
        try { f && f.contentWindow.scrollBy(0, deltaOrAbs === 'next' ? 400 : deltaOrAbs === 'prev' ? -400 : 0); } catch (e) {}
        return;
      }
      if (typeof deltaOrAbs === 'number') page = deltaOrAbs;
      else if (deltaOrAbs === 'prev') page = Math.max(0, page - 1);
      else if (deltaOrAbs === 'next') page = Math.min(pages.length - 1, page + 1);
      else if (deltaOrAbs === 'first') page = 0;
      else if (deltaOrAbs === 'last') page = pages.length - 1;
      renderPage();
    }
    overlay.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => goPage(btn.dataset.page)));
    const autoBtn = overlay.querySelector('#rd-auto');
    function setAuto(on) {
      clearInterval(autoTimer);
      autoTimer = null;
      autoBtn.textContent = '自动翻页：' + (on ? '开' : '关');
      autoBtn.classList.toggle('selected', on);
      if (on) autoTimer = setInterval(() => { if (page >= pages.length - 1) return setAuto(false); goPage('next'); }, Number(overlay.querySelector('#rd-speed').value));
    }
    autoBtn.addEventListener('click', () => setAuto(!autoTimer));
    overlay.querySelector('#rd-speed').addEventListener('change', () => { if (autoTimer) setAuto(true); });

    if (isTxt) {
      fetch(b.content).then(r => r.text()).then(txt => {
        const CHUNK = 420;
        pages = (txt.match(new RegExp('[\\s\\S]{1,' + CHUNK + '}', 'g')) || []);
        page = 0;
        renderPage();
      }).catch(() => { pages = []; renderPage(); });
    } else {
      renderPage();
    }

    function sendMine() {
      const text = sayInput.value.trim();
      if (!text) return;
      addFeed('me', text);
      sayInput.value = '';
      setTimeout(() => { if (Math.random() < 0.7) addFeed('peer', pick(PEER_MEDIA_LINES.read)); }, 900 + Math.random() * 900);
    }
    overlay.querySelector('#ms-send').addEventListener('click', sendMine);
    sayInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMine(); } });

    if (peerInfo) {
      const sel = overlay.querySelector('#ms-freq');
      sel.value = Core.State.data.peerFreq?.mediaCtl || 'off';
      sel.addEventListener('change', () => {
        Core.State.data.peerFreq = Core.State.data.peerFreq || {};
        Core.State.data.peerFreq.mediaCtl = sel.value;
        Core.State.save();
        Features4.rescheduleTimers();
      });
    }

    function peerTick() {
      if (!peerInfo) return false;
      const r = Math.random();
      if (r < 0.3 && pages.length) { goPage('prev'); addFeed('peer', '等一下，翻回上一页'); return true; }
      if (r < 0.6 && (!pages.length || page < pages.length - 1)) { goPage('next'); addFeed('peer', '我翻到下一页啦～'); return true; }
      if (r < 0.72 && pages.length) { setAuto(!autoTimer); addFeed('peer', autoTimer ? '我帮你开了自动翻页' : '自动翻页先关掉'); return true; }
      addFeed('peer', pick(PEER_MEDIA_LINES.read));
      return true;
    }
    const ctx = { peerTick };
    if (peerInfo) Features7.registerMedia(ctx);
    addFeed('sys', `已和 ${peerInfo?.name || 'TA'} 开始共读《${b.name}》`);
  }

  return { init };
})();
