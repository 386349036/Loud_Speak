# 蔬果大冒险 · 设计索引

最新试玩修正：[主角／敌人体型及PNG星光护罩](VISUAL_FIXES.md)。171项运行资源、49项非视觉检查通过，待用户继续试玩确认。下方为上一交付版本记录。

最新交付：[全关卡正式动画V1](ANIMATIONS.md) · [八世界32关说明](CAMPAIGN.md) · [逐关索引](CAMPAIGN_LEVELS.md) · [待办与验收](TODO.md)。2026-10-25：170项运行素材已接入，含26张动画图集、157组动作、628帧；47项非视觉检查通过。视觉/实机验收由用户进行。以下保留历史概念阶段记录，不代表最新实现状态。

更新：2026-10-24。当前阶段：23个角色概念已齐备，开始分层场景资产制作；尚未制作可玩的新游戏或正式运行精灵。

- [主角视觉基准V1](P01_VISUAL_BASELINE.md)：四种表现、动作与昼夜场景。

- [角色总表](ROSTER.md)：23个条目、编号和设计顺序。
- [角色数据](roster.json)：名册唯一结构化数据源；修改后同步总表与单角色卡。
- [能力与战斗规则](ABILITIES.md)：主角状态、敌人交互、首领统一约束。
- [美术规范](ART_DIRECTION.md)：32-bit二维像素方向与交付规格。
- [目录约定](DIRECTORIES.md)：源图、运行素材、代码、测试分类。
- [执行记录](STATUS.md)：已完成与下一步。
- cards/：23份角色设计卡，均已关联透明形象概念。
- [场景设计](scenes/SCENE_DESIGN.md)：八世界、32关节奏草案与制作边界。
- [场景工作台](../../art-source/veggie-adventure/scene-workbench.html)：首批昼夜分层预览、组件表和第一关布局。
- [全关卡场景库](../../art-source/veggie-adventure/scene-library.html)：八世界40张源图与32关资产组合。
- [场景检查记录](scenes/SCENE_ASSET_QA.md)：修订、检查证据与正式运行前待处理项。

验收：运行 `node tools/veggie-adventure/validate-roster.cjs`。

<!-- concept-library -->
## 首轮形象资产库

23个角色均有形象概念，包括已有主角及22张新增角色卡。另完成8张场景和7张配套素材表。

[打开素材总览](../../art-source/veggie-adventure/index.html) · [逐项清单](ASSET_PROGRESS.md) · [后续制作边界](ASSET_HANDOFF.md)
