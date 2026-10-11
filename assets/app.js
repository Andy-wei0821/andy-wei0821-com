```js
/* ============================================================
   MM_PersonalSite · 主页脚本 (mobile-first,via /api 同源代理)
   ============================================================ */

(function () {
  'use strict';

  function $(s, r) { r = r || document; return r.querySelector(s); }
  function $$(s, r) { r = r || document; return Array.from(r.querySelectorAll(s)); }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function escapeAttr(s) { return escapeHtml(s); }

  var cfg = window.MM_CONFIG || {};
  var SB = { url: cfg.supabaseUrl, key: cfg.supabaseKey };

  var y = $('year'); if (y) y.textContent = new Date().getFullYear();

  fetch('data/profile.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('profile ' + r.status); return r.json(); })
    .then(renderProfile)
    .catch(function (e) {
      $$('.muted').forEach(function (el) { if (el.textContent === '加载中…') el.textContent = '加载失败'; });
      console.error('profile load:', e);
    });

  function sbHeaders() {
    return { 'apikey': SB.key, 'Authorization': 'Bearer ' + SB.key };
  }

  function renderProfile(p) {
    if (p.name) $('#hero-name').textContent = p.name;
    if (p.role) $('#hero-role').textContent = p.role;
    var meta = $('#hero-meta');
    if (p.location && p.email) {
      meta.innerHTML = escapeHtml(p.location) + ' · <a href="mailto:' + escapeAttr(p.email) + '">' + escapeHtml(p.email) + '</a>';
    } else if (p.email) {
      meta.innerHTML = '<a href="mailto:' + escapeAttr(p.email) + '">' + escapeHtml(p.email) + '</a>';
    }
    if (p.about && p.about.length) {
      var aboutEl = $('#about-content');
      aboutEl.innerHTML = '';
      p.about.forEach(function (line) {
        var pEl = document.createElement('p'); pEl.textContent = line;
        aboutEl.appendChild(pEl);
      });
    }
    if (p.focus && p.focus.length) {
      var tags = $('#focus-tags');
      tags.innerHTML = '';
      p.focus.forEach(function (tag) {
        var span = document.createElement('span'); span.className = 'tag'; span.textContent = tag;
        tags.appendChild(span);
      });
    }
    var contactLine = $('#contact-line');
    if (contactLine && p.email) {
      contactLine.innerHTML = '邮箱:<a href="mailto:' + escapeAttr(p.email) + '">' + escapeHtml(p.email) + '</a>';
    }
    if (p.extra_contact) {
      $('#contact-extra').textContent = p.extra_contact;
    }
  }

  function loadPosts() {
    var url = '/api/posts?is_published=eq.true&order=date.desc&select=slug,title,excerpt,category,date,reading_time';
    return fetch(url, { headers: sbHeaders() })
      .then(function (r) { if (!r.ok) throw new Error('posts ' + r.status); return r.json(); })
      .then(function (rows) {
        var grouped = {};
        rows.forEach(function (r) {
          if (!grouped[r.category]) grouped[r.category] = [];
          grouped[r.category].push(r);
        });
        var order = ['投资', '技术', '产品', '随感'];
        order.forEach(function (cat) {
          var list = grouped[cat];
          if (!list || !list.length) return;
          var target = document.querySelector('.cat-list[data-category="' + cat + '"]');
          if (!target) return;
          target.innerHTML = '';
          list.slice(0, 3).forEach(function (post) {
            var div = document.createElement('a');
            div.href = 'post.html?slug=' + encodeURIComponent(post.slug);
            div.className = 'cat-card';
            div.innerHTML =
              '<div class="cat-card-head"><span class="cat-card-date">' + escapeHtml(post.date) + '</span>' +
              '<h3 class="cat-card-title">' + escapeHtml(post.title) + '</h3></div>' +
              (post.excerpt ? '<p class="cat-card-excerpt">' + escapeHtml(post.excerpt) + '</p>' : '') +
              '<span class="cat-card-meta">' + escapeHtml(post.reading_time || '5 分钟') + '</span>';
            target.appendChild(div);
          });
        });
      });
  }

  function loadToday() {
    var url = '/api/today_entries?order=date.desc&limit=1&select=date,quote,note,todo';
    return fetch(url, { headers: sbHeaders() })
      .then(function (r) { if (!r.ok) throw new Error('today ' + r.status); return r.json(); })
      .then(function (rows) {
        if (!rows.length) { $('#today-content').innerHTML = '<p class="muted">今天还没记录。</p>'; return; }
        var t = rows[0];
        var html = '';
        if (t.date) html += '<p class="muted" style="margin:0 0 10px;font-size:13px;">' + escapeHtml(t.date) + '</p>';
        if (t.quote) html += '<blockquote>' + escapeHtml(t.quote) + '</blockquote>';
        if (t.note) html += '<p>' + escapeHtml(t.note) + '</p>';
        if (t.todo) html += '<p style="margin-top:10px;font-size:13px;color:var(--muted);"><strong>明日:</strong> ' + escapeHtml(t.todo) + '</p>';
        $('#today-content').innerHTML = html;
      });
  }

  loadPosts().catch(function (e) {
    $$('.cat-list').forEach(function (el) { if (el.textContent.trim().startsWith('加载')) el.textContent = ''; });
    console.error('posts load:', e);
  });
  loadToday().catch(function (e) {
    console.error('today load:', e);
  });
})();
```

---
