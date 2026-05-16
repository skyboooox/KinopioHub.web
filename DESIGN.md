# KinopioHub.web UI 设计规范

## 1. 设计目标

KinopioHub.web 的界面应像一个实时信号观测台，而不是普通后台管理系统。用户打开页面后，应立刻理解三件事：

- 当前连接到了哪些 Kinopio / NATS server。
- 当前正在观察哪个 subject，以及实际订阅 wildcard 是什么。
- 每个命中 subject 的最新值是什么，并能快速发起 request。

视觉方向来自 `UI_ Refer_img/` 下的参考图：技术图纸、信号档案、实验编号、工业网格和纸面印刷感。最终 UI 应该有强烈的图形秩序，但交互必须清楚、稳定、可读。

## 2. 参考图提炼

### `6d1b6015a4266b61884629455839c5fb.jpg`

可借鉴：

- 大面积荧光黄色块覆盖在工程图纸上。
- 极细网格、虚线、坐标线和框线。
- 小尺寸标签与粗黑短线形成测绘感。

落地方式：

- 用荧光黄表示当前正在监听的 subject 或关键操作焦点。
- 页面背景使用浅色图纸网格和细线装饰。
- 信息卡用短横线、坐标标签和编号增强“信号图纸”感。

### `dcd95e6e2f5c1f42af9f693716bcafb3.jpg`

可借鉴：

- 冷淡浅绿色背景。
- 巨大的字母数字编号。
- 黑色胶囊标签与轻量参数表。
- 很多留白，让信息像系统档案页。

落地方式：

- Hero 区显示大号连接编号或当前 subject 前缀。
- 服务器信息用参数表而不是普通卡片堆叠。
- 连接状态用黑色胶囊标签承载。

### `e6a9ca9430b19b094ef1f45fc58c3549.jpg`

可借鉴：

- 巨大章节号。
- 高对比黑白版式。
- 小块荧光黄作为活跃区域。
- 顶部像仪表记录一样的细碎刻度。

落地方式：

- 页面分区用 `01`、`02`、`03` 编号，而不是传统标题卡片。
- Watch、Request、Server Info 三个主要区域使用大号编号建立秩序。
- 当前输入框获得焦点时出现荧光黄底块。

### `eb0ba16e43f1cf948282585aeffb01b9.jpg`

可借鉴：

- 强网格、粗黑分割线、荧光黄矩形。
- 文案块像版面注释，不像营销卡片。
- 黑白斜线和十字标记增加机械感。

落地方式：

- 使用粗线分割主要工作区。
- 空状态和 loading 状态可用斜线纹理。
- 小型十字、坐标、短线作为装饰，但不能干扰点击。

### `f409c03f0ca22235c41cce1b6f68d7e1.jpg`

可借鉴：

- 红色作为高优先级告警色。
- 密集网格、斜线、粗黑几何块。
- 工业标识、警戒区、边界线。

落地方式：

- 错误、连接失败、request timeout 使用红色体系。
- 认证保存风险提示使用红色边线，而不是普通灰色 help text。
- 严重错误区域用斜线警戒纹理。

### `f8affdccfc8862eca50fb77fba1a44cd.jpg`

可借鉴：

- 文件抽屉和索引卡片结构。
- 每一行都是可扫描的条目。
- 黑色 tab 标签代表分组。

落地方式：

- 最新值列表设计成“subject 抽屉”，每个 subject 是一张横向索引卡。
- 命中 subject 的前缀或分组用黑色 tab 显示。
- 只显示最新值时，每行保持紧凑、可快速扫读。

## 3. 视觉原则

### 关键词

- Signal board
- Technical dossier
- Paper console
- Index drawer
- Industrial grid

### 必须做到

- 浅色背景为主，不做默认暗色控制台。
- 使用黑色粗线、细网格、荧光黄重点和红色告警。
- 信息密度可以高，但主要操作必须清晰。
- 保留足够留白，让实时数据有呼吸感。
- 所有装饰线都必须服务结构，不做纯噪声。

### 必须避免

- 不做常见紫色渐变 SaaS 风格。
- 不做玻璃拟态、毛玻璃暗色卡片或泛 AI 仪表盘。
- 不用默认 Inter / Roboto / Arial / system 风格作为主要视觉。
- 不把 JSON 数据塞进低对比小字里。
- 不让背景纹理影响表单输入和代码阅读。

## 4. 信息架构

### 桌面端布局

```text
+--------------------------------------------------------------------------------+
| KH/WB  SERVER: CONNECTED  SUBJECT INPUT                         SHARE SETTINGS |
+--------------------------------------------------------------------------------+
| 01 SERVER DOSSIER     | 02 SIGNAL DRAWER                         | 03 REQUEST |
| profile + auth        | normalized subject + latest values        | req form   |
| monitor /varz         | subject index rows                        | response   |
| connection log        | JSON latest value preview                  | errors     |
+--------------------------------------------------------------------------------+
| footer rail: selected profile, storage state, share state, build/version        |
+--------------------------------------------------------------------------------+
```

