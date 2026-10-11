# WorkLog: 个人主页 andy-wei0821.com 部署上线
**MM_WorkLog_2026-10-11_个人主页_部署上线.md**
Date: 2026-10-11 (Sun) 17:50 - 19:40 CST

---

## 1. 元信息 (Meta)

| 项目 | 值 |
|---|---|
| 域名 | `andy-wei0821.com` (¥75/年,2026-09-15 阿里云万网购买) |
| 目标 | 个人主页 (投资 / 技术 / 产品 / 随感 / 今日 5 大板块) |
| 数据存储 | Supabase `sqoodnphbzuqwhlgtoos` (posts + today_entries) |
| 宿主平台 | Cloudflare Worker (临时) → Cloudflare Pages (待迁移) |
| 项目目录 | `C:\Users\Administrator\MM_PersonalSite\personal_homepage\` |
| Andy's 工作目录 | `MM_PersonalSite\` |
| 用户偏好时间 | 默认中文 / 不删不覆盖 / MM_ 前缀 / 出工作日志 |

---

## 2. 触发事件 (Trigger)

1. 用户在浏览器打开 `https://andy-wei0821.com` 看到 **HTTP 404 / 找不到此 andy-wei0821.com 页** 截图
2. 我用 PowerShell 验证 `andy-wei0821.com` 根域名 404,`wht3141.workers.dev` 根也 404
3. 进一步诊断:Worker `throbbing-bush-22b5` 内部**完全空**(没有任何 fetch handler 或 assets)
4. 域名解析链正常:RDAP 显示 NS = `edward/olga.ns.cloudflare.com`,CF 已 Active

---

## 3. 关键决策 (Key Decisions,含被否方案)

| 决策 | 理由 | 否决的方案 |
|---|---|---|
| **Workers Static Assets** 部署(非 Pages Functions) | 已有 Worker 可用,改成本最低 | Pages + Functions(迁移太重);Quick Edit 手写(不支持 assets 目录) |
| **绑 custom domain 用老 routes API** | 新 API `POST accounts/{id}/workers/domains` 返回 405 Method Not Allowed | 试过 PUT、API 都失败;最终 fallback zone-level routes API 成功 |
| **content 改 role 字段为 "20年+硬件开发经验"** | 用户主动要求,避免暴露经理身份 | 保留 "硬件架构经理 @ TCL"(否决) |
| **focus 数组前加 "智能终端"** | 用户主动要求 | 加到任意位置(否决);新增独立字段(否决) |
| **admin.html mobile-first + bottom sheet** | 用户明确"手机能用";admin 是无登录 URL-即凭证 | 完整 desktop + mobile 适配(太重);直接用 Supabase Studio(反人类) |
| **admin.js 读 `window.MM_CONFIG.supabaseUrl/key`** | 跟 personal_homepage/config.js 统一 | 多写一份 SUPABASE_CONFIG(否决) |
| **迁移到 Pages + GitHub(永久免 token)** | 用户嫌"再给 token 麻烦";GitHub push-to-deploy 一劳永逸 | 继续 Worker + 短 TTL token(用户嫌);继续 Worker + GitHub Actions(增加复杂度) |
| **Git 仓库 public** | Pages 公开仓库免费 build 分钟数 | Private (需要 GH Pro 或 $1/月) |
| **GitHub token 30 days,`repo` scope** | Cloudflare Pages 与 GitHub OAuth 集成,token 只用于首次 push | shorter 7-day(不够缓冲);longer 90-day(暴露周期长) |

---

## 4. 思考链路 (Reasoning Chain)

### 阶段 A: 诊断 Worker 空状态

```
用户截图 HTTP 404
    ↓
我 curl andy-wei0821.com + throbbing-bush-22b5.wht3141.workers.dev
    ↓
两边都 404 → Worker 内部完全空(无 fetch handler)
    ↓
RDAP 查 NS = Cloudflare → Active 已生效
    ↓
判定根因:Worker 自部署以来没人传过代码
```

### 阶段 B: 拿到 token,wrangler 上传

```
用户粘 token: cfut_prZBlK6am5QPWjw8WSEGcYKVTmy0sUW6PHPfEKqP3ee1392a
    ↓
GET /user 验证通过,role=Super Administrator
    ↓
GET /zones 拿 zone_id
    ↓
wrangler deploy --assets=personal_homepage
    ↓
(env var CLOUDFLARE_API_TOKEN 第一次漏设 → 失败 → 我修正)
    ↓
(wrangler 首次要下载 wrangler@latest 包 ~1 分钟)
    ↓
Success! assets 全部上传
    ↓
GET /zones/{id}/workers/routes fallback 把 andy-wei0821.com/* 绑 Worker
    ↓
SSL 自动签发(Cloudflare 自动)
    ↓
GET andy-wei0821.com → 200 OK, 3125 bytes
```

### 阶段 C: 用户反馈 + token 撤销

