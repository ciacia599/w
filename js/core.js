/* ============ 私语 · 核心模块 (auth / storage / state / crypto / sync) ============ */
const Core = (() => {
  const KEYS = {
    USERS: 'siyu_users',
    CURRENT: 'siyu_current_user',
    DATA: (uid) => `siyu_data_${uid}`,
    KEYS: (uid) => `siyu_keys_${uid}`,
    OFFLINE: (uid) => `siyu_offline_${uid}`,
    PROB: 'siyu_probability',
    THEME: 'siyu_theme'
  };

  /* ---- 工具 ---- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const now = () => Date.now();
  const hash = async (str) => {
    const buf = new TextEncoder().encode(str);
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /* ---- 存储封装 ---- */
  const store = {
    get(k, def) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
      catch { return def; }
    },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    remove(k) { localStorage.removeItem(k); }
  };

  /* ---- 端到端加密 (Web Crypto AES-GCM) ---- */
  const Crypto = {
    async deriveKey(password, salt) {
      const enc = new TextEncoder();
      const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
        keyMat, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
      );
    },
    async encrypt(plaintext, key) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
      return btoa(JSON.stringify({ iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }));
    },
    async decrypt(ciphertext, key) {
      const { iv, ct } = JSON.parse(atob(ciphertext));
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(ct)
      );
      return new TextDecoder().decode(pt);
    },
    async getKey(uid, password) {
      let raw = store.get(KEYS.KEYS(uid));
      if (!raw) {
        const k = await this.deriveKey(password || 'siyu_default', uid);
        const exp = await crypto.subtle.exportKey('raw', k);
        store.set(KEYS.KEYS(uid), Array.from(new Uint8Array(exp)));
        return k;
      }
      return crypto.subtle.importKey('raw', new Uint8Array(raw), 'AES-GCM', true, ['encrypt', 'decrypt']);
    }
  };

  /* ---- 认证 ---- */
  const Auth = {
    async register(username, nickname, password, avatar) {
      const users = store.get(KEYS.USERS, {});
      if (users[username]) throw new Error('用户名已存在');
      const pwdHash = await hash(password);
      users[username] = { username, nickname, pwdHash, avatar, createdAt: now() };
      store.set(KEYS.USERS, users);
      // 初始化数据
      const data = {
        profile: { username, nickname, avatar },
        contacts: [], groups: [], sessions: {}, messages: {},
        diaries: [], letters: [], books: [], media: [], settings: { theme: 'morandi' }
      };
      store.set(KEYS.DATA(username), data);
      // 预生成密钥
      await Crypto.getKey(username, password);
      return users[username];
    },
    async login(username, password) {
      const users = store.get(KEYS.USERS, {});
      const u = users[username];
      if (!u) throw new Error('用户不存在');
      if (u.pwdHash !== await hash(password)) throw new Error('密码错误');
      store.set(KEYS.CURRENT, username);
      await Crypto.getKey(username, password);
      return u;
    },
    logout() { store.remove(KEYS.CURRENT); },
    current() { return store.get(KEYS.CURRENT); },
    getUser(username) { return store.get(KEYS.USERS, {})[username]; },
    allUsers() { return store.get(KEYS.USERS, {}); }
  };

  /* ---- 状态 / 数据 ---- */
  const State = {
    data: null,
    user: null,
    currentChatId: null,
    typing: new Set(),
    load(uid) {
      this.user = Auth.getUser(uid);
      this.data = store.get(KEYS.DATA(uid), {});
      // 确保结构完整
      const defaults = { contacts: [], groups: [], sessions: {}, messages: {}, diaries: [], letters: [], books: [], media: [], settings: {} };
      for (const k in defaults) if (this.data[k] === undefined) this.data[k] = defaults[k];
      return this.data;
    },
    save() { store.set(KEYS.DATA(this.user.username), this.data); },

    /* 会话 */
    getOrCreateSession(peerId, type = 'private') {
      const id = type === 'group' ? peerId : [this.user.username, peerId].sort().join('__');
      if (!this.data.sessions[id]) {
        const peer = type === 'group'
          ? this.data.groups.find(g => g.id === peerId)
          : this.data.contacts.find(c => c.username === peerId) || Auth.getUser(peerId);
        this.data.sessions[id] = {
          id, type,
          name: peer ? (peer.nickname || peer.name || peerId) : peerId,
          avatar: peer ? peer.avatar : '',
          lastMsg: '', lastTime: 0, unread: 0,
          members: type === 'group' ? (peer ? peer.members : []) : [this.user.username, peerId]
        };
      }
      this.save();
      return id;
    },

    /* 消息 */
    getMessages(sessionId) { return this.data.messages[sessionId] || []; },
    addMessage(sessionId, msg) {
      if (!this.data.messages[sessionId]) this.data.messages[sessionId] = [];
      this.data.messages[sessionId].push(msg);
      const sess = this.data.sessions[sessionId];
      if (sess) {
        sess.lastMsg = msg.type === 'text' ? msg.text : `[${msg.type}]`;
        sess.lastTime = msg.time;
        if (msg.from !== this.user.username) sess.unread = (sess.unread || 0) + 1;
      }
      this.save();
      return msg;
    },
    updateMessage(sessionId, msgId, patch) {
      const arr = this.data.messages[sessionId];
      if (!arr) return;
      const m = arr.find(x => x.id === msgId);
      if (m) Object.assign(m, patch);
      this.save();
    },
    clearUnread(sessionId) {
      const s = this.data.sessions[sessionId];
      if (s) { s.unread = 0; this.save(); }
    },

    /* 联系人 */
    addContact(c) {
      if (!this.data.contacts.find(x => x.username === c.username)) {
        this.data.contacts.push(c);
        this.save();
      }
    },
    removeContact(username) {
      this.data.contacts = this.data.contacts.filter(c => c.username !== username);
      this.save();
    },

    /* 群组 */
    createGroup(name, avatar, members) {
      const g = { id: uid(), name, avatar, members: [...new Set([...members, this.user.username])], owner: this.user.username, muted: [], createdAt: now() };
      this.data.groups.push(g);
      this.getOrCreateSession(g.id, 'group');
      this.save();
      return g;
    },
    getGroup(id) { return this.data.groups.find(g => g.id === id); },
    updateGroup(id, patch) {
      const g = this.getGroup(id);
      if (g) { Object.assign(g, patch); this.save(); }
    }
  };

  /* ---- 跨标签页同步 (模拟多端) ---- */
  const Sync = {
    ch: null,
    init() {
      try {
        this.ch = new BroadcastChannel('siyu_sync');
        this.ch.onmessage = (e) => this.handle(e.data);
      } catch { /* 不支持 */ }
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('siyu_data_')) UI.refresh();
      });
    },
    send(type, payload) {
      if (this.ch) this.ch.postMessage({ type, payload, from: State.user?.username });
    },
    handle({ type, payload, from }) {
      if (from === State.user?.username) return;
      if (type === 'message' && payload.to === State.user?.username) {
        // 收到对方发来的消息
        const sid = State.getOrCreateSession(payload.from, 'private');
        State.addMessage(sid, {
          id: uid(), from: payload.from, to: State.user.username,
          type: payload.type, text: payload.text, time: payload.time,
          cardIcon: payload.cardIcon, cardTitle: payload.cardTitle, lines: payload.lines,
          question: payload.question, options: payload.options,
          status: 'delivered'
        });
        State.clearUnread(sid); // 模拟已送达
        UI.refresh();
        if (State.currentChatId === sid) Messaging.markRead(sid);
      }
      if (type === 'typing' && payload.to === State.user?.username) {
        UI.showTyping(payload.from, payload.typing);
      }
      if (type === 'read' && payload.to === State.user?.username) {
        const sid = State.getOrCreateSession(payload.from, 'private');
        Messaging.markMessagesStatus(sid, 'read');
      }
    },
    /* 离线消息队列 */
    enqueueOffline(to, msg) {
      const q = store.get(KEYS.OFFLINE(to), []);
      q.push(msg);
      store.set(KEYS.OFFLINE(to), q);
    },
    flushOffline() {
      const q = store.get(KEYS.OFFLINE(State.user.username), []);
      if (!q.length) return;
      q.forEach(msg => {
        const sid = State.getOrCreateSession(msg.from, 'private');
        State.addMessage(sid, { ...msg, id: uid(), to: State.user.username });
      });
      store.remove(KEYS.OFFLINE(State.user.username));
      UI.refresh();
    }
  };

  /* ---- 概率设置 ---- */
  const Probability = {
    defaults: {
      autoReply: 70,      // 自动回复概率 %
      typingShow: 80,     // 显示对方正在输入概率
      replyDelay: 50,     // 回复延迟 0-100 (映射到 0.5-3s)
      emojiUse: 40,       // 自动回复中使用表情概率
      activeStatus: 90,   // 显示在线状态概率
      readReceipt: 100    // 已读回执概率
    },
    get() { return { ...this.defaults, ...store.get(KEYS.PROB, {}) }; },
    set(k, v) {
      const p = this.get(); p[k] = v; store.set(KEYS.PROB, p);
    },
    roll(k) { return Math.random() * 100 < this.get()[k]; }
  };

  /* ---- Toast ---- */
  const Toast = {
    show(msg, type = 'info') {
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = msg;
      document.getElementById('toast-container').appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-12px)'; el.style.transition = 'all .3s'; }, 2200);
      setTimeout(() => el.remove(), 2600);
    }
  };

  return { uid, now, hash, store, KEYS, Crypto, Auth, State, Sync, Probability, Toast };
})();
