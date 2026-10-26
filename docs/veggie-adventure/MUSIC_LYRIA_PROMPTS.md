# 《蔬果大冒险》配乐清单与 Lyria 提示词

2026-10-25接入更新：以下24首已全部从指定Drive文件夹下载匹配，并新增J06游戏结束、J07重生两段本地原创短音乐。J01因检查点取消仅归档；J02按当前死亡等待裁为0.65秒。实际时长、处理与接入规则见 [FLOWMUSIC_IMPORT.md](FLOWMUSIC_IMPORT.md)，下方保留原生成计划。

## 1. 制作规格

共 **24 首：8 首世界主题曲、8 首首领战曲、3 首系统配乐、5 首事件短曲**。采用你选择的“复古芯片音色＋真实乐器”，全部为纯音乐。

提示词按 Lyria 官方建议组织：**类型、乐器、情绪、节奏、结构**，明确写入 `Instrumental only`，避免默认生成人声。段落标签用于表达音乐结构。[Lyria 官方提示指南](https://ai.google.dev/gemini-api/docs/lyria-prompt-guide)

使用方式：

- 下方每段提示词均可**独立复制**，无需附加公共前缀。
- 世界与战斗音乐默认约 **90 秒**；最终战约 **120 秒**。
- 时长、BPM 和循环结构是生成目标，实际输出需检查；**无缝循环不能仅靠提示词保证**，收到文件后再确定循环点。
- 事件短曲按 **30 秒素材**生成，要求主要旋律在开头完成，后续裁成所需长度。如果所用模式固定输出 30 秒，长曲先作为试听版本，不必强行拼接。[Lyria 生成说明](https://ai.google.dev/gemini-api/docs/music-generation)
- 不填写歌词，不使用现成游戏名或作曲家名作为模仿目标。“32bit”只对应美术方向，音乐用具体音色描述。

## 2. 世界主题曲：W01—W08

各世界前三关及第四关进入首领区域前使用对应主题曲。

### W01｜晨光苔林
文件名：`W01_forest_v1`

方向：轻快、温暖，建立冒险出发的感觉。

```text
Instrumental chiptune and acoustic folk game soundtrack, approximately 90 seconds, 112 BPM, 4/4. A cheerful adventure through a sunlit moss forest. Ocarina carries a memorable melody over marimba, pizzicato strings, warm triangle-wave bass and light shakers. [Theme A] -> [Playful variation] -> [Theme A]. Maintain a buoyant, uncluttered groove. Return naturally to the opening harmony, with no final flourish or fade-out. Instrumental only, no vocals or sound effects.
```

### W02｜根下矿洞
文件名：`W02_mine_v1`

方向：神秘、好奇，保留探索节奏，不做恐怖氛围。

```text
Instrumental chiptune and chamber music game soundtrack, approximately 90 seconds, 96 BPM, 4/4. Curious exploration through an underground root cellar and glowing mineral tunnels. Bass clarinet, muted marimba, plucked cello and soft pulse-wave arpeggios. Use a restrained minor-key melody and dry, delicate percussion. [Exploration theme] -> [Higher-register variation] -> [Exploration theme]. Keep a steady pulse and a repeat-friendly ending without a fade-out. No vocals or environmental sound effects.
```

### W03｜藤架云路
文件名：`W03_sky_v1`

方向：轻盈、向上，适合跳台与高空移动。

```text
Instrumental chiptune and light orchestral game soundtrack, approximately 90 seconds, 124 BPM, 4/4. Leaping between vine platforms high above the clouds. Bright flute, harp arpeggios, springy pizzicato strings, rounded synth bass and light snare percussion. Write an uplifting melody with short ascending phrases. [Airborne theme] -> [Floating variation] -> [Airborne theme]. Keep the rhythm clear and continuous, ending on a turnaround into the opening. No vocals or sound effects.
```

### W04｜莲池花房
文件名：`W04_lotus_v1`

方向：流动、清澈，水下也保持可辨认的节奏。

```text
Instrumental chiptune and ambient acoustic game soundtrack, approximately 90 seconds, 88 BPM, 4/4. Exploring luminous lotus pools and a peaceful aquatic greenhouse. Kalimba, vibraphone, breathy flute, soft synth pads and a gentle plucked bass pulse. Use rippling arpeggios and a clear, graceful melody. [Water theme] -> [Submerged variation] -> [Water theme]. Maintain gentle forward motion and return to the opening harmony without a final cadence. No vocals, splashes or other sound effects.
```

### W05｜刺栗果园
文件名：`W05_orchard_v1`

方向：俏皮中带警惕，适合尖刺和壳体路线。

```text
Instrumental chiptune and quirky chamber music game soundtrack, approximately 90 seconds, 118 BPM, 4/4. A mischievous journey through a thorny chestnut orchard. Staccato bassoon, wooden xylophone, pizzicato strings, short pulse-wave accents and dry hand percussion. Combine playful syncopation with mild suspense. [Sneaking theme] -> [Bouncy variation] -> [Sneaking theme]. Keep the arrangement spacious and the ending ready to repeat. No vocals, jump scares or sound effects.
```

### W06｜辣椒作坊
文件名：`W06_workshop_v1`

方向：机械律动与热力感，避免刺耳工业噪声。

```text
Instrumental chiptune and percussion-driven funk game soundtrack, approximately 90 seconds, 132 BPM, 4/4. Navigating a lively pepper workshop full of rhythmic machinery. Clavinet, rounded synth bass, muted brass, tuned metallic percussion and tight electronic drums. Use a catchy syncopated riff with controlled intensity. [Workshop groove] -> [Percussion variation] -> [Workshop groove]. Sustain a steady beat and finish with a turnaround, not a dramatic ending. No vocals or machine sound effects.
```

### W07｜月夜藤园
文件名：`W07_moonlight_v1`

方向：梦幻、神秘，适合蓝紫夜景，但不催眠。

```text
Instrumental chiptune and nocturnal chamber music game soundtrack, approximately 90 seconds, 104 BPM, 4/4. Exploring moonlit grape vines and softly glowing garden lanterns. Celesta, plucked harp, mellow clarinet, delicate pulse-wave arpeggios and soft frame drum. Use a magical minor-key melody with a gentle but purposeful rhythm. [Moonlight theme] -> [Luminous variation] -> [Moonlight theme]. Return smoothly to the opening harmony without fading out. No vocals or ambient sound effects.
```

### W08｜石榴王庭
文件名：`W08_citadel_v1`

方向：接近终点的庄严与决心，强度低于最终战。

```text
Instrumental chiptune and orchestral adventure soundtrack, approximately 90 seconds, 120 BPM, 4/4. Approaching a grand botanical citadel for the final challenge. Low strings, restrained horns, marimba, focused synth arpeggios and measured timpani. Build a determined minor-key theme with hopeful rising phrases. [Citadel march] -> [Hopeful variation] -> [Citadel march]. Keep the energy sustained rather than cinematic, with a repeat-friendly ending. No vocals, choir or sound effects.
```

## 3. 首领战曲：B01—B08

每首战曲独立制作。音乐提供气氛，不承担攻击计时，实际攻击预兆由游戏表现负责。

### B01｜南瓜门卫
文件名：`B01_pumpkin_v1`

方向：憨厚、有重量的第一场首领战。

```text
Instrumental chiptune and playful orchestral boss battle music, approximately 90 seconds, 132 BPM, 4/4. A bouncy duel with a powerful pumpkin guardian. Low marimba, bassoon, short horn accents, punchy synth bass and compact tom drums. Alternate heavy rhythmic phrases with nimble melodic answers. [Battle riff] -> [Lighter counterphrase] -> [Battle riff]. Start promptly, maintain moderate intensity and return to the opening groove. No vocals or impact sound effects.
```

### B02｜洋葱矿主
文件名：`B02_onion_v1`

方向：厚重滚动、地下压迫感。

```text
Instrumental chiptune and dark chamber boss battle music, approximately 90 seconds, 138 BPM, 4/4. A tense duel with an onion mining lord in a cavern. Low cello ostinatos, bass clarinet, tuned stone-like percussion, pulsing synth bass and tight drums. Use rolling rhythmic patterns and brief rising melodic answers. [Rolling battle theme] -> [Tense variation] -> [Battle theme]. Maintain a clear beat and a repeat-friendly ending. No vocals, rockfall sounds or cinematic explosions.
```

### B03｜玉米骑士
文件名：`B03_corn_v1`

方向：敏捷、决斗感，突出冲刺与反击。

```text
Instrumental chiptune and chamber orchestral duel music, approximately 90 seconds, 148 BPM, 4/4. A nimble battle with a proud corn knight on a high garden platform. Agile strings, bright trumpet phrases, harpsichord, crisp pulse-wave lead and a compact snare rhythm. Use brisk call-and-response melodies and short rhythmic rests. [Duel theme] -> [Counterattack variation] -> [Duel theme]. Keep energy consistent and end with a turnaround. No vocals or weapon sound effects.
```

### B04｜莲藕潜王
文件名：`B04_lotus_v1`

方向：水流感与战斗张力结合。

```text
Instrumental chiptune and aquatic orchestral boss battle music, approximately 90 seconds, 126 BPM, 4/4. A swift battle with a lotus-root creature moving between water and shore. Rippling harp, vibraphone, low woodwinds, flowing synth arpeggios and tight hand drums. Combine fluid melodies with decisive rhythmic accents. [Aquatic battle theme] -> [Surging variation] -> [Battle theme]. Maintain forward momentum and a repeat-friendly ending. No vocals, splashes or bubble sound effects.
```

### B05｜榴莲堡主
文件名：`B05_durian_v1`

方向：坚硬、压迫，但保留蔬果世界的趣味。

```text
Instrumental chiptune and heavy orchestral boss battle music, approximately 90 seconds, 142 BPM, 4/4. Confronting a massive armored durian guardian. Low brass, short cello figures, wooden percussion, firm synth bass and punchy toms. Use a stubborn repeating riff answered by a quick, brighter melody. [Armored theme] -> [Agile countertheme] -> [Armored theme]. Keep the mix clear rather than distorted, and finish on a turnaround. No vocals or collision sound effects.
```

### B06｜辣椒术士
文件名：`B06_chili_v1`

方向：炽热、快速，带施法般的灵动旋律。

```text
Instrumental chiptune and energetic funk-orchestral boss battle music, approximately 90 seconds, 156 BPM, 4/4. A fiery duel with a mischievous chili sorcerer. Rapid synth arpeggios, biting muted trumpet, marimba, syncopated bass and tight electronic drums. Alternate rising and falling melodic phrases over an unwavering groove. [Spellcasting riff] -> [Rhythmic variation] -> [Spellcasting riff]. Keep intensity high without harsh treble and end ready to repeat. No vocals or fire sound effects.
```

### B07｜葡萄双生
文件名：`B07_grape_twins_v1`

方向：左右呼应、交替对话，表现双生首领。

```text
Instrumental chiptune and nocturnal chamber boss battle music, approximately 90 seconds, 144 BPM, 4/4. A moonlit battle against twin grape guardians. Clarinet and celesta exchange short contrasting melodies over plucked strings, pulse-wave bass and crisp percussion. Let the two lead instruments take turns, remaining clearly audible in mono. [First voice] -> [Answering voice] -> [Shared battle refrain]. Maintain a steady groove and a repeat-friendly ending. No vocals or sound effects.
```

### B08｜石榴王
文件名：`B08_pomegranate_king_v1`

方向：全作最强战斗曲，庄严与希望并存。

```text
Instrumental chiptune and orchestral final boss soundtrack, approximately 120 seconds, 160 BPM, 4/4. The decisive battle against the pomegranate king in a botanical throne room. Driving strings, powerful horns, clear pulse-wave lead, deep controlled synth bass and tight timpani-driven percussion. [Royal battle theme] -> [Hopeful countertheme] -> [Intensified battle theme] -> [Opening turnaround]. Begin with immediate momentum and sustain intensity without a long intro or final victory cadence. No vocals, choir or sound effects.
```

不额外生成“残血加速版”；这一版战曲持续播放，避免增加制作量和切换复杂度。

## 4. 系统配乐与事件短曲

### M01｜标题与选关
文件名：`M01_title_v1`

目标：约 60 秒，循环播放，友好且容易记住。

```text
Instrumental chiptune and acoustic folk title-screen music, approximately 60 seconds, 108 BPM, 4/4. A welcoming vegetable-garden adventure about to begin. Ocarina, marimba, warm acoustic guitar, rounded synth bass and light shakers. Introduce a simple, memorable melody immediately, then add a gentle contrasting phrase. [Main theme] -> [Friendly variation] -> [Main theme]. Keep the arrangement light and end on a natural turnaround. No vocals or sound effects.
```

### M02｜杨桃无敌
文件名：`M02_invincible_v1`

目标：生成约 30 秒，取可循环片段；游戏内无敌状态持续 10 秒。

```text
Instrumental chiptune and bright mallet music, approximately 30 seconds, 168 BPM, 4/4. A joyful temporary power-up for a playful platform adventure. Sparkling pulse-wave arpeggios, glockenspiel, bouncy synth bass and light snare percussion. Establish an energetic four-bar hook immediately and repeat it with tiny variations. Keep the rhythm consistent, with no buildup, slowdown or final flourish. No vocals or sound effects.
```

### M03｜结局：花园重生
文件名：`M03_ending_v1`

目标：约 90 秒，完整收束，不循环。

```text
Instrumental acoustic folk and gentle orchestral ending music, approximately 90 seconds, 84 BPM, 4/4. A restored garden at sunrise after a brave little hero's journey. Warm ocarina, acoustic guitar, harp, soft strings and delicate glockenspiel, with subtle chiptune accents. [Quiet relief] -> [Warm celebration] -> [Peaceful farewell]. Let the melody grow naturally, then finish with a clear major-key resolution and a gentle natural decay. No vocals, choir or sound effects.
```

以下五首都是**音乐短句**，不是跳跃、受击等动作音效。即使生成器输出更长，也保留完整原文件交给我裁切。

### J01｜检查点
文件名：`J01_checkpoint_v1`

成品目标：约 2 秒，轻巧、不打断关卡音乐。

```text
Instrumental musical cue for reaching a safe checkpoint in a cheerful garden game. Create an approximately 30-second audio clip with one brief three-note ascending phrase on marimba and a soft bell at the very beginning. Resolve warmly within roughly two seconds, followed by natural decay and spacious silence. Gentle and reassuring, with no percussion buildup, repeated melody, vocals or environmental sound effects.
```

### J02｜死亡与重试
文件名：`J02_retry_v1`

成品目标：约 3 秒，表达失误，不做悲壮失败曲。

```text
Instrumental retry cue for a friendly cartoon adventure. Create an approximately 30-second audio clip with one short descending woodwind phrase, a soft plucked bass note and a tiny pulse-wave response at the beginning. The musical phrase should resolve within roughly three seconds, followed by a clean decay and quiet space. Mildly disappointed but playful and encouraging. No dramatic tragedy, repeated melody, vocals or impact sound effects.
```

### J03｜普通关卡完成
文件名：`J03_level_clear_v1`

成品目标：约 5 秒，用于非首领关。

```text
Instrumental level-clear fanfare for a cheerful garden platform game. Create an approximately 30-second audio clip. At the beginning, play a bright ascending ocarina melody with marimba, light snare and warm major chords. Complete one compact celebratory phrase within roughly five seconds, then let it decay into quiet space. Satisfying but modest, with no repeated sections, vocals, applause or sound effects.
```

### J04｜首领击败
文件名：`J04_boss_clear_v1`

成品目标：约 7 秒，用于前七位首领。

```text
Instrumental boss-victory fanfare combining chiptune and acoustic orchestral instruments. Create an approximately 30-second audio clip. Begin with a confident horn phrase answered by marimba and a bright pulse-wave melody, supported by a short snare flourish. Reach a strong major-key resolution within roughly seven seconds, then allow natural decay and quiet space. Triumphant and playful, not a full song. No vocals, applause or battle sound effects.
```

### J05｜最终胜利
文件名：`J05_final_victory_v1`

成品目标：约 12 秒，随后进入结局音乐。

```text
Instrumental final-victory fanfare for a colorful garden adventure. Create an approximately 30-second audio clip. Start with a proud horn and string melody, then add sparkling glockenspiel, ocarina and subtle pulse-wave accents. Build one uplifting phrase toward a warm major-key resolution within roughly twelve seconds, followed by a gentle natural decay. Grand but intimate, leaving room for a peaceful ending scene. No vocals, choir, applause or sound effects.
```

## 5. 生成顺序、交付与后续接入

**建议生成顺序：**先制作 W01、B01、W07 三首，确认整体音色；然后完成其余世界曲、其余战曲，最后制作系统配乐和事件短曲。这不增加审批步骤，你可以按顺序自行筛选。

交付约定：

- 文件采用上面的名称，保留实际扩展名，例如 `W01_forest_v1.wav`、`W01_forest_v2.mp3`。
- 如果提供无损下载，优先保留 WAV；否则直接交付原始下载文件，不必转格式。
- 一个曲目有多个候选时保留版本号，注明你选中的版本。
- 不必自行裁切、统一音量或处理循环；保留原始文件即可。
- 各曲统一音色与气质，但独立生成不保证自动共享同一条旋律。

收到音频后的实施约定：

- 原始音频、处理后的游戏音频分别分类保存，新增音频清单，通过上述曲目编号关联世界、首领和事件。
- 长曲检查并处理循环接缝；短曲裁切有效乐句；统一听感音量，检查削波及异常静音。
- 标题和选关使用 M01；探索使用对应 W 曲；首领激活切换对应 B 曲；无敌状态临时覆盖配乐，结束后恢复。
- 检查点短句轻量叠加；死亡、过关和胜利短句按事件播放；最终胜利后接 M03。暂停及页面失焦时暂停音频。
- 音频由首次用户操作后启动，提供静音与音乐音量控制；文件加载失败不阻止游戏。
- 检查曲目映射、循环点、暂停恢复、重试与切关切曲；实际听感及游玩搭配由你验收。