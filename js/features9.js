/* ============ 私语 · 第九批扩展 (通知 / 电话提醒 / 后台保活 / 系统设置) ============ */
const Features9 = (() => {

  /* ---- 数据惰性初始化 ---- */
  function ensureData() {
    const d = Core.State.data;
    d.sysSettings = d.sysSettings || {};
    if (d.sysSettings.notifyMsg === undefined) d.sysSettings.notifyMsg = true;
    if (d.sysSettings.notifyCall === undefined) d.sysSettings.notifyCall = true;
    if (d.sysSettings.keepAlive === undefined) d.sysSettings.keepAlive = false;
    return d;
  }

  /* ---- 状态 ---- */
  let notifyPermission = 'default'; // default | granted | denied
  let wakeLock = null;
  let keepAliveTimer = null;

  /* ==================== 通知权限 ==================== */
  function checkNotifyPermission() {
    if (!('Notification' in window)) { notifyPermission = 'unsupported'; return notifyPermission; }
    notifyPermission = Notification.permission;
    return notifyPermission;
  }
  async function requestNotifyPermission() {
    if (!('Notification' in window)) { Core.Toast.show('当前浏览器不支持通知', 'error'); return false; }
    if (Notification.permission === 'granted') { notifyPermission = 'granted'; return true; }
    if (Notification.permission === 'denied') { notifyPermission = 'denied'; Core.Toast.show('通知权限已被拒绝，请在浏览器设置中允许', 'error'); return false; }
    const p = await Notification.requestPermission();
    notifyPermission = p;
    if (p === 'granted') { Core.Toast.show('通知已开启 🔔', 'success'); return true; }
    Core.Toast.show('通知权限未开启', 'error');
    return false;
  }

  /* ---- 发送通知 ---- */
  function notify(title, body, icon) {
    if (notifyPermission !== 'granted') return;
    try {
      new Notification(title, { body, icon: icon || undefined, silent: false });
    } catch (e) { /* Safari 部分版本可能失败 */ }
  }

  /* ==================== 消息提醒 ==================== */
  function notifyMessage(from, text) {
    const d = ensureData();
    if (!d.sysSettings.notifyMsg) return;
    if (!document.hidden) return; // 只在后台时提醒
    const peerName = (Core.State.data.contacts || []).find(c => c.username === from)?.nickname
      || Core.Auth.getUser(from)?.nickname || from;
    notify('💬 ' + peerName, text.length > 60 ? text.slice(0, 60) + '…' : text);
  }

  /* ==================== 电话提醒 ==================== */
  function notifyCall(from) {
    const d = ensureData();
    if (!d.sysSettings.notifyCall) return;
    const peerName = (Core.State.data.contacts || []).find(c => c.username === from)?.nickname
      || Core.Auth.getUser(from)?.nickname || from;
    notify('📞 视频通话邀请', peerName + ' 邀请你视频通话');
  }

  /* ==================== 后台保活 ==================== */
  async function enableKeepAlive() {
    const d = ensureData();
    if (!d.sysSettings.keepAlive) return;
    // 方式1：Wake Lock API（Chrome/Edge/Safari 16+）
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } catch (e) { /* 可能被拒绝 */ }
    }
    // 方式2：定时器保活（防止页面休眠，Safari 适用）
    if (!keepAliveTimer) {
      keepAliveTimer = setInterval(() => {
        // 空操作，仅保持 JS 事件循环活跃
        if (document.hidden) { /* 后台也保持 */ }
      }, 20000);
    }
  }
  function disableKeepAlive() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
  }
  function applyKeepAlive() {
    const d = ensureData();
    if (d.sysSettings.keepAlive) enableKeepAlive();
    else disableKeepAlive();
  }
  // 页面可见性变化时重新申请 Wake Lock
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyKeepAlive();
  });

  /* ==================== 系统设置面板 ==================== */
  function openSettings() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '⚙️ 系统设置',
      body: `
        <div class="f9-list">
          <div class="f9-item">
            <div class="f9-item-main">
              <div class="f9-item-title">🔔 后台消息提醒</div>
              <div class="f9-item-sub">页面在后台时收到消息弹出系统通知</div>
            </div>
            <button class="f9-toggle ${d.sysSettings.notifyMsg ? 'on' : ''}" data-f9="notifyMsg">
              <span class="f9-toggle-dot"></span>
            </button>
          </div>
          <div class="f9-item">
            <div class="f9-item-main">
              <div class="f9-item-title">📞 对方电话提醒</div>
              <div class="f9-item-sub">对方发起视频通话时弹出系统通知</div>
            </div>
            <button class="f9-toggle ${d.sysSettings.notifyCall ? 'on' : ''}" data-f9="notifyCall">
              <span class="f9-toggle-dot"></span>
            </button>
          </div>
          <div class="f9-item">
            <div class="f9-item-main">
              <div class="f9-item-title">🔋 后台保活</div>
              <div class="f9-item-sub">保持页面在后台持续运行（防休眠）</div>
            </div>
            <button class="f9-toggle ${d.sysSettings.keepAlive ? 'on' : ''}" data-f9="keepAlive">
              <span class="f9-toggle-dot"></span>
            </button>
          </div>
        </div>
        <p class="insp-tip" style="margin-top:14px">通知功能需要浏览器授权；后台保活在部分浏览器上可能受系统限制。</p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    overlay.querySelectorAll('[data-f9]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.f9;
        if (key === 'notifyMsg' || key === 'notifyCall') {
          if (!d.sysSettings[key]) {
            const ok = await requestNotifyPermission();
            if (!ok) return;
          }
        }
        d.sysSettings[key] = !d.sysSettings[key];
        Core.State.save();
        btn.classList.toggle('on', d.sysSettings[key]);
        if (key === 'keepAlive') applyKeepAlive();
        Core.Toast.show(d.sysSettings[key] ? '已开启' : '已关闭', 'success');
      });
    });
  }

  /* ==================== 朋友圈 ==================== */
  function momentEnsure(d) {
    d.moments = d.moments || [];
    d.momentLastSeen = d.momentLastSeen || 0;
    d.momentCover = d.momentCover || { bg: null, signature: '' };
    // 首次播种：给联系人发几条示例动态
    if (!d.momentSeeded) {
      d.momentSeeded = true;
      const contacts = (d.contacts || []).slice(0, 3);
      const seeds = [
        '今天天气真好，出去走了走，心情都变好了～',
        '刚做完一顿饭，虽然卖相一般，但味道还不错！',
        '深夜放毒：这家店的蛋糕真的绝了🍰',
        '读完了一本很喜欢的书，推荐给大家。',
        '今天也要好好加油呀，新的一周开始了！',
        '下雨了，窝在家里听音乐，好舒服。'
      ];
      const now = Date.now();
      contacts.forEach((c, i) => {
        d.moments.push({
          id: Core.uid(), from: c.username, text: seeds[i % seeds.length],
          images: [], time: now - (i + 1) * 3600 * 1000 * (3 + i),
          likes: [], comments: []
        });
      });
    }
    return d;
  }

  const PEER_MOMENT_TEXTS = [
    '今天过得好充实呀，分享一下日常～',
    '看到一朵很可爱的云，拍给你们看！',
    '突然好想吃火锅，有人约吗？',
    '今天的晚霞超美，忍不住停下来看了好久。',
    '学会了一道新菜，成就感满满！',
    '周末在家追剧，这部也太好哭了吧。',
    '早安！又是元气满满的一天☀️',
    '晚安，今天也辛苦啦，好好休息～',
    '随手拍，发现生活里的小美好。',
    '运动打卡第N天，坚持就是胜利！'
  ];
  const PEER_COMMENT_TEXTS = [
    '哈哈哈哈太真实了', '好棒呀！', '羡慕了～', '看起来好好吃',
    '加油加油💪', '今天也要开心哦', '拍得真好看！', '同感同感',
    '抱抱～', '下次一起呀！'
  ];

  function peerInfo(username) {
    const d = ensureData();
    const c = (d.contacts || []).find(x => x.username === username);
    const u = Core.Auth.getUser(username);
    return {
      name: c?.nickname || u?.nickname || username,
      avatar: c?.avatar || u?.avatar || UI.AVATARS[0]
    };
  }

  function momentTime(t) {
    const diff = Date.now() - t;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + '天前';
    return new Date(t).toLocaleDateString('zh-CN');
  }

  /* 未读数（供空间入口红点） */
  function momentUnread() {
    const d = ensureData();
    momentEnsure(d);
    const me = Core.State.user.username;
    return d.moments.filter(m => m.from !== me && m.time > (d.momentLastSeen || 0)).length;
  }

  function openMoments() {
    const d = ensureData();
    momentEnsure(d);
    const me = Core.State.user.username;
    const cover = d.momentCover || { bg: null, signature: '' };
    const coverBg = cover.bg
      ? `background-image:linear-gradient(135deg,rgba(40,50,70,.25),rgba(40,50,70,.35)),url('${cover.bg}');background-size:cover;background-position:center;`
      : '';
    const { overlay, close } = UI.modal({
      title: '',
      body: `<div class="mom-wrap">
        <div class="mom-cover" id="mom-cover" style="${coverBg}">
          <div class="mom-cover-tools">
            <button class="mom-cover-btn" id="mom-bg-btn" title="更换封面"><i class="fas fa-image"></i> 换封面</button>
            ${cover.bg ? `<button class="mom-cover-btn" id="mom-bg-reset" title="恢复默认"><i class="fas fa-rotate-left"></i></button>` : ''}
            <input type="file" id="mom-bg-file" accept="image/*" class="hidden">
          </div>
          <div class="mom-cover-info">
            <div class="mom-cover-text">
              <span class="mom-cover-name">${UI.escapeHtml(Core.State.user.nickname || me)}</span>
              <button class="mom-sign" id="mom-sign-btn" title="编辑个性签名"><i class="fas fa-pen"></i> ${cover.signature ? UI.escapeHtml(cover.signature) : '编辑个性签名'}</button>
            </div>
            <img class="mom-cover-avatar" src="${Core.State.user.avatar || UI.AVATARS[0]}" alt="">
          </div>
          <button class="mom-cam" id="mom-publish-btn" title="发布动态"><i class="fas fa-camera"></i></button>
        </div>
        <div class="mom-list" id="mom-list"></div>
      </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg',
      onClose: () => { d.momentLastSeen = Date.now(); Core.State.save(); }
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    /* ---- 更换封面背景 ---- */
    overlay.querySelector('#mom-bg-btn').addEventListener('click', () => overlay.querySelector('#mom-bg-file').click());
    overlay.querySelector('#mom-bg-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1080;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          d.momentCover.bg = cv.toDataURL('image/jpeg', 0.85);
          Core.State.save();
          const el = overlay.querySelector('#mom-cover');
          el.style.backgroundImage = `linear-gradient(135deg,rgba(40,50,70,.25),rgba(40,50,70,.35)),url('${d.momentCover.bg}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
          if (!overlay.querySelector('#mom-bg-reset')) {
            const rb = document.createElement('button');
            rb.className = 'mom-cover-btn';
            rb.id = 'mom-bg-reset';
            rb.title = '恢复默认';
            rb.innerHTML = '<i class="fas fa-rotate-left"></i>';
            rb.addEventListener('click', () => {
              d.momentCover.bg = null;
              Core.State.save();
              el.style.backgroundImage = '';
              rb.remove();
              Core.Toast.show('已恢复默认封面', 'success');
            });
            overlay.querySelector('.mom-cover-tools').appendChild(rb);
          }
          Core.Toast.show('封面已更换 🖼️', 'success');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
    overlay.querySelector('#mom-bg-reset')?.addEventListener('click', () => {
      d.momentCover.bg = null;
      Core.State.save();
      overlay.querySelector('#mom-cover').style.backgroundImage = '';
      overlay.querySelector('#mom-bg-reset')?.remove();
      Core.Toast.show('已恢复默认封面', 'success');
    });

    /* ---- 编辑个性签名 ---- */
    overlay.querySelector('#mom-sign-btn').addEventListener('click', () => {
      const cur = d.momentCover.signature || '';
      const { overlay: so, close: sc } = UI.modal({
        title: '个性签名',
        body: `<textarea id="ms-text" class="f2-textarea" rows="3" maxlength="50" placeholder="写一句你的个性签名…">${UI.escapeHtml(cur)}</textarea>
               <div class="nt-count"><span id="ms-len">${cur.length}</span>/50</div>`,
        footer: `<button class="btn-ghost" data-scancel>取消</button><button class="btn-primary" id="ms-save">保存</button>`
      });
      const ta = so.querySelector('#ms-text');
      ta.addEventListener('input', () => { so.querySelector('#ms-len').textContent = ta.value.length; });
      so.querySelector('[data-scancel]').addEventListener('click', sc);
      so.querySelector('#ms-save').addEventListener('click', () => {
        d.momentCover.signature = ta.value.trim();
        Core.State.save();
        overlay.querySelector('#mom-sign-btn').innerHTML = `<i class="fas fa-pen"></i> ${d.momentCover.signature ? UI.escapeHtml(d.momentCover.signature) : '编辑个性签名'}`;
        sc();
        Core.Toast.show('签名已保存 ✍️', 'success');
      });
      setTimeout(() => ta.focus(), 60);
    });

    function render() {
      const list = overlay.querySelector('#mom-list');
      const moments = [...d.moments].sort((a, b) => b.time - a.time);
      list.innerHTML = moments.length ? moments.map(m => {
        const p = peerInfo(m.from);
        const mine = m.from === me;
        const liked = m.likes.includes(me);
        const gridCls = m.images.length === 1 ? 'one' : m.images.length <= 4 ? 'two' : 'three';
        return `
        <div class="mom-item" data-mid="${m.id}">
          <img class="mom-avatar" src="${p.avatar}" alt="">
          <div class="mom-main">
            <div class="mom-name">${UI.escapeHtml(p.name)}</div>
            ${m.text ? `<div class="mom-text">${UI.escapeHtml(m.text)}</div>` : ''}
            ${m.images.length ? `<div class="mom-imgs ${gridCls}">
              ${m.images.map((src, i) => `<img class="mom-img" data-mimg="${m.id}-${i}" src="${src}" alt="">`).join('')}
            </div>` : ''}
            <div class="mom-meta">
              <span>${momentTime(m.time)}</span>
              <div class="mom-ops">
                <button class="mom-op ${liked ? 'liked' : ''}" data-mlike="${m.id}"><i class="fas fa-heart"></i> ${m.likes.length || ''}</button>
                <button class="mom-op" data-mcomment="${m.id}"><i class="fas fa-comment"></i> ${m.comments.length || ''}</button>
              </div>
            </div>
            ${(m.likes.length || m.comments.length) ? `
            <div class="mom-social">
              ${m.likes.length ? `<div class="mom-likes"><i class="fas fa-heart"></i> ${m.likes.map(u => UI.escapeHtml(peerInfo(u).name)).join('，')}</div>` : ''}
              ${m.comments.length ? `<div class="mom-comments">
                ${m.comments.map(c => `<div class="mom-cmt"><b>${UI.escapeHtml(peerInfo(c.from).name)}：</b>${UI.escapeHtml(c.text)}</div>`).join('')}
              </div>` : ''}
            </div>` : ''}
            <div class="mom-comment-box hidden" data-cbox="${m.id}">
              <input type="text" class="f2-input mom-comment-input" maxlength="200" placeholder="评论…">
              <button class="btn-primary mom-comment-send" data-csend="${m.id}">发送</button>
            </div>
          </div>
        </div>`;
      }).join('') : '<p style="color:var(--c-text-faint);text-align:center;padding:30px 0">还没有动态，点击右上角相机发布第一条吧～</p>';

      // 点赞
      list.querySelectorAll('[data-mlike]').forEach(b => b.addEventListener('click', () => {
        const m = d.moments.find(x => x.id === b.dataset.mlike);
        if (!m) return;
        if (m.likes.includes(me)) m.likes = m.likes.filter(u => u !== me);
        else m.likes.push(me);
        Core.State.save(); render();
      }));
      // 展开评论框
      list.querySelectorAll('[data-mcomment]').forEach(b => b.addEventListener('click', () => {
        const box = list.querySelector(`[data-cbox="${b.dataset.mcomment}"]`);
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) box.querySelector('input').focus();
      }));
      // 发表评论
      list.querySelectorAll('[data-csend]').forEach(b => b.addEventListener('click', () => {
        const mid = b.dataset.csend;
        const box = list.querySelector(`[data-cbox="${mid}"]`);
        const input = box.querySelector('input');
        const text = input.value.trim();
        if (!text) return;
        const m = d.moments.find(x => x.id === mid);
        m.comments.push({ id: Core.uid(), from: me, text, time: Date.now() });
        Core.State.save(); render();
      }));
      list.querySelectorAll('.mom-comment-input').forEach(inp => inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') inp.closest('.mom-comment-box').querySelector('.mom-comment-send').click();
      }));
      // 点击图片放大
      list.querySelectorAll('[data-mimg]').forEach(img => img.addEventListener('click', () => {
        if (typeof Features7 !== 'undefined' && Features7.openImage) Features7.openImage(img.src);
      }));
    }
    overlay.querySelector('#mom-publish-btn').addEventListener('click', openMomentPublisher);

    function openMomentPublisher() {
      const imgs = [];
      const { overlay: po, close: pc } = UI.modal({
        title: '发布动态',
        body: `
          <textarea id="mp-text" class="f2-textarea" rows="4" maxlength="500" placeholder="这一刻的想法…"></textarea>
          <div class="mp-imgs" id="mp-imgs"></div>
          <button class="mp-add-img" id="mp-add"><i class="fas fa-image"></i> 添加图片（最多9张）</button>
          <input type="file" id="mp-file" accept="image/*" multiple class="hidden">`,
        footer: `<button class="btn-ghost" data-pcancel>取消</button><button class="btn-primary" id="mp-send">发表</button>`
      });
      function renderThumbs() {
        const box = po.querySelector('#mp-imgs');
        box.innerHTML = imgs.map((src, i) => `<div class="mp-thumb"><img src="${src}"><button class="mp-thumb-del" data-del="${i}"><i class="fas fa-xmark"></i></button></div>`).join('');
        box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
          imgs.splice(+b.dataset.del, 1); renderThumbs();
        }));
      }
      po.querySelector('[data-pcancel]').addEventListener('click', pc);
      po.querySelector('#mp-add').addEventListener('click', () => po.querySelector('#mp-file').click());
      po.querySelector('#mp-file').addEventListener('change', (e) => {
        const files = [...e.target.files].slice(0, 9 - imgs.length);
        files.forEach(f => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const max = 720;
              const scale = Math.min(1, max / Math.max(img.width, img.height));
              const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
              const cv = document.createElement('canvas');
              cv.width = w; cv.height = h;
              cv.getContext('2d').drawImage(img, 0, 0, w, h);
              imgs.push(cv.toDataURL('image/jpeg', 0.82));
              if (imgs.length <= 9) renderThumbs();
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(f);
        });
        e.target.value = '';
      });
      po.querySelector('#mp-send').addEventListener('click', () => {
        const text = po.querySelector('#mp-text').value.trim();
        if (!text && !imgs.length) { Core.Toast.show('写点什么或加张图片吧', 'error'); return; }
        d.moments.push({ id: Core.uid(), from: me, text, images: imgs, time: Date.now(), likes: [], comments: [] });
        Core.State.save();
        pc(); render();
        Core.Toast.show('动态已发布 ✨', 'success');
        // TA 们稍后互动
        setTimeout(() => reactMyMoment(null, true), 2000 + Math.random() * 3000);
      });
    }

    render();
    d.momentLastSeen = Date.now();
    Core.State.save();
  }

  /* ---- 联系人主动发朋友圈（供 Features4.fireProactive('moment') 调用）---- */
  function postPeerMoment(peer) {
    const d = ensureData();
    momentEnsure(d);
    if (!peer) {
      const contacts = (d.contacts || []);
      if (!contacts.length) return;
      peer = contacts[Math.floor(Math.random() * contacts.length)].username;
    }
    const text = PEER_MOMENT_TEXTS[Math.floor(Math.random() * PEER_MOMENT_TEXTS.length)];
    d.moments.push({
      id: Core.uid(), from: peer, text, images: [], time: Date.now(),
      likes: [], comments: []
    });
    Core.State.save();
    const name = peerInfo(peer).name;
    if (document.hidden) notify('🌙 朋友圈更新', name + ' 发布了新动态');
    else Core.Toast.show(name + ' 发布了一条朋友圈', 'info');
  }

  /* ---- 联系人点赞/评论我的动态 ---- */
  function reactMyMoment(peer, auto) {
    const d = ensureData();
    momentEnsure(d);
    const me = Core.State.user.username;
    const mine = d.moments.filter(m => m.from === me);
    if (!mine.length) return;
    if (!peer) {
      const contacts = (d.contacts || []);
      if (!contacts.length) return;
      peer = contacts[Math.floor(Math.random() * contacts.length)].username;
    }
    const m = mine[mine.length - 1];
    // 50% 点赞、50% 评论（评论前先点赞）
    if (!m.likes.includes(peer)) m.likes.push(peer);
    if (Math.random() < 0.6) {
      const text = PEER_COMMENT_TEXTS[Math.floor(Math.random() * PEER_COMMENT_TEXTS.length)];
      m.comments.push({ id: Core.uid(), from: peer, text, time: Date.now() });
    }
    Core.State.save();
    const name = peerInfo(peer).name;
    if (document.hidden) notify('❤️ 朋友圈新互动', name + (m.comments.length ? ' 评论了你的动态' : ' 赞了你的动态'));
  }

  /* ==================== 初始化 ==================== */
  function init() {
    checkNotifyPermission();
    applyKeepAlive();
    // 拦截对方消息：在 messaging.simulateReply 和 fireProactive 后统一触发
    // 通过包装 Core.State.addMessage 实现
    const origAdd = Core.State.addMessage;
    Core.State.addMessage = function (sid, msg) {
      const r = origAdd.apply(this, arguments);
      if (msg.from !== Core.State.user.username && msg.type !== 'typing') {
        const d = ensureData();
        if (d.sysSettings.notifyMsg && document.hidden) {
          const text = msg.text || msg.cardTitle || msg.lines?.[0] || '[消息]';
          notifyMessage(msg.from, text);
        }
      }
      return r;
    };
    // 拦截视频通话
    const origOpen = Features5.openVideoCall;
    if (origOpen) {
      Features5.openVideoCall = function () {
        const sid = Core.State.currentChatId;
        const s = Core.State.data.sessions[sid];
        if (s && s.type === 'private') {
          const peer = s.members.find(x => x !== Core.State.user.username);
          notifyCall(peer);
        }
        return origOpen.apply(this, arguments);
      };
    }
  }

  return { init, openSettings, notifyMessage, notifyCall, applyKeepAlive, openMoments, postPeerMoment, reactMyMoment, momentUnread };
})();
