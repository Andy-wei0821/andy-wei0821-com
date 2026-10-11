```js
/* ============================================================
   MM_PersonalSite · 单篇文章页面
   ============================================================ */

(function () {
  function $(s) { return document.querySelector(s); }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var cfg = window.MM_CONFIG || {};
  var SB = { url: cfg.supabaseUrl, key: cfg.supabaseKey };

  var slug = new URLSearchParams(location.search).get('slug') || '';
  if (!slug) { $('#post-content').innerHTML = '<p class="muted">没指定 slug。</p>'; return; }
  document.title = '加载中… · Andy Wei';

  var url = '/api/posts?slug=eq.' + encodeURIComponent(slug)
          + '&is_published=eq.true&select=*';

  fetch(url, { headers: { 'apikey': SB.key, 'Authorization': 'Bearer ' + SB.key } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (rows) {
      if (!rows.length) { $('#post-content').innerHTML = '<p class="muted">文章没找到。</p>'; return; }
      var post = rows[0];
      document.title = post.title + ' · Andy Wei';

      var meta = $('#post-meta');
      meta.innerHTML = '<span class="post-date">' + escapeHtml(post.date) + '</span> · '
                     + '<span class="post-cat">' + escapeHtml(post.category) + '</span> · '
                     + '<span class="post-time">' + escapeHtml(post.reading_time || '5 分钟') + '</span>';

      $('#post-title').textContent = post.title;
      $('#post-body').innerHTML = window.MD.render(post.content_md || '');
      var bc = $('#breadcrumb-slug'); if (bc) bc.textContent = post.slug;
    })
    .catch(function (e) {
      $('#post-content').innerHTML = '<p class="muted">加载失败: ' + escapeHtml(e.message) + '</p>';
    });
})();
```

---
