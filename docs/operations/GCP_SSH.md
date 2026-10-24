# Google Cloud SSH 连接记录

记录日期：2026-10-25。已在本对话实际验证 SSH 登录成功。

| 配置 | 值 |
| --- | --- |
| 实例 | instance-20261024-180543 |
| 可用区 | asia-east1-b |
| 机型 | e2-standard-2 |
| 公网 IP | 35.221.134.170 |
| 内网 IP | 10.140.0.2，nic0 |
| 登录用户 | hk61023 |
| 本机 SSH 别名 | gcp-hk61023 |
| 密钥类型 | Ed25519 |
| 私钥路径 | C:\Users\Administrator\.ssh\id_ed25519_gcp_hk61023_20261025 |
| 公钥路径 | C:\Users\Administrator\.ssh\id_ed25519_gcp_hk61023_20261025.pub |
| SSH 配置文件 | C:\Users\Administrator\.ssh\config |
| 主机信任文件 | C:\Users\Administrator\.ssh\known_hosts_gcp_hk61023 |

连接命令：

```powershell
ssh gcp-hk61023
```

私钥经过口令加密，出现 `Enter passphrase for key ...` 时需要交互式输入口令。口令不是服务器密码。不在此记录中保存私钥内容或口令；不要使用 BatchMode=yes 进行首次解锁登录。

SSH 别名配置已通过 `ssh -G gcp-hk61023` 验证解析；本次记录操作未重新连接服务器。此前通过同一私钥交互式登录成功，远端 whoami 为 hk61023，hostname 为 instance-20261024-180543。

## 公钥

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILXlea+XuMPOPYqVubICXdCioJ1enNyJI1Uil8fv+rAw hk61023
```

公钥指纹：`SHA256:iUo947boOcrn7t35u5Q8eNAZRJNq5equBbuC+AiCidQ`。

已保存主机 Ed25519 指纹：`SHA256:vzdIPVW9sEXEVvr5CHSm2/RzYFn8hf9RLHYLq2eGDy0`。客户端配置启用严格主机密钥检查。

## 已定位的认证问题

服务器已识别公钥，先前 BatchMode 登录在本机解锁私钥阶段停止，出现 Permission denied (publickey)。允许交互式输入口令后验证成功。私钥仍保留加密；未修改服务器 SSH 配置。

公网地址来自本次用户提供的实例信息，未验证其是否为静态地址。后续地址变更时更新 SSH 配置的 HostName，并核对主机身份。
