# KinopioHub.web

KinopioHub.web 是浏览器端 Kinopio / NATS 调试台，支持：

- 连接多条 `wss` / `tls` 服务器（默认内置 demo server），连接模式（ordered / random / latency）可选。
- 输入 subject 并校验通配符规则，展示实际订阅（如 `a.b.c` 会变为 `a.b.c.>`）。
- 监听 latest value，显示每个命中 subject 的最近消息与更新次数。
- request-reply 支持精确 subject、可选 JSON payload、可调 timeout，并展示最近响应或错误。
- 多 profile 管理、服务器列表/模式/session timeout 的本地保存与恢复，`remember auth` 仅存本地（localStorage）。
- 分享链接恢复非敏感配置（servers / selection mode / timeout / watch subject / request subject / request payload / request timeout text）。
- 中文 / 英文切换、深色 / 浅色主题持久化。

安全约束：

- 分享 URL 不包含 `token`、`password`、`creds`。
- 认证信息仅用于本地使用，不作为安全凭证保存在 URL 中。

## 开发

```bash
npm install
npm run dev
```

默认访问：`http://localhost:5173`

## 验证

```bash
npm run typecheck
npm run build
npm run preview
```

## 部署到 MushroomKingdom

仓库提供基于官方 `caddy` 容器的静态部署配置，入口位于 `deploy/mushroomkingdom/`。

- HTTPS：`https://hub.skyboooox.com:7800`
- HTTP：`http://hub.skyboooox.com:7801`
- `deploy/mushroomkingdom/conf/Caddyfile` 中配置了：
  - `try_files {path} /index.html`（SPA fallback）
  - `/assets/*` 长期缓存
  - `index.html` 禁用长期缓存

本地构建并同步静态文件：

```bash
ssh MushroomKingdom 'mkdir -p /root/KinopioHub.web/conf /root/KinopioHub.web/dist'
npm install
npm run build
rsync -az --delete ./dist/ MushroomKingdom:/root/KinopioHub.web/dist/
rsync -az ./deploy/mushroomkingdom/conf/ MushroomKingdom:/root/KinopioHub.web/conf/
rsync -az ./deploy/mushroomkingdom/compose.yaml MushroomKingdom:/root/KinopioHub.web/compose.yaml
```

服务端启动：

```bash
ssh MushroomKingdom 'cd /root/KinopioHub.web && docker compose up -d'
```

默认暴露：

- HTTPS：`https://hub.skyboooox.com:7800`
- HTTP：`http://hub.skyboooox.com:7801`

证书复用服务器现有文件：

- `/root/NATS/cert.pem`
- `/root/NATS/key.key`

## 结构

- `src/App.tsx`: 页面装配、profile 草稿与本地保存编排
- `src/i18n/`: JSON 词条、翻译解析和 locale context
- `src/core/watch/`: subject 订阅与 latest-value 状态
- `src/core/session/`: Kinopio 连接生命周期
- `src/core/request/`: request-reply 状态与发送编排
- `src/lib/kinopio/`: server profile 解析和 client 封装
- `src/lib/nats-subject/`: subject 归一化与 wildcard 校验
- `src/lib/request/`: request subject、payload、timeout 校验与响应格式化
- `src/lib/storage/`: localStorage 持久化
- `src/ui/`: CommandRail、ServerInfoStrip、ServerDossier、SignalDrawer、RequestPanel、ShareSheet、StatusPill
- `src/styles/`: 视觉 token、基础样式、布局样式、组件样式

## 设计与计划

- [DESIGN.md](./DESIGN.md)
- [PLAN.md](./PLAN.md)
