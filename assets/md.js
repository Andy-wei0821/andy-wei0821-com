/* ============================================================
   MM personal homepage · mini Markdown 渲染器
   支持: # / ## / ### 标题, **粗体** *斜体*, - 列表,
         > 引用, ```代码块, [text](url) 链接, --- 水平线,
         `行内代码`
   ============================================================ */

const MD = (() => {
  function escapeHTML(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(s) {
    let out = escapeHTML(s);
    // 链接 [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // 粗体 **xxx** (贪婪)
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *xxx*(避免匹配 **)
    out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    // 行内代码 `xxx`
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    return out;
  }

  function render(md) {
    if (!md) return '';
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let inList = false;
    let inCode = false;
    let codeBuf = [];

    function closeList() { if (inList) { out.push('</ul>'); inList = false; } }
    function closeCode() {
      if (inCode) {
        out.push('<pre><code>' + escapeHTML(codeBuf.join('\n')) + '</code></pre>');
        inCode = false;
        codeBuf = [];
      }
    }

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 代码块
      const fence = line.match(/^```\s*(\S+)?\s*$/);
      if (fence) {
        if (inCode) { closeCode(); } else { closeList(); inCode = true; }
        i++;
        continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }

      // 水平线
      if (/^\s*-{3,}\s*$/.test(line)) {
        closeList();
        out.push('<hr />');
        i++;
        continue;
      }

      // 标题
      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        closeList();
        out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
        i++;
        continue;
      }

      // 引用(可连续多行)
      const q = line.match(/^>\s?(.*)$/);
      if (q) {
        closeList();
        const inner = [q[1]];
        i++;
        while (i < lines.length) {
          const nq = lines[i].match(/^>\s?(.*)$/);
          if (!nq) break;
          inner.push(nq[1]);
          i++;
        }
        out.push(`<blockquote>${inline(inner.join(' '))}</blockquote>`);
        continue;
      }

      // 列表
      const li = line.match(/^[\-\*]\s+(.+)$/);
      if (li) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inline(li[1])}</li>`);
        i++;
        continue;
      }

      // 空行
      if (line.trim() === '') {
        closeList();
        i++;
        continue;
      }

      // 段落(连续非空行合并)
      const para = [line];
      i++;
      while (i < lines.length && lines[i].trim() !== '' &&
             !/^(#{1,6}\s|>\s|[\-\*]\s|```|\s*-{3,}\s*$)/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      closeList();
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
    closeList();
    closeCode();
    return out.join('\n');
  }

  return { render, escapeHTML };
})();

window.MD = MD;
