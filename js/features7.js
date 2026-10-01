/* ============ 私语 · 第九批扩展 (引用回复 / 链接分享 / 头像昵称库与提议 / 定时调度 / 媒体同步桥接) ============ */
const Features7 = (() => {
  const esc = (s) => UI.escapeHtml(String(s ?? ''));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let quoteState = null;      // { sid, mid, quote }
  let replyBar = null;
  let mediaSession = null;    // 媒体面板注册的同步会话
  let nextAt = {};            // 定时频率调度表 key -> timestamp
  let timerHandle = null;

  function ensureData() {
    const d = Core.State.data;
    d.avatarPool = Array.isArray(d.avatarPool) ? d.avatarPool : [];
    d.nickPool = Array.isArray(d.nickPool) ? d.nickPool : [];
    return d;
  }

  /* ==================== 引用回复 ==================== */
  function summaryOf(m) {
    if (!m) return '';
    if (m.type === 'image') return '[图片/表情包]';
    if (m.type === 'card' || m.type === 'invite' || m.type === 'foodOrder' || m.type === 'proposal')
      return '[' + (m.cardTitle || '卡片') + ']';
    if (m.type === 'link') return '[链接] ' + (m.title || m.url || '');
    if (m.type === 'voice') return '[语音]';
    if (m.type === 'file') return '[文件] ' + (m.name || '');
    return String(m.text || '');
  }

  function nameOf(username) {
    const me = Core.State.user.username;
    if (username === me) return Core.State.user.nickname || '我';
    return (Core.State.data.contacts || []).find(c => c.username === username)?.nickname
      || Core.Auth.getUser(username)?.nickname || username;
  }

  function startQuote(sid, mid) {
    const m = Core.State.getMessages(sid).find(x => x.id === mid);
    if (!m || m.recalled) return;
    quoteState = {
      sid, mid,
      quote: {
        mid, from: m.from, name: nameOf(m.from),
        type: m.type, text: summaryOf(m), url: m.type === 'image' ? m.url : ''
      }
    };
    showBar();
    const input = document.getElementById('message-input');
    if (input) { input.focus(); }
  }

  function takeQuote() {
    if (!quoteState) return null;
    const sid = Core.State.currentChatId;
    if (sid !== quoteState.sid) { hideBar(); quoteState = null; return null; }
    const q = quoteState.quote;
    quoteState = null;
    hideBar();
    return q;
  }

  function cancelQuote() { quoteState = null; hideBar(); }

  function showBar() {
    if (!replyBar || !quoteState) return;
    const q = quoteState.quote;
    replyBar.querySelector('[data-rq-text]').textContent = `${q.name}：${q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text}`;
    replyBar.classList.add('show');
  }
  function hideBar() { replyBar && replyBar.classList.remove('show'); }

  function quoteHtml(q) {
    if (!q) return '';
    return `<div class="bubble-quote">
      <span class="bq-bar"></span>
      <span class="bq-body"><b>${esc(q.name)}</b>：${esc(q.text || '')}</span>
    </div>`;
  }

  /* ==================== 图片放大查看 ==================== */
  function openImage(url) {
    const ov = UI.modal({
      title: '图片',
      body: `<div style="text-align:center"><img src="${esc(url)}" style="max-width:100%;max-height:65vh;border-radius:10px"></div>`,
      footer: `<a class="btn-primary" href="${esc(url)}" download target="_blank" rel="noopener" style="text-decoration:none"><i class="fas fa-download"></i> 新窗口打开</a><button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    ov.overlay.querySelector('[data-close]').addEventListener('click', ov.close);
  }

  /* ==================== 日记 / 信件全文 ==================== */
  function openDetail(detail) {
    if (!detail) return;
    const t = detail.t ? new Date(detail.t) : null;
    const ov = UI.modal({
      title: esc(detail.title || '详情'),
      body: `
        <div class="detail-meta">${esc(detail.peer || '')}${t ? ' · ' + UI.fmtTime(detail.t) : ''}</div>
        <div class="detail-body">${esc(detail.body || '').replace(/\n/g, '<br>')}</div>`,
      footer: `<button class="btn-primary" data-close>我看完了</button>`
    });
    ov.overlay.querySelector('[data-close]').addEventListener('click', ov.close);
  }

  /* ==================== 链接分享（抖音 / B站 / 小红书等） ==================== */
  const LINK_PLATFORMS = [
    { test: /(douyin\.com|iesdouyin\.com)/i, icon: 'fa-music', name: '抖音', color: '#161823' },
    { test: /(bilibili\.com|b23\.tv)/i, icon: 'fa-tv', name: '哔哩哔哩', color: '#00a1d6' },
    { test: /(xiaohongshu\.com|xhslink\.com)/i, icon: 'fa-book', name: '小红书', color: '#ff2442' },
    { test: /weibo\.(com|cn)/i, icon: 'fa-weibo', name: '微博', color: '#e6162d' },
    { test: /(youtube\.com|youtu\.be)/i, icon: 'fa-youtube', name: 'YouTube', color: '#ff0000' },
    { test: /(music\.163\.com|163cn\.tv)/i, icon: 'fa-music', name: '网易云音乐', color: '#d33a31' },
    { test: /(qq\.com|y\.qq\.com)/i, icon: 'fa-music', name: 'QQ音乐', color: '#31c27c' },
    { test: /(taobao\.com|tmall\.com)/i, icon: 'fa-bag-shopping', name: '淘宝', color: '#ff5000' },
    { test: /(jd\.com)/i, icon: 'fa-bag-shopping', name: '京东', color: '#e1251b' },
    { test: /(zhihu\.com)/i, icon: 'fa-zhihu', name: '知乎', color: '#0066ff' },
    { test: /(bilibili)/i, icon: 'fa-tv', name: '视频', color: '#00a1d6' }
  ];
  function detectPlatform(url) {
    return LINK_PLATFORMS.find(p => p.test.test(url)) || { icon: 'fa-link', name: '网页', color: '#8fa3c4' };
  }

  function openShareLink() {
    if (!Core.State.currentChatId) { Core.Toast.show('请先打开一个会话', 'error'); return; }
    const { overlay, close } = UI.modal({
      title: '🔗 分享链接',
      body: `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:10px">粘贴抖音、哔哩哔哩、小红书、微博、YouTube 等链接，以卡片形式分享给 TA。</p>
        <input type="text" id="lk-url" placeholder="https://v.douyin.com/xxxx/ 或 https://www.bilibili.com/video/BVxxxx" style="width:100%;margin-bottom:10px">
        <label class="f2-label">卡片标题（可不填，自动识别平台）</label>
        <input type="text" id="lk-title" maxlength="30" placeholder="例如：这个视频太好笑了哈哈哈" style="width:100%">
        <div id="lk-preview" style="margin-top:12px"></div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="lk-send"><i class="fas fa-paper-plane"></i> 发送</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let platform = null, host = '';
    const previewBox = overlay.querySelector('#lk-preview');
    function refreshPreview() {
      const url = overlay.querySelector('#lk-url').value.trim();
      if (!/^https?:\/\//i.test(url)) { previewBox.innerHTML = ''; platform = null; return; }
      try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { host = url; }
      platform = detectPlatform(url);
      previewBox.innerHTML = `<div class="msg-link-card" style="pointer-events:none">
        <span class="msg-link-icon" style="background:${platform.color}"><i class="fas ${platform.icon}"></i></span>
        <span class="msg-link-main">
          <span class="msg-link-title">${esc(overlay.querySelector('#lk-title').value.trim() || platform.name + '分享')}</span>
          <span class="msg-link-host">${esc(host)}</span>
        </span>
      </div>`;
    }
    overlay.querySelector('#lk-url').addEventListener('input', refreshPreview);
    overlay.querySelector('#lk-title').addEventListener('input', refreshPreview);
    overlay.querySelector('#lk-send').addEventListener('click', () => {
      const url = overlay.querySelector('#lk-url').value.trim();
      if (!/^https?:\/\//i.test(url)) { Core.Toast.show('请输入 http(s):// 开头的链接', 'error'); return; }
      if (!platform) { try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { host = url; } platform = detectPlatform(url); }
      const title = overlay.querySelector('#lk-title').value.trim() || platform.name + '分享';
      Messaging.sendMessage({ type: 'link', url, platform, host, title });
      Core.Toast.show('链接已分享', 'success');
      close();
    });
  }

  /* ==================== 头像 / 昵称库 ==================== */
  function fileToDataURL(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (!maxSize) return resolve(reader.result);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(reader.result);
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function openAvatarHub() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🖼️ 头像与昵称库',
      body: `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:10px">这里的头像和昵称都由你自己上传/填写，<b>没有系统自带头像</b>。TA 会从这里挑选并「提议」给你，你同意后才会更换；头像与昵称是分开的。</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
          <input type="file" id="avh-file" accept="image/*" hidden>
          <button class="btn-primary" id="avh-upload"><i class="fas fa-upload"></i> 上传头像图片</button>
          <button class="btn-ghost" id="avh-apply">设为我的头像</button>
        </div>
        <label class="f2-label">我的头像库（${d.avatarPool.length}）</label>
        <div class="avh-grid" id="avh-grid"></div>
        <div class="f2-divider"></div>
        <label class="f2-label">昵称库（${d.nickPool.length}）</label>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input type="text" id="avh-nick" maxlength="12" placeholder="输入一个昵称" style="flex:1">
          <button class="btn-primary" id="avh-nick-add"><i class="fas fa-plus"></i> 添加</button>
          <button class="btn-ghost" id="avh-nick-use">设为我的昵称</button>
        </div>
        <div class="f2-chip-row" id="avh-nicks"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let pickedAvatar = null, pickedNick = null;

    function render() {
      const grid = overlay.querySelector('#avh-grid');
      grid.innerHTML = d.avatarPool.length ? d.avatarPool.map(a => `
        <div class="avh-item ${pickedAvatar === a.id ? 'picked' : ''}" data-aid="${a.id}">
          <img src="${esc(a.url)}" alt="">
          <button class="avh-del" data-adel="${a.id}" title="删除"><i class="fas fa-xmark"></i></button>
        </div>`).join('')
        : '<p class="avh-empty">还没有头像，点上方按钮上传一张吧（仅保存在本机）</p>';
      const nickBox = overlay.querySelector('#avh-nicks');
      nickBox.innerHTML = d.nickPool.map(n =>
        `<button class="f2-chip selectable ${pickedNick === n.id ? 'selected' : ''}" data-nid="${n.id}">${esc(n.name)}</button>`
      ).join('') || '<span style="color:var(--c-text-faint);font-size:12px">昵称库为空</span>';

      grid.querySelectorAll('[data-aid]').forEach(el => el.addEventListener('click', (e) => {
        if (e.target.closest('[data-adel]')) return;
        pickedAvatar = el.dataset.aid === pickedAvatar ? null : el.dataset.aid;
        render();
      }));
      grid.querySelectorAll('[data-adel]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        d.avatarPool = d.avatarPool.filter(x => x.id !== b.dataset.adel);
        if (pickedAvatar === b.dataset.adel) pickedAvatar = null;
        Core.State.save(); render();
      }));
      nickBox.querySelectorAll('[data-nid]').forEach(b => b.addEventListener('click', () => {
        pickedNick = b.dataset.nid === pickedNick ? null : b.dataset.nid;
        render();
      }));
    }

    overlay.querySelector('#avh-upload').addEventListener('click', () => overlay.querySelector('#avh-file').click());
    overlay.querySelector('#avh-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { Core.Toast.show('图片不能超过 8MB', 'error'); return; }
      try {
        const url = await fileToDataURL(f, 256);
        d.avatarPool.push({ id: Core.uid(), name: f.name.replace(/\.[^.]+$/, ''), url });
        Core.State.save();
        render();
        Core.Toast.show('头像已加入头像库', 'success');
      } catch (err) { Core.Toast.show('图片读取失败', 'error'); }
      e.target.value = '';
    });
    overlay.querySelector('#avh-apply').addEventListener('click', () => {
      const a = d.avatarPool.find(x => x.id === pickedAvatar);
      if (!a) { Core.Toast.show('先在头像库里点选一张', 'error'); return; }
      applyProfile({ avatar: a.url });
      Core.Toast.show('已更换我的头像', 'success');
    });
    overlay.querySelector('#avh-nick-add').addEventListener('click', () => {
      const input = overlay.querySelector('#avh-nick');
      const name = input.value.trim();
      if (!name) { Core.Toast.show('输入昵称', 'error'); return; }
      if (d.nickPool.some(x => x.name === name)) { Core.Toast.show('昵称已存在', 'error'); return; }
      d.nickPool.push({ id: Core.uid(), name });
      Core.State.save();
      input.value = '';
      render();
    });
    overlay.querySelector('#avh-nick-use').addEventListener('click', () => {
      const n = d.nickPool.find(x => x.id === pickedNick);
      if (!n) { Core.Toast.show('先在昵称库里点选一个', 'error'); return; }
      applyProfile({ nickname: n.name });
      Core.Toast.show('已更换我的昵称', 'success');
    });
    render();
  }

  /* 三处同步：users 表 / 运行态 / data.profile + 侧栏 */
  function applyProfile(patch) {
    const user = Core.State.user;
    const users = Core.Auth.allUsers();
    if (users[user.username]) Object.assign(users[user.username], patch);
    Core.store.set(Core.KEYS.USERS, users);
    Object.assign(user, patch);
    Core.State.data.profile = Object.assign(Core.State.data.profile || {}, patch);
    Core.State.save();
    if (patch.avatar) {
      const el = document.getElementById('current-avatar');
      if (el) el.src = patch.avatar;
    }
    if (patch.nickname) {
      const el = document.getElementById('current-nickname');
      if (el) el.textContent = patch.nickname;
    }
    UI.refresh();
  }

  /* ==================== TA 提议换头像 / 昵称 ==================== */
  function sendProfileProposal(sid, peer, kind) {
    const d = ensureData();
    const now = Core.now();
    if (kind === 'avatar') {
      if (!d.avatarPool.length) return false;
      const a = pick(d.avatarPool);
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: Core.State.user.username, type: 'proposal',
        propKind: 'avatar', propValue: a.url, propStatus: null,
        cardIcon: 'fa-image', cardTitle: '🎁 TA 想给你换个头像',
        lines: ['我在你的头像库里看到这张，觉得很适合你！'],
        time: now, status: 'delivered'
      });
    } else {
      if (!d.nickPool.length) return false;
      const n = pick(d.nickPool);
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: Core.State.user.username, type: 'proposal',
        propKind: 'nickname', propValue: n.name, propStatus: null,
        cardIcon: 'fa-signature', cardTitle: '🎁 TA 想给你换个昵称',
        lines: [`我想叫你「${n.name}」，可以吗？`],
        time: now, status: 'delivered'
      });
    }
    return true;
  }

  function respondProposal(sid, mid, accepted) {
    const m = Core.State.getMessages(sid).find(x => x.id === mid);
    if (!m || m.propStatus) return;
    const me = Core.State.user.username;
    const s = Core.State.data.sessions[sid];
    const peer = s ? s.members.find(x => x !== me) : null;
    m.propStatus = accepted ? 'accepted' : 'rejected';
    Core.State.save();
    const isAvatar = m.propKind === 'avatar';
    Core.State.addMessage(sid, {
      id: Core.uid(), from: me, to: peer, type: 'text',
      text: accepted
        ? (isAvatar ? '好呀，就换成这个头像～' : `好呀，以后你就叫我「${m.propValue}」吧～`)
        : '这个我再想想，先不换啦～',
      time: Core.now(), status: 'sent'
    });
    if (accepted) {
      applyProfile(isAvatar ? { avatar: m.propValue } : { nickname: m.propValue });
      setTimeout(() => {
        Core.State.addMessage(sid, {
          id: Core.uid(), from: peer, to: me, type: 'text',
          text: isAvatar ? '好看！果然很适合你 ✨' : `好诶，「${m.propValue}」✨`,
          time: Core.now(), status: 'delivered'
        });
        if (Core.State.currentChatId === sid) UI.renderMessages(sid);
      }, 1000);
    }
    UI.renderMessages(sid);
    UI.renderSessions(document.getElementById('session-search').value);
  }

  /* ==================== 媒体同步会话桥接 ==================== */
  function registerMedia(ctx) { mediaSession = ctx; }
  function unregisterMedia(ctx) { if (mediaSession === ctx) mediaSession = null; }
  function mediaPeerTick(sid, peer) {
    if (!mediaSession) return false;
    try { mediaSession.peerTick(peer); return true; } catch (e) { return false; }
  }

  /* ==================== 定时主动调度器 ==================== */
  function rescheduleTimers() { nextAt = {}; }

  function tick() {
    const sid = Core.State.currentChatId;
    if (!sid) return;
    const s = Core.State.data.sessions[sid];
    if (!s || s.type !== 'private') { nextAt = {}; return; }
    const peer = s.members.find(x => x !== Core.State.user.username);
    const pf = Core.State.data.peerFreq || {};
    const now = Core.now();
    Object.keys(pf).forEach(key => {
      const rng = Features4.timerRange(pf[key]);
      if (!rng) { if (nextAt[key]) delete nextAt[key]; return; }
      if (nextAt[key] == null) {
        nextAt[key] = now + rng.min + Math.random() * Math.max(1, rng.max - rng.min);
        return;
      }
      if (now >= nextAt[key]) {
        nextAt[key] = now + rng.min + Math.random() * Math.max(1, rng.max - rng.min);
        if (key === 'mediaCtl') { mediaPeerTick(sid, peer); }
        else { Features4.fireProactive(key, sid, peer); }
      }
    });
  }

  /* ==================== 初始化 ==================== */
  function init() {
    ensureData();
    const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
    bind('btn-link', openShareLink);

    // 引用回复条
    const inputArea = document.querySelector('.input-area');
    if (inputArea) {
      replyBar = document.createElement('div');
      replyBar.className = 'reply-bar';
      replyBar.innerHTML = `
        <i class="fas fa-reply reply-bar-icon"></i>
        <span class="reply-bar-text" data-rq-text=""></span>
        <button class="reply-bar-close" title="取消引用"><i class="fas fa-xmark"></i></button>`;
      inputArea.insertBefore(replyBar, inputArea.querySelector('.input-row'));
      replyBar.querySelector('.reply-bar-close').addEventListener('click', cancelQuote);
    }

    if (!timerHandle) timerHandle = setInterval(tick, 1000);
  }

  return {
    init,
    startQuote, takeQuote, cancelQuote, quoteHtml,
    openImage, openDetail, openShareLink, detectPlatform,
    openAvatarHub, fileToDataURL, applyProfile,
    sendProfileProposal, respondProposal,
    registerMedia, unregisterMedia, mediaPeerTick,
    rescheduleTimers
  };
})();
