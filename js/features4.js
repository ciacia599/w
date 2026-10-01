/* ============ 私语 · 第四批扩展 (厨房 / 现实转移 / 画画 / 对方主动频率) ============ */
const Features4 = (() => {

  /* ---- 数据惰性初始化 ---- */
  function ensureData() {
    const d = Core.State.data;
    d.kitchen = d.kitchen || { fridge: [], recipes: [] };
    d.realityShifts = d.realityShifts || [];
    d.notes = d.notes || [];
    const pfDefaults = {
      diary: 'normal', letter: 'normal', note: 'leisure', question: 'normal', drawing: 'off',
      invListen: 'leisure', invWatch: 'leisure', invRead: 'off',
      invGame: 'leisure', invAsk: 'leisure', invCheckin: 'off',
      orderFood: 'off', propAvatar: 'off', propNickname: 'off', mediaCtl: 'off'
    };
    d.peerFreq = Object.assign({}, pfDefaults, d.peerFreq || {});
    d.drawings = d.drawings || [];
    initShiftData(d);
    return d;
  }

  /* ---- 世界转移系统数据 ---- */
  const HOME_WORLD = { id: '__home__', name: '现实世界', icon: '🏠' };

  function initShiftData(d) {
    if (!d.shift) {
      d.shift = { worlds: [], currentId: null, editId: null, history: [] };
      // 迁移旧版世界线剧本
      (d.realityShifts || []).forEach(s => {
        const w = makeWorld(s.targetWorld || s.name || '未命名世界', '🌌');
        w.persona.name = s.name || '';
        w.persona.gender = s.gender || '';
        w.persona.species = s.species || '';
        w.persona.abilities = s.abilities || '';
        w.persona.desc = s.dr || '';
        const parts = [];
        if (s.wr) parts.push('【等待室 WR】\n' + s.wr);
        Object.entries(s.customSections || {}).forEach(([k, v]) => { if (v) parts.push('【' + k + '】\n' + v); });
        w.worldview = parts.join('\n\n');
        d.shift.worlds.push(w);
      });
      if (d.realityShifts && d.realityShifts.length) {
        d.shift.editId = d.shift.worlds[0]?.id || null;
        d.realityShifts = [];
      }
      Core.State.save();
    }
    return d.shift;
  }

  function makeWorld(name, icon) {
    const places = {};
    PLACE_DEFS.forEach(p => { places[p.k] = { desc: '', visits: 0, lastVisit: 0, log: [] }; });
    const shop = {};
    SHOP_CATS.forEach(c => {
      shop[c.k] = (SHOP_DEFAULTS[c.k] || []).map((it, i) => ({
        id: Core.uid(), name: it[0], icon: it[1], desc: it[2], price: it[3], owned: false
      }));
    });
    return {
      id: Core.uid(), name: name || '新世界', icon: icon || '🌌',
      persona: { name: '', gender: '', species: '', abilities: '', desc: '' },
      worldview: '', relations: [],
      places, shop, coins: 1000, lastClaim: 0,
      createdAt: Core.now()
    };
  }


  const esc = (s) => UI.escapeHtml(String(s ?? ''));
  const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtHM = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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

  /* ==================== 频率档位 ==================== */
  const FREQ_LEVELS = [
    { k: 'off', name: '关闭', prob: 0 },
    { k: 'leisure', name: '悠闲', prob: 0.15 },
    { k: 'normal', name: '普通', prob: 0.35 },
    { k: 'warm', name: '热情', prob: 0.6 },
    { k: 'custom', name: '自定义%', prob: -1 },
    { k: 'timer', name: '定时', prob: -2 }
  ];
  function freqProb(level, customVal) {
    if (level === 'custom' && customVal != null) return Math.max(0, Math.min(1, customVal / 100));
    return FREQ_LEVELS.find(f => f.k === level)?.prob ?? 0;
  }
  const FREQ_UNITS = [
    { k: 's', name: '秒', ms: 1000 },
    { k: 'm', name: '分', ms: 60000 },
    { k: 'h', name: '时', ms: 3600000 }
  ];
  function timerRange(raw) {
    if (typeof raw !== 'string' || !raw.startsWith('timer:')) return null;
    const p = raw.split(':');
    const min = Number(p[1]), max = Number(p[2]);
    if (!min || !max || max < min) return null;
    return { min, max };
  }
  function makeTimer(minMs, maxMs) { return `timer:${minMs}:${maxMs}`; }

  /* ==================== 1. 厨房 ==================== */
  const FRIDGE_CATS = ['生鲜', '蔬果', '饮料', '零食', '调料', '剩饭', '其他'];
  const FOOD_EMOJIS = ['🥕','🥦','🍅','🍆','🌽','🥔','🍠','🧅','🧄','🫑','🌶️','🥒','🥬','🥗','🥘','🍳','🧀','🍞','🥖','🥐','🧁','🍰','🎂','🍮','🍯','🍼','🥛','☕','🍵','🥤','🧃','🧉','🍺','🍷','🥂','🍜','🍝','🍲','🍛','🍣','🍱','🍙','🍚','🍘','🥟','🍤','🍗','🍖','🥩','🐟','🐙','🦀','🦞','🦐','🍦','🍫','🍬','🍭','🍪','🍩','🍿','🥨','🥯','🧇','🥞','🧈','🧂','🥫','🫙'];

  function openKitchen() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🍳 我的厨房',
      body: `
        <div class="f2-chip-row" id="kit-tabs">
          <button class="f2-chip selectable selected" data-kt="fridge">🧊 冰箱</button>
          <button class="f2-chip selectable" data-kt="recipes">📋 菜谱</button>
          <button class="f2-chip selectable" data-kt="cook">👨‍🍳 来做菜</button>
          <button class="f2-chip selectable" data-kt="orders">🍽️ 点餐</button>
        </div>
        <div id="kit-content"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let tab = 'fridge';

    function render() {
      const c = overlay.querySelector('#kit-content');
      if (tab === 'fridge') renderFridge(c);
      else if (tab === 'recipes') renderRecipes(c);
      else if (tab === 'cook') renderCook(c);
      else renderOrders(c);
    }

    function renderFridge(c) {
      const items = d.kitchen.fridge || [];
      c.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input type="text" id="fr-name" placeholder="食材名称" style="flex:1">
          <select id="fr-cat" style="width:90px">${FRIDGE_CATS.map(cat => `<option value="${cat}">${cat}</option>`).join('')}</select>
          <input type="number" id="fr-qty" placeholder="数量" min="1" value="1" style="width:70px">
          <button class="btn-primary" id="fr-add"><i class="fas fa-plus"></i></button>
        </div>
        <div class="f2-list" id="fr-list"></div>`;
      const list = c.querySelector('#fr-list');
      list.innerHTML = items.length ? items.map(f => `
        <div class="f2-item">
          <span class="f2-item-mood">${f.emoji || '🥫'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(f.name)} <span style="color:var(--c-text-faint);font-size:12px">x${f.qty}</span></div>
            <div class="f2-item-sub">${esc(f.cat)} · ${fmtDate(f.time)} ${fmtHM(f.time)}</div>
          </div>
          <button class="icon-btn f2-del" data-frdel="${f.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">冰箱空空的，去采购吧</p>';
      c.querySelector('#fr-add').addEventListener('click', () => {
        const name = c.querySelector('#fr-name').value.trim();
        if (!name) { Core.Toast.show('输入食材名称', 'error'); return; }
        const cat = c.querySelector('#fr-cat').value;
        const qty = Math.max(1, Number(c.querySelector('#fr-qty').value) || 1);
        d.kitchen.fridge.unshift({ id: Core.uid(), name, cat, qty, emoji: pick(FOOD_EMOJIS), time: Core.now() });
        Core.State.save();
        render();
        Core.Toast.show('已放入冰箱 🧊', 'success');
      });
      list.querySelectorAll('[data-frdel]').forEach(b => b.addEventListener('click', () => {
        d.kitchen.fridge = d.kitchen.fridge.filter(x => x.id !== b.dataset.frdel);
        Core.State.save();
        render();
      }));
    }

    function renderRecipes(c) {
      const recipes = d.kitchen.recipes || [];
      c.innerHTML = `
        <button class="btn-primary" id="rc-add" style="width:100%;margin-bottom:10px"><i class="fas fa-plus"></i> 添加菜谱</button>
        <div class="f2-list" id="rc-list"></div>`;
      const list = c.querySelector('#rc-list');
      list.innerHTML = recipes.length ? recipes.map(r => `
        <div class="f2-item" data-rid="${r.id}" style="cursor:pointer">
          <span class="f2-item-mood">${r.emoji || '🍲'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(r.name)}</div>
            <div class="f2-item-sub">${esc((r.ingredients || []).join('、')) || '无食材记录'}</div>
          </div>
          <button class="icon-btn f2-del" data-rcdel="${r.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有菜谱，记一道拿手菜吧</p>';
      c.querySelector('#rc-add').addEventListener('click', () => editRecipe(null, c));
      list.querySelectorAll('[data-rid]').forEach(el => el.addEventListener('click', (e) => {
        if (e.target.closest('[data-rcdel]')) return;
        editRecipe(el.dataset.rid, c);
      }));
      list.querySelectorAll('[data-rcdel]').forEach(b => b.addEventListener('click', () => {
        d.kitchen.recipes = d.kitchen.recipes.filter(x => x.id !== b.dataset.rcdel);
        Core.State.save();
        render();
      }));
    }

    function editRecipe(id, c) {
      const recipes = d.kitchen.recipes || [];
      const r = id ? recipes.find(x => x.id === id) : { id: Core.uid(), name: '', emoji: '🍲', ingredients: [], steps: '' };
      const fridgeItems = (d.kitchen.fridge || []).map(f => f.name);
      const em = UI.modal({
        title: id ? '编辑菜谱' : '添加菜谱',
        body: `
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
            <input type="text" id="rc-emoji" value="${esc(r.emoji)}" maxlength="2" style="width:50px;text-align:center;font-size:20px">
            <input type="text" id="rc-name" value="${esc(r.name)}" placeholder="菜名" style="flex:1">
          </div>
          <label class="f2-label">食材（从冰箱选或手输，逗号分隔）</label>
          <input type="text" id="rc-ingr" value="${esc((r.ingredients || []).join('、'))}" placeholder="鸡蛋、面粉、糖…">
          <div class="f2-chip-row" style="margin:6px 0">
            ${fridgeItems.slice(0, 15).map(n => `<button class="f2-chip" data-ingr="${esc(n)}">${esc(n)}</button>`).join('') || '<span style="color:var(--c-text-faint);font-size:12px">冰箱空空</span>'}
          </div>
          <label class="f2-label">做法</label>
          <textarea id="rc-steps" class="f2-textarea" rows="4" placeholder="步骤…">${esc(r.steps || '')}</textarea>`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="rc-save">保存</button>`,
        size: 'modal-lg'
      });
      em.overlay.querySelector('[data-close]').addEventListener('click', em.close);
      em.overlay.querySelectorAll('[data-ingr]').forEach(b => b.addEventListener('click', () => {
        const inp = em.overlay.querySelector('#rc-ingr');
        const v = inp.value.trim();
        inp.value = v ? v + '、' + b.dataset.ingr : b.dataset.ingr;
      }));
      em.overlay.querySelector('#rc-save').addEventListener('click', () => {
        r.name = em.overlay.querySelector('#rc-name').value.trim();
        r.emoji = em.overlay.querySelector('#rc-emoji').value.trim() || '🍲';
        r.ingredients = em.overlay.querySelector('#rc-ingr').value.split(/[、,，\n]/).map(s => s.trim()).filter(Boolean);
        r.steps = em.overlay.querySelector('#rc-steps').value.trim();
        if (!r.name) { Core.Toast.show('菜名不能为空', 'error'); return; }
        if (!id) recipes.unshift(r);
        Core.State.save();
        em.close();
        render();
        Core.Toast.show('菜谱已保存 📋', 'success');
      });
    }

    function renderCook(c) {
      const recipes = d.kitchen.recipes || [];
      c.innerHTML = `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:10px">选一道菜谱，从冰箱取食材做菜吧！做好的菜可以分享到聊天。</p>
        ${recipes.length ? `
          <label class="f2-label">选择菜谱</label>
          <select id="ck-recipe" style="width:100%;margin-bottom:10px">
            ${recipes.map(r => `<option value="${r.id}">${esc(r.emoji)} ${esc(r.name)}</option>`).join('')}
          </select>
          <div id="ck-ingr-list"></div>
          <button class="btn-primary" id="ck-cook" style="width:100%;margin-top:10px"><i class="fas fa-fire"></i> 开始做菜</button>
          <div id="ck-result"></div>
        ` : '<p style="color:var(--c-text-faint);text-align:center">先添加菜谱再来做菜吧</p>'}`;
      if (!recipes.length) return;
      const sel = c.querySelector('#ck-recipe');
      function renderIngr() {
        const r = recipes.find(x => x.id === sel.value);
        if (!r) return;
        const box = c.querySelector('#ck-ingr-list');
        box.innerHTML = (r.ingredients || []).map(ing => {
          const has = (d.kitchen.fridge || []).find(f => f.name === ing);
          return `<div class="f2-item"><span class="f2-item-mood">${has ? '✅' : '❌'}</span><div class="f2-item-main"><div class="f2-item-text">${esc(ing)}</div><div class="f2-item-sub">${has ? '冰箱有货 x' + has.qty : '冰箱没有，需采购'}</div></div></div>`;
        }).join('') || '<p style="color:var(--c-text-faint);font-size:12px">该菜谱未记录食材</p>';
      }
      sel.addEventListener('change', renderIngr);
      renderIngr();
      c.querySelector('#ck-cook').addEventListener('click', () => {
        const r = recipes.find(x => x.id === sel.value);
        if (!r) return;
        c.querySelector('#ck-result').innerHTML = `<div style="text-align:center;padding:14px"><div style="font-size:48px">${r.emoji}</div><p style="margin:8px 0;color:var(--c-text-soft)">正在制作 ${esc(r.name)}…</p></div>`;
        setTimeout(() => {
          // 消耗冰箱食材
          (r.ingredients || []).forEach(ing => {
            const f = (d.kitchen.fridge || []).find(x => x.name === ing);
            if (f) { f.qty--; if (f.qty <= 0) d.kitchen.fridge = d.kitchen.fridge.filter(x => x.id !== f.id); }
          });
          Core.State.save();
          c.querySelector('#ck-result').innerHTML = `<div style="text-align:center;padding:14px"><div style="font-size:48px">${r.emoji}</div><p style="margin:8px 0"><b>${esc(r.name)} 做好啦！</b></p><button class="btn-primary" id="ck-share"><i class="fas fa-paper-plane"></i> 分享到聊天</button></div>`;
          c.querySelector('#ck-share').addEventListener('click', () => {
            if (sendCard('fa-utensils', `🍳 ${r.name}`, [`食材：${(r.ingredients || []).join('、') || '随心搭配'}`, r.steps ? `做法：${r.steps.slice(0, 60)}` : '家常做法'])) {}
          });
          renderIngr();
          Core.Toast.show(`${r.name} 做好啦！🎉`, 'success');
        }, 1500);
      });
    }

    function renderOrders(c) {
      const sid = Core.State.currentChatId;
      const s = sid && Core.State.data.sessions[sid];
      const peer = s && s.type === 'private' ? s.members.find(x => x !== Core.State.user.username) : null;
      const peerName = peer ? ((d.contacts || []).find(x => x.username === peer)?.nickname || Core.Auth.getUser(peer)?.nickname || peer) : null;
      const recipeNames = (d.kitchen.recipes || []).map(r => r.name).filter(Boolean);
      const quick = [...new Set([...recipeNames.slice(0, 12), ...COMMON_DISHES.slice(0, 8)])];
      const recent = peer ? Core.State.getMessages(sid).filter(m => m.type === 'foodOrder').slice(-8).reverse() : [];
      c.innerHTML = `
        ${!peer ? '<p style="color:var(--c-text-faint);text-align:center;padding:16px">请先打开一个私聊会话，再来点餐～</p>' : ''}
        ${peer ? `
        <div class="kit-order-box">
          <h4 style="margin:4px 0 8px">🙋 我向「${esc(peerName)}」点餐</h4>
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <input type="text" id="ko-dish" maxlength="12" placeholder="想吃的菜名" style="flex:1">
            <button class="btn-primary" id="ko-send"><i class="fas fa-paper-plane"></i> 向TA点餐</button>
          </div>
          <div class="f2-chip-row">
            ${quick.map(n => `<button class="f2-chip" data-ko-dish="${esc(n)}">🍽️ ${esc(n)}</button>`).join('')}
          </div>
        </div>
        <div class="f2-divider"></div>
        <h4 style="margin:4px 0 8px">📜 点餐记录</h4>
        <div class="f2-list">
          ${recent.map(m => `
            <div class="f2-item">
              <span class="f2-item-mood">🍽️</span>
              <div class="f2-item-main">
                <div class="f2-item-text">${esc(m.dish || '')} · ${m.from === peer ? 'TA点给你' : '你点给TA'}</div>
                <div class="f2-item-sub">${fmtDate(m.time)} ${fmtHM(m.time)} · ${m.orderStatus === 'accepted' ? '✅ 已接单' : m.orderStatus === 'rejected' ? '❌ 已婉拒' : '⏳ 待回应'}</div>
              </div>
            </div>`).join('') || '<p style="color:var(--c-text-faint);text-align:center">还没有点餐记录</p>'}
        </div>
        <p style="font-size:12px;color:var(--c-text-faint);margin-top:10px">TA 向你点的餐会出现在聊天里，你可以「接单」或「婉拒」；频率在 💞 对方主动频率 → 对方向你点餐 中调节。</p>` : ''}`;
      if (!peer) return;
      c.querySelector('#ko-send').addEventListener('click', () => {
        const dish = c.querySelector('#ko-dish').value.trim();
        if (!dish) { Core.Toast.show('输入或选择一道菜', 'error'); return; }
        sendOrderToPeer(dish);
        c.querySelector('#ko-dish').value = '';
        render();
      });
      c.querySelectorAll('[data-ko-dish]').forEach(b => b.addEventListener('click', () => {
        c.querySelector('#ko-dish').value = b.dataset.koDish;
      }));
    }

    overlay.querySelectorAll('#kit-tabs [data-kt]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.kt;
      overlay.querySelectorAll('#kit-tabs .selectable').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      render();
    }));
    render();
  }

  /* ==================== 2. 现实转移 (Reality Shift) ==================== */
  const PERSONA_FIELDS = [
    { k: 'name', label: '姓名', ph: '你在这个世界的名字' },
    { k: 'gender', label: '性别', ph: '男 / 女 / 其他' },
    { k: 'species', label: '物种 / 身份', ph: '人类 / 精灵 / 魔法师 / 学生…' },
    { k: 'abilities', label: '能力技能', ph: '天赋、魔法、特殊技能…', area: true },
    { k: 'desc', label: '人物设定', ph: '性格、外貌、背景故事…', area: true }
  ];
  const WORLD_ICONS = ['🌌','🏰','🌲','🏖️','🎡','📚','🔮','⭐','🌸','🔥','❄️','🐉','🪄','🌙','☁️','🗝️'];

  const PLACE_DEFS = [
    { k: 'lounge',  name: '休息室', icon: 'fa-couch',             emoji: '🛋️', line: '放松身心、恢复能量的地方' },
    { k: 'study',   name: '学习室', icon: 'fa-chalkboard-user',    emoji: '📝', line: '专注学习与技能训练' },
    { k: 'library', name: '图书馆', icon: 'fa-book-open',          emoji: '📚', line: '记载着这个世界的一切知识' },
    { k: 'park',    name: '游乐园', icon: 'fa-ferris-wheel',       emoji: '🎡', line: '摩天轮、烟花与约会' },
    { k: 'beach',   name: '海边',   icon: 'fa-umbrella-beach',     emoji: '🏖️', line: '阳光、沙滩与海浪' },
    { k: 'forest',  name: '深林',   icon: 'fa-tree',               emoji: '🌲', line: '幽深神秘、藏着秘密' },
    { k: 'castle',  name: '城堡',   icon: 'fa-chess-rook',         emoji: '🏰', line: '庄重华丽的古堡' }
  ];

  const SHOP_CATS = [
    { k: 'showcase', name: '橱窗', icon: 'fa-gem',          emoji: '💎' },
    { k: 'food',     name: '美食', icon: 'fa-utensils',      emoji: '🍱' },
    { k: 'clothes',  name: '衣服', icon: 'fa-shirt',         emoji: '👗' },
    { k: 'space',    name: '空间', icon: 'fa-cube',          emoji: '🪐' },
    { k: 'equip',    name: '设备', icon: 'fa-microchip',     emoji: '⚙️' },
    { k: 'skill',    name: '技能', icon: 'fa-wand-sparkles', emoji: '✨' }
  ];
  // [名称, emoji, 描述, 价格]
  const SHOP_DEFAULTS = {
    showcase: [
      ['时光宝石', '💎', '能凝固一个美好瞬间', 300],
      ['星尘香水', '💫', '带着一整条银河的气味', 180],
      ['月光八音盒', '📻', '播放记忆里的旋律', 220],
      ['命运塔罗牌', '🔮', '偶尔能窥探命运一角', 260]
    ],
    food: [
      ['云朵棉花糖', '🍡', '入口即化，甜而不腻', 30],
      ['星空果冻', '🍮', '每一口都吃得到星星', 60],
      ['魔女浓汤', '🍲', '喝下后精神百倍', 80],
      ['海盐冰淇淋', '🍦', '海边限定口味', 40]
    ],
    clothes: [
      ['星辰斗篷', '🧥', '在夜晚会发出微光', 200],
      ['学院制服', '🎽', '那所学校的专属制服', 150],
      ['城堡礼服', '👗', '参加城堡舞会专用', 260],
      ['冒险装束', '🥾', '探索深林的轻便装备', 120]
    ],
    space: [
      ['随身异空间', '🌀', '存放万物的小口袋', 500],
      ['海景别墅', '🏝️', '推开门就是海边', 800],
      ['深林树屋', '🏕️', '深林里的秘密基地', 400],
      ['星空帐篷', '⛺', '躺着就能看见银河', 180]
    ],
    equip: [
      ['全息终端', '📱', '连接世界系统的设备', 240],
      ['魔法相机', '📷', '拍下的照片都会动', 200],
      ['传送手表', '⌚', '一键定位世界各处', 320],
      ['同频耳机', '🎧', '和远距离的TA共享听歌', 160]
    ],
    skill: [
      ['瞬间移动', '✨', '想去哪里就去哪里', 600],
      ['心灵感应', '💫', '不出声也能对话', 500],
      ['语言通晓', '📖', '听懂世间所有语言', 400],
      ['治愈之手', '🤲', '轻轻一抚便能疗伤', 550]
    ]
  };


  function openRealityShift() {
    const d = ensureData();
    const sd = d.shift;
    let tab = 'world';
    let shopCat = 'showcase';

    const curWorld = () => sd.worlds.find(w => w.id === sd.currentId) || null;
    const editWorld = () => sd.worlds.find(w => w.id === sd.editId) || sd.worlds[0] || null;
    const ownedCount = (w) => SHOP_CATS.reduce((n, c) => n + w.shop[c.k].filter(i => i.owned).length, 0);
    const isToday = (t) => !!t && fmtDate(t) === fmtDate(Core.now());
    const worldLabel = (w) => w ? `${w.icon} ${w.name}` : `${HOME_WORLD.icon} ${HOME_WORLD.name}`;

    const { overlay, close } = UI.modal({
      title: '🌌 世界转移中心',
      body: `
        <div class="sh-status">
          <div class="sh-status-row">
            <span class="sh-label"><i class="fas fa-location-dot"></i> 当前世界</span>
            <b id="sh-cur-name"></b>
            <span id="sh-cur-time" class="sh-sub"></span>
          </div>
          <div class="sh-status-row sh-go-row">
            <span class="sh-label"><i class="fas fa-flag"></i> 想去的世界</span>
            <select id="sh-target" class="sh-select"></select>
            <button class="btn-primary sh-do" id="sh-do"><i class="fas fa-wand-magic-sparkles"></i> 一键转移</button>
          </div>
          <div class="sh-tabs f2-chip-row">
            <button class="f2-chip selectable" data-tab="world">🌍 世界</button>
            <button class="f2-chip selectable" data-tab="persona">🧍 人物设定</button>
            <button class="f2-chip selectable" data-tab="lore">📖 世界观·关系</button>
            <button class="f2-chip selectable" data-tab="places">🏛️ 地点</button>
            <button class="f2-chip selectable" data-tab="shop">🛒 商城</button>
          </div>
        </div>
        <div id="sh-body" class="sh-body"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    overlay.querySelector('#sh-do').addEventListener('click', doShift);

    function renderStatus() {
      overlay.querySelector('#sh-cur-name').textContent = worldLabel(curWorld());
      const last = sd.history[0];
      overlay.querySelector('#sh-cur-time').textContent = last ? `上次转移：${last.fromName} → ${last.toName} · ${UI.fmtTime(last.time)}` : '';
      const sel = overlay.querySelector('#sh-target');
      sel.innerHTML = [`<option value="__home__">${HOME_WORLD.icon} ${HOME_WORLD.name}</option>`]
        .concat(sd.worlds.map(w => `<option value="${w.id}">${esc(w.icon)} ${esc(w.name)}</option>`)).join('');
      const prefer = sd.worlds.find(w => w.id !== sd.currentId)?.id || '__home__';
      sel.value = prefer;
    }

    function editSelector(w) {
      return `<select class="sh-select sh-edit-sel">
        ${sd.worlds.map(x => `<option value="${x.id}" ${x.id === w.id ? 'selected' : ''}>${esc(x.icon)} ${esc(x.name)}</option>`).join('')}
      </select>`;
    }

    function render() {
      overlay.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('selected', b.dataset.tab === tab));
      renderStatus();
      const box = overlay.querySelector('#sh-body');
      const w = editWorld();
      if (tab !== 'world' && !w) {
        box.innerHTML = '<p class="sh-empty">还没有创建世界，先到「🌍 世界」里新建一个吧</p>';
        return;
      }
      if (tab === 'world') renderWorlds(box);
      else if (tab === 'persona') renderPersona(box, w);
      else if (tab === 'lore') renderLore(box, w);
      else if (tab === 'places') renderPlaces(box, w);
      else if (tab === 'shop') renderShop(box, w);
    }

    /* ---------- 世界管理 ---------- */
    function renderWorlds(box) {
      box.innerHTML = `
        <button class="btn-primary" id="sh-add-world" style="width:100%;margin-bottom:12px"><i class="fas fa-plus"></i> 新建想去的世界</button>
        <div class="f2-list">
          ${sd.worlds.length ? sd.worlds.map(w => `
            <div class="f2-item sh-w-card" data-wid="${w.id}">
              <span class="f2-item-mood">${esc(w.icon)}</span>
              <div class="f2-item-main">
                <div class="f2-item-text">${esc(w.name)}
                  ${w.id === sd.currentId ? '<span class="sh-badge">当前世界</span>' : ''}
                </div>
                <div class="f2-item-sub">人物 ${w.persona.name || '未命名'} · 关系 ${w.relations.length} · 拥有 ${ownedCount(w)} 件物品</div>
              </div>
              <button class="icon-btn" data-wgo="${w.id}" title="转移到这里"><i class="fas fa-wand-magic-sparkles"></i></button>
              <button class="icon-btn" data-wedit="${w.id}" title="编辑"><i class="fas fa-pen"></i></button>
              <button class="icon-btn" data-wdel="${w.id}" title="删除"><i class="fas fa-trash-can"></i></button>
            </div>`).join('') : '<p class="sh-empty">还没有世界，创建你想去的第一个世界吧（魔法学院、海边小镇、星空城堡……）</p>'}
        </div>`;
      box.querySelector('#sh-add-world')?.addEventListener('click', () => openWorldForm(null));
      box.querySelectorAll('[data-wid]').forEach(el => el.addEventListener('click', (e) => {
        const id = el.dataset.wid;
        if (e.target.closest('[data-wdel]')) {
          const wname = sd.worlds.find(x => x.id === id)?.name || '';
          const cm = UI.modal({
            title: '删除世界',
            body: `<p style="line-height:1.8">确定删除世界「${esc(wname)}」吗？<br>其中的人物设定、关系、地点与物品将一并删除，无法恢复。</p>`,
            footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="cm-ok" style="background:var(--c-red,#d97777)">确认删除</button>`,
            size: 'modal-lg'
          });
          cm.overlay.querySelector('[data-close]').addEventListener('click', cm.close);
          cm.overlay.querySelector('#cm-ok').addEventListener('click', () => {
            sd.worlds = sd.worlds.filter(x => x.id !== id);
            if (sd.currentId === id) sd.currentId = null;
            if (sd.editId === id) sd.editId = sd.worlds[0]?.id || null;
            Core.State.save();
            cm.close();
            Core.Toast.show('世界已删除', 'info');
            render();
          });
          return;
        }
        if (e.target.closest('[data-wedit]')) { openWorldForm(id); return; }
        if (e.target.closest('[data-wgo]')) {
          overlay.querySelector('#sh-target').value = id;
          doShift();
          return;
        }
        sd.editId = id;
        tab = 'persona';
        render();
      }));
    }

    function openWorldForm(id) {
      const w0 = id ? sd.worlds.find(x => x.id === id) : null;
      let icon = w0?.icon || '🌌';
      const fm = UI.modal({
        title: w0 ? '编辑世界' : '新建世界',
        body: `
          <label class="f2-label">世界名称</label>
          <input type="text" id="wf-name" maxlength="16" placeholder="例如：霍格沃茨 / 海边小镇" value="${esc(w0?.name || '')}">
          <label class="f2-label">选一个图标</label>
          <div class="sh-icon-grid" id="wf-icons">
            ${WORLD_ICONS.map(i => `<button type="button" class="sh-icon-opt ${i === icon ? 'selected' : ''}" data-icon="${i}">${i}</button>`).join('')}
          </div>`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="wf-ok"><i class="fas fa-check"></i> 保存</button>`,
        size: 'modal-lg'
      });
      fm.overlay.querySelector('[data-close]').addEventListener('click', fm.close);
      fm.overlay.querySelectorAll('[data-icon]').forEach(b => b.addEventListener('click', () => {
        icon = b.dataset.icon;
        fm.overlay.querySelectorAll('[data-icon]').forEach(x => x.classList.toggle('selected', x === b));
      }));
      fm.overlay.querySelector('#wf-ok').addEventListener('click', () => {
        const name = fm.overlay.querySelector('#wf-name').value.trim();
        if (!name) { Core.Toast.show('请输入世界名称', 'error'); return; }
        if (w0) { w0.name = name; w0.icon = icon; sd.editId = w0.id; }
        else {
          const w = makeWorld(name, icon);
          sd.worlds.push(w);
          sd.editId = w.id;
        }
        Core.State.save();
        fm.close();
        Core.Toast.show(w0 ? '世界已更新' : '新世界已创建 🌌', 'success');
        if (!w0) tab = 'persona';
        render();
      });
      setTimeout(() => fm.overlay.querySelector('#wf-name').focus(), 80);
    }

    /* ---------- 人物设定 ---------- */
    function renderPersona(box, w) {
      box.innerHTML = `
        <div class="sh-edit-bar">正在编辑：${editSelector(w)}</div>
        ${PERSONA_FIELDS.map(f => `
          <label class="f2-label">${f.label}</label>
          ${f.area
            ? `<textarea class="f2-textarea" rows="3" id="pa-${f.k}" placeholder="${f.ph}">${esc(w.persona[f.k] || '')}</textarea>`
            : `<input type="text" id="pa-${f.k}" value="${esc(w.persona[f.k] || '')}" placeholder="${f.ph}">`}`).join('')}
        <p class="sh-hint"><i class="fas fa-circle-info"></i> 内容自动保存，这就是你转移到「${esc(w.name)}」后的身份</p>`;
      box.querySelector('.sh-edit-sel').addEventListener('change', (e) => { sd.editId = e.target.value; render(); });
      PERSONA_FIELDS.forEach(f => {
        box.querySelector('#pa-' + f.k).addEventListener('input', (e) => {
          w.persona[f.k] = e.target.value;
          Core.State.save();
        });
      });
    }

    /* ---------- 世界观 / 人物关系 ---------- */
    function renderLore(box, w) {
      box.innerHTML = `
        <div class="sh-edit-bar">正在编辑：${editSelector(w)}</div>
        <label class="f2-label"><i class="fas fa-globe"></i> 世界观设定</label>
        <textarea class="f2-textarea" rows="4" id="lo-world" placeholder="这个世界的规则、魔法体系、时代背景、风土人情…">${esc(w.worldview)}</textarea>
        <div class="f2-divider"></div>
        <label class="f2-label"><i class="fas fa-people-arrows"></i> 人物关系（${w.relations.length}）</label>
        <div class="f2-list" style="max-height:200px">
          ${w.relations.length ? w.relations.map(r => `
            <div class="f2-item" data-rid="${r.id}">
              <span class="f2-item-mood">👤</span>
              <div class="f2-item-main">
                <div class="f2-item-text">${esc(r.name)} <span class="sh-rel-tag">${esc(r.rel || '—')}</span></div>
                <div class="f2-item-sub">${esc(r.desc || '没有描述')}</div>
              </div>
              <button class="icon-btn" data-rdel="${r.id}"><i class="fas fa-trash-can"></i></button>
            </div>`).join('') : '<p class="sh-empty">还没有人物关系</p>'}
        </div>
        <div class="sh-rel-add">
          <input type="text" id="rl-name" maxlength="12" placeholder="名字">
          <input type="text" id="rl-rel" maxlength="12" placeholder="关系（挚友/对手…）">
          <input type="text" id="rl-desc" maxlength="40" placeholder="一句话描述">
          <button class="btn-primary" id="rl-add"><i class="fas fa-plus"></i> 添加</button>
        </div>`;
      box.querySelector('.sh-edit-sel').addEventListener('change', (e) => { sd.editId = e.target.value; render(); });
      box.querySelector('#lo-world').addEventListener('input', (e) => { w.worldview = e.target.value; Core.State.save(); });
      box.querySelectorAll('[data-rdel]').forEach(b => b.addEventListener('click', () => {
        w.relations = w.relations.filter(x => x.id !== b.dataset.rdel);
        Core.State.save();
        render();
      }));
      box.querySelector('#rl-add').addEventListener('click', () => {
        const name = box.querySelector('#rl-name').value.trim();
        if (!name) { Core.Toast.show('请填写名字', 'error'); return; }
        w.relations.push({
          id: Core.uid(),
          name,
          rel: box.querySelector('#rl-rel').value.trim(),
          desc: box.querySelector('#rl-desc').value.trim()
        });
        Core.State.save();
        render();
        Core.Toast.show('已添加人物关系', 'success');
      });
    }

    /* ---------- 地点 ---------- */
    function renderPlaces(box, w) {
      box.innerHTML = `
        <div class="sh-edit-bar">正在编辑：${editSelector(w)}</div>
        <p class="sh-hint"><i class="fas fa-circle-info"></i> 为每个地点写下设定，转移后可以随时「到访」留下记录</p>
        <div class="sh-grid">
          ${PLACE_DEFS.map(p => {
            const st = w.places[p.k];
            return `
            <div class="sh-p-card" data-pk="${p.k}">
              <div class="sh-p-emoji">${p.emoji}</div>
              <div class="sh-p-name">${p.name}</div>
              <div class="sh-p-sub">${p.line}</div>
              <div class="sh-p-visits">到访 ${st.visits} 次</div>
            </div>`;
          }).join('')}
        </div>`;
      box.querySelector('.sh-edit-sel').addEventListener('change', (e) => { sd.editId = e.target.value; render(); });
      box.querySelectorAll('[data-pk]').forEach(el => el.addEventListener('click', () => openPlace(w, el.dataset.pk)));
    }

    function openPlace(w, pk) {
      const p = PLACE_DEFS.find(x => x.k === pk);
      const st = w.places[pk];
      const pm = UI.modal({
        title: `${p.emoji} ${p.name} · ${esc(w.name)}`,
        body: `
          <p class="sh-hint">${p.line}</p>
          <label class="f2-label">地点设定</label>
          <textarea class="f2-textarea" rows="3" id="pl-desc" placeholder="这里是什么样子？有什么特别之处？">${esc(st.desc)}</textarea>
          <div class="f2-divider"></div>
          <div class="sh-rel-add">
            <input type="text" id="pl-note" maxlength="40" placeholder="到访记录（可不填）">
            <button class="btn-primary" id="pl-visit"><i class="fas fa-shoe-prints"></i> 到此一游（${st.visits}）</button>
          </div>
          <div class="sh-log" id="pl-log"></div>`,
        footer: `<button class="btn-ghost" data-close>关闭</button>`,
        size: 'modal-lg'
      });
      pm.overlay.querySelector('[data-close]').addEventListener('click', pm.close);

      function renderLog() {
        pm.overlay.querySelector('#pl-log').innerHTML = st.log.length ? st.log.map(l => `
          <div class="sh-log-item" data-lid="${l.id}">
            <span>${UI.fmtTime(l.t)} · ${esc(l.note)}</span>
            <button class="icon-btn" data-ldel="${l.id}"><i class="fas fa-xmark"></i></button>
          </div>`).join('') : '<p class="sh-empty">还没有到访记录</p>';
        pm.overlay.querySelectorAll('[data-ldel]').forEach(b => b.addEventListener('click', () => {
          st.log = st.log.filter(x => x.id !== b.dataset.ldel);
          st.visits = st.log.length;
          Core.State.save();
          renderLog();
        }));
      }
      pm.overlay.querySelector('#pl-desc').addEventListener('input', (e) => { st.desc = e.target.value; Core.State.save(); });
      pm.overlay.querySelector('#pl-visit').addEventListener('click', () => {
        const note = pm.overlay.querySelector('#pl-note').value.trim() || '到此一游';
        st.log.unshift({ id: Core.uid(), t: Core.now(), note });
        if (st.log.length > 50) st.log.length = 50;
        st.visits = st.log.length;
        st.lastVisit = Core.now();
        pm.overlay.querySelector('#pl-note').value = '';
        pm.overlay.querySelector('#pl-visit').innerHTML = `<i class="fas fa-shoe-prints"></i> 到此一游（${st.visits}）`;
        Core.State.save();
        renderLog();
        render();
        Core.Toast.show(`在${p.name}留下了足迹 ${p.emoji}`, 'success');
      });
      renderLog();
    }

    /* ---------- 商城 ---------- */
    function renderShop(box, w) {
      const claimed = isToday(w.lastClaim);
      box.innerHTML = `
        <div class="sh-edit-bar">
          正在编辑：${editSelector(w)}
          <span class="sh-coins"><i class="fas fa-coins"></i> <b id="sh-coin-num">${w.coins}</b> 世界币</span>
          <button class="f2-chip ${claimed ? '' : 'selectable'}" id="sh-claim" ${claimed ? 'disabled' : ''}>${claimed ? '✅ 今日津贴已领' : '🎁 领取今日津贴 +200'}</button>
        </div>
        <div class="f2-chip-row" style="margin:10px 0">
          ${SHOP_CATS.map(c => `<button class="f2-chip selectable ${c.k === shopCat ? 'selected' : ''}" data-cat="${c.k}">${c.emoji} ${c.name}</button>`).join('')}
          <button class="f2-chip" id="sh-add-goods"><i class="fas fa-plus"></i> 上架自定义</button>
        </div>
        <div class="sh-goods-grid">
          ${w.shop[shopCat].map(it => `
            <div class="sh-g-card ${it.owned ? 'owned' : ''}">
              <div class="sh-g-emoji">${esc(it.icon)}</div>
              <div class="sh-g-name">${esc(it.name)}</div>
              <div class="sh-g-desc">${esc(it.desc)}</div>
              <div class="sh-g-foot">
                <span class="sh-g-price"><i class="fas fa-coins"></i> ${it.price}</span>
                ${it.owned
                  ? `<button class="f2-chip" data-gback="${it.id}">已拥有 · 退回</button>`
                  : `<button class="btn-primary sh-g-buy" data-gbuy="${it.id}">购买</button>`}
              </div>
            </div>`).join('') || '<p class="sh-empty">这个分类还是空的</p>'}
        </div>`;
      box.querySelector('.sh-edit-sel').addEventListener('change', (e) => { sd.editId = e.target.value; render(); });
      box.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { shopCat = b.dataset.cat; render(); }));
      box.querySelector('#sh-add-goods').addEventListener('click', () => openGoodsForm(w, shopCat));
      box.querySelector('#sh-claim')?.addEventListener('click', () => {
        if (isToday(w.lastClaim)) return;
        w.coins += 200;
        w.lastClaim = Core.now();
        Core.State.save();
        Core.Toast.show('津贴 +200 世界币 🎁', 'success');
        render();
      });
      box.querySelectorAll('[data-gbuy]').forEach(b => b.addEventListener('click', () => {
        const it = w.shop[shopCat].find(x => x.id === b.dataset.gbuy);
        if (!it) return;
        if (w.coins < it.price) { Core.Toast.show('世界币不够啦，明天记得领津贴～', 'error'); return; }
        w.coins -= it.price;
        it.owned = true;
        Core.State.save();
        Core.Toast.show(`已购入「${it.name}」${it.icon}`, 'success');
        render();
      }));
      box.querySelectorAll('[data-gback]').forEach(b => b.addEventListener('click', () => {
        const it = w.shop[shopCat].find(x => x.id === b.dataset.gback);
        if (!it) return;
        w.coins += it.price;
        it.owned = false;
        Core.State.save();
        render();
      }));
    }

    function openGoodsForm(w, cat) {
      const cdef = SHOP_CATS.find(c => c.k === cat);
      const fm = UI.modal({
        title: `上架商品 · ${cdef.emoji} ${cdef.name}`,
        body: `
          <label class="f2-label">名称</label>
          <input type="text" id="gf-name" maxlength="12" placeholder="商品名称">
          <label class="f2-label">图标（一个 emoji，可不填）</label>
          <input type="text" id="gf-icon" maxlength="4" placeholder="🎁" value="🎁">
          <label class="f2-label">描述</label>
          <input type="text" id="gf-desc" maxlength="30" placeholder="这件商品有什么用？">
          <label class="f2-label">价格（世界币）</label>
          <input type="number" id="gf-price" min="0" max="99999" value="100">`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="gf-ok">上架</button>`,
        size: 'modal-lg'
      });
      fm.overlay.querySelector('[data-close]').addEventListener('click', fm.close);
      fm.overlay.querySelector('#gf-ok').addEventListener('click', () => {
        const name = fm.overlay.querySelector('#gf-name').value.trim();
        if (!name) { Core.Toast.show('请填写商品名称', 'error'); return; }
        const price = Math.max(0, parseInt(fm.overlay.querySelector('#gf-price').value, 10) || 0);
        w.shop[cat].push({
          id: Core.uid(), name,
          icon: fm.overlay.querySelector('#gf-icon').value.trim() || '🎁',
          desc: fm.overlay.querySelector('#gf-desc').value.trim() || '自定义商品',
          price, owned: false
        });
        Core.State.save();
        fm.close();
        Core.Toast.show('商品已上架 🛒', 'success');
        render();
      });
    }

    /* ---------- 一键转移 ---------- */
    function doShift() {
      const targetId = overlay.querySelector('#sh-target').value;
      const fromW = curWorld();
      const toW = targetId === '__home__' ? null : sd.worlds.find(w => w.id === targetId);
      if (!toW && targetId !== '__home__') { Core.Toast.show('目标世界不存在', 'error'); return; }
      const fromName = worldLabel(fromW);
      const toName = toW ? worldLabel(toW) : worldLabel(null);
      if ((fromW?.id || '__home__') === (toW?.id || '__home__')) {
        Core.Toast.show('你已经在这里啦～', 'info');
        return;
      }

      const anim = document.createElement('div');
      anim.className = 'sh-anim';
      anim.innerHTML = `
        <div class="sh-anim-stars">✨🌟💫⭐🌠💫🌟✨</div>
        <div class="sh-anim-world">${esc(fromName)}</div>
        <div class="sh-anim-arrow"><i class="fas fa-wand-magic-sparkles"></i> 正在转移…</div>
        <div class="sh-anim-world sh-anim-to">${esc(toName)}</div>`;
      document.body.appendChild(anim);
      setTimeout(() => anim.classList.add('show'), 10);

      setTimeout(() => {
        anim.classList.remove('show');
        setTimeout(() => anim.remove(), 400);
        sd.currentId = toW ? toW.id : null;
        sd.history.unshift({ id: Core.uid(), fromName, toName, time: Core.now() });
        if (sd.history.length > 20) sd.history.length = 20;
        Core.State.save();
        render();
        Core.Toast.show(`转移成功，已抵达 ${toName} 🌌`, 'success');

        const sid = Core.State.currentChatId;
        const s = sid && Core.State.data.sessions[sid];
        if (s && s.type === 'private') {
          Messaging.sendMessage({
            type: 'card', cardIcon: 'fa-wand-magic-sparkles',
            cardTitle: '🌌 世界转移成功',
            lines: [`从 ${fromName}`, `抵达 ${toName}`, UI.fmtTime(Core.now())]
          });
        }
      }, 1700);
    }

    render();
  }

  /* ==================== 3. 画画功能 ==================== */
  let drawingCtx = null;
  let drawingCanvas = null;
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let curColor = '#5b8cc7';
  let curSize = 4;

  function openDrawing() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🎨 画画板',
      body: `
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
          <input type="color" id="dw-color" value="${curColor}" style="width:40px;height:32px;border:none;border-radius:6px;cursor:pointer">
          <select id="dw-size" style="padding:4px 8px;border-radius:6px;border:1px solid var(--c-border);background:var(--c-bg)">
            <option value="2">细笔</option>
            <option value="4" selected>普通</option>
            <option value="8">粗笔</option>
            <option value="16">超粗</option>
            <option value="30">毛刷</option>
          </select>
          <button class="btn-ghost" id="dw-eraser" style="padding:5px 10px;font-size:12px"><i class="fas fa-eraser"></i> 橡皮</button>
          <button class="btn-ghost" id="dw-clear" style="padding:5px 10px;font-size:12px"><i class="fas fa-trash"></i> 清空</button>
          <button class="btn-ghost" id="dw-save" style="padding:5px 10px;font-size:12px"><i class="fas fa-floppy-disk"></i> 保存</button>
          <button class="btn-primary" id="dw-send" style="padding:5px 10px;font-size:12px"><i class="fas fa-paper-plane"></i> 发到聊天</button>
        </div>
        <canvas id="dw-canvas" width="640" height="420" style="width:100%;border:2px solid var(--c-border);border-radius:10px;touch-action:none;cursor:crosshair;background:#fff"></canvas>
        <div class="f2-divider"></div>
        <label class="f2-label">我的画作 (${(d.drawings || []).length})</label>
        <div id="dw-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    drawingCanvas = overlay.querySelector('#dw-canvas');
    drawingCtx = drawingCanvas.getContext('2d');
    drawingCtx.fillStyle = '#fff';
    drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';

    let erasing = false;
    const colorInput = overlay.querySelector('#dw-color');
    const sizeSel = overlay.querySelector('#dw-size');

    colorInput.addEventListener('input', () => { curColor = colorInput.value; erasing = false; });
    sizeSel.addEventListener('change', () => { curSize = Number(sizeSel.value); });
    overlay.querySelector('#dw-eraser').addEventListener('click', () => { erasing = true; Core.Toast.show('橡皮模式', 'info'); });
    overlay.querySelector('#dw-clear').addEventListener('click', () => {
      drawingCtx.fillStyle = '#fff';
      drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    });

    function getPos(e) {
      const rect = drawingCanvas.getBoundingClientRect();
      const scaleX = drawingCanvas.width / rect.width;
      const scaleY = drawingCanvas.height / rect.height;
      const touch = e.touches ? e.touches[0] : e;
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }

    function start(e) {
      e.preventDefault();
      isDrawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
    }
    function move(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const p = getPos(e);
      drawingCtx.strokeStyle = erasing ? '#fff' : curColor;
      drawingCtx.lineWidth = erasing ? curSize * 3 : curSize;
      drawingCtx.beginPath();
      drawingCtx.moveTo(lastX, lastY);
      drawingCtx.lineTo(p.x, p.y);
      drawingCtx.stroke();
      lastX = p.x; lastY = p.y;
    }
    function end() { isDrawing = false; }

    drawingCanvas.addEventListener('mousedown', start);
    drawingCanvas.addEventListener('mousemove', move);
    drawingCanvas.addEventListener('mouseup', end);
    drawingCanvas.addEventListener('mouseout', end);
    drawingCanvas.addEventListener('touchstart', start);
    drawingCanvas.addEventListener('touchmove', move);
    drawingCanvas.addEventListener('touchend', end);

    function renderGallery() {
      const box = overlay.querySelector('#dw-gallery');
      box.innerHTML = (d.drawings || []).length ? d.drawings.map(dr => `
        <div style="position:relative">
          <img src="${dr.data}" style="width:100%;border-radius:8px;border:1px solid var(--c-border)">
          <button class="icon-btn" data-drdel="${dr.id}" style="position:absolute;top:2px;right:2px;background:rgba(255,255,255,.8)"><i class="fas fa-xmark"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);font-size:12px;grid-column:1/-1;text-align:center">还没有保存的画作</p>';
      box.querySelectorAll('[data-drdel]').forEach(b => b.addEventListener('click', () => {
        d.drawings = d.drawings.filter(x => x.id !== b.dataset.drdel);
        Core.State.save();
        renderGallery();
      }));
    }

    overlay.querySelector('#dw-save').addEventListener('click', () => {
      const data = drawingCanvas.toDataURL('image/png');
      d.drawings.unshift({ id: Core.uid(), data, time: Core.now() });
      if (d.drawings.length > 20) d.drawings = d.drawings.slice(0, 20);
      Core.State.save();
      renderGallery();
      Core.Toast.show('画作已保存 🎨', 'success');
    });

    overlay.querySelector('#dw-send').addEventListener('click', () => {
      if (!requireChat()) return;
      const data = drawingCanvas.toDataURL('image/png');
      Messaging.sendMessage({ type: 'image', url: data });
      Core.Toast.show('画作已发送 🎨', 'success');
    });

    renderGallery();
  }

  /* ==================== 4. 对方主动频率设置 ==================== */
  const PEER_FEATURES = [
    { k: 'diary', icon: 'fa-book', name: '对方写日记', desc: 'TA会主动写日记分享给你（内容取自你的日记卡）' },
    { k: 'letter', icon: 'fa-envelope', name: '对方写信', desc: 'TA会主动给你写信（内容取自你的写信卡，存入信件箱）' },
    { k: 'note', icon: 'fa-note-sticky', name: '对方留言', desc: 'TA会主动给你留言（内容取自你的留言卡，存入留言箱）' },
    { k: 'question', icon: 'fa-question-circle', name: '对方提问', desc: 'TA会主动问你问题' },
    { k: 'drawing', icon: 'fa-paintbrush', name: '对方画画', desc: 'TA会主动画涂鸦发给你' },
    { k: 'invListen', icon: 'fa-music', name: '邀请听歌', desc: 'TA主动邀请你一起听歌' },
    { k: 'invWatch', icon: 'fa-film', name: '邀请观影', desc: 'TA主动邀请你一起看视频' },
    { k: 'invRead', icon: 'fa-book-open', name: '邀请读书', desc: 'TA主动邀请你一起读书' },
    { k: 'invGame', icon: 'fa-gamepad', name: '邀请游戏', desc: 'TA主动邀请你玩小游戏' },
    { k: 'invAsk', icon: 'fa-circle-question', name: '邀请提问', desc: 'TA主动带着问题来找你' },
    { k: 'invCheckin', icon: 'fa-location-dot', name: '邀请查岗', desc: 'TA主动发起查岗互动' },
    { k: 'orderFood', icon: 'fa-utensils', name: '对方向你点餐', desc: 'TA在聊天里向你点餐，你可以接单或婉拒（厨房·点餐）' },
    { k: 'propAvatar', icon: 'fa-image', name: '提议换头像', desc: 'TA从你的头像库挑头像提议给你换，你可同意/拒绝' },
    { k: 'propNickname', icon: 'fa-signature', name: '提议换昵称', desc: 'TA从你的昵称库挑昵称提议给你换，与头像分开' },
    { k: 'mediaCtl', icon: 'fa-sliders', name: '媒体同步互动', desc: '一起听歌/观影/读书面板打开时，TA发消息并控制播放/翻页' }
  ];

  function openPeerFreq() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '💞 对方主动频率',
      body: `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:12px">设置对方主动发起各内容的频率。<b>回复触发</b>：TA 回复你时按概率主动；<b>定时</b>：聊天中按你设定的时间间隔（可精确到秒，也可按小时）随机主动发起。</p>
        <div id="pf-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    const unitOpts = (sel) => FREQ_UNITS.map(u => `<option value="${u.k}" ${u.k === sel ? 'selected' : ''}>${u.name}</option>`).join('');

    function render() {
      const box = overlay.querySelector('#pf-list');
      box.innerHTML = PEER_FEATURES.map(f => {
        const raw0 = d.peerFreq[f.k] || 'off';
        const isCustomPct = raw0.startsWith('custom:');
        const tr = timerRange(raw0);
        const curMode = isCustomPct ? 'custom' : (tr ? 'timer' : raw0);
        const customVal = isCustomPct ? Number(raw0.split(':')[1]) : 50;
        const defMin = tr ? tr.min : 30000, defMax = tr ? tr.max : 120000;
        const vu = (ms) => ms >= 3600000 && ms % 3600000 === 0 ? { v: ms / 3600000, u: 'h' } : ms % 60000 === 0 ? { v: ms / 60000, u: 'm' } : { v: Math.round(ms / 1000), u: 's' };
        const a = vu(defMin), b = vu(defMax);
        return `
        <div class="f2-item" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="f2-item-mood"><i class="fas ${f.icon}"></i></span>
            <div class="f2-item-main" style="flex:1">
              <div class="f2-item-text">${f.name}</div>
              <div class="f2-item-sub">${f.desc}</div>
            </div>
          </div>
          <div class="f2-chip-row" data-pf="${f.k}">
            ${FREQ_LEVELS.map(l => `<button class="f2-chip selectable ${l.k === curMode ? 'selected' : ''}" data-fl="${l.k}">${l.name}</button>`).join('')}
          </div>
          <div class="pf-custom-row" data-pfcr="${f.k}" ${curMode !== 'custom' ? 'hidden' : ''}>
            <input type="range" min="0" max="100" value="${customVal}" data-pfval="${f.k}" style="width:100%">
            <span data-pftext="${f.k}" style="font-size:12px;color:var(--c-text-soft)">${customVal}%（每次回复时触发概率）</span>
          </div>
          <div class="pf-timer-row" data-pftr="${f.k}" ${curMode !== 'timer' ? 'hidden' : ''}>
            <div class="pf-timer-inputs">
              <span>间隔</span>
              <input type="number" min="1" value="${a.v}" data-tminv="${f.k}" style="width:64px">
              <select data-tminu="${f.k}">${unitOpts(a.u)}</select>
              <span>至</span>
              <input type="number" min="1" value="${b.v}" data-tmaxv="${f.k}" style="width:64px">
              <select data-tmaxu="${f.k}">${unitOpts(b.u)}</select>
            </div>
            <div class="f2-chip-row" data-preset="${f.k}">
              ${[['30秒','2分',30000,120000],['1分','5分',60000,300000],['5分','30分',300000,1800000],['30分','1时',1800000,3600000],['1时','3时',3600000,10800000]]
                .map(p => `<button class="f2-chip" data-pre-min="${p[2]}" data-pre-max="${p[3]}">${p[0]}~${p[1]}</button>`).join('')}
            </div>
          </div>
        </div>`;
      }).join('');

      box.querySelectorAll('[data-fl]').forEach(b => b.addEventListener('click', () => {
        const feat = b.closest('[data-pf]').dataset.pf;
        const mode = b.dataset.fl;
        if (mode === 'custom') d.peerFreq[feat] = 'custom:50';
        else if (mode === 'timer') d.peerFreq[feat] = makeTimer(30000, 120000);
        else d.peerFreq[feat] = mode;
        Core.State.save();
        Features4 && Features4.rescheduleTimers && Features4.rescheduleTimers();
        render();
      }));

      box.querySelectorAll('[data-pfval]').forEach(s => s.addEventListener('input', () => {
        const feat = s.dataset.pfval;
        d.peerFreq[feat] = `custom:${s.value}`;
        box.querySelector(`[data-pftext="${feat}"]`).textContent = s.value + '%（每次回复时触发概率）';
        Core.State.save();
      }));

      function readTimer(feat) {
        const ms = (vId, uId) => {
          const v = Math.max(0, Number(box.querySelector(`[${vId}="${feat}"]`).value) || 0);
          const u = box.querySelector(`[${uId}="${feat}"]`).value;
          return v * (FREQ_UNITS.find(x => x.k === u)?.ms || 1000);
        };
        let mn = ms('data-tminv', 'data-tminu'), mx = ms('data-tmaxv', 'data-tmaxu');
        if (!mn || !mx) return null;
        if (mn > mx) { const t = mn; mn = mx; mx = t; }
        return [mn, mx];
      }
      box.querySelectorAll('.pf-timer-row').forEach(row => {
        const feat = row.dataset.pftr;
        const apply = () => {
          const rng = readTimer(feat);
          if (!rng) return;
          d.peerFreq[feat] = makeTimer(rng[0], rng[1]);
          Core.State.save();
          Features4 && Features4.rescheduleTimers && Features4.rescheduleTimers();
        };
        row.querySelectorAll('input,select').forEach(el => el.addEventListener('change', apply));
        row.querySelectorAll('[data-pre-min]').forEach(b => b.addEventListener('click', () => {
          d.peerFreq[feat] = makeTimer(Number(b.dataset.preMin), Number(b.dataset.preMax));
          Core.State.save();
          Features4 && Features4.rescheduleTimers && Features4.rescheduleTimers();
          render();
        }));
      });
    }
    render();
  }

  /* ==================== 对方主动触发器 ==================== */
  const PEER_DIARY_TEMPLATES = [
    '今天发生了一件有趣的事，忍不住想告诉你…',
    '今天心情不太好，写下来会舒服一点。其实也没什么大不了的…',
    '今天天气很好，出去走了走，看到一棵开花的树就想到了你。',
    '说起来有点不好意思，今天尝试做了一道新菜，虽然卖相一般但味道还行！',
    '今天遇到了一个很温柔的人，让我想起你平时对我说的话。'
  ];
  const PEER_LETTER_TEMPLATES = [
    '展信佳。今天想认认真真给你写几句话。其实一直想说的…谢谢你一直在我身边。',
    '见字如面。不知道你看到这封信的时候在做什么，希望一切顺利。',
    '写信给你是因为有些话当面说不出口。其实我…算了，下次见面再说吧。',
    '你最近还好吗？这里天气转凉了，记得加衣服。虽然有点唠叨，但就是这么想说。'
  ];
  const PEER_NOTE_TEMPLATES = [
    '路过你常提的那家店，想起你了，给你留句话：要开心呀。',
    '忙完看到消息记得回我，不着急，我就是想说一声我在。',
    '刚刚抬头看到云很好看，第一个想分享的人是你。',
    '记得喝水，记得吃饭，记得我在想你。',
    '没什么特别的事，就是想给你留个言，刷刷存在感～'
  ];
  /* 用户添加了对应类型字卡时 TA 必须从字卡里选；池空才用内置兜底 */
  function peerContent(kind, peer, fallback) {
    if (typeof Features5 !== 'undefined') {
      const pool = Features5.cardsOfKind(kind, peer);
      if (pool.length) return pick(pool);
    }
    return pick(fallback);
  }
  const PEER_QUESTION_TEMPLATES = [
    '突然想问你：你觉得最幸福的一件小事是什么？',
    '问你个问题：如果有一天可以重来，你想改变什么？',
    '好奇一下：你最近有什么开心的事吗？',
    '想问你：你喜欢现在的自己吗？',
    '问你个走心的：你觉得我们之间最珍贵的瞬间是哪个？'
  ];
  const PEER_DRAWING_SUBJECTS = ['一朵花', '一颗心', '一只猫', '一棵树', '一只鸟', '一个月亮', '一个蛋糕', '一栋小房子'];

  const INVITE_DEFS = {
    invListen:  { kind: 'listen',  icon: 'fa-music',           title: '邀请你一起听歌', desc: '我发现一首超好听的歌，要不要一起听？' },
    invWatch:   { kind: 'watch',   icon: 'fa-film',            title: '邀请你一起观影', desc: '今晚有空吗？想约你一起看个视频～' },
    invRead:    { kind: 'read',    icon: 'fa-book-open',       title: '邀请你一起读书', desc: '最近在看一本很有意思的书，一起读吗？' },
    invGame:    { kind: 'game',    icon: 'fa-gamepad',         title: '邀请你玩小游戏', desc: '好无聊呀，来一起玩局游戏吧！' },
    invAsk:     { kind: 'ask',     icon: 'fa-circle-question', title: '有问题想问你',   desc: '突然想到一个问题，想听你怎么说～' },
    invCheckin: { kind: 'checkin', icon: 'fa-location-dot',    title: '发起查岗',       desc: '在干嘛呢？接受查岗邀请，让我看看你此刻在做什么～' }
  };

  const COMMON_DISHES = ['番茄炒蛋', '可乐鸡翅', '红烧肉', '蛋炒饭', '糖醋排骨', '酸菜鱼', '麻婆豆腐', '蒜蓉西兰花', '葱油面', '紫菜蛋花汤', '咖喱鸡饭', '鲜虾粥', '小笼包', '水果沙拉', '焦糖布丁'];

  function fireProactive(key, sid, peer) {
    const d = ensureData();
    const uid = Core.State.user.username;
    const peerNick = (Core.State.data.contacts || []).find(c => c.username === peer)?.nickname
      || Core.Auth.getUser(peer)?.nickname || peer;
    const now = Core.now();
    let touched = true;

    if (key === 'diary') {
      const text = peerContent('diary', peer, PEER_DIARY_TEMPLATES);
      const msg = { id: Core.uid(), from: peer, to: uid, type: 'card', cardIcon: 'fa-book', cardTitle: '📔 TA的日记',
        lines: [text.length > 40 ? text.slice(0, 40) + '…' : text, '点击查看全文'],
        detail: { kind: 'diary', title: '📔 TA的日记', body: text, peer: peerNick, t: now },
        time: now, status: 'delivered' };
      Core.State.addMessage(sid, msg);
    } else if (key === 'letter') {
      const text = peerContent('letter', peer, PEER_LETTER_TEMPLATES);
      d.letters.push({ id: Core.uid(), from: peer, to: uid, subject: '来自TA的信', body: text, time: now, incoming: true, read: false });
      Core.State.save();
      const msg = { id: Core.uid(), from: peer, to: uid, type: 'card', cardIcon: 'fa-envelope', cardTitle: '📨 来自TA的信',
        lines: ['点击查看全文', '——' + peerNick],
        detail: { kind: 'letter', title: '📨 来自TA的信', body: text, peer: peerNick, t: now },
        time: now, status: 'delivered' };
      Core.State.addMessage(sid, msg);
    } else if (key === 'note') {
      const text = peerContent('note', peer, PEER_NOTE_TEMPLATES);
      d.notes.push({ id: Core.uid(), from: peer, to: uid, peer, body: text, time: now, read: false });
      Core.State.save();
      const msg = { id: Core.uid(), from: peer, to: uid, type: 'card', cardIcon: 'fa-note-sticky', cardTitle: '📝 TA的留言',
        lines: [text.length > 40 ? text.slice(0, 40) + '…' : text, '点击查看全文'],
        detail: { kind: 'note', title: '📝 TA的留言', body: text, peer: peerNick, t: now },
        time: now, status: 'delivered' };
      Core.State.addMessage(sid, msg);
      if (typeof Features8 !== 'undefined' && Features8.refreshNotes) Features8.refreshNotes();
    } else if (key === 'question') {
      const text = pick(PEER_QUESTION_TEMPLATES);
      Core.State.addMessage(sid, { id: Core.uid(), from: peer, to: uid, type: 'text', text, time: now, status: 'delivered' });
    } else if (key === 'drawing') {
      const subj = pick(PEER_DRAWING_SUBJECTS);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/><text x="100" y="100" font-size="14" text-anchor="middle" fill="#5b8cc7">${subj}</text><circle cx="100" cy="70" r="30" fill="none" stroke="#e8b8b8" stroke-width="3"/><path d="M70 120 Q100 80 130 120" fill="none" stroke="#b8d8f0" stroke-width="3"/></svg>`;
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      Core.State.addMessage(sid, { id: Core.uid(), from: peer, to: uid, type: 'image', url, time: now, status: 'delivered' });
    } else if (key === 'orderFood') {
      const recipes = (d.kitchen?.recipes || []).map(r => r.name).filter(Boolean);
      const dish = pick(recipes.length && Math.random() < 0.7 ? recipes : COMMON_DISHES);
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: uid, type: 'foodOrder',
        cardIcon: 'fa-utensils', cardTitle: '🍽️ TA 向你点餐',
        dish, lines: [`想吃：${dish}`, '希望今天能吃到你做的～'], orderStatus: null,
        time: now, status: 'delivered'
      });
    } else if (key === 'propAvatar' || key === 'propNickname') {
      Features7.sendProfileProposal(sid, peer, key === 'propAvatar' ? 'avatar' : 'nickname');
    } else if (key === 'mediaCtl') {
      touched = Features7.mediaPeerTick(sid, peer);
    } else if (INVITE_DEFS[key]) {
      const def = INVITE_DEFS[key];
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: uid, type: 'invite',
        inviteKind: def.kind, cardIcon: def.icon, cardTitle: def.title,
        lines: [def.desc], invStatus: null, time: now, status: 'delivered'
      });
    } else {
      touched = false;
    }
    if (touched) {
      UI.renderMessages(sid);
      UI.renderSessions(document.getElementById('session-search').value);
    }
    return touched;
  }

  function peerProactiveTrigger(sid, peer) {
    const d = ensureData();
    if (!d.peerFreq) return;
    for (const f of PEER_FEATURES) {
      const raw = d.peerFreq[f.k] || 'off';
      if (timerRange(raw)) continue; // 定时模式交给调度器
      let prob = 0;
      if (raw.startsWith('custom:')) prob = Number(raw.split(':')[1]) / 100;
      else prob = FREQ_LEVELS.find(l => l.k === raw)?.prob ?? 0;
      if (prob <= 0) continue;
      if (Math.random() > prob) continue;
      fireProactive(f.k, sid, peer);
    }
  }

  /* ==================== 邀请卡片响应（接受/婉拒） ==================== */
  function respondInvite(sid, mid, accepted) {
    const msgs = Core.State.getMessages(sid);
    const m = msgs.find(x => x.id === mid);
    if (!m || m.invStatus) return;
    const me = Core.State.user.username;
    const s = Core.State.data.sessions[sid];
    const peer = s ? s.members.find(x => x !== me) : null;
    m.invStatus = accepted ? 'accepted' : 'rejected';
    Core.State.save();
    // 我方在聊天里回一句
    Core.State.addMessage(sid, {
      id: Core.uid(), from: me, to: peer, type: 'text',
      text: accepted ? '好呀，一起吧～' : '不好意思，下次再一起吧～',
      time: Core.now(), status: 'sent'
    });
    if (accepted && m.inviteKind === 'ask') {
      // 接受提问 → 对方立刻抛出一个问题
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: me, type: 'text',
        text: pick(PEER_QUESTION_TEMPLATES), time: Core.now(), status: 'delivered'
      });
    }
    UI.renderMessages(sid);
    UI.renderSessions(document.getElementById('session-search').value);

    if (accepted) {
      const k = m.inviteKind;
      if (k === 'listen') document.getElementById('btn-listen')?.click();
      else if (k === 'watch') document.getElementById('btn-watch')?.click();
      else if (k === 'read') document.getElementById('btn-read')?.click();
      else if (k === 'game') Features6.openGames();
      else if (k === 'checkin') Features2.openCheckin();
    }
  }

  /* ==================== 点餐：我点给对方（对方自动接单） ==================== */
  function sendOrderToPeer(dish) {
    if (!dish || !requireChat()) return;
    const sid = Core.State.currentChatId;
    const s = Core.State.data.sessions[sid];
    if (!s || s.type !== 'private') { Core.Toast.show('点餐只支持私聊', 'error'); return; }
    const me = Core.State.user.username;
    const peer = s.members.find(x => x !== me);
    const m = Messaging.sendMessage({
      type: 'foodOrder', cardIcon: 'fa-utensils', cardTitle: '🙋 向 TA 点餐',
      dish, lines: [`想吃：${dish}`, '辛苦啦，做好叫我～'], orderStatus: null
    });
    // 模拟对方 1-2 秒后接单
    setTimeout(() => {
      m.orderStatus = 'accepted';
      Core.State.save();
      Core.State.addMessage(sid, {
        id: Core.uid(), from: peer, to: me, type: 'text',
        text: `收到！这就给你做「${dish}」，稍等一会儿哦～`,
        time: Core.now(), status: 'delivered'
      });
      if (Core.State.currentChatId === sid) {
        UI.renderMessages(sid);
        UI.renderSessions(document.getElementById('session-search').value);
      }
    }, 1000 + Math.random() * 1000);
  }

  /* ==================== 点餐卡片响应（接单/婉拒 TA 点的餐） ==================== */
  function respondFoodOrder(sid, mid, accepted) {
    const msgs = Core.State.getMessages(sid);
    const m = msgs.find(x => x.id === mid);
    if (!m || m.orderStatus) return;
    const me = Core.State.user.username;
    const s = Core.State.data.sessions[sid];
    const peer = s ? s.members.find(x => x !== me) : null;
    m.orderStatus = accepted ? 'accepted' : 'rejected';
    Core.State.save();
    Core.State.addMessage(sid, {
      id: Core.uid(), from: me, to: peer, type: 'text',
      text: accepted ? `好，「${m.dish}」接单！马上给你做 🍳` : '今天可能做不了这道菜，下次给你做别的吧～',
      time: Core.now(), status: 'sent'
    });
    UI.renderMessages(sid);
    UI.renderSessions(document.getElementById('session-search').value);
    if (accepted) {
      setTimeout(() => {
        Core.State.addMessage(sid, {
          id: Core.uid(), from: peer, to: me, type: 'text',
          text: '太好了，等你开饭！爱你 😋',
          time: Core.now(), status: 'delivered'
        });
        if (Core.State.currentChatId === sid) UI.renderMessages(sid);
      }, 1200);
    }
  }

  /* 定时频率改设置后让调度器立即重排 */
  function rescheduleTimers() {
    if (typeof Features7 !== 'undefined' && Features7.rescheduleTimers) Features7.rescheduleTimers();
  }

  /* ==================== 初始化 ==================== */
  function init() {
    ensureData();
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    bind('btn-kitchen', openKitchen);
    bind('btn-shift', openRealityShift);
    bind('btn-draw', openDrawing);
    bind('btn-peer', openPeerFreq);
  }

  return {
    init, openKitchen, openRealityShift, openDrawing, openPeerFreq,
    peerProactiveTrigger, fireProactive, respondInvite,
    sendOrderToPeer, respondFoodOrder, rescheduleTimers, timerRange
  };
})();
