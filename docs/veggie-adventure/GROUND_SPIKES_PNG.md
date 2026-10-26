# 地面尖刺 PNG

2026-10-26：使用内置 image_gen 生成透明植物地刺，替换地面陷阱原有粉色三角形。象牙色尖端、赭色侧面和深橄榄色根茎保持32-bit蔬果冒险的像素风格，双刺模块横向重复。

## 资产分类

- 生成原图：`art-source/veggie-adventure/hazards/ground-spikes-v1/generated.png`
- 完整生成提示词：同目录 `prompt.txt`
- 裁切尺寸、哈希与构建记录：同目录 `build-report.json`
- 运行PNG：`public/games/veggie-adventure/assets/hazards/ground-spikes-v1/tile.png`
- 资产ID：`hazard-ground-spikes`；96×48透明画布，游戏内每模块16×8。
- 可重复构建：`node tools/veggie-adventure/build-ground-spikes.cjs`

构建仅按有效alpha范围裁切、最近邻缩小并登记manifest，不重新绘制原图。原始生图输出保留。

## 接入与验证

所有 `kind: spikes` 共17处使用同一PNG，共绘制24个模块，裁切限制在各陷阱原有矩形内。关卡坐标、宽高、伤害、保护和跳跃规则均未修改；热流等其他陷阱不受影响。

224/224既有自动回归通过。额外检查覆盖全部17处的绘制位置/重复数量，确认绘制不改变关卡数据；三形态共204次陷阱内外边界检查通过。PNG含2593个完全透明像素；本地HTTP的渲染模块、manifest和PNG与工作区字节一致。

记录：`.publish/ground-spikes-final-tests.txt`、`.publish/ground-spikes-live-check.json`。仅更新本地，未提交推送或发布外网；浏览器视觉和游玩验收由用户进行，资产仍标记 `visualVerified: false`。
