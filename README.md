# MM Personal Homepage

Andy Wei 个人主页 — 商务时间线风格,数据从 Supabase 实时拉。

## 线上地址

- 主 URL:https://x9lqd8btyatyt.space.mcode.cn(最新)
- 历史 URL(已含旧版本,不再迭代):https://90nqzlijqej5k.space.mcode.cn
- 待绑定自定义域名:待用户定

## 文件结构

```
personal_homepage/
├── README.md           ← 你正在看
├── index.html          ← 主页(7 区:关于/投资/技术/产品/随感/今日/联系)
├── post.html           ← 单篇文章页(?slug=xxx)
├── assets/
│   ├── style.css       ← 黑白极简样式
│   ├── app.js          ← 主页逻辑:加载 profile.json + Supabase
│   ├── post.js         ← 文章页逻辑:按 slug 拉一条
│   ├── md.js           ← mini Markdown 渲染器
│   └── config.js       ← Supabase URL + key
└── data/
    └── profile.json    ← 姓名/角色/邮箱/关于/关注方向
```

## 数据流

```
┌──────────────┐                          ┌──────────────────┐
│ 浏览器       │  GET /rest/v1/posts      │  Supabase        │
│  - index.html│ ──────────────────────►  │  posts 表        │
│  - app.js    │  GET /rest/v1/today_...  │  today_entries 表│
└──────────────┘  ◄────────────────────── └──────────────────┘
       │
       │  fetch('data/profile.json')  ← 本地静态(姓名/关于/关注方向)
       ▼
   渲染页面
```

- **静态**(改 JSON):姓名、角色、邮箱、关于段落、关注方向 tags
- **动态**(改 Supabase):文章列表(按分类)、今日条目

## 怎么改内容

### 改主页静态信息(姓名/邮箱/关于/关注方向)

直接编辑 `data/profile.json`,字段含义:
- `name` — 顶部姓名
- `initials` — 头像里的字母(默认 "AW")
- `role` — 副标题(默认 "硬件架构经理 @ TCL")
- `location` — 顶部的城市(默认 "中国")
- `email` — 联系邮箱
- `about` — 3 段简介(数组,每项一段)
- `focus` — 关注方向 tags(数组,每项一个标签)
- `extra_contact` — 联系区下方那一行小字(可留空)

改完保存,**告诉我"已改",我重新部署**。

### 加新文章 / 今日

**走 Supabase 后台**(推荐):
- 打开 https://ws7e5ibajp8md.space.mcode.cn/admin.html
- 写完后,主页和旧站自动出现新内容

**直接调 API**:
- 走 REST:`POST https://sqoodnphbzuqwhlgtoos.supabase.co/rest/v1/posts`
- Headers: `apikey` / `Authorization: Bearer ...` / `Content-Type: application/json`
- Body: `{ "slug": "...", "title": "...", "category": "投资", "excerpt": "...", "content_md": "...", "is_published": true }`

### 换头像

1. 把图片放到 `assets/avatar.jpg`(1:1 正方形,建议 200×200 像素以上)
2. 编辑 `index.html`:
   ```html
   <!-- 旧: -->
   <div class="avatar" aria-hidden="true">AW</div>
   <!-- 新: -->
   <img class="avatar" src="assets/avatar.jpg" alt="Andy Wei" />
   ```
3. 告诉我"已加图片",我重新部署

### 改 nav 分类

编辑 `index.html` 的 `<nav class="topnav">` 块 + 对应的 `<section id="cat-...">` 块。
`data-category="..."` 必须和 Supabase `posts.category` 字段值一致。

## 怎么重新部署

部署工具是 `website_deploy`,只能从 session workspace 部署,所以流程是:

```powershell
# 1. 复制源到 session workspace
$src = "C:\Users\Administrator\MM_PersonalSite\personal_homepage"
$dst = "C:\Users\Administrator\.minimax\sessions\mvs_8aac4da067e848c9840e497ccd12a9f0\workspace\MM_personal_homepage_v1"
Remove-Item -Recurse -Force $dst -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dst | Out-Null
Copy-Item -Recurse -Path (Join-Path $src '*') -Destination $dst

# 2. 让 Mavis 调 website_deploy,传 node_id 做 in-place 更新(保持 URL 不变)
```

> **in-place 更新很重要** — 每次都传同一个 `node_id`,URL 才不会变,收藏的链接才不失效。

## 数据备份(防丢)

Supabase 数据目前是云端唯一真源。备份脚本:

```powershell
# 在 PowerShell 跑
powershell -NoProfile -ExecutionPolicy Bypass -File `
  "C:\Users\Administrator\MM_PersonalSite\tools\pull_supabase_backup.ps1"
```

跑完会生成:
- `site/data/MM_posts_full_backup_<日期>.json` — 全量文章(含完整 content_md)
- `site/data/MM_today_full_backup_<日期>.json` — 全量今日
- `site/posts/MM_<slug>.md` — 每篇独立 MD(任何编辑器可读)

**建议每周跑一次**,或挂 Windows 任务计划自动跑(让我做)。

## 自定义域名(待定)

候选:
- `andy-wei0821.com` — 可注册,Cloudflare Registrar 年费 ~$10-12(¥75-90)
- `andy-wei.cn` — 可注册,阿里云万网年费 ¥25-35,但要身份证实名 1-3 天

**待用户拍板**。拍板后我配 DNS 指向当前 mcode URL,或迁到 Cloudflare Pages(更适合自定义域名,自动 HTTPS,免费)。

## Supabase 凭证(记到密码管理器)

| 项 | 值 |
|---|---|
| 登录邮箱 | wht3141@163.com |
| Project URL | https://sqoodnphbzuqwhlgtoos.supabase.co |
| Publishable key | sb_publishable_-pHlNCAl_EUdfxWHHQGW_A_h9iJXGs7 |

拿不到这三项,无法恢复站点。

## 不想维护了 / 数据要导出

1. 跑上面的备份脚本(全量拉到本地)
2. Supabase 控制台 → Settings → Database → Download backup
3. 拿到的 JSON/MD + 数据库 dump 就是完整历史
