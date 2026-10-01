/* ============ 私语 · 应用入口 ============ */
(function () {
  /* ---- 主题恢复 ---- */
  const theme = Core.store.get(Core.KEYS.THEME, 'morandi');
  document.documentElement.setAttribute('data-theme', theme);

  /* ---- 登录态检查（免登录：无账号自动进入默认本地账号） ---- */
  const chooseAccount = Core.store.get('siyu_choose_account');
  const currentUser = Core.Auth.current();
  if (chooseAccount) {
    Core.store.remove('siyu_choose_account'); // 仅本次显示登录页
  } else if (currentUser) {
    enterApp(currentUser);
  } else {
    Core.Auth.ensureGuest().then(u => enterApp(u.username));
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
    Features7.init();
    if (typeof Features8 !== 'undefined') Features8.init();
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
