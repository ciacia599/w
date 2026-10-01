/* ============ 私语 · 设置 (概率 / 主题 / 账号) ============ */
const Settings = (() => {
  function init() {
    document.getElementById('btn-settings').addEventListener('click', openSettings);
  }

  function openSettings() {
    const p = Core.Probability.get();
    const theme = Core.store.get(Core.KEYS.THEME, 'morandi');
    const { overlay, close } = UI.modal({
      title: '设置',
      body: `
        <h4 style="margin:8px 0 12px;color:var(--c-accent-deep)"><i class="fas fa-palette"></i> 外观主题</h4>
        <div style="display:flex;gap:10px;margin-bottom:20px">
          <button class="btn-ghost theme-btn ${theme==='morandi'?'active':''}" data-theme="morandi" style="flex:1;padding:12px;background:linear-gradient(135deg,#cdd9e8,#a8b8d0);color:#fff">莫兰迪</button>
          <button class="btn-ghost theme-btn ${theme==='blue'?'active':''}" data-theme="blue" style="flex:1;padding:12px;background:linear-gradient(135deg,#aec5e3,#7ba7d4);color:#fff">蓝白</button>
          <button class="btn-ghost theme-btn ${theme==='mono'?'active':''}" data-theme="mono" style="flex:1;padding:12px;background:linear-gradient(135deg,#e0e0e0,#9e9e9e);color:#333">黑白</button>
        </div>

        <h4 style="margin:8px 0 12px;color:var(--c-accent-deep)"><i class="fas fa-sliders-h"></i> 概率自定义</h4>
        <div class="prob-item">
          <span class="prob-label">自动回复概率</span>
          <input type="range" class="prob-slider" min="0" max="100" value="${p.autoReply}" data-k="autoReply">
          <span class="prob-value" data-v="autoReply">${p.autoReply}%</span>
        </div>
        <div class="prob-item">
          <span class="prob-label">显示"正在输入"</span>
          <input type="range" class="prob-slider" min="0" max="100" value="${p.typingShow}" data-k="typingShow">
          <span class="prob-value" data-v="typingShow">${p.typingShow}%</span>
        </div>
        <div class="prob-item">
          <span class="prob-label">回复速度</span>
          <input type="range" class="prob-slider" min="0" max="100" value="${p.replyDelay}" data-k="replyDelay">
          <span class="prob-value" data-v="replyDelay">${p.replyDelay}%</span>
        </div>
        <div class="prob-item">
          <span class="prob-label">自动回复带表情</span>
          <input type="range" class="prob-slider" min="0" max="100" value="${p.emojiUse}" data-k="emojiUse">
          <span class="prob-value" data-v="emojiUse">${p.emojiUse}%</span>
        </div>
        <div class="prob-item">
          <span class="prob-label">在线状态显示</span>
          <input type="range" class="prob-slider" min="0" max="100" value="${p.activeStatus}" data-k="activeStatus">
          <span class="prob-value" data-v="activeStatus">${p.activeStatus}%</span>
        </div>
        <div class="prob-item">
          <span class="prob-label">已读回执</span>
          <input type="range" class="prob-slider" min="0" max="100" value="${p.readReceipt}" data-k="readReceipt">
          <span class="prob-value" data-v="readReceipt">${p.readReceipt}%</span>
        </div>

        <hr style="margin:20px 0;border-color:rgba(107,130,168,.15)">
        <h4 style="margin:8px 0 12px;color:var(--c-accent-deep)"><i class="fas fa-user-circle"></i> 账号</h4>
        <div style="display:flex;gap:8px">
          <button class="btn-ghost" id="export-data" style="flex:1"><i class="fas fa-download"></i> 导出数据</button>
          <button class="btn-ghost" id="import-data" style="flex:1"><i class="fas fa-upload"></i> 导入数据</button>
          <button class="btn-ghost" id="clear-data" style="flex:1;color:var(--c-red)"><i class="fas fa-trash"></i> 清空数据</button>
        </div>
        <input type="file" id="import-file" accept=".json" class="hidden">`,
      footer: `<button class="btn-primary" data-close>完成</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    // 主题切换
    overlay.querySelectorAll('.theme-btn').forEach(b => {
      b.addEventListener('click', () => {
        const t = b.dataset.theme;
        document.documentElement.setAttribute('data-theme', t);
        Core.store.set(Core.KEYS.THEME, t);
        overlay.querySelectorAll('.theme-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    // 概率滑块
    overlay.querySelectorAll('.prob-slider').forEach(s => {
      s.addEventListener('input', () => {
        const k = s.dataset.k;
        const v = +s.value;
        Core.Probability.set(k, v);
        overlay.querySelector(`[data-v="${k}"]`).textContent = v + '%';
      });
    });

    // 导出数据
    overlay.querySelector('#export-data').addEventListener('click', () => {
      const data = Core.State.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `siyu_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Core.Toast.show('数据已导出', 'success');
    });

    // 导入数据
    overlay.querySelector('#import-data').addEventListener('click', () => {
      overlay.querySelector('#import-file').click();
    });
    overlay.querySelector('#import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || typeof data !== 'object') throw new Error('无效的数据格式');
          const uid = Core.State.user.username;
          Core.State.data = data;
          Core.State.save();
          Core.Toast.show('数据导入成功，即将刷新…', 'success');
          setTimeout(() => location.reload(), 800);
        } catch (err) {
          Core.Toast.show('导入失败：' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // 清空数据
    overlay.querySelector('#clear-data').addEventListener('click', () => {
      if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        const uid = Core.State.user.username;
        Core.store.remove(Core.KEYS.DATA(uid));
        Core.State.load(uid);
        UI.refresh();
        Core.Toast.show('数据已清空', 'success');
        close();
      }
    });
  }

  return { init };
})();
