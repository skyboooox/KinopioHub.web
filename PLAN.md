# KinopioHub.web 上线前整合计划

## 0. 计划目标

本计划用于把当前接近上线的 KinopioHub.web 做一次完整整合，范围包含：

- 清理无用代码、生成物、系统文件、过期结构。
- 整理 README、DESIGN、部署说明、公开行为描述。
- 添加必要注释，只解释安全边界、协议规则、非显然运行时约束。
- 补齐上线前最小验证矩阵。

当前阶段：H（最终验收与发布准备）。

- 已完成：A、B、C、D、E、F、G
- 进行中：H
  - 已跑：`npm run typecheck`、`npm run build`、`npm run preview`（根路径与 `/?share=` 探活）、`npm audit --omit=dev`
  - 已补：本地 preview 行为复核、远端 `MushroomKingdom` 部署复核（7800/7801、share 直开、SPA fallback、缓存头）
  - 已补：代码结构复查，集中 subject 校验、JSON/Base64/clipboard 工具，并拆出 `SignalRow`、`JsonTree`
  - 待补：浏览器手工验收场景（连接/subject/request/share 全链路）、`package-lock.json` 及字体策略最终决策
- 未开始：无

注：文档工作只记录实施状态与交付边界，不替代代码实现判断。

## 1. 当前仓库快照

已读事实：

- 技术栈：Vite + React + TypeScript。
- 包管理：根目录存在 `package.json` 和 `package-lock.json`。
- 脚本：`npm run dev`、`npm run typecheck`、`npm run build`、`npm run preview`。
- 核心依赖：`kinopio-hub`、`react`、`react-dom`、`skyboxtool`、`@fontsource/ibm-plex-mono`。
- 入口：`index.html`、`src/main.tsx`、`src/App.tsx`。
- 核心模块：`src/core/session`、`src/core/watch`、`src/core/request`。
- 底层模块：`src/lib/kinopio`、`src/lib/nats-subject`、`src/lib/request`、`src/lib/share`、`src/lib/storage`、`src/lib/text`、`src/lib/browser`。
- UI 模块：`src/ui/CommandRail.tsx`、`src/ui/ServerInfoStrip.tsx`、`src/ui/ServerDossier.tsx`、`src/ui/SignalDrawer.tsx`、`src/ui/SignalRow.tsx`、`src/ui/JsonTree.tsx`、`src/ui/RequestPanel.tsx`、`src/ui/ShareSheet.tsx`、`src/ui/StatusPill.tsx`。
- 样式：`src/styles/tokens.css`、`base.css`、`layout.css`、`components.css`。
- 多语言：`src/i18n/locales/zh-CN.json`、`src/i18n/locales/en.json`。
- 部署：`deploy/mushroomkingdom/compose.yaml`、`deploy/mushroomkingdom/conf/Caddyfile`。
- 已归档旧计划：`archive/PLAN-2026-05-18.md`。

已发现的整合候选：

- `PLAN.md` 已存在并作为本次整合的主线记录。
- 存在 `.DS_Store`：根目录、`UI_ Refer_img/`、`public/`、`public/fonts/`。
- 存在 TypeScript build cache：`tsconfig.app.tsbuildinfo`、`tsconfig.node.tsbuildinfo`。
- `.gitignore` 已忽略 `*.tsbuildinfo`、`.DS_Store`、`package-lock.json`，但这些文件仍出现在工作区；实施时需要用 `git status --ignored` 判断是否已被跟踪。
- 代码热点较大：`src/styles/components.css` 约 2176 行，`src/ui/SignalDrawer.tsx` 约 728 行，`src/App.tsx` 约 594 行，`src/ui/ServerDossier.tsx` 约 398 行。
- 当前没有测试脚本、lint 脚本、format 脚本；上线前验证主要依赖 typecheck、build、浏览器手测和真实 NATS/Kinopio 行为验证。

## 2. 全局约束

