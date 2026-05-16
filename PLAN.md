# KinopioHub.web 分阶段实施计划

## 0. 项目目标

KinopioHub.web 是一个从 0 开始的浏览器端实时变量观察工具，目标是在 Web 页面中连接 Kinopio / NATS 服务，按 subject 查看变量最新值，并提供 request-reply 的请求入口。

首版核心能力：

- 右上角提供 subject 输入框。
- 用户输入普通 subject 时，自动订阅所有子层。例如输入 `a.b.c` 时，归一化为 `a.b.c.>`。
- 如果用户已经输入 NATS wildcard，则尊重用户输入并做合法性校验。
- 只显示每个命中 subject 的最新值，不做历史列表。
- 默认使用 `kinopio-hub` 的 demo WSS 服务器，同时允许用户手动填写 servers 列表。
- 在 Web 中显示 NATS 服务器基本信息。
- 支持填写认证信息，并保存到浏览器本地，方便下次快速填入。
- 支持 request-reply：向指定 subject 发送请求并显示响应。
- 支持复制分享 URL；打开分享 URL 后恢复服务器设置、subject、request 配置等非敏感状态。

非目标：

- 首版不实现浏览器端 `serve()`。
- 首版不做历史消息回放、持久化消息存储或 JetStream 管理。
- 首版不实现账号、团队、多用户同步或服务端数据库。
- 首版不在分享 URL 中默认携带认证凭据。

## 1. 当前已确认事实

- 当前仓库是早期初始化状态，根目录已有 `AGENTS.md`、`README.md`、`package.json`。
- `UI_ Refer_img/` 下已有 6 张 UI 参考图，视觉方向已沉淀到 `DESIGN.md`。
- `DESIGN.md` 是后续 UI 实施和视觉验收的主要依据；`PLAN.md` 只记录阶段、范围和验证。
- 当前依赖已有 `kinopio-hub@^2.1.0`。
- `node_modules/kinopio-hub/README_CN.md` 明确支持 `pub()`、`sub()`、`req()`、`serve()`。
- `node_modules/kinopio-hub/types/index.d.ts` 明确导出 `KinopioHub`、`Scope`、`Variable`，其中 `Variable` 支持 `sub()` 和 `req()`。
- `kinopio-hub` 根入口是浏览器友好入口，不引入 Node-only leaf runtime。
- `kinopio-hub` 运行时会把未知连接选项透传给底层 NATS connect options，但当前 TypeScript 类型没有显式声明认证字段；实施阶段需要用本地类型封装或推动上游类型补齐。

## 2. 外部规则依据

- React 官方文档允许在约束不适合全栈框架时，从 Vite 等构建工具开始搭建 React 应用。
- Vite 官方提供 React + TypeScript 模板，适合纯客户端 SPA。
- NATS subject 使用 `.` 分层；`*` 只匹配单个完整 token，不能匹配 token 内部前缀；`>` 匹配尾部一个或多个 token，并且只能出现在最后。
- NATS request-reply 本质是向请求 subject 发布消息，并带上 reply subject 等待响应。
- NATS monitoring 可以通过 HTTP monitoring endpoint 暴露 `/varz`、`/connz`、`/subsz`、`/healthz` 等 JSON 信息；浏览器端能否读取取决于服务端是否启用 monitoring、HTTPS/CORS 和网络可达性。
- Web Storage 可用于浏览器本地键值保存，但只能保存字符串，并且可能被同源脚本读取；因此认证信息保存必须明确标记为本地便利能力，不应默认进入分享 URL。

参考链接：

- https://react.dev/learn/start-a-new-react-project
- https://vite.dev/guide/
- https://docs.nats.io/nats-concepts/subjects
- https://docs.nats.io/using-nats/developer/receiving/wildcards
- https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams

## 3. 技术选型

首选技术栈：

- Vite
- React
- TypeScript
- `kinopio-hub`

选择理由：