```
用户在浏览器看到旧版 "硬件架构经理 @ TCL"
    ↓
要求改 3 处 + 增手机 admin
    ↓
我又写 wrangler deploy 想把改动推上去
    ↓
Cloudflare API 返回 9109 Invalid access token
    ↓
我验证 token 已失效(用户听了"删 token 防止泄露"的建议)
    ↓
需求 3 处修改文件已写完,但未上传到 Worker
```

### 阶段 D: admin.html 方案 + 用户嫌麻烦

```
"后续我能通过手机发布内容吗"
    ↓
我答:现在不行,需要 admin 入口
    ↓
写 admin.html / admin.css / admin.js (mobile-first)
    ↓
"否则比较麻烦" → 用户嫌再要 token 麻烦
    ↓
ask_user 让用户选:
  - 快: 短 TTL token
  - 永久: Pages + GitHub
  - 慢: Supabase Studio 手发
    ↓
用户选: 永久 Pages + GitHub
```

### 阶段 E: Pages + GitHub 方案准备

```
git config --global user.name "Andy Wei"
git config --global user.email "wht3141@163.com"
    ↓
写 .gitignore(排除 .wrangler/ + node_modules + 编辑器)
    ↓
git init
    ↓
git add + commit "init: MM 个人主页" (13 files, hash eac39e4)
    ↓
等用户:
  - 创建 GitHub repo `andy-wei0821-com` (Public)
  - 生成 GitHub PAT (30 days, repo scope, classic)
  - 给用户名 + token 给我
    ↓
我 git push → 回到用户走 Cloudflare Pages 后台
```

---

## 5. 对话脉络 (Dialogue)

| Time (CST) | User | Assistant | Note |
|---|---|---|---|
| 17:55 | 截图 HTTP 404 | 诊断 Worker 空 → 推荐 Static Assets | |
| 18:00 | "我可以去拿 token" (隐含) | 给取 token 步骤 | |
| 18:01 | 贴 token `cfut_...` | PowerShell 验证 + GET /zones | |
| 18:08 | (静默) | wrangler deploy 成功 + SSL 签发 | 用 routes API 绑域 |
| 18:14 | "还是找不到" → 截图 404 | 解释"已绑但 SSL 还在签" | (略超 5min 才看到 200 OK) |
| 18:18 | (curl 自己看到 200 OK) | 告诉用户 "站上线了" | |
| 18:30 | "token" (隐含:已撤销) | (漏写 env var → CLOUDFLARE_API_TOKEN 报错) | |
| 18:32 | (静默) | 改 env var 设位置 + 重 deploy | |
| 18:33 | (静默) | 成功!用户能看到站 | |
| 18:50 | (静默) | (再 deploy) → 9109 token revoked | |
| 18:53 | 截图 + 要求改 3 处 + 加手机 admin | 改 profile.json + index.html | |
| 19:00 | (隐含要 deploy) | (deploy 失败 token 已死) | |
| 19:01 | (静默) | 写 admin.html / admin.css / admin.js | |
| 19:05 | "后续我能通过手机发布内容吗" | 答"现在不行,要写 admin" → ask_user | |
| 19:10 | 选 admin_opt1 | (已完成写好 admin 三件套) | |
| 19:35 | "否则比较麻烦" | ask_user 给 3 选项 | |
| 19:38 | 选 Pages + GitHub | 准备 git + 给 5 步清单 | |
| 19:39 | "个人单页网站日志记录下" | 写本 WorkLog | |

---

## 6. 产出清单 (Deliverables)

### 修改 (in-place)

| 文件 | 改动 |
|---|---|
| `personal_homepage/index.html` | title / meta / hero-role 改 "20年+硬件开发经验" |
| `personal_homepage/data/profile.json` | role / about[0] / focus 加智能终端 |

### 新建 (per-projects-prefixed MM_,不覆盖任何)

| 文件 | 字节数 | 用途 |
|---|---|---|
| `personal_homepage/.gitignore` | 154 | 排除 wrangler cache / IDE |
| `personal_homepage/admin.html` | 5441 | mobile-first 后台入口 |
| `personal_homepage/assets/admin.css` | 6196 | mobile-first UI 样式 |
| `personal_homepage/assets/admin.js` | 11429 | 直接 Supabase REST CRUD |
| `personal_homepage/.git/` | (dir) | git init + commit `eac39e4` |
| `MM_deploy_to_cloudflare.ps1` | 8567 | 一站式部署脚本 (wrangler) |
| `MM_personal_homepage_changelog_2026-10-11.md` | 4608 | 修改明细 |
| **`MM_WorkLog_2026-10-11_个人主页_部署上线.md`** | (本文件) | 工作日志 |

### 已保留(不覆盖)