- 实施前必须先看 `git status --short --ignored`，保护已有未提交改动。
- 不改授权范围外文件；如果用户只授权某个文件，严格只写该文件。
- 不重写历史、不强推、不删除用户数据、不清空本地存储或远端部署目录，除非用户明确授权。
- 不新增生产依赖，除非该阶段明确说明原因、替代方案、影响面和回滚方式。
- 清理必须可回滚：每阶段保持小 diff，不把功能重构、视觉调整、格式化、文档重写混在一个提交。
- 保留当前产品核心能力：连接 Kinopio/NATS、profile/localStorage、watch latest value、request-reply、share URL、主题、多语言、MushroomKingdom 静态部署。
- share URL 继续禁止携带 token、password、creds。
- localStorage 认证保存继续作为本地便利能力，不描述成加密保险箱。
- UI 继续遵循 `DESIGN.md` 的黑黄工业图纸方向，不改成通用 SaaS 风格。

## 3. 阶段 A：上线基线冻结

目标：

- 确认当前上线候选状态、未提交改动、可验证命令和不可动边界。

范围：

- 只读检查仓库状态、包脚本、部署配置、公开文档。
- 不修改源码。

交付物：

- 一份基线记录：当前分支、未提交文件、忽略文件、可运行脚本、部署入口、已知风险。
- 明确后续阶段是否需要拆提交。

必要检查：

```bash
git status --short --ignored
npm run typecheck
npm run build
```

通过标准：

- 清楚区分已跟踪改动、未跟踪文件、被忽略生成物。
- `typecheck` 和 `build` 的当前结果被记录。
- 发现失败时先记录失败，不进入清理阶段盲改。

风险与回滚：

- 此阶段只读，无代码回滚风险。
- 如果发现大量未提交改动，先和用户确认是否全部纳入本次整合。

## 4. 阶段 B：无用文件与生成物清理

目标：

- 移除不应进入上线交付的系统文件、缓存文件、过期计划残留和无用资产。

范围内候选：

- `.DS_Store`
- `UI_ Refer_img/.DS_Store`
- `public/.DS_Store`
- `public/fonts/.DS_Store`
- `tsconfig.app.tsbuildinfo`
- `tsconfig.node.tsbuildinfo`
- 其他 `*.log`、`*.tmp`、`*.bak`、`*.old`

需要谨慎确认的候选：

- `package-lock.json`：当前 `.gitignore` 忽略它，但项目使用 npm 命令。实施时必须确认它是否已跟踪，以及仓库是否要保留锁文件。接近上线时通常建议保留锁文件并移出 `.gitignore`，但如果用户明确不提交锁文件，则保持现状。
- `archive/PLAN-2026-05-18.md`：它是历史计划，不默认删除。只有在 README/DESIGN 已覆盖有效内容且用户同意归档策略时再处理。
- `UI_ Refer_img/`：设计来源仍被 `DESIGN.md` 引用，不默认删除。
- `public/fonts/HYFengShangHei-45W.ttf`：当前 `base.css` 未声明 45W 字重。实施时确认是否实际被 CSS 或浏览器字体回退使用，再决定删除或补声明。

交付物：

- 删除明确无用的系统文件和生成缓存。
- 调整 `.gitignore` 与实际包管理策略一致。
- 保留有设计、部署或运行价值的资产。

验证：

```bash
git status --short --ignored
npm run typecheck
npm run build
```

通过标准：

- 工作区不再出现应忽略的系统文件和 TypeScript cache。
- 包管理策略明确：要么提交锁文件，要么文档说明不使用锁文件。
- 构建输出不依赖被删除文件。

## 5. 阶段 C：代码结构整合

目标：

- 降低上线前维护风险，清理重复逻辑和过大的模块，同时不改变公开行为。

范围：

- `src/App.tsx`
- `src/ui/SignalDrawer.tsx`
- `src/ui/ServerDossier.tsx`
- `src/styles/components.css`
- `src/core/session`
- `src/core/watch`
- `src/core/request`
- `src/lib/*`

建议拆分：

- 从 `src/App.tsx` 抽出 profile 草稿操作、share copy 状态、主题/语言偏好处理，避免入口组件继续增长。
- 从 `src/ui/SignalDrawer.tsx` 抽出 JSON tree、Base64 decode、write/publish editor、row card 子组件。
- 从 `src/ui/ServerDossier.tsx` 抽出 profile selector、server list、auth form、session summary。
- 从 `src/styles/components.css` 按组件或区域拆分，至少分离 command rail、server strip、signal drawer、request panel、modal/dossier、shared controls。

