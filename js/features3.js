/* ============ 私语 · 第三批扩展 (主页自定义 / 头像昵称 / 转盘 / 显化 / OC / 系统 / 转移 / 数据导入导出) ============ */
const Features3 = (() => {

  /* ---- 数据惰性初始化 ---- */
  function ensureData() {
    const d = Core.State.data;
    d.homeWidgets = d.homeWidgets || [
      { id: Core.uid(), feat: 'fortune' },
      { id: Core.uid(), feat: 'shop' },
      { id: Core.uid(), feat: 'wheel' },
      { id: Core.uid(), feat: 'expense' },
      { id: Core.uid(), feat: 'manifest' },
      { id: Core.uid(), feat: 'oc' },
      { id: Core.uid(), feat: 'stats' },
      { id: Core.uid(), feat: 'decide' }
    ];
    d.wheel = d.wheel || { items: ['是', '否', '再想想', '今天运势极佳', '喝杯奶茶', '早点休息', '主动联系TA', '等待时机'], angle: 0 };
    d.manifests = d.manifests || [];
    d.ocs = d.ocs || [];
    d.transfers = d.transfers || [];
    d.peerFreq = d.peerFreq || { diary: 'normal', letter: 'off', question: 'normal', drawing: 'off' };
    d.drawings = d.drawings || [];
    return d;
  }

  const esc = (s) => UI.escapeHtml(String(s ?? ''));
  const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtHM = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  function requireChat() {
    if (!Core.State.currentChatId) { Core.Toast.show('请先打开一个会话', 'error'); return false; }
    return true;
  }
  function sendCard(icon, title, lines) {
    if (!requireChat()) return false;
    Messaging.sendMessage({ type: 'card', cardIcon: icon, cardTitle: title, lines });
    Core.Toast.show('已发送到聊天', 'success');
    return true;
  }
  function clickTool(id) { const b = document.getElementById(id); if (b) b.click(); else Core.Toast.show('功能入口未找到', 'error'); }

  /* ==================== 主页小组件注册表 ==================== */
  const WIDGET_CATALOG = {
    decide:   { icon: 'fa-dice',              name: '抉择',     run: () => Features2.openDecide() },
    calendar: { icon: 'fa-calendar-days',     name: '日历',     run: () => Features2.openCalendar() },
    mood:     { icon: 'fa-heart',             name: '心情手账', run: () => Features2.openMood() },
    fortune:  { icon: 'fa-hat-wizard',        name: '运势占卜', run: () => Features2.openFortune() },
    fish:     { icon: 'fa-fish',              name: '摸鱼小计', run: () => Features2.openFish() },
    checkin:  { icon: 'fa-location-dot',      name: '查岗',     run: () => Features2.openCheckin() },
    stats:    { icon: 'fa-chart-simple',      name: '聊天统计', run: () => Features2.openStats() },
    expense:  { icon: 'fa-wallet',            name: '记账',     run: () => Features2.openExpense() },
    piggy:    { icon: 'fa-piggy-bank',        name: '存钱罐',   run: () => Features2.openPiggy() },
    shop:     { icon: 'fa-store',             name: '商城',     run: () => Features2.openShop() },
    wheel:    { icon: 'fa-arrows-spin',       name: '幸运转盘', run: () => openWheel() },
    manifest: { icon: 'fa-sun',               name: '显化愿望', run: () => openManifest() },
    oc:       { icon: 'fa-id-badge',          name: 'OC设定',   run: () => openOC() },
    transfer: { icon: 'fa-money-bill-transfer', name: '金币转移', run: () => openTransfer() },
    dataio:   { icon: 'fa-database',          name: '数据导入导出', run: () => openDataIO() },
    system:   { icon: 'fa-toolbox',           name: '系统功能', run: () => openSystem() },
    profile:  { icon: 'fa-user-pen',          name: '头像昵称', run: () => openProfile() },
    ask:      { icon: 'fa-question-circle',   name: '提问投票', run: () => clickTool('btn-ask') },
    redpacket:{ icon: 'fa-gift',              name: '红包',     run: () => clickTool('btn-redpacket') },
    diary:    { icon: 'fa-book',              name: '日记',     run: () => clickTool('btn-diary') },
    letter:   { icon: 'fa-envelope',          name: '写信',     run: () => clickTool('btn-letter') },
    game:     { icon: 'fa-gamepad',           name: '游戏',     run: () => clickTool('btn-game') },
    listen:   { icon: 'fa-music',             name: '一起听歌', run: () => clickTool('btn-listen') },
    watch:    { icon: 'fa-film',              name: '一起观影', run: () => clickTool('btn-watch') },
    read:     { icon: 'fa-book-open',         name: '一起读书', run: () => clickTool('btn-read') },
    newchat:  { icon: 'fa-comment-plus',      name: '发起私聊', run: () => clickTool('btn-new-chat') },
    newgroup: { icon: 'fa-users',             name: '创建群聊', run: () => Group.openCreateGroup() },
    settings: { icon: 'fa-cog',               name: '设置',     run: () => clickTool('btn-settings') },
    goldmodify: { icon: 'fa-coins', name: '金币修改', run: () => openGoldModify() },
    kitchen:  { icon: 'fa-utensils',          name: '厨房',     run: () => Features4.openKitchen() },
    shift:    { icon: 'fa-galaxy',            name: '现实转移', run: () => Features4.openRealityShift() },
    draw:     { icon: 'fa-paintbrush',        name: '画画',     run: () => Features4.openDrawing() },
    peerfreq: { icon: 'fa-heart-pulse',       name: '对方主动频率', run: () => Features4.openPeerFreq() },
    cards:    { icon: 'fa-clone',             name: '字卡',     run: () => Features5.openCards() },
    quote:    { icon: 'fa-quote-right',       name: '格言',     run: () => Features5.openQuotes() }
  };

  /* ==================== 自定义主页 ==================== */
  function renderHome() {
    const d = ensureData();
    const list = document.getElementById('session-list');
    const hour = new Date().getHours();
    const greet = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    const dateStr = `${new Date().getMonth() + 1}月${new Date().getDate()}日`;
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()];

    list.innerHTML = `
      <div class="f3-home-head">
        <img src="${Core.State.user.avatar || UI.AVATARS[0]}" alt="" class="f3-home-avatar">
        <div class="f3-home-greet">
          <b>${greet}，${esc(Core.State.user.nickname || Core.State.user.username)}</b>
          <span>${dateStr} · ${week} · 点击右上角编辑你的主页</span>
        </div>
        <button class="icon-btn" id="f3-home-edit" title="编辑主页"><i class="fas fa-pen-to-square"></i></button>
      </div>
      <div class="f3-widget-grid" id="f3-widget-grid">
        ${d.homeWidgets.map((w, i) => {
          const cat = WIDGET_CATALOG[w.feat] || { icon: 'fa-star', name: w.label || '小组件' };
          return `
          <button class="f3-widget" data-feat="${esc(w.feat)}" data-i="${i}">
            <span class="f3-widget-icon"><i class="fas ${cat.icon}"></i></span>
            <span class="f3-widget-name">${esc(w.label || cat.name)}</span>
            <span class="f3-widget-ops">
              <i class="fas fa-arrow-left f3-w-move" data-dir="-1" title="前移"></i>
              <i class="fas fa-xmark f3-w-del" title="移除"></i>
              <i class="fas fa-arrow-right f3-w-move" data-dir="1" title="后移"></i>
            </span>
          </button>`;
        }).join('')}
      </div>
      <div class="f3-add-widget" id="f3-add-widget" hidden>
        <label class="f3-add-title"><i class="fas fa-plus"></i> 添加小组件</label>
        <div class="f3-add-list">
          ${Object.entries(WIDGET_CATALOG).filter(([k]) => !d.homeWidgets.find(w => w.feat === k)).map(([k, c]) =>
            `<button class="f3-add-chip" data-add="${k}"><i class="fas ${c.icon}"></i> ${c.name}</button>`).join('')
            || '<span style="color:var(--c-text-faint);font-size:12px">所有组件都已在主页上啦</span>'}
        </div>
        <label class="f3-add-title" style="margin-top:12px"><i class="fas fa-tag"></i> 自定义组件名称（可选）</label>
        <input type="text" id="f3-custom-label" placeholder="给组件起个专属名字，添加后生效" maxlength="8">
      </div>`;

    const grid = list.querySelector('#f3-widget-grid');
    const addPanel = list.querySelector('#f3-add-widget');
    const editBtn = list.querySelector('#f3-home-edit');
    const enterEdit = () => {
      grid.classList.add('editing');
      addPanel.hidden = false;
      editBtn.classList.add('active');
      editBtn.title = '完成编辑';
    };
    const exitEdit = () => {
      grid.classList.remove('editing');
      addPanel.hidden = true;
      editBtn.classList.remove('active');
      editBtn.title = '编辑主页';
    };
    editBtn.addEventListener('click', () => {
      if (grid.classList.contains('editing')) exitEdit();
      else enterEdit();
    });

    grid.querySelectorAll('.f3-widget').forEach(el => {
      el.addEventListener('click', () => {
        if (grid.classList.contains('editing')) return;
        const cat = WIDGET_CATALOG[el.dataset.feat];
        if (cat) cat.run();
        else Core.Toast.show('该组件不可用', 'error');
      });
    });
    grid.querySelectorAll('.f3-w-del').forEach(x => x.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(x.closest('.f3-widget').dataset.i);
      d.homeWidgets.splice(i, 1);
      Core.State.save();
      renderHome();
      enterEditSilent();
    }));
    grid.querySelectorAll('.f3-w-move').forEach(x => x.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(x.closest('.f3-widget').dataset.i);
      const j = i + Number(x.dataset.dir);
      if (j < 0 || j >= d.homeWidgets.length) return;
      [d.homeWidgets[i], d.homeWidgets[j]] = [d.homeWidgets[j], d.homeWidgets[i]];
      Core.State.save();
      renderHome();
      enterEditSilent();
    }));
    list.querySelectorAll('.f3-add-chip').forEach(b => b.addEventListener('click', () => {
      const label = list.querySelector('#f3-custom-label').value.trim();
      d.homeWidgets.push({ id: Core.uid(), feat: b.dataset.add, label: label || undefined });
      Core.State.save();
      renderHome();
      enterEditSilent();
    }));
    function enterEditSilent() {
      // 重新渲染后保持编辑态
      const grid2 = document.getElementById('f3-widget-grid');
      if (grid2) { grid2.classList.add('editing'); document.getElementById('f3-add-widget').hidden = false; document.getElementById('f3-home-edit').classList.add('active'); rebindEdit(); }
    }
  }

  /* 主页重渲染后编辑态事件（委托版，供 renderHome 简化时备用） */
  function rebindEdit() { /* renderHome 内已完成绑定，此函数保留为空占位以兼容调用 */ }

  /* ==================== 头像 / 昵称 ==================== */
  const NICKNAME_IDEAS = ['小月亮', '星星糖', '云朵面包', '夏日限定', '半杯暖', '林间鹿', '海盐汽水', '夜色温柔', '橘子海', '奶油布丁', '风的信差', '一口甜', '银河访客', '雾里看花', '桃枝气泡'];

  function openProfile() {
    const user = Core.State.user;
    const d = Core.State.data;
    d.avatarPool = Array.isArray(d.avatarPool) ? d.avatarPool : [];
    d.nickPool = Array.isArray(d.nickPool) ? d.nickPool : [];
    const { overlay, close } = UI.modal({
      title: '✨ 我的头像与昵称',
      body: `
        <div style="text-align:center;margin-bottom:10px">
          ${user.avatar
            ? `<img id="pf-preview" src="${esc(user.avatar)}" class="f3-pf-avatar">`
            : '<div id="pf-preview" class="f3-pf-avatar pf-avatar-placeholder"><i class="fas fa-user"></i></div>'}
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:6px;flex-wrap:wrap">
          <input type="file" id="pf-file" accept="image/*" hidden>
          <button class="btn-primary" id="pf-upload" style="padding:6px 14px;font-size:13px"><i class="fas fa-upload"></i> 上传头像图片</button>
          <button class="btn-ghost" id="pf-hub" style="padding:6px 14px;font-size:13px"><i class="fas fa-images"></i> 头像昵称库</button>
        </div>
        <label class="f2-label">从我的头像库选择（${d.avatarPool.length}）</label>
        <div class="f3-pf-avatars" id="pf-avatars">
          ${d.avatarPool.length
            ? d.avatarPool.map(a => `<img class="f3-pf-opt ${a.url === user.avatar ? 'selected' : ''}" src="${esc(a.url)}" data-a="${esc(a.url)}">`).join('')
            : '<span style="color:var(--c-text-faint);font-size:12px">头像库为空，点上方按钮上传</span>'}
        </div>
        <label class="f2-label">昵称</label>
        <input type="text" id="pf-nick" value="${esc(user.nickname || '')}" maxlength="12" placeholder="给自己起个昵称">
        <label class="f2-label">从昵称库选择（${d.nickPool.length}）</label>
        <div class="f2-chip-row">
          ${d.nickPool.map(n => `<button class="f2-chip selectable" data-n="${esc(n.name)}">${esc(n.name)}</button>`).join('')
            || '<span style="color:var(--c-text-faint);font-size:12px">昵称库为空，可直接在上方输入或去「头像昵称库」添加</span>'}
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="pf-save"><i class="fas fa-check"></i> 保存</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    let avatar = user.avatar || '';
    const setPreview = (src) => {
      let el = overlay.querySelector('#pf-preview');
      if (!src) return;
      if (el.tagName === 'DIV') {
        const img = document.createElement('img');
        img.id = 'pf-preview'; img.className = 'f3-pf-avatar';
        el.replaceWith(img);
        el = img;
      }
      el.src = src;
    };
    const pick = (src) => {
      avatar = src || '';
      if (src) setPreview(src);
      overlay.querySelectorAll('.f3-pf-opt').forEach(x => x.classList.toggle('selected', x.dataset.a === src));
    };
    overlay.querySelectorAll('.f3-pf-opt').forEach(x => x.addEventListener('click', () => pick(x.dataset.a)));
    overlay.querySelector('#pf-hub').addEventListener('click', () => { close(); Features7.openAvatarHub(); });
    overlay.querySelector('#pf-upload').addEventListener('click', () => overlay.querySelector('#pf-file').click());
    overlay.querySelector('#pf-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { Core.Toast.show('图片不能超过 8MB', 'error'); return; }
      try {
        const url = await Features7.fileToDataURL(f, 256);
        d.avatarPool.push({ id: Core.uid(), name: f.name.replace(/\.[^.]+$/, ''), url });
        Core.State.save();
        // 就地刷新头像库网格
        const box = overlay.querySelector('#pf-avatars');
        box.innerHTML = d.avatarPool.map(a => `<img class="f3-pf-opt ${a.url === url ? 'selected' : ''}" src="${esc(a.url)}" data-a="${esc(a.url)}">`).join('');
        box.querySelectorAll('.f3-pf-opt').forEach(x => x.addEventListener('click', () => pick(x.dataset.a)));
        pick(url);
      } catch (err) { Core.Toast.show('图片读取失败', 'error'); }
      e.target.value = '';
    });
    overlay.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
      overlay.querySelector('#pf-nick').value = b.dataset.n;
    }));
    overlay.querySelector('#pf-save').addEventListener('click', () => {
      const nick = overlay.querySelector('#pf-nick').value.trim();
      if (!nick) { Core.Toast.show('昵称不能为空', 'error'); return; }
      // 1) 更新 users 表
      const users = Core.Auth.allUsers();
      if (users[user.username]) { users[user.username].nickname = nick; if (avatar) users[user.username].avatar = avatar; }
      Core.store.set(Core.KEYS.USERS, users);
      // 2) 更新运行态与数据
      user.nickname = nick; if (avatar) user.avatar = avatar;
      Core.State.data.profile = Object.assign(Core.State.data.profile || {}, { nickname: nick });
      if (avatar) Core.State.data.profile.avatar = avatar;
      Core.State.save();
      // 3) 更新侧栏
      const avEl = document.getElementById('current-avatar');
      if (avEl) avEl.src = avatar || avEl.src;
      document.getElementById('current-nickname').textContent = nick;
      UI.refresh();
      Core.Toast.show('资料已更新', 'success');
      close();
    });
  }

  /* ==================== 幸运转盘 ==================== */
  const WHEEL_COLORS = ['#f4b8b8', '#f7d49b', '#b8d8f0', '#c9e4c5', '#d9c2e8', '#f5c6dc', '#a8dadc', '#ffe0a3', '#c3b8e8', '#f0b8a0', '#a8c8e8', '#e8d0a8'];

  function drawWheel(canvas, items, angle) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, cx = W / 2, R = W / 2 - 6;
    ctx.clearRect(0, 0, W, W);
    const n = items.length;
    const seg = (Math.PI * 2) / n;
    const fontSize = n <= 8 ? 15 : n <= 16 ? 12 : n <= 24 ? 9 : 7;
    const maxLen = n <= 8 ? 7 : n <= 16 ? 5 : n <= 24 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * seg;
      ctx.beginPath();
      ctx.moveTo(cx, cx);
      ctx.arc(cx, cx, R, a0, a0 + seg);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = n > 20 ? 1 : 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate(a0 + seg / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#5a6577';
      ctx.font = `600 ${fontSize}px "Noto Sans SC", sans-serif`;
      const label = items[i].length > maxLen ? items[i].slice(0, maxLen) + '…' : items[i];
      ctx.fillText(label, R - 10, 5);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cx, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#a8b8d0';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#6b82a8';
    ctx.font = '700 13px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GO', cx, cx + 5);
    canvas.style.transform = `rotate(${angle}deg)`;
  }

  function openWheel() {
    const d = ensureData();
    let items = (d.wheel.items || []).slice();
    if (items.length < 2) items = ['是', '否'];
    let angle = d.wheel.angle || 0;
    let spinning = false;

    const { overlay, close } = UI.modal({
      title: '🎡 幸运转盘',
      body: `
        <div class="f3-wheel-wrap">
          <div class="f3-wheel-pointer"><i class="fas fa-caret-down"></i></div>
          <canvas id="f3-wheel" width="320" height="320" class="f3-wheel-canvas"></canvas>
        </div>
        <div class="f3-wheel-result" id="f3-wheel-result">设置好选项，点击 GO 或「开始转动」</div>
        <div class="f2-divider"></div>
        <label class="f2-label">自定义选项（每行一个，或用逗号分隔，至少 2 项，数量不限）</label>
        <textarea id="f3-wheel-items" class="f2-textarea" rows="3">${esc(items.join('\n'))}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn-ghost" id="f3-wheel-save" style="flex:1"><i class="fas fa-floppy-disk"></i> 保存选项</button>
          <button class="btn-primary" id="f3-wheel-spin" style="flex:1"><i class="fas fa-arrows-spin"></i> 开始转动</button>
        </div>
        <button class="btn-ghost" id="f3-wheel-share" style="width:100%;margin-top:8px" disabled><i class="fas fa-paper-plane"></i> 把结果发送到聊天</button>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    const canvas = overlay.querySelector('#f3-wheel');
    drawWheel(canvas, items, angle);
    let lastResult = '';

    function readItems() {
      const raw = overlay.querySelector('#f3-wheel-items').value;
      const arr = raw.split(/[\n,，;；]/).map(s => s.trim()).filter(Boolean);
      return arr;
    }
    overlay.querySelector('#f3-wheel-save').addEventListener('click', () => {
      const arr = readItems();
      if (arr.length < 2) { Core.Toast.show('至少填写 2 个选项', 'error'); return; }
      items = arr; d.wheel.items = items; Core.State.save();
      drawWheel(canvas, items, angle);
      Core.Toast.show('转盘选项已保存', 'success');
    });

    overlay.querySelector('#f3-wheel-spin').addEventListener('click', () => spin());
    canvas.addEventListener('click', () => spin());

    function spin() {
      if (spinning) return;
      const arr = readItems();
      if (arr.length < 2) { Core.Toast.show('至少填写 2 个选项', 'error'); return; }
      items = arr;
      spinning = true;
      overlay.querySelector('#f3-wheel-share').disabled = true;
      overlay.querySelector('#f3-wheel-result').textContent = '转动中… ✨';
      const segDeg = 360 / items.length;
      const winIdx = Math.floor(Math.random() * items.length);
      const target = 360 * (5 + Math.floor(Math.random() * 3)) + (360 - (winIdx * segDeg + segDeg / 2));
      angle += target;
      d.wheel.angle = angle; Core.State.save();
      canvas.style.transition = 'transform 4.2s cubic-bezier(.17,.67,.2,1)';
      requestAnimationFrame(() => canvas.style.transform = `rotate(${angle}deg)`);
      setTimeout(() => {
        spinning = false;
        lastResult = items[winIdx];
        overlay.querySelector('#f3-wheel-result').innerHTML = `🎉 结果是：<b>${esc(lastResult)}</b>`;
        overlay.querySelector('#f3-wheel-share').disabled = false;
        Core.Toast.show(`转到了：${lastResult}`, 'success');
      }, 4350);
    }

    overlay.querySelector('#f3-wheel-share').addEventListener('click', () => {
      if (!lastResult) return;
      if (sendCard('fa-arrows-spin', '🎡 幸运转盘结果', [`指针停在了：${lastResult}`, `选项：${items.join(' / ')}`])) close();
    });
  }

  /* ==================== 显化愿望 ==================== */
  const MANIFEST_TYPES = [
    { k: 'wish', emoji: '🌟', name: '愿望' },
    { k: 'harvest', emoji: '🌾', name: '今日收获' },
    { k: 'gratitude', emoji: '🙏', name: '感恩日记' },
    { k: 'goal', emoji: '🎯', name: '每日小目标' },
    { k: 'energy', emoji: '⚡', name: '能量肯定语' }
  ];

  function openManifest() {
    const d = ensureData();
    let curType = 'wish';
    const { overlay, close } = UI.modal({
      title: '🌞 显化愿望',
      body: `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:10px">把愿望与收获写下来，配上每日肯定语，相信它正在向你走来。</p>
        <div class="f3-mf-progress" id="mf-progress"></div>
        <div class="f2-divider"></div>
        <label class="f2-label">类型</label>
        <div class="f2-chip-row" id="mf-types">
          ${MANIFEST_TYPES.map(t => `<button class="f2-chip selectable ${t.k === 'wish' ? 'selected' : ''}" data-mt="${t.k}">${t.emoji} ${t.name}</button>`).join('')}
        </div>
        <label class="f2-label" id="mf-text-label">我的愿望</label>
        <input type="text" id="mf-text" placeholder="例如：顺利通过考试 / 和TA去看海" maxlength="40">
        <label class="f2-label">每日肯定语（对自己说的话）</label>
        <input type="text" id="mf-affirm" placeholder="例如：我值得一切美好，我正在靠近目标" maxlength="60">
        <button class="btn-primary" id="mf-add" style="width:100%;margin-top:10px"><i class="fas fa-sun"></i> 写下来</button>
        <div class="f2-divider"></div>
        <div class="f2-list" id="mf-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    overlay.querySelectorAll('#mf-types [data-mt]').forEach(b => b.addEventListener('click', () => {
      curType = b.dataset.mt;
      overlay.querySelectorAll('#mf-types .selectable').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      const meta = MANIFEST_TYPES.find(t => t.k === curType);
      overlay.querySelector('#mf-text-label').textContent = meta.name;
      const phMap = { wish: '例如：顺利通过考试 / 和TA去看海', harvest: '今天收获了什么？开心的、学到的东西…', gratitude: '感恩今天遇到的人或事…', goal: '今天要完成的小目标…', energy: '一句给自己打气的话…' };
      overlay.querySelector('#mf-text').placeholder = phMap[curType] || '';
    }));

    function render() {
      const done = d.manifests.filter(m => m.done).length;
      overlay.querySelector('#mf-progress').innerHTML = `
        <span>已显化 <b>${done}</b> / ${d.manifests.length}</span>
        <div class="f2-bar" style="flex:1;max-width:220px"><div class="f2-bar-fill me" style="width:${d.manifests.length ? Math.round(done / d.manifests.length * 100) : 0}%"></div></div>`;
      const box = overlay.querySelector('#mf-list');
      box.innerHTML = d.manifests.length ? d.manifests.map(m => {
        const meta = MANIFEST_TYPES.find(t => t.k === m.type) || MANIFEST_TYPES[0];
        return `
        <div class="f3-mf-item ${m.done ? 'done' : ''}" data-id="${m.id}">
          <button class="f3-mf-check" data-check="${m.id}"><i class="${m.done ? 'fas fa-circle-check' : 'far fa-circle'}"></i></button>
          <div class="f2-item-main">
            <div class="f2-item-text">${meta.emoji} ${esc(m.text)}</div>
            <div class="f2-item-sub">${esc(m.affirm || '')} · ${fmtDate(m.time)}${m.done && m.doneTime ? ' · ✅ ' + fmtDate(m.doneTime) + ' 显化' : ''}</div>
          </div>
          <button class="icon-btn f2-del" data-del="${m.id}"><i class="fas fa-trash-can"></i></button>
        </div>`;
      }).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有内容，写下第一个吧</p>';
      box.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', () => {
        const m = d.manifests.find(x => x.id === b.dataset.check);
        m.done = !m.done;
        m.doneTime = m.done ? Core.now() : 0;
        Core.State.save();
        render();
        if (m.done) Core.Toast.show('显化成功，太棒啦 🌟', 'success');
      }));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        d.manifests = d.manifests.filter(x => x.id !== b.dataset.del);
        Core.State.save(); render();
      }));
    }
    overlay.querySelector('#mf-add').addEventListener('click', () => {
      const text = overlay.querySelector('#mf-text').value.trim();
      const affirm = overlay.querySelector('#mf-affirm').value.trim();
      if (!text) { Core.Toast.show('先写下内容', 'error'); return; }
      d.manifests.unshift({ id: Core.uid(), time: Core.now(), type: curType, text, affirm, done: false, doneTime: 0 });
      Core.State.save();
      overlay.querySelector('#mf-text').value = '';
      overlay.querySelector('#mf-affirm').value = '';
      render();
      Core.Toast.show('已记录 🌞', 'success');
    });
    render();
  }

  /* ==================== OC 设定 ==================== */
  const OC_FIELDS = [
    { k: 'age', label: '年龄', ph: '例如：17岁 / 外表年龄不明' },
    { k: 'gender', label: '性别', ph: '例如：女 / 无性别' },
    { k: 'personality', label: '性格', ph: '外冷内热、嘴硬心软…', area: true },
    { k: 'bg', label: '背景故事', ph: 'TA来自哪里，经历过什么…', area: true },
    { k: 'likes', label: '喜好', ph: '喜欢的事物 / 讨厌的东西' },
    { k: 'relation', label: '与我的关系', ph: '青梅竹马 / 搭档 / 陌生人…' },
    { k: 'notes', label: '其他备注', ph: '口头禅、小习惯、外貌细节…', area: true }
  ];

  function openOC() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🎭 OC 角色设定',
      body: `
        <button class="btn-primary" id="oc-add" style="width:100%;margin-bottom:12px"><i class="fas fa-user-plus"></i> 新建角色卡</button>
        <div class="f3-oc-grid" id="oc-grid"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>
               <button class="btn-ghost" id="oc-share"><i class="fas fa-paper-plane"></i> 分享当前角色</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let selectedId = d.ocs[0]?.id || null;

    function render() {
      const grid = overlay.querySelector('#oc-grid');
      grid.innerHTML = d.ocs.length ? d.ocs.map(c => `
        <div class="f3-oc-card ${c.id === selectedId ? 'selected' : ''}" data-id="${c.id}">
          <img src="${esc(c.avatar || UI.AVATARS[0])}" alt="">
          <b>${esc(c.name)}</b>
          <span>${esc(c.relation || c.personality || '点击查看 / 编辑设定')}</span>
          <div class="f3-oc-card-ops">
            <button class="icon-btn" data-edit="${c.id}" title="编辑"><i class="fas fa-pen"></i></button>
            <button class="icon-btn f2-del" data-ocdel="${c.id}" title="删除"><i class="fas fa-trash-can"></i></button>
          </div>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center;grid-column:1/-1;padding:30px 0">还没有角色，点上方按钮创建你的 OC</p>';
      grid.querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit],[data-ocdel]')) return;
        selectedId = el.dataset.id; render();
      }));
      grid.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editOC(b.dataset.edit)));
      grid.querySelectorAll('[data-ocdel]').forEach(b => b.addEventListener('click', () => {
        if (!confirm('确定删除这个角色卡？')) return;
        d.ocs = d.ocs.filter(x => x.id !== b.dataset.ocdel);
        if (selectedId === b.dataset.ocdel) selectedId = d.ocs[0]?.id || null;
        Core.State.save(); render();
      }));
    }
    overlay.querySelector('#oc-add').addEventListener('click', () => editOC(null));
    overlay.querySelector('#oc-share').addEventListener('click', () => {
      const c = d.ocs.find(x => x.id === selectedId);
      if (!c) { Core.Toast.show('先选择一个角色', 'error'); return; }
      sendCard('fa-id-badge', `🎭 OC设定 · ${c.name}`, [
        c.age ? `年龄：${c.age}` : '', c.gender ? `性别：${c.gender}` : '',
        c.relation ? `关系：${c.relation}` : '', c.personality ? `性格：${c.personality}` : '',
        c.bg ? `背景：${c.bg}` : '', c.likes ? `喜好：${c.likes}` : ''
      ].filter(Boolean));
    });

    function editOC(id) {
      const c = id ? d.ocs.find(x => x.id === id) : { id: Core.uid(), name: '', avatar: UI.AVATARS[0] };
      const em = UI.modal({
        title: id ? '编辑角色卡' : '新建角色卡',
        body: `
          <div style="display:flex;gap:14px;align-items:center;margin-bottom:8px">
            <img id="oc-edit-avatar" src="${esc(c.avatar)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--c-border)">
            <div style="flex:1">
              <input type="file" id="oc-file" accept="image/*" hidden>
              <button class="btn-ghost" id="oc-upload" style="padding:5px 12px;font-size:12px"><i class="fas fa-upload"></i> 上传头像</button>
              <label class="f2-label">角色名</label>
              <input type="text" id="oc-name" value="${esc(c.name)}" placeholder="给TA起个名字" maxlength="16">
            </div>
          </div>
          ${OC_FIELDS.map(f => `
            <label class="f2-label">${f.label}</label>
            ${f.area
              ? `<textarea class="f2-textarea" rows="2" id="oc-${f.k}" placeholder="${f.ph}">${esc(c[f.k] || '')}</textarea>`
              : `<input type="text" id="oc-${f.k}" value="${esc(c[f.k] || '')}" placeholder="${f.ph}">`}`).join('')}`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="oc-save"><i class="fas fa-check"></i> 保存角色</button>`,
        size: 'modal-lg'
      });
      em.overlay.querySelector('[data-close]').addEventListener('click', em.close);
      em.overlay.querySelector('#oc-upload').addEventListener('click', () => em.overlay.querySelector('#oc-file').click());
      em.overlay.querySelector('#oc-file').addEventListener('change', (e) => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { c.avatar = r.result; em.overlay.querySelector('#oc-edit-avatar').src = r.result; };
        r.readAsDataURL(f);
      });
      em.overlay.querySelector('#oc-save').addEventListener('click', () => {
        c.name = em.overlay.querySelector('#oc-name').value.trim();
        if (!c.name) { Core.Toast.show('请填写角色名', 'error'); return; }
        OC_FIELDS.forEach(f => { c[f.k] = em.overlay.querySelector('#oc-' + f.k).value.trim(); });
        if (!id) { d.ocs.unshift(c); selectedId = c.id; }
        Core.State.save();
        em.close(); render();
        Core.Toast.show('角色卡已保存', 'success');
      });
    }
    render();
  }

  /* ==================== 金币转移 ==================== */
  function openTransfer() {
    const d = ensureData();
    d.wallet = d.wallet || { coins: 0 };
    const users = Object.values(Core.Auth.allUsers()).filter(u => u.username !== Core.State.user.username);
    const extra = d.contacts.filter(c => !users.find(u => u.username === c.username));
    const all = [...users, ...extra];

    const { overlay, close } = UI.modal({
      title: '💸 金币转移',
      body: `
        <div class="f2-shop-wallet"><span><i class="fas fa-coins" style="color:#e8b04b"></i> 我的金币：<b id="tr-coins">${d.wallet.coins}</b></span></div>
        ${all.length ? `
          <label class="f2-label">选择接收人</label>
          <div class="contact-list" id="tr-list">
            ${all.map(u => `
              <div class="contact-option" data-u="${esc(u.username)}">
                <img src="${esc(u.avatar || UI.AVATARS[0])}" style="width:40px;height:40px;border-radius:50%">
                <div><div style="font-weight:500">${esc(u.nickname || u.username)}</div><div style="font-size:11px;color:var(--c-text-faint)">@${esc(u.username)}</div></div>
              </div>`).join('')}
          </div>` : '<p style="color:var(--c-text-faint);text-align:center">还没有其他用户，先注册一个账号或添加联系人</p>'}
        <label class="f2-label">转移金额</label>
        <input type="number" id="tr-amount" min="1" step="1" placeholder="要转多少金币">
        <label class="f2-label">附言（可选）</label>
        <input type="text" id="tr-note" placeholder="说点什么…" maxlength="30">
        <button class="btn-primary" id="tr-confirm" style="width:100%;margin-top:12px"><i class="fas fa-paper-plane"></i> 确认转移</button>
        <div class="f2-divider"></div>
        <label class="f2-label">最近转移记录</label>
        <div class="f2-list">
          ${(d.transfers || []).slice(0, 6).map(t => `
            <div class="f2-item">
              <span class="f2-item-mood">💸</span>
              <div class="f2-item-main">
                <div class="f2-item-text">转给 ${esc(t.toName)}</div>
                <div class="f2-item-sub">${fmtDate(t.time)} ${fmtHM(t.time)}${t.note ? ' · ' + esc(t.note) : ''}</div>
              </div>
              <b class="f2-red">-${t.amount}</b>
            </div>`).join('') || '<span style="color:var(--c-text-faint);font-size:12px">暂无转移记录</span>'}
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    if (!all.length) return;

    let target = null;
    overlay.querySelectorAll('#tr-list [data-u]').forEach(el => el.addEventListener('click', () => {
      target = all.find(u => u.username === el.dataset.u);
      overlay.querySelectorAll('#tr-list .contact-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    }));

    overlay.querySelector('#tr-confirm').addEventListener('click', () => {
      if (!target) { Core.Toast.show('请选择接收人', 'error'); return; }
      const amount = Math.floor(Number(overlay.querySelector('#tr-amount').value));
      const note = overlay.querySelector('#tr-note').value.trim();
      if (!amount || amount <= 0) { Core.Toast.show('请输入正确的金额', 'error'); return; }
      if (amount > d.wallet.coins) { Core.Toast.show('金币余额不足', 'error'); return; }

      // 扣款 + 记录
      d.wallet.coins -= amount;
      d.transfers.unshift({ id: Core.uid(), time: Core.now(), to: target.username, toName: target.nickname || target.username, amount, note });
      Core.State.save();

      // 双方会话消息
      const sid = Core.State.getOrCreateSession(target.username, 'private');
      const lines = [`转账金额：${amount} 金币`, note ? `附言：${note}` : '', '点击领取心意（金币已同步到TA的账户）'].filter(Boolean);
      const msg = {
        id: Core.uid(), from: Core.State.user.username, to: target.username, type: 'card',
        cardIcon: 'fa-money-bill-transfer', cardTitle: `💸 收到来自 ${Core.State.user.nickname} 的金币转移`,
        lines, time: Core.now(), status: 'sent'
      };
      Core.State.addMessage(sid, msg);
      Core.Sync.send('message', {
        from: msg.from, to: msg.to, type: 'card',
        cardIcon: msg.cardIcon, cardTitle: msg.cardTitle, lines: msg.lines, time: msg.time
      });

      // 同浏览器直接写入对方本地数据
      try {
        const pd = Core.store.get(Core.KEYS.DATA(target.username), null);
        if (pd) {
          pd.wallet = pd.wallet || { coins: 0 };
          pd.wallet.coins = (pd.wallet.coins || 0) + amount;
          pd.messages = pd.messages || {};
          pd.messages[sid] = pd.messages[sid] || [];
          if (!pd.messages[sid].find(x => x.id === msg.id)) {
            pd.messages[sid].push({ ...msg, id: Core.uid(), status: 'delivered' });
          }
          pd.sessions = pd.sessions || {};
          if (!pd.sessions[sid]) {
            pd.sessions[sid] = { id: sid, type: 'private', name: Core.State.user.nickname, avatar: Core.State.user.avatar, lastMsg: '[card]', lastTime: msg.time, unread: 1, members: [Core.State.user.username, target.username] };
          }
          Core.store.set(Core.KEYS.DATA(target.username), pd);
        }
      } catch (err) { /* 对方数据不可用时依赖 Sync 通道 */ }

      UI.refresh();
      Core.Toast.show(`已向 ${target.nickname || target.username} 转移 ${amount} 金币`, 'success');
      close();
    });
  }

  /* ==================== 数据导入导出 ==================== */
  const IO_MODULES = [
    { k: 'messages', name: '聊天记录' },
    { k: 'sessions', name: '会话列表' },
    { k: 'contacts', name: '联系人' },
    { k: 'groups', name: '群组' },
    { k: 'diaries', name: '日记' },
    { k: 'letters', name: '信件' },
    { k: 'books', name: '书库（含文件，可能较大）' },
    { k: 'media', name: '影音收藏' },
    { k: 'moods', name: '心情手账' },
    { k: 'calendar', name: '日历记录' },
    { k: 'fish', name: '摸鱼记录' },
    { k: 'checkins', name: '查岗记录' },
    { k: 'expenses', name: '记账数据' },
    { k: 'piggy', name: '存钱罐' },
    { k: 'wallet', name: '钱包金币' },
    { k: 'wishes', name: '心愿单' },
    { k: 'purchases', name: '购买记录' },
    { k: 'decks', name: '自定义牌组' },
    { k: 'fortune', name: '占卜记录' },
    { k: 'homeWidgets', name: '主页布局' },
    { k: 'wheel', name: '转盘配置' },
    { k: 'manifests', name: '显化清单' },
    { k: 'ocs', name: 'OC 设定' },
    { k: 'transfers', name: '转移记录' },
    { k: 'shopItems', name: '自定义商品' },
    { k: 'deckNotes', name: '卦签笔记' },
    { k: 'kitchen', name: '厨房数据' },
    { k: 'realityShifts', name: '世界线剧本' },
    { k: 'drawings', name: '画作' },
    { k: 'peerFreq', name: '对方主动频率' },
    { k: 'wordCards', name: '字卡' },
    { k: 'stickers', name: '表情包' },
    { k: 'quotes', name: '格言' },
    { k: 'games', name: '游戏战绩' },
    { k: 'settings', name: '偏好设置' },
    { k: 'profile', name: '个人资料' }
  ];

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function mergeById(a = [], b = []) {
    const map = new Map(a.map(x => [x.id, x]));
    b.forEach(x => { if (x && x.id && !map.has(x.id)) map.set(x.id, x); });
    return [...map.values()];
  }

  function mergeModule(key, incoming) {
    const d = Core.State.data;
    const cur = d[key];
    if (Array.isArray(incoming)) {
      d[key] = Array.isArray(cur) ? mergeById(cur, incoming) : incoming;
    } else if (incoming && typeof incoming === 'object') {
      if (key === 'messages') {
        d[key] = Object.assign({}, cur);
        Object.keys(incoming).forEach(sid => { d[key][sid] = mergeById(cur?.[sid], incoming[sid]); });
      } else if (key === 'wallet') {
        d[key] = Object.assign({}, cur, incoming, { coins: (cur?.coins || 0) + (incoming.coins || 0) });
      } else if (key === 'piggy') {
        d[key] = Object.assign({}, cur, incoming, {
          balance: (cur?.balance || 0) + (incoming.balance || 0),
          goal: incoming.goal ?? cur?.goal ?? 0,
          history: mergeById(cur?.history || [], incoming.history || [])
        });
      } else {
        d[key] = Object.assign({}, cur, incoming);
      }
    } else {
      d[key] = incoming;
    }
  }

  function openDataIO() {
    const { overlay, close } = UI.modal({
      title: '🗄️ 数据导入 / 导出',
      body: `
        <div class="f3-dio-section">
          <label class="f2-label"><i class="fas fa-file-export"></i> 导出数据</label>
          <p style="font-size:12px;color:var(--c-text-faint);margin-bottom:8px">勾选要导出的模块，不勾则导出全部数据。所有数据都保存在你的浏览器本地。</p>
          <div class="f3-dio-grid" id="dio-export-grid">
            ${IO_MODULES.map(m => `<label class="f3-dio-check"><input type="checkbox" data-export="${m.k}"> <span>${m.name}</span></label>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn-primary" id="dio-export-sel" style="flex:1"><i class="fas fa-download"></i> 导出勾选模块</button>
            <button class="btn-ghost" id="dio-export-all" style="flex:1"><i class="fas fa-box-archive"></i> 导出完整备份</button>
          </div>
        </div>
        <div class="f2-divider"></div>
        <div class="f3-dio-section">
          <label class="f2-label"><i class="fas fa-file-import"></i> 导入数据</label>
          <p style="font-size:12px;color:var(--c-text-faint);margin-bottom:8px">选择之前导出的 JSON 文件，可勾选要导入的模块与合并方式。</p>
          <input type="file" id="dio-file" accept="application/json,.json" style="margin-bottom:10px">
          <div id="dio-import-panel" hidden>
            <div class="f3-dio-grid" id="dio-import-grid"></div>
            <div style="display:flex;gap:14px;margin:10px 0;font-size:13px;color:var(--c-text-soft)">
              <label><input type="radio" name="dio-mode" value="merge" checked> 合并（保留现有，追加新数据）</label>
              <label><input type="radio" name="dio-mode" value="overwrite"> 覆盖（替换所选模块）</label>
            </div>
            <button class="btn-primary" id="dio-import-go" style="width:100%"><i class="fas fa-upload"></i> 开始导入</button>
          </div>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    const exportChecks = () => [...overlay.querySelectorAll('[data-export]:checked')].map(x => x.dataset.export);
    overlay.querySelector('#dio-export-sel').addEventListener('click', () => {
      const keys = exportChecks();
      if (!keys.length) { Core.Toast.show('请勾选至少一个模块', 'error'); return; }
      const pick = {};
      keys.forEach(k => { pick[k] = Core.State.data[k]; });
      downloadJSON({ __siyu: 'module', version: 1, exportedAt: Core.now(), username: Core.State.user.username, data: pick },
        `siyu_modules_${Date.now()}.json`);
      Core.Toast.show(`已导出 ${keys.length} 个模块`, 'success');
    });
    overlay.querySelector('#dio-export-all').addEventListener('click', () => {
      downloadJSON(Object.assign({ __siyu: 'backup', version: 1, exportedAt: Core.now(), username: Core.State.user.username }, Core.State.data),
        `siyu_backup_${Date.now()}.json`);
      Core.Toast.show('完整备份已导出', 'success');
    });

    let parsed = null;
    overlay.querySelector('#dio-file').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          parsed = JSON.parse(r.result);
        } catch { Core.Toast.show('文件不是有效的 JSON', 'error'); return; }
        const dataPart = parsed.__siyu ? parsed.data : (parsed.profile || parsed.messages ? parsed : null);
        if (!dataPart) { Core.Toast.show('无法识别的备份文件', 'error'); return; }
        const found = IO_MODULES.filter(m => dataPart[m.k] !== undefined);
        const panel = overlay.querySelector('#dio-import-panel');
        panel.hidden = false;
        overlay.querySelector('#dio-import-grid').innerHTML = found.length
          ? found.map(m => `<label class="f3-dio-check"><input type="checkbox" data-import="${m.k}" checked> <span>${m.name}</span></label>`).join('')
          : '<span style="color:var(--c-text-faint);font-size:12px">文件中没有可导入的模块</span>';
        panel._data = dataPart;
        Core.Toast.show(`已读取备份，含 ${found.length} 个模块`, 'success');
      };
      r.readAsText(f);
    });

    overlay.querySelector('#dio-import-panel').addEventListener('click', (e) => {
      if (e.target.id !== 'dio-import-go') return;
      const panel = overlay.querySelector('#dio-import-panel');
      const dataPart = panel._data;
      const keys = [...overlay.querySelectorAll('[data-import]:checked')].map(x => x.dataset.import);
      if (!keys.length) { Core.Toast.show('请勾选要导入的模块', 'error'); return; }
      const mode = overlay.querySelector('input[name="dio-mode"]:checked').value;
      if (!confirm(mode === 'overwrite' ? '覆盖模式将替换所选模块的现有数据，确定继续？' : '将合并导入所选模块，确定继续？')) return;
      keys.forEach(k => {
        if (mode === 'overwrite') Core.State.data[k] = dataPart[k];
        else mergeModule(k, dataPart[k]);
      });
      Core.State.save();
      UI.refresh();
      Core.Toast.show(`已${mode === 'overwrite' ? '覆盖' : '合并'}导入 ${keys.length} 个模块`, 'success');
      close();
    });
  }

  /* ==================== 金币修改 ==================== */
  function openGoldModify() {
    const d = ensureData();
    d.wallet = d.wallet || { coins: 0 };
    const { overlay, close } = UI.modal({
      title: '🪙 修改金币数额',
      body: `
        <div class="f2-shop-wallet"><span><i class="fas fa-coins" style="color:#e8b04b"></i> 当前金币：<b>${d.wallet.coins}</b></span></div>
        <label class="f2-label">设置为</label>
        <input type="number" id="gm-amount" value="${d.wallet.coins}" min="0" step="1" placeholder="输入想要的金币数额">
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn-ghost" id="gm-add100" style="flex:1">+100</button>
          <button class="btn-ghost" id="gm-add1000" style="flex:1">+1000</button>
          <button class="btn-ghost" id="gm-reset" style="flex:1">归零</button>
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="gm-save"><i class="fas fa-check"></i> 确认修改</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    const input = overlay.querySelector('#gm-amount');
    overlay.querySelector('#gm-add100').addEventListener('click', () => { input.value = Number(input.value) + 100; });
    overlay.querySelector('#gm-add1000').addEventListener('click', () => { input.value = Number(input.value) + 1000; });
    overlay.querySelector('#gm-reset').addEventListener('click', () => { input.value = 0; });
    overlay.querySelector('#gm-save').addEventListener('click', () => {
      const v = Math.floor(Number(input.value));
      if (isNaN(v) || v < 0) { Core.Toast.show('请输入有效数额', 'error'); return; }
      d.wallet.coins = v;
      Core.State.save();
      Core.Toast.show(`金币已修改为 ${v} 🪙`, 'success');
      close();
    });
  }

  /* ==================== 系统功能面板 ==================== */
  function openSystem() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🧰 系统功能',
      body: `
        <div class="f3-sys-grid">
          <button class="f3-sys-item" data-sys="dataio"><i class="fas fa-database"></i><span>数据导入导出</span><em>整体/分模块备份恢复</em></button>
          <button class="f3-sys-item" data-sys="transfer"><i class="fas fa-money-bill-transfer"></i><span>金币转移</span><em>把金币转给联系人</em></button>
          <button class="f3-sys-item" data-sys="home"><i class="fas fa-house"></i><span>编辑主页</span><em>自定义小组件</em></button>
          <button class="f3-sys-item" data-sys="profile"><i class="fas fa-user-pen"></i><span>头像昵称</span><em>更换头像与昵称</em></button>
          <button class="f3-sys-item" data-sys="settings"><i class="fas fa-sliders-h"></i><span>概率与主题</span><em>自动回复概率 / 主题色</em></button>
          <button class="f3-sys-item" data-sys="recharge"><i class="fas fa-coins"></i><span>领取零花钱</span><em>金币 +1000</em></button>
          <button class="f3-sys-item" data-sys="goldmodify"><i class="fas fa-coins"></i><span>修改金币</span><em>自定义金币数额</em></button>
          <button class="f3-sys-item danger" data-sys="clear"><i class="fas fa-trash"></i><span>清空数据</span><em>不可恢复，谨慎操作</em></button>
          <button class="f3-sys-item danger" data-sys="logout"><i class="fas fa-sign-out-alt"></i><span>退出登录</span><em>回到登录页</em></button>
        </div>
        <div class="f2-divider"></div>
        <p style="font-size:12px;color:var(--c-text-faint);line-height:1.8">
          私语 · 本地私人聊天空间<br>所有消息与设置仅保存在当前浏览器中，清理浏览器数据前请先导出备份。
        </p>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('[data-sys]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.sys;
      if (act === 'dataio') { close(); openDataIO(); }
      else if (act === 'transfer') { close(); openTransfer(); }
      else if (act === 'home') { close(); document.querySelector('.tab-item[data-tab="home"]').click(); setTimeout(() => document.getElementById('f3-home-edit')?.click(), 60); }
      else if (act === 'profile') { close(); openProfile(); }
      else if (act === 'settings') { close(); clickTool('btn-settings'); }
      else if (act === 'recharge') {
        d.wallet = d.wallet || { coins: 0 };
        d.wallet.coins += 1000;
        Core.State.save();
        Core.Toast.show('零花钱到账 +1000 🪙', 'success');
      }
      else if (act === 'goldmodify') { close(); openGoldModify(); }
      else if (act === 'clear') {
        if (confirm('确定清空当前账号的全部数据吗？此操作不可恢复，建议先导出备份！')) {
          const uid = Core.State.user.username;
          Core.store.remove(Core.KEYS.DATA(uid));
          Core.State.load(uid);
          UI.refresh();
          Core.Toast.show('数据已清空', 'success');
          close();
        }
      }
      else if (act === 'logout') {
        if (confirm('确定退出登录吗？')) { Core.Auth.logout(); location.reload(); }
      }
    }));
  }

  /* ==================== 初始化 ==================== */
  function init() {
    ensureData();
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    bind('btn-wheel', openWheel);
    bind('btn-manifest', openManifest);
    bind('btn-oc', openOC);
    bind('btn-system', openSystem);
  }

  return { init, renderHome, openProfile, openWheel, openManifest, openOC, openSystem, openTransfer, openDataIO, openGoldModify };
})();
