// MM 个人主页 — 主逻辑
// 1) 加载本地 profile.json(关于/经历/关注方向/联系)
// 2) 从 Supabase 拉 posts,按分类填到对应区
// 3) 从 Supabase 拉 today_entries 最新一条

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.MM_CONFIG || {};
  var SB = { url: cfg.supabaseUrl, key: cfg.supabaseKey };

  // year
  var y = $('year'); if (y) y.textContent = new Date().getFullYear();

  // 1) 本地 profile
  fetch('data/profile.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('profile ' + r.status); return r.json(); })
    .then(renderProfile)
    .catch(function (e) {
      console.warn('profile load failed:', e);
      $('about-content').innerHTML = '<p class="muted">关于信息加载失败。</p>';
    });

  // 2) 远端
  if (SB.url && SB.key) {
    Promise.all([loadPosts(), loadToday()]).catch(function (e) {
      console.warn('remote load failed:', e);
    });
  } else {
    document.querySelectorAll('.cat-list').forEach(function (el) {
      el.innerHTML = '<p class="muted">Supabase 未配置。</p>';
    });
    $('today-content').innerHTML = '<p class="muted">Supabase 未配置。</p>';
  }

  // ----- render profile -----
  function renderProfile(p) {
    if (p.name) {
      document.title = p.name + ' — ' + (p.role || '');
      $('hero-name').textContent = p.name;
      var bn = document.querySelector('.brand-name');
      if (bn) bn.textContent = p.name;
    }
    if (p.role) $('hero-role').textContent = p.role;
    if (p.initials) { var av = document.querySelector('.avatar'); if (av) av.textContent = p.initials; }

    // meta line
    var metaBits = [];
    if (p.location) metaBits.push(escapeHtml(p.location));
    if (p.email) metaBits.push('<a href="mailto:' + escapeAttr(p.email) + '">' + escapeHtml(p.email) + '</a>');
    $('hero-meta').innerHTML = metaBits.join(' · ');

    // about
    if (Array.isArray(p.about) && p.about.length) {
      $('about-content').innerHTML = p.about.map(function (t) { return '<p>' + escapeHtml(t) + '</p>'; }).join('');
    }

    // focus tags
    if (Array.isArray(p.focus) && p.focus.length) {
      $('focus-tags').innerHTML = p.focus.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');
    }

    // contact
    if (p.email) {
      $('contact-line').innerHTML = '邮箱:<a href="mailto:' + escapeAttr(p.email) + '">' + escapeHtml(p.email) + '</a>';
    }
    if (p.extra_contact) {
      $('contact-extra').textContent = p.extra_contact;
    }
  }

  // ----- posts (按 category 分组) -----
  function loadPosts() {
    var url = SB.url + '/rest/v1/posts?is_published=eq.true&order=date.desc&select=slug,title,excerpt,category,date,reading_time';
    return fetch(url, { headers: sbHeaders() })
      .then(function (r) { if (!r.ok) throw new Error('posts ' + r.status); return r.json(); })
      .then(function (rows) {
        // 按 category 分组
        var grouped = {};
        rows.forEach(function (p) {
          var cat = p.category || '未分类';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(p);
        });

        // 填每个 cat-list
        document.querySelectorAll('.cat-list').forEach(function (el) {
          var cat = el.getAttribute('data-category');
          var list = grouped[cat] || [];
          if (!list.length) {
            el.innerHTML = '<p class="muted">暂无内容。</p>';
            return;
          }
          el.innerHTML = list.slice(0, 3).map(renderItem).join('');
        });
      });
  }

  function renderItem(p) {
    var meta = [p.date, p.category].filter(Boolean).join(' · ');
    if (p.reading_time) meta += ' · ' + p.reading_time + ' min';
    return '<div class="writing-item">'
         +   '<div class="writing-meta">' + escapeHtml(meta) + '</div>'
         +   '<div class="writing-title"><a href="post.html?slug=' + encodeURIComponent(p.slug) + '">'
         +     escapeHtml(p.title) + '</a></div>'
         +   '<div class="writing-excerpt">' + escapeHtml(p.excerpt || '') + '</div>'
         + '</div>';
  }

  // ----- today -----
  function loadToday() {
    var url = SB.url + '/rest/v1/today_entries?order=date.desc&limit=1&select=date,quote,note,todo';
    return fetch(url, { headers: sbHeaders() })
      .then(function (r) { if (!r.ok) throw new Error('today ' + r.status); return r.json(); })
      .then(function (rows) {
        if (!rows.length) { $('today-content').innerHTML = '<p class="muted">今天还没记录。</p>'; return; }
        var t = rows[0];
        var html = '';
        if (t.date) html += '<div class="date">' + escapeHtml(t.date) + '</div>';
        if (t.quote) html += '<div class="quote">' + escapeHtml(t.quote) + '</div>';
        if (t.note) html += '<div class="note">' + escapeHtml(t.note) + '</div>';
        if (t.todo) html += '<div class="todo"><div class="todo-label">TODO</div>' + escapeHtml(t.todo) + '</div>';
        $('today-content').innerHTML = html;
      });
  }

  function sbHeaders() {
    return { 'apikey': SB.key, 'Authorization': 'Bearer ' + SB.key };
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }
})();
