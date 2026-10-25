# Google Cloud SSH 连接记录

记录日期：2026-10-25。已在本对话实际验证 SSH 登录成功。

2026-10-25更新：用户明确要求移除本机私钥口令，已通过Windows OpenSSH完成，公钥不变，并验证私钥加密标记为none。后续 `ssh gcp-hk61023` 无需输入密钥口令。原加密版本保留为本机 `.ssh/id_ed25519_gcp_hk61023_20261025.encrypted-backup-20261025213914`，继承原文件访问权限；未将私钥或口令放入仓库。下方认证故障段落保留历史经过。

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

当前私钥已按用户要求取消口令，可以直接使用BatchMode=yes执行非交互发布。不在此记录中保存私钥内容或旧口令；密钥文件仅保存在本机，原加密备份不参与日常登录。

SSH 别名配置已通过 `ssh -G gcp-hk61023` 验证解析；此前通过同一私钥交互式登录成功，远端 whoami 为 hk61023，hostname 为 instance-20261024-180543。取消口令后仍使用同一私钥与公钥，严格主机校验保持启用。

## 公钥

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILXlea+XuMPOPYqVubICXdCioJ1enNyJI1Uil8fv+rAw hk61023
```

公钥指纹：`SHA256:iUo947boOcrn7t35u5Q8eNAZRJNq5equBbuC+AiCidQ`。

已保存主机 Ed25519 指纹：`SHA256:vzdIPVW9sEXEVvr5CHSm2/RzYFn8hf9RLHYLq2eGDy0`。客户端配置启用严格主机密钥检查。

## 已定位的认证问题

历史：服务器已识别公钥，先前 BatchMode 登录在本机解锁私钥阶段停止，出现 Permission denied (publickey)。允许交互式输入口令后验证成功。此后用户明确要求取消私钥口令，现已完成；未修改服务器 SSH 配置或公钥授权。

公网地址来自本次用户提供的实例信息，未验证其是否为静态地址。后续地址变更时更新 SSH 配置的 HostName，并核对主机身份。
