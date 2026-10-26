# 外网游戏加载优化

2026-10-26，已应用于 https://35.221.134.170/games/veggie-adventure/ 。本次是线上版本2d44a81的性能补丁，没有将本地尚未发布的Boss路线、攻击升级等玩法改动一并上线。原发布目录及current链接保留，Node聊天服务无需重启。

## 已上线

- HTTPS启用HTTP/2；蔬果游戏静态文件改由Nginx直接提供，保留证书、HTTP跳转及续约验证路径。
- JavaScript、CSS、JSON启用gzip，mjs保持正确类型；页面和代码每次访问重新验证。
- 229张图片另建无损WebP传输版本，仅保存比PNG小的结果；支持WebP的浏览器自动协商，其他客户端回退PNG。原图不覆盖。
- 图片URL使用内容版本号，启用一年immutable缓存；内容变更后版本号改变。未带版本号的图片重新验证，PNG/WebP按Accept区分缓存。
- 启动只等待共享精灵和当前场景。跨世界及选关房先加载所需素材并暂停计时，完成后继续；并发请求去重，失败保留成功下载的图片并支持重试。

游戏操作和物理在浏览器本机执行，不存在逐帧操作上传；本次重点解决游戏下载与重复访问流量。聊天API继续no-store，公网管理路径继续403，上传请求21MB上限保留。

## 实测

| 项目 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 首关启动前图片 | 229张 | 155张 |
| 首关图片传输量 | 38,893,480字节 | 3,596,094字节 |
| 素材清单传输 | 130,999字节 | 7,396字节，gzip |
| 入口脚本传输 | 11,403字节 | 4,557字节，gzip |
| HTTPS协商 | HTTP/1.1 | HTTP/2 |
| 图片缓存 | no-store | 内容版本＋immutable |

首关图片传输量减少90.75%。全部图片无损协商总量由38.89MB降至27.52MB，其余节省来自按场景加载。

同测点六并发HTTP资源拉取中，原全部图片批次约137秒，现首关图片批次约23秒。下载集合不同，原批次还含少量检查开销，这不是浏览器首屏计时或手机网速承诺。实际外网浏览器已验证首关“开始冒险”可用，且第八世界按需加载后进入游戏，控制台无错误。只读验收未写游戏进度。

250项游戏回归通过，覆盖素材选择、并发上限、去重、重试和跨世界流程；另有3项发布摘要兼容检查。229张原图SHA256全部保持一致；背景、主角精灵和地砖三个代表样本的WebP可见像素及透明度与PNG一致。外网核验包括206范围请求、200健康、403管理保护、PNG回退、304条件请求、gzip及版本缓存。

证据：[metrics.json](qa-game-delivery/metrics.json)、[外网启动截图](qa-game-delivery/online-ready.png)。完整明细位于本机忽略目录.publish中的game-delivery-before.json、game-delivery-after.json、cloud-delivery-images.json、game-delivery-integrity.json。

## 维护

Nginx配置：`/etc/nginx/conf.d/loud-game-delivery-maps.conf`、`/etc/nginx/snippets/loud-game-delivery.conf`，由现有HTTPS站点include。没有全局覆盖聊天缓存策略。

服务器备份：`/opt/loud/operations/performance-20261026T140640Z/`，保存原main.mjs、manifest.json、site.conf。回滚时将其分别恢复到当前游戏js/main.mjs、assets/manifest.json及/etc/nginx/sites-available/loud-speak，执行nginx -t后热重载。恢复站点配置即移除性能include；原PNG始终保留，不必删除数据库或原图。

后续部署脚本在切换版本前调用 `/opt/loud/operations/build-game-delivery.cjs` 生成传输图片和内容版本号。发布校验仅忽略已知格式的deliveryVersion字段，其余清单内容和每个源文件仍严格比较。

仓库工具见tools/operations中的build-game-delivery.cjs、patch-game-loader.cjs、install-game-delivery.sh、probe-game-delivery.cjs、verify-game-delivery.cjs。部署脚本和验证器已同步维护；保留工作区其他修改，未执行Git提交或推送。

配置依据：[Nginx gzip](https://nginx.org/en/docs/http/ngx_http_gzip_module.html)、[静态文件与条件请求](https://nginx.org/en/docs/http/ngx_http_core_module.html)、[HTTP/2](https://nginx.org/en/docs/http/ngx_http_v2_module.html)。当前Nginx为1.24，使用该版本兼容的listen http2语法。
