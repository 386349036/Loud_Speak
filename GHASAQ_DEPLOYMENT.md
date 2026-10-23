# Ghasaq 中文本地部署

上游：https://github.com/aymansalkhatib/ghasaq

基线：`0ad4514bfc2754b18b3ba1db6f481c78a7590a42`，游戏版本 2.2.0，MIT 许可。

## 本地修改

- 菜单、HUD、设置、装备、地图、指南、任务、无线电、战斗提示、勋章及结算共 787 条独立阿拉伯语文本片段翻译为中文，应用于 992 处文本。
- `lang=zh-CN`，从左到右排版，数字显示使用 0–9，罗盘方位使用北/东/南/西。
- 调整中文标题字号、字体与换行；武器名称和动态波次说明按中文语序整理。
- 删除 Google Fonts 外网请求。下载 Noto Sans SC 可变字体并随游戏发布，使用 `font-display: swap`；字体大小约 17.8 MB，首次加载后可由浏览器缓存。
- 字体来源：https://github.com/google/fonts/tree/main/ofl/notosanssc ，字体和 OFL 许可保存在游戏的 `fonts/` 目录。
- 游戏逻辑、敌人强度、音效及程序生成素材保留上游实现；未添加中文配音。

## 构建与发布

源码位于 `integrations/ghasaq/`，已包含中文修改。`zh-segments.json` 与 `zh-translations.tsv` 保存原文和译文，`localize-zh.cjs` 用于将该映射应用于原始基线源码；不要在加入其他阿拉伯语新文本后未经核对直接重跑。

```powershell
cd C:\codex\loud\integrations\ghasaq
npm ci --ignore-scripts --cache ../../.npm-cache
npm run build
cd C:\codex\loud
Copy-Item integrations/ghasaq/dist/* public/games/ghasaq -Recurse -Force
```

入口 `/games/ghasaq/`，由 Loud 现有静态服务提供。字体文件与游戏许可随发布目录保留。无需修改聊天服务端，无需增加网络端口。

## 验证

`node verify-ghasaq.cjs` 在 Chrome 中拦截非本机请求，检查中文语言标记、本地字体加载、主菜单、设置、行动简报、开局、暂停、触屏战斗布局和主页入口；截图与结果写入 `.tmp-ghasaq-qa/`。

已通过生产构建、浏览器中文字体加载、桌面开局与暂停、触屏战斗场景加载检查。验证过程中无外网请求、页面脚本错误或资源 HTTP 失败。截图用于检查中文布局。

验证使用本机 Chrome 和软件 WebGL；未完成另一台局域网设备访问、真机触控、原生显卡性能、所有地图完整通关和所有随机战斗文本的逐条实玩验收。源码静态扫描未发现残留阿拉伯语文本。
