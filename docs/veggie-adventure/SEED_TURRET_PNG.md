# 植物发射台 PNG

2026-10-26：截图中的紫色柱状占位图对应 `turrets` 固定发射台，朝主角所在一侧发射 `bolt` 蔬菜弹。使用内置 image_gen 生成茄子炮身、绿叶根座和木质炮管，明确表现发射用途，沿用32-bit像素风格。

## 分类归档

- 生成原图：`art-source/veggie-adventure/hazards/seed-turret-v1/generated.png`
- 完整提示词：同目录 `prompt.txt`
- 裁切、尺寸、帧信息和哈希：同目录 `build-report.json`
- 运行图集：`public/games/veggie-adventure/assets/hazards/seed-turret-v1/atlas.png`
- 资产ID：`hazard-seed-turret`；288×144透明PNG，三帧各96×144。
- 重建命令：`node tools/veggie-adventure/build-seed-turret.cjs`

按统一范围裁切，最近邻缩放，三帧根座底线对齐。游戏内绘制22×34，根座贴合发射台原有底线，炮口随射击方向镜像。

## 姿态与玩法

三帧依次为待机、炮口蓄力发光、开火后坐。充能状态直接读取 `windup`；开火姿态读取本发射台刚射出的存活蔬菜弹前0.14秒，方向匹配实际弹体。其余时间待机，渲染不写入游戏状态，也不增加存档字段。

全部17处发射台使用新图。保持原有280px范围、近于24px停止蓄力、0.6秒蓄力、2.5秒冷却和85px/s弹速；蔬菜弹继续使用已有E10正式PNG动画。没有改动地图、碰撞和攻击逻辑。

## 检查

224/224回归通过。额外覆盖三种主角形态、左右双向和17处发射台：306次三姿态/翻转/落地位置绘制、102次真实发射和102次近距离停火检查，确认绘制不修改状态。三帧内容不同、具有真实透明像素、共同根座底线；本地HTTP的渲染模块、manifest和图集与工作区字节一致。

证据：`.publish/seed-turret-final-tests.txt`、`.publish/seed-turret-live-check.json`。仅本地更新，未提交推送或发布外网。浏览器视觉和游玩验收由用户进行，资产保留 `visualVerified: false`。
