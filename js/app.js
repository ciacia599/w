/* ============ 私语 · 应用入口 ============ */
(function () {
  /* ---- 主题恢复 ---- */
  const theme = Core.store.get(Core.KEYS.THEME, 'morandi');
  document.documentElement.setAttribute('data-theme', theme);

  /* ---- 登录态检查 ---- */
  const currentUser = Core.Auth.current();
  if (currentUser) {
    enterApp(currentUser);
  }

  /* ---- 认证 Tab 切换 ---- */
  UI.initAvatarPicker();
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.tab;
      document.getElementById('form-login').classList.toggle('hidden', t !== 'login');
      document.getElementById('form-register').classList.toggle('hidden', t !== 'register');
    });
  });

  /* ---- 登录 ---- */
  document.getElementById('btn-login').addEventListener('click', async () => {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if (!u || !p) { Core.Toast.show('请输入用户名和密码', 'error'); return; }
    try {
      await Core.Auth.login(u, p);
      enterApp(u);
    } catch (e) { Core.Toast.show(e.message, 'error'); }
  });

  /* ---- 注册 ---- */
  document.getElementById('btn-register').addEventListener('click', async () => {
    const u = document.getElementById('reg-username').value.trim();
    const n = document.getElementById('reg-nickname').value.trim();
    const p = document.getElementById('reg-password').value;
    const avatar = document.querySelector('.avatar-opt.selected')?.dataset.avatar || UI.AVATARS[0];
    if (!u || !n || !p) { Core.Toast.show('请填写完整信息', 'error'); return; }
    if (p.length < 4) { Core.Toast.show('密码至少4位', 'error'); return; }
    try {
      await Core.Auth.register(u, n, p, avatar);
      await Core.Auth.login(u, p);
      enterApp(u);
    } catch (e) { Core.Toast.show(e.message, 'error'); }
  });

  /* ---- 进入应用 ---- */
  function enterApp(username) {
    Core.State.load(username);
    document.getElementById('current-avatar').src = Core.State.user.avatar || UI.AVATARS[0];
    document.getElementById('current-nickname').textContent = Core.State.user.nickname;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    Core.Sync.init();
    Core.Sync.flushOffline();

    Messaging.init();
    Features.init();
    Features2.init();
    Features3.init();
    Features4.init();
    Features5.init();
    Features6.init();
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
    list.innerHTML = `
      <div style="padding:10px 8px;color:var(--c-text-soft);font-size:13px">我的空间</div>
      <div class="session-item" data-space="diary">
        <div class="avatar-wrap" style="background:var(--c-bubble-me);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center"><i class="fas fa-book" style="color:var(--c-accent-deep)"></i></div>
        <div class="session-info"><div class="session-name">日记</div><div class="session-preview">${d.diaries?.length || 0} 篇日记</div></div>
      </div>
      <div class="session-item" data-space="letter">
        <div class="avatar-wrap" style="background:var(--c-bubble-me);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center"><i class="fas fa-envelope" style="color:var(--c-accent-deep)"></i></div>
        <div class="session-info"><div class="session-name">信件</div><div class="session-preview">${d.letters?.length || 0} 封信</div></div>
      </div>
      <div class="session-item" data-space="books">
        <div class="avatar-wrap" style="background:var(--c-bubble-me);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center"><i class="fas fa-book-open" style="color:var(--c-accent-deep)"></i></div>
        <div class="session-info"><div class="session-name">书库</div><div class="session-preview">${d.books?.length || 0} 本书</div></div>
      </div>`;
    list.querySelector('[data-space="diary"]').addEventListener('click', () => Extras.init || document.getElementById('btn-diary').click());
    list.querySelector('[data-space="diary"]').addEventListener('click', () => document.getElementById('btn-diary').click());
    list.querySelector('[data-space="letter"]').addEventListener('click', () => document.getElementById('btn-letter').click());
    list.querySelector('[data-space="books"]').addEventListener('click', () => document.getElementById('btn-read').click());
  }

  /* ---- 发起私聊 ---- */
  function openNewChat() {
    const users = Object.values(Core.Auth.allUsers()).filter(u => u.username !== Core.State.user.username);
    const { overlay, close } = UI.modal({
      title: '发起私聊',
      body: `
        <div class="contact-list">
          ${users.length ? users.map(u => `
            <div class="contact-option" data-u="${u.username}">
              <img src="${u.avatar}" style="width:40px;height:40px;border-radius:50%">
              <div><div style="font-weight:500">${u.nickname || u.username}</div><div style="font-size:11px;color:var(--c-text-faint)">@${u.username}</div></div>
            </div>`).join('') : '<p style="color:var(--c-text-faint)">暂无其他用户，请先注册更多账号或添加联系人。</p>'}
        </div>
        <div style="margin-top:16px">
          <button class="btn-ghost" id="add-by-name" style="width:100%"><i class="fas fa-user-plus"></i> 通过用户名添加</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('[data-u]').forEach(el => {
      el.addEventListener('click', () => {
        const u = users.find(x => x.username === el.dataset.u);
        Core.State.addContact(u);
        const sid = Core.State.getOrCreateSession(u.username, 'private');
        UI.openChat(sid);
        close();
      });
    });
    overlay.querySelector('#add-by-name').addEventListener('click', () => {
      const name = prompt('输入对方用户名：');
      if (!name) return;
      const u = Core.Auth.getUser(name.trim());
      if (!u) { Core.Toast.show('用户不存在', 'error'); return; }
      if (u.username === Core.State.user.username) { Core.Toast.show('不能和自己聊天', 'error'); return; }
      Core.State.addContact(u);
      const sid = Core.State.getOrCreateSession(u.username, 'private');
      UI.openChat(sid);
      close();
    });
  }

  // 回车键快捷登录
  ['login-username', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });
  });
})();