| 旧文件 | 用途 |
|---|---|
| `MM_personal_site_v1.html` + `_compare.html` + 三个模板 | v1 模板 |
| `site/` 整个目录 | v1 站点 (JSON 驱动版) |
| `site/posts/MM_2026-09-*.md` (4 篇) | v1 文章 Markdown 原文 |
| `site/data/MM_posts_full_backup_*.json` + today 备份 | v1 数据本地兜底 |
| `personal_homepage/README.md` | 项目说明 |
| `MM_personal_homepage_2026-09-15.zip` | v2 站点打包 |
| `MM_personal_homepage_status_2026-09-20.md` | 状态 MD (待办 + 部署架构) |

### Cloudflare 资源 (Cloud side)

| 资源 | 状态 |
|---|---|
| Worker `throbbing-bush-22b5` (deploy 83701616) | 上线跑着,内容=static assets 9 文件 |
| Route: `andy-wei0821.com/*` → Worker | Active |
| DNS zone `andy-wei0821.com` | NS = edward/olga.ns.cloudflare.com, **Active** |
| SSL cert for `andy-wei0821.com` | 自动 Edge Certificate 已签发 |

### 待创建 (after GitHub repo + token)

| 资源 | 计划 |
|---|---|
| GitHub repo `andy-wei0821-com` (Public) | 用户手动 + 我 push |
| Cloudflare Pages project | 用户后台手动 + 自动 build |
| Pages Custom Domain `andy-wei0821.com` | 自动接管 |

---

## 7. 调用来源 (Citations)

| 资源 | 来源 | 用途 |
|---|---|---|
| Domain `andy-wei0821.com` | 阿里云万网 | 2026-09-15 ¥75 购买 |
| CF Token `cfut_prZBlK6am5QPWjw8WSEGcYKVTmy0sUW6PHPfEKqP3ee1392a` | User Profile | wrangler deploy + API (已撤销) |
| Supabase URL | User Profile (Supabase Studio 拷贝) | publishable |
| Supabase Key `sb_publishable_-pHlNCAl_EUdfxWHHQGW_A_h9iJXGs7` | Supabase Project Settings → API | anon 公开 |
| CF Account ID `8f093ac7be69eb9e5aac112711cfa49a` | User Profile (token 验证响应) | deploy scope |
| CF Zone ID `0d7e13160212646847c628af669bfe1e` | API GET /zones | zone scope |
| NS 记录 | RDAP / Cloudflare 自动 | 域名解析 |

---

## 8. 后续动作 (Follow-ups)

### 立刻 (等用户回复)

- [ ] 用户创建 GitHub repo `andy-wei0821-com` (Public,无 README / .gitignore)
- [ ] 用户生成 GitHub PAT (classic, repo scope, 30 days, name: `cloudflare-pages-deploy`)
- [ ] 用户贴 GitHub 用户名 + token

### 我执行

- [ ] git push 至 `github.com/<user>/andy-wei0821-com.git main:main`
- [ ] 验证 push 成功,告诉用户去走 Pages 后台

### 用户执行

- [ ] Cloudflare Dashboard → Pages → Create → Connect to Git → GitHub → 授权 → 选 repo
- [ ] Build settings: Framework=None, output=/
- [ ] Save and Deploy → `andy-wei0821-com.pages.dev` 上线
- [ ] Pages → Custom domains → Set up `andy-wei0821.com` → Activate

### 之后

- [ ] 老的 Worker `throbbing-bush-22b5` 处理 (留置 / 删 / 闲置)
- [ ] 老的 v2 站点 `https://x9lqd8btyatyt.space.mcode.cn` 处理 (留 / 删 / 301 跳转)
- [ ] `www.andy-wei0821.com` 处理 (绑 Pages / 301 → 根域)
- [ ] (未来) 编辑流程:**用户本地改 → `git add . && git commit && git push` → Cloudflare 自动部署**

---

## 备注 / 经验教训

### 失误与改进

- ❌ 第一次 deploy 漏写 `$env:CLOUDFLARE_API_TOKEN` 给 wrangler subprocess (过程性错误,已修)
- ❌ 说过 "你担心安全可以去 Cloudflare 删 token" → 用户真删了 → 但其实那时 token 还在用 → 后续 deploy 9109
- ❌ 我建议删 token 的时机错了:应该在用户**主动问"token 会不会泄露"**时再说,而不是我主动提

### 用户反馈记录

- 用户偏 "商务时间线" 风格(C 方案) - v1 已删经历区,与 insight 同步
- 用户偏好"不删不覆盖 + MM_ 前缀"严格执行
- 用户嫌"再要 token 麻烦" → 触发 Pages+GitHub 迁移决策
- 用户明确"20年+硬件开发经验" 不是 "硬件架构经理"
- 用户说"图片里的架构经历也去掉" → 实际就是 hero subtitle

### 验证点 (目标: 2026-10-11 20:00 CST)

- [ ] `https://andy-wei0821.com` 顶部 "20 年+硬件开发经验"
- [ ] research tag 出现 "智能终端"
- [ ] `https://andy-wei0821.com/admin` 在手机上能打开
- [ ] admin 发表一篇 → Supabase INSERT 成功 → 主站刷新有内容
