/* ============ 私语 · 扩展功能 (抉择 / 日历 / 心情手账 / 占卜 / 摸鱼 / 查岗 / 统计 / 记账 / 存钱罐 / 商城) ============ */
const Features2 = (() => {

  /* ---- 数据惰性初始化 ---- */
  function ensureData() {
    const d = Core.State.data;
    d.moods = d.moods || [];
    d.calendar = d.calendar || {};
    d.fish = d.fish || [];
    d.checkins = d.checkins || [];
    d.expenses = d.expenses || [];
    d.piggy = d.piggy || { balance: 0, goal: 0, history: [] };
    d.wishes = d.wishes || [];
    d.wallet = d.wallet || { coins: 1000 };
    d.purchases = d.purchases || [];
    d.decks = d.decks || null;
    d.fortune = d.fortune || [];
    d.shopItems = d.shopItems || null;
    d.deckNotes = d.deckNotes || {};
    return d;
  }

  const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtHM = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => UI.escapeHtml(String(s ?? ''));

  function requireChat() {
    if (!Core.State.currentChatId) { Core.Toast.show('请先打开一个会话', 'error'); return false; }
    return true;
  }

  /* 发送卡片消息到当前会话 */
  function sendCard(icon, title, lines) {
    if (!requireChat()) return false;
    Messaging.sendMessage({ type: 'card', cardIcon: icon, cardTitle: title, lines });
    Core.Toast.show('已发送到聊天', 'success');
    return true;
  }

  /* ---- Tab 切换绑定 ---- */
  function bindTabs(overlay) {
    overlay.querySelectorAll('.f2-tab').forEach(t => {
      t.addEventListener('click', () => {
        overlay.querySelectorAll('.f2-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        overlay.querySelectorAll('.f2-pane').forEach(p => p.classList.remove('active'));
        overlay.querySelector(`#pane-${t.dataset.pane}`).classList.add('active');
      });
    });
  }

  /* ==================== 1. 抉择 ==================== */
  function openDecide() {
    const { overlay, close } = UI.modal({
      title: '🪙 帮你做决定',
      body: `
        <div class="f2-tabs">
          <button class="f2-tab active" data-pane="coin"><i class="fas fa-coins"></i> 抛硬币</button>
          <button class="f2-tab" data-pane="lot"><i class="fas fa-list-ol"></i> 随机抽签</button>
        </div>
        <div id="pane-coin" class="f2-pane active">
          <div class="f2-coin-wrap">
            <div class="f2-coin" id="decide-coin"><span id="decide-coin-face">?</span></div>
          </div>
          <div class="f2-result" id="decide-coin-result">点击下方按钮开始</div>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
            <button class="btn-primary" id="btn-coin-flip"><i class="fas fa-rotate"></i> 抛硬币</button>
            <button class="btn-ghost" id="btn-coin-send" disabled><i class="fas fa-paper-plane"></i> 发送结果</button>
          </div>
        </div>
        <div id="pane-lot" class="f2-pane">
          <label class="f2-label">候选选项（每行一个，或用逗号分隔）</label>
          <textarea id="decide-lot-input" class="f2-textarea" rows="4" placeholder="例如：\n吃火锅\n吃烧烤\n吃日料">吃火锅
吃烧烤
吃日料
看电影
宅在家</textarea>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
            <button class="btn-primary" id="btn-lot-draw"><i class="fas fa-wand-magic-sparkles"></i> 抽签</button>
            <button class="btn-ghost" id="btn-lot-send" disabled><i class="fas fa-paper-plane"></i> 发送结果</button>
          </div>
          <div class="f2-result" id="decide-lot-result" style="margin-top:12px">等待抽签…</div>
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    bindTabs(overlay);

    let coinResult = '', lotResult = '';
    const coin = overlay.querySelector('#decide-coin');
    const coinFace = overlay.querySelector('#decide-coin-face');
    const coinRes = overlay.querySelector('#decide-coin-result');
    const coinSend = overlay.querySelector('#btn-coin-send');

    overlay.querySelector('#btn-coin-flip').addEventListener('click', () => {
      coinResult = Math.random() < 0.5 ? '正面' : '反面';
      coin.classList.remove('flipping');
      void coin.offsetWidth; // 重启动画
      coin.classList.add('flipping');
      coinRes.textContent = '旋转中…';
      setTimeout(() => {
        coinFace.textContent = coinResult === '正面' ? '正' : '反';
        coinRes.innerHTML = `结果是 <b>${coinResult}</b> ${coinResult === '正面' ? '🎉' : '🌟'}`;
        coinSend.disabled = false;
      }, 1200);
    });
    coinSend.addEventListener('click', () => {
      if (sendCard('fa-coins', '🪙 抛硬币结果', [`结果：${coinResult}`])) close();
    });

    overlay.querySelector('#btn-lot-draw').addEventListener('click', () => {
      const raw = overlay.querySelector('#decide-lot-input').value.trim();
      const opts = raw.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);
      if (!opts.length) { Core.Toast.show('请先填写候选选项', 'error'); return; }
      lotResult = pick(opts);
      const res = overlay.querySelector('#decide-lot-result');
      res.textContent = '抽签中…';
      let n = 0;
      const timer = setInterval(() => {
        res.textContent = pick(opts);
        if (++n > 8) {
          clearInterval(timer);
          res.innerHTML = `抽中了 <b>${esc(lotResult)}</b> ✨`;
          overlay.querySelector('#btn-lot-send').disabled = false;
        }
      }, 90);
    });
    overlay.querySelector('#btn-lot-send').addEventListener('click', () => {
      if (sendCard('fa-list-ol', '🎲 随机抽签结果', [`抽中：${lotResult}`])) close();
    });
  }

  /* ==================== 2. 日历 ==================== */
  function openCalendar() {
    const d = ensureData();
    const today = new Date();
    let viewY = today.getFullYear(), viewM = today.getMonth(); // viewM 0-11

    const { overlay, close } = UI.modal({
      title: '📅 日历',
      body: `
        <div class="f2-cal-head">
          <button class="icon-btn" id="cal-prev"><i class="fas fa-chevron-left"></i></button>
          <div class="f2-cal-title" id="cal-title"></div>
          <button class="icon-btn" id="cal-next"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="f2-cal-week"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
        <div class="f2-cal-grid" id="cal-grid"></div>
        <div class="f2-cal-tip"><span class="cal-dot"></span> 有记录的日期，点击查看 / 添加</div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function renderGrid() {
      overlay.querySelector('#cal-title').textContent = `${viewY} 年 ${viewM + 1} 月`;
      const grid = overlay.querySelector('#cal-grid');
      const firstDay = new Date(viewY, viewM, 1);
      const offset = (firstDay.getDay() + 6) % 7; // 周一开头
      const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
      let html = '';
      for (let i = 0; i < offset; i++) html += `<span class="cal-cell empty"></span>`;
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${viewY}-${String(viewM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasRec = (d.calendar[key] || []).length > 0;
        const isToday = key === fmtDate(Core.now());
        html += `<span class="cal-cell ${isToday ? 'today' : ''}" data-key="${key}">${day}${hasRec ? '<i class="cal-dot"></i>' : ''}</span>`;
      }
      grid.innerHTML = html;
      grid.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
        cell.addEventListener('click', () => openDay(cell.dataset.key));
      });
    }

    function openDay(key) {
      const [y, m, day] = key.split('-').map(Number);
      const records = d.calendar[key] || [];
      const dayModal = UI.modal({
        title: `📅 ${m} 月 ${day} 日`,
        body: `
          <div id="day-list" class="f2-list">
            ${records.length ? records.map(r => `
              <div class="f2-item" data-id="${r.id}">
                <span class="f2-item-time">${fmtHM(r.time)}</span>
                <span class="f2-item-text">${esc(r.text)}</span>
                <button class="icon-btn f2-del" data-del="${r.id}" title="删除"><i class="fas fa-trash-can"></i></button>
              </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">这一天还没有记录</p>'}
          </div>
          <div class="form-row" style="margin-top:12px">
            <input type="text" id="day-input" placeholder="添加一条记录…">
            <button class="btn-primary" id="day-add"><i class="fas fa-plus"></i></button>
          </div>`,
        footer: `<button class="btn-ghost" data-close>返回</button>`,
        size: 'modal-lg'
      });
      dayModal.overlay.querySelector('[data-close]').addEventListener('click', dayModal.close);

      function refreshDay() {
        dayModal.close();
        openDay(key);
      }
      dayModal.overlay.querySelector('#day-add').addEventListener('click', () => {
        const input = dayModal.overlay.querySelector('#day-input');
        const text = input.value.trim();
        if (!text) return;
        if (!d.calendar[key]) d.calendar[key] = [];
        d.calendar[key].push({ id: Core.uid(), time: Core.now(), text });
        Core.State.save();
        Core.Toast.show('已添加', 'success');
        refreshDay();
      });
      dayModal.overlay.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          d.calendar[key] = (d.calendar[key] || []).filter(r => r.id !== btn.dataset.del);
          Core.State.save();
          refreshDay();
        });
      });
      setTimeout(() => dayModal.overlay.querySelector('#day-input')?.focus(), 100);
    }

    overlay.querySelector('#cal-prev').addEventListener('click', () => { viewM--; if (viewM < 0) { viewM = 11; viewY--; } renderGrid(); });
    overlay.querySelector('#cal-next').addEventListener('click', () => { viewM++; if (viewM > 11) { viewM = 0; viewY++; } renderGrid(); });
    renderGrid();
  }

  /* ==================== 3. 心情手账 ==================== */
  const MOODS = ['😊开心', '🥰幸福', '😌平静', '🤩兴奋', '😢难过', '😡生气', '😰焦虑', '😴疲惫', '🤒不舒服', '😐一般'];

  function openMood() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '💖 心情手账',
      body: `
        <label class="f2-label">现在的心情</label>
        <div class="f2-mood-picker" id="mood-picker">
          ${MOODS.map((m, i) => `<button class="f2-mood-opt ${i === 0 ? 'selected' : ''}" data-mood="${m}">${m}</button>`).join('')}
        </div>
        <label class="f2-label">想说的话</label>
        <textarea id="mood-text" class="f2-textarea" rows="3" placeholder="记录此刻的心情…"></textarea>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-primary" id="mood-save" style="flex:1"><i class="fas fa-heart"></i> 记录心情</button>
          <button class="btn-ghost" id="mood-send"><i class="fas fa-paper-plane"></i> 分享给TA</button>
        </div>
        <div class="f2-divider"></div>
        <div class="f2-list" id="mood-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    let selected = MOODS[0];
    overlay.querySelectorAll('.f2-mood-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.f2-mood-opt').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        selected = btn.dataset.mood;
      });
    });

    function renderList() {
      const list = overlay.querySelector('#mood-list');
      const items = d.moods.slice(0, 30);
      list.innerHTML = items.length ? items.map(m => `
        <div class="f2-item">
          <span class="f2-item-mood">${esc(m.mood)}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(m.text) || '<i style="color:var(--c-text-faint)">（没有配文字）</i>'}</div>
            <div class="f2-item-sub">${m.date} ${fmtHM(m.time)}</div>
          </div>
          <button class="icon-btn f2-del" data-del="${m.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有心情记录，来写第一条吧</p>';
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          d.moods = d.moods.filter(x => x.id !== btn.dataset.del);
          Core.State.save();
          renderList();
        });
      });
    }

    function collect() {
      const text = overlay.querySelector('#mood-text').value.trim();
      return { id: Core.uid(), time: Core.now(), date: fmtDate(Core.now()), mood: selected, text };
    }
    overlay.querySelector('#mood-save').addEventListener('click', () => {
      d.moods.unshift(collect());
      Core.State.save();
      overlay.querySelector('#mood-text').value = '';
      renderList();
      Core.Toast.show('心情已记录 💖', 'success');
    });
    overlay.querySelector('#mood-send').addEventListener('click', () => {
      const e = collect();
      if (!e.text && !requireChat()) return;
      if (sendCard('fa-heart', `${e.mood} | 心情分享`, [e.text || '（没说话，就是一个心情）'])) {
        d.moods.unshift(e);
        Core.State.save();
        renderList();
        overlay.querySelector('#mood-text').value = '';
      }
    });
    renderList();
  }

  /* ==================== 4. 运势占卜 ==================== */
  const TRIGRAM_BITS = { '1': '111', '2': '110', '3': '101', '4': '100', '5': '011', '6': '010', '7': '001', '8': '000' };
  const TRIGRAM_NAMES = { '111': '乾', '110': '兑', '101': '离', '100': '震', '011': '巽', '010': '坎', '001': '艮', '000': '坤' };
  const TRIGRAM_SYMS = { 乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷' };
  /* HEX_TABLE[上卦][下卦] = 卦名（不含上下文前缀的完整名） */
  const HEX_TABLE = {
    乾: ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
    兑: ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
    离: ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
    震: ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
    巽: ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
    坎: ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
    艮: ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
    坤: ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地']
  };
  /* HEX_DETAIL[卦名] = [吉凶等级, 释义, 建议] */
  const HEX_DETAIL = {
    乾为天: ['大吉', '天行健，君子以自强不息。纯阳刚健，万事亨通，正是大有作为之时。', '宜主动进取、开创局面，但需戒骄戒躁，量力知止。'],
    天泽履: ['中吉', '如履虎尾而不被咬，以柔履刚，循礼而行可化险为夷。', '守规矩、重分寸，步步小心，终能涉险得吉。'],
    天火同人: ['吉', '天与火同向上升，与人和同、光明磊落，志同道合者自然汇聚。', '宜合作共赢，打开格局，破除私心与门户之见。'],
    天雷无妄: ['中吉', '天下雷行，万物皆真实无妄；无妄之福与无妄之灾都非强求可得。', '不妄作、不妄求，守正念行正事，则无灾咎。'],
    天风姤: ['小凶', '天下有风，一阴初生而与五阳不期而遇，小人之势暗长。', '防微杜渐，慎重对待突如其来的缘分与人脉。'],
    天水讼: ['小凶', '天向西转、水向东流，方向相背而成争执，讼则终凶。', '息事宁人为上，有理也让三分，避免官司口角。'],
    天山遁: ['中平', '天下有山，阴长阳消，君子当远小人而退避，退非怯也。', '及时抽身、保全实力，态度不恶而严，等待来日。'],
    天地否: ['凶', '天气上升地气下降，天地不交而闭塞，小人在内君子在外。', '宜守俭德、隐藏锋芒，静待否极泰来，不可妄动。'],
    泽天夬: ['中吉', '泽水涨于天上，决溃之象，五阳决去一阴，果决除害。', '当断则断，但要先施德立信、准备周全，勿逞一时之勇。'],
    兑为泽: ['吉', '两泽相连互相滋润，朋友讲习、和悦相生，言谈有喜。', '以诚待人、多交流分享，但戒巧言令色之悦。'],
    泽火革: ['大吉', '水在火上相克相生，变革之时，顺乎天而应乎人。', '把握破旧立新的时机，准备成熟则一改即通。'],
    泽雷随: ['中吉', '泽中有雷，寒往暑来随时而动，择善而从之。', '顺应变化不固执，但要有所守，不随波逐流。'],
    泽风大过: ['小凶', '泽水淹没林木，栋梁弯曲，负担过重、非常之时行非常之事。', '独立不惧、遁世无闷，量力而行并主动寻求支撑。'],
    泽水困: ['凶', '泽中无水而困于下，君子处困当致命遂志，不改其乐。', '守住志向底线，以柔养气，不胡为，困境自会松动。'],
    泽山咸: ['吉', '山上有泽，二气交感相通，少男少女纯真之情，婚恋和合之象。', '放下身段、以诚感通，心里有爱就主动表达。'],
    泽地萃: ['吉', '泽居地上众水汇聚，人物萃聚之象，可成大事。', '以诚意聚拢人心与资源，祭祀般郑重，则亨通无咎。'],
    火天大有: ['大吉', '火在天上无所不照，所有者大、所获丰厚，富盛之极。', '富而好礼、遏恶扬善，懂得分享方能长保其有。'],
    火泽睽: ['小凶', '火炎上、泽润下，彼此乖离，立场各异难成大事。', '小事可为，大事宜缓；求同存异，从共同点切入。'],
    离为火: ['吉', '光明相继，日月丽乎天，依附正道则前程明亮。', '保持热忱与清醒，有所持守，忌三分钟热度。'],
    火雷噬嗑: ['中吉', '口中有物咬合方通，如刑罚断狱，排除障碍而后亨。', '明辨是非、果断处理拖延之事，软硬兼施。'],
    火风鼎: ['吉', '木上燃火烹饪调鼎，革故鼎新、正位凝命，人才得用。', '稳重图新，选贤与能，以新形象开新局面。'],
    火水未济: ['中平', '火在水上不能烹物，事尚未成，正处在最后攻坚前。', '谨慎辨别事物所处位置，慎终如始，则无败事。'],
    火山旅: ['中平', '山上有火势不久留，旅人在外，匆匆过客之象。', '谦柔谨言、看管好财物，小亨，不宜大动作。'],
    火地晋: ['吉', '明出地上如旭日东升，自昭明德，上进封赏之象。', '积极表现、柔进而行，争取伯乐赏识，前途光明。'],
    雷天大壮: ['吉', '雷在天上声势盛大，大者壮也，然非礼弗履。', '顺势可成，但绝不可恃强蛮干，守礼守正方利。'],
    雷泽归妹: ['小凶', '泽上有雷少女情动，位不当而急有所归，易生波折。', '婚恋大事勿急躁将就，守本分、知进退则无咎。'],
    雷火丰: ['吉', '雷电皆至声势盛大，如日中天，然日中则昃。', '趁资源充足把事做成，同时预留退路，防盛极而衰。'],
    震为雷: ['中平', '雷声连连惊百里，君子闻雷而恐惧修省。', '遇变不惊、临危不乱，借震动反省整顿自身。'],
    雷风恒: ['吉', '雷风相与刚柔皆应，长久之道，立不易方。', '感情事业贵在持之以恒，守常道而能久成。'],
    雷水解: ['吉', '雷雨交作郁结消解，险难已过，赦过宥罪之时。', '宜尽快解开旧结、宽恕他人，行动向顺利的方向。'],
    雷山小过: ['小凶', '山上有雷其声稍过，可小事不可大事，飞鸟遗音。', '谦卑收敛、低头做事，不宜高攀与冒进。'],
    雷地豫: ['吉', '雷出于地万物奋起，顺以动则豫乐，事先预备则无患。', '顺势而为、保持愉悦，但勿沉溺逸乐误了正事。'],
    风天小畜: ['小吉', '风行天上密云不雨，力量尚在积蓄，雨暂未成。', '耐心积累、以诚牵系，时机一到自然亨达。'],
    风泽中孚: ['吉', '泽上有风感而遂通，诚信发自中节，能化万物。', '以诚信待人立世，言出必行，则可涉大川。'],
    风火家人: ['吉', '风自火出由内及外，家道正而天下定，各正其位。', '先经营好家庭与亲密关系，宽严相济、有话好好说。'],
    风雷益: ['大吉', '风雷交相助势，损上益下而民悦无疆，施受皆利。', '多给予、多助人，见善则迁、有过则改，福气自来。'],
    巽为风: ['中吉', '随风潜入无孔不入，谦逊申命，以柔渗透而成事。', '放低姿态、反复沟通推进，优柔寡断则失机。'],
    风水涣: ['中平', '风行水上涟漪涣散，人心离散之时当思聚拢。', '用诚意和仪式感凝聚关系，利于越险成事。'],
    风山渐: ['吉', '山上有木逐日而长，循序渐进，鸿雁于飞有其序。', '不急不躁按步骤来，婚嫁求职以正为利，水到渠成。'],
    风地观: ['中平', '风行地上万物皆在观仰，省方观民设教之象。', '宜多看少动、静观其变，先观察清楚再出手。'],
    水天需: ['中吉', '云上于天待雨而降，需等时机，君子以饮食宴乐。', '沉住气耐心等待，不可冒进；准备充足，利涉大川。'],
    水泽节: ['中吉', '泽上有水须有节度，制度分明则不伤财、不害民。', '开支与精力都要节制有度，但过苦的坚持难长久。'],
    水火既济: ['吉', '水在火上烹饪已成，事功初就，然既济当思未济。', '守成阶段更要防患未然，勿因顺利而松懈。'],
    水雷屯: ['小凶', '云雷郁结于天地，万事开头难，草木穿土之艰。', '艰难中守正、广结助力，打好根基，勿轻举妄动。'],
    水风井: ['中平', '木上有水养人不穷，井之道在恒常修治、往来井井。', '守住根本与长期价值，持续维护，勿半途而废。'],
    坎为水: ['凶', '水流再至重险叠陷，然水流必有心亨，行有尚。', '处险不慌、诚信专注，从小处一步步走出困局。'],
    水山蹇: ['凶', '山上有水前行艰难，蹇利西南不利东北，反身修德。', '见险而止、不强求，向贵人求助、向内修德则解。'],
    水地比: ['大吉', '地上有水亲密无间，先王以建万国、亲诸侯。', '主动亲近值得信任的人，择善而附，以诚开头则吉。'],
    山天大畜: ['吉', '天藏山中所畜者大，刚健笃实、辉光日新。', '厚积而薄发，蓄德养才，此时所学来日大用。'],
    山泽损: ['中平', '山下有泽损下益上，惩忿窒欲，损中有益。', '适当舍弃与让步不是坏事，先舍而后得。'],
    山火贲: ['小吉', '山下有火文理照映，修饰文饰之象，白贲无咎。', '注重形象与仪式感可以，但质朴本色才长久。'],
    山雷颐: ['中平', '山下有雷上止下动，颐养口腹与德性，慎言节食。', '好好吃饭好好休息，自食其力，正则吉。'],
    山风蛊: ['中平', '山下有风物久生弊，蛊则当治，干父之蛊有步骤。', '正视遗留问题，先甲三日做好谋划再整顿革新。'],
    山水蒙: ['中平', '山下出泉涓涓始流，蒙昧初开，匪我求童蒙。', '保持虚心、主动求教，给成长一点时间，勿急功。'],
    艮为山: ['中平', '两山相叠止于所止，君子以思不出其位。', '该停就停、知止而安，管好自己的心与边界。'],
    山地剥: ['凶', '山附于地五阴剥阳，群阴盛长，情势不利。', '宜守不宜进，宽厚待下、稳固根本以自保。'],
    地天泰: ['大吉', '天地交而万物通，上下交而其志同，小往大来。', '人和事顺、沟通无碍，但居安思危，无平不陂。'],
    地泽临: ['吉', '泽上有地居高临下，以上抚下、教思无穷、保民无疆。', '以宽厚包容待人，趁兴盛之势推进，八月后须谨慎。'],
    地火明夷: ['凶', '明入地中光明受伤，文王拘而演周易，用晦而明。', '韬光养晦、外圆内方，艰难中守住内心的光。'],
    地雷复: ['吉', '雷在地中一阳来复，七日来复，否极将转泰。', '静养待时、及时回头改错，不远复则无大悔。'],
    地风升: ['吉', '地中生木顺时而长，积小以高大，柔以时升。', '一步一个脚印，南征吉，主动去见贵人则上升。'],
    地水师: ['中平', '地中蓄水产众，聚众成师，能以众正则可以王。', '团队行动要有纪律与名分，任用老成可靠的人带队。'],
    地山谦: ['大吉', '地中有山高能藏低，裒多益寡、称物平施。', '满招损谦受益，越有实力越谦和，则凡事皆利。'],
    坤为地: ['大吉', '地势坤君子以厚德载物，至柔而动也刚。', '以包容与耐心承载一切，先迷后得，顺势跟随吉人。']
  };
  const TAROT = [
    ['愚者', '新的开始 · 冒险 · 自由', '带着赤子之心踏上全新旅程，自由无惧、相信生命会托住你；逆位时可能鲁莽冒进或在逃避责任。'],
    ['魔术师', '创造力 · 行动 · 显化', '风火水土四元素齐备，你拥有成事所需的一切资源，专注意念即可显化愿望；逆位时才能未发挥，或有欺瞒不专。'],
    ['女祭司', '直觉 · 智慧 · 静默', '月亮之下的智者，答案藏在静默与潜意识里，相信你的直觉；逆位时忽视内心声音，或故弄玄虚、封闭感受。'],
    ['皇后', '丰饶 · 爱 · 感官之美', '大地之母般的丰盛与滋养，孕育、爱人与被爱，享受生活之美；逆位时过度付出、依赖或忽略自己。'],
    ['皇帝', '权威 · 秩序 · 责任', '建立稳固的规则与边界，以责任和领导力掌控局面；逆位时专制僵化，或缺乏安全感而控制他人。'],
    ['教皇', '传统 · 指引 · 归属', '师长与传统给予指引，在体系与信仰中找到归属；逆位时墨守成规，或该走出一条属于自己的路。'],
    ['恋人', '选择 · 契合 · 结合', '面临心之所向的重要抉择，灵魂契合的关系值得投入；逆位时关系失衡、价值观分歧或选错方向。'],
    ['战车', '意志 · 胜利 · 驾驭', '用意志力统合相反的力量向前冲锋，胜利在握；逆位时情绪失控、方向涣散或被外力牵着走。'],
    ['力量', '勇气 · 耐心 · 柔韧', '以温柔和耐心驯服野性，真正的力量来自柔软的心；逆位时自我怀疑、情绪压抑或被恐惧支配。'],
    ['隐士', '内省 · 独处 · 寻道', '暂时独处，提灯向内寻找属于自己的真理；逆位时孤立自己、拒绝帮助，或借忙碌逃避内心。'],
    ['命运之轮', '转机 · 周期 · 命运', '命运的轮子不停转动，转机就在眼前，顺势者昌；逆位时抗拒变化、卡在低潮期不愿松手。'],
    ['正义', '公正 · 因果 · 权衡', '一分耕耘一分收获，真相与公平会给出答案；逆位时失衡、逃避责任，或对自己/他人不够诚实。'],
    ['倒吊人', '换位 · 等待 · 顿悟', '换个倒挂的角度看世界，暂时的停顿与牺牲会带来顿悟；逆位时做无谓牺牲、钻牛角尖或白等一场。'],
    ['死神', '结束 · 重生 · 放下', '一个周期彻底结束，唯有放下旧物才能迎来新生；逆位时害怕改变、紧抓不放，拖着旧账不肯翻篇。'],
    ['节制', '调和 · 平衡 · 疗愈', '在两极之间耐心调和，适度与流动带来疗愈与融合；逆位时走极端、失衡急躁，或长期消耗不自知。'],
    ['恶魔', '欲望 · 束缚 · 执念', '被欲望、执念或不健康的关系锁住，但锁链其实松松地挂着；逆位时正在挣脱束缚、开始觉醒。'],
    ['高塔', '剧变 · 崩塌 · 觉醒', '闪电击垮虚假的高塔，突如其来的阵痛之后是真实的觉醒；逆位时恐惧改变，拖延着迟早要来的崩塌。'],
    ['星星', '希望 · 疗愈 · 许愿', '风暴过后夜空清澈，星光重燃希望，许下愿望并相信它；逆位时短暂失望、信心受挫，别忘了星光还在。'],
    ['月亮', '迷惘 · 潜意识 · 幻象', '月下迷雾真假难辨，恐惧被放大，唯有直觉能引路；逆位时迷雾渐散、秘密揭开，正走出困惑。'],
    ['太阳', '喜悦 · 成功 · 光明', '阳光普照，成功、活力与纯粹的喜悦如约而至；逆位时短暂阴霾、快乐被现实打折，但光仍在云后。'],
    ['审判', '觉醒 · 复盘 · 重生', '号角响起，复盘过往、听从内心召唤，你将获得重生；逆位时过度自我苛责，或假装听不见内心的声音。'],
    ['世界', '圆满 · 整合 · 完成', '旅程走到圆满的终点，所有经历被整合为智慧；逆位时差最后一步的收尾，或迟迟不肯画上句号。']
  ];
  const LENORMAND = [
    ['骑士', '消息正在路上'], ['三叶草', '小小的幸运'], ['船', '一段旅程开启'], ['房子', '家的温暖'],
    ['树', '健康与成长'], ['云', '暂时的困惑'], ['蛇', '绕开复杂的人事'], ['棺材', '该翻篇了'],
    ['花束', '一份心意与礼物'], ['镰刀', '果断做个了断'], ['鞭子', '少些争执多些包容'], ['鸟', '多聊聊心里话'],
    ['孩子', '保持好奇与初心'], ['狐狸', '留个心眼没错'], ['熊', '有可靠的力量守护你'], ['星星', '愿望会实现'],
    ['鹳', '变化带来好消息'], ['狗', '真挚的友谊'], ['塔', '享受独处的时光'], ['花园', '去社交去热闹'],
    ['山', '障碍只是暂时的'], ['岔路', '你有选择的权利'], ['老鼠', '防止小损耗'], ['心', '爱意在靠近'],
    ['戒指', '一份承诺'], ['书', '学习新知识'], ['信', '有消息或文书到来'], ['男人', '一位重要的他'],
    ['女人', '一位重要的她'], ['百合', '平静与安宁'], ['太阳', '大成功'], ['月亮', '被看见被认可'],
    ['钥匙', '答案即将揭晓'], ['鱼', '财源滚滚'], ['锚', '安定下来'], ['十字', '考验之后是成长']
  ];
  const LUCKY_STICKS = [
    ['大吉', '春风得意马蹄疾，一日看尽长安花', '今天做什么都顺，大胆去行动吧'],
    ['大吉', '久旱逢甘霖，他乡遇故知', '盼望已久的事会有好消息'],
    ['吉', '柳暗花明又一村', '看似有阻碍，转个弯就是路'],
    ['吉', '潮平两岸阔，风正一帆悬', '顺风顺水，适合推进计划'],
    ['吉', '采得百花成蜜后，甜从苦中来', '之前的付出今天会有回报'],
    ['中吉', '行到水穷处，坐看云起时', '不急不躁，静静等待转机'],
    ['中吉', '小荷才露尖尖角', '好的苗头刚出现，用心呵护'],
    ['中吉', '晴日看花开，闲时品茶香', '平稳舒适的一天，宜放松'],
    ['小吉', '微雨燕双飞，浅喜入心怀', '有小惊喜小确幸，注意捕捉'],
    ['小吉', '路漫漫其修远，行则将至', '慢慢来比较快'],
    ['末吉', '风物长宜放眼量', '眼前小事勿计较，眼光放长远'],
    ['凶转吉', '山重水复疑无路', '遇到坎别慌，柳暗花明就在下一步']
  ];

  function hexName(upper, lower) { return HEX_TABLE[upper][['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'].indexOf(lower)]; }
  function renderLines(bits, moving) { // 返回卦爻的HTML
    return [5, 4, 3, 2, 1, 0].map(i => {
      const yang = bits[i] === '1';
      const isMoving = moving === i + 1;
      return `<div class="f2-yao ${yang ? 'yang' : 'yin'} ${isMoving ? 'moving' : ''}" title="第${i + 1}爻${isMoving ? '（动爻）' : ''}">${isMoving ? '<i class="fas fa-circle f2-yao-dot"></i>' : ''}</div>`;
    }).join('');
  }
  function flipLinesFromCoins() { // 六爻：自下而上每爻三枚铜钱
    const bitsArr = [], movingArr = [];
    for (let i = 0; i < 6; i++) {
      const coins = [0, 0, 0].map(() => Math.random() < 0.5 ? 2 : 3);
      const sum = coins[0] + coins[1] + coins[2];
      // 6=老阴(动) 7=少阳 8=少阴 9=老阳(动)
      if (sum === 7) { bitsArr.push('1'); movingArr.push(0); }
      else if (sum === 8) { bitsArr.push('0'); movingArr.push(0); }
      else if (sum === 9) { bitsArr.push('1'); movingArr.push(i + 1); }
      else { bitsArr.push('0'); movingArr.push(i + 1); }
    }
    return { bits: bitsArr.join(''), moving: movingArr.find(Boolean) || 0 };
  }

  /* ---- 占卜类型与排阵 ---- */
  const FORTUNE_KINDS = [
    { key: 'tarot', emoji: '🃏', icon: 'fa-wand-magic-sparkles', name: '塔罗牌', desc: '大阿卡纳 · 多排阵 · 自定义牌组' },
    { key: 'lenormand', emoji: '🎴', icon: 'fa-clone', name: '雷诺牌', desc: '36张小牌 · 直白实用 · 自定义' },
    { key: 'lucky', emoji: '🎋', icon: 'fa-scroll', name: '今日抽签', desc: '摇一支签，看今日吉凶' },
    { key: 'iching', emoji: '☯️', icon: 'fa-yin-yang', name: '周易64卦', desc: '随机成卦 · 卦辞详解' },
    { key: 'liuyao', emoji: '🪙', icon: 'fa-coins', name: '六爻', desc: '铜钱起卦 · 动爻变卦' },
    { key: 'meihua', emoji: '🌸', icon: 'fa-seedling', name: '梅花易数', desc: '以当下时间起卦' }
  ];
  const FORTUNE_SPREADS = {
    tarot: [
      { key: 'one', name: '单张指引', positions: ['今日指引'] },
      { key: 'three', name: '三张牌阵', positions: ['过去', '现在', '未来'] },
      { key: 'five', name: '五张牌阵', positions: ['现状', '阻碍', '建议', '环境', '结果'] }
    ],
    lenormand: [
      { key: 'one', name: '单张提示', positions: ['核心提示'] },
      { key: 'three', name: '三牌牌阵', positions: ['过去', '现在', '未来'] },
      { key: 'five', name: '五张牌阵', positions: ['主题', '挑战', '建议', '近期发展', '最终结果'] }
    ]
  };
  const KIND_META = Object.fromEntries(FORTUNE_KINDS.map(k => [k.key, k]));

  const cardImg = (kind, name) =>
    `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent((kind === 'tarot' ? '唯美神秘塔罗牌面插画，金色复古花纹边框，主题：' : '复古雷诺曼占卜卡牌插画，花纹边框，主题：') + name)}&image_size=square`;

  function getDecks() {
    const d = ensureData();
    if (!d.decks || !d.decks.tarot || !d.decks.lenormand) {
      d.decks = {
        tarot: TAROT.map(([name, kw, meaning]) => ({ id: Core.uid(), name, kw, meaning, img: cardImg('tarot', name) })),
        lenormand: LENORMAND.map(([name, kw]) => ({ id: Core.uid(), name, kw, meaning: kw, img: cardImg('lenormand', name) }))
      };
      Core.State.save();
    }
    return d.decks;
  }

  function fortuneSummary(rec) {
    if (rec.cards) return rec.cards.map(c => `${c.pos}·${c.name}${c.reversed ? '(逆)' : ''}`).join(' / ');
    if (rec.level) return `${rec.level} ${rec.poem}`;
    if (rec.name) return `${rec.name} · ${(HEX_DETAIL[rec.name] || [''])[0]}`;
    return '';
  }

  /* 入口：选择占卜方式 */
  function openFortune() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🔮 运势占卜',
      body: `
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn-ghost" id="ft-records" style="flex:1"><i class="fas fa-book-bookmark"></i> 占卜记录 (${d.fortune.length})</button>
          <button class="btn-ghost" id="ft-decks" style="flex:1"><i class="fas fa-layer-group"></i> 自定义牌组</button>
        </div>
        <label class="f2-label">先选择一种占卜方式，静心默念你想问的事</label>
        <div class="f2-kind-grid">
          ${FORTUNE_KINDS.map(k => `
            <button class="f2-kind" data-kind="${k.key}">
              <span class="f2-kind-emoji">${k.emoji}</span>
              <b>${k.name}</b>
              <span class="f2-kind-desc">${k.desc}</span>
            </button>`).join('')}
        </div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#ft-records').addEventListener('click', () => { close(); openFortuneHistory(); });
    overlay.querySelector('#ft-decks').addEventListener('click', () => { close(); openDeckManager(); });
    overlay.querySelectorAll('.f2-kind').forEach(b => b.addEventListener('click', () => {
      close();
      const kind = b.dataset.kind;
      if (FORTUNE_SPREADS[kind]) chooseSpread(kind);
      else askQuestion(kind, null);
    }));
  }

  /* 选择排阵（塔罗 / 雷诺） */
  function chooseSpread(kind) {
    const meta = KIND_META[kind];
    const { overlay, close } = UI.modal({
      title: `${meta.emoji} ${meta.name} · 选择排阵`,
      body: `
        <div class="f2-kind-grid">
          ${FORTUNE_SPREADS[kind].map(sp => `
            <button class="f2-kind" data-spread="${sp.key}">
              <span class="f2-kind-emoji">${sp.positions.length === 1 ? '🃠' : sp.positions.length === 3 ? '🃛' : '🂿'}</span>
              <b>${sp.name}</b>
              <span class="f2-kind-desc">${sp.positions.join(' · ')}</span>
            </button>`).join('')}
        </div>`,
      footer: `<button class="btn-ghost" data-back>返回</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-back]').addEventListener('click', () => { close(); openFortune(); });
    overlay.querySelectorAll('[data-spread]').forEach(b => b.addEventListener('click', () => {
      const sp = FORTUNE_SPREADS[kind].find(x => x.key === b.dataset.spread);
      close();
      askQuestion(kind, sp);
    }));
  }

  /* 写下你的问题 */
  function askQuestion(kind, spread) {
    const meta = KIND_META[kind];
    const { overlay, close } = UI.modal({
      title: `${meta.emoji} ${meta.name}${spread ? ' · ' + spread.name : ''}`,
      body: `
        <label class="f2-label">把你的问题写下来（越具体越准）</label>
        <textarea id="ft-q" class="f2-textarea" rows="3" placeholder="例如：我们这段关系接下来会怎样？"></textarea>
        <p style="font-size:12px;color:var(--c-text-faint);margin-top:8px">写下问题后点击开始，按牌阵位置逐张抽牌。</p>`,
      footer: `<button class="btn-ghost" data-back>返回</button><button class="btn-primary" id="ft-go"><i class="fas fa-wand-magic-sparkles"></i> 开始占卜</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-back]').addEventListener('click', () => { close(); spread ? chooseSpread(kind) : openFortune(); });
    setTimeout(() => overlay.querySelector('#ft-q').focus(), 100);
    overlay.querySelector('#ft-go').addEventListener('click', () => {
      const q = overlay.querySelector('#ft-q').value.trim() || '今日运势如何？';
      close();
      if (spread) cardStage(kind, spread, q);
      else castStage(kind, q);
    });
  }

  /* 抽牌阶段 */
  function cardStage(kind, spread, question) {
    const meta = KIND_META[kind];
    const deck = getDecks()[kind] || [];
    if (!deck.length) { Core.Toast.show('牌组为空，请先在「自定义牌组」里添加卡牌', 'error'); openDeckManager(kind); return; }

    const drawn = spread.positions.map(() => null);
    const { overlay, close } = UI.modal({
      title: `${meta.emoji} ${meta.name} · ${spread.name}`,
      body: `
        <div class="ft-question"><i class="fas fa-feather"></i> ${esc(question)}</div>
        <p style="font-size:13px;color:var(--c-text-soft);margin:10px 0;text-align:center">点击牌背逐张翻开，或一键抽牌</p>
        <div class="draw-stage" id="draw-stage">
          ${spread.positions.map((p, i) => `
            <div class="draw-slot" data-i="${i}">
              <div class="draw-label">${p}</div>
              <button class="draw-card back" data-i="${i}"><i class="fas fa-hand-pointer"></i><span>抽这张</span></button>
            </div>`).join('')}
        </div>
        <div id="draw-reading"></div>`,
      footer: `
        <button class="btn-ghost" data-close>关闭</button>
        <button class="btn-ghost" id="draw-auto"><i class="fas fa-shuffle"></i> 一键抽牌</button>
        <button class="btn-primary" id="draw-save" disabled><i class="fas fa-bookmark"></i> 保存记录</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    const usedIdx = new Set();
    function drawOne(i) {
      if (drawn[i]) return;
      let idx;
      do { idx = Math.floor(Math.random() * deck.length); } while (usedIdx.has(idx) && usedIdx.size < deck.length);
      usedIdx.add(idx);
      const c = deck[idx];
      drawn[i] = { pos: spread.positions[i], name: c.name, kw: c.kw, meaning: c.meaning, img: c.img, reversed: kind === 'tarot' && Math.random() < 0.5 };
      const slot = overlay.querySelector(`.draw-slot[data-i="${i}"] .draw-card`);
      slot.classList.remove('back');
      slot.classList.add('revealed');
      slot.innerHTML = `<img src="${esc(c.img)}" alt=""><b>${esc(c.name)}</b><span>${drawn[i].reversed ? '逆位' : '正位'}</span>`;
      checkDone();
    }
    function checkDone() {
      if (!drawn.every(Boolean)) return;
      overlay.querySelector('#draw-save').disabled = false;
      overlay.querySelector('#draw-reading').innerHTML = `
        <div class="f2-divider"></div>
        <label class="f2-label">🔍 牌面解读</label>
        <div class="draw-reading-list">
          ${drawn.map(c => `
            <div class="draw-reading-item">
              <img src="${esc(c.img)}" alt="">
              <div>
                <div class="draw-r-title">${esc(c.pos)}：<b>${esc(c.name)}</b> <span class="f2-tarot-pos" style="background:${c.reversed ? 'rgba(232,155,155,.3)' : 'rgba(107,130,168,.2)'};color:${c.reversed ? '#c25e5e' : 'var(--c-accent-deep)'}">${c.reversed ? '逆位' : '正位'}</span></div>
                <div class="draw-r-kw">${esc(c.kw)}</div>
                <div class="draw-r-meaning">${esc(c.meaning)}${c.reversed ? '　逆位提醒：能量受阻或向内表达，宜放慢节奏、反观自身，换个角度应对。' : ''}</div>
              </div>
            </div>`).join('')}
        </div>`;
    }
    overlay.querySelectorAll('.draw-card').forEach(card => card.addEventListener('click', () => drawOne(Number(card.dataset.i))));
    overlay.querySelector('#draw-auto').addEventListener('click', () => {
      spread.positions.forEach((_, i) => { if (!drawn[i]) setTimeout(() => drawOne(i), i * 350); });
    });
    overlay.querySelector('#draw-save').addEventListener('click', () => {
      const rec = { id: Core.uid(), time: Core.now(), kind, kindName: meta.name, spreadName: spread.name, question, cards: drawn };
      ensureData().fortune.unshift(rec);
      Core.State.save();
      Core.Toast.show('占卜结果已保存到记录 📖', 'success');
      shareAndClose(rec);
    });

    function shareAndClose(rec) {
      const m = UI.modal({
        title: '记录已保存',
        body: `<p style="text-align:center;color:var(--c-text-soft);padding:10px">要把这次占卜结果分享到当前聊天吗？</p>`,
        footer: `<button class="btn-ghost" id="rc-no">不用了</button><button class="btn-primary" id="rc-yes"><i class="fas fa-paper-plane"></i> 分享结果</button>`,
        size: 'modal-lg'
      });
      m.overlay.querySelector('#rc-no').addEventListener('click', () => { m.close(); close(); });
      m.overlay.querySelector('#rc-yes').addEventListener('click', () => {
        const lines = [`问题：${rec.question}`, ...rec.cards.map(c => `${c.pos}：${c.name}（${c.reversed ? '逆位' : '正位'}）`)];
        if (sendCard(meta.icon, `${meta.emoji} ${meta.name}·${rec.spreadName}`, lines)) { m.close(); close(); }
      });
    }
  }

  /* 抽签 / 起卦阶段 */
  function castStage(kind, question) {
    const meta = KIND_META[kind];
    const castBtnText = { lucky: '🎋 摇签', iching: '☯️ 起一卦', liuyao: '🪙 掷铜钱起卦', meihua: '🌸 时间起卦' }[kind];
    const { overlay, close } = UI.modal({
      title: `${meta.emoji} ${meta.name}`,
      body: `
        <div class="ft-question"><i class="fas fa-feather"></i> ${esc(question)}</div>
        <div class="f2-div-center" style="margin-top:14px">
          <div class="cast-shake" id="cast-shake">${meta.emoji}</div>
          <div class="f2-result" id="cast-result">${kind === 'lucky' ? '诚心默念问题，然后摇签' : '静心凝神，点击下方按钮起卦'}</div>
          <div id="cast-extra"></div>
        </div>`,
      footer: `
        <button class="btn-ghost" data-close>关闭</button>
        <button class="btn-primary" id="cast-go"><i class="fas fa-wand-magic-sparkles"></i> ${castBtnText}</button>
        <button class="btn-ghost" id="cast-save" disabled><i class="fas fa-bookmark"></i> 保存记录</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    let rec = null;

    overlay.querySelector('#cast-go').addEventListener('click', () => {
      overlay.querySelector('#cast-shake').classList.add('shaking');
      setTimeout(() => overlay.querySelector('#cast-shake').classList.remove('shaking'), 600);

      if (kind === 'lucky') {
        const [level, poem, explain] = pick(LUCKY_STICKS);
        rec = { id: Core.uid(), time: Core.now(), kind, kindName: meta.name, question, level, poem, explain };
        overlay.querySelector('#cast-result').innerHTML =
          `<span class="f2-luck-level lv-${level.replace('转吉', 'j')}">${level}</span>
           <div class="f2-poem">「${esc(poem)}」</div>
           <div>${esc(explain)}</div>`;
      } else {
        let bits, moving = 0, timeInfo = '';
        if (kind === 'iching') {
          const ups = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
          const up = pick(ups), low = pick(ups);
          bits = TRIGRAM_BITS[ups.indexOf(low) + 1] + TRIGRAM_BITS[ups.indexOf(up) + 1];
        } else if (kind === 'liuyao') {
          ({ bits, moving } = flipLinesFromCoins());
        } else {
          const t = new Date();
          const year = (t.getFullYear() % 12) || 12;
          const month = t.getMonth() + 1, day = t.getDate();
          const hour = Math.floor(t.getHours() / 2) + 1;
          const sum = year + month + day;
          const upN = sum % 8 || 8, lowN = (sum + hour) % 8 || 8;
          moving = (sum + hour) % 6 || 6;
          bits = TRIGRAM_BITS[lowN] + TRIGRAM_BITS[upN];
          timeInfo = `${t.getFullYear()}年${month}月${day}日 ${String(t.getHours()).padStart(2, '0')}时起卦`;
        }
        const low = TRIGRAM_NAMES[bits.slice(0, 3)], up = TRIGRAM_NAMES[bits.slice(3)];
        const name = hexName(up, low);
        let changeName = '';
        if (moving) {
          const flipped = bits.split('').map((b, i) => (i + 1 === moving ? (b === '1' ? '0' : '1') : b)).join('');
          changeName = hexName(TRIGRAM_NAMES[flipped.slice(3)], TRIGRAM_NAMES[flipped.slice(0, 3)]);
        }
        const [grade, meaning, advice] = HEX_DETAIL[name];
        rec = { id: Core.uid(), time: Core.now(), kind, kindName: meta.name, question, name, bits, moving, changeName, timeInfo };
        overlay.querySelector('#cast-result').innerHTML =
          `<b style="font-size:18px">${name}</b>
           <div style="font-size:12px;color:var(--c-text-faint);margin:2px 0">${TRIGRAM_SYMS[up]}上 ${TRIGRAM_SYMS[low]}下${moving ? ` · 第${moving}爻动` : ''}${changeName ? ` · 变卦 ${changeName}` : ''}</div>
           <div class="hex-grade">${grade}</div>
           <div class="hex-meaning">${esc(meaning)}</div>
           <div class="hex-advice">📜 ${esc(advice)}</div>${timeInfo ? `<div class="hex-time">${esc(timeInfo)}</div>` : ''}`;
        overlay.querySelector('#cast-extra').innerHTML = `<div class="f2-hex" style="margin-top:12px">${renderLines(bits, moving)}</div>`;
      }
      overlay.querySelector('#cast-save').disabled = false;
    });

    overlay.querySelector('#cast-save').addEventListener('click', () => {
      if (!rec) return;
      ensureData().fortune.unshift(rec);
      Core.State.save();
      Core.Toast.show('占卜结果已保存到记录 📖', 'success');
      const m = UI.modal({
        title: '记录已保存',
        body: `<p style="text-align:center;color:var(--c-text-soft);padding:10px">要把这次结果分享到当前聊天吗？</p>`,
        footer: `<button class="btn-ghost" id="rc-no">不用了</button><button class="btn-primary" id="rc-yes"><i class="fas fa-paper-plane"></i> 分享结果</button>`,
        size: 'modal-lg'
      });
      m.overlay.querySelector('#rc-no').addEventListener('click', () => { m.close(); close(); });
      m.overlay.querySelector('#rc-yes').addEventListener('click', () => {
        let lines;
        if (rec.level) lines = [`问题：${rec.question}`, `运势：${rec.level}`, `「${rec.poem}」`, rec.explain];
        else lines = [`问题：${rec.question}`, `卦象：${rec.name}${rec.moving ? `（第${rec.moving}爻动）` : ''}${rec.changeName ? `，变卦 ${rec.changeName}` : ''}`, (HEX_DETAIL[rec.name] || [])[1] || '', (HEX_DETAIL[rec.name] || [])[2] || ''];
        if (sendCard(meta.icon, `${meta.emoji} ${meta.name}`, lines.filter(Boolean))) { m.close(); close(); }
      });
    });
  }

  /* 占卜记录 */
  function openFortuneHistory() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '📖 占卜记录',
      body: d.fortune.length ? `
        <div class="f2-chip-row" style="margin-bottom:10px">
          <button class="f2-chip selectable selected" data-fk="all">全部</button>
          ${FORTUNE_KINDS.map(k => `<button class="f2-chip selectable" data-fk="${k.key}">${k.name}</button>`).join('')}
        </div>
        <div class="f2-list" id="ft-history-list"></div>`
        : '<p style="text-align:center;color:var(--c-text-faint);padding:30px 0">还没有占卜记录，去占一卦吧～</p>',
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function renderList(filter) {
      const box = overlay.querySelector('#ft-history-list');
      if (!box) return;
      const items = d.fortune.filter(r => !filter || filter === 'all' || r.kind === filter).slice(0, 50);
      box.innerHTML = items.length ? items.map(r => `
        <div class="f2-item" data-id="${r.id}">
          <span class="f2-item-mood">${KIND_META[r.kind]?.emoji || '🔮'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(r.kindName)}${r.spreadName ? ' · ' + esc(r.spreadName) : ''}　${esc(fortuneSummary(r)).slice(0, 40)}</div>
            <div class="f2-item-sub">${fmtDate(r.time)} ${fmtHM(r.time)} · ${esc(r.question).slice(0, 24)}</div>
          </div>
          <button class="icon-btn f2-del" data-del="${r.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="text-align:center;color:var(--c-text-faint)">该分类暂无记录</p>';
      box.querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => showRecordDetail(el.dataset.id)));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        d.fortune = d.fortune.filter(r => r.id !== b.dataset.del);
        Core.State.save();
        renderList(filter);
      }));
    }
    overlay.querySelectorAll('[data-fk]').forEach(b => b.addEventListener('click', () => {
      overlay.querySelectorAll('[data-fk]').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      renderList(b.dataset.fk);
    }));
    renderList('all');
  }

  /* 记录详情 */
  function showRecordDetail(rid) {
    const d = ensureData();
    const r = d.fortune.find(x => x.id === rid);
    if (!r) return;
    const meta = KIND_META[r.kind];
    let body = `<div class="ft-question"><i class="fas fa-feather"></i> ${esc(r.question)}</div>
      <div class="f2-item-sub" style="margin:6px 0 10px">${fmtDate(r.time)} ${fmtHM(r.time)} · ${esc(r.kindName)}${r.spreadName ? ' · ' + esc(r.spreadName) : ''}</div>`;
    if (r.cards) {
      body += `<div class="draw-reading-list">
        ${r.cards.map(c => `
          <div class="draw-reading-item">
            <img src="${esc(c.img)}" alt="">
            <div>
              <div class="draw-r-title">${esc(c.pos)}：<b>${esc(c.name)}</b> <span class="f2-tarot-pos" style="background:${c.reversed ? 'rgba(232,155,155,.3)' : 'rgba(107,130,168,.2)'};color:${c.reversed ? '#c25e5e' : 'var(--c-accent-deep)'}">${c.reversed ? '逆位' : '正位'}</span></div>
              <div class="draw-r-kw">${esc(c.kw)}</div>
              <div class="draw-r-meaning">${esc(c.meaning)}</div>
            </div>
          </div>`).join('')}
      </div>`;
    } else if (r.level) {
      body += `<div class="f2-div-center">
        <span class="f2-luck-level lv-${r.level.replace('转吉', 'j')}">${esc(r.level)}</span>
        <div class="f2-poem">「${esc(r.poem)}」</div>
        <div class="f2-result">${esc(r.explain)}</div>
      </div>`;
    } else {
      const [grade, meaning, advice] = HEX_DETAIL[r.name] || ['', '', ''];
      body += `<div class="f2-div-center">
        <b style="font-size:18px">${esc(r.name)}</b>
        <div class="f2-hex" style="margin:10px 0">${renderLines(r.bits, r.moving)}</div>
        <div class="hex-grade">${esc(grade)}</div>
        <div class="hex-meaning">${esc(meaning)}</div>
        <div class="hex-advice">📜 ${esc(advice)}</div>
        ${r.changeName ? `<div style="font-size:12px;color:var(--c-text-faint);margin-top:6px">动爻第${r.moving}爻 · 变卦 ${esc(r.changeName)}</div>` : ''}
        ${r.timeInfo ? `<div class="hex-time">${esc(r.timeInfo)}</div>` : ''}
      </div>`;
    }
    const m = UI.modal({
      title: `${meta?.emoji || '🔮'} 占卜详情`,
      body,
      footer: `<button class="btn-ghost" data-close>关闭</button><button class="btn-primary" id="rd-share"><i class="fas fa-paper-plane"></i> 分享到聊天</button>`,
      size: 'modal-lg'
    });
    m.overlay.querySelector('[data-close]').addEventListener('click', m.close);
    m.overlay.querySelector('#rd-share').addEventListener('click', () => {
      let lines;
      if (r.cards) lines = [`问题：${r.question}`, ...r.cards.map(c => `${c.pos}：${c.name}（${c.reversed ? '逆位' : '正位'}）`)];
      else if (r.level) lines = [`问题：${r.question}`, `运势：${r.level}`, `「${r.poem}」`, r.explain];
      else lines = [`问题：${r.question}`, `卦象：${r.name}${r.moving ? `（第${r.moving}爻动）` : ''}${r.changeName ? '，变卦 ' + r.changeName : ''}`, (HEX_DETAIL[r.name] || [])[1] || ''];
      if (sendCard(meta.icon, `${meta.emoji} ${r.kindName}${r.spreadName ? '·' + r.spreadName : ''}`, lines.filter(Boolean))) m.close();
    });
  }

  /* 自定义牌组管理 */
  function openDeckManager(initialKind = 'tarot') {
    const d = ensureData();
    let kind = initialKind;
    const DECK_TABS = [
      { key: 'tarot', label: '🃏 塔罗牌组' },
      { key: 'lenormand', label: '🎴 雷诺牌组' },
      { key: 'iching', label: '☯️ 周易64卦' },
      { key: 'liuyao', label: '🪙 六爻' },
      { key: 'meihua', label: '🌸 梅花易数' },
      { key: 'lucky', label: '🎋 摇签' }
    ];
    const { overlay, close } = UI.modal({
      title: '🗂️ 自定义牌组',
      body: `
        <div class="f2-tabs" id="deck-tabs">
          ${DECK_TABS.map(t => `<button class="f2-tab ${t.key === kind ? 'active' : ''}" data-deck="${t.key}">${t.label}</button>`).join('')}
        </div>
        <div id="deck-content"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function render() {
      const content = overlay.querySelector('#deck-content');
      if (kind === 'tarot' || kind === 'lenormand') {
        renderCardDeck(content);
      } else {
        renderNotesDeck(content, kind);
      }
    }

    function renderCardDeck(content) {
      const decks = getDecks();
      const list = decks[kind] || [];
      content.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button class="btn-primary" id="deck-add" style="flex:1"><i class="fas fa-plus"></i> 添加卡牌</button>
          <button class="btn-ghost" id="deck-reset"><i class="fas fa-rotate-left"></i> 恢复默认</button>
        </div>
        <div class="deck-grid" id="deck-grid"></div>`;
      const grid = content.querySelector('#deck-grid');
      grid.innerHTML = list.map(c => `
        <div class="deck-card" data-id="${c.id}">
          <img src="${esc(c.img)}" alt="">
          <b>${esc(c.name)}</b>
          <span>${esc(c.kw)}</span>
        </div>`).join('') || '<p style="color:var(--c-text-faint);text-align:center;grid-column:1/-1">牌组是空的，点「添加卡牌」开始创作</p>';
      grid.querySelectorAll('.deck-card').forEach(el => el.addEventListener('click', () => editCard(el.dataset.id)));
      content.querySelector('#deck-reset').addEventListener('click', () => {
        if (!confirm(`确定恢复${kind === 'tarot' ? '塔罗' : '雷诺'}默认牌组？自定义卡牌将被覆盖。`)) return;
        if (kind === 'tarot') d.decks.tarot = TAROT.map(([name, kw, meaning]) => ({ id: Core.uid(), name, kw, meaning, img: cardImg('tarot', name) }));
        else d.decks.lenormand = LENORMAND.map(([name, kw]) => ({ id: Core.uid(), name, kw, meaning: kw, img: cardImg('lenormand', name) }));
        Core.State.save();
        render();
        Core.Toast.show('已恢复默认牌组', 'success');
      });
      content.querySelector('#deck-add').addEventListener('click', () => editCard(null));
    }

    function editCard(cid) {
      const decks = getDecks();
      const card = cid ? decks[kind].find(c => c.id === cid) : { id: Core.uid(), name: '', kw: '', meaning: '', img: cardImg(kind, '自定义卡牌') };
      const em = UI.modal({
        title: cid ? '编辑卡牌' : '添加卡牌',
        body: `
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div style="flex:0 0 110px;text-align:center">
              <img id="deck-edit-img" src="${esc(card.img)}" style="width:110px;height:110px;object-fit:cover;border-radius:12px;border:1px solid rgba(107,130,168,.2)">
              <input type="file" id="deck-img-file" accept="image/*" style="display:none">
              <button class="btn-ghost" id="deck-img-upload" style="width:100%;margin-top:6px;padding:5px;font-size:12px"><i class="fas fa-upload"></i> 上传图片</button>
            </div>
            <div style="flex:1">
              <label class="f2-label">牌名</label>
              <input type="text" id="deck-name" value="${esc(card.name)}" placeholder="例如：星辰">
              <label class="f2-label">关键词</label>
              <input type="text" id="deck-kw" value="${esc(card.kw)}" placeholder="希望 · 灵感 · 远方">
              <label class="f2-label">牌意图片链接（可选）</label>
              <input type="text" id="deck-imgurl" value="${esc(card.img)}">
            </div>
          </div>
          <label class="f2-label">详细牌意</label>
          <textarea id="deck-meaning" class="f2-textarea" rows="4" placeholder="写一写这张牌正位/逆位的含义……">${esc(card.meaning)}</textarea>`,
        footer: `
          ${cid ? '<button class="btn-ghost" id="deck-del" style="margin-right:auto;color:var(--c-red)"><i class="fas fa-trash"></i> 删除</button>' : ''}
          <button class="btn-ghost" data-close>取消</button>
          <button class="btn-primary" id="deck-save">保存</button>`,
        size: 'modal-lg'
      });
      const q = (id) => em.overlay.querySelector(id);
      em.overlay.querySelector('[data-close]').addEventListener('click', em.close);
      q('#deck-img-upload').addEventListener('click', () => q('#deck-img-file').click());
      q('#deck-img-file').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => { card.img = r.result; q('#deck-edit-img').src = r.result; q('#deck-imgurl').value = r.result.slice(0, 60) + '…'; };
        r.readAsDataURL(f);
      });
      q('#deck-imgurl').addEventListener('input', () => { const v = q('#deck-imgurl').value.trim(); if (!v.includes('…')) q('#deck-edit-img').src = v; });
      q('#deck-save').addEventListener('click', () => {
        card.name = q('#deck-name').value.trim();
        card.kw = q('#deck-kw').value.trim();
        card.meaning = q('#deck-meaning').value.trim();
        if (!card.name || !card.kw) { Core.Toast.show('牌名和关键词必填', 'error'); return; }
        const urlv = q('#deck-imgurl').value.trim();
        if (urlv && !urlv.includes('…')) card.img = urlv;
        const arr = getDecks()[kind];
        if (!cid) arr.push(card);
        Core.State.save();
        em.close();
        render();
        Core.Toast.show('卡牌已保存', 'success');
      });
      if (cid) q('#deck-del').addEventListener('click', () => {
        if (!confirm('确定删除这张卡牌？')) return;
        getDecks()[kind] = getDecks()[kind].filter(c => c.id !== cid);
        Core.State.save();
        em.close();
        render();
      });
    }

    function renderNotesDeck(content, kind) {
      if (!d.deckNotes) d.deckNotes = {};
      if (!d.deckNotes[kind]) d.deckNotes[kind] = {};
      const notes = d.deckNotes[kind];
      let entries = [];
      let titleNote = '';
      if (kind === 'iching' || kind === 'liuyao' || kind === 'meihua') {
        entries = Object.entries(HEX_DETAIL).map(([name, [grade, meaning, advice]]) => ({
          name, grade, meaning, advice, note: notes[name] || ''
        }));
        titleNote = '为64卦添加你自己的笔记和感悟';
      } else if (kind === 'lucky') {
        entries = LUCKY_STICKS.map((s, i) => ({
          name: `第${i + 1}签`, grade: s[0], meaning: s[1], advice: s[2], note: notes[`sign${i}`] || ''
        }));
        titleNote = '为每支签添加你自己的解读';
      }
      content.innerHTML = `
        <p style="font-size:12px;color:var(--c-text-faint);margin-bottom:10px">${titleNote}。点击条目编辑笔记。</p>
        <input type="text" id="deck-note-search" placeholder="搜索卦名 / 签号..." style="width:100%;margin-bottom:10px">
        <div class="f2-list" id="deck-notes-list" style="max-height:400px;overflow-y:auto"></div>`;
      const listEl = content.querySelector('#deck-notes-list');
      const searchEl = content.querySelector('#deck-note-search');
      function renderList() {
        const kw = searchEl.value.trim().toLowerCase();
        const filtered = entries.filter(e => !kw || e.name.toLowerCase().includes(kw) || (e.grade || '').toLowerCase().includes(kw));
        listEl.innerHTML = filtered.map((e, i) => `
          <div class="f2-item" data-idx="${entries.indexOf(e)}" style="cursor:pointer">
            <span class="f2-item-mood">${e.grade || '☯'}</span>
            <div class="f2-item-main">
              <div class="f2-item-text">${esc(e.name)}</div>
              <div class="f2-item-sub">${esc((e.meaning || '').slice(0, 40))}${e.note ? ' · 📝 ' + esc(e.note.slice(0, 20)) : ''}</div>
            </div>
            <i class="fas fa-pen" style="color:var(--c-accent);font-size:13px"></i>
          </div>`).join('');
        listEl.querySelectorAll('[data-idx]').forEach(el => el.addEventListener('click', () => editNote(entries[+el.dataset.idx])));
      }
      searchEl.addEventListener('input', renderList);
      renderList();
    }

    function editNote(entry) {
      const notes = d.deckNotes[kind];
      const key = kind === 'lucky' ? `sign${LUCKY_STICKS.indexOf(LUCKY_STICKS.find(s => s[0] === entry.grade && s[1] === entry.meaning))}` : entry.name;
      const m = UI.modal({
        title: `📝 ${entry.name}`,
        body: `
          <div style="background:rgba(255,255,255,.5);border-radius:10px;padding:10px;margin-bottom:10px">
            <div style="font-size:13px;color:var(--c-text-soft)"><b>${esc(entry.grade)}</b></div>
            <div style="font-size:12px;color:var(--c-text-faint);margin-top:4px">${esc(entry.meaning)}</div>
            <div style="font-size:12px;color:var(--c-text-faint);margin-top:2px">📜 ${esc(entry.advice)}</div>
          </div>
          <label class="f2-label">我的笔记 / 感悟</label>
          <textarea id="note-edit-area" class="f2-textarea" rows="4" placeholder="写下你对这一卦 / 这一签的理解和感悟…">${esc(notes[key] || '')}</textarea>`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="note-save">保存</button>`,
        size: 'modal-lg'
      });
      m.overlay.querySelector('[data-close]').addEventListener('click', m.close);
      m.overlay.querySelector('#note-save').addEventListener('click', () => {
        const v = m.overlay.querySelector('#note-edit-area').value.trim();
        notes[key] = v;
        Core.State.save();
        m.close();
        render();
        Core.Toast.show('笔记已保存', 'success');
      });
    }

    overlay.querySelectorAll('#deck-tabs [data-deck]').forEach(b => b.addEventListener('click', () => {
      overlay.querySelectorAll('#deck-tabs [data-deck]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      kind = b.dataset.deck;
      render();
    }));
    render();
  }

  /* ==================== 5. 摸鱼小计 ==================== */
  function openFish() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🐟 摸鱼小计',
      body: `
        <label class="f2-label">现在在做什么</label>
        <input type="text" id="fish-doing" placeholder="例如：假装在改bug / 摸鱼中 / 带薪喝水">
        <label class="f2-label">心情</label>
        <div class="f2-mood-picker" id="fish-moods">
          ${MOODS.map((m, i) => `<button class="f2-mood-opt ${i === 0 ? 'selected' : ''}" data-mood="${m}">${m}</button>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn-primary" id="fish-save" style="flex:1"><i class="fas fa-fish-fins"></i> 记一笔</button>
          <button class="btn-ghost" id="fish-send"><i class="fas fa-paper-plane"></i> 汇报给TA</button>
        </div>
        <div class="f2-divider"></div>
        <div class="f2-list" id="fish-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    let mood = MOODS[0];
    overlay.querySelectorAll('#fish-moods .f2-mood-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('#fish-moods .f2-mood-opt').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        mood = btn.dataset.mood;
      });
    });

    function renderList() {
      const list = overlay.querySelector('#fish-list');
      const items = d.fish.slice(0, 30);
      list.innerHTML = items.length ? items.map(f => `
        <div class="f2-item">
          <span class="f2-item-mood">${esc(f.mood.split(/[\u4e00-\u9fa5]+/)[0] || '🐟')}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(f.doing)}</div>
            <div class="f2-item-sub">${f.date} ${fmtHM(f.time)} · ${esc(f.mood)}</div>
          </div>
          <button class="icon-btn f2-del" data-del="${f.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">今天还没摸过鱼哦</p>';
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          d.fish = d.fish.filter(x => x.id !== btn.dataset.del);
          Core.State.save();
          renderList();
        });
      });
    }

    function collect() {
      return { id: Core.uid(), time: Core.now(), date: fmtDate(Core.now()), doing: overlay.querySelector('#fish-doing').value.trim() || '神秘摸鱼中', mood };
    }
    overlay.querySelector('#fish-save').addEventListener('click', () => {
      d.fish.unshift(collect());
      Core.State.save();
      overlay.querySelector('#fish-doing').value = '';
      renderList();
      Core.Toast.show('摸鱼记录成功 🐟', 'success');
    });
    overlay.querySelector('#fish-send').addEventListener('click', () => {
      const f = collect();
      if (sendCard('fa-fish', '🐟 摸鱼小计', [`正在做：${f.doing}`, `心情：${f.mood}`, `时间：${f.date} ${fmtHM(f.time)}`])) {
        d.fish.unshift(f);
        Core.State.save();
        overlay.querySelector('#fish-doing').value = '';
        renderList();
      }
    });
    renderList();
  }

  /* ==================== 6. 查岗 ==================== */
  function openCheckin() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '📍 查岗打卡',
      body: `
        <div class="form-row">
          <div><label class="f2-label">地点</label><input type="text" id="ci-place" placeholder="例如：公司 / 家 / 学校"></div>
          <div><label class="f2-label">具体位置</label><input type="text" id="ci-pos" placeholder="例如：工位 / 卧室床边"></div>
        </div>
        <label class="f2-label">在做什么</label>
        <input type="text" id="ci-doing" placeholder="例如：开会摸鱼 / 躺平刷手机">
        <label class="f2-label">心情</label>
        <div class="f2-mood-picker" id="ci-moods">
          ${MOODS.map((m, i) => `<button class="f2-mood-opt ${i === 0 ? 'selected' : ''}" data-mood="${m}">${m}</button>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn-primary" id="ci-save" style="flex:1"><i class="fas fa-location-dot"></i> 打卡记录</button>
          <button class="btn-ghost" id="ci-send"><i class="fas fa-paper-plane"></i> 打卡给TA查岗</button>
        </div>
        <div class="f2-divider"></div>
        <div class="f2-list" id="ci-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    let mood = MOODS[0];
    overlay.querySelectorAll('#ci-moods .f2-mood-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('#ci-moods .f2-mood-opt').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        mood = btn.dataset.mood;
      });
    });

    function renderList() {
      const list = overlay.querySelector('#ci-list');
      const items = d.checkins.slice(0, 30);
      list.innerHTML = items.length ? items.map(c => `
        <div class="f2-item">
          <span class="f2-item-mood">📍</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(c.place)} · ${esc(c.pos) || '—'}</div>
            <div class="f2-item-sub">${c.date} ${fmtHM(c.time)} · ${esc(c.doing) || '—'} · ${esc(c.mood)}</div>
          </div>
          <button class="icon-btn f2-del" data-del="${c.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有查岗记录</p>';
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          d.checkins = d.checkins.filter(x => x.id !== btn.dataset.del);
          Core.State.save();
          renderList();
        });
      });
    }

    function collect() {
      return {
        id: Core.uid(), time: Core.now(), date: fmtDate(Core.now()),
        place: overlay.querySelector('#ci-place').value.trim() || '未知地点',
        pos: overlay.querySelector('#ci-pos').value.trim(),
        doing: overlay.querySelector('#ci-doing').value.trim(),
        mood
      };
    }
    overlay.querySelector('#ci-save').addEventListener('click', () => {
      d.checkins.unshift(collect());
      Core.State.save();
      renderList();
      Core.Toast.show('打卡成功 📍', 'success');
    });
    overlay.querySelector('#ci-send').addEventListener('click', () => {
      const c = collect();
      if (sendCard('fa-location-dot', '📍 查岗打卡', [
        `时间：${c.date} ${fmtHM(c.time)}`,
        `地点：${c.place}${c.pos ? ' · ' + c.pos : ''}`,
        `在做：${c.doing || '保密'}`,
        `心情：${c.mood}`
      ])) {
        d.checkins.unshift(c);
        Core.State.save();
        renderList();
      }
    });
    renderList();
  }

  /* ==================== 7. 聊天统计 ==================== */
  /* 连续聊天天数：当前火花 + 历史最长 */
  function chatStreaks(msgs) {
    const dayNum = (str) => { const [y, m, dd] = str.split('-').map(Number); return new Date(y, m - 1, dd).getTime(); };
    const days = [...new Set(msgs.filter(m => m.type !== 'system' && !m.recalled).map(m => fmtDate(m.time)))].sort();
    if (!days.length) return { cur: 0, max: 0, active: false, days: 0 };
    let max = 1, run = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = Math.round((dayNum(days[i]) - dayNum(days[i - 1])) / 86400000);
      run = diff === 1 ? run + 1 : 1;
      if (run > max) max = run;
    }
    const todayS = fmtDate(Core.now());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yS = fmtDate(y.getTime());
    let cur = 0;
    const last = days[days.length - 1];
    if (last === todayS || last === yS) {
      cur = 1;
      for (let i = days.length - 1; i > 0; i--) {
        if (Math.round((dayNum(days[i]) - dayNum(days[i - 1])) / 86400000) === 1) cur++;
        else break;
      }
    }
    return { cur, max, active: last === todayS, days: days.length };
  }

  function openStats() {
    if (!requireChat()) return;
    const sid = Core.State.currentChatId;
    const msgs = Core.State.getMessages(sid);
    const s = Core.State.data.sessions[sid];
    const me = Core.State.user.username;
    const d = ensureData();
    const streak = chatStreaks(msgs);

    let emojiRe;
    try { emojiRe = new RegExp('\\p{Extended_Pictographic}', 'gu'); } catch { emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu; }

    const total = msgs.filter(m => m.type !== 'system' && !m.recalled).length;
    const mine = msgs.filter(m => m.from === me && m.type !== 'system' && !m.recalled).length;
    const theirs = total - mine;
    const chars = msgs.reduce((n, m) => n + (m.type === 'text' ? (m.text || '').length : 0), 0);
    const myChars = msgs.reduce((n, m) => n + (m.from === me && m.type === 'text' ? (m.text || '').length : 0), 0);
    const emojis = (msgs.map(m => (m.type === 'text' ? (m.text || '').match(emojiRe) : null)).filter(Boolean).flat()).length;
    const hours = {};
    msgs.forEach(m => { const h = new Date(m.time).getHours(); hours[h] = (hours[h] || 0) + 1; });
    const peakHour = Object.keys(hours).sort((a, b) => hours[b] - hours[a])[0];
    const typeCount = {};
    msgs.forEach(m => { if (m.type !== 'system' && !m.recalled) typeCount[m.type] = (typeCount[m.type] || 0) + 1; });
    const first = msgs.length ? msgs[0].time : 0;
    const TYPE_NAMES = { text: '文字', image: '图片', file: '文件', voice: '语音', redpacket: '红包', question: '提问', poll: '投票', card: '卡片' };

    const myPct = total ? Math.round(mine / total * 100) : 0;
    const typeName = s.type === 'group' ? s.name : (s.name);

    UI.modal({
      title: `📊 聊天统计 · ${typeName}`,
      body: `
        <div class="f2-stats-grid">
          <div class="f2-stat-card"><b>${total}</b><span>总消息</span></div>
          <div class="f2-stat-card"><b>${chars}</b><span>总字数</span></div>
          <div class="f2-stat-card"><b>${emojis}</b><span>表情数</span></div>
          <div class="f2-stat-card"><b>${peakHour !== undefined ? peakHour + '点' : '—'}</b><span>最活跃时段</span></div>
        </div>
        <div class="f2-streak ${streak.active ? 'alive' : ''}">
          <span class="f2-streak-flame">${streak.active ? '🔥' : (streak.cur > 0 ? '🕯️' : '💤')}</span>
          <div class="f2-streak-main">
            <b>${streak.cur > 0 ? `火花连续 ${streak.cur} 天` : (streak.days ? '昨天之前的火花已熄灭' : '还没有火花')}</b>
            <span>${streak.active ? '今天已经聊过啦，火花正旺' : streak.cur > 0 ? '今天还没聊天，快发消息续上火花' : '从今天开始聊天，点亮火花吧'}</span>
          </div>
          <div class="f2-streak-num"><b>${streak.max}</b><span>最长连续(天)</span></div>
          <div class="f2-streak-num"><b>${streak.days}</b><span>聊过(天)</span></div>
        </div>
        <div class="f2-divider"></div>
        <label class="f2-label">消息占比</label>
        <div class="f2-bar-row">
          <span class="f2-bar-label">我</span>
          <div class="f2-bar"><div class="f2-bar-fill me" style="width:${myPct}%"></div></div>
          <span class="f2-bar-val">${mine}条 · ${myPct}%</span>
        </div>
        <div class="f2-bar-row">
          <span class="f2-bar-label">TA</span>
          <div class="f2-bar"><div class="f2-bar-fill other" style="width:${100 - myPct}%"></div></div>
          <span class="f2-bar-val">${theirs}条 · ${100 - myPct}%</span>
        </div>
        <div class="f2-bar-row">
          <span class="f2-bar-label">字数</span>
          <div class="f2-bar"><div class="f2-bar-fill me" style="width:${chars ? Math.round(myChars / chars * 100) : 0}%"></div></div>
          <span class="f2-bar-val">我打了 ${myChars} 字</span>
        </div>
        ${first ? `<div class="f2-divider"></div><p style="color:var(--c-text-soft);font-size:13px"><i class="fas fa-seedling"></i> 你们从 <b>${fmtDate(first)}</b> 开始聊到现在，共 ${msgs.length} 条消息记录。</p>` : '<p style="color:var(--c-text-faint);text-align:center">这个会话还没有消息</p>'}
        <div class="f2-divider"></div>
        <label class="f2-label">消息类型</label>
        <div class="f2-chip-row">
          ${Object.entries(typeCount).map(([t, n]) => `<span class="f2-chip">${TYPE_NAMES[t] || t} × ${n}</span>`).join('') || '<span style="color:var(--c-text-faint)">无</span>'}
        </div>
        ${d.purchases?.length ? `<div class="f2-divider"></div><label class="f2-label">商城购买记录</label><div class="f2-chip-row">${d.purchases.slice(0, 8).map(p => `<span class="f2-chip">${esc(p.name)} ${p.for ? '→ ' + esc(p.for) : ''}</span>`).join('')}</div>` : ''}`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
  }

  /* ==================== 8. 记账 ==================== */
  const EXP_CATS = ['餐饮', '购物', '娱乐', '交通', '礼物', '日用', '其他'];

  function openExpense() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '💰 记账本',
      body: `
        <div class="f2-stats-grid" id="exp-summary"></div>
        <div class="f2-divider"></div>
        <div class="form-row">
          <div>
            <label class="f2-label">类型</label>
            <select id="exp-type"><option value="expense">支出</option><option value="income">收入</option></select>
          </div>
          <div>
            <label class="f2-label">金额</label>
            <input type="number" id="exp-amount" min="0" step="0.01" placeholder="0.00">
          </div>
        </div>
        <label class="f2-label">分类</label>
        <div class="f2-chip-row" id="exp-cats">
          ${EXP_CATS.map((c, i) => `<button class="f2-chip selectable ${i === 0 ? 'selected' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <label class="f2-label">备注</label>
        <input type="text" id="exp-note" placeholder="这笔钱花在哪了…">
        <button class="btn-primary" id="exp-add" style="width:100%;margin-top:12px"><i class="fas fa-plus"></i> 记一笔</button>
        <div class="f2-divider"></div>
        <div class="f2-list" id="exp-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    let cat = EXP_CATS[0];
    overlay.querySelectorAll('#exp-cats .selectable').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('#exp-cats .selectable').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        cat = btn.dataset.cat;
      });
    });

    const monthKey = fmtDate(Core.now()).slice(0, 7);
    function render() {
      const monthItems = d.expenses.filter(e => fmtDate(e.time).startsWith(monthKey));
      const income = monthItems.filter(e => e.type === 'income').reduce((n, e) => n + e.amount, 0);
      const expense = monthItems.filter(e => e.type === 'expense').reduce((n, e) => n + e.amount, 0);
      overlay.querySelector('#exp-summary').innerHTML = `
        <div class="f2-stat-card"><b style="color:#3a9e6f">+${income.toFixed(2)}</b><span>本月收入</span></div>
        <div class="f2-stat-card"><b style="color:#d07070">-${expense.toFixed(2)}</b><span>本月支出</span></div>
        <div class="f2-stat-card"><b>${(income - expense).toFixed(2)}</b><span>本月结余</span></div>
        <div class="f2-stat-card"><b>${d.expenses.length}</b><span>总笔数</span></div>`;

      const list = overlay.querySelector('#exp-list');
      const items = d.expenses.slice(0, 40);
      list.innerHTML = items.length ? items.map(e => `
        <div class="f2-item">
          <span class="f2-exp-badge ${e.type}">${e.type === 'income' ? '收' : '支'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(e.note) || esc(e.category)}</div>
            <div class="f2-item-sub">${fmtDate(e.time)} ${fmtHM(e.time)} · ${esc(e.category)}</div>
          </div>
          <b class="${e.type === 'income' ? 'f2-green' : 'f2-red'}">${e.type === 'income' ? '+' : '-'}${e.amount.toFixed(2)}</b>
          <button class="icon-btn f2-del" data-del="${e.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">还没有账目记录</p>';
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          d.expenses = d.expenses.filter(x => x.id !== btn.dataset.del);
          Core.State.save();
          render();
        });
      });
    }

    overlay.querySelector('#exp-add').addEventListener('click', () => {
      const amount = parseFloat(overlay.querySelector('#exp-amount').value);
      const note = overlay.querySelector('#exp-note').value.trim();
      const type = overlay.querySelector('#exp-type').value;
      if (!amount || amount <= 0) { Core.Toast.show('请输入正确金额', 'error'); return; }
      d.expenses.unshift({ id: Core.uid(), time: Core.now(), type, amount, category: cat, note });
      Core.State.save();
      overlay.querySelector('#exp-amount').value = '';
      overlay.querySelector('#exp-note').value = '';
      render();
      Core.Toast.show('记账成功 💰', 'success');
    });
    render();
  }

  /* ==================== 9. 存钱罐 ==================== */
  function openPiggy() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🐷 存钱罐',
      body: `
        <div class="f2-piggy-hero">
          <div class="f2-piggy-icon">🐷</div>
          <div class="f2-piggy-balance" id="piggy-balance"></div>
          <div class="f2-piggy-goal" id="piggy-goal-text"></div>
          <div class="f2-bar" style="margin-top:8px"><div class="f2-bar-fill me" id="piggy-progress" style="width:0%"></div></div>
        </div>
        <div class="form-row" style="margin-top:14px">
          <div>
            <label class="f2-label">金额</label>
            <input type="number" id="piggy-amount" min="0" step="0.01" placeholder="0.00">
          </div>
          <div>
            <label class="f2-label">备注</label>
            <input type="text" id="piggy-note" placeholder="为什么存/取这笔钱">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn-primary" id="piggy-deposit" style="flex:1"><i class="fas fa-circle-down"></i> 存入</button>
          <button class="btn-ghost" id="piggy-withdraw" style="flex:1"><i class="fas fa-circle-up"></i> 取出</button>
        </div>
        <div class="form-row" style="margin-top:10px">
          <div><label class="f2-label">目标金额</label><input type="number" id="piggy-goal" min="0" placeholder="设置一个小目标"></div>
          <div style="display:flex;align-items:flex-end"><button class="btn-ghost" id="piggy-set-goal" style="width:100%"><i class="fas fa-flag"></i> 设定目标</button></div>
        </div>
        <div class="f2-divider"></div>
        <div class="f2-list" id="piggy-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function render() {
      overlay.querySelector('#piggy-balance').textContent = `¥ ${d.piggy.balance.toFixed(2)}`;
      overlay.querySelector('#piggy-goal-text').textContent = d.piggy.goal > 0
        ? `目标 ¥${d.piggy.goal.toFixed(2)} · 已完成 ${Math.min(100, Math.round(d.piggy.balance / d.piggy.goal * 100))}%`
        : '还没有设定目标，存钱更有动力哦';
      overlay.querySelector('#piggy-progress').style.width =
        d.piggy.goal > 0 ? Math.min(100, d.piggy.balance / d.piggy.goal * 100) + '%' : '0%';
      const list = overlay.querySelector('#piggy-list');
      const items = (d.piggy.history || []).slice(0, 30);
      list.innerHTML = items.length ? items.map(h => `
        <div class="f2-item">
          <span class="f2-exp-badge ${h.amount >= 0 ? 'income' : 'expense'}">${h.amount >= 0 ? '存' : '取'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(h.note) || (h.amount >= 0 ? '存入一笔' : '取出一笔')}</div>
            <div class="f2-item-sub">${fmtDate(h.time)} ${fmtHM(h.time)}</div>
          </div>
          <b class="${h.amount >= 0 ? 'f2-green' : 'f2-red'}">${h.amount >= 0 ? '+' : ''}${h.amount.toFixed(2)}</b>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">罐子还是空的，投第一枚硬币吧</p>';
    }

    function trans(sign) {
      const amount = parseFloat(overlay.querySelector('#piggy-amount').value);
      const note = overlay.querySelector('#piggy-note').value.trim();
      if (!amount || amount <= 0) { Core.Toast.show('请输入正确金额', 'error'); return; }
      if (sign < 0 && amount > d.piggy.balance) { Core.Toast.show('罐子里的钱不够取哦', 'error'); return; }
      d.piggy.balance = Math.round((d.piggy.balance + sign * amount) * 100) / 100;
      d.piggy.history = d.piggy.history || [];
      d.piggy.history.unshift({ id: Core.uid(), time: Core.now(), amount: sign * amount, note });
      Core.State.save();
      overlay.querySelector('#piggy-amount').value = '';
      overlay.querySelector('#piggy-note').value = '';
      render();
      Core.Toast.show(sign > 0 ? '叮～存入成功 🐷' : '取出成功', 'success');
    }
    overlay.querySelector('#piggy-deposit').addEventListener('click', () => trans(1));
    overlay.querySelector('#piggy-withdraw').addEventListener('click', () => trans(-1));
    overlay.querySelector('#piggy-set-goal').addEventListener('click', () => {
      const g = parseFloat(overlay.querySelector('#piggy-goal').value);
      if (!g || g <= 0) { Core.Toast.show('请输入正确目标金额', 'error'); return; }
      d.piggy.goal = g;
      Core.State.save();
      render();
      Core.Toast.show('目标已设定 🚩', 'success');
    });
    render();
  }

  /* ==================== 10. 商城 ==================== */
  const SHOP_CATS = ['美食', '鲜花', '玩偶', '数码', '好物', '饰品'];
  const SHOP_ITEMS = [
    { id: 'milktea', emoji: '🧋', name: '一杯奶茶', price: 30, cat: '美食', desc: '三分糖去冰，摸鱼续命水' },
    { id: 'cake', emoji: '🍰', name: '小蛋糕', price: 88, cat: '美食', desc: '甜甜的，像今天的心情' },
    { id: 'choco', emoji: '🍫', name: '巧克力礼盒', price: 66, cat: '美食', desc: '不开心的时候就吃一颗' },
    { id: 'flower', emoji: '🌹', name: '玫瑰花', price: 99, cat: '鲜花', desc: '送TA一朵，胜过千言万语' },
    { id: 'bouquet', emoji: '💐', name: '花束', price: 333, cat: '鲜花', desc: '一整捧的浪漫' },
    { id: 'bear', emoji: '🧸', name: '小熊玩偶', price: 199, cat: '玩偶', desc: '抱着入睡刚刚好' },
    { id: 'starlight', emoji: '🌙', name: '星空灯', price: 233, cat: '好物', desc: '把银河搬进房间里' },
    { id: 'earphone', emoji: '🎧', name: '耳机', price: 520, cat: '数码', desc: '一起听歌的仪式感' },
    { id: 'camera', emoji: '📷', name: '拍立得', price: 888, cat: '数码', desc: '把瞬间变成永远' },
    { id: 'watch', emoji: '⌚', name: '情侣手表', price: 1314, cat: '数码', desc: '一表心意，一生一世' },
    { id: 'game', emoji: '🎮', name: '游戏机', price: 1999, cat: '数码', desc: '双人成行，说走就走' },
    { id: 'crown', emoji: '👑', name: '皇冠', price: 2500, cat: '饰品', desc: '你是我的独一无二' }
  ];

  function walletCoins() { return (ensureData().wallet || {}).coins || 0; }

  function getShopItems() {
    const d = ensureData();
    if (!d.shopItems) return SHOP_ITEMS;
    const customMap = new Map(d.shopItems.map(it => [it.id, it]));
    return SHOP_ITEMS.map(it => customMap.get(it.id) || it).concat(d.shopItems.filter(it => !SHOP_ITEMS.find(s => s.id === it.id)));
  }

  function openShop() {
    const d = ensureData();
    const { overlay, close } = UI.modal({
      title: '🛍️ 小心意商城',
      body: `
        <div class="f2-shop-wallet">
          <span><i class="fas fa-coins" style="color:#e8b04b"></i> 金币余额：<b id="shop-coins">${d.wallet.coins}</b></span>
          <button class="btn-ghost" id="shop-manage" style="padding:4px 10px;font-size:12px"><i class="fas fa-pen-to-square"></i> 管理商品</button>
          <button class="btn-ghost" id="shop-recharge" style="padding:4px 10px;font-size:12px"><i class="fas fa-piggy-bank"></i> +1000</button>
        </div>
        <div class="f2-shop-search">
          <i class="fas fa-search"></i>
          <input type="text" id="shop-search-input" placeholder="搜索商品名称 / 描述" autocomplete="off">
          <button class="icon-btn" id="shop-search-clear" title="清空" hidden><i class="fas fa-xmark"></i></button>
        </div>
        <div class="f2-chip-row" id="shop-cats" style="margin-bottom:10px">
          <button class="f2-chip selectable selected" data-cat="全部">全部</button>
          ${SHOP_CATS.map(c => `<button class="f2-chip selectable" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div class="f2-shop-grid" id="shop-grid"></div>
        <div id="shop-empty" hidden style="text-align:center;color:var(--c-text-faint);padding:24px 0"><i class="fas fa-box-open" style="font-size:26px"></i><p style="margin-top:8px;font-size:13px">没有找到相关商品</p></div>
        <div class="f2-divider"></div>
        <label class="f2-label">❤️ 我的心愿单</label>
        <div id="wish-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    function updateCoins() { overlay.querySelector('#shop-coins').textContent = d.wallet.coins; }

    let curCat = '全部';
    let keyword = '';
    function renderShop() {
      const kw = keyword.trim().toLowerCase();
      const items = getShopItems().filter(it =>
        (curCat === '全部' || it.cat === curCat) &&
        (!kw || it.name.toLowerCase().includes(kw) || it.desc.toLowerCase().includes(kw))
      );
      overlay.querySelector('#shop-empty').hidden = items.length > 0;
      overlay.querySelector('#shop-grid').innerHTML = items.map(it => `
        <div class="f2-shop-card" data-id="${it.id}">
          <div class="f2-shop-cat">${it.cat}</div>
          <div class="f2-shop-emoji">${it.emoji}</div>
          <div class="f2-shop-name">${it.name}</div>
          <div class="f2-shop-desc">${it.desc}</div>
          <div class="f2-shop-price"><i class="fas fa-coins"></i> ${it.price}</div>
          <div class="f2-shop-btns">
            <button class="icon-btn ${d.wishes.find(w => w.id === it.id) ? 'wished' : ''}" data-wish="${it.id}" title="心愿单"><i class="${d.wishes.find(w => w.id === it.id) ? 'fas' : 'far'} fa-heart"></i></button>
            <button class="f2-shop-buy" data-buy="${it.id}">购买</button>
            <button class="f2-shop-gift" data-gift="${it.id}">送TA</button>
          </div>
        </div>`).join('');
      overlay.querySelectorAll('[data-wish]').forEach(btn => btn.addEventListener('click', () => toggleWish(btn.dataset.wish)));
      overlay.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => buy(btn.dataset.buy)));
      overlay.querySelectorAll('[data-gift]').forEach(btn => btn.addEventListener('click', () => giftTo(btn.dataset.gift)));
    }
    overlay.querySelectorAll('#shop-cats [data-cat]').forEach(b => b.addEventListener('click', () => {
      curCat = b.dataset.cat;
      overlay.querySelectorAll('#shop-cats .selectable').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      renderShop();
    }));
    const searchInput = overlay.querySelector('#shop-search-input');
    searchInput.addEventListener('input', () => {
      keyword = searchInput.value;
      overlay.querySelector('#shop-search-clear').hidden = !keyword;
      renderShop();
    });
    overlay.querySelector('#shop-search-clear').addEventListener('click', () => {
      keyword = '';
      searchInput.value = '';
      overlay.querySelector('#shop-search-clear').hidden = true;
      renderShop();
      searchInput.focus();
    });

    function renderWishes() {
      const box = overlay.querySelector('#wish-list');
      box.innerHTML = d.wishes.length ? d.wishes.map(w => `
        <div class="f2-item">
          <span class="f2-item-mood">${w.emoji}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(w.name)} <span style="color:var(--c-text-faint);font-size:12px">${w.desc}</span></div>
            <div class="f2-item-sub"><i class="fas fa-coins"></i> ${w.price} 金币</div>
          </div>
          <button class="f2-shop-buy" data-wbuy="${w.id}">购买</button>
          <button class="icon-btn f2-del" data-wdel="${w.id}"><i class="fas fa-trash-can"></i></button>
        </div>`).join('') : '<p style="color:var(--c-text-faint);text-align:center">心愿单空空的，点商品上的 ❤️ 收藏</p>';
      box.querySelectorAll('[data-wbuy]').forEach(btn => btn.addEventListener('click', () => buy(btn.dataset.wbuy)));
      box.querySelectorAll('[data-wdel]').forEach(btn => btn.addEventListener('click', () => {
        d.wishes = d.wishes.filter(w => w.id !== btn.dataset.wdel);
        Core.State.save();
        renderWishes(); renderShop();
      }));
    }

    function toggleWish(id) {
      const it = getShopItems().find(x => x.id === id);
      if (d.wishes.find(w => w.id === id)) {
        d.wishes = d.wishes.filter(w => w.id !== id);
        Core.Toast.show('已从心愿单移除', 'info');
      } else {
        d.wishes.push({ ...it });
        Core.Toast.show('已加入心愿单 ❤️', 'success');
      }
      Core.State.save();
      renderShop(); renderWishes();
    }

    function doPurchase(it, forName) {
      if (d.wallet.coins < it.price) { Core.Toast.show('金币不足，先去领取零花钱吧', 'error'); return false; }
      d.wallet.coins -= it.price;
      d.purchases.unshift({ id: Core.uid(), time: Core.now(), name: it.name, emoji: it.emoji, price: it.price, for: forName || '' });
      d.expenses.unshift({ id: Core.uid(), time: Core.now(), type: 'expense', amount: it.price, category: '礼物', note: `商城购买 · ${it.name}${forName ? '（送' + forName + '）' : ''}` });
      Core.State.save();
      updateCoins();
      return true;
    }

    function buy(id) {
      const it = getShopItems().find(x => x.id === id);
      if (!it) return;
      if (!doPurchase(it)) return;
      d.wishes = d.wishes.filter(w => w.id !== id);
      Core.State.save();
      renderShop(); renderWishes();
      Core.Toast.show(`已购买 ${it.emoji}${it.name} 🎉`, 'success');
      sendCard('fa-bag-shopping', '🛍️ 购物小票', [`购入：${it.emoji} ${it.name}`, `花费：${it.price} 金币`, `余额：${d.wallet.coins} 金币`]);
    }

    function giftTo(id) {
      const it = getShopItems().find(x => x.id === id);
      if (!it) return;
      const users = Object.values(Core.Auth.allUsers()).filter(u => u.username !== Core.State.user.username);
      if (!users.length) { Core.Toast.show('还没有可以赠送的人', 'error'); return; }
      const gModal = UI.modal({
        title: `🎁 送出「${it.name}」`,
        body: `
          <div class="contact-list">
            ${users.map(u => `
              <div class="contact-option" data-u="${u.username}">
                <img src="${u.avatar}" style="width:40px;height:40px;border-radius:50%">
                <div><div style="font-weight:500">${esc(u.nickname || u.username)}</div><div style="font-size:11px;color:var(--c-text-faint)">@${esc(u.username)}</div></div>
              </div>`).join('')}
          </div>
          <label class="f2-label" style="margin-top:10px">附言（可选）</label>
          <input type="text" id="gift-msg" placeholder="想对TA说的话…">`,
        footer: `<button class="btn-ghost" data-close>取消</button>`,
        size: 'modal-lg'
      });
      gModal.overlay.querySelector('[data-close]').addEventListener('click', gModal.close);
      gModal.overlay.querySelectorAll('[data-u]').forEach(el => {
        el.addEventListener('click', () => {
          const u = users.find(x => x.username === el.dataset.u);
          const note = gModal.overlay.querySelector('#gift-msg').value.trim();
          if (!doPurchase(it, u.nickname || u.username)) return;
          // 写入双方会话并跨标签页同步
          const sid = Core.State.getOrCreateSession(u.username, 'private');
          Core.State.addMessage(sid, {
            id: Core.uid(), from: Core.State.user.username, to: u.username, type: 'card',
            cardIcon: 'fa-gift', text: `收到了礼物：${it.name}`,
            cardTitle: `🎁 收到来自 ${Core.State.user.nickname} 的礼物`, lines: [`${it.emoji} ${it.name}`, note ? `附言：${note}` : ''].filter(Boolean),
            time: Core.now(), status: 'sent'
          });
          Core.Sync.send('message', {
            from: Core.State.user.username, to: u.username, type: 'card',
            text: `收到了礼物：${it.name}`, cardIcon: 'fa-gift',
            cardTitle: `🎁 收到来自 ${Core.State.user.nickname} 的礼物`,
            lines: [`${it.emoji} ${it.name}`, note ? `附言：${note}` : ''].filter(Boolean),
            time: Core.now()
          });
          UI.refresh();
          gModal.close();
          close();
          Core.Toast.show(`礼物已送给 ${u.nickname || u.username} 🎁`, 'success');
        });
      });
    }

    overlay.querySelector('#shop-recharge').addEventListener('click', () => {
      d.wallet.coins += 1000;
      Core.State.save();
      updateCoins();
      Core.Toast.show('零花钱到账 +1000 🪙', 'success');
    });
    overlay.querySelector('#shop-manage').addEventListener('click', () => openShopManage(overlay, () => { renderShop(); renderWishes(); updateCoins(); }));
    renderShop();
    renderWishes();
  }

  /* ==================== 初始化 ==================== */
  function openShopManage(parentOverlay, onDone) {
    const d = ensureData();
    if (!d.shopItems) d.shopItems = [];
    const merged = getShopItems();
    const em = UI.modal({
      title: '📝 管理自定义商品',
      body: `
        <p style="font-size:12px;color:var(--c-text-faint);margin-bottom:10px">在此添加、编辑或删除自定义商品。内置商品也可被覆盖（同名ID优先使用自定义版本）。</p>
        <button class="btn-primary" id="sm-add" style="width:100%;margin-bottom:12px"><i class="fas fa-plus"></i> 添加新商品</button>
        <div class="f2-list" id="sm-list"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-xl',
      onClose: onDone
    });
    em.overlay.querySelector('[data-close]').addEventListener('click', em.close);

    function renderList() {
      const box = em.overlay.querySelector('#sm-list');
      const all = [...SHOP_ITEMS.map(it => ({ ...it, builtIn: true })), ...d.shopItems];
      box.innerHTML = all.map(it => `
        <div class="f2-item" data-id="${it.id}">
          <span class="f2-item-mood">${it.emoji || '📦'}</span>
          <div class="f2-item-main">
            <div class="f2-item-text">${esc(it.name)} ${it.builtIn ? '<span style="color:var(--c-text-faint);font-size:11px">内置</span>' : '<span style="color:var(--c-accent);font-size:11px">自定义</span>'}</div>
            <div class="f2-item-sub">${esc(it.cat || '好物')} · <i class="fas fa-coins"></i> ${it.price}</div>
          </div>
          <button class="icon-btn" data-edit="${it.id}" title="编辑"><i class="fas fa-pen"></i></button>
          ${!it.builtIn ? '<button class="icon-btn f2-del" data-smdel="' + it.id + '" title="删除"><i class="fas fa-trash-can"></i></button>' : ''}
        </div>`).join('');
      box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editItem(b.dataset.edit)));
      box.querySelectorAll('[data-smdel]').forEach(b => b.addEventListener('click', () => {
        d.shopItems = d.shopItems.filter(x => x.id !== b.dataset.smdel);
        Core.State.save();
        renderList();
        Core.Toast.show('商品已删除', 'success');
      }));
    }

    function editItem(id) {
      const all = getShopItems();
      const item = id ? all.find(x => x.id === id) : { id: Core.uid(), emoji: '📦', name: '', price: 10, cat: '好物', desc: '' };
      if (!item) return;
      const m = UI.modal({
        title: id ? '编辑商品' : '添加商品',
        body: `
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div style="flex:0 0 80px;text-align:center">
              <div style="font-size:40px" id="sm-emoji-preview">${item.emoji || '📦'}</div>
            </div>
            <div style="flex:1">
              <label class="f2-label">商品名称</label>
              <input type="text" id="sm-name" value="${esc(item.name)}" placeholder="商品名称">
              <label class="f2-label">价格（金币）</label>
              <input type="number" id="sm-price" value="${item.price}" min="0" step="1">
            </div>
          </div>
          <label class="f2-label">Emoji 图标</label>
          <input type="text" id="sm-emoji" value="${esc(item.emoji || '📦')}" maxlength="4" placeholder="输入一个 emoji">
          <label class="f2-label">分类</label>
          <select id="sm-cat">
            ${SHOP_CATS.map(c => `<option value="${c}" ${item.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
            <option value="自定义" ${item.cat === '自定义' ? 'selected' : ''}>自定义</option>
          </select>
          <label class="f2-label">描述</label>
          <input type="text" id="sm-desc" value="${esc(item.desc || '')}" placeholder="一句话描述">`,
        footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="sm-save">保存</button>`,
        size: 'modal-lg'
      });
      m.overlay.querySelector('[data-close]').addEventListener('click', m.close);
      m.overlay.querySelector('#sm-emoji').addEventListener('input', (e) => {
        m.overlay.querySelector('#sm-emoji-preview').textContent = e.target.value || '📦';
      });
      m.overlay.querySelector('#sm-save').addEventListener('click', () => {
        const name = m.overlay.querySelector('#sm-name').value.trim();
        const price = Math.floor(Number(m.overlay.querySelector('#sm-price').value));
        const emoji = m.overlay.querySelector('#sm-emoji').value.trim() || '📦';
        const cat = m.overlay.querySelector('#sm-cat').value;
        const desc = m.overlay.querySelector('#sm-desc').value.trim();
        if (!name) { Core.Toast.show('名称不能为空', 'error'); return; }
        if (isNaN(price) || price < 0) { Core.Toast.show('价格不正确', 'error'); return; }
        const obj = { id: item.id, name, price, emoji, cat, desc };
        const existing = d.shopItems.findIndex(x => x.id === item.id);
        if (existing >= 0) d.shopItems[existing] = obj;
        else d.shopItems.push(obj);
        Core.State.save();
        m.close();
        renderList();
        Core.Toast.show('商品已保存', 'success');
      });
    }

    em.overlay.querySelector('#sm-add').addEventListener('click', () => editItem(null));
    renderList();
  }

  function init() {
    ensureData();
    document.getElementById('btn-decide').addEventListener('click', openDecide);
    document.getElementById('btn-calendar').addEventListener('click', openCalendar);
    document.getElementById('btn-mood').addEventListener('click', openMood);
    document.getElementById('btn-fortune').addEventListener('click', openFortune);
    document.getElementById('btn-fish').addEventListener('click', openFish);
    document.getElementById('btn-checkin').addEventListener('click', openCheckin);
    document.getElementById('btn-stats').addEventListener('click', openStats);
    document.getElementById('btn-expense').addEventListener('click', openExpense);
    document.getElementById('btn-piggy').addEventListener('click', openPiggy);
    document.getElementById('btn-shop').addEventListener('click', openShop);
  }

  return {
    init,
    openDecide, openCalendar, openMood, openFortune, openFish, openCheckin,
    openStats, openExpense, openPiggy, openShop
  };
})();
