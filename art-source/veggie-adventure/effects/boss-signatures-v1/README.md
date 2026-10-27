# Boss 专属特效源资产 v1

使用内置 image_gen 工具生成，透明 PNG。每位 Boss 一张2×2四阶段原图；运行切图、缩放和Alpha保留由 `tools/veggie-adventure/build-boss-signature-fx.cjs` 完成。每格128×128，共七张256×256效果图集，另裁七张96×96预警图。原图和完整提示词均保留。

| Boss | 主题 | 原始PNG | 完整提示词 |
|---|---|---|---|
| B02 | 洋葱根晶破土 | [原图](B02/generated.png) | [prompt](B02/prompt.txt) |
| B03 | 玉米回旋穗枪 | [原图](B03/generated.png) | [prompt](B03/prompt.txt) |
| B04 | 莲藕水柱 | [原图](B04/generated.png) | [prompt](B04/prompt.txt) |
| B05 | 榴莲弹跳刺果 | [原图](B05/generated.png) | [prompt](B05/prompt.txt) |
| B06 | 辣椒炉心火柱 | [原图](B06/generated.png) | [prompt](B06/prompt.txt) |
| B07 | 葡萄双生魔珠 | [原图](B07/generated.png) | [prompt](B07/prompt.txt) |
| B08 | 石榴王冠裂籽 | [原图](B08/generated.png) | [prompt](B08/prompt.txt) |

运行目录：`public/games/veggie-adventure/assets/effects/boss-signatures-v1`。帧顺序按左上、右上、左下、右下。地面特效底线对齐，投射物居中；具体裁切框和SHA256见[build.json](build.json)。原图精灵风格为32-bit精细像素，效果显示大小由运行伤害形状确定；透明边缘不额外扩大物理范围。

已在真实 Canvas 渲染中检查七场新招、预警及弱点衔接。完整证据和验收边界见[巡检报告](../../../../docs/veggie-adventure/qa/boss-seven-20261027/REPORT.md)。
