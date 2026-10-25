# 公网 HTTPS 与自动续约

2026-10-25（北京时间）完成。入口：https://35.221.134.170/ 。本次仅修改云端代理与证书配置，应用仍为提交0f79bd11440275a0cf01748f868b3d82228ec972，未发布本地游戏测试修改。

- Let's Encrypt 公网IP证书，Certbot 5.8.0（官方snap）；shortlived签发配置。
- 证书路径：`/etc/letsencrypt/live/loud-ip/fullchain.pem`；私钥仅保存在服务器同目录，未复制到项目。
- Nginx配置：`/etc/nginx/sites-available/loud-speak`；修改前备份：同目录`loud-speak.pre-https`。
- 80端口仅保留HTTP-01验证目录`/var/www/letsencrypt/.well-known/acme-challenge/`，其他请求301跳转固定公网IP的HTTPS地址。443仅启用TLS1.2/1.3，保留WebSocket代理和公网管理路径403限制。
- `snap.certbot.renew.timer`已enabled、active，每天两次检查是否需要续约。当前调度为UTC03:01及20:09（北京时间11:01及次日04:09）。由Certbot判断续约时机，无需人工每6天操作。
- 续约成功后执行`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx`：先`nginx -t`再`systemctl reload nginx`，自动载入新证书。

已验证：本机通过公网HTTPS访问首页200、健康接口返回ok；未禁用证书校验；HTTP跳转保持路径；/admin和/api/admin/status均403。`certbot renew --dry-run --run-deploy-hooks`模拟续约成功；重载钩子单独执行成功。

本次证书有效至2026-11-01 03:00:06北京时间，后续续约会自动更换日期。公网IP证书有效期约6天，80端口验证路径需持续可访问。IP尚未核实是否静态；若地址变化，需要为新IP重新签发并更新Nginx跳转及SSH记录。

检查命令：

```sh
sudo /snap/bin/certbot certificates
sudo systemctl list-timers --all --no-pager | grep certbot
sudo /snap/bin/certbot renew --dry-run --run-deploy-hooks
sudo journalctl -u snap.certbot.renew.service --no-pager -n 50
```

本地发布脚本deploy-cloud.sh已修改为保留已有TLS站点配置，避免下一次发布覆盖HTTPS；该脚本未提交推送。当前证书无邮件联系人，故以自动续约日志作为运维检查依据。

依据：https://letsencrypt.org/2026/03/11/shorter-certs-certbot
