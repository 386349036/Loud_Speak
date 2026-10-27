# 飞行单位专属昏厥PNG

2026-10-27，使用内置image_gen按现有角色参考图生成，两类各12帧，共24帧透明PNG。仅更新本地工作区。

## 角色与运行素材

| 角色 | 新形象特征 | 运行图集 | 无动画备用PNG |
| --- | --- | --- | --- |
| E11 飞翼卷心菜 | 宽叶翅膀下垂，叶脉和橙色小脚保留，闭眼/X眼及眩晕星星，不变为保护壳 | [E11.png](../../public/games/veggie-adventure/assets/animations/flyer-stun-v1/E11.png) | [E11-stunned.png](../../public/games/veggie-adventure/assets/animations/flyer-stun-v1/E11-stunned.png) |
| E09 棉花云牧者 | 白色棉团压低，叶萼和棉絮保留，侧卧昏厥表情，不变成卷心菜 | [E09.png](../../public/games/veggie-adventure/assets/animations/flyer-stun-v1/E09.png) | [E09-stunned.png](../../public/games/veggie-adventure/assets/animations/flyer-stun-v1/E09-stunned.png) |

每类增加`fall-stunned`下坠、`stunned`落地昏厥、`wake`醒转三组四帧动画。运行图集192×336，48×48单帧；原四行飞行、攻击和受击像素完整保留。新帧按原角色显示比例缩放，底部锚点对齐实际落脚位置。原图、提示词与裁切信息分类保存：

- E11：[生成原图](../../art-source/veggie-adventure/animations/flyer-stun-v1/E11/generated.png)、[完整提示词](../../art-source/veggie-adventure/animations/flyer-stun-v1/E11/prompt.txt)。
- E09：[生成原图](../../art-source/veggie-adventure/animations/flyer-stun-v1/E09/generated.png)、[完整提示词](../../art-source/veggie-adventure/animations/flyer-stun-v1/E09/prompt.txt)。
- [构建记录](../../art-source/veggie-adventure/animations/flyer-stun-v1/build.json)；构建命令`node tools/veggie-adventure/build-flyer-stun.cjs`。

## 程序修正

删除飞翼卷心菜昏厥时映射为E02壳兵的分支，删除备用绘制中的`objects-5`壳图；下坠、昏厥和醒转始终使用自身角色图集。现有飞翼敌人仍为3血，首次踩中后昏厥、落地后计时、9秒恢复飞行；昏厥时侧碰无伤害，继续踩至血量耗尽退场。

棉花云兵原有1血规则保留。它被击败时，通过不参与碰撞的表现层落地动画显示自身昏厥PNG，落地短暂停留后退场，不改变得分、伤害或敌人状态。其他飞行单位血量耗尽时也使用自己的下坠/落地表现。表现层会查询真实平台高度，避免尸体停在空中。

## 验证

268项自动回归通过：原飞行像素逐字节保留、24张新帧真实透明且互不相同、两类角色的下坠/落地/醒转映射、无动画备用PNG、飞行单位击败后落到真实平台再退场、三形态踩踏与9秒醒转、存档兼容及全32关表现层不改变物理结果。

生成原图和运行图集已查看；未进行本轮浏览器视觉或人工游玩验收。未提交、推送或发布云端。
