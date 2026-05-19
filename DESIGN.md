# KinopioHub.web UI 设计规范

## 1. 设计目标

界面应优先支持三个核心判断链路：

- 当前连接到哪个 Kinopio / NATS 节点。
- 正在观察哪个 subject，以及实际订阅的 wildcard 结果。
- 每条命中消息的最新值是什么，如何快速发起 request-reply。

## 2. 视觉原则

### 关键词

- Signal board
- Technical dossier
- Industrial index
- Real-time terminal

### 必须做到

- 轻质浅色基底 + 高对比结构线条。
- 黑色作为主结构线与边界色。
- `acid`（黄）突出当前焦点、关键状态和高优先操作。
- 红色仅用于错误与风险提示，不用于常规说明。
- 装饰只服务结构，不抢占表单/数据可读性。

### 必须避免

- 通用 SaaS 风格卡片/毛玻璃 UI。
- 低对比灰白输入文本。
- 纯动画引导的关键状态说明。

## 3. 视觉 Token

### 色彩（取自当前实现）

- `--paper`: `#f3f2ec`（浅色） / `#12130f`（深色）
- `--ink`: 主文字色
- `--grid`: 结构线与弱边界
- `--acid`: 高优先状态
- `--red`: 错误与风险
- `--mint`: 辅助状态

### 字体

- 标题与正文：`HYFengShangHei` / `Bender`
- 代码与数据：`IBM Plex Mono`
- 字号与行高以可读性为先，不追求艺术化缩放。

### 尺寸与形态

- 组件主角不使用大圆角（`0~4px`）。
- 关键线条保留清晰边界，不掩盖数据文本。

## 4. 信息架构

### 桌面端

- 顶部：连接状态与 subject 输入（CommandRail）。
- 左侧：Server 信息与配置（ServerDossier）。
- 中部：watch 最新值列表（SignalDrawer）。
- 右侧：request 与状态面板（RequestPanel）。
- 底部/脚注：share 与设置入口（包含主题和语言入口）。

### 移动端

- 单列流式布局。
- subject 区域在首屏可见。
- Server 设置保持可折叠或抽屉化，优先保证 watch 与 request 可达。

## 5. 核心组件规则

- `CommandRail` 只承担输入与快速操作，避免承载过多业务状态。
- `ServerDossier` 同时显示 profile 选择、认证配置和连接诊断，不添加多余元信息卡片。
- `SignalDrawer` 显示每个 subject 的最新值、时间、计数，不自动打断阅读。
- `RequestPanel` 只处理 request-reply，不包含 serve 入口。
- `ShareSheet` 必须显式提示不携带 `token/password/creds`，仅显示可恢复字段边界。

## 6. 交互状态

- 连接状态按 `connected / connecting / disconnected / error` 划分，并给出文字说明。
- 普通 subject 输入需展示转化后的订阅；非法 wildcard 显示具体 token 规则错误。
- watch 列表新增数据时允许轻度强调，不用阻塞用户滚动。
- request 缺连接时禁止发送；缺失响应时展示可读错误。
- 分享恢复后仅恢复 `servers`、`serverSelectionMode`、`timeoutMs`、`watchSubject`、`requestSubject`、`requestPayload`、`requestTimeoutText` 等非敏感状态。

## 7. 可访问性

- 所有输入与按钮具备可见文案。
- 结果与错误文本优先于颜色。
- 键盘可完成：subject 输入、设置、发送 request、复制 share URL 全流程。
- 按 `prefers-reduced-motion` 关闭高频动画（状态脉冲、滚动提示等）。
- 屏幕宽度约束下无横向溢出。

## 8. 响应式

- `>= 1200px`：三栏布局。
- `< 1200px`：保持主要内容顺序，允许模块折叠/重排，禁止关键操作下沉到滚屏很远位置。

## 9. 实施约束

- 不引入额外 UI 组件库。
- 所有布局参数尽量通过 CSS 变量和组件样式约束实现，不依赖硬编码散落常量。
- 主要交互不要依赖图片背景替代真实布局；装饰使用 CSS 可控样式优先。

## 10. 设计验收清单

- 页面第一眼明确连接状态与 subject 入口。
- subject 输入可见“实际订阅”显示。
- watch 列表可读、可更新、不会频繁打断用户。
- request 面板可发送 request，并展示成功/超时/无应答差异。
- ShareSheet 清楚标识可恢复字段与不共享字段。
- 错误态有文字说明和高对比样式。
- 中英文、浅色/深色切换后功能不变。
