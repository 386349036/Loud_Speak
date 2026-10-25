# 双端发布约定

2026-10-25补充：公网HTTPS及自动续约已配置并验证，入口 https://35.221.134.170/ ，HTTP自动跳转；详见HTTPS.md。下方首次发布时的HTTP说明为历史记录。发布脚本保留现有TLS配置，不能覆盖为纯HTTP站点。

2026-10-25 用户要求：以后本地和 Google Cloud 服务器都需要上线，二者同步发布同一版本。

最新补充：测试阶段仅更新和验证本地，不主动 commit/push 或更新云端，避免过于频繁发布。用户明确要求发布／上线时，再将同一提交同步到内外网。此补充优先于一般双端发布约定。

同步范围是应用代码和静态游戏资产。数据库、附件、管理员认证配置与私钥各自保留，不随发布复制。发布前运行聊天与相关游戏测试，提交推送，然后以该 Git 提交构建云端运行包；本地及云端 `/deployment.json` 应报告相同 commit。

## 本地内网

工作目录 C:\codex\loud；现有任务 LoudSpeak-AlwaysOn 监护 Node 服务，监听 0.0.0.0:3210。内网网卡地址以发布时实际查询结果为准。静态资源自动读取，服务端代码变化时重启该目录的 Node 服务。保留 data/，不清空聊天历史。

## Google Cloud

连接见 GCP_SSH.md，别名 `gcp-hk61023`。实例公网地址当前为 35.221.134.170。发布目录 `/opt/loud/releases/<完整提交>`，`/opt/loud/current` 指向当前版本；持久数据 `/var/lib/loud/data`。systemd 管理 loud-speak，Nginx 80 端口代理应用；应用仅监听127.0.0.1:3210。

公网管理路径关闭；管理时使用 SSH 隧道：`ssh -L 13210:127.0.0.1:3210 gcp-hk61023`，在本机访问 http://127.0.0.1:13210/admin。云端首次绑定验证器须由用户通过该隧道操作。

构建：`node tools/operations/build-release.cjs`，产物与 SHA256 位于 `.publish/release.json`。运行包只包含提交中的服务代码、package锁文件及public静态资源，不含源图、数据库或凭据。

通过 scp 传输运行包及 tools/operations/deploy-cloud.sh 后，在服务器运行：`sudo bash deploy-cloud.sh <运行包> <完整commit> <sha256>`。脚本验证包摘要、安装依赖、启动服务，健康检查失败时切回已有旧版本。保留旧release用于回滚。

每次发布应分别核验本机、内网地址及云端公网：首页、/api/health、/deployment.json、/games/veggie-adventure/及静态资产。verify-deployment.cjs现逐文件校验整个蔬果游戏目录对外提供的文件，覆盖全部32关、共用逻辑、验收台和图片；排除Express不提供的.gitkeep等隐藏占位文件，文本仅归一化CRLF/LF后比较SHA256。运行时和HTTP检查不代替视觉、手机或整关游玩验收。公网使用上述HTTPS入口，HTTP保留跳转。

2026-10-25 本轮发布准备：102项游戏回归与聊天／附件／认证回归通过；发布内容包括场景01正式动画、运动与关卡调整、首领情境行为、小兵智能V1，以及保留TLS的部署脚本。两端实际发布提交和验证结果记录在本机忽略目录 `.publish/deployment-state.json`，以访问 `/deployment.json` 的结果确认，不能仅凭提交成功判断双端上线完成。

2026-10-25 首次双端发布已核验内网与公网的首页、健康、提交号、171项游戏图片及4项脚本／样式／最终关数据（共175文件）。游戏51项非视觉测试及聊天／附件／认证回归通过。本轮将 multer 升级到2.5.0、body-parser升级到2.4.0，修复依赖审计发现的两项高危拒绝服务漏洞，生产依赖审计为0漏洞。具体发布提交、运行包SHA256及两端检查结果记录在本机忽略目录 `.publish/`，以实际 `/deployment.json` 为当前版本依据。
