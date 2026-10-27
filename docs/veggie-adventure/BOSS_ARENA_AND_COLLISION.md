# Boss战场扩大与固定主角碰撞框

2026-10-27，仅更新当前本地工作区。

## 八个世界战场

1-4至8-4的Boss活动宽度由288扩大到432游戏单位，正好为原来的1.5倍。左边界800保持不变，右边界1088→1232；关卡总长1168→1312，出口1120→1264。进场路线、出生点、补给和Boss激活距离保持不变。

地板和水池边界一起扩展；三座空中战台按中心位置重新分布，台面尺寸及高度保留。Boss和其他角色的大小、血量、攻击伤害、技能冷却均保留。相机和战斗边界使用新场地宽度。

远端弱点开放时间依据距离计算，额外上限增加144/112≈1.29秒，让初始形态仍能跑近后跳起踩击；近距离使用原节奏。没有增加常驻无敌或更改“只有弱点期扣血”的规则。数据见[BOSS_ARENA_EXPANSION_REPORT.json](BOSS_ARENA_EXPANSION_REPORT.json)。

## 三形态碰撞体积

初始、成长和辣椒三种形态均使用12×14的初始碰撞框，蹲下操作也不再改变尺寸。成长外观与护盾的既有显示比例保留，脚底与水平中心锚点保持一致。移动、顶砖、落地、敌人/攻击接触、游泳和边界碰撞统一使用这个碰撞框。

旧存档中的12×28、9.6×22.4、9.6×11.2体积在恢复时规范为12×14，脚底位置不变。八个旧Boss地图登记为历史布局并可迁移，进度、分数及重生规则保留；不接受用当前布局版本伪装旧Boss边界的存档。

## 第一世界空中平台

内置image_gen制作透明PNG：平直明亮木质顶面、深色横梁和少量下垂藤蔓，替代第一世界三座战台的岩石顶面。顶面与原碰撞高度对齐，仍可从下方穿过、落脚及下拉跳下。

- [运行PNG](../../public/games/veggie-adventure/assets/objects/garden-platform-v1/platform-garden-deck.png)：192×64，有真实Alpha，游戏中按战台宽度绘制，高16单位。
- [生成原图](../../art-source/veggie-adventure/objects/garden-platform-v1/generated.png)、[完整提示词](../../art-source/veggie-adventure/objects/garden-platform-v1/prompt.txt)、[裁切与摘要](../../art-source/veggie-adventure/objects/garden-platform-v1/build.json)。
- 构建：`node tools/veggie-adventure/build-garden-platform.cjs`。扩场工具重复执行不会继续扩大。

## 检查边界

259项自动回归通过，包括八世界场地连续性、三形态低通道与相同碰撞、旧体积与八地图存档迁移、远端弱点实际跑跳踩击、镜头边界、PNG透明度及绘制顶面定位。源图和运行PNG已查看；本轮未执行浏览器视觉或完整人工游玩验收。没有提交、推送或发布云端。