- 项目目标是纯客户端实时控制台，不需要 SSR、数据库或服务端路由。
- Vite + React + TypeScript 初始化成本低，适合从 0 搭建 SPA。
- React 的组件和状态模型适合表达连接状态、服务器配置、subject 归一化、最新值面板和 request 表单。
- TypeScript 可以约束 Kinopio payload、配置持久化格式、分享 URL schema 和 JSON 解析结果。

暂不引入：

- UI 组件库：首版手写轻量组件，避免样式和包体过早膨胀。
- 状态管理库：首版使用 React state、context 和自定义 hook；只有跨页面复杂度上升后再评估 Zustand 等库。
- 路由库：首版单页应用即可；分享状态通过 URL query/hash 表达。

## 4. 架构边界

遵循仓库 `AGENTS.md` 的四层架构思想，但根据前端项目实际命名落地。

### L1 Entry

职责：

- Vite 入口。
- React 根组件。
- 页面布局、输入框、按钮、表单和可视化区域。
- 只收集用户输入并转发给 L2，不直接操作 Kinopio 连接细节。

候选目录：

- `src/main.tsx`
- `src/App.tsx`
- `src/ui/`

### L2 Core

职责：

- 管理应用会话状态。
- 编排服务器配置、连接生命周期、subject 订阅、request-reply 和分享 URL 同步。
- 决定何时重连、何时取消订阅、何时写入本地存储。
- 保存用户可见错误状态和验证状态。

候选目录：

- `src/core/session/`
- `src/core/share/`
- `src/core/settings/`

### L3 Business

职责：

- 实现可组合的业务能力。
- 例如 subject 归一化、服务器 profile 管理、NATS monitoring 信息整理、request payload 处理、最新值模型转换。
- L3 不拥有跨功能编排权。

候选目录：

- `src/features/subject-watch/`
- `src/features/request-reply/`
- `src/features/server-settings/`
- `src/features/server-info/`

### L4 Atom

职责：

- 微小、可复用、无业务编排的底层函数。
- 例如 JSON parse / stringify、URLSearchParams 编解码、localStorage adapter、Kinopio client wrapper、NATS subject validator。

候选目录：

- `src/lib/kinopio/`
- `src/lib/storage/`
- `src/lib/url-state/`
- `src/lib/json/`
- `src/lib/nats-subject/`

## 5. 数据模型草案

### ServerProfile

用途：保存一组可快速连接的服务器配置。

字段草案：

- `id`: 本地生成的 profile ID。
- `name`: 用户可读名称。
- `servers`: WSS 服务器 URL 数组。
- `monitorUrl`: 可选 NATS monitoring base URL，例如 `https://demo.nats.io:8222`。
- `serverSelectionMode`: `ordered`、`random` 或 `latency`。
- `timeoutMs`: 请求和连接超时。
- `auth`: 可选认证配置。
- `rememberAuth`: 是否把认证配置保存到浏览器本地。

### AuthConfig

用途：描述浏览器可填入的认证信息。

字段草案：

- `mode`: `none`、`token`、`user-pass`、`creds` 或后续扩展值。
- `token`: 可选 token。
- `username`: 可选用户名。
- `password`: 可选密码。
- `creds`: 可选 NATS creds 文本。

安全边界：

- 认证信息只在用户选择记住时写入 localStorage。
- 分享 URL 默认不包含认证信息。
- 页面需要显示“本地保存不是加密保险箱，同源脚本可读取”的提示。
- 后续如果用户强制要求分享认证信息，必须新增显式开关和明显风险确认，不作为首版默认行为。

### WatchConfig

用途：描述当前观察目标。

字段草案：

- `rawSubjectInput`: 用户原始输入。
- `normalizedSubject`: 实际订阅 subject。
- `normalizationMode`: `explicit-wildcard` 或 `all-descendants`。
- `maxRows`: 最新值表最大 subject 数。

归一化规则：

- 输入为空时不订阅。
- 输入包含合法 `*` 或 `>` 时，使用用户输入。
- 输入不包含 wildcard 时，去掉首尾空白和尾部 `.`，再追加 `.>`。
- 示例：`a.b.c` -> `a.b.c.>`。
- 示例：`a.b.*` -> `a.b.*`。
- 示例：`a.b.>` -> `a.b.>`。
- 非法示例：`a.b.c*`、`a.b.>.c`、`a..b`。

