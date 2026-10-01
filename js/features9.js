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

  return { init, openSettings, notifyMessage, notifyCall, applyKeepAlive };
})();
