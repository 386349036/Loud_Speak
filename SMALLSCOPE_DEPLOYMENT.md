# SmallScope / Softfall 本地部署

日期：2026-10-23。来源：[Aptyll/SmallScope](https://github.com/Aptyll/SmallScope)，固定版本 `2e23b67d6da06c10195718c0e69a763bca880c1d`。

## 访问

Loud 左下角游戏区新增蓝色图标，在新标签页打开 `/games/smallscope/`。常驻服务为 `http://127.0.0.1:3210/games/smallscope/`，预览服务为 `http://127.0.0.1:3108/games/smallscope/`；练习模式为该地址加 `?practice=1`。

已增加中文显示及本地局域网多人中继，同时保留单机练习和 AI 对战。访问 `http://192.168.5.8:3210/games/smallscope/`，房主选择「练习场」，用顶部「复制邀请」取得链接；朋友在同一局域网打开链接、准备后，由房主开始共同进入练习地图。使用练习工具升级，等级与移动同步。房主必须保持游戏页面开启；沿用原版局内等级，不新增跨局长期角色存档。中文覆盖菜单、设置、角色、装备名称和练习工具，未匹配的长篇说明保留原文。菜单提供中英切换并保存偏好，在房间内禁用切换以免刷新断线。

`smallscope-relay.cjs` 接入既有 HTTP 服务，同源 WebSocket 路径 `/games/smallscope/ws`，无需额外端口或外部中继。`/api/smallscope/network` 为从 localhost 进入的房主提供局域网邀请地址；地址随主机网络变化。中继检查 Origin、限制房间人数和消息大小，并转发原版 JSON 与二进制同步消息；与聊天室 Socket.IO 共用端口。主服务和 3108 预览服务均已重启加载。没有修改防火墙、路由器或开放公网端口。

## 文件与来源

- `public/games/smallscope/`：251 个文件，包括 248 个上游文件、局域网与中文适配脚本及来源清单。155 个脚本按依赖顺序加载，保留 85 个音频文件。
- `integrations/smallscope/download.cjs`：从固定提交获取运行所需的 JS、音频和基础文件，用 Git blob SHA-1 验证每个源文件。不会执行上游开发工具或 Git hooks。
- `integrations/smallscope/deploy.cjs`：先校验完整性，再复制静态文件到游戏目录，添加本地模式提示及同源连接限制。没有复制上游 Node 开发服务器、截图写入接口、文档或桌面包装器。
- 初次完整 ZIP 下载在大型开发媒体处超时；从已完整下载的音频段提取资源后，使用固定提交逐文件补齐脚本。全部部署源文件均已通过清单哈希校验，未将不完整数据用于运行。

上游 LICENSE 的 MIT 授权只覆盖程序源码；像素美术、音频和 Softfall 名称为 All Rights Reserved。保留原 LICENSE，不将该授权扩大到素材。本地游戏输出与下载缓存已加入 `.gitignore`，避免后续普通提交把整套受限素材上传到 Loud 仓库。首页图标为本项目绘制的独立 SVG。

## 重建与验证

```powershell
node integrations/smallscope/download.cjs
npm run deploy:smallscope
npm run test:smallscope
```

下载需要访问 GitHub；运行资源均从 Loud 的本地静态服务提供。测试默认验证 3108 和 3210，也可以通过 `SMALLSCOPE_TEST_URL` 指定单个地址。

自动化验证通过：155 个脚本语法与引用顺序；248 个源文件与资源哈希、大小；中文字体宽度、三种文字样式、动态等级及房间码保护；同源 ws/wss 适配。真实 WebSocket 测试覆盖建房、加入、房间列表、Unicode、定向/广播、2 MB 二进制快照、错误 Origin 拒绝、断线清理和 Socket.IO 共存。3108/3210 两端口页面与全部脚本 HTTP 200、每端口 85 个音频范围请求 HTTP 206；聊天室 `node test.cjs` 回归通过。

浏览器实测通过：中文菜单、首页入口、AI 对战和练习地图；在实际 LAN 地址用两个独立标签页创建和加入同一房间、复制局域网邀请、房客准备、房主启动练习、双方分别移动。房客升至 2 级后，房主端同步显示其等级。截图见 `smallscope-lan-leveling.png` 及既有单机截图。

验收边界：双端为同一电脑的两个浏览器标签页，尚未用第二台物理设备验证局域网连接；没有打完完整对局，也未做全部英雄、技能、存档回放、手柄及手机实机测试。保留上游玩法。本次没有 Git 提交、推送或公网发布。