### LatestValueRow

用途：显示每个命中 subject 的最新值。

字段草案：

- `subject`: 实际收到消息的 subject。
- `value`: 解析后的 payload。
- `rawValue`: 无法解析时的原始文本或安全展示形式。
- `receivedAt`: 本地接收时间。
- `sizeBytes`: payload 大小。
- `count`: 当前会话内该 subject 收到的次数。

### RequestConfig

用途：描述 request-reply 面板状态。

字段草案：

- `subject`: 请求 subject。
- `payloadText`: JSON 文本。
- `timeoutMs`: 请求超时。
- `lastResponse`: 最近响应。
- `lastError`: 最近错误。

### ShareState

用途：编码到 URL 的非敏感状态。

字段草案：

- `version`: share schema 版本。
- `servers`: WSS servers 列表。
- `monitorUrl`: 可选 monitoring URL。
- `serverSelectionMode`: 服务器选择模式。
- `watchSubject`: 原始观察 subject。
- `requestSubject`: request subject。
- `requestPayload`: 可选 request JSON 文本。
- `timeoutMs`: 可选超时设置。

不进入 ShareState：

- token。
- password。
- creds。
- 任何私钥、证书、账号敏感内容。

## 6. 大阶段计划

### 阶段 0：视觉设计基线

状态：已完成（2026-05-15）。

目标：

- 基于 `UI_ Refer_img/` 参考图建立 UI 设计语言。
- 将视觉方向、布局、组件、token、交互状态和验收清单落到 `DESIGN.md`。
- 明确实现阶段必须遵循的 UI 边界。

范围内：

- `DESIGN.md`
- `PLAN.md`
- `UI_ Refer_img/` 的只读参考分析

范围外：

- 不修改实现代码。
- 不生成最终 UI 截图。
- 不把参考图直接复制为页面背景或素材。

完成定义：

- `DESIGN.md` 描述桌面端、移动端、主要组件和视觉 token。
- `DESIGN.md` 明确参考图如何转译为 Web UI，而不是笼统说“赛博风”。
- `PLAN.md` 中说明 UI 实施必须以 `DESIGN.md` 为验收依据。

必要验证：

- 检查 `DESIGN.md` 是否覆盖 CommandRail、ServerDossier、SignalDrawer、RequestPanel、ShareSheet。
- 检查 `PLAN.md` 是否把视觉设计阶段纳入实施顺序。

风险：

- 参考图视觉很强，如果实现时不控制信息层级，可能会影响 JSON 和表单可读性。

回滚方式：

- 回滚 `DESIGN.md` 和 `PLAN.md` 中与视觉阶段相关的说明。

### 阶段 1：项目脚手架和工程基线

状态：已完成（2026-05-15）。

目标：

- 建立 Vite + React + TypeScript 前端工程。
- 保留当前 `kinopio-hub` 依赖。
- 建立最小开发、类型检查、构建命令。
- 建立符合 `DESIGN.md` 的首版视觉骨架。

范围内：

- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tsconfig*.json`
- `src/`

范围外：

- 不实现完整 UI。
- 不接入真实 NATS 行为之外的 mock 服务。
- 不处理部署。
- 不偏离 `DESIGN.md` 定义的视觉 token 和布局方向。

完成定义：

- `npm install` 后依赖完整。
- `npm run dev` 可以启动页面。
- `npm run typecheck` 可以执行。
- `npm run build` 可以产出静态构建。
- 首屏空壳 UI 与 `DESIGN.md` 的 CommandRail、三分区结构和视觉 token 一致。

必要验证：

- 运行类型检查。
- 运行生产构建。
- 浏览器打开本地页面，确认无启动白屏。
- 对照 `DESIGN.md` 做一次视觉 smoke check。

风险：

- 当前 `package.json` 是 CommonJS 形态，而 Vite 项目通常使用 ESM；需要在实施时统一项目模块类型。

回滚方式：

- 回滚脚手架新增文件和 `package.json` 脚本变更。

### 阶段 2：Kinopio 连接核心

状态：已完成（2026-05-15）。

目标：

- 封装浏览器端 KinopioHub 连接。
- 支持默认 demo WSS。
- 支持手动 servers 列表。
- 暴露连接状态、错误、重连和断开能力。

范围内：

- Kinopio client adapter。
- 服务器 profile 状态。
- 连接生命周期 hook。
- 错误展示模型。

范围外：

- 不做 request-reply UI。
- 不做 latest value 表。
- 不做 NATS monitoring 详情。

完成定义：

- 页面可使用默认 demo WSS 创建 KinopioHub 实例。
- 用户可输入多个 WSS server。
- 页面显示 `disconnected`、`connecting`、`connected`、`error` 状态。
- 切换 servers 后旧 hub 被 dispose，新 hub 正确创建。

必要验证：

- 默认配置可尝试连接。
- 填写非法 URL 时给出前端校验错误。
- 切换配置不会留下旧订阅。
- 关闭页面或切换配置时调用 `dispose()`。

风险：

- `kinopio-hub` 默认 demo WSS 可用性受外部网络影响，测试不能只依赖 demo。
- 底层连接状态暴露有限，若需要显示实际连接到哪个候选 server，可能需要查看 `kinopio-hub` 是否有稳定公开 API。

回滚方式：

- 保留 UI，禁用连接入口；回滚 adapter 与 hook。

### 阶段 3：服务器设置、认证和本地保存

状态：已完成（2026-05-15）。

目标：

- 提供服务器配置面板。
- 支持保存多个 profile。
- 支持认证信息填写和本地保存。
- 明确认证信息不会默认进入分享 URL。

范围内：

- servers 多行输入。
- serverSelectionMode 选择。
- timeout 设置。
- auth mode 表单。
- localStorage 持久化。
- “清除本地保存信息”操作。

范围外：

- 不做服务端账号系统。
- 不把凭据上传到任何远端。
- 不做浏览器加密保险箱承诺。

完成定义：

- 刷新页面后可恢复上次选择的服务器 profile。
- 用户选择记住认证后，刷新页面可恢复认证表单。
- 用户取消记住认证或点击清除后，本地认证信息被删除。
- URL 分享不包含认证字段。

必要验证：

- localStorage 写入和读取正常。
- 清除操作后刷新页面不再恢复敏感字段。
- 分享 URL 中搜索不到 token、password、creds 等字段。
- 认证配置实际能传给 KinopioHub 运行时。

风险：

- `kinopio-hub@2.1.0` 类型定义没有显式认证字段。实施时需要先确认底层 `@nats-io/nats-core` 浏览器认证选项名称，并用本地扩展类型封装；如果运行时或浏览器构建不支持某些认证方式，需要调整首版 auth mode。

回滚方式：

- 保留无认证连接模式，禁用 auth 表单和本地 auth 保存。

### 阶段 4：Subject 观察和最新值展示

状态：已完成（2026-05-15）。

目标：

- 实现右上角 subject 输入框。
- 实现 subject 归一化。
- 订阅命中的所有子层。
- 只显示每个实际 subject 的最新值。

范围内：

- subject 输入、校验和归一化。
- subscription 管理。
- latest value map。
- JSON 格式化展示。
- 每个 subject 的接收时间、次数和 payload 大小。

范围外：

- 不保存历史消息。
- 不做服务端查询。
- 不做 JetStream replay。

完成定义：

- 输入 `a.b.c` 时，页面显示实际订阅 `a.b.c.>`。
- 输入 `a.b.*` 或 `a.b.>` 时，页面尊重用户 wildcard。
- 收到多个子 subject 消息时，按 subject 分行显示最新值。
- 相同 subject 新消息覆盖旧值，并增加计数和更新时间。
- 停止或修改 subject 时，旧 subscription 被取消。

必要验证：

- 校验非法 wildcard：`a.b.c*`、`a.b.>.c`、`a..b`。
- 校验普通 subject 自动追加 `.>`。
- 使用可控 subject 发布消息，确认 latest value 更新。
- 切换 subject 后旧 subject 不再更新 UI。

风险：

- NATS `>` 匹配一个或多个尾部 token，不匹配根 subject 本身。因此 `a.b.c.>` 不会收到精确 `a.b.c`。当前用户需求是“所有子层”，首版按子层处理；如果后续要同时包含根 subject，需要并行订阅 `a.b.c` 和 `a.b.c.>`。

回滚方式：

- 保留连接页面，禁用 watcher 面板。

### 阶段 5：Request-Reply 面板

状态：已完成（2026-05-15）。

目标：

- 实现只做 request 的 request-reply 功能。
- 用户输入 request subject 和 JSON payload，发送后显示响应或错误。

范围内：

- request subject 输入。
- JSON payload 编辑。
- timeout 设置。
- response JSON 格式化。
- loading、success、error 状态。

范围外：

- 不实现 `serve()`。
- 不实现批量 request。
- 不做 response 历史列表。

完成定义：

- 连接成功后，用户可向指定 subject 执行 `Variable.req()`。
- payload 必须是合法 JSON；非法 JSON 不发送请求。
- 超时、无 responder、服务端返回错误对象时，UI 给出可读错误。
- 响应以 JSON/tree 或格式化文本显示。

必要验证：

- 合法 JSON request 成功发送。
- 非法 JSON 被前端阻止。
- request 超时能显示错误。
- 切换服务器或断开连接时禁止发送。

风险：

- request-reply 需要远端有 responder；demo 环境不一定存在匹配服务。验收需要准备一个可控 responder 或使用已有 Kinopio 服务。

回滚方式：

- 保留 request 表单 UI，禁用发送按钮。

### 阶段 6：NATS 服务器基本信息展示

状态：已完成（2026-05-15）。

目标：

- 在 Web 中显示 NATS 服务器基本信息。
- 优先使用 monitoring endpoint；不可用时显示连接状态和不可用原因。

范围内：

- monitoring URL 配置。
- `/varz` 拉取。
- `/healthz` 可选拉取。
- 基本信息卡片。
- 错误和 CORS 不可用提示。

范围外：

- 不实现完整 NATS 管理后台。
- 不默认暴露 monitoring 安全建议之外的敏感诊断。
- 不强制要求所有服务器都提供 monitoring。

完成定义：

- 默认 demo profile 可配置 `https://demo.nats.io:8222` 作为 monitoring base URL。
- 页面显示 server name、server id、version、uptime、connections、subscriptions、in/out messages、in/out bytes 等字段。
- monitoring 不可用时，不影响变量订阅和 request 功能。
- 用户能看见 monitoring 失败原因，例如网络错误、CORS、HTTP 状态错误。

