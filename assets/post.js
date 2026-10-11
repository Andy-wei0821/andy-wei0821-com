// MM 个人主页 — 文章详情页
// ?slug=xxx → Supabase posts 表查一条 → md 渲染

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.MM_CONFIG || {};
  var SB = { url: cfg.supabaseUrl, key: cfg.supabaseKey };

  var y = $('year'); if (y) y.textContent = new Date().getFullYear();

  function qs() {
    var m = location.search.match(/[?&]slug=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  var slug = qs();
  if (!slug) {
    $('post-title').textContent = '未指定文章';
    $('post-content').innerHTML = '<p class="muted">缺少 slug 参数。</p>';
    return;
  }

  if (!SB.url || !SB.key) {
    $('post-content').innerHTML = '<p class="muted">Supabase 未配置。</p>';
    return;
  }

  var url = SB.url + '/rest/v1/posts?slug=eq.' + encodeURIComponent(slug)
          + '&is_published=eq.true&select=*';

  fetch(url, { headers: {
    'apikey': SB.key,
    'Authorization': 'Bearer ' + SB.key
  }})
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (rows) {
      if (!rows.length) {
        $('post-title').textContent = '找不到这篇文章';
        $('post-content').innerHTML = '<p class="muted">slug: ' + escapeHtml(slug) + ' 不存在或未发布。</p>';
        return;
      }
      var p = rows[0];
      document.title = p.title + ' — Andy Wei';
      $('post-title').textContent = p.title;
      var meta = [p.date, p.category].filter(Boolean).join(' · ');
      if (p.reading_time) meta += ' · ' + p.reading_time + ' min';
      $('post-meta').textContent = meta;
      $('post-content').innerHTML = window.MD.render(p.content_md || '');
    })
    .catch(function (e) {
      $('post-title').textContent = '加载失败';
      $('post-content').innerHTML = '<p class="muted">' + escapeHtml(e.message || String(e)) + '</p>';
    });

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();
