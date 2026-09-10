# Hatch Garden / 孵蛋花园

A small, static browser game about filling a garden with eggs, watching chicks hatch, and growing a lively flock. It is built with Vite, TypeScript, and Phaser; every game rule runs locally in the player’s browser.

一个轻松的静态网页小游戏：点击让母鸡下蛋，看小鸡破壳、成长，并把花园铺满。项目使用 Vite、TypeScript 和 Phaser 制作；所有游戏规则都只在玩家浏览器中运行。

## Features / 功能

- One click or Space makes all eligible hens lay together, reserving non-overlapping egg spaces before creating the batch.
- Eggs crack and hatch after 5.46 seconds; chicks wander, mature, and may leave the outer play boundary.
- Responsive full-viewport playfield, pause controls, sound controls, and an automatic fullscreen toggle where the browser supports it.
- A local-only best score and settings store. There is no account, API, telemetry, game server, database, or WebSocket.
- SVG artwork, short sound effects, and a 24-second looping background track that loads only after the first egg.

- 点击场地或按空格，会让所有可下蛋的母鸡同步下蛋；系统先预留不重叠的蛋位，再同帧生成。
- 蛋会在 5.46 秒后破壳；小鸡随机散步、成长为母鸡，也可能走出外圈。
- 游戏区域随视口填充，包含暂停、声音控制和在浏览器支持时自动显示的全屏切换。
- 最高分和设置仅保存在本机。没有账号、API、遥测、游戏服务器、数据库或 WebSocket。
- 美术使用 SVG；背景音乐是第一次下蛋后才请求的 24 秒循环片段。

## Run locally / 本地运行

Requires Node.js 20.19 or later.

需要 Node.js 20.19 或更高版本。

```bash
npm install
npm run dev
```

```bash
npm run test   # game-rule tests / 规则测试
npm run build  # static production files in dist/ / 静态产物
```

## Deploy / 部署

Upload the contents of `dist/` to any HTTPS static host such as Nginx, Caddy, GitHub Pages, or an object store/CDN. No Node.js process needs to stay running in production. Configure compression and long-lived caching for hashed JS and CSS files; cache audio after its first download.

将 `dist/` 的内容上传到 Nginx、Caddy、GitHub Pages 或对象存储/CDN 等 HTTPS 静态托管即可。生产环境不需要常驻 Node.js 进程。建议为带哈希的 JS/CSS 启用压缩和长期缓存，并缓存首次下载后的音频。

## Project notes / 项目文档

- [Architecture and gameplay design (Chinese)](docs/architecture.md)
- [Verification record / 验证记录](docs/verification.md)
- [Artwork specification / 美术规格](art/README.md)
- [Third-party audio notices / 第三方音频声明](art/audio/THIRD_PARTY_NOTICES.md)

## License / 许可证

The original code, documentation, and SVG artwork are available under the [MIT License](LICENSE). Third-party audio is not covered by that grant; see [NOTICE.md](NOTICE.md) and the audio notices for each asset’s terms and required attribution.

项目的原创代码、文档和 SVG 美术采用 [MIT License](LICENSE)。第三方音频不包含在 MIT 授权内；请查阅 [NOTICE.md](NOTICE.md) 以及每个音频资源的来源、许可与署名说明。