### 移动端布局

```text
KH/WB
subject input
connection strip

02 signal drawer
03 request
01 server dossier
footer actions
```

移动端优先保证观察值和 request 可用，服务器设置折叠到抽屉中。

## 5. 主要组件

### CommandRail

位置：

- 桌面端固定在顶部。
- 移动端作为第一屏垂直堆叠。

内容：

- 产品标记 `KH/WB`。
- 连接状态胶囊。
- subject 输入框。
- 实际订阅结果，例如 `a.b.c -> a.b.c.>`。
- `Share URL` 按钮。
- `Settings` 按钮。

视觉：

- 高度约 72px。
- 下边使用 2px 黑色分割线。
- subject 输入框获得焦点时出现荧光黄底色和黑色投影线。

### ServerDossier

用途：

- 管理 servers、monitoring URL、认证和本地保存。
- 显示 NATS 基本信息。

内容：

- profile selector。
- servers 多行输入。
- auth mode 区域。
- remember auth 开关。
- monitoring `/varz` 参数表。
- 本地保存状态。

视觉：

- 像工程参数表。
- 使用小号等宽字体展示 server URL。
- 认证风险提示使用红色边线和斜线底纹。

### SignalDrawer

用途：

- 展示 subject watcher 的最新值。

内容：

- 当前原始 subject。
- 当前 normalized subject。
- subject 命中行。
- 每行显示 subject、接收时间、次数、payload size、最新 JSON。

视觉：

- 借鉴文件抽屉索引卡。
- 每个 subject row 是一张水平卡片。
- subject 前缀放在黑色 tab 中。
- 当前刚更新的行短暂闪烁荧光黄描边。

状态：

- 空状态：显示大号 `02` 和提示 `WAITING FOR SIGNAL`。
- 有数据：按最近更新时间排序，最新在上。
- 错误：红色警戒纹理卡片，说明 subscription 失败原因。

### RequestPanel

用途：

- 只发起 request，不提供 serve。

内容：

- request subject 输入。
- JSON payload 编辑器。
- timeout 设置。
- Send 按钮。
- response 区域。

视觉：

- 像一张测试表单和结果回执。
- Send 按钮使用黑底白字，hover 时变荧光黄底黑字。
- response 成功时使用浅薄荷边框。
- timeout 或 no responder 使用红色边框。

### ShareSheet

用途：

- 复制可恢复状态的 URL。

内容：

- 将要分享的字段列表。
- 明确显示“不包含 token / password / creds”。
- request payload 是否包含的提示。
- copy 按钮。

视觉：

- 使用黑色标题条和浅黄提示条。
- 敏感信息排除项用红色小标签。

## 6. 视觉 Token

### 色彩

```css
:root {
  --paper: #f4f3ee;
  --paper-cold: #e8f1ed;
  --paper-warm: #fff7d1;
  --ink: #111111;
  --ink-soft: #2d2d2a;
  --muted: #8a928d;
  --grid: rgba(17, 17, 17, 0.11);
  --grid-soft: rgba(17, 17, 17, 0.055);
  --acid: #dfff18;
  --acid-2: #f4ff00;
  --mint: #8db6a7;
  --red: #e02020;
  --red-soft: #ffd9d4;
  --white: #fffdf6;
}
```

使用规则：

- `--paper` 是默认背景。
- `--paper-cold` 用于 server info 和 connected 状态区域。
- `--acid` 只用于焦点、活跃订阅和关键 CTA。
- `--red` 只用于错误、风险和危险操作。
- 黑色是主要结构色，不要用浅灰替代分割线。

### 字体

首选：

- 标题和大号编号：`Space Grotesk`。
- 代码、subject、server URL、JSON：`IBM Plex Mono`。
- 正文：`Space Grotesk` 或 `IBM Plex Sans Condensed`。

实施建议：

- 若允许新增字体依赖，优先使用 `@fontsource/space-grotesk` 和 `@fontsource/ibm-plex-mono`。
- 若不新增字体依赖，则使用 CSS `@font-face` 自托管字体文件。
- 不把 Inter、Roboto、Arial、系统默认栈作为主要字体方案。

### 字号

- Giant number：96px 到 160px。
- Section label：28px 到 48px。
- Body：14px 到 16px。
- Meta：11px 到 12px。
- Mono JSON：12px 到 14px。

### 线条

- 主分割线：2px solid `--ink`。
- 次级线：1px solid `--grid`。
- 活跃边框：2px solid `--acid` 加黑色偏移阴影。
- 错误边框：2px solid `--red`。

### 圆角

- 主卡片：0 到 4px，保持图纸感。
- 胶囊状态：999px。
- 输入框：2px 到 4px。
- 不使用大圆角卡片作为主风格。

