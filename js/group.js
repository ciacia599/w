/* ============ 私语 · 群组管理 + 消息搜索 ============ */
const Group = (() => {
  function init() {
    document.getElementById('btn-new-group').addEventListener('click', openCreateGroup);
    document.getElementById('btn-chat-info').addEventListener('click', openChatInfo);
  }

  /* 创建群聊 */
  function openCreateGroup() {
    const users = Object.values(Core.Auth.allUsers()).filter(u => u.username !== Core.State.user.username);
    const contacts = Core.State.data.contacts;
    const all = [...contacts, ...users.filter(u => !contacts.find(c => c.username === u.username))];

    const { overlay, close } = UI.modal({
      title: '创建群聊',
      body: `
        <div class="form-row">
          <label>群名称</label>
          <input type="text" id="g-name" placeholder="给群起个名字">
        </div>
        <div class="form-row">
          <label>选择成员</label>
          <div class="contact-list" id="g-members">
            ${all.length ? all.map(u => `
              <label class="contact-option">
                <input type="checkbox" value="${u.username}">
                <img src="${u.avatar}" style="width:36px;height:36px;border-radius:50%">
                <span>${u.nickname || u.username}</span>
              </label>`).join('') : '<p style="color:var(--c-text-faint)">暂无其他用户</p>'}
          </div>
        </div>`,
      footer: `<button class="btn-ghost" data-close>取消</button><button class="btn-primary" id="g-create">创建</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#g-create').addEventListener('click', () => {
      const name = overlay.querySelector('#g-name').value.trim() || '未命名群聊';
      const members = [...overlay.querySelectorAll('#g-members input:checked')].map(i => i.value);
      if (!members.length) { Core.Toast.show('至少选择一位成员', 'error'); return; }
      const g = Core.State.createGroup(name, UI.AVATARS[Math.floor(Math.random()*UI.AVATARS.length)], members);
      Core.Toast.show(`群「${name}」已创建`, 'success');
      UI.openChat(g.id);
      close();
    });
  }

  /* 聊天信息面板 */
  function openChatInfo() {
    const sid = Core.State.currentChatId;
    if (!sid) return;
    const s = Core.State.data.sessions[sid];
    if (s.type === 'group') {
      openGroupInfo(sid);
    } else {
      openPrivateInfo(sid);
    }
  }

  function openPrivateInfo(sid) {
    const s = Core.State.data.sessions[sid];
    const peer = sid.split('__').find(x => x !== Core.State.user.username);
    const user = Core.Auth.getUser(peer);
    const { overlay, close } = UI.modal({
      title: '聊天信息',
      body: `
        <div style="text-align:center;padding:20px">
          <img src="${s.avatar}" style="width:72px;height:72px;border-radius:50%;border:3px solid #fff">
          <h3 style="margin:12px 0 4px">${s.name}</h3>
          <p style="color:var(--c-text-faint)">@${peer}</p>
        </div>
        <div class="form-row">
          <label>设置备注</label>
          <input type="text" id="p-alias" value="${s.name}" placeholder="备注名">
        </div>
        <button class="btn-primary" id="p-save" style="width:100%">保存</button>
        <button class="btn-ghost btn-danger" id="p-delete" style="width:100%;margin-top:10px;color:var(--c-red)">删除该会话</button>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('#p-save').addEventListener('click', () => {
      s.name = overlay.querySelector('#p-alias').value.trim() || s.name;
      Core.State.save();
      UI.renderSessions();
      Core.Toast.show('已保存', 'success');
      close();
    });
    overlay.querySelector('#p-delete').addEventListener('click', () => {
      delete Core.State.data.sessions[sid];
      delete Core.State.data.messages[sid];
      Core.State.save();
      Core.State.currentChatId = null;
      document.getElementById('chat-window').classList.add('hidden');
      document.getElementById('chat-empty').classList.remove('hidden');
      UI.renderSessions();
      Core.Toast.show('会话已删除', 'success');
      close();
    });
  }

  function openGroupInfo(sid) {
    const s = Core.State.data.sessions[sid];
    const g = Core.State.getGroup(sid);
    const isOwner = g.owner === Core.State.user.username;
    const { overlay, close } = UI.modal({
      title: `群信息 · ${g.name}`,
      body: `
        <div class="form-row">
          <label>群名称</label>
          <input type="text" id="gi-name" value="${g.name}" ${isOwner ? '' : 'disabled'}>
        </div>
        <div class="form-row">
          <label>群成员 (${g.members.length})</label>
          <div class="contact-list">
            ${g.members.map(m => {
              const u = Core.Auth.getUser(m) || { nickname: m, avatar: UI.AVATARS[0] };
              const muted = g.muted.includes(m);
              return `
                <div class="contact-option" style="justify-content:space-between">
                  <div style="display:flex;align-items:center;gap:10px">
                    <img src="${u.avatar}" style="width:32px;height:32px;border-radius:50%">
                    <span>${u.nickname || m}${m === g.owner ? ' 👑' : ''}</span>
                  </div>
                  ${isOwner && m !== g.owner ? `
                    <div style="display:flex;gap:6px">
                      <button class="btn-ghost" data-mute="${m}">${muted ? '解除禁言' : '禁言'}</button>
                      <button class="btn-ghost" style="color:var(--c-red)" data-kick="${m}">踢出</button>
                    </div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>
        ${isOwner ? `
        <div class="form-row">
          <label>添加成员</label>
          <select id="gi-add">
            <option value="">选择用户</option>
            ${Object.values(Core.Auth.allUsers()).filter(u => !g.members.includes(u.username)).map(u =>
              `<option value="${u.username}">${u.nickname || u.username}</option>`).join('')}
          </select>
        </div>
        <button class="btn-primary" id="gi-save" style="width:100%">保存修改</button>` : ''}`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);

    overlay.querySelectorAll('[data-mute]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mute;
        if (g.muted.includes(m)) g.muted = g.muted.filter(x => x !== m);
        else g.muted.push(m);
        Core.State.save();
        Core.Toast.show(g.muted.includes(m) ? '已禁言' : '已解除禁言', 'success');
        close(); openGroupInfo(sid);
      });
    });
    overlay.querySelectorAll('[data-kick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.kick;
        g.members = g.members.filter(x => x !== m);
        s.members = g.members;
        Core.State.save();
        Core.Toast.show('已移出群聊', 'success');
        close(); openGroupInfo(sid);
      });
    });
    const save = overlay.querySelector('#gi-save');
    if (save) {
      save.addEventListener('click', () => {
        g.name = overlay.querySelector('#gi-name').value.trim() || g.name;
        const add = overlay.querySelector('#gi-add').value;
        if (add) { g.members.push(add); s.members = g.members; }
        Core.State.save();
        Core.Toast.show('已保存', 'success');
        close();
      });
    }
  }

  /* 消息搜索 */
  function openSearch() {
    const sid = Core.State.currentChatId;
    if (!sid) { Core.Toast.show('请先打开一个会话', 'info'); return; }
    const { overlay, close } = UI.modal({
      title: '搜索消息',
      body: `
        <div class="form-row">
          <input type="text" id="search-input" placeholder="输入关键词">
        </div>
        <div id="search-results" style="max-height:360px;overflow-y:auto"></div>`,
      footer: `<button class="btn-ghost" data-close>关闭</button>`,
      size: 'modal-lg'
    });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    const input = overlay.querySelector('#search-input');
    const results = overlay.querySelector('#search-results');
    input.addEventListener('input', () => {
      const kw = input.value.trim().toLowerCase();
      if (!kw) { results.innerHTML = ''; return; }
      const msgs = Core.State.getMessages(sid).filter(m => (m.text || '').toLowerCase().includes(kw));
      results.innerHTML = msgs.length ? msgs.map(m => `
        <div style="padding:10px;background:rgba(255,255,255,.4);border-radius:8px;margin-bottom:6px">
          <div style="font-size:11px;color:var(--c-text-faint)">${Core.Auth.getUser(m.from)?.nickname || m.from} · ${UI.fmtTime(m.time)}</div>
          <div>${m.text}</div>
        </div>`).join('') : '<p style="color:var(--c-text-faint)">未找到相关消息</p>';
    });
  }

  return { init, openSearch, openCreateGroup };
})();