必要验证：

- 能读取可访问 monitoring endpoint 的 `/varz`。
- monitoring endpoint 不可达时 UI 降级。
- monitoring URL 不合法时前端阻止请求。

风险：

- NATS monitoring 端口不带认证，不应随意暴露在公网。文档和 UI 需要提示用户只填写自己认为安全可访问的 monitoring 地址。
- 部分 NATS 部署可能没有 CORS 或 HTTPS，浏览器无法直接读取；这不是 Kinopio 连接失败。

回滚方式：

- 隐藏 server info 卡片，不影响主功能。

### 阶段 7：分享 URL 和状态恢复

状态：已完成（2026-05-15）。

目标：

- 支持复制当前视图的分享 URL。
- 打开分享 URL 后恢复非敏感配置。
- 与 localStorage 中的 profile 协同。

范围内：

- URL query 或 hash schema。
- share state 编码和解码。
- schema version。
- 分享按钮。
- URL 状态恢复优先级。

范围外：

- 不分享认证凭据。
- 不做短链接服务。
- 不做云端 profile 同步。

状态恢复优先级：

1. URL 中的 share state。
2. localStorage 中用户上次使用的 profile。
3. 内置 demo 默认值。

完成定义：

- 点击复制 URL 后，URL 中包含 servers、monitorUrl、watchSubject、requestSubject、requestPayload、timeout 等非敏感字段。
- 新浏览器打开 URL 后，能恢复 watcher 和 request 面板。
- 如果本地已有匹配 profile 的认证信息，可以让用户选择是否套用本地认证。
- URL 解码失败时，页面回退到默认值并显示提示。