业务边界：

- L1：`src/main.tsx`、`src/App.tsx`、`src/ui/*` 只负责页面装配、输入和展示。
- L2：`src/core/*` 负责连接、watch、request、诊断、跨模块状态。
- L3：`src/lib/kinopio/server-profile.ts`、`src/lib/request/request-config.ts`、`src/lib/nats-subject/watch-subject.ts` 保持业务规则函数。
- L4：URL、storage、identity、base64、JSON 格式化等纯函数应无 React 依赖。

清理重点：

- 合并重复的 subject split 逻辑，避免 watch、request、SignalDrawer 各自维护不一致实现。
- 合并重复 timestamp 创建逻辑，或明确保留在各 hook 中的原因。
- 检查 `LocalizedText`、`msg()`、裸字符串错误的混用，统一错误可本地化策略。
- 检查 `TextEncoder`、`TextDecoder`、`atob`、`btoa` 使用点，集中处理浏览器兼容和异常。
- 检查 `scope.dispose()`、subscription unsubscribe、timer cleanup，确保 React StrictMode 下不会重复泄漏。
- 检查 `inert` 属性 TypeScript/React 类型兼容性，避免生产构建或浏览器可访问性问题。
- 删除无意义 wrapper、过期 placeholder class、未使用 CSS selector、未使用 i18n key。

非目标：

- 不重做 UI 视觉方向。
- 不引入路由、状态管理库、组件库。
- 不改变 share schema，除非发现必须修复的兼容问题。

验证：

```bash
npm run typecheck
npm run build
npm run preview
```

浏览器验证：

- 打开首页无白屏。
- 默认 demo WSS 自动连接或显示明确失败原因。
- 输入 `chat` 后实际订阅显示 `chat.>`。
- 输入 `a.b.*`、`a.b.>` 合法。
- 输入 `a..b`、`a.b.>.c` 显示错误。
- request subject 不允许 wildcard。
- request payload 可为空、可格式化 JSON、非法 JSON 有错误。
- 主题和语言切换可持久化。
- Settings 弹窗可打开、关闭、Escape 关闭。
- Share URL 可复制、可恢复非敏感配置。

通过标准：

- 用户可见行为与清理前一致或更稳定。
- 大文件被拆分后边界清楚，无循环依赖和重复业务规则。
- StrictMode 下没有明显重复连接、重复订阅、重复 timer 残留。

## 6. 阶段 D：UI、可访问性与多语言整理

目标：

- 上线前统一可见文案、交互状态、键盘可用性和中英文词条。

范围：

- `src/ui/*`
- `src/i18n/core.ts`
- `src/i18n/locales/zh-CN.json`
- `src/i18n/locales/en.json`
- `src/styles/*`

任务：

- 对齐中英文 key，删除未使用 key，补齐 UI 中仍使用但词典缺失的 key。
- 检查所有 dialog 是否有 `role="dialog"`、`aria-modal`、标题、关闭按钮、Escape、背景点击策略。
- 检查表单字段 `label`、错误提示、`aria-invalid`、按钮 disabled 状态。
- 检查暗色/亮色 token 是否覆盖全部状态：connected、connecting、disconnected、error、reachable、failed、fresh、success。
- 检查移动端布局：CommandRail、ServerInfoStrip、SignalDrawer、RequestPanel、ServerDossier 不应横向溢出。
- 检查动画和 `prefers-reduced-motion`，避免核心信息依赖动画才能理解。
- 检查字体声明和实际 `public/fonts` 文件是否一致。
- 检查 JSON、Base64、binary payload 展示是否可读，不泄露隐藏凭据。

验证：

```bash
npm run typecheck
npm run build
npm run preview
```

浏览器断点：

- 320px
- 390px
- 768px
- 1280px
- 1680px

通过标准：

- 中英文切换后无裸 key。
- 键盘可完成主要流程：输入 subject、打开设置、保存连接、展开 request、发送 request、复制 share URL。
- 移动端无水平滚动。
- 暗色和亮色都可读。

## 7. 阶段 E：文档同步

目标：

- 让 README、DESIGN、部署说明、PLAN 与实际代码一致，避免上线后按旧文档操作。

范围：

