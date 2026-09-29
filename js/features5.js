/* ============ 私语 · 第五批扩展 (字卡 / 表情包 / 颜文字 / 视频通话 / 格言) ============ */
const Features5 = (() => {

  /* ---- 数据惰性初始化 ---- */
  const BUILTIN_QUOTES = [
    { text: '长风破浪会有时，直挂云帆济沧海。', author: '李白' },
    { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
    { text: '千里之行，始于足下。', author: '老子' },
    { text: '不积跬步，无以至千里。', author: '荀子' },
    { text: '业精于勤，荒于嬉；行成于思，毁于随。', author: '韩愈' },
    { text: '天生我材必有用，千金散尽还复来。', author: '李白' },
    { text: '会当凌绝顶，一览众山小。', author: '杜甫' },
    { text: '宝剑锋从磨砺出，梅花香自苦寒来。', author: '警世贤文' },
    { text: '世上无难事，只怕有心人。', author: '谚语' },
    { text: '生活不是等待风暴过去，而是学会在雨中翩翩起舞。', author: '佚名' },
    { text: '你若盛开，蝴蝶自来；你若精彩，天自安排。', author: '佚名' },
    { text: '把平凡的日子过成诗，就是最好的生活。', author: '佚名' }
  ];

  function ensureData() {
    const d = Core.State.data;
    d.wordCards = d.wordCards || [];
    d.stickers = d.stickers || [];
    if (!Array.isArray(d.quotes)) {
      d.quotes = BUILTIN_QUOTES.map(q => ({ id: Core.uid(), ...q }));
    }
    return d;
  }

  const esc = (s) => UI.escapeHtml(String(s ?? ''));

  function requireChat() {
    if (!Core.State.currentChatId) { Core.Toast.show('请先打开一个会话', 'error'); return false; }
    return true;
  }
  function sendCard(icon, title, lines) {
    if (!requireChat()) return;
    Messaging.sendMessage({ type: 'card', cardIcon: icon, cardTitle: title, lines });
    Core.Toast.show('已发送到聊天', 'success');
  }

  /* 当前会话对方用户名（私聊） */
  function currentPeer() {
    const sid = Core.State.currentChatId;
    if (!sid) return null;
    const s = Core.State.data.sessions[sid];
    if (!s || s.type !== 'private') return null;
    return s.members.find(x => x !== Core.State.user.username) || null;
  }
  function peerDisplayName(username) {
    const c = (Core.State.data.contacts || []).find(x => x.username === username);
    return c?.nickname || Core.Auth.getUser(username)?.nickname || username;
  }
  /* 可勾选的人物列表（联系人 + 其他用户去重合并） */
  function peerOptions() {
    const contacts = Core.State.data.contacts || [];
    const users = Object.values(Core.Auth.allUsers()).filter(u => u.username !== Core.State.user.username);
    const merged = [...contacts];
    users.forEach(u => { if (!merged.find(c => c.username === u.username)) merged.push(u); });
    return merged;
  }

  /* ==================== 表情面板（表情 / 表情包 / 颜文字） ==================== */
  const EMOJIS = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤔','😐','😑','😶',
    '😏','😒','🙄','😬','😌','😔','😪','🤤','😴','😷','🤒','🤕','😮','😯','😲','😳',
    '🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤',
    '😡','😠','🤬','🤡','👻','👽','🤖','💋','💌','💘','💝','💖','💗','💓','💞','💕',
    '💟','💔','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','💢','💥','💫','💦','💨',
    '💣','💬','💭','💤','👋','🤚','✋','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉',
    '👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️',
    '💪','🦵','🦶','👂','👃','🧠','👀','👅','👄','🐶','🐱','🐭','🐹','🐰','🦊','🐻',
    '🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🐺','🐴',
    '🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦐','🦀','🐟','🐬','🐳',
    '🐋','🦈','🐊','🐆','🦓','🦍','🐘','🦏','🐪','🦒','🦘','🐄','🐎','🐖','🐑','🦙',
    '🐐','🦌','🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🕊️','🐇','🦝','🦨','🦦','🐁',
    '🐀','🐿️','🦔','🐾','🌸','🌺','🌻','🌹','🌷','🌼','🍀','🌿','🍁','🍂','🌵','🌴',
    '🌳','🌲','🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥝','🍍','🥥','🥑','🍅',
    '🥕','🌽','🥔','🍞','🧀','🥚','🍳','🍔','🍟','🍕','🌭','🥪','🌮','🍜','🍲','🍛',
    '🍣','🍱','🥟','🍦','🍰','🎂','🍫','🍬','🍭','🍿','☕','🍵','🍺','🍷','🥂','🍹'
  ];
  const KAOMOJIS = [
    '(´▽`)','(◕‿◕)','(｡♥‿♥｡)','(づ｡◕‿‿◕｡)づ','ヾ(＾▽＾)','(¬‿¬)','(•‿•)','ヽ(・∀・)ﾉ',
    '(✿◠‿◠)','(｡･ω･｡)','(=^･ω･^=)','(´；ω；`)','(╥﹏╥)','(T_T)','(ToT)','(；д；)',
    '(ノД`)','(￣▽￣)','(￣ω￣)','(￣﹃￣)','(´・ω・`)','(｡•́︿•̀｡)','(｡•̀ᴗ-)✧','ヾ(≧▽≦*)o',
    '(≧▽≦)','o(*￣▽￣*)ブ','(*^▽^*)','(＾▽＾)','(￣▽￣)ノ','└(＾＾)┐','♪(´▽｀)','(＾ω＾)',
    '(´∀`)','(・・?)','(￣ー￣)','(・-・)','(・Ω・)','(=ﾟωﾟ)=','⊂((・⊥・))⊃','(๑•̀ㅂ•́)و✧',
    '(๑´ㅂ`๑)','(๑•̀ω•́)ノ','(っ˘ω˘ς)','( ˘ω˘ )','(˘▽˘)~','(◍•ᴗ•◍)','(๑¯◡¯๑)','( ˙∇˙ )',
    '…φ(○○*)','(￣ε￣)','(っ˘ڡ˘ς)','( ˘ ³˘)♥','(๑˘ ˘๑)','( ˊᵕˋ )','☆⌒(≧▽°)','(￣ρ￣)'
  ];
  const stickerUrl = (p) => `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(p)}&image_size=square`;
  const BUILTIN_STICKERS = [
    { id: 'sb-happy', name: '开心', url: stickerUrl('cute chibi anime sticker happy smiling face, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-cry',   name: '哭泣', url: stickerUrl('cute chibi anime sticker crying face with tears, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-angry', name: '生气', url: stickerUrl('cute chibi anime sticker angry pouting face, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-love',  name: '比心', url: stickerUrl('cute chibi anime sticker making finger heart gesture, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-pat',   name: '摸头', url: stickerUrl('cute chibi anime sticker gentle head pat comfort, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-eat',   name: '干饭', url: stickerUrl('cute chibi anime sticker happily eating rice bowl, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-sleep', name: '睡觉', url: stickerUrl('cute chibi anime sticker sleeping peacefully with zzz, kawaii pastel style, sticker art, clean background') },
    { id: 'sb-shy',   name: '害羞', url: stickerUrl('cute chibi anime sticker shy blushing face, kawaii pastel style, sticker art, clean background') }
  ];

  function initPanel() {
    const btn = document.getElementById('btn-emoji');
    if (!btn) return;
    const panel = document.createElement('div');
    panel.className = 'emoji-panel emoji-panel-v5';
    panel.innerHTML = `
      <div class="ep-tabs">
        <button class="ep-tab active" data-ept="emoji">😊 表情</button>
        <button class="ep-tab" data-ept="sticker">🖼️ 表情包</button>
        <button class="ep-tab" data-ept="km">颜文字</button>
      </div>
      <div class="ep-body" id="ep-body"></div>`;
    document.querySelector('.input-area').appendChild(panel);
    let tab = 'emoji';
    const body = panel.querySelector('#ep-body');

    function render() {
      if (tab === 'emoji') {
        body.innerHTML = `<div class="ep-grid">${EMOJIS.map(e => `<span class="emoji-item">${e}</span>`).join('')}</div>`;
      } else if (tab === 'sticker') {
        const d = ensureData();
        body.innerHTML = `<div class="ep-grid stk">
          ${BUILTIN_STICKERS.map(s => `<div class="stk-item" data-stk="${s.id}" title="${s.name}"><img src="${s.url}" alt="${s.name}"></div>`).join('')}
          ${d.stickers.map(s => `<div class="stk-item" data-stk="${s.id}" title="${esc(s.name || '')}"><img src="${s.url}" alt="">
            <button class="stk-del" data-stkdel="${s.id}" title="删除"><i class="fas fa-xmark"></i></button></div>`).join('')}
          <button class="stk-item stk-add" id="stk-add" title="上传表情包"><i class="fas fa-plus"></i></button>
        </div>`;
      } else {
        body.innerHTML = `<div class="ep-grid km">${KAOMOJIS.map(k => `<span class="emoji-item km-item">${k}</span>`).join('')}</div>`;
      }
    }

    panel.querySelector('.ep-tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-ept]');
      if (!t) return;
      tab = t.dataset.ept;
      panel.querySelectorAll('.ep-tab').forEach(x => x.classList.toggle('active', x === t));
      render();
    });

    body.addEventListener('click', (e) => {
      const del = e.target.closest('[data-stkdel]');
      if (del) {
        const d = ensureData();
        d.stickers = d.stickers.filter(s => s.id !== del.dataset.stkdel);
        Core.State.save();
        render();
        Core.Toast.show('已删除表情包', 'success');
        return;
      }
      if (e.target.closest('#stk-add')) { uploadSticker(render); return; }
      const stk = e.target.closest('[data-stk]');
      if (stk) {
        const all = [...BUILTIN_STICKERS, ...ensureData().stickers];
        const s = all.find(x => x.id === stk.dataset.stk);
        if (s && requireChat()) {
          Messaging.sendMessage({ type: 'image', url: s.url });
          Core.Toast.show('表情包已发送', 'success');
        }
        return;
      }
      const item = e.target.closest('.emoji-item');
      if (item) {
        const input = document.getElementById('message-input');
        input.value += item.textContent;
        input.dispatchEvent(new Event('input'));
        input.focus();
      }
    });

    btn.addEventListener('click', () => panel.classList.toggle('show'));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.emoji-panel') && !e.target.closest('#btn-emoji')) {
        panel.classList.remove('show');
      }
    });
    render();
  }

  function uploadSticker(after) {
    ensureData();
    if (Core.State.data.stickers.length >= 50) { Core.Toast.show('表情包最多 50 张', 'error'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { Core.Toast.show('图片不能超过 2MB', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const d = ensureData();
        d.stickers.push({ id: Core.uid(), name: file.name.replace(/\.[^.]+$/, ''), url: reader.result });
        Core.State.save();
        Core.Toast.show('已添加到表情包', 'success');
        if (after) after();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* ==================== 字卡 ==================== */
  function openCards() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🗂️ 字卡',
      body: `
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button class="btn-primary" id="wc-add" style="flex:1"><i class="fas fa-plus"></i> 单条添加</button>
          <button class="btn-primary" id="wc-batch" style="flex:1"><i class="fas fa-layer-group"></i> 批量添加</button>
        </div>
        <div class="f2-chip-row" id="wc-scope-chips">
          <button class="f2-chip selectable selected" data-wcscope="all">全部</button>
          <button class="f2-chip selectable" data-wcscope="pub">通用</button>
          <button class="f2-chip selectable" data-wcscope="peer">专属</button>
        </div>
        <div class="f2-chip-row" id="wc-cat-chips"></div>
        <div class="f2-list" id="wc-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let scope = 'all', cat = '';

    const cats = () => [...new Set(d.wordCards.map(c => c.cat).filter(Boolean))];

    function render() {
      const catRow = overlay.querySelector('#wc-cat-chips');
      catRow.innerHTML = [
        `<button class="f2-chip selectable ${cat === '' ? 'selected' : ''}" data-wccat="">全部分类</button>`,
        ...cats().map(c => `<button class="f2-chip selectable ${cat === c ? 'selected' : ''}" data-wccat="${esc(c)}">${esc(c)}</button>`),
        ...(d.wordCards.some(c => !c.cat) ? [`<button class="f2-chip selectable ${cat === '__none' ? 'selected' : ''}" data-wccat="__none">未分类</button>`] : [])
      ].join('');

      const list = overlay.querySelector('#wc-list');
      const items = d.wordCards.filter(c =>
        (scope === 'all' || c.scope === scope) &&
        (cat === '' || (cat === '__none' ? !c.cat : c.cat === cat)));
      list.innerHTML = items.length ? items.map(c => {
        const peerNames = (c.peers || []).map(peerDisplayName).join('、');
        return `
        <div class="f2-item">
          <span class="f2-item-mood">${c.scope === 'peer' ? '👤' : '🌐'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(c.text)}</div>
            <div class="f2-item-sub">
              <span class="wc-badge ${c.cat ? '' : 'wc-badge-dim'}">${c.cat ? esc(c.cat) : '未分类'}</span>
              ${c.scope === 'peer'
                ? `<span class="wc-badge">仅 ${esc(peerNames || '未选择人物')} 可用</span>`
                : '<span class="wc-badge wc-badge-dim">通用</span>'}
            </div>
          </div>
          <button class="icon-btn" data-wcsend="${c.id}" title="发送到聊天"><i class="fas fa-paper-plane"></i></button>
          <button class="icon-btn" data-wcedit="${c.id}" title="编辑"><i class="fas fa-pen"></i></button>
          <button class="icon-btn f2-del" data-wcdel="${c.id}" title="删除"><i class="fas fa-trash-can"></i></button>
        </div>`;
      }).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有字卡，点击上方按钮添加吧</p>';

      list.querySelectorAll('[data-wcsend]').forEach(b => b.addEventListener('click', () => sendWordCard(d.wordCards.find(x => x.id === b.dataset.wcsend))));
      list.querySelectorAll('[data-wcedit]').forEach(b => b.addEventListener('click', () => editCard(b.dataset.wcedit, render)));
      list.querySelectorAll('[data-wcdel]').forEach(b => b.addEventListener('click', () => {
        d.wordCards = d.wordCards.filter(x => x.id !== b.dataset.wcdel);
        Core.State.save();
        render();
      }));
      catRow.querySelectorAll('[data-wccat]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.wccat; render(); }));
    }

    overlay.querySelector('#wc-scope-chips').addEventListener('click', (e) => {
      const t = e.target.closest('[data-wcscope]');
      if (!t) return;
      scope = t.dataset.wcscope;
      overlay.querySelectorAll('#wc-scope-chips .f2-chip').forEach(x => x.classList.toggle('selected', x === t));
      render();
    });
    overlay.querySelector('#wc-add').addEventListener('click', () => editCard(null, render));
    overlay.querySelector('#wc-batch').addEventListener('click', () => batchAdd(render));
    render();
  }

  function peerCheckboxList(selected) {
    return peerOptions().map(u => `
      <label class="wc-peer-check"><input type="checkbox" value="${esc(u.username)}" ${(selected || []).includes(u.username) ? 'checked' : ''}>
        <span>${esc(u.nickname || u.username)} <i style="font-style:normal;color:var(--c-text-faint)">@${esc(u.username)}</i></span></label>`).join('')
      || '<p style="color:var(--c-text-faint);font-size:12px">暂无其他用户，专属字卡需要先有聊天对象</p>';
  }

  function editCard(id, onDone) {
    const d = ensureData();
    const c = id ? d.wordCards.find(x => x.id === id) : { id: Core.uid(), text: '', cat: '', scope: 'pub', peers: [] };
    const em = UI.modal({
      title: id ? '编辑字卡' : '添加字卡',
      body: `
        <label class="f2-label">字卡内容</label>
        <textarea id="wc-text" class="f2-textarea" rows="3" placeholder="输入字卡内容，例如：晚安，做个好梦～">${esc(c.text)}</textarea>
        <label class="f2-label">分类</label>
        <input type="text" id="wc-cat" list="wc-cat-list" value="${esc(c.cat)}" placeholder="例如：日常 / 关心 / 问候（可留空）">
        <datalist id="wc-cat-list">${[...new Set(d.wordCards.map(x => x.cat).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        <label class="f2-label">使用范围</label>
        <div class="f2-chip-row">
          <button class="f2-chip selectable ${c.scope !== 'peer' ? 'selected' : ''}" data-wcr="pub">🌐 通用（所有会话可用）</button>
          <button class="f2-chip selectable ${c.scope === 'peer' ? 'selected' : ''}" data-wcr="peer">👤 专属（勾选人物可用）</button>
        </div>
        <div id="wc-peers-box" class="${c.scope === 'peer' ? '' : 'hidden'}">
          <label class="f2-label">勾选可使用该字卡的人物</label>
          <div class="wc-peer-list">${peerCheckboxList(c.peers)}</div>
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="wc-save">保存</button>`,
      size: 'modal-lg'
    });
    let scope = c.scope || 'pub';
    const chips = em.overlay;
    function toggle() {
      chips.querySelector('[data-wcr="pub"]').classList.toggle('selected', scope === 'pub');
      chips.querySelector('[data-wcr="peer"]').classList.toggle('selected', scope === 'peer');
      chips.querySelector('#wc-peers-box').classList.toggle('hidden', scope !== 'peer');
    }
    em.overlay.querySelector('[data-close]').addEventListener('click', em.close);
    em.overlay.querySelector('[data-wcr="pub"]').addEventListener('click', () => { scope = 'pub'; toggle(); });
    em.overlay.querySelector('[data-wcr="peer"]').addEventListener('click', () => { scope = 'peer'; toggle(); });
    em.overlay.querySelector('#wc-save').addEventListener('click', () => {
      const text = em.overlay.querySelector('#wc-text').value.trim();
      if (!text) { Core.Toast.show('请输入字卡内容', 'error'); return; }
      c.text = text;
      c.cat = em.overlay.querySelector('#wc-cat').value.trim();
      c.scope = scope;
      if (scope === 'peer') {
        c.peers = [...em.overlay.querySelectorAll('.wc-peer-list input:checked')].map(i => i.value);
        if (!c.peers.length) { Core.Toast.show('请至少勾选一位人物', 'error'); return; }
      } else {
        c.peers = [];
      }
      if (!id) d.wordCards.unshift(c);
      Core.State.save();
      em.close();
      if (onDone) onDone();
      Core.Toast.show('字卡已保存 🗂️', 'success');
    });
  }

  function batchAdd(onDone) {
    const d = ensureData();
    const bm = UI.modal({
      title: '批量添加字卡',
      body: `
        <label class="f2-label">每行一条字卡内容</label>
        <textarea id="wcb-text" class="f2-textarea" rows="7" placeholder="例如：&#10;早安，今天也要元气满满哦&#10;记得吃午饭呀&#10;晚安，好梦"></textarea>
        <label class="f2-label">统一分类（可留空）</label>
        <input type="text" id="wcb-cat" list="wcb-cat-list" placeholder="例如：日常">
        <datalist id="wcb-cat-list">${[...new Set(d.wordCards.map(x => x.cat).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        <label class="f2-label">使用范围</label>
        <div class="f2-chip-row">
          <button class="f2-chip selectable selected" data-wcr="pub">🌐 通用</button>
          <button class="f2-chip selectable" data-wcr="peer">👤 专属（勾选人物）</button>
        </div>
        <div id="wcb-peers-box" class="hidden">
          <div class="wc-peer-list">${peerCheckboxList([])}</div>
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="wcb-save">批量添加</button>`,
      size: 'modal-lg'
    });
    let scope = 'pub';
    bm.overlay.querySelector('[data-close]').addEventListener('click', bm.close);
    bm.overlay.querySelectorAll('[data-wcr]').forEach(b => b.addEventListener('click', () => {
      scope = b.dataset.wcr;
      bm.overlay.querySelectorAll('[data-wcr]').forEach(x => x.classList.toggle('selected', x === b));
      bm.overlay.querySelector('#wcb-peers-box').classList.toggle('hidden', scope !== 'peer');
    }));
    bm.overlay.querySelector('#wcb-save').addEventListener('click', () => {
      const lines = bm.overlay.querySelector('#wcb-text').value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      if (!lines.length) { Core.Toast.show('请至少输入一条内容', 'error'); return; }
      let peers = [];
      if (scope === 'peer') {
        peers = [...bm.overlay.querySelectorAll('.wc-peer-list input:checked')].map(i => i.value);
        if (!peers.length) { Core.Toast.show('请至少勾选一位人物', 'error'); return; }
      }
      const cat = bm.overlay.querySelector('#wcb-cat').value.trim();
      lines.forEach(t => d.wordCards.unshift({ id: Core.uid(), text: t, cat, scope, peers }));
      Core.State.save();
      bm.close();
      if (onDone) onDone();
      Core.Toast.show(`已添加 ${lines.length} 张字卡 🗂️`, 'success');
    });
  }

  function sendWordCard(c) {
    if (!c || !requireChat()) return;
    const s = Core.State.data.sessions[Core.State.currentChatId];
    if (s.type === 'group') {
      if (c.scope === 'peer') { Core.Toast.show('专属字卡不能在群聊中使用', 'error'); return; }
    } else {
      const peer = currentPeer();
      if (c.scope === 'peer' && !(c.peers || []).includes(peer)) {
        Core.Toast.show(`该字卡仅限 ${(c.peers || []).map(peerDisplayName).join('、') || '指定人物'} 使用`, 'error');
        return;
      }
    }
    Messaging.sendMessage({ type: 'text', text: c.text });
    Core.Toast.show('字卡已发送', 'success');
  }

  /* ==================== 视频通话 ==================== */
  let vcState = null;

  function openVideoCall() {
    if (!requireChat()) return;
    const sid = Core.State.currentChatId;
    const s = Core.State.data.sessions[sid];
    if (s.type !== 'private') { Core.Toast.show('视频通话仅支持私聊', 'error'); return; }
    if (vcState) { Core.Toast.show('已在通话中', 'error'); return; }

    const peer = s.members.find(x => x !== Core.State.user.username);
    const peerAvatar = (Core.State.data.contacts || []).find(c => c.username === peer)?.avatar ||
      Core.Auth.getUser(peer)?.avatar || UI.AVATARS[0];

    const ov = document.createElement('div');
    ov.className = 'video-call-overlay';
    ov.innerHTML = `
      <div class="vc-remote">
        <img class="vc-avatar" src="${peerAvatar}" alt="">
        <div class="vc-name">${esc(s.name)}</div>
        <div class="vc-status" id="vc-status"><span class="vc-dot"></span> 等待对方接受…</div>
      </div>
      <div class="vc-local">
        <div class="vc-local-off" id="vc-local-off"><i class="fas fa-video-slash"></i><span>摄像头已关闭</span></div>
        <video id="vc-local-video" class="hidden" autoplay playsinline muted></video>
      </div>
      <div class="vc-timer hidden" id="vc-timer">00:00</div>
      <div class="vc-controls">
        <button class="vc-btn" id="vc-cam" title="开关摄像头"><i class="fas fa-video-slash"></i></button>
        <button class="vc-btn" id="vc-mic" title="开关麦克风"><i class="fas fa-microphone"></i></button>
        <button class="vc-btn vc-hangup" id="vc-hangup" title="挂断"><i class="fas fa-phone-slash"></i></button>
      </div>`;
    document.body.appendChild(ov);

    const statusEl = ov.querySelector('#vc-status');
    const timerEl = ov.querySelector('#vc-timer');
    let stream = null, camOn = false, micOn = true, connected = false, startT = 0, timerId = null, answerId = null;

    const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    const tick = () => { timerEl.textContent = fmt(Math.floor((Date.now() - startT) / 1000)); };
    const setStatus = (txt) => { statusEl.innerHTML = `<span class="vc-dot${connected ? ' on' : ''}"></span> ${txt}`; };

    async function toggleCam() {
      if (!camOn) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          const v = ov.querySelector('#vc-local-video');
          v.srcObject = stream;
          v.classList.remove('hidden');
          ov.querySelector('#vc-local-off').classList.add('hidden');
          stream.getAudioTracks().forEach(t => { t.enabled = micOn; });
          camOn = true;
        } catch (err) {
          Core.Toast.show('无法访问摄像头', 'error');
        }
      } else {
        stream?.getTracks().forEach(t => t.stop());
        stream = null;
        camOn = false;
        ov.querySelector('#vc-local-video').classList.add('hidden');
        ov.querySelector('#vc-local-off').classList.remove('hidden');
      }
      ov.querySelector('#vc-cam i').className = camOn ? 'fas fa-video' : 'fas fa-video-slash';
      ov.querySelector('#vc-cam').classList.toggle('on', camOn);
      if (connected) setStatus(camOn ? '通话中 · 摄像头已开启' : '通话中 · 摄像头未开启');
    }

    function toggleMic() {
      micOn = !micOn;
      stream?.getAudioTracks().forEach(t => { t.enabled = micOn; });
      ov.querySelector('#vc-mic i').className = micOn ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    }

    function hangup(log) {
      if (answerId) clearTimeout(answerId);
      if (timerId) clearInterval(timerId);
      stream?.getTracks().forEach(t => t.stop());
      ov.remove();
      vcState = null;
      if (log) {
        Messaging.sendMessage({
          type: 'card', cardIcon: 'fa-video', cardTitle: '视频通话',
          lines: connected
            ? [`通话时长 ${fmt(Math.floor((Date.now() - startT) / 1000))}`, camOn ? '本方摄像头：已开启' : '本方摄像头：未开启']
            : ['未接通']
        });
      }
    }

    answerId = setTimeout(() => {
      connected = true;
      startT = Date.now();
      timerEl.classList.remove('hidden');
      setStatus(camOn ? '通话中 · 摄像头已开启' : '通话中 · 对方摄像头已关闭');
      timerId = setInterval(tick, 500);
      tick();
    }, 1500 + Math.random() * 1500);

    ov.querySelector('#vc-cam').addEventListener('click', toggleCam);
    ov.querySelector('#vc-mic').addEventListener('click', toggleMic);
    ov.querySelector('#vc-hangup').addEventListener('click', () => hangup(true));
    vcState = { hangup };
  }

  /* ==================== 格言 ==================== */
  function quoteSeedIdx(len) {
    const dt = new Date();
    const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 100000;
    return h % Math.max(1, len);
  }

  function openQuotes() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '📖 格言',
      body: `
        <div class="qt-daily">
          <div class="qt-daily-label"><i class="fas fa-feather"></i> 每 日 一 句</div>
          <div class="qt-daily-text" id="qt-daily-text"></div>
          <div class="qt-daily-author" id="qt-daily-author"></div>
          <div class="qt-daily-acts">
            <button class="btn-ghost" id="qt-another"><i class="fas fa-shuffle"></i> 换一句</button>
            <button class="btn-ghost" id="qt-daily-send"><i class="fas fa-paper-plane"></i> 发送到聊天</button>
          </div>
        </div>
        <button class="btn-primary" id="qt-add" style="width:100%;margin-bottom:10px"><i class="fas fa-plus"></i> 添加格言</button>
        <div class="f2-list" id="qt-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let dailyIdx = 0;

    function setDaily(idx) {
      if (!d.quotes.length) return;
      dailyIdx = ((idx % d.quotes.length) + d.quotes.length) % d.quotes.length;
      const q = d.quotes[dailyIdx];
      overlay.querySelector('#qt-daily-text').textContent = `“${q.text}”`;
      overlay.querySelector('#qt-daily-author').textContent = `—— ${q.author || '佚名'}`;
    }

    function render() {
      const list = overlay.querySelector('#qt-list');
      list.innerHTML = d.quotes.length ? d.quotes.map(q => `
        <div class="f2-item">
          <span class="f2-item-mood">💬</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(q.text)}</div>
            <div class="f2-item-sub">—— ${esc(q.author || '佚名')}</div>
          </div>
          <button class="icon-btn" data-qtsend="${q.id}" title="发送到聊天"><i class="fas fa-paper-plane"></i></button>
          <button class="icon-btn" data-qtedit="${q.id}" title="编辑"><i class="fas fa-pen"></i></button>
          <button class="icon-btn f2-del" data-qtdel="${q.id}" title="删除"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有格言，添加一句喜欢的吧</p>';
      list.querySelectorAll('[data-qtsend]').forEach(b => b.addEventListener('click', () => {
        const q = d.quotes.find(x => x.id === b.dataset.qtsend);
        if (q) sendCard('fa-quote-right', '格言', [`“${q.text}”`, `—— ${q.author || '佚名'}`]);
      }));
      list.querySelectorAll('[data-qtedit]').forEach(b => b.addEventListener('click', () => editQuote(b.dataset.qtedit, render)));
      list.querySelectorAll('[data-qtdel]').forEach(b => b.addEventListener('click', () => {
        d.quotes = d.quotes.filter(x => x.id !== b.dataset.qtdel);
        Core.State.save();
        render();
      }));
    }

    setDaily(quoteSeedIdx(d.quotes.length));
    overlay.querySelector('#qt-another').addEventListener('click', () => setDaily(dailyIdx + 1 + Math.floor(Math.random() * Math.max(1, d.quotes.length - 1))));
    overlay.querySelector('#qt-daily-send').addEventListener('click', () => {
      const q = d.quotes[dailyIdx];
      if (q) sendCard('fa-quote-right', '格言', [`“${q.text}”`, `—— ${q.author || '佚名'}`]);
    });
    overlay.querySelector('#qt-add').addEventListener('click', () => editQuote(null, () => { render(); setDaily(dailyIdx); }));
    render();
  }

  function editQuote(id, onDone) {
    const d = ensureData();
    const q = id ? d.quotes.find(x => x.id === id) : { id: Core.uid(), text: '', author: '' };
    const qm = UI.modal({
      title: id ? '编辑格言' : '添加格言',
      body: `
        <label class="f2-label">格言内容</label>
        <textarea id="qt-text" class="f2-textarea" rows="3" placeholder="写下喜欢的一句话">${esc(q.text)}</textarea>
        <label class="f2-label">作者 / 出处（可留空）</label>
        <input type="text" id="qt-author" value="${esc(q.author)}" placeholder="例如：泰戈尔">`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="qt-save">保存</button>`,
      size: 'modal-lg'
    });
    qm.overlay.querySelector('[data-close]').addEventListener('click', qm.close);
    qm.overlay.querySelector('#qt-save').addEventListener('click', () => {
      const text = qm.overlay.querySelector('#qt-text').value.trim();
      if (!text) { Core.Toast.show('请输入格言内容', 'error'); return; }
      q.text = text;
      q.author = qm.overlay.querySelector('#qt-author').value.trim();
      if (!id) d.quotes.unshift(q);
      Core.State.save();
      qm.close();
      if (onDone) onDone();
      Core.Toast.show('格言已保存 📖', 'success');
    });
  }

  /* ==================== 初始化 ==================== */
  function init() {
    initPanel();
    const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
    bind('btn-cards', openCards);
    bind('btn-quote', openQuotes);
    bind('btn-video', openVideoCall);
  }

  return { init, openCards, openQuotes, openVideoCall, uploadSticker };
})();