必要验证：

- 复制 URL 后在新标签打开，subject 和 servers 保持一致。
- URL 不包含 token、password、creds。
- 手动篡改 URL 不会导致页面崩溃。
- 旧 schema version 可以安全降级或提示不兼容。

风险：

- request payload 可能包含业务敏感数据。首版可以默认分享 payload，但 UI 应提示“分享链接会包含当前 request payload”；如需更安全，可提供“不包含 payload”的复制选项。

回滚方式：

- 保留 localStorage 恢复，隐藏分享按钮。

### 阶段 8：整体 UI、可访问性和端到端验证

状态：已完成（2026-05-15）。

目标：

- 把各功能整合为可用的单页控制台。
- 收口为更简洁凌厉的工业风界面。
- 增加暗色 / 亮色切换和中文 / 英文切换。
- 让主题与语言偏好写入浏览器本地，但不进入 share URL。
- 完成真实浏览器验证。
- 补齐 README 使用说明。

范围内：

- 响应式布局。
- JSON 词条翻译层。
- `theme / locale` 本地偏好持久化。
- 工业风 light/dark 双主题 token。
- 连接状态提示。
- 空状态、错误状态、loading 状态。
- README 启动和使用说明。
- 最小端到端检查。

范围外：

- 不引入第三方 i18n 库。
- 不做服务端用户偏好同步。
- 不做移动端深度优化之外的基本响应式。

完成定义：

- 桌面端可以同时看到连接、服务器信息、subject 最新值和 request 面板。
- 小屏幕下各区域可纵向使用。
- 输入框、按钮、弹窗和状态条统一为无阴影工业风。
- 顶栏可切换亮色 / 暗色、中文 / 英文，刷新后保持。
- 当前全部可见 UI 文案可随语言切换。
- README 描述真实命令和默认行为。
- 构建、类型检查、浏览器 smoke test 全部通过。

必要验证：

- `npm run typecheck`
- `npm run build`
- 本地浏览器打开 Vite dev server。
- 默认 demo 配置 smoke test。
- 主题和语言切换后刷新验证本地持久化。
- 使用可控 Kinopio/NATS 环境验证 subscribe 和 request。
- 手动刷新页面验证 localStorage 恢复。
- 复制 URL 到新标签验证分享恢复。

风险：

- 如果 demo WSS 或远端 responder 不稳定，最终验收必须准备本地或自有 NATS 测试环境。

回滚方式：

- 回滚 UI 整合层，保留已验证的底层 adapter 和业务函数。

### 阶段 9：工业首屏重设计

状态：已完成（2026-05-16）。

目标：

- 将页面改为全新首屏式工业控制台。
- 默认亮色主题采用白底、黑线、高饱和工业黄。
- 保留连接、subject 输入、实时值、写回、request-reply、设置、分享、亮暗主题和中英切换。
- 增加明显但不干扰输入的数据面板、连接状态、折叠抽屉和弹窗动效。

范围内：

- 首屏布局、主题 token、panel 结构视觉、弹窗视觉。
- 连接中扫描、页面进入、panel reveal、实时值刷新、Reply 折叠展开动效。
- `prefers-reduced-motion` 下关闭或显著降低动画。

范围外：

- 不修改 Kinopio/NATS 连接和 request 逻辑。
- 不修改 share URL schema。
- 不新增生产依赖或图片素材。

完成定义：

- 页面首屏符合白底黄黑工业风。
- 服务器状态为紧凑横向仪表。
- 实时值区域成为主内容面板。
- Reply 控制台默认收起，展开动画稳定。
- 底部 utility dock 高度稳定，分享按钮不被拉伸。

必要验证：

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- 侧边栏浏览器检查亮色 / 暗色、中文 / 英文、桌面宽屏、窄屏。
- 验证设置弹窗、分享弹窗、Reply 抽屉、JSON 格式化和主题输入刷新持久化。

