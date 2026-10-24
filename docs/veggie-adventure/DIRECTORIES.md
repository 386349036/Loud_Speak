# 分类目录

- public/games/veggie-adventure/js/{core,entities,systems,rendering,ui}：运行代码。
- public/games/veggie-adventure/styles：游戏样式。
- public/games/veggie-adventure/levels/world-01至world-08：逐关数据，当前为空。
- public/games/veggie-adventure/assets/{characters,enemies,bosses,items,tilesets,backgrounds,effects,ui,audio/music,audio/sfx}：已处理运行资产。
- art-source/veggie-adventure/{concepts,originals,working,prompts}：概念参考、生成原图、中间稿与提示词，不经public公开。
- tools/veggie-adventure：校验、切图和资源处理工具。
- tests/veggie-adventure：后续逻辑测试和通关回放。
- docs/veggie-adventure/cards：文字与视觉设计卡。

文件采用英文小写加连字符。角色路径与roster.json的assetPrefix一致。
每条运行资产登记id、角色ownerId、相对路径、尺寸、动画帧信息、锚点、源图和提示词记录。
没有正式资产时manifest.assets保持空数组，不能登记不存在的图片。
目录骨架用.gitkeep保留。尚无index.html，不添加首页入口或可玩性声明。
