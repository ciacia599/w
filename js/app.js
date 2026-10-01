/* ============ 私语 · 应用入口 ============ */
(function () {
  /* ---- 主题恢复 ---- */
  const theme = Core.store.get(Core.KEYS.THEME, 'morandi');
  document.documentElement.setAttribute('data-theme', theme);

  /* ---- 完全免登录直接进入 ---- */
  Core.Auth.ensureGuest().then(u => enterApp(u.username));

  /* ---- 进入应用 ---- */
  function enterApp(username) {
    Core.State.load(username);
    document.getElementById('current-avatar').src = Core.State.user.avatar || UI.AVATARS[0];
    document.getElementById('current-nickname').textContent = Core.State.user.nickname;

    Core.Sync.init();
    Core.Sync.flushOffline();

    Messaging.init();
    Features.init();
    Features2.init();
    Features3.init();
    Features4.init();
    Features5.init();
    Features6.init();
    Features7.init();
    if (typeof Features8 !== 'undefined') Features8.init();
    if (typeof Features9 !== 'undefined') Features9.init();
    Extras.init();
    Group.init();
    Settings.init();

    UI.renderSessions();
    bindEvents();
  }

  /* ---- 事件绑定 ---- */
  function bindEvents() {
    // 搜索
    document.getElementById('session-search').addEventListener('input', (e) => {
      UI.renderSessions(e.target.value.trim());
    });

    // 标签切换
    document.querySelectorAll('.tab-item').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const tab = t.dataset.tab;
        if (tab === 'contacts') showContacts();
        else if (tab === 'spaces') showSpaces();
        else if (tab === 'home') Features3.renderHome();
        else UI.renderSessions(document.getElementById('session-search').value);
      });
    });

    // 消息搜索
    document.getElementById('btn-search-msg').addEventListener('click', Group.openSearch);

    // 退出聊天（返回主页/会话列表）
    document.getElementById('btn-chat-exit').addEventListener('click', () => {
      document.querySelector('.app')?.classList.remove('show-chat');
      document.getElementById('chat-window').classList.add('hidden');
      document.getElementById('chat-empty').classList.remove('hidden');
      Core.State.currentChatId = null;
      UI.renderSessions(document.getElementById('session-search').value);
    });

    // 点击头像昵称 → 编辑个人资料
    document.querySelector('.user-chip').addEventListener('click', () => Features3.openProfile());
    document.querySelector('.user-chip').style.cursor = 'pointer';

    // 发起私聊
    document.getElementById('btn-new-chat').addEventListener('click', openNewChat);
  }

  /* ---- 联系人视图 ---- */
  function showContacts() {
    const list = document.getElementById('session-list');
    const contacts = Core.State.data.contacts;
    const allUsers = Object.values(Core.Auth.allUsers()).filter(u => u.username !== Core.State.user.username);
    const merged = [...contacts, ...allUsers.filter(u => !contacts.find(c => c.username === u.username))];
    list.innerHTML = `
      <div style="padding:10px 8px;color:var(--c-text-soft);font-size:13px">联系人 (${merged.length})</div>
      ${merged.map(c => `
        <div class="session-item" data-cname="${c.username}">
          <div class="avatar-wrap"><img class="session-avatar" src="${c.avatar || UI.AVATARS[0]}" alt=""></div>
          <div class="session-info">
            <div class="session-top"><span class="session-name">${c.nickname || c.username}</span></div>
            <div class="session-preview">@${c.username}</div>
          </div>
        </div>`).join('')}`;
    list.querySelectorAll('[data-cname]').forEach(el => {
      el.addEventListener('click', () => {
        const c = merged.find(x => x.username === el.dataset.cname);
        Core.State.addContact(c);
        const sid = Core.State.getOrCreateSession(c.username, 'private');
        UI.openChat(sid);
      });
    });
  }

  /* ---- 空间视图 ---- */
  function showSpaces() {
    const list = document.getElementById('session-list');
    const d = Core.State.data;
    const secStyle = 'padding:10px 8px;color:var(--c-text-soft);font-size:13px;margin-top:4px';
    const iconStyle = 'background:var(--c-bubble-me);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center';
    const iconColor = 'color:var(--c-accent-deep)';

    const spaces = [
      { key:'moments',name:'朋友圈', icon:'fa-camera-retro', preview:(typeof Features9 !== 'undefined' && Features9.momentUnread ? Features9.momentUnread() : 0) + ' 条新动态' },
      { key:'diary',  name:'日记', icon:'fa-book', preview:`${d.diaries?.length||0} 篇日记` },
      { key:'letter', name:'信件', icon:'fa-envelope', preview:`${d.letters?.length||0} 封信` },
      { key:'books',  name:'书库', icon:'fa-book-open', preview:`${d.books?.length||0} 本书` },
      { key:'shift',  name:'现实转移', icon:'fa-galaxy', preview:'世界转移中心' },
      { key:'oc',     name:'OC设定', icon:'fa-id-badge', preview:'我的角色设定' },
      { key:'manifest',name:'显化愿望', icon:'fa-sun', preview:'显化与感恩' },
      { key:'cards',  name:'字卡', icon:'fa-clone', preview:`${d.wordCards?.length||0} 张字卡` },
      { key:'quote',  name:'格言', icon:'fa-quote-right', preview:`${d.quotes?.length||0} 条格言` },
      { key:'peer',   name:'对方主动频率', icon:'fa-heart-pulse', preview:'调整对方主动行为' },
      { key:'system', name:'系统', icon:'fa-toolbox', preview:'数据与系统功能' },
      { key:'settings', name:'提醒设置', icon:'fa-bell', preview:'通知/电话/保活开关' },
      { key:'anniv',  name:'纪念日', icon:'fa-calendar-heart', preview:`${d.anniversaries?.length||0} 个纪念日` },
      { key:'pomodoro', name:'番茄钟', icon:'fa-stopwatch', preview:'专注与陪伴' },
      { key:'memo',   name:'备忘录', icon:'fa-bell', preview:`${d.memos?.filter(m=>!m.done)?.length||0} 个待办` },
    ];

    list.innerHTML = `
      <div style="padding:10px 8px;color:var(--c-text-soft);font-size:13px">我的空间</div>
      ${spaces.map(s => `
      <div class="session-item" data-space="${s.key}">
        <div class="avatar-wrap" style="${iconStyle}"><i class="fas ${s.icon}" style="${iconColor}"></i></div>
        <div class="session-info"><div class="session-name">${s.name}</div><div class="session-preview">${s.preview}</div></div>
      </div>`).join('')}`;

    // 通用绑定：优先调用对应 Features 的 open 函数，其次回退到点击原按钮
    const binds = {
      moments:  () => { if (typeof Features9 !== 'undefined' && Features9.openMoments) Features9.openMoments(); else Core.Toast.show('功能加载中…','error'); },
      diary:    () => { try { document.getElementById('btn-diary').click(); } catch(e) {} },
      letter:   () => { try { document.getElementById('btn-letter').click(); } catch(e) {} },
      books:    () => { try { document.getElementById('btn-read').click(); } catch(e) {} },
      shift:    () => { if (typeof Features4 !== 'undefined' && Features4.openRealityShift) Features4.openRealityShift(); else Core.Toast.show('功能加载中…','error'); },
      oc:       () => { if (typeof Features3 !== 'undefined' && Features3.openOC) Features3.openOC(); else Core.Toast.show('功能加载中…','error'); },
      manifest: () => { if (typeof Features3 !== 'undefined' && Features3.openManifest) Features3.openManifest(); else Core.Toast.show('功能加载中…','error'); },
      cards:    () => { if (typeof Features5 !== 'undefined' && Features5.openCards) Features5.openCards(); else Core.Toast.show('功能加载中…','error'); },
      quote:    () => { if (typeof Features5 !== 'undefined' && Features5.openQuotes) Features5.openQuotes(); else Core.Toast.show('功能加载中…','error'); },
      peer:     () => { if (typeof Features4 !== 'undefined' && Features4.openPeerFreq) Features4.openPeerFreq(); else Core.Toast.show('功能加载中…','error'); },
      system:   () => { if (typeof Features3 !== 'undefined' && Features3.openSystem) Features3.openSystem(); else Core.Toast.show('功能加载中…','error'); },
      settings: () => { if (typeof Features9 !== 'undefined' && Features9.openSettings) Features9.openSettings(); else Core.Toast.show('功能加载中…','error'); },
      anniv:    () => { if (typeof Features8 !== 'undefined' && Features8.openAnniversaries) Features8.openAnniversaries(); else Core.Toast.show('功能加载中…','error'); },
      pomodoro: () => { if (typeof Features8 !== 'undefined' && Features8.openPomodoro) Features8.openPomodoro(); else Core.Toast.show('功能加载中…','error'); },
      memo:     () => { if (typeof Features8 !== 'undefined' && Features8.openMemos) Features8.openMemos(); else Core.Toast.show('功能加载中…','error'); },
    };
    list.querySelectorAll('[data-space]').forEach(el => {
      const key = el.dataset.space;
      if (binds[key]) el.addEventListener('click', binds[key]);
    });
  }

  /* ---- 发起私聊 ---- */
  function openNewChat() {
    const me = Core.State.user.username;
    const contacts = Core.State.data.contacts;
    const registered = Object.values(Core.Auth.allUsers()).filter(u => u.username !== me);
    // 已注册用户 + 已有自定义联系人合并去重
    const all = [...contacts];
    registered.forEach(u => { if (!all.find(c => c.username === u.username)) all.push(u); });

    const { overlay, close } = UI.modal({
      title: '发起私聊',
      body: `
        <div class="contact-list">
          ${all.length ? all.map(u => `
            <div class="contact-option" data-u="${u.username}">
              <img src="${u.avatar || UI.AVATARS[0]}" style="width:40px;height:40px;border-radius:50%">
              <div><div style="font-weight:500">${u.nickname || u.username}</div><div style="font-size:11px;color:var(--c-text-faint)">@${u.username}</div></div>
            </div>`).join('') : '<p style="color:var(--c-text-faint)">还没有联系人，点下方按钮自定义添加一个吧。</p>'}
        </div>
        <div style="margin-top:16px">
          <button class="btn-primary" id="add-custom" style="width:100%"><i class="fas fa-user-plus"></i> 自定义添加联系人</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('[data-u]').forEach(el => {
      el.addEventListener('click', () => {
        const u = all.find(x => x.username === el.dataset.u);
        Core.State.addContact(u);
        const sid = Core.State.getOrCreateSession(u.username, 'private');
        UI.openChat(sid);
        close();
      });
    });
    overlay.querySelector('#add-custom').addEventListener('click', () => {
      openAddContactModal((c) => {
        Core.State.addContact(c);
        const sid = Core.State.getOrCreateSession(c.username, 'private');
        UI.openChat(sid);
        close();
      });
    });
  }

  /* ---- 自定义添加联系人（不要求对方已注册，本地 AI 扮演） ---- */
  function openAddContactModal(onDone) {
    const pool = (Core.State.data.avatarPool || []);
    const { overlay, close } = UI.modal({
      title: '添加联系人',
      body: `
        <p style="font-size:12px;color:var(--c-text-faint);margin-bottom:10px">自定义对方的用户名和昵称，TA 会由本地智能陪伴扮演，无需对方注册。头像请自己上传或从头像库选择。</p>
        <div class="form-row">
          <label>用户名（英文/数字，唯一标识）</label>
          <input type="text" id="ac-username" placeholder="例如：xiaoyu" autocomplete="off">
        </div>
        <div class="form-row">
          <label>昵称</label>
          <input type="text" id="ac-nickname" placeholder="例如：小鱼" autocomplete="off">
        </div>
        <div class="form-row">
          <label>对方头像（上传图片，或从头像库选）</label>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <input type="file" id="ac-file" accept="image/*" hidden>
            <button class="btn-primary" id="ac-upload" style="padding:6px 14px;font-size:13px" type="button"><i class="fas fa-upload"></i> 上传头像</button>
            ${pool.length ? '' : '<span style="font-size:12px;color:var(--c-text-faint);align-self:center">头像库为空，先上传吧</span>'}
          </div>
          <div class="avatar-options" id="ac-avatars"></div>
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="ac-save"><i class="fas fa-check"></i> 添加</button>`,
      size: 'modal-lg'
    });
    const avBox = overlay.querySelector('#ac-avatars');
    function renderPool() {
      const list = (Core.State.data.avatarPool || []);
      avBox.innerHTML = list.map((a) =>
        `<img class="avatar-opt${a.url === avatar ? ' selected' : ''}" src="${a.url}" data-avatar="${a.url}" style="width:38px;height:38px;border-radius:50%;cursor:pointer;border:2px solid transparent;object-fit:cover">`
      ).join('');
      avBox.querySelectorAll('.avatar-opt').forEach(el => el.addEventListener('click', () => {
        avBox.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        avatar = el.dataset.avatar;
      }));
    }
    let avatar = pool[0]?.url || '';
    renderPool();
    overlay.querySelector('#ac-upload').addEventListener('click', () => overlay.querySelector('#ac-file').click());
    overlay.querySelector('#ac-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { Core.Toast.show('图片不能超过 8MB', 'error'); return; }
      try {
        const url = await Features7.fileToDataURL(f, 256);
        Core.State.data.avatarPool = Core.State.data.avatarPool || [];
        Core.State.data.avatarPool.push({ id: Core.uid(), name: f.name.replace(/\.[^.]+$/, ''), url });
        Core.State.save();
        avatar = url;
        renderPool();
      } catch (err) { Core.Toast.show('图片读取失败', 'error'); }
      e.target.value = '';
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#ac-save').addEventListener('click', () => {
      const username = overlay.querySelector('#ac-username').value.trim().replace(/\s+/g, '_');
      const nickname = overlay.querySelector('#ac-nickname').value.trim() || username;
      if (!/^[A-Za-z0-9_\-]{1,20}$/.test(username)) { Core.Toast.show('用户名需为 1-20 位英文/数字/_-', 'error'); return; }
      if (username === Core.State.user.username) { Core.Toast.show('不能添加自己', 'error'); return; }
      if (Core.State.data.contacts.find(c => c.username === username) || Core.Auth.getUser(username)) {
        Core.Toast.show('该联系人已存在', 'error'); return;
      }
      if (!avatar) { Core.Toast.show('请先上传一张对方头像', 'error'); return; }
      const c = { username, nickname, avatar, custom: true };
      Core.Toast.show(`已添加联系人「${nickname}」`, 'success');
      close();
      onDone && onDone(c);
    });
  }

  // 回车键快捷登录
  ['login-username', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });
  });
})();
