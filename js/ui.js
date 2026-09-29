/* ============ 私语 · UI 渲染模块 ============ */
const UI = (() => {
  const AVATARS = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aurora',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ivy',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Nova'
  ];

  const fmtTime = (t) => {
    const d = new Date(t), now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    const hm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (sameDay) return hm;
    if (isYest) return '昨天 ' + hm;
    return `${d.getMonth()+1}/${d.getDate()} ${hm}`;
  };

  /* ---- 初始化头像选项 ---- */
  function initAvatarPicker() {
    const box = document.getElementById('avatar-options');
    box.innerHTML = AVATARS.map((a, i) =>
      `<img class="avatar-opt ${i === 0 ? 'selected' : ''}" data-avatar="${a}" src="${a}" alt="">`
    ).join('');
    box.querySelectorAll('.avatar-opt').forEach(el => {
      el.addEventListener('click', () => {
        box.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  }

  /* ---- 渲染会话列表 ---- */
  function renderSessions(filter = '') {
    const list = document.getElementById('session-list');
    const data = Core.State.data;
    let sessions = Object.values(data.sessions);
    if (filter) {
      const f = filter.toLowerCase();
      sessions = sessions.filter(s =>
        (s.name || '').toLowerCase().includes(f) ||
        (data.messages[s.id] || []).some(m => (m.text || '').toLowerCase().includes(f))
      );
    }
    sessions.sort((a, b) => b.lastTime - a.lastTime);
    list.innerHTML = sessions.map(s => {
      const isMe = Core.State.user.username;
      const unread = s.unread ? `<span class="unread-badge">${s.unread > 99 ? '99+' : s.unread}</span>` : '';
      const avatar = s.type === 'group'
        ? (s.avatar || AVATARS[0])
        : (s.avatar || AVATARS[0]);
      return `
        <div class="session-item ${Core.State.currentChatId === s.id ? 'active' : ''}" data-sid="${s.id}">
          <div class="avatar-wrap">
            <img class="session-avatar" src="${avatar}" alt="">
            ${unread}
          </div>
          <div class="session-info">
            <div class="session-top">
              <span class="session-name">${s.name}</span>
              <span class="session-time">${s.lastTime ? fmtTime(s.lastTime) : ''}</span>
            </div>
            <div class="session-preview">${s.lastMsg || '暂无消息'}</div>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.session-item').forEach(el => {
      el.addEventListener('click', () => openChat(el.dataset.sid));
    });
  }

  /* ---- 打开聊天 ---- */
  function openChat(sid) {
    Core.State.currentChatId = sid;
    Core.State.clearUnread(sid);
    document.querySelector('.app')?.classList.add('show-chat');
    document.getElementById('chat-empty').classList.add('hidden');
    document.getElementById('chat-window').classList.remove('hidden');
    const s = Core.State.data.sessions[sid];
    document.getElementById('chat-name').textContent = s.name;
    document.getElementById('chat-avatar').src = s.avatar || AVATARS[0];
    document.getElementById('chat-status').innerHTML =
      s.type === 'group'
        ? `<span class="dot-online"></span> ${s.members.length} 位成员`
        : (Core.Probability.roll('activeStatus') ? '<span class="dot-online"></span> 在线' : '<span class="dot-online" style="background:#ccc"></span> 离线');
    renderMessages(sid);
    // 通知对方已读
    if (s.type === 'private') {
      const peer = sid.split('__').find(x => x !== Core.State.user.username);
      Core.Sync.send('read', { from: Core.State.user.username, to: peer });
    }
    Messaging.markRead(sid);
    renderSessions(document.getElementById('session-search').value);
    document.getElementById('message-input').focus();
  }

  /* ---- 渲染消息 ---- */
  function renderMessages(sid) {
    const box = document.getElementById('messages');
    const msgs = Core.State.getMessages(sid);
    const me = Core.State.user.username;
    box.innerHTML = msgs.map(m => renderBubble(m, me)).join('');
    box.scrollTop = box.scrollHeight;

    // 绑定操作
    box.querySelectorAll('.msg-row').forEach(row => {
      const mid = row.dataset.mid;
      row.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.action;
          if (act === 'recall') Messaging.recallMessage(sid, mid);
          if (act === 'copy') {
            const m = msgs.find(x => x.id === mid);
            navigator.clipboard.writeText(m.text || '');
            Core.Toast.show('已复制', 'success');
          }
        });
      });
    });

    // 语音播放
    box.querySelectorAll('.voice-card').forEach(vc => {
      vc.querySelector('i').addEventListener('click', () => {
        const audio = new Audio(vc.dataset.src);
        audio.play();
      });
    });

    // 红包
    box.querySelectorAll('.redpacket-card').forEach(rp => {
      rp.addEventListener('click', () => Features.openRedPacket(rp.dataset.rpid));
    });

    // 投票
    box.querySelectorAll('.poll-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        Features.votePoll(sid, btn.dataset.poll, Number(btn.dataset.opt));
      });
    });
  }

  function renderBubble(m, me) {
    const isMe = m.from === me;
    const side = isMe ? 'me' : 'other';
    const avatar = isMe
      ? (Core.State.user.avatar || AVATARS[0])
      : (Core.State.data.contacts.find(c => c.username === m.from)?.avatar ||
         Core.Auth.getUser(m.from)?.avatar || AVATARS[0]);
    const fromName = !isMe ? (Core.Auth.getUser(m.from)?.nickname || m.from) : '';

    let content = '';
    if (m.recalled) {
      return `<div class="recalled">${isMe ? '你' : fromName} 撤回了一条消息</div>`;
    }
    switch (m.type) {
      case 'text':
        content = escapeHtml(m.text).replace(/@(\S+)/g, '<span style="color:var(--c-accent-deep);font-weight:500">@$1</span>');
        break;
      case 'image':
        content = `<img class="msg-img" src="${m.url}" alt="图片" onclick="window.open('${m.url}')">`;
        break;
      case 'file':
        content = `<a href="${m.url}" download="${m.name}" target="_blank" style="text-decoration:none;color:inherit">
          <div class="file-card"><i class="fas fa-file"></i>
          <div class="file-info"><div class="file-name">${m.name}</div><div class="file-size">${formatSize(m.size)}</div></div></div></a>`;
        break;
      case 'voice':
        content = `<div class="voice-card" data-src="${m.url}"><i class="fas fa-play-circle"></i>
          <div class="voice-wave">${Array.from({length: 14}).map(() => '<span></span>').join('')}</div>
          <span class="voice-duration">${m.duration}"</span></div>`;
        break;
      case 'redpacket':
        content = `<div class="redpacket-card" data-rpid="${m.rpid}"><i class="fas fa-gift"></i>
          <div class="rp-info"><div class="rp-title">${m.title || '红包'}</div><div class="rp-desc">点击领取</div></div></div>`;
        break;
      case 'question':
        content = `<div style="padding:10px 12px;background:rgba(143,163,196,.12);border-radius:10px">
          <i class="fas fa-question-circle" style="color:var(--c-accent-deep)"></i>
          <strong style="margin-left:6px">${escapeHtml(m.question)}</strong>
          ${m.answer ? `<div style="margin-top:6px;color:var(--c-text-soft)">${escapeHtml(m.answer)}</div>` : ''}
        </div>`;
        break;
      case 'poll': {
        const total = (m.options || []).reduce((n, o) => n + (o.voters || []).length, 0);
        const myVote = (m.options || []).findIndex(o => (o.voters || []).includes(me));
        content = `<div class="poll-card">
          <div class="poll-q"><i class="fas fa-square-poll-vertical"></i> ${escapeHtml(m.question)}</div>
          <div class="poll-opts">
            ${(m.options || []).map((o, i) => {
              const cnt = (o.voters || []).length;
              const pct = total ? Math.round(cnt / total * 100) : 0;
              const picked = o.voters.includes(me);
              return `<button class="poll-opt ${picked ? 'picked' : ''}" data-poll="${m.id}" data-opt="${i}">
                <span class="poll-opt-text">${String.fromCharCode(65 + i)}. ${escapeHtml(o.text)}${picked ? ' <i class="fas fa-check"></i>' : ''}</span>
                <span class="poll-bar"><span class="poll-bar-fill" style="width:${pct}%"></span></span>
                <span class="poll-cnt">${cnt}票 · ${pct}%</span>
              </button>`;
            }).join('')}
          </div>
          <div class="poll-foot">${total} 人参与${myVote >= 0 ? ' · 已投给 ' + String.fromCharCode(65 + myVote) : ' · 点击选项投票'}</div>
        </div>`;
        break;
      }
      case 'card':
        content = `<div class="msg-card">
          ${m.cardIcon ? `<i class="fas ${m.cardIcon} msg-card-icon"></i>` : ''}
          ${m.cardTitle ? `<div class="msg-card-title">${escapeHtml(m.cardTitle)}</div>` : ''}
          ${(m.lines || []).map(l => `<div class="msg-card-line">${escapeHtml(l)}</div>`).join('')}
        </div>`;
        break;
      case 'system':
        return `<div class="recalled">${m.text}</div>`;
      default:
        content = `[${m.type}]`;
    }

    const statusHtml = isMe && m.type === 'text' ? `
      <span class="msg-status">
        ${m.status === 'sending' ? '<i class="far fa-clock sending"></i>' : ''}
        ${m.status === 'sent' ? '<i class="fas fa-check sent"></i>' : ''}
        ${m.status === 'read' ? '<i class="fas fa-check-double read"></i>' : ''}
      </span>` : '';

    const actions = isMe && !m.recalled ? `
      <div class="msg-actions">
        <button data-action="copy"><i class="fas fa-copy"></i> 复制</button>
        <button data-action="recall"><i class="fas fa-undo"></i> 撤回</button>
      </div>` : `<div class="msg-actions"><button data-action="copy"><i class="fas fa-copy"></i> 复制</button></div>`;

    return `
      <div class="msg-row ${side}" data-mid="${m.id}">
        <img class="avatar" src="${avatar}" alt="">
        <div class="bubble-wrap">
          ${!isMe && fromName ? `<div style="font-size:11px;color:var(--c-text-soft);margin-bottom:2px">${fromName}</div>` : ''}
          <div class="bubble">${content}</div>
          <div class="msg-meta">${fmtTime(m.time)} ${statusHtml}</div>
          ${actions}
        </div>
      </div>`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /* ---- 正在输入 ---- */
  function showTyping(from, typing) {
    const el = document.getElementById('typing-indicator');
    if (typing) {
      const name = Core.Auth.getUser(from)?.nickname || from;
      el.innerHTML = `<span style="margin-right:6px;color:var(--c-text-soft)">${name} 正在输入</span><span></span><span></span><span></span>`;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 4000);
    } else {
      el.classList.remove('show');
    }
  }

  /* ---- 模态框 ---- */
  function modal({ title, body, footer, size = '', onClose }) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;
    root.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', () => close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    function close() { overlay.remove(); onClose && onClose(); }
    return { overlay, close };
  }

  /* ---- 刷新 ---- */
  function refresh() {
    if (!Core.State.user) return;
    renderSessions(document.getElementById('session-search')?.value || '');
    if (Core.State.currentChatId) renderMessages(Core.State.currentChatId);
  }

  return { AVATARS, initAvatarPicker, renderSessions, openChat, renderMessages, showTyping, modal, refresh, fmtTime, escapeHtml };
})();
