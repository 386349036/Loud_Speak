# 2026-10-25 试玩反馈修正

用户指出基础主角过小，以及杨桃无敌效果仅为矩形框。

## 体型

原因是原先按整张透明图格缩放。基础主角首个待机帧只占 48×48 图格中的 23 像素高，图格绘制为16像素时，实际主角只有约8像素高。

现在读取每个角色常态动作四帧的 Alpha 包围盒，以中间两帧高度的平均值作比例基准。基础主角的常态实际高度设为18游戏像素，普通敌人为16，成长和辣椒主角为28。每个角色全部动作使用同一缩放系数，固定脚底与中心锚点，不逐帧改变尺寸。碰撞盒、跳跃和伤害规则保持原样。

比例参数保存于 assets/manifest.json 的 animations.actors.*.presentation；渲染布局位于 js/core/sprite-layout.mjs。敌人败退残影使用同一比例。

## 杨桃星光护罩

使用内置 imagegen 重新生成四帧 PNG：金色五角星芒、薄荷绿叶片和圆形能量环，中心透明。替换原矩形描边；随基础／升级／蹲下状态调整覆盖范围，8fps循环，最后2秒降低透明度提示即将结束。原10秒无敌机制不变。

- 源图及完整提示词：art-source/veggie-adventure/effects/star-shield-v1/
- 运行图：public/games/veggie-adventure/assets/effects/star-shield-v1.png
- 构建与比例校准：node tools/veggie-adventure/build-star-shield.cjs
- 若重新生成角色图集，应先运行 build-animations.cjs，再运行 build-star-shield.cjs 重新测量比例。

当前171项运行资源、27张动作／特效图集。49项非视觉检查通过，包括比例锚点、护罩透明中心和无敌启停。没有浏览器或视觉验收；最终比例与护罩观感由用户继续试玩确认。