## 7. 背景和纹理

页面背景：

- 使用浅纸色。
- 叠加细网格。
- 局部加入极淡坐标线或刻度。

建议 CSS：

```css
.app-shell {
  background:
    linear-gradient(var(--grid-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-soft) 1px, transparent 1px),
    var(--paper);
  background-size: 24px 24px;
}
```

斜线纹理用于：

- loading skeleton。
- 警告区域。
- 无数据占位。

半调网点用于：

- 顶部装饰块。
- share sheet 的非交互背景。
- 不用于正文背后。

## 8. 交互状态

### 连接状态

- `connected`：黑色胶囊 + 薄荷绿小点。
- `connecting`：荧光黄胶囊 + animated scanning line。
- `disconnected`：白底黑框 + 斜线纹理。
- `error`：红底或红框 + 明确错误文案。

### Subject 输入

- 输入普通 subject 时，旁边显示转换结果。
- 示例：`a.b.c` 旁边显示 `WATCHING a.b.c.>`。
- 输入非法 wildcard 时，输入框红色描边，并说明 `*` 和 `>` 必须是独立 token。

### 数据更新

- 新数据到达时，对应 subject row 出现 600ms 荧光黄边框。
- 不自动滚动打断用户阅读。
- 如果行数超过上限，显示 `+N hidden subjects`。

### Request

- 发送中按钮显示 `IN FLIGHT`。
- 成功响应显示 `REPLY RECEIVED`。
- 超时显示 `REQUEST TIMEOUT`。
- 无连接时按钮禁用，并显示 `CONNECT FIRST`。

## 9. 可访问性

必须满足：

- 所有输入都有 visible label。
- 键盘可以访问 subject 输入、settings、share、request 发送。
- 错误信息不只依赖红色，也必须有文字。
- 支持 `prefers-reduced-motion`，关闭扫描线、闪烁和过渡动画。
- JSON 区域支持复制。
- 字号和行高不能低于可读阈值。

对比要求：

- 正文和主要数据使用黑色或近黑色。
- 荧光黄上必须使用黑色文字。
- 红色错误区避免红底黑字长段文本，优先白底红框。

## 10. 响应式规则

### >= 1200px

- 三栏布局。
- 左侧 ServerDossier 约 280px。
- 中间 SignalDrawer 自适应。
- 右侧 RequestPanel 约 360px。

### 800px 到 1199px

- 两栏布局。
- SignalDrawer 占主要宽度。
- ServerDossier 和 RequestPanel 可上下堆叠在右侧。

### < 800px

- 单栏布局。
- CommandRail 垂直化。
- ServerDossier 默认折叠。
- SignalDrawer 在 RequestPanel 前。

## 11. 实施落点

建议文件结构：

```text
src/
  App.tsx
  styles/
    tokens.css
    base.css
    layout.css
  ui/
    CommandRail.tsx
    ServerDossier.tsx
    SignalDrawer.tsx
    RequestPanel.tsx
    ShareSheet.tsx
    StatusPill.tsx
```

实现约束：

- 首版不引入 UI 组件库。
- 所有颜色、字号、线条、阴影必须通过 CSS variables。
- 装饰性图形用 CSS 生成，避免把参考图直接作为背景图。
- 组件命名应贴合产品语义，不使用泛泛的 `Card1`、`Panel2`。
- 视觉验收以本文件为准，`PLAN.md` 只记录阶段和验证。

## 12. 首屏验收草图

```text
KH/WB  CONNECTED / DEMO WSS         [ subject: a.b.c           ] WATCH a.b.c.>   [SHARE] [SETTINGS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
01 SERVER DOSSIER       02 SIGNAL DRAWER                                      03 REQUEST
┌ profile: demo      ┐  ┌ active subject tab: a.b.c.> ┐                       ┌ subject       ┐
│ wss://demo...      │  ├ api.weather.temp      22:11 │ { "value": 18.4 }      │ payload JSON  │
│ varz: healthy      │  ├ api.weather.wind      22:11 │ { "speed": 3.2 }       │ timeout 3000  │
│ auth: none         │  ├ device.camera.state   22:10 │ { "online": true }     │ SEND REQUEST  │
└────────────────────┘  └─────────────────────────────┘                       └───────────────┘
```

## 13. 设计验收清单

- 页面第一眼能看出“技术图纸 + 信号档案”的风格。
- 右上角 subject 输入框是最高优先级入口之一。
- 普通 subject 的 wildcard 转换结果始终可见。
- 最新值列表像索引抽屉，不像普通表格模板。
- Request 面板只提供 request，不出现 serve 入口。
- Server 设置和认证信息有明确安全提示。
- 分享 URL 功能明确展示会分享和不会分享的字段。
- 错误、警告、连接状态有强视觉区分。
- 移动端仍然优先保证观察 subject 和发送 request。
