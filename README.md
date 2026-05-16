# KinopioHub.web

KinopioHub.web 是一个浏览器端的 Kinopio / NATS 实时变量观察工具。

当前已完成阶段 1 到阶段 8：

- Vite + React + TypeScript 工程基线
- 浏览器端 Kinopio 连接核心
- 默认 demo WSS、手动 servers 列表与连接生命周期控制
- 多 profile、认证模式、本地保存与清除本地保存
- subject 归一化、wildcard 校验、latest value 实时观察
- request subject / payload / timeout 校验与真实 request-reply 响应展示
- NATS monitoring `/varz` 基本信息展示与降级提示
- 分享 URL 复制、恢复与本地认证协同提示
- 黑黄高反差工业风重构
- 暗色 / 亮色切换、本地 UI 偏好持久化
- `zh-CN / EN` JSON 词条多语言与本地化时间数字格式
- 开发、类型检查、构建命令

当前页面已经会尝试连接 `kinopio-hub` 默认 demo WSS，并允许手动修改 server 列表、连接模式、连接超时和认证参数。服务器 profile 与可选认证信息可保存到浏览器本地，也支持一键清空并恢复到干净默认配置。subject 输入会自动做 `.>` 归一化、wildcard 合法性校验，并把命中的实际子 subject 以 latest value 方式实时展示。request 面板会校验精确 request subject、可选 JSON payload 和 timeout，并通过 `Variable.req()` 显示最近一次成功响应或错误。分享 URL 可以恢复非敏感配置；认证信息不会进入分享状态。页面支持暗色 / 亮色切换，以及中文 / 英文界面切换，两者都保存在浏览器本地，且不进入 share URL。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm run typecheck
npm run build
```

## 结构

- `src/App.tsx`: 页面装配、profile 草稿与本地保存编排
- `src/i18n/`: JSON 词条、翻译解析和 locale context
- `src/core/monitoring/`: monitoring 拉取与状态编排
- `src/core/watch/`: subject 订阅与 latest-value 状态
- `src/core/session/`: Kinopio 连接生命周期
- `src/core/request/`: request-reply 状态与发送编排
- `src/lib/kinopio/`: server profile 解析和 client 封装
- `src/lib/monitoring/`: `/varz` 读取、格式化和错误整理
- `src/lib/nats-subject/`: subject 归一化与 wildcard 校验
- `src/lib/request/`: request subject、payload、timeout 校验与响应格式化
- `src/lib/storage/`: localStorage 持久化
- `src/ui/`: CommandRail、ServerInfoStrip、ServerDossier、SignalDrawer、RequestPanel、ShareSheet、StatusPill
- `src/styles/`: 视觉 token、基础样式、布局样式、组件样式

## 设计与计划

- [DESIGN.md](./DESIGN.md)
- [PLAN.md](./PLAN.md)
