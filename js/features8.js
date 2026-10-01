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

  /* ==================== 纪念日 ==================== */
  function ensureAnniversaries(d) {
    d.anniversaries = d.anniversaries || [];
  }

  function annivDays(a) {
    const today = new Date(); today.setHours(0,0,0,0);
    const [y, m, d] = a.date.split('-').map(Number);
    const target = new Date(y, m - 1, d); target.setHours(0,0,0,0);
    if (a.annual) {
      const thisYear = new Date(today.getFullYear(), m - 1, d);
      if (a.type === 'countup') {
        // 今年纪念日若还没到，取去年；到了或过了取今年
        if (thisYear > today) thisYear.setFullYear(today.getFullYear() - 1);
        return { days: Math.floor((today - thisYear) / 86400000), label: '已过' };
      } else {
        let next = new Date(today.getFullYear(), m - 1, d);
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        return { days: Math.floor((next - today) / 86400000), label: '还有' };
      }
    } else {
      const diff = Math.floor((today - target) / 86400000);
      if (a.type === 'countup') return { days: Math.abs(diff), label: '已过' };
      if (diff >= 0) return { days: diff, label: '已过' };
      return { days: Math.abs(diff), label: '还有' };
    }
  }

  function openAnniversaries() {
    const d = ensureData();
    ensureAnniversaries(d);
    const { overlay, close } = UI.modal({
      title: '🎀 纪念日',
      body: `
        <div class="f2-chip-row" id="an-cat-chips">
          <button type="button" class="f2-chip selectable selected" data-anf="all">全部</button>
          <button type="button" class="f2-chip selectable" data-anf="countdown">⏳ 倒计时</button>
          <button type="button" class="f2-chip selectable" data-anf="countup">📅 累计</button>
        </div>
        <div class="f8-list" id="an-list"></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn-primary" id="an-add" style="flex:1"><i class="fas fa-plus"></i> 添加纪念日</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let f = 'all';
    function render() {
      const list = overlay.querySelector('#an-list');
      const items = d.anniversaries.filter(a => f === 'all' || a.type === f).sort((a, b) => {
        const da = annivDays(a), db = annivDays(b);
        return a.type === 'countdown' ? da.days - db.days : db.days - da.days;
      });
      list.innerHTML = items.length ? items.map(a => {
        const { days, label } = annivDays(a);
        const badgeColor = a.type === 'countdown' ? (days <= 7 ? 'var(--c-red,#e07a7a)' : days <= 30 ? '#e0a878' : 'var(--c-green,#82b894)') : 'var(--c-accent-deep)';
        return `
        <div class="f8-insp">
          <div class="f8-insp-main">
            <div class="f8-note-body">${esc(a.icon || '💝')} ${esc(a.title)}</div>
            <div class="f8-note-head">
              <span style="display:inline-flex;align-items:center;gap:6px">
                <span style="font-size:22px;font-weight:700;color:${badgeColor}">${days}</span>
                <span style="font-size:13px;color:var(--c-text-soft)">天 ${label}</span>
              </span>
              <span class="f8-note-time">${esc(a.date)}${a.annual ? '（每年）' : ''} ${a.note ? '· ' + esc(a.note) : ''}</span>
            </div>
          </div>
          <button class="icon-btn" data-asedit="${a.id}" title="编辑"><i class="fas fa-pen"></i></button>
          <button class="icon-btn" data-asend="${a.id}" title="发送到聊天"><i class="fas fa-paper-plane"></i></button>
          <button class="icon-btn f2-del" data-asdel="${a.id}" title="删除"><i class="fas fa-trash-can"></i></button>
        </div>`;
      }).join('') : '<p style="color:var(--c-text-faint);text-align:center;padding:20px 0">还没有纪念日，点击上方添加吧～</p>';

      list.querySelectorAll('[data-asedit]').forEach(b => b.addEventListener('click', () => editAnniv(b.dataset.asedit, render)));
      list.querySelectorAll('[data-asdel]').forEach(b => b.addEventListener('click', () => {
        d.anniversaries = d.anniversaries.filter(x => x.id !== b.dataset.asdel);
        Core.State.save(); render();
      }));
      list.querySelectorAll('[data-asend]').forEach(b => b.addEventListener('click', () => {
        const a = d.anniversaries.find(x => x.id === b.dataset.asend);
        if (!a) return;
        const { days, label } = annivDays(a);
        if (!requirePrivateChat()) return;
        Messaging.sendMessage({
          type: 'card', cardIcon: 'fa-calendar-heart', cardTitle: '🎀 ' + (a.type === 'countdown' ? '倒计时' : '纪念日'),
          lines: [`${esc(a.icon || '💝')} ${esc(a.title)}`, `${days} 天 ${label} · ${esc(a.date)}`],
          detail: { kind: 'anniv', title: a.title, body: a.date + (a.annual ? '（每年重复）' : '') + String.fromCharCode(10) + label + days + ' 天' + (a.note ? String.fromCharCode(10) + a.note : ''), t: Core.now() }
        });
        Core.Toast.show('纪念日已发送', 'success');
      }));
    }
    overlay.querySelector('#an-add').addEventListener('click', () => editAnniv(null, render));
    overlay.querySelector('#an-cat-chips').addEventListener('click', (e) => {
      const t = e.target.closest('[data-anf]');
      if (!t) return;
      f = t.dataset.anf;
      overlay.querySelectorAll('#an-cat-chips .f2-chip').forEach(x => x.classList.toggle('selected', x === t));
      render();
    });
    render();
  }

  function editAnniv(id, onDone) {
    const d = ensureData();
    ensureAnniversaries(d);
    const a = id ? d.anniversaries.find(x => x.id === id) : { id: Core.uid(), title: '', date: '', type: 'countup', icon: '💝', annual: true, note: '' };
    const em = UI.modal({
      title: id ? '编辑纪念日' : '添加纪念日',
      body: `
        <label class="f2-label">名称</label>
        <input type="text" id="an-title" class="f2-input" value="${esc(a.title)}" placeholder="例如：在一起、生日">
        <label class="f2-label">日期</label>
        <input type="date" id="an-date" class="f2-input" value="${esc(a.date)}">
        <label class="f2-label">图标（可留空，默认💝）</label>
        <input type="text" id="an-icon" class="f2-input" value="${esc(a.icon || '💝')}" maxlength="2" placeholder="💝">
        <label class="f2-label">类型</label>
        <div class="f2-chip-row">
          <button type="button" class="f2-chip selectable ${a.type === 'countup' ? 'selected' : ''}" data-ant="countup">📅 累计天数（从这天开始算起）</button>
          <button type="button" class="f2-chip selectable ${a.type !== 'countup' ? 'selected' : ''}" data-ant="countdown">⏳ 倒计时（距离这天还有几天）</button>
        </div>
        <label class="f2-label">是否每年重复</label>
        <div class="f2-chip-row">
          <button type="button" class="f2-chip selectable ${a.annual ? 'selected' : ''}" data-anr="1">是</button>
          <button type="button" class="f2-chip selectable ${!a.annual ? 'selected' : ''}" data-anr="0">否</button>
        </div>
        <label class="f2-label">备注（可留空）</label>
        <input type="text" id="an-note" class="f2-input" value="${esc(a.note)}" placeholder="例如：希望你永远开心">`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="an-save">保存</button>`,
      size: 'modal-lg'
    });
    let type = a.type || 'countup';
    let annual = !!a.annual;
    em.overlay.querySelector('[data-close]').addEventListener('click', em.close);
    em.overlay.querySelectorAll('[data-ant]').forEach(b => b.addEventListener('click', () => {
      type = b.dataset.ant;
      em.overlay.querySelectorAll('[data-ant]').forEach(x => x.classList.toggle('selected', x === b));
    }));
    em.overlay.querySelectorAll('[data-anr]').forEach(b => b.addEventListener('click', () => {
      annual = b.dataset.anr === '1';
      em.overlay.querySelectorAll('[data-anr]').forEach(x => x.classList.toggle('selected', x === b));
    }));
    em.overlay.querySelector('#an-save').addEventListener('click', () => {
      const title = em.overlay.querySelector('#an-title').value.trim();
      const date = em.overlay.querySelector('#an-date').value;
      const icon = em.overlay.querySelector('#an-icon').value.trim();
      const note = em.overlay.querySelector('#an-note').value.trim();
      if (!title) { Core.Toast.show('请输入纪念日名称', 'error'); return; }
      if (!date) { Core.Toast.show('请选择日期', 'error'); return; }
      a.title = title; a.date = date; a.type = type; a.icon = icon; a.annual = annual; a.note = note;
      if (!id) d.anniversaries.unshift(a);
      Core.State.save(); em.close(); if (onDone) onDone();
      Core.Toast.show('纪念日已保存 🎀', 'success');
    });
  }

  /* ==================== 番茄钟 & 陪伴模式 ==================== */
  const POMO_SCENES = [
    { key: 'work',  name: '一起工作', icon: 'fa-briefcase' },
    { key: 'study', name: '一起学习', icon: 'fa-book-open' },
    { key: 'sport', name: '一起运动', icon: 'fa-dumbbell' },
    { key: 'rest',  name: '一起休息', icon: 'fa-couch' },
  ];
  const POMO_DEFAULT_PRESETS = [25, 45, 60];
  const POMO_BREAK_PRESETS = [5, 15];
  let pomoCtx = null; // { phase:'focus'|'break', scene, totalSec, leftSec, timer, overlay, cheerTimer, peerCtx }

  function pomoEnsure(d) {
    d.pomodoro = d.pomodoro || { presets: [...POMO_DEFAULT_PRESETS], breakPresets: [...POMO_BREAK_PRESETS], phrases: [] };
    d.pomodoro.phrases = d.pomodoro.phrases || [];
  }
  function pomoPhrases(d, scene) {
    const list = d.pomodoro.phrases.filter(p => !p.scene || p.scene === scene);
    return list.length ? list : d.pomodoro.phrases;
  }

  function openPomodoro() {
    const d = ensureData();
    pomoEnsure(d);
    const { overlay, close } = UI.modal({
      title: '🍅 番茄钟 & 陪伴模式',
      body: `
        <div class="f8-tabs">
          <button type="button" class="f8-tab selected" data-ptab="timer">⏱️ 番茄钟</button>
          <button type="button" class="f8-tab" data-ptab="companion">💞 陪伴模式</button>
          <button type="button" class="f8-tab" data-ptab="phrases">💬 鼓励文字</button>
        </div>
        <div id="pt-timer-page"></div>
        <div id="pt-companion-page" class="hidden"></div>
        <div id="pt-phrases-page" class="hidden"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', () => { pomoCtx = null; close(); });

    // 检查是否有待处理的陪伴邀请
    const pendingInv = (() => {
      const ctx = currentPeer();
      if (!ctx) return null;
      const msgs = Core.State.getMessages(ctx.sid) || [];
      return msgs.filter(m => m.type === 'invite' && m.inviteKind === 'pomo' && !m.invStatus).pop() || null;
    })();
    if (pendingInv) {
      const banner = document.createElement('div');
      banner.style.cssText = 'margin-bottom:12px;padding:10px 14px;background:rgba(214,231,250,.6);border:1px solid var(--c-accent);border-radius:12px;display:flex;align-items:center;gap:10px;font-size:13px';
      banner.innerHTML = `
        <span style="flex:1">💞 TA 邀请你开启陪伴模式</span>
        <button class="btn-primary" style="padding:5px 12px;font-size:12px" data-ivacc>同意</button>
        <button class="btn-ghost" style="padding:5px 12px;font-size:12px" data-ivrej>拒绝</button>`;
      overlay.querySelector('.modal-body')?.prepend(banner);
      banner.querySelector('[data-ivacc]').addEventListener('click', () => {
        pendingInv.invStatus = 'accepted';
        Core.State.save();
        banner.remove();
        switchTab('companion');
        Core.Toast.show('已同意，去选择场景开始陪伴吧', 'success');
      });
      banner.querySelector('[data-ivrej]').addEventListener('click', () => {
        pendingInv.invStatus = 'rejected';
        Core.State.save();
        banner.remove();
        Core.Toast.show('已拒绝邀请', 'info');
      });
    }

    function switchTab(tab) {
      overlay.querySelectorAll('[data-ptab]').forEach(b => b.classList.toggle('selected', b.dataset.ptab === tab));
      overlay.querySelector('#pt-timer-page').classList.toggle('hidden', tab !== 'timer');
      overlay.querySelector('#pt-companion-page').classList.toggle('hidden', tab !== 'companion');
      overlay.querySelector('#pt-phrases-page').classList.toggle('hidden', tab !== 'phrases');
      if (tab === 'timer') renderTimer();
      else if (tab === 'companion') renderCompanion();
      else renderPhrases();
    }
    overlay.querySelectorAll('[data-ptab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.ptab)));

    /* ---- 番茄钟页面 ---- */
    function renderTimer() {
      const page = overlay.querySelector('#pt-timer-page');
      const running = pomoCtx && pomoCtx.timer;
      page.innerHTML = `
        <div class="pomo-display ${running ? 'running' : ''}">
          <div class="pomo-time" id="pomo-time">${running ? fmtSec(pomoCtx.leftSec) : '25:00'}</div>
          <div class="pomo-phase" id="pomo-phase">${running ? (pomoCtx.phase === 'focus' ? '专注中' : '休息中') : '准备开始'}</div>
        </div>
        <div class="pomo-controls">
          ${!running ? `
            <div class="pomo-presets">
              <span class="f2-label">专注时长</span>
              <div class="f2-chip-row" id="pomo-focus-presets">
                ${d.pomodoro.presets.map(m => `<button type="button" class="f2-chip selectable" data-pmin="${m}">${m}分钟</button>`).join('')}
                <button type="button" class="f2-chip selectable" data-pmin="custom">自定义</button>
              </div>
              <div id="pomo-custom-focus" class="hidden" style="display:flex;gap:8px;margin-top:8px">
                <input type="number" id="pomo-cmin" class="f2-input" min="1" max="180" placeholder="分钟" style="width:100px">
                <button class="btn-primary" id="pomo-cstart">开始</button>
              </div>
            </div>
            <div class="pomo-presets" style="margin-top:14px">
              <span class="f2-label">休息时长</span>
              <div class="f2-chip-row" id="pomo-break-presets">
                ${d.pomodoro.breakPresets.map(m => `<button type="button" class="f2-chip selectable" data-bmin="${m}">${m}分钟</button>`).join('')}
              </div>
            </div>
          ` : `
            <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
              <button class="btn-ghost" id="pomo-pause">${pomoCtx.paused ? '▶ 继续' : '⏸ 暂停'}</button>
              <button class="btn-ghost" id="pomo-stop" style="color:var(--c-red,#d4766f)">⏹ 结束</button>
            </div>
            <p class="insp-tip" style="margin-top:10px">当前场景：${POMO_SCENES.find(s => s.key === pomoCtx.scene)?.name || '自由专注'}</p>
          `}
        </div>
        <div class="pomo-history" style="margin-top:18px">
          <span class="f2-label">今日记录</span>
          <div id="pomo-today" style="font-size:13px;color:var(--c-text-soft)">暂无记录</div>
        </div>`;

      if (!running) {
        page.querySelectorAll('[data-pmin]').forEach(b => b.addEventListener('click', () => {
          if (b.dataset.pmin === 'custom') {
            page.querySelector('#pomo-custom-focus').classList.remove('hidden');
            page.querySelectorAll('[data-pmin]').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            return;
          }
          const min = parseInt(b.dataset.pmin);
          startPomodoro(min * 60, 'focus', null, overlay);
        }));
        page.querySelector('#pomo-cstart')?.addEventListener('click', () => {
          const min = parseInt(page.querySelector('#pomo-cmin').value);
          if (!min || min < 1) { Core.Toast.show('请输入有效分钟数', 'error'); return; }
          startPomodoro(min * 60, 'focus', null, overlay);
        });
        page.querySelectorAll('[data-bmin]').forEach(b => b.addEventListener('click', () => {
          const min = parseInt(b.dataset.bmin);
          startPomodoro(min * 60, 'break', null, overlay);
        }));
      } else {
        page.querySelector('#pomo-pause')?.addEventListener('click', () => {
          pomoCtx.paused = !pomoCtx.paused;
          page.querySelector('#pomo-pause').textContent = pomoCtx.paused ? '▶ 继续' : '⏸ 暂停';
        });
        page.querySelector('#pomo-stop')?.addEventListener('click', () => stopPomodoro(true));
      }
      updatePomoToday(page);
    }

    function updatePomoToday(page) {
      const today = new Date().toDateString();
      const recs = (d.pomodoro.history || []).filter(h => new Date(h.t).toDateString() === today);
      const el = page.querySelector('#pomo-today');
      if (!el) return;
      if (!recs.length) { el.textContent = '暂无记录'; return; }
      const focus = recs.filter(r => r.phase === 'focus').reduce((s, r) => s + r.min, 0);
      const breakM = recs.filter(r => r.phase === 'break').reduce((s, r) => s + r.min, 0);
      el.innerHTML = `专注 <b>${focus}</b> 分钟 · 休息 <b>${breakM}</b> 分钟 · 共 <b>${recs.length}</b> 次`;
    }

    /* ---- 陪伴模式页面 ---- */
    function renderCompanion() {
      const page = overlay.querySelector('#pt-companion-page');
      const running = pomoCtx && pomoCtx.timer;
      page.innerHTML = `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:12px">选择陪伴场景，TA 会在计时期间发送鼓励文字给你。</p>
        <div class="pomo-scenes">
          ${POMO_SCENES.map(s => `
            <div class="pomo-scene ${running && pomoCtx.scene === s.key ? 'active' : ''}" data-scene="${s.key}">
              <i class="fas ${s.icon}"></i>
              <span>${s.name}</span>
            </div>`).join('')}
        </div>
        ${!running ? `
          <div style="margin-top:16px">
            <span class="f2-label">陪伴时长</span>
            <div class="f2-chip-row">
              ${d.pomodoro.presets.map(m => `<button type="button" class="f2-chip selectable" data-cmin="${m}">${m}分钟</button>`).join('')}
              <button type="button" class="f2-chip selectable" data-cmin="custom">自定义</button>
            </div>
            <div id="pomo-custom-comp" class="hidden" style="display:flex;gap:8px;margin-top:8px">
              <input type="number" id="pomo-comp-min" class="f2-input" min="1" max="180" placeholder="分钟" style="width:100px">
              <button class="btn-primary" id="pomo-comp-start">开始陪伴</button>
            </div>
          </div>
        ` : `
          <div style="margin-top:16px;text-align:center">
            <p style="font-size:14px;color:var(--c-text)">正在陪伴：${POMO_SCENES.find(s => s.key === pomoCtx.scene)?.name}</p>
            <p style="font-size:13px;color:var(--c-text-soft);margin-top:6px">剩余 ${fmtSec(pomoCtx.leftSec)}</p>
          </div>
        `}`;

      page.querySelectorAll('[data-scene]').forEach(el => el.addEventListener('click', () => {
        if (running) return;
        page.querySelectorAll('[data-scene]').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
      }));
      page.querySelectorAll('[data-cmin]').forEach(b => b.addEventListener('click', () => {
        const scene = page.querySelector('[data-scene].active')?.dataset.scene;
        if (!scene) { Core.Toast.show('先选择一个陪伴场景', 'error'); return; }
        if (b.dataset.cmin === 'custom') {
          page.querySelector('#pomo-custom-comp').classList.remove('hidden');
          page.querySelectorAll('[data-cmin]').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          return;
        }
        startPomodoro(parseInt(b.dataset.cmin) * 60, 'focus', scene, overlay);
      }));
      page.querySelector('#pomo-comp-start')?.addEventListener('click', () => {
        const scene = page.querySelector('[data-scene].active')?.dataset.scene;
        if (!scene) { Core.Toast.show('先选择一个陪伴场景', 'error'); return; }
        const min = parseInt(page.querySelector('#pomo-comp-min').value);
        if (!min || min < 1) { Core.Toast.show('请输入有效分钟数', 'error'); return; }
        startPomodoro(min * 60, 'focus', scene, overlay);
      });
    }

    /* ---- 鼓励文字管理 ---- */
    function renderPhrases() {
      const page = overlay.querySelector('#pt-phrases-page');
      const list = d.pomodoro.phrases;
      page.innerHTML = `
        <label class="f2-label">添加鼓励文字（陪伴/番茄钟时 TA 会随机发送）</label>
        <textarea id="pp-text" class="f2-textarea" rows="2" maxlength="200" placeholder="例如：你做得真好，继续加油！"></textarea>
        <div style="display:flex;gap:8px;margin:8px 0">
          <select id="pp-scene" class="f2-input" style="flex:1">
            <option value="">通用（所有场景）</option>
            ${POMO_SCENES.map(s => `<option value="${s.key}">${s.name}</option>`).join('')}
          </select>
          <button class="btn-primary" id="pp-add"><i class="fas fa-plus"></i> 保存</button>
        </div>
        ${list.length ? `<div class="f8-list">${list.map(p => `
          <div class="f8-insp">
            <div class="f8-insp-main">
              <div class="f8-note-body">${esc(p.text)}</div>
              <div class="f8-note-head"><span class="insp-cat-mini">${p.scene ? POMO_SCENES.find(s => s.key === p.scene)?.name : '通用'}</span><span class="f8-note-time">${UI.fmtTime(p.t)}</span></div>
            </div>
            <button class="icon-btn f2-del" data-pdel="${p.id}" title="删除"><i class="fas fa-trash-can"></i></button>
          </div>`).join('')}</div>`
          : '<p style="color:var(--c-text-faint);text-align:center;padding:16px 0">还没有鼓励文字，添加几条吧～</p>'}`;
      page.querySelector('#pp-add').addEventListener('click', () => {
        const text = page.querySelector('#pp-text').value.trim();
        const scene = page.querySelector('#pp-scene').value;
        if (!text) { Core.Toast.show('写点鼓励的话吧', 'error'); return; }
        d.pomodoro.phrases.unshift({ id: Core.uid(), text, scene, t: Core.now() });
        Core.State.save();
        renderPhrases();
        Core.Toast.show('鼓励文字已保存 💬', 'success');
      });
      page.querySelectorAll('[data-pdel]').forEach(b => b.addEventListener('click', () => {
        d.pomodoro.phrases = d.pomodoro.phrases.filter(x => x.id !== b.dataset.pdel);
        Core.State.save();
        renderPhrases();
      }));
    }

    switchTab('timer');
  }

  function fmtSec(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function startPomodoro(totalSec, phase, scene, overlay) {
    if (pomoCtx?.timer) clearInterval(pomoCtx.timer);
    if (pomoCtx?.cheerTimer) clearInterval(pomoCtx.cheerTimer);
    pomoCtx = { phase, scene, totalSec, leftSec: totalSec, timer: null, paused: false, overlay, peerCtx: currentPeer() };

    const tick = () => {
      if (pomoCtx.paused) return;
      pomoCtx.leftSec--;
      const timeEl = pomoCtx.overlay?.querySelector('#pomo-time');
      const phaseEl = pomoCtx.overlay?.querySelector('#pomo-phase');
      if (timeEl) timeEl.textContent = fmtSec(pomoCtx.leftSec);
      if (phaseEl) phaseEl.textContent = pomoCtx.phase === 'focus' ? '专注中' : '休息中';
      if (pomoCtx.leftSec <= 0) {
        stopPomodoro(false);
        Core.Toast.show(phase === 'focus' ? '🍅 专注结束！休息一下吧' : '☕ 休息结束！', 'success');
        // 发送卡片到聊天
        if (pomoCtx.peerCtx) {
          const sceneName = POMO_SCENES.find(s => s.key === scene)?.name || (phase === 'focus' ? '专注' : '休息');
          Messaging.sendMessage({
            type: 'card', cardIcon: 'fa-stopwatch', cardTitle: phase === 'focus' ? '🍅 番茄钟完成' : '☕ 休息完成',
            lines: [`${sceneName} · ${Math.round(totalSec / 60)} 分钟`, phase === 'focus' ? '辛苦啦，记得休息～' : '休息好了，继续加油！'],
            detail: { kind: 'pomodoro', title: phase === 'focus' ? '番茄钟完成' : '休息完成', body: `${sceneName} ${Math.round(totalSec / 60)} 分钟`, t: Core.now() }
          });
        }
      }
    };
    pomoCtx.timer = setInterval(tick, 1000);

    // 陪伴模式：每 60-90 秒发一条鼓励
    if (scene && pomoCtx.peerCtx) {
      const sendCheer = () => {
        if (!pomoCtx || pomoCtx.paused || !pomoCtx.peerCtx) return;
        const d = ensureData();
        pomoEnsure(d);
        const pool = pomoPhrases(d, scene);
        if (!pool.length) return;
        const text = pick(pool).text;
        Core.State.addMessage(pomoCtx.peerCtx.sid, {
          id: Core.uid(), from: pomoCtx.peerCtx.peer, to: Core.State.user.username,
          type: 'text', text, time: Core.now(), status: 'delivered'
        });
        UI.renderMessages(pomoCtx.peerCtx.sid);
        UI.renderSessions(document.getElementById('session-search').value);
      };
      // 首次 20-40s 后，之后每 60-90s
      pomoCtx.cheerTimer = setTimeout(() => {
        sendCheer();
        pomoCtx.cheerTimer = setInterval(sendCheer, 60000 + Math.random() * 30000);
      }, 20000 + Math.random() * 20000);
    }

    // 记录
    const d = ensureData();
    pomoEnsure(d);
    d.pomodoro.history = d.pomodoro.history || [];
    d.pomodoro.history.push({ t: Core.now(), phase, min: Math.round(totalSec / 60), scene });
    Core.State.save();

    Core.Toast.show(phase === 'focus' ? '🍅 番茄钟开始' : '☕ 休息开始', 'success');
    if (overlay && document.contains(overlay)) {
      // 重新渲染当前 tab
      const activeTab = overlay.querySelector('[data-ptab].selected')?.dataset.ptab;
      if (activeTab === 'timer') {
        const page = overlay.querySelector('#pt-timer-page');
        if (page) {
          // 简单方式：直接替换为运行中界面
          page.innerHTML = `
            <div class="pomo-display running">
              <div class="pomo-time" id="pomo-time">${fmtSec(totalSec)}</div>
              <div class="pomo-phase" id="pomo-phase">专注中</div>
            </div>
            <div class="pomo-controls">
              <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
                <button class="btn-ghost" id="pomo-pause">⏸ 暂停</button>
                <button class="btn-ghost" id="pomo-stop" style="color:var(--c-red,#d4766f)">⏹ 结束</button>
              </div>
              <p class="insp-tip" style="margin-top:10px">当前场景：${POMO_SCENES.find(s => s.key === scene)?.name || '自由专注'}</p>
            </div>
            <div class="pomo-history" style="margin-top:18px">
              <span class="f2-label">今日记录</span>
              <div id="pomo-today" style="font-size:13px;color:var(--c-text-soft)">加载中…</div>
            </div>`;
          page.querySelector('#pomo-pause').addEventListener('click', () => {
            pomoCtx.paused = !pomoCtx.paused;
            page.querySelector('#pomo-pause').textContent = pomoCtx.paused ? '▶ 继续' : '⏸ 暂停';
          });
          page.querySelector('#pomo-stop').addEventListener('click', () => stopPomodoro(true));
          updatePomoToday(page);
        }
      } else if (activeTab === 'companion') {
        const page = overlay.querySelector('#pt-companion-page');
        if (page) {
          page.innerHTML = `
            <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:12px">选择陪伴场景，TA 会在计时期间发送鼓励文字给你。</p>
            <div class="pomo-scenes">
              ${POMO_SCENES.map(s => `
                <div class="pomo-scene ${scene === s.key ? 'active' : ''}" data-scene="${s.key}">
                  <i class="fas ${s.icon}"></i>
                  <span>${s.name}</span>
                </div>`).join('')}
            </div>
            <div style="margin-top:16px;text-align:center">
              <p style="font-size:14px;color:var(--c-text)">正在陪伴：${POMO_SCENES.find(s => s.key === scene)?.name}</p>
              <p style="font-size:13px;color:var(--c-text-soft);margin-top:6px">剩余 ${fmtSec(totalSec)}</p>
            </div>`;
        }
      }
    }
  }

  function stopPomodoro(manual) {
    if (!pomoCtx) return;
    if (pomoCtx.timer) { clearInterval(pomoCtx.timer); pomoCtx.timer = null; }
    if (pomoCtx.cheerTimer) { clearInterval(pomoCtx.cheerTimer); clearTimeout(pomoCtx.cheerTimer); pomoCtx.cheerTimer = null; }
    if (manual) Core.Toast.show('已结束', 'success');
    // 如果 overlay 还在，重新渲染 timer tab
    const overlay = pomoCtx.overlay;
    pomoCtx = null;
    if (overlay && document.contains(overlay)) {
      const activeTab = overlay.querySelector('[data-ptab].selected')?.dataset.ptab;
      if (activeTab === 'timer') {
        // 触发重新渲染
        const btn = overlay.querySelector('[data-ptab="timer"]');
        if (btn) btn.click();
      }
    }
  }

  /* ==================== 备忘录 ==================== */
  let memoTimer = null;

  function memoEnsure(d) {
    d.memos = d.memos || [];
  }

  function openMemos() {
    const d = ensureData();
    memoEnsure(d);
    const { overlay, close } = UI.modal({
      title: '📌 备忘录',
      body: `
        <div class="f8-tabs">
          <button type="button" class="f8-tab selected" data-mtab="list">📋 任务列表</button>
          <button type="button" class="f8-tab" data-mtab="add">➕ 添加备忘</button>
        </div>
        <div id="mm-list-page"></div>
        <div id="mm-add-page" class="hidden">
          <label class="f2-label">任务内容</label>
          <textarea id="mm-text" class="f2-textarea" rows="3" maxlength="300" placeholder="例如：下午三点开会"></textarea>
          <label class="f2-label">提醒时间（可留空）</label>
          <input type="datetime-local" id="mm-remind" class="f2-input">
          <button class="btn-primary" id="mm-save" style="width:100%;margin-top:12px"><i class="fas fa-check"></i> 保存</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function switchTab(tab) {
      overlay.querySelectorAll('[data-mtab]').forEach(b => b.classList.toggle('selected', b.dataset.mtab === tab));
      overlay.querySelector('#mm-list-page').classList.toggle('hidden', tab !== 'list');
      overlay.querySelector('#mm-add-page').classList.toggle('hidden', tab !== 'add');
      if (tab === 'list') renderList();
    }
    overlay.querySelectorAll('[data-mtab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.mtab)));

    overlay.querySelector('#mm-save').addEventListener('click', () => {
      const text = overlay.querySelector('#mm-text').value.trim();
      const remindVal = overlay.querySelector('#mm-remind').value;
      if (!text) { Core.Toast.show('写点内容吧', 'error'); return; }
      const remindAt = remindVal ? new Date(remindVal).getTime() : null;
      d.memos.unshift({ id: Core.uid(), text, done: false, remindAt, createdAt: Core.now(), alerted: false });
      Core.State.save();
      overlay.querySelector('#mm-text').value = '';
      overlay.querySelector('#mm-remind').value = '';
      switchTab('list');
      Core.Toast.show('备忘已保存 📌', 'success');
    });

    function renderList() {
      const page = overlay.querySelector('#mm-list-page');
      const list = [...d.memos].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.remindAt && b.remindAt) return a.remindAt - b.remindAt;
        if (a.remindAt) return -1;
        if (b.remindAt) return 1;
        return b.createdAt - a.createdAt;
      });
      page.innerHTML = list.length ? `<div class="f8-list">${list.map(m => {
        const timeStr = m.remindAt ? new Date(m.remindAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const overdue = m.remindAt && !m.done && m.remindAt < Date.now();
        return `
        <div class="f8-memo ${m.done ? 'done' : ''} ${overdue ? 'overdue' : ''}">
          <button class="memo-check" data-mcheck="${m.id}" title="${m.done ? '取消完成' : '完成'}">
            <i class="fas ${m.done ? 'fa-circle-check' : 'fa-circle'}"></i>
          </button>
          <div class="f8-insp-main">
            <div class="f8-note-body" style="${m.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(m.text)}</div>
            <div class="f8-note-head">
              ${timeStr ? `<span class="f8-note-time" style="${overdue ? 'color:var(--c-red,#e07a7a)' : ''}">⏰ ${timeStr}${overdue ? '（已过期）' : ''}</span>` : ''}
              <span class="f8-note-time">${UI.fmtTime(m.createdAt)}</span>
            </div>
          </div>
          <button class="icon-btn f2-del" data-mdel="${m.id}" title="删除"><i class="fas fa-trash-can"></i></button>
        </div>`;
      }).join('')}</div>`
        : '<p style="color:var(--c-text-faint);text-align:center;padding:20px 0">还没有备忘，去添加一条吧～</p>';

      page.querySelectorAll('[data-mcheck]').forEach(b => b.addEventListener('click', () => {
        const m = d.memos.find(x => x.id === b.dataset.mcheck);
        if (m) { m.done = !m.done; Core.State.save(); renderList(); }
      }));
      page.querySelectorAll('[data-mdel]').forEach(b => b.addEventListener('click', () => {
        d.memos = d.memos.filter(x => x.id !== b.dataset.mdel);
        Core.State.save(); renderList();
      }));
    }

    switchTab('list');
  }

  /* 备忘录提醒检查（每 30 秒） */
  function memoTick() {
    const d = Core.State.data;
    if (!d || !d.memos) return;
    const now = Date.now();
    d.memos.forEach(m => {
      if (!m.done && m.remindAt && !m.alerted && m.remindAt <= now) {
        m.alerted = true;
        Core.State.save();
        Core.Toast.show(`⏰ 备忘提醒：${m.text}`, 'info', 5000);
        // 如果当前在私聊，也发一条消息
        const ctx = currentPeer();
        if (ctx) {
          Core.State.addMessage(ctx.sid, {
            id: Core.uid(), from: 'system', to: Core.State.user.username,
            type: 'card', cardIcon: 'fa-bell', cardTitle: '⏰ 备忘提醒',
            lines: [m.text, new Date(m.remindAt).toLocaleString('zh-CN')],
            detail: { kind: 'memo', title: '备忘提醒', body: m.text, t: Core.now() }
          });
          UI.renderMessages(ctx.sid);
          UI.renderSessions(document.getElementById('session-search').value);
        }
      }
    });
  }

  /* ==================== 初始化 ==================== */
  function init() {
    document.getElementById('btn-note')?.addEventListener('click', openNotes);
    document.getElementById('btn-inspiration')?.addEventListener('click', openInspiration);
    document.getElementById('btn-anniv')?.addEventListener('click', openAnniversaries);
    document.getElementById('btn-pomodoro')?.addEventListener('click', openPomodoro);
    document.getElementById('btn-memo')?.addEventListener('click', openMemos);
    // 启动备忘录提醒
    memoTimer = setInterval(memoTick, 30000);
    memoTick();
  }

  return { init, openNotes, openInspiration, refreshNotes, openAnniversaries, openPomodoro, openMemos };
})();