- `README.md`
- `DESIGN.md`
- `PLAN.md`
- `deploy/mushroomkingdom/compose.yaml`
- `deploy/mushroomkingdom/conf/Caddyfile`
- 可能新增的 `docs/`，只有内容明显超过 README 时才创建。

任务：

- README 改为当前可交付能力与操作清单，不再使用“阶段化叙述”。
- README 中 `PLAN.md` 链接应指向当前上线整合计划。
- DESIGN 只保留会影响 UI 决策和验收的规则，删掉已过期或已完成但不再指导实现的描述。
- 部署说明与 `deploy/mushroomkingdom` 实际配置同步，包括端口、证书路径、缓存策略、SPA fallback。
- 明确 share URL 不携带认证信息，request payload 会进入 share URL，避免敏感业务数据。
- 明确 localStorage 认证风险。
- 记录 `npm run typecheck`、`npm run build`、`npm run preview` 是上线前最小验证。
- 如果最终决定提交 `package-lock.json`，文档和 `.gitignore` 必须同步。

验证：

```bash
npm run typecheck
npm run build
npm run preview
```

人工检查：

- README 中所有命令真实存在。
- README 中所有路径真实存在。
- README 中所有公开行为可在 UI 或源码中找到。
- 中文和英文 UI 文案与 README 描述不冲突。

通过标准：

- 用户可以只看 README 完成安装、开发、验证、部署。
- DESIGN 可以作为 UI 回归验收来源。
- PLAN 只保留未完成或上线整合相关事项，不堆旧实施流水账。

本阶段完成标准：

- `README.md`、`DESIGN.md`、`PLAN.md` 的内容与当前代码结构、共享行为一致。
- 部署章节与 `deploy/mushroomkingdom/compose.yaml` / `conf/Caddyfile` 一致。
- `npm run typecheck`、`npm run build`、`npm run preview` 三命令可执行并通过。

## 8. 阶段 F：必要注释补齐

目标：

- 添加少量高价值注释，解释无法从代码一眼看出的协议、安全和生命周期约束。

应添加注释的位置：

- share state 编解码：说明 schema version、base64url、认证信息排除边界。
- profile storage：说明 `rememberAuth` 只是 localStorage 便利保存，不是加密保护。
- subject 归一化：说明普通 subject 自动追加 `.>`，wildcard 输入必须遵守 NATS token 规则。
- request subject 校验：说明 request-reply 必须使用精确 subject，不允许 wildcard。
- session/watch cleanup：说明 StrictMode、重连、unsubscribe、`scope.dispose()` 的清理顺序。
- server diagnostics：说明 probe 是额外短连接，不代表当前主 session 一定使用该节点。
- SignalDrawer Base64 decode：说明只对看起来像可打印 UTF-8 的值提供展示切换。

不应添加注释的位置：

- 自解释 props。
- CSS 普通布局值。
- 可从类型名直接读出的字段。
- 过时 TODO。
- 对代码逐行复述的解释。

验证：

```bash
npm run typecheck
npm run build
```

通过标准：

- 注释数量少，但覆盖高风险规则。
- 注释不会和 README、DESIGN、实际行为冲突。
- 注释不包含密钥、真实私有服务器凭据、临时调试说明。

## 9. 阶段 G：部署与安全上线检查

目标：

- 确认静态部署配置、安全边界和浏览器数据处理符合上线状态。

范围：

- `deploy/mushroomkingdom/compose.yaml`
- `deploy/mushroomkingdom/conf/Caddyfile`
- README 部署章节
- share URL、localStorage、auth 表单、request payload 相关 UI

任务：

- 确认 Caddy `try_files {path} /index.html` 支持 SPA share URL 直开。
- 确认 assets 使用长期缓存，`index.html` 不长期缓存。
- 确认 HTTP/HTTPS 端口和证书路径与 README 一致。
- 确认容器只挂载静态 `dist`、Caddy 配置和证书只读路径。
- 确认页面不把 token、password、creds 写入 URL。
- 确认清空本地保存只清理当前应用 key，不误删同源其他数据。
- 确认连接错误不会把完整敏感连接串展示到 UI。
- 确认生产路径无调试后门、硬编码私钥、临时绕过。

验证：

```bash
npm run build
npm run preview
```

可选真实部署验证：

