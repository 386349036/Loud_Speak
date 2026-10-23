# 地牢探险与幸存者：本地部署

入口位于 Loud Speak 主页左下角，沿用无文字的圆角方形图标；悬停或辅助阅读可识别游戏名称。游戏在新标签页打开。

| 游戏 | 本地路径 | 固定上游提交 | 许可 |
| --- | --- | --- | --- |
| [Dungeon Crawler Now / Infernal Ascent](https://github.com/JohnVonDrashek/dungeon-crawler-now) | `/games/dungeon-crawler/` | `c64ee3c6247eafd9f0efa09403b111a6925232c7` | MIT |
| [Canvas Vampire Survivors / Survivor](https://github.com/ricardo-foundry/canvas-vampire-survivors) | `/games/vampire-survivors/` | `e616704889e57efc9c1f49098786a95c364008d3` | MIT |

## 运行与重建

两款游戏均由现有 3210 端口的 Express 静态服务提供，不另开端口或常驻进程。沿用 Loud Speak 现有启动监护。首页和静态文件发布不需要重启聊天服务。

源代码保存在 `integrations/dungeon-crawler-now` 和 `integrations/canvas-vampire-survivors`。在新机器首次构建，先运行：

```powershell
npm ci --ignore-scripts --prefix integrations/dungeon-crawler-now
npm run deploy:two-games
node integrations/test-two-games.cjs
```

`UPSTREAM.json` 与 LICENSE 同时保留在源码和发布目录。部署脚本仅覆盖对应两个游戏目录及幂等添加首页入口，不清理其他游戏和聊天数据。

## 本地调整与边界

- 地牢游戏移除在线 Google Fonts 请求，使用原有字体回退，资源以相对路径从本机加载。WASD 移动、鼠标攻击、空格闪避；枢纽内 R 交互。
- 地牢游戏保留上游联机菜单；该模式依赖 Trystero 的外部信令及 WebRTC，并非本地局域网联机服务。本次验收范围是本地单人游戏，不宣称离线联机可用。
- 幸存者游戏使用内置中文语言默认值；原有菜单仍有部分英文，保留语言切换及存档设置。WASD/方向键移动，武器自动攻击，P/Esc 暂停。
- 幸存者禁用可选 Service Worker 注册，避免旧缓存阻碍本地更新。游戏自身资源均本地提供，浏览器本地存档依然保留；未修改聊天存储。

## 验证记录（2026-10-23）

- 地牢 TypeScript 检查及 Vite 生产构建通过；主包约 2.74 MB，构建工具提示包体积较大。
- 上游幸存者测试 279 项：277 通过，2 失败。失败用例写死 `2026-04-25`，而每日历史保存会按真实当前日期清理超过 14 天的数据，故在当前日期被清理。这两项不是本次部署改动引入的问题，未修改上游玩法或伪造系统日期。
- 浏览器已打开两款本地游戏并启动单人游玩，检查实际画面与控制台。未向正式聊天室发送测试消息。
- 地牢实际进入 Tower of Pride 第一层，验证键盘移动与枢纽交互；幸存者完成一轮 17 秒自动战斗并产生击杀和结算。
- 首页两个入口及全部 351 个游戏发布文件均已从 `localhost:3210` 和 `192.168.5.8:3210` 读取并逐字节比对通过，LICENSE 与图标可正常访问；首页聊天窗口保持原有尺寸。
- 完整关卡通关、地牢外网联机及真实手机操作不属于本次验收。
