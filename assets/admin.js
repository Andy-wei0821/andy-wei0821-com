```js
/* ============================================================
   MM_PersonalSite · 后台管理脚本 (mobile-first)
   - 不走 Supabase Auth,直接 anon key 通过同源 /api 代理调 REST
   - RLS 策略允许 anon 全权限 (见 supabase_schema.sql)
   - "保护"靠:admin URL 不公开 + 站没流量
   ============================================================ */

(() => {
  const CFG = window.MM_CONFIG || {};
  const URL = CFG.supabaseUrl;
  const KEY = CFG.supabaseKey;
  const isConfigured = URL && KEY && !URL.includes('YOUR-PROJECT') && !KEY.includes('YOUR-ANON');

  function $(s, r = document) { return r.querySelector(s); }
  function $$(s, r = document) { return Array.from(r.querySelectorAll(s)); }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function apiHeaders() {
    return {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async function api(method, table, query = '', body = null) {
    const r = await fetch(`/api/${table}${query ? '?' + query : ''}`, {
      method,
      headers: apiHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`API ${method} ${table}: ${r.status} ${text}`);
    }
    if (r.status === 204) return null;
    return r.json();
  }

  async function loadPosts() {
    const box = $('#posts-list');
    box.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const posts = await api('GET', 'posts', 'select=id,slug,title,category,date,is_published,updated_at&order=date.desc&limit=50');
      $('#posts-count').textContent = posts.length;
      if (!posts.length) {
        box.innerHTML = '<p class="loading">还没有文章,点上面"新建文章"。</p>';
        return;
      }
      box.innerHTML = posts.map((p) => `
        <div class="admin-item" data-id="${esc(p.id)}">
          <span class="item-date">${esc(p.date)}</span>
          <div class="item-info">
            <div class="item-title">${esc(p.title)}</div>
            <div class="item-meta">${esc(p.category)} · ${p.is_published ? '已发布' : '草稿'} · ${esc(p.slug)}</div>
          </div>
          <div class="item-actions">
            <button data-act="edit" aria-label="编辑">编辑</button>
            <button data-act="del" class="danger" aria-label="删除">删</button>
          </div>
        </div>
      `).join('');
      $$('#posts-list .admin-item').forEach((el) => {
        const id = el.dataset.id;
        const post = posts.find((p) => p.id === id);
        el.querySelector('[data-act="edit"]').onclick = () => openPostModal(post);
        el.querySelector('[data-act="del"]').onclick = () => confirmDelete('删除文章', `确定删除「${post.title}」?`, () => deletePost(id));
      });
    } catch (e) {
      box.innerHTML = `<p class="error-msg">${esc(e.message)}</p>`;
    }
  }

  async function loadTodayAdmin() {
    const box = $('#today-list');
    box.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const entries = await api('GET', 'today_entries', 'select=*&order=date.desc&limit=30');
      $('#today-count').textContent = entries.length;
      if (!entries.length) {
        box.innerHTML = '<p class="loading">还没有今日重点。</p>';
        return;
      }
      box.innerHTML = entries.map((e) => `
        <div class="admin-item" data-id="${esc(e.id)}">
          <span class="item-date">${esc(e.date)}</span>
          <div class="item-info">
            <div class="item-title">${esc(e.quote)}</div>
            <div class="item-meta">${esc((e.note || '').slice(0, 60))}${(e.note || '').length > 60 ? '…' : ''}</div>
          </div>
          <div class="item-actions">
            <button data-act="edit" aria-label="编辑">编辑</button>
            <button data-act="del" class="danger" aria-label="删除">删</button>
          </div>
        </div>
      `).join('');
      $$('#today-list .admin-item').forEach((el) => {
        const id = el.dataset.id;
        const entry = entries.find((x) => x.id === id);
        el.querySelector('[data-act="edit"]').onclick = () => openTodayModal(entry);
        el.querySelector('[data-act="del"]').onclick = () => confirmDelete('删除今日', `确定删除 ${entry.date} 的今日重点?`, () => deleteToday(id));
      });
    } catch (e) {
      box.innerHTML = `<p class="error-msg">${esc(e.message)}</p>`;
    }
  }

  function slugify(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  function openPostModal(post) {
    const modal = $('#post-modal');
    const form = $('#post-form');
    form.reset();
    $('#post-modal-title').textContent = post ? '编辑文章' : '新建文章';
    if (post) {
      form.title.value = post.title;
      form.category.value = post.category;
      form.date.value = post.date;
      form.reading_time.value = post.reading_time || '5 分钟';
      form.excerpt.value = post.excerpt || '';
      form.slug.value = post.slug;
      form.content_md.value = post.content_md;
      form.is_published.checked = post.is_published;
      form.id.value = post.id;
    } else {
      form.id.value = '';
      form.date.value = new Date().toISOString().slice(0, 10);
      form.is_published.checked = true;
    }
    updatePreview();
    modal.style.display = 'flex';
    modal.scrollTop = 0;
    setTimeout(() => form.title.focus(), 100);
  }

  function updatePreview() {
    const md = $('#post-content').value;
    $('#post-preview').innerHTML = window.MD.render(md) || '<p class="muted">预览…</p>';
  }

  async function savePost(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.id.value;
    const data = {
      title: form.title.value.trim(),
      category: form.category.value,
      date: form.date.value,
      reading_time: form.reading_time.value.trim() || '5 分钟',
      excerpt: form.excerpt.value.trim(),
      content_md: form.content_md.value,
      is_published: form.is_published.checked,
    };
    if (!data.title || !data.category || !data.date || !data.content_md) {
      alert('标题、分类、日期、正文必填');
      return;
    }
    let slug = form.slug.value.trim();
    if (!slug) slug = `${data.date}-${slugify(data.title)}`;
    data.slug = slug;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '保存中…';
    try {
      if (id) await api('PATCH', 'posts', `id=eq.${id}`, data);
      else await api('POST', 'posts', '', data);
      $('#post-modal').style.display = 'none';
      loadPosts();
    } catch (err) {
      await diagnoseAndAlert('保存失败', err, 'POST');
      $('#post-modal').style.display = 'none';
      loadPosts();
    } finally {
      btn.disabled = false; btn.textContent = '保存';
    }
  }

  async function deletePost(id) {
    try { await api('DELETE', 'posts', `id=eq.${id}`); loadPosts(); }
    catch (err) { await diagnoseAndAlert('删除失败', err, 'DELETE'); }
  }

  async function diagnoseAndAlert(title, origErr, verb) {
    const lines = [`${title}: ${origErr.message}`];
    try {
      const probe = await fetch(`/api/posts?select=id&limit=1`, { method: 'GET', headers: apiHeaders(), cache: 'no-store' }).catch((e) => ({ _err: e.message }));
      if (probe && probe._err) lines.push(`/api 代理: ❌ ${probe._err}`);
      else if (probe && probe.status) lines.push(`/api 代理: ✅ HTTP ${probe.status}`);
    } catch (e) { lines.push(`诊断失败: ${e.message}`); }
    alert(lines.join('\n'));
    console.error('[admin]', verb, origErr, lines);
  }

  function openTodayModal(entry) {
    const modal = $('#today-modal');
    const form = $('#today-form');
    form.reset();
    $('#today-modal-title').textContent = entry ? '编辑今日' : '新增今日';
    if (entry) {
      form.id.value = entry.id;
      form.date.value = entry.date;
      form.quote.value = entry.quote;
      form.note.value = entry.note || '';
      form.todo.value = entry.todo || '';
    } else {
      form.id.value = '';
      form.date.value = new Date().toISOString().slice(0, 10);
    }
    modal.style.display = 'flex';
    modal.scrollTop = 0;
    setTimeout(() => form.quote.focus(), 100);
  }

  async function saveToday(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.id.value;
    const data = {
      date: form.date.value,
      quote: form.quote.value.trim(),
      note: form.note.value.trim(),
      todo: form.todo.value.trim(),
    };
    if (!data.date || !data.quote) { alert('日期和金句必填'); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '保存中…';
    try {
      if (id) await api('PATCH', 'today_entries', `id=eq.${id}`, data);
      else await api('POST', 'today_entries', '', data);
      $('#today-modal').style.display = 'none';
      loadTodayAdmin();
    } catch (err) {
      await diagnoseAndAlert('保存失败', err, 'POST');
      $('#today-modal').style.display = 'none';
      loadTodayAdmin();
    } finally {
      btn.disabled = false; btn.textContent = '保存';
    }
  }

  async function deleteToday(id) {
    try { await api('DELETE', 'today_entries', `id=eq.${id}`); loadTodayAdmin(); }
    catch (err) { await diagnoseAndAlert('删除失败', err, 'DELETE'); }
  }

  let pendingAction = null;
  function confirmDelete(title, msg, action) {
    $('#confirm-title').textContent = title;
    $('#confirm-msg').textContent = msg;
    pendingAction = action;
    $('#confirm-modal').style.display = 'flex';
  }

  function bind() {
    $$('.admin-tabs .tab').forEach((t) => {
      t.onclick = () => {
        $$('.admin-tabs .tab').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        const tab = t.dataset.tab;
        $('#posts-tab').style.display = tab === 'posts' ? 'block' : 'none';
        $('#today-tab').style.display = tab === 'today' ? 'block' : 'none';
      };
    });
    $('#new-post-btn').onclick = () => openPostModal(null);
    $('#new-today-btn').onclick = () => openTodayModal(null);
    $('#post-form').addEventListener('submit', savePost);
    $('#today-form').addEventListener('submit', saveToday);
    $('#post-content').addEventListener('input', updatePreview);
    $$('[data-close]').forEach((b) => {
      b.onclick = () => { b.closest('.modal').style.display = 'none'; pendingAction = null; };
    });
    $('#confirm-ok').onclick = () => {
      if (pendingAction) pendingAction();
      $('#confirm-modal').style.display = 'none';
      pendingAction = null;
    };
    $$('.modal').forEach((m) => {
      m.addEventListener('click', (e) => {
        if (e.target === m) { m.style.display = 'none'; pendingAction = null; }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal').forEach((m) => { m.style.display = 'none'; });
        pendingAction = null;
      }
    });
  }

  function init() {
    bind();
    if (!isConfigured) {
      $('#config-warn').style.display = 'block';
      $('#posts-list').innerHTML = '';
      $('#today-list').innerHTML = '';
      return;
    }
    loadPosts();
    loadTodayAdmin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

---
