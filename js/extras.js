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
    const { overlay, close } = UI.modal({
      title: '写一封信',
      body: `
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

  /* ---- 一起听歌 / 观影 ---- */
  function openMedia(kind) {
    const isListen = kind === 'listen';
    const title = isListen ? '一起听歌' : '一起观影';
    const { overlay, close } = UI.modal({
      title,
      body: `
        <p style="color:var(--c-text-soft);margin-bottom:12px">上传${isListen ? '音频' : '视频'}文件，或粘贴链接，与好友同步${isListen ? '聆听' : '观看'}。</p>
        <div class="media-player" id="media-player">
          <p style="text-align:center;color:var(--c-text-faint);padding:20px">暂无媒体</p>
        </div>
        <div class="media-link-row">
          <input type="text" id="media-url" placeholder="粘贴链接 (mp3/mp4/youtube等)">
          <button class="btn-primary" id="media-load">加载</button>
        </div>
        <div class="media-link-row">
          <input type="file" id="media-file" accept="${isListen ? 'audio/*' : 'video/*'}" style="flex:1">
        </div>
        <p style="font-size:12px;color:var(--c-text-faint);margin-top:10px">💡 支持 YouTube、哔哩哔哩、网易云/QQ音乐分享链接，以及 mp3/mp4 直链；媒体仅在本地播放。</p>
        <p id="media-tip" style="font-size:12px;margin-top:6px"></p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function renderMedia(src, isVideo) {
      const player = overlay.querySelector('#media-player');
      const tip = overlay.querySelector('#media-tip');
      const u = src.trim();
      let html = '', kindName = '';
      const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
      const bili = u.match(/bilibili\.com\/video\/(BV[\w]+)/i) || u.match(/b23\.tv\/[\w]+/i);
      const biliId = u.match(/(BV[\w]+)/i);
      const netease = u.match(/music\.163\.com\/(?:#\/)?song\?id=(\d+)/) || u.match(/music\.163\.com\/(?:#\/)?song\/(\d+)/);
      const qqmusic = u.match(/y\.qq\.com\/.*?[?&]id=(\d+)/);
      const direct = /\.(mp3|wav|ogg|m4a|aac|mp4|webm|mov|m3u8)(\?.*)?$/i.test(u);

      if (yt) {
        html = `<iframe src="https://www.youtube.com/embed/${yt[1]}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px"></iframe>`;
        kindName = 'YouTube 视频';
      } else if (bili && biliId) {
        html = `<iframe src="https://player.bilibili.com/player.html?bvid=${biliId[1]}&autoplay=0&high_quality=1" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px"></iframe>`;
        kindName = '哔哩哔哩视频';
      } else if (netease) {
        html = `<iframe src="https://music.163.com/outchain/player?type=2&id=${netease[1]}&auto=0&height=90" style="width:100%;height:110px;border:0;border-radius:10px"></iframe>`;
        kindName = '网易云音乐';
      } else if (qqmusic) {
        html = `<iframe src="https://i.y.qq.com/n2/m/outchain/player/index.html?songid=${qqmusic[1]}&ADTAG=myqq" style="width:100%;height:110px;border:0;border-radius:10px"></iframe>`;
        kindName = 'QQ音乐';
      } else if (direct || /^blob:|^data:/.test(u)) {
        html = isVideo
          ? `<video src="${u}" controls autoplay style="width:100%;border-radius:10px"></video>`
          : `<audio src="${u}" controls autoplay style="width:100%"></audio>`;
        kindName = isVideo ? '本地/直链视频' : '本地/直链音频';
      } else {
        // 其他网页链接：尝试 iframe 嵌入，失败可新窗口打开
        html = `
          <div style="text-align:center;padding:14px">
            <i class="fas fa-up-right-from-square" style="font-size:28px;color:var(--c-accent-deep)"></i>
            <p style="margin:10px 0;color:var(--c-text-soft);font-size:13px">该链接可能不允许在页面内嵌入播放，可在新窗口打开：</p>
            <a href="${u}" target="_blank" rel="noopener" style="display:inline-block;padding:8px 18px;border-radius:999px;background:var(--c-accent-deep);color:#fff;text-decoration:none;font-size:13px"><i class="fas fa-arrow-up-right-from-square"></i> 打开链接</a>
            <iframe src="${u}" style="width:100%;height:${isVideo ? '320px' : '120px'};border:0;border-radius:10px;margin-top:12px;background:#f5f7fa"></iframe>
          </div>`;
        kindName = '网页链接';
      }
      player.innerHTML = html;
      if (tip) tip.innerHTML = `<i class="fas fa-circle-check" style="color:var(--c-green)"></i> 已加载：${kindName}`;
    }

    function loadUrl() {
      const input = overlay.querySelector('#media-url');
      const url = input.value.trim();
      if (!url) { Core.Toast.show('请先粘贴链接', 'error'); return; }
      if (!/^(https?:|data:|blob:)/i.test(url)) { Core.Toast.show('链接格式不正确，需以 http(s):// 开头', 'error'); return; }
      renderMedia(url, !isListen);
    }
    overlay.querySelector('#media-load').addEventListener('click', loadUrl);
    overlay.querySelector('#media-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); loadUrl(); } });
    overlay.querySelector('#media-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => renderMedia(reader.result, !isListen);
      reader.readAsDataURL(file);
    });
  }

  /* ---- 一起读书 ---- */
  function openRead() {
    const books = Core.State.data.books || [];
    const { overlay, close } = UI.modal({
      title: '一起读书',
      body: `
        <p style="color:var(--c-text-soft);margin-bottom:12px">上传图书文件 (txt/epub/pdf)，或从书库选择。</p>
        <div class="media-link-row" style="margin-bottom:16px">
          <input type="file" id="book-file" accept=".txt,.epub,.pdf">
          <button class="btn-primary" id="book-upload">上传到书库</button>
        </div>
        <h4 style="margin-bottom:10px">我的书库 (${books.length})</h4>
        <div id="book-list" style="max-height:300px;overflow-y:auto">
          ${books.map(b => `
            <div style="padding:12px;background:rgba(255,255,255,.4);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
              <div><i class="fas fa-book" style="color:var(--c-accent)"></i> <strong>${b.name}</strong> <span style="color:var(--c-text-faint);font-size:11px">${(b.size/1024).toFixed(1)}KB</span></div>
              <button class="btn-ghost" data-read="${b.id}">阅读</button>
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
      };
      reader.readAsDataURL(file);
    });
    overlay.querySelectorAll('[data-read]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = books.find(x => x.id === btn.dataset.read);
        const v = UI.modal({
          title: b.name,
          body: `<iframe src="${b.content}" style="width:100%;height:60vh;border:none;border-radius:10px"></iframe>`,
          footer: `<button class="btn-primary" data-close>关闭</button>`,
          size: 'modal-xl'
        });
        v.overlay.querySelector('[data-close]').addEventListener('click', v.close);
      });
    });
  }

  return { init };
})();
