/* ============ 私语 · 消息模块 ============ */
const Messaging = (() => {
  let typingTimer = null;

  function init() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('btn-send');

    // 自适应高度
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // 回车发送
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    sendBtn.addEventListener('click', send);

    // 正在输入
    input.addEventListener('input', () => {
      const sid = Core.State.currentChatId;
      if (!sid) return;
      const s = Core.State.data.sessions[sid];
      if (s.type === 'private') {
        const peer = sid.split('__').find(x => x !== Core.State.user.username);
        Core.Sync.send('typing', { from: Core.State.user.username, to: peer, typing: true });
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          Core.Sync.send('typing', { from: Core.State.user.username, to: peer, typing: false });
        }, 2000);
      }
    });
  }

  function send() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;
    const sid = Core.State.currentChatId;
    if (!sid) return;

    const s = Core.State.data.sessions[sid];
    const msg = {
      id: Core.uid(),
      from: Core.State.user.username,
      to: s.type === 'group' ? sid : s.members.find(x => x !== Core.State.user.username),
      type: 'text',
      text,
      time: Core.now(),
      status: 'sending'
    };
    // 引用回复（若回复条处于激活状态）
    if (typeof Features7 !== 'undefined') { const q = Features7.takeQuote(); if (q) msg.quote = q; }

    Core.State.addMessage(sid, msg);
    input.value = '';
    input.style.height = 'auto';
    UI.renderMessages(sid);
    UI.renderSessions(document.getElementById('session-search').value);

    // 发送动效
    const btn = document.getElementById('btn-send');
    btn.classList.add('sending');
    setTimeout(() => btn.classList.remove('sending'), 400);

    // 模拟发送 -> 已送达
    setTimeout(() => {
      msg.status = 'sent';
      Core.State.updateMessage(sid, msg.id, { status: 'sent' });
      UI.renderMessages(sid);

      // 跨标签页发送给对方
      if (s.type === 'private') {
        Core.Sync.send('message', {
          from: msg.from, to: msg.to, type: msg.type, text: msg.text, time: msg.time, quote: msg.quote
        });
      }

      // 模拟自动回复 (基于概率)
      if (s.type === 'private' && Core.Probability.roll('autoReply')) {
        simulateReply(sid, msg.to);
      }
    }, 300);
  }

  /* 模拟对方回复（演示用） */
  function simulateReply(sid, peer) {
    const delay = Core.Probability.replyDelayMs();
    const showTyping = Core.Probability.roll('typingShow');

    if (showTyping) {
      setTimeout(() => UI.showTyping(peer, true), delay * 0.3);
    }

    setTimeout(() => {
      UI.showTyping(peer, false);
      // 用户要求：对方回复完全使用「我添加的字卡」内容；没有可用字卡时才用兜底短句
      let reply;
      const cards = Features5.cardRepliesFor ? Features5.cardRepliesFor(peer) : [];
      if (cards.length) {
        reply = cards[Math.floor(Math.random() * cards.length)];
      } else {
        const replies = [
          '嗯嗯，我在听～', '好的呀', '哈哈哈有意思', '真的吗？', '我也这么觉得',
          '抱抱你 🤗', '今天过得怎么样？', '想你了', '早点休息哦', '收到！',
          '哇塞！', '这个想法不错', '我有点不懂，能再说一遍吗？', '好嘞～'
        ];
        reply = replies[Math.floor(Math.random() * replies.length)];
      }

      const msg = {
        id: Core.uid(),
        from: peer,
        to: Core.State.user.username,
        type: 'text',
        text: reply,
        time: Core.now(),
        status: 'delivered'
      };
      Core.State.addMessage(sid, msg);

      // 对方消息送达后，若当前在该会话，标为已读
      if (Core.State.currentChatId === sid) {
        msg.status = 'read';
        Core.State.updateMessage(sid, msg.id, { status: 'read' });
      }

      UI.renderMessages(sid);
      UI.renderSessions(document.getElementById('session-search').value);

      // 对方主动内容（日记/写信/提问/画画），频率可在「对方主动频率」中调节
      Features4.peerProactiveTrigger(sid, peer);

      // 通知已读
      if (Core.Probability.roll('readReceipt')) {
        Core.Sync.send('read', { from: Core.State.user.username, to: peer });
      }
    }, delay);
  }

  /* 标记当前会话消息为已读 */
  function markRead(sid) {
    const msgs = Core.State.getMessages(sid);
    msgs.forEach(m => {
      if (m.to === Core.State.user.username && m.status !== 'read') {
        m.status = 'read';
      }
    });
    Core.State.save();
    UI.renderMessages(sid);
  }

  /* 批量更新状态 */
  function markMessagesStatus(sid, status) {
    const msgs = Core.State.getMessages(sid);
    msgs.forEach(m => {
      if (m.from === Core.State.user.username) m.status = status;
    });
    Core.State.save();
    if (Core.State.currentChatId === sid) UI.renderMessages(sid);
  }

  /* 撤回消息 (2分钟内) */
  function recallMessage(sid, msgId) {
    const msgs = Core.State.getMessages(sid);
    const m = msgs.find(x => x.id === msgId);
    if (!m) return;
    if (Core.now() - m.time > 120000) {
      Core.Toast.show('只能撤回2分钟内的消息', 'error');
      return;
    }
    m.recalled = true;
    Core.State.save();
    UI.renderMessages(sid);
    Core.Toast.show('已撤回', 'success');
  }

  /* 发送任意类型消息 */
  function sendMessage(payload) {
    const sid = Core.State.currentChatId;
    if (!sid) return null;
    const s = Core.State.data.sessions[sid];
    const msg = {
      id: Core.uid(),
      from: Core.State.user.username,
      to: s.type === 'group' ? sid : s.members.find(x => x !== Core.State.user.username),
      time: Core.now(),
      status: 'sent',
      ...payload
    };
    // 图片/表情包/颜文字/卡片等也支持带引用
    if (!msg.quote && typeof Features7 !== 'undefined') { const q = Features7.takeQuote(); if (q) msg.quote = q; }
    // 链接卡片归一化（调用方未带平台信息时自动识别）
    if (msg.type === 'link' && msg.url) {
      if (!msg.platform && typeof Features7 !== 'undefined' && Features7.detectPlatform) {
        msg.platform = Features7.detectPlatform(msg.url);
      }
      if (!msg.host) { try { msg.host = new URL(msg.url).hostname.replace(/^www\./, ''); } catch (e) { msg.host = msg.url; } }
      if (!msg.title) msg.title = (msg.platform && msg.platform.name ? msg.platform.name : '网页') + '分享';
    }
    Core.State.addMessage(sid, msg);
    UI.renderMessages(sid);
    UI.renderSessions(document.getElementById('session-search').value);
    // 跨标签页同步（私聊）
    if (s.type === 'private') Core.Sync.send('message', msg);
    return msg;
  }

  return { init, send, recallMessage, markRead, markMessagesStatus, sendMessage, simulateReply };
})();