```bash
rsync -az --delete ./dist/ MushroomKingdom:/root/KinopioHub.web/dist/
rsync -az ./deploy/mushroomkingdom/conf/ MushroomKingdom:/root/KinopioHub.web/conf/
rsync -az ./deploy/mushroomkingdom/compose.yaml MushroomKingdom:/root/KinopioHub.web/compose.yaml
ssh MushroomKingdom 'cd /root/KinopioHub.web && docker compose up -d'
```

通过标准：

- 本地 preview 可打开并完成核心流程。
- 远端部署后 `https://hub.skyboooox.com:7800` 和 `http://hub.skyboooox.com:7801` 可访问。
- share URL 直开可恢复非敏感状态。
- localStorage 中认证只在用户选择 remember auth 时存在。

## 10. 阶段 H：最终验收与发布准备

目标：

- 用一组最小但覆盖核心风险的检查确认可以上线。

必跑命令：

```bash
npm run typecheck
npm run build
npm run preview
```

建议补充命令：

```bash
npm audit --omit=dev
```

浏览器验收场景：

- 初次打开：无本地存储时创建默认 demo profile。
- 连接：demo WSS 成功或失败时有明确状态。
- Settings：新增、选择、删除 profile；保存 server list；切换 ordered/random/latency；设置 timeout。
- Auth：none、token、user-pass、creds 表单校验；remember auth 风险提示可见。
- Watch：普通 subject 自动追加 `.>`；合法 wildcard 保持原样；非法 subject 显示错误。
- Latest value：同一 subject 只保留最新值，count 增加，最新行置顶。
- Signal edit：可编辑 payload、格式化 JSON、写回、重置、console.log。
- Base64：可识别可打印 UTF-8/base64url，无法解析时不误显示。
- Request：精确 subject、JSON payload、timeout、成功响应、timeout/no responder 错误。
- Share：复制 URL、打开 URL 恢复 servers、selection mode、watch subject、request subject、payload、timeout。
- Share 安全：URL 不含 token、password、creds。
- UI：中英文、亮色/暗色、移动端、键盘操作、reduced motion。
- 部署：本地 preview 和 MushroomKingdom 静态服务行为一致。

发布前检查：

- `git status --short --ignored` 中只剩预期改动。
- README、DESIGN、PLAN 与实际实现一致。
- 无 `.DS_Store`、`*.tsbuildinfo`、临时日志、临时备份文件进入提交。
- 无密钥、令牌、私钥、生产密码进入提交。
- 若保留 `package-lock.json`，`.gitignore` 和 README 与该策略一致。
- 若不保留 `package-lock.json`，最终说明写清原因和复现风险。

通过标准：

- 所有必跑命令通过。
- 核心浏览器验收场景通过。
- 部署说明能复现上线流程。
- 剩余风险被明确列出，不隐藏。

## 11. 建议实施顺序

1. 阶段 A：冻结基线。
2. 阶段 B：清理生成物和无用文件。
3. 阶段 C：代码结构整合。
4. 阶段 D：UI、可访问性、多语言整理。
5. 阶段 E：文档同步。
6. 阶段 F：必要注释补齐。
7. 阶段 G：部署与安全检查。
8. 阶段 H：最终验收与发布准备。

## 12. Sprint 契约模板

每个实施 Sprint 开始前填入：

```json
{
  "goal": "",
  "scope": [],
  "out_of_scope": [],
  "definition_of_done": [],
  "verification": [],
  "pass_fail_threshold": [],
  "risks": [],
  "rollback": []
}
```

默认回滚方式：

- 小阶段使用普通 git diff 回滚。
- 删除文件前确认不是已跟踪必需资产。
- 部署变更先本地 build/preview，再远端替换。
- 安全策略变更必须先说明影响面，再实施。

## 13. 当前未决问题

- `package-lock.json` 是否应作为上线锁文件提交。
- `public/fonts/HYFengShangHei-45W.ttf` 是否保留或补 CSS 声明。
- `archive/PLAN-2026-05-18.md` 是否长期保留为历史记录。
- 是否需要新增 lint/format/test 脚本，还是保持上线前只用 typecheck/build/browser 验收。
- 是否需要真实远端部署验证，还是本轮只做到本地 build/preview。
