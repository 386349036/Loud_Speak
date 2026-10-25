# 场景01动画替换记录

2026-10-25：已将用户指定场景01参考图对应的三种主角形态、蘑菇与卷心菜接入运行素材。12张生成源图切分为5张图集、42组动作、168帧；同时更新24张旧版备用关键帧，首页主角图标使用同一形象。

源图和提示词：`art-source/veggie-adventure/animations/v2-scene01/`。构建顺序：`node tools/veggie-adventure/build-scene01-animations.cjs`，再执行 `node tools/veggie-adventure/build-star-shield.cjs`。如果重新构建V1，必须再次执行这两步，防止旧图集覆盖新引用。

统一脚底锚点，按源图组校正比例；常态可见高度维持基础18、升级28、敌人16游戏像素。51项逻辑、素材、HTTP与动画检查通过。此结果证明资源和程序接入有效，不代表逐帧形象或游玩观感已验收。

仅修改本地，未提交、推送或发布云端。
