# 高温火柱陷阱 PNG

2026-10-26，截图中的橙黄矩形对应 `heat` 周期高温火柱，并非主角攻击。原规则为预警、喷发、停歇循环，喷发期接触直接死亡，五角星也不能抵挡。本次仅更换表现。

使用内置 image_gen 生成四帧透明PNG：第一帧为带裂纹的炽热喷口和余烬，后三帧为不同形态的橙红、金黄和亮白火舌。沿用32-bit像素风格。

## 资产与构建

- 源图：`art-source/veggie-adventure/hazards/heat-vent-v1/generated.png`
- 完整提示词：同目录 `prompt.txt`
- 裁切、帧尺寸及哈希：同目录 `build-report.json`
- 运行图集：`public/games/veggie-adventure/assets/hazards/heat-vent-v1/atlas.png`
- ID：`hazard-heat-vent`；图集384×192，四帧各96×192，实际绘制16×32。
- 构建：`node tools/veggie-adventure/build-heat-vent.cjs`

构建保留透明通道，按相同范围裁切，最近邻缩放，各帧喷口底线对齐。第一帧有效图像高49px，三张喷发帧高191–192px。

## 运行行为与检查

全部30处 `heat` 陷阱共用该图集。停歇时喷口较暗，预警时喷口脉冲亮起，喷发时每秒10帧循环三种火舌。裁切限制在原陷阱16×32范围，不改变坐标、尺寸、伤害、周期与持续时间。其余陷阱维持原有表现。

自动检查覆盖30处、五个时间点共150次图集阶段/坐标绘制，以及三形态、陷阱内外共900次伤害检查（含五角星状态）。检查四帧透明像素、不同图像和共同底线，本地HTTP渲染模块、manifest及图集与工作区字节一致。全关卡图集裁切检查兼容角色和独立陷阱图集，继续校验源裁切尺寸与边界。

224/224回归通过。记录：`.publish/heat-vent-live-check.json`、`.publish/heat-vent-final-tests.txt`。仅本地更新，未提交推送或发布外网；浏览器视觉和游玩验收由用户进行，资产保留 `visualVerified: false`。
