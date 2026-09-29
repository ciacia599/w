/* ============ 私语 · 第四批扩展 (厨房 / 现实转移 / 画画 / 对方主动频率) ============ */
const Features4 = (() => {

  /* ---- 数据惰性初始化 ---- */
  function ensureData() {
    const d = Core.State.data;
    d.kitchen = d.kitchen || { fridge: [], recipes: [] };
    d.realityShifts = d.realityShifts || [];
    d.peerFreq = d.peerFreq || { diary: 'normal', letter: 'off', question: 'normal', drawing: 'off' };
    d.drawings = d.drawings || [];
    return d;
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
    { k: 'custom', name: '自定义', prob: -1 }
  ];
  function freqProb(level, customVal) {
    if (level === 'custom' && customVal != null) return Math.max(0, Math.min(1, customVal / 100));
    return FREQ_LEVELS.find(f => f.k === level)?.prob ?? 0;
  }

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
      else renderCook(c);
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

    overlay.querySelectorAll('#kit-tabs [data-kt]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.kt;
      overlay.querySelectorAll('#kit-tabs .selectable').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      render();
    }));
    render();
  }

  /* ==================== 2. 现实转移 (Reality Shift) ==================== */
  const SHIFT_FIELDS = [
    { k: 'name', label: '姓名', ph: '你在那个世界的名字' },
    { k: 'gender', label: '性别', ph: '男 / 女 / 其他' },
    { k: 'species', label: '物种', ph: '人类 / 精灵 / 吸血鬼 / 自定义' },
    { k: 'abilities', label: '能力技能', ph: '魔法 / 超能力 / 特殊技能', area: true },
    { k: 'curWorld', label: '当前世界', ph: '现实世界 / 你现在在哪' },
    { k: 'targetWorld', label: '想去的世界', ph: '霍格沃茨 / 原神世界 / 自定义' },
    { k: 'dr', label: 'DR (Desired Reality)', ph: '你的理想现实描述', area: true },
    { k: 'wr', label: 'WR (Waiting Room)', ph: '过渡等待室的描述', area: true }
  ];
  const SHIFT_EXTRA_SECTIONS = [
    { k: 'shop', label: '商城', icon: 'fa-store' },
    { k: 'space', label: '空间', icon: 'fa-cube' },
    { k: 'system', label: '系统', icon: 'fa-gear' },
    { k: 'wardrobe', label: '衣橱', icon: 'fa-shirt' },
    { k: 'food', label: '美食', icon: 'fa-utensils' }
  ];

  function openRealityShift() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🌌 现实转移 · 世界线',
      body: `
        <button class="btn-primary" id="rs-add" style="width:100%;margin-bottom:12px"><i class="fas fa-plus"></i> 新建世界线剧本</button>
        <div class="f2-list" id="rs-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function render() {
      const list = overlay.querySelector('#rs-list');
      const items = d.realityShifts || [];
      list.innerHTML = items.length ? items.map(s => `
        <div class="f2-item" data-rid="${s.id}" style="cursor:pointer">
          <span class="f2-item-mood">🌌</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(s.name || '未命名')} · ${esc(s.targetWorld || '?')}</div>
            <div class="f2-item-sub">${esc(s.dr ? s.dr.slice(0, 30) : '无DR描述')}${s.customSections ? ' · +' + Object.keys(s.customSections).length + '自定义' : ''}</div>
          </div>
          <button class="icon-btn f2-del" data-rsdel="${s.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有世界线，创建你的第一个转移剧本吧</p>';
      list.querySelectorAll('[data-rid]').forEach(el => el.addEventListener('click', (e) => {
        if (e.target.closest('[data-rsdel]')) return;
        editShift(el.dataset.rid);
      }));
      list.querySelectorAll('[data-rsdel]').forEach(b => b.addEventListener('click', () => {
        d.realityShifts = d.realityShifts.filter(x => x.id !== b.dataset.rsdel);
        Core.State.save();
        render();
      }));
    }

    overlay.querySelector('#rs-add').addEventListener('click', () => editShift(null));

    function editShift(id) {
      const s = id ? d.realityShifts.find(x => x.id === id) : { id: Core.uid(), name: '', customSections: {} };
      const em = UI.modal({
        title: id ? '编辑世界线' : '新建世界线',
        body: `
          <label class="f2-label">剧本名称</label>
          <input type="text" id="rs-name" value="${esc(s.name)}" placeholder="例如：霍格沃茨之旅">
          <div class="f2-divider"></div>
          <label class="f2-label"><i class="fas fa-user"></i> 人物设定</label>
          ${SHIFT_FIELDS.map(f => `
            <label class="f2-label">${f.label}</label>
            ${f.area
              ? `<textarea class="f2-textarea" rows="2" id="rs-${f.k}" placeholder="${f.ph}">${esc(s[f.k] || '')}</textarea>`
              : `<input type="text" id="rs-${f.k}" value="${esc(s[f.k] || '')}" placeholder="${f.ph}">`}`).join('')}
          <div class="f2-divider"></div>
          <label class="f2-label"><i class="fas fa-puzzle-piece"></i> 附加板块</label>
          <div class="f2-chip-row" id="rs-sections">
            ${SHIFT_EXTRA_SECTIONS.map(sec => {
              const has = s.customSections && s.customSections[sec.k];
              return `<button class="f2-chip selectable ${has ? 'selected' : ''}" data-sec="${sec.k}"><i class="fas ${sec.icon}"></i> ${sec.label}</button>`;
            }).join('')}
            <button class="f2-chip" id="rs-add-custom"><i class="fas fa-plus"></i> 自定义</button>
          </div>
          <div id="rs-section-content"></div>`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="rs-save"><i class="fas fa-check"></i> 保存</button>`,
        size: 'modal-xl'
      });
      em.overlay.querySelector('[data-close]').addEventListener('click', em.close);

      // Toggle section visibility
      let activeSections = {};
      if (s.customSections) Object.keys(s.customSections).forEach(k => { activeSections[k] = s.customSections[k]; });

      function renderSections() {
        const box = em.overlay.querySelector('#rs-section-content');
        const sectionDefs = [...SHIFT_EXTRA_SECTIONS, ...Object.keys(activeSections).filter(k => !SHIFT_EXTRA_SECTIONS.find(s => s.k === k)).map(k => ({ k, label: k, icon: 'fa-star' }))];
        box.innerHTML = Object.keys(activeSections).length ? sectionDefs.filter(sec => activeSections[sec.k] !== undefined).map(sec => `
          <div style="margin-bottom:10px">
            <label class="f2-label">${sec.icon ? `<i class="fas ${sec.icon}"></i>` : ''} ${esc(sec.label || sec.k)}</label>
            <textarea class="f2-textarea" rows="2" data-sectext="${esc(sec.k)}" placeholder="描述这个世界线中的${esc(sec.label || sec.k)}…">${esc(activeSections[sec.k] || '')}</textarea>
            <button class="btn-ghost" data-secdel="${esc(sec.k)}" style="padding:3px 8px;font-size:11px;margin-top:4px"><i class="fas fa-xmark"></i> 移除</button>
          </div>`).join('') : '<p style="color:var(--c-text-faint);font-size:12px">点击上方标签添加板块</p>';
        box.querySelectorAll('[data-sectext]').forEach(t => t.addEventListener('input', () => { activeSections[t.dataset.sectext] = t.value; }));
        box.querySelectorAll('[data-secdel]').forEach(b => b.addEventListener('click', () => { delete activeSections[b.dataset.secdel]; renderSections(); }));
      }

      em.overlay.querySelectorAll('#rs-sections [data-sec]').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.sec;
        if (activeSections[k] !== undefined) { delete activeSections[k]; b.classList.remove('selected'); }
        else { activeSections[k] = ''; b.classList.add('selected'); }
        renderSections();
      }));

      em.overlay.querySelector('#rs-add-custom').addEventListener('click', () => {
        const pm = UI.modal({
          title: '自定义板块',
          body: `<label class="f2-label">板块名称</label><input type="text" id="rs-custom-name" placeholder="例如：宠物 / 座驾 / 银行卡" maxlength="10">`,
          footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="rs-custom-ok">添加</button>`,
          size: 'modal-lg'
        });
        pm.overlay.querySelector('[data-close]').addEventListener('click', pm.close);
        pm.overlay.querySelector('#rs-custom-ok').addEventListener('click', () => {
          const key = pm.overlay.querySelector('#rs-custom-name').value.trim();
          if (!key) { Core.Toast.show('请输入板块名称', 'error'); return; }
          if (activeSections[key] !== undefined) { Core.Toast.show('该板块已存在', 'error'); return; }
          activeSections[key] = '';
          renderSections();
          pm.close();
          Core.Toast.show('板块已添加', 'success');
        });
        setTimeout(() => pm.overlay.querySelector('#rs-custom-name').focus(), 80);
      });

      renderSections();

      em.overlay.querySelector('#rs-save').addEventListener('click', () => {
        s.name = em.overlay.querySelector('#rs-name').value.trim() || '未命名世界线';
        SHIFT_FIELDS.forEach(f => { s[f.k] = em.overlay.querySelector('#rs-' + f.k).value.trim(); });
        s.customSections = {};
        Object.entries(activeSections).forEach(([k, v]) => { if (v !== undefined) s.customSections[k] = v; });
        if (!id) d.realityShifts.unshift(s);
        Core.State.save();
        em.close();
        render();
        Core.Toast.show('世界线已保存 🌌', 'success');
      });
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
    { k: 'diary', icon: 'fa-book', name: '对方写日记', desc: 'TA会主动写日记分享给你' },
    { k: 'letter', icon: 'fa-envelope', name: '对方写信', desc: 'TA会主动给你写信' },
    { k: 'question', icon: 'fa-question-circle', name: '对方提问', desc: 'TA会主动问你问题' },
    { k: 'drawing', icon: 'fa-paintbrush', name: '对方画画', desc: 'TA会主动画涂鸦发给你' }
  ];

  function openPeerFreq() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '💞 对方主动频率',
      body: `
        <p style="font-size:13px;color:var(--c-text-soft);margin-bottom:12px">设置对方主动发起各内容的频率。频率越高，TA在回复时越可能主动分享。</p>
        <div id="pf-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function render() {
      const box = overlay.querySelector('#pf-list');
      box.innerHTML = PEER_FEATURES.map(f => {
        const cur = d.peerFreq[f.k] || 'off';
        const isCustom = cur.startsWith('custom:');
        const curLevel = isCustom ? 'custom' : cur;
        const customVal = isCustom ? Number(cur.split(':')[1]) : 50;
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
            ${FREQ_LEVELS.map(l => `<button class="f2-chip selectable ${l.k === curLevel ? 'selected' : ''}" data-fl="${l.k}">${l.name}</button>`).join('')}
          </div>
          <div class="pf-custom-row" data-pfcr="${f.k}" ${curLevel !== 'custom' ? 'hidden' : ''}>
            <input type="range" min="0" max="100" value="${customVal}" data-pfval="${f.k}" style="width:100%">
            <span data-pftext="${f.k}" style="font-size:12px;color:var(--c-text-soft)">${customVal}%</span>
          </div>
        </div>`;
      }).join('');

      box.querySelectorAll('[data-fl]').forEach(b => b.addEventListener('click', () => {
        const feat = b.closest('[data-pf]').dataset.pf;
        const level = b.dataset.fl;
        if (level === 'custom') {
          d.peerFreq[feat] = 'custom:50';
        } else {
          d.peerFreq[feat] = level;
        }
        Core.State.save();
        render();
      }));

      box.querySelectorAll('[data-pfval]').forEach(s => s.addEventListener('input', () => {
        const feat = s.dataset.pfval;
        const v = s.value;
        d.peerFreq[feat] = `custom:${v}`;
        box.querySelector(`[data-pftext="${feat}"]`).textContent = v + '%';
        Core.State.save();
      }));
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
  const PEER_QUESTION_TEMPLATES = [
    '突然想问你：你觉得最幸福的一件小事是什么？',
    '问你个问题：如果有一天可以重来，你想改变什么？',
    '好奇一下：你最近有什么开心的事吗？',
    '想问你：你喜欢现在的自己吗？',
    '问你个走心的：你觉得我们之间最珍贵的瞬间是哪个？'
  ];
  const PEER_DRAWING_SUBJECTS = ['一朵花', '一颗心', '一只猫', '一棵树', '一只鸟', '一个月亮', '一个蛋糕', '一栋小房子'];

  function peerProactiveTrigger(sid, peer) {
    const d = ensureData();
    if (!d.peerFreq) return;
    const uid = Core.State.user.username;
    for (const f of PEER_FEATURES) {
      const raw = d.peerFreq[f.k] || 'off';
      let prob = 0;
      if (raw.startsWith('custom:')) prob = Number(raw.split(':')[1]) / 100;
      else prob = FREQ_LEVELS.find(l => l.k === raw)?.prob ?? 0;
      if (prob <= 0) continue;
      if (Math.random() > prob) continue;

      if (f.k === 'diary') {
        const text = pick(PEER_DIARY_TEMPLATES);
        const msg = { id: Core.uid(), from: peer, to: uid, type: 'card', cardIcon: 'fa-book', cardTitle: '📔 TA的日记', lines: [text, `${fmtDate(Core.now())} ${fmtHM(Core.now())}`], time: Core.now(), status: 'delivered' };
        Core.State.addMessage(sid, msg);
      } else if (f.k === 'letter') {
        const text = pick(PEER_LETTER_TEMPLATES);
        const msg = { id: Core.uid(), from: peer, to: uid, type: 'card', cardIcon: 'fa-envelope', cardTitle: '📨 来自TA的信', lines: [text, '——' + (Core.Auth.getUser(peer)?.nickname || peer)], time: Core.now(), status: 'delivered' };
        Core.State.addMessage(sid, msg);
      } else if (f.k === 'question') {
        const text = pick(PEER_QUESTION_TEMPLATES);
        const msg = { id: Core.uid(), from: peer, to: uid, type: 'text', text, time: Core.now(), status: 'delivered' };
        Core.State.addMessage(sid, msg);
      } else if (f.k === 'drawing') {
        // 生成一个简单的SVG涂鸦 data URL
        const subj = pick(PEER_DRAWING_SUBJECTS);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/><text x="100" y="100" font-size="14" text-anchor="middle" fill="#5b8cc7">${subj}</text><circle cx="100" cy="70" r="30" fill="none" stroke="#e8b8b8" stroke-width="3"/><path d="M70 120 Q100 80 130 120" fill="none" stroke="#b8d8f0" stroke-width="3"/></svg>`;
        const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        const msg = { id: Core.uid(), from: peer, to: uid, type: 'image', url, time: Core.now(), status: 'delivered' };
        Core.State.addMessage(sid, msg);
      }
      UI.renderMessages(sid);
      UI.renderSessions(document.getElementById('session-search').value);
    }
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

  return { init, openKitchen, openRealityShift, openDrawing, openPeerFreq, peerProactiveTrigger };
})();
