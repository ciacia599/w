/* ============ 私语 · 第八批扩展 (留言 / 灵感) ============ */
const Features8 = (() => {

  /* ---- 数据惰性初始化 ---- */
  function ensureData() {
    const d = Core.State.data;
    d.notes = d.notes || [];
    d.inspirations = d.inspirations || [];
    return d;
  }

  const esc = (s) => UI.escapeHtml(String(s ?? ''));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function currentPeer() {
    const sid = Core.State.currentChatId;
    if (!sid) return null;
    const s = Core.State.data.sessions[sid];
    if (!s || s.type !== 'private') return null;
    return { sid, peer: s.members.find(x => x !== Core.State.user.username) || null };
  }
  function peerName(peer) {
    return (Core.State.data.contacts || []).find(c => c.username === peer)?.nickname
      || Core.Auth.getUser(peer)?.nickname || peer;
  }
  function requirePrivateChat() {
    const ctx = currentPeer();
    if (!ctx || !ctx.peer) { Core.Toast.show('请先打开一个私聊会话', 'error'); return null; }
    return ctx;
  }

  /* ==================== 留言 ==================== */
  const NOTE_REPLY_FALLBACK = [
    '收到你的留言啦，我会慢慢看的～',
    '看到你的留言了，心里暖暖的。',
    '留言已查收，想我了就随时来找我呀。',
    '嗯！我把这句话存起来了。'
  ];
  let notesCtx = null; // 当前打开的留言箱上下文 { sid, peer, tab, overlay, render }

  function openNotes() {
    const ctx = requirePrivateChat();
    if (!ctx) return;
    const { sid, peer } = ctx;
    const { overlay, close } = UI.modal({
      title: '📝 留言箱 · ' + peerName(peer),
      body: `
        <div class="f8-tabs">
          <button type="button" class="f8-tab selected" data-ntab="inbox">📥 TA的留言 <span class="f8-badge" id="nt-unread">0</span></button>
          <button type="button" class="f8-tab" data-ntab="write">✍️ 我要留言</button>
        </div>
        <div id="nt-inbox-page"></div>
        <div id="nt-write-page" class="hidden">
          <label class="f2-label">给 TA 留句话（TA 会在聊天里收到，也会存进这个留言箱）</label>
          <textarea id="nt-text" class="f2-textarea" rows="5" maxlength="600" placeholder="例如：今晚我可能睡得晚，别等我啦～"></textarea>
          <div class="nt-count"><span id="nt-len">0</span>/600</div>
          <button class="btn-primary" id="nt-send" style="width:100%;margin-top:8px"><i class="fas fa-paper-plane"></i> 投递留言</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', () => { notesCtx = null; close(); });

    notesCtx = { sid, peer, overlay, tab: 'inbox' };

    function switchTab(tab) {
      notesCtx.tab = tab;
      overlay.querySelectorAll('[data-ntab]').forEach(b => b.classList.toggle('selected', b.dataset.ntab === tab));
      overlay.querySelector('#nt-inbox-page').classList.toggle('hidden', tab !== 'inbox');
      overlay.querySelector('#nt-write-page').classList.toggle('hidden', tab !== 'write');
      if (tab === 'inbox') renderInbox();
    }
    overlay.querySelectorAll('[data-ntab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.ntab)));

    const ta = overlay.querySelector('#nt-text');
    const lenEl = overlay.querySelector('#nt-len');
    ta.addEventListener('input', () => { lenEl.textContent = ta.value.length; });

    overlay.querySelector('#nt-send').addEventListener('click', () => {
      const body = ta.value.trim();
      if (!body) { Core.Toast.show('写点什么再投递吧', 'error'); return; }
      sendMyNote(sid, peer, body);
      ta.value = ''; lenEl.textContent = '0';
      switchTab('inbox');
    });

    function renderInbox() {
      const d = ensureData();
      const list = d.notes
        .filter(n => n.peer === peer || n.from === peer || n.to === peer)
        .sort((a, b) => b.time - a.time);
      const unread = list.filter(n => n.from === peer && !n.read).length;
      const badge = overlay.querySelector('#nt-unread');
      badge.textContent = unread;
      badge.classList.toggle('hidden', !unread);
      const me = Core.State.user.username;
      const page = overlay.querySelector('#nt-inbox-page');
      page.innerHTML = list.length ? `<div class="f8-list">${list.map(n => {
        const mine = n.from === me;
        return `
        <div class="f8-note ${mine ? 'mine' : ''} ${!mine && !n.read ? 'unread' : ''}" data-nid="${n.id}">
          <div class="f8-note-head">
            <span>${mine ? '✍️ 我留给 TA' : '📝 TA 留给我'}${!mine && !n.read ? ' <span class="f8-dot"></span>' : ''}</span>
            <span class="f8-note-time">${UI.fmtTime(n.time)}</span>
          </div>
          <div class="f8-note-body">${esc(n.body)}</div>
          <div class="f8-note-ops">
            <button class="f8-link" data-nopen="${n.id}">${n.body.length > 60 ? '展开全文' : '查看'}</button>
            <button class="f8-link f8-danger" data-ndel="${n.id}">删除</button>
          </div>
        </div>`;
      }).join('')}</div>`
        : '<p style="color:var(--c-text-faint);text-align:center;padding:20px 0">还没有留言，去给 TA 写一条吧～<br>TA 也可能在「对方主动频率」开启后主动给你留言</p>';

      page.querySelectorAll('[data-nopen]').forEach(b => b.addEventListener('click', () => {
        const n = d.notes.find(x => x.id === b.dataset.nopen);
        if (!n) return;
        if (n.from !== me && !n.read) { n.read = true; Core.State.save(); renderInbox(); }
        Features7.openDetail({ kind: 'note', title: n.from === me ? '✍️ 我的留言' : '📝 TA的留言', body: n.body, peer: n.from === me ? peerName(peer) : peerName(n.from), t: n.time });
      }));
      page.querySelectorAll('[data-ndel]').forEach(b => b.addEventListener('click', () => {
        d.notes = d.notes.filter(x => x.id !== b.dataset.ndel);
        Core.State.save();
        renderInbox();
      }));
    }

    notesCtx.render = renderInbox;
    switchTab('inbox');
  }

  /* 我给 TA 留言：存箱 + 卡片进聊天 + TA 稍后文字回复（回复也只用字卡） */
  function sendMyNote(sid, peer, body) {
    const d = ensureData();
    const now = Core.now();
    d.notes.push({ id: Core.uid(), from: Core.State.user.username, to: peer, peer, body, time: now, read: true });
    Core.State.save();
    Messaging.sendMessage({
      type: 'card', cardIcon: 'fa-note-sticky', cardTitle: '✍️ 我的留言',
      lines: [body.length > 40 ? body.slice(0, 40) + '…' : body, '点击查看全文'],
      detail: { kind: 'note', title: '✍️ 我的留言', body, peer: peerName(peer), t: now }
    });
    Core.Toast.show('留言已投递 📝', 'success');
    setTimeout(() => {
      if (Core.State.currentChatId !== sid) return;
      const pool = (typeof Features5 !== 'undefined' && Features5.cardRepliesFor) ? Features5.cardRepliesFor(peer) : [];
      const text = pool.length ? pick(pool) : pick(NOTE_REPLY_FALLBACK);
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: Core.State.user.username,
        type: 'text', text, time: Core.now(), status: 'delivered'
      });
      UI.renderMessages(sid);
      UI.renderSessions(document.getElementById('session-search').value);
    }, 1200 + Math.random() * 1300);
  }

  /* TA 主动留言到达时刷新已打开的留言箱 */
  function refreshNotes() {
    if (notesCtx && document.contains(notesCtx.overlay) && notesCtx.tab === 'inbox') {
      try { notesCtx.render(); } catch (e) {}
    }
  }

  /* ==================== 灵感 ==================== */
  const INSPIRATION_BANK = [
    { cat: '暖心', text: '给一个很久没联系的朋友发一句：突然想起你了，最近好吗？' },
    { cat: '暖心', text: '今天对遇到的第一位服务人员说声谢谢，并看着对方的眼睛微笑。' },
    { cat: '暖心', text: '给未来的自己写一张明信片，约好一年后再拆开。' },
    { cat: '暖心', text: '把今天别人夸你的一句话记下来，失落的时候翻一翻。' },
    { cat: '暖心', text: '选一首你们共同回忆的歌，分享给那个重要的人。' },
    { cat: '暖心', text: '睡前想三件今天发生的小好事，再小都算。' },
    { cat: '生活', text: '回家路上绕一条没走过的小路，留意三个以前没注意到的东西。' },
    { cat: '生活', text: '今晚给自己做一顿摆盘认真的饭，哪怕只是一碗面。' },
    { cat: '生活', text: '整理一个抽屉：扔掉三样东西，把留下的摆整齐。' },
    { cat: '生活', text: '挑一个傍晚去看日落，不带耳机，只带一杯喝的。' },
    { cat: '生活', text: '今天提前半小时睡觉，把手机放在够不到的地方。' },
    { cat: '生活', text: '学做一道新菜，把厨房弄得一团糟也没关系。' },
    { cat: '生活', text: '不带目的地坐一趟公交，在感兴趣的站下车走走。' },
    { cat: '生活', text: '给房间换个布置：移动一件家具，或添一束便宜的花。' },
    { cat: '创意', text: '用「如果颜色会说话」为开头，写十行不需要给任何人看的文字。' },
    { cat: '创意', text: '随手拍五张同一个颜色的东西，拼成一组照片。' },
    { cat: '创意', text: '用三个随机词编一个一分钟故事，讲给 TA 听。' },
    { cat: '创意', text: '画一幅只允许用三种颜色的画，主题是「今天的心情」。' },
    { cat: '创意', text: '给常用的一件物品写一段自我介绍（以它的口吻）。' },
    { cat: '创意', text: '录一段 30 秒的环境音：雨声、车流、或者你自己的哼歌声。' },
    { cat: '创意', text: '把今天梦到的、或者走神时想到的荒诞画面写成一句话。' },
    { cat: '创意', text: '用左手（非惯用手）画一幅简笔画，看看它想表达什么。' },
    { cat: '写作', text: '以「那天之后，我再没有……」为开头写一段文字，写满三行就好。' },
    { cat: '写作', text: '描写你现在窗外的声音，不许出现「好听」「安静」这类词。' },
    { cat: '写作', text: '给 10 岁的自己写一封信，告诉 TA 一件以后才会懂的事。' },
    { cat: '写作', text: '用五种感官各写一句话，描述「周末的早晨」。' },
    { cat: '写作', text: '写一段两个人久别重逢的对话，不写「好久不见」。' },
    { cat: '写作', text: '把今天最想记住的瞬间写成三行小诗，发给想分享的人。' },
    { cat: '小挑战', text: '今天主动和一位不太熟的人聊够三句话。' },
    { cat: '小挑战', text: '列出十个你欣赏自己的点，不许写「没有」。' },
    { cat: '小挑战', text: '今天做一件一直拖着的小事，只做十分钟就可以停。' },
    { cat: '小挑战', text: '用散步代替一次刷手机，出门前不带任何目的。' },
    { cat: '小挑战', text: '对镜子里的自己认真说一句鼓励的话，不许笑场。' },
    { cat: '小挑战', text: '今天尝一种没吃过的食物或饮料，写下第一口的感受。' }
  ];
  let lastInspIdx = -1;
  let inspCtx = null;

  function drawPool() {
    const d = ensureData();
    return [...INSPIRATION_BANK.map((x, i) => ({ text: x.text, cat: x.cat, mine: false, key: 'b' + i })),
            ...d.inspirations.map(x => ({ text: x.text, cat: x.cat || '我的灵感', mine: true, key: 'm' + x.id, fav: x.fav, id: x.id }))];
  }

  function openInspiration() {
    ensureData();
    const { overlay, close } = UI.modal({
      title: '💡 灵感',
      body: `
        <div class="f8-tabs">
          <button type="button" class="f8-tab selected" data-itab="draw">🎲 抽灵感</button>
          <button type="button" class="f8-tab" data-itab="mine">📚 我的灵感库 <span class="f8-badge" id="ip-count">0</span></button>
        </div>
        <div id="ip-draw-page"></div>
        <div id="ip-mine-page" class="hidden"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', () => { inspCtx = null; close(); });
    inspCtx = { overlay };

    function renderDraw() {
      const pool = drawPool();
      if (lastInspIdx < 0 || lastInspIdx >= pool.length) lastInspIdx = Math.floor(Math.random() * pool.length);
      const cur = pool[lastInspIdx];
      const page = overlay.querySelector('#ip-draw-page');
      page.innerHTML = `
        <div class="insp-hero">
          <div class="insp-cat">${esc(cur.cat)}</div>
          <div class="insp-text">${esc(cur.text)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-primary" id="ip-shuffle" style="flex:1"><i class="fas fa-shuffle"></i> 换一个</button>
          <button class="btn-ghost" id="ip-fav" title="收藏进我的灵感库"><i class="fas fa-star"></i> 收藏</button>
          <button class="btn-ghost" id="ip-send" title="发送到聊天"><i class="fas fa-paper-plane"></i></button>
        </div>
        <p class="insp-tip">抽到喜欢的灵感可以收藏；你收藏/添加的灵感以后也会被抽中。</p>`;
      overlay.querySelector('#ip-shuffle').addEventListener('click', () => {
        if (pool.length <= 1) { lastInspIdx = 0; return; }
        let n; do { n = Math.floor(Math.random() * pool.length); } while (n === lastInspIdx);
        lastInspIdx = n;
        renderDraw();
      });
      overlay.querySelector('#ip-fav').addEventListener('click', () => {
        if (cur.mine) { Core.Toast.show('这条已经在你的灵感库啦', 'success'); return; }
        saveInspiration(cur.text, cur.cat);
        Core.Toast.show('已收藏进灵感库 ⭐', 'success');
      });
      overlay.querySelector('#ip-send').addEventListener('click', () => sendInspiration(cur));
    }

    function renderMine() {
      const d = ensureData();
      const page = overlay.querySelector('#ip-mine-page');
      overlay.querySelector('#ip-count').textContent = d.inspirations.length;
      page.innerHTML = `
        <label class="f2-label">添加自己的灵感</label>
        <textarea id="ip-addtext" class="f2-textarea" rows="3" maxlength="300" placeholder="写下一个灵感、点子或想做的小事…"></textarea>
        <div style="display:flex;gap:8px;margin:8px 0">
          <input type="text" id="ip-addcat" class="f2-input" placeholder="标签（如：旅行/写作，可留空）" style="flex:1">
          <button class="btn-primary" id="ip-add"><i class="fas fa-plus"></i> 保存</button>
        </div>
        ${d.inspirations.length ? `<div class="f8-list">${d.inspirations.map(x => `
          <div class="f8-insp ${x.fav ? 'fav' : ''}">
            <div class="f8-insp-main">
              <div class="f8-note-body">${esc(x.text)}</div>
              <div class="f8-note-head"><span class="insp-cat-mini">${esc(x.cat || '我的灵感')}</span><span class="f8-note-time">${UI.fmtTime(x.t)}</span></div>
            </div>
            <button class="icon-btn" data-ifav="${x.id}" title="${x.fav ? '取消星标' : '星标'}"><i class="fas fa-star"></i></button>
            <button class="icon-btn" data-isend="${x.id}" title="发送到聊天"><i class="fas fa-paper-plane"></i></button>
            <button class="icon-btn f2-del" data-idel="${x.id}" title="删除"><i class="fas fa-trash-can"></i></button>
          </div>`).join('')}</div>`
          : '<p style="color:var(--c-text-faint);text-align:center;padding:16px 0">灵感库还是空的，抽到好灵感记得收藏～</p>'}`;
      overlay.querySelector('#ip-add').addEventListener('click', () => {
        const text = overlay.querySelector('#ip-addtext').value.trim();
        if (!text) { Core.Toast.show('先写下灵感内容', 'error'); return; }
        const cat = overlay.querySelector('#ip-addcat').value.trim();
        saveInspiration(text, cat);
        Core.Toast.show('灵感已入库 💡', 'success');
        renderMine();
      });
      page.querySelectorAll('[data-ifav]').forEach(b => b.addEventListener('click', () => {
        const x = d.inspirations.find(i => i.id === b.dataset.ifav);
        if (x) { x.fav = !x.fav; Core.State.save(); renderMine(); }
      }));
      page.querySelectorAll('[data-isend]').forEach(b => b.addEventListener('click', () => {
        const x = d.inspirations.find(i => i.id === b.dataset.isend);
        if (x) sendInspiration({ text: x.text, cat: x.cat || '我的灵感' });
      }));
      page.querySelectorAll('[data-idel]').forEach(b => b.addEventListener('click', () => {
        d.inspirations = d.inspirations.filter(i => i.id !== b.dataset.idel);
        Core.State.save();
        renderMine();
      }));
    }

    function saveInspiration(text, cat) {
      const d = ensureData();
      if (d.inspirations.some(i => i.text === text)) return;
      d.inspirations.unshift({ id: Core.uid(), text, cat: cat || '我的灵感', t: Core.now(), fav: false });
      Core.State.save();
    }
    function sendInspiration(cur) {
      if (!requirePrivateChat()) return;
      Messaging.sendMessage({
        type: 'card', cardIcon: 'fa-lightbulb', cardTitle: '💡 灵感',
        lines: [cur.text, '——' + (cur.cat || '灵感')],
        detail: { kind: 'inspiration', title: '💡 灵感 · ' + (cur.cat || ''), body: cur.text, t: Core.now() }
      });
      Core.Toast.show('灵感已发送', 'success');
    }

    overlay.querySelectorAll('[data-itab]').forEach(b => b.addEventListener('click', () => {
      const tab = b.dataset.itab;
      overlay.querySelectorAll('[data-itab]').forEach(x => x.classList.toggle('selected', x === b));
      overlay.querySelector('#ip-draw-page').classList.toggle('hidden', tab !== 'draw');
      overlay.querySelector('#ip-mine-page').classList.toggle('hidden', tab !== 'mine');
      if (tab === 'mine') renderMine();
    }));
    renderDraw();
  }

  /* ==================== 初始化 ==================== */
  function init() {
    document.getElementById('btn-note')?.addEventListener('click', openNotes);
    document.getElementById('btn-inspiration')?.addEventListener('click', openInspiration);
  }

  return { init, openNotes, openInspiration, refreshNotes };
})();