## 7. 实施顺序建议

推荐顺序：

1. 阶段 0：先冻结 `DESIGN.md` 视觉设计基线。
2. 阶段 1：建立工程基线和首版视觉骨架。
3. 阶段 2：打通 Kinopio 连接。
4. 阶段 4：优先完成核心“实时查看最新值”。
5. 阶段 5：再做 request-reply。
6. 阶段 3：补服务器 profile、认证和本地保存。
7. 阶段 6：补 NATS server info。
8. 阶段 7：补分享 URL。
9. 阶段 8：统一 UI、文档和端到端验证。
10. 阶段 9：工业首屏重设计。

如果希望更早体验完整产品闭环，也可以把阶段 3 的“基础 profile 保存”提前到阶段 2 后，但认证保存建议等连接核心稳定后再加。

## 8. 首个实施 Sprint 契约

Sprint 名称：工程基线 + 空壳 UI。

确切目标：

- 创建 Vite + React + TypeScript 工程。
- 按 `DESIGN.md` 建立浅色技术图纸风格的空壳 UI。
- 页面展示 KinopioHub.web 标题、右上角 subject 输入占位、服务器设置占位、request 面板占位。
- 暂不连接真实 NATS。

范围内文件：

- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tsconfig*.json`
- `src/`
- `README.md`

范围外内容：

- 不实现真实连接。
- 不实现 localStorage。
- 不实现分享 URL。
- 不新增 UI 组件库。

完成定义：

- `npm run dev` 可启动。
- `npm run typecheck` 通过。
- `npm run build` 通过。
- 浏览器可看到首版布局，无白屏。

验收通过阈值：

- 类型检查和构建必须通过。
- 页面首次加载不能有未捕获 runtime error。
- 首屏布局必须能看出 `DESIGN.md` 定义的 CommandRail、ServerDossier、SignalDrawer 和 RequestPanel。
- 不能修改与本 Sprint 无关的文件。

已知风险：

- 当前仓库已有未提交改动，实施前必须再次检查 `git status` 并保护用户改动。

回滚方式：

- 删除 Sprint 新增脚手架文件，恢复 `package.json` 到实施前状态。

## 9. 开放问题

当前不阻塞计划落地的问题：

1. 精确 subject 是否也要和所有子层一起显示。例如输入 `a.b.c` 后，是否需要同时订阅 `a.b.c` 和 `a.b.c.>`。当前按用户确认的“所有子层”处理，只订阅 `a.b.c.>`。
2. 认证字段最终支持哪些模式，需要在实施时根据 `@nats-io/nats-core` 浏览器能力和 `kinopio-hub` 透传行为验证。
3. 分享 URL 是否要包含 request payload。当前计划默认包含，但 UI 需要提醒；如果 payload 经常敏感，可以改为默认不包含。
4. NATS server info 是否必须在没有 monitoring endpoint 的环境中仍然显示更多底层连接信息。当前计划只保证连接状态，详细服务器信息依赖 monitoring。

## 10. 总体验收标准

项目完成时必须满足：

- 默认 demo WSS 配置可用，或在 demo 不稳定时有明确降级说明。
- 用户可手动配置 servers 列表并连接。
- 用户可填写认证信息并选择是否保存到浏览器本地。
- 用户输入普通 subject 后自动归一化为所有子层 wildcard。
- 页面只显示每个实际 subject 的最新值。
- 用户可向指定 subject 发起 request 并看到响应或错误。
- 页面可显示 NATS server 基本信息；不可用时有清晰原因。
- 分享 URL 能恢复非敏感状态。
- 分享 URL 默认不包含认证凭据。
- UI 视觉、布局、交互状态和响应式行为符合 `DESIGN.md`。
- 页面支持暗色 / 亮色切换和中文 / 英文切换。
- 主题和语言偏好不进入分享 URL。
- 类型检查、生产构建和浏览器 smoke test 通过。
- README 与实际命令、默认行为和安全边界一致。
