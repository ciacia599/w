/* ============ 私语 · 增强功能 (upload / voice / redpacket / question) ============ */
const Features = (() => {
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStream = null;
  let recordStart = 0;

  function init() {
    // 表情面板（表情/表情包/颜文字）已迁移至 Features5.init()

    // 图片上传
    document.getElementById('btn-image').addEventListener('click', () => uploadFile('image/*', 'image'));
    // 文件上传
    document.getElementById('btn-file').addEventListener('click', () => uploadFile('*/*', 'file'));
    // 语音
    document.getElementById('btn-voice').addEventListener('click', toggleVoice);
    // 红包
    document.getElementById('btn-redpacket').addEventListener('click', openRedPacketModal);
    // 提问
    document.getElementById('btn-ask').addEventListener('click', openQuestionModal);
  }

  function uploadFile(accept, type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        Core.Toast.show('文件不能超过 10MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result;
        if (type === 'image') {
          Messaging.sendMessage({ type: 'image', url });
        } else {
          Messaging.sendMessage({ type: 'file', url, name: file.name, size: file.size });
        }
        Core.Toast.show('发送成功', 'success');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* 语音录制 */
  async function toggleVoice() {
    const btn = document.getElementById('btn-voice');
    if (!mediaRecorder) {
      try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recordingStream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const duration = Math.max(1, Math.round((Date.now() - recordStart) / 1000));
          const reader = new FileReader();
          reader.onload = () => {
            Messaging.sendMessage({ type: 'voice', url: reader.result, duration });
          };
          reader.readAsDataURL(blob);
          recordingStream.getTracks().forEach(t => t.stop());
          recordingStream = null;
          mediaRecorder = null;
        };
        recordStart = Date.now();
        mediaRecorder.start();
        btn.style.color = 'var(--c-red)';
        btn.classList.add('active');
        Core.Toast.show('正在录音... 再次点击结束', 'info');
      } catch (err) {
        Core.Toast.show('无法访问麦克风', 'error');
      }
    } else {
      mediaRecorder.stop();
      btn.style.color = '';
      btn.classList.remove('active');
      Core.Toast.show('语音已发送', 'success');
    }
  }

  /* 红包 */
  function openRedPacketModal() {
    const { overlay, close } = UI.modal({
      title: '发红包',
      body: `
        <div class="form-row">
          <label>红包个数</label>
          <input type="number" id="rp-count" value="1" min="1">
        </div>
        <div class="form-row">
          <label>总金额</label>
          <input type="number" id="rp-amount" value="5.20" min="0.01" step="0.01">
        </div>
        <div class="form-row">
          <label>留言</label>
          <input type="text" id="rp-title" value="恭喜发财，大吉大利">
        </div>`,
      footer: `
        <button class="btn-ghost" data-close>取消</button>
        <button class="btn-primary" id="rp-send">塞钱进红包</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#rp-send').addEventListener('click', () => {
      const count = parseInt(overlay.querySelector('#rp-count').value);
      const amount = parseFloat(overlay.querySelector('#rp-amount').value);
      const title = overlay.querySelector('#rp-title').value;
      const rpid = Core.uid();
      Messaging.sendMessage({ type: 'redpacket', rpid, title, count, amount, remaining: count });
      Core.Toast.show('红包已发送', 'success');
      close();
    });
  }

  function openRedPacket(rpid) {
    const msg = findMessageByRpid(rpid);
    if (!msg) return;
    const isMe = msg.from === Core.State.user.username;
    const { overlay, close } = UI.modal({
      title: '红包',
      body: `
        <div style="text-align:center;padding:20px">
          <i class="fas fa-gift" style="font-size:64px;color:var(--c-gold)"></i>
          <h3 style="margin:16px 0 8px">${msg.title}</h3>
          <p style="color:var(--c-text-soft)">来自 ${Core.Auth.getUser(msg.from)?.nickname || msg.from}</p>
          <p style="font-size:24px;color:var(--c-gold);margin:16px 0;font-weight:700">¥${(msg.amount / msg.count).toFixed(2)}</p>
          ${msg.remaining > 0 ? '<p style="color:var(--c-text-soft)">红包剩余 ' + msg.remaining + ' 个</p>' : '<p style="color:var(--c-red)">红包已被领完</p>'}
        </div>`,
      footer: msg.remaining > 0
        ? `<button class="btn-ghost" data-close>关闭</button><button class="btn-primary" id="rp-grab">领取</button>`
        : `<button class="btn-primary btn-block" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    const grab = overlay.querySelector('#rp-grab');
    if (grab) {
      grab.addEventListener('click', () => {
        const single = +(msg.amount / msg.count).toFixed(2);
        msg.remaining = Math.max(0, msg.remaining - 1);
        Core.State.save();
        // 领取加金币（¥1 = 10金币）
        const gold = Math.round(single * 10);
        const w = Core.State.data.wallet || (Core.State.data.wallet = { coins: 0 });
        w.coins += gold;
        Core.State.save();
        Core.Toast.show(`领取成功 ¥${single}（+${gold} 金币）`, 'success');
        UI.renderMessages(Core.State.currentChatId);
        close();
      });
    }
  }

  function findMessageByRpid(rpid) {
    const sid = Core.State.currentChatId;
    return Core.State.getMessages(sid).find(m => m.rpid === rpid);
  }

  /* ---- 提问 / 投票 ---- */
  function openQuestionModal() {
    const { overlay, close } = UI.modal({
      title: '提问',
      body: `
        <label class="f2-label">输入你的问题</label>
        <textarea id="q-input" class="f2-textarea" rows="2" placeholder="想问什么？"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px">
          <label class="f2-label" style="margin:0">选项（至少2个）</label>
          <button class="btn-ghost" id="q-add-opt" style="padding:4px 10px;font-size:12px"><i class="fas fa-plus"></i> 添加选项</button>
        </div>
        <div id="q-opts"></div>
        <p style="font-size:12px;color:var(--c-text-faint);margin-top:10px">对方收到后点选投票，票数实时显示在气泡中。</p>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="q-send">发送问题</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    const optsBox = overlay.querySelector('#q-opts');
    function renderOpts(arr) {
      optsBox.innerHTML = arr.map((t, i) => `
        <div class="q-opt-row" data-i="${i}">
          <span class="q-opt-letter">${String.fromCharCode(65 + i)}</span>
          <input type="text" class="q-opt-input" value="${UI.escapeHtml(t)}" placeholder="选项 ${i + 1}">
          ${arr.length > 2 ? '<button class="icon-btn q-opt-del" title="删除"><i class="fas fa-xmark"></i></button>' : ''}
        </div>`).join('');
      optsBox.querySelectorAll('.q-opt-del').forEach(b => b.addEventListener('click', () => {
        const cur = collect();
        cur.splice(Number(b.closest('.q-opt-row').dataset.i), 1);
        renderOpts(cur);
      }));
    }
    function collect() {
      return [...optsBox.querySelectorAll('.q-opt-input')].map(i => i.value.trim());
    }
    renderOpts(['', '']);
    overlay.querySelector('#q-add-opt').addEventListener('click', () => {
      const cur = collect();
      if (cur.length >= 10) { Core.Toast.show('最多10个选项', 'error'); return; }
      cur.push('');
      renderOpts(cur);
      optsBox.lastElementChild.querySelector('input').focus();
    });

    overlay.querySelector('#q-send').addEventListener('click', () => {
      const q = overlay.querySelector('#q-input').value.trim();
      const opts = collect();
      if (!q) { Core.Toast.show('请输入问题', 'error'); return; }
      const filled = opts.filter(Boolean);
      if (filled.length < 2) { Core.Toast.show('请至少填写2个选项', 'error'); return; }
      const uniq = [...new Set(filled)];
      Messaging.sendMessage({
        type: 'poll',
        question: q,
        options: uniq.map(t => ({ text: t, voters: [] }))
      });
      Core.Toast.show('问题已发送', 'success');
      close();
      // 模拟对方投票
      setTimeout(() => {
        const sid = Core.State.currentChatId;
        if (!sid) return;
        const s = Core.State.data.sessions[sid];
        const last = [...Core.State.getMessages(sid)].reverse().find(m => m.type === 'poll');
        if (last && last.from === Core.State.user.username && s?.type === 'private' && Core.Probability.roll('autoReply')) {
          const peer = s.members.find(x => x !== Core.State.user.username);
          const oi = Math.floor(Math.random() * last.options.length);
          if (!last.options[oi].voters.includes(peer)) last.options[oi].voters.push(peer);
          Core.State.save();
          UI.renderMessages(sid);
        }
      }, 1800);
    });
  }

  /* ---- 投票 ---- */
  function votePoll(sid, msgId, optIdx) {
    const m = Core.State.getMessages(sid).find(x => x.id === msgId);
    if (!m || m.type !== 'poll') return;
    const me = Core.State.user.username;
    m.options.forEach(o => { o.voters = (o.voters || []).filter(v => v !== me); });
    m.options[optIdx].voters = m.options[optIdx].voters || [];
    m.options[optIdx].voters.push(me);
    Core.State.save();
    UI.renderMessages(sid);
  }

  return { init, openRedPacket, openRedPacketModal, votePoll };
})();
