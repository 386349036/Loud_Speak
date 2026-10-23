# 大声说话：聊天小花园

视觉方向：奶油白纸感底色、深叶绿、少量番茄红，搭配蔬果围坐聊天的手绘插画。桌面左侧展示品牌和插画，右侧承载消息；手机隐藏插画，优先显示聊天。消息气泡区分自己与其他人，表情保留三倍显示，关闭状态仍显示通用 404 提示。

插画通过内置 image_gen 生成，保存在 `public/assets/veggie-conversation.png`。界面实际使用该本地文件，无外部图片请求。插画为装饰性品牌素材，不包含真实聊天内容或身份信息。

聊天区域配色调整：以暖燕麦纸色 `#eeeadd` 替代大块白底，房间标题和输入区采用浅鼠尾草绿；他人消息为浅奶油纸色，自己的消息为叶绿色。边框沿用低对比的灰绿，文字使用深绿，保持消息层次与插画、页面底色的连续性。

最终生成提示词：

```text
Use case: illustration-story. Asset type: editorial illustration for the sidebar of a Chinese anonymous chat application named Loud Speak, whose anonymous names are friendly vegetables and fruits. Create a polished charming hand-painted gouache and soft grain illustration, vertical 2:3 composition. A cheerful potato, a tomato, a pear and a cucumber sit together around a small round cafe table, having a warm lively conversation. Tiny blank cream speech bubbles float above them. Sophisticated independent magazine / cozy contemporary stationery aesthetic, simple expressive faces, subtle imperfect ink contours, substantial warm ivory background #f7f3e9, forest green leaves, muted tomato coral, butter yellow. Large clean negative space at top 20 percent and bottom 15 percent. Flat perspective with very subtle paper texture, beautiful intentional composition, tasteful and adult-friendly, no 3D, no glossy plastic, no lettering, no text, no watermark, no interface or browser chrome. Full-bleed vertical illustration, not a mockup.
```

验证：本机浏览器检查桌面布局和实际插画加载；390×844 手机布局的页面宽度为 390，无横向溢出；手机表情面板位于可视范围内，选择表情能插入输入框。未向正式聊天室发送设计测试消息，未更改管理员开关或数据保留设置。
