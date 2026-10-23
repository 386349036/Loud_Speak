import React, { createContext, useContext } from 'react';
import extraTranslations from './zh-extra.json';
import englishTranslations from './zh-english.json';

export const LanguageContext = createContext({lang:'zh',setLang:()=>{}});
export function readLanguage(storage) {
  try { const value=storage.getItem('loud.sinharaja.language'); return ['zh','en','si'].includes(value)?value:'zh'; }
  catch { return 'zh'; }
}
export const zh = {
  callsign:'护林员呼号：雄狮-01',vitals_stable:'生命体征稳定',critical_trauma:'危险：重伤',adrenaline_boost:'肾上腺素增益',thermal_safe:'体温安全',stealth_silent:'隐蔽',stealth_alert:'警戒',stealth_danger:'危险',crank_prompt:'[R 手摇充电]',crank_hud:'手摇发电机',crank_action:'手摇充电',acoustic_sensor:'声音传感器（分贝）',stamina:'体力',battery:'电量',sanity:'精神',health:'生命',warmth:'体温',predator_stalking:'猛兽正在接近！[F 开灯]',venom_warning:'中毒',leeches_attached:'附着的水蛭',
  salt:'盐',herb:'治疗草药',balm:'驱蛭药膏',tea:'草药茶',ginger_tea:'姜茶',camera:'相机',torch_on:'手电已开启',torch_off:'手电已关闭',uv_on:'紫外灯已开启',uv_off:'紫外灯已关闭',interact:'交互',zoom:'缩放',evidence:'证据',map:'战术地图',bag:'背包',pause:'暂停',fullscreen:'全屏',exit_fullscreen:'退出全屏',prompt_interact:'按 [E] 交互',prompt_read:'按 [E] 阅读',prompt_open:'按 [E] 打开',prompt_listen:'按 [E] 收听',
  mission_paused:'探险已暂停',expedition_overview:'辛哈拉贾探险 · 战术控制',resume:'▶ 继续探险',evidence_board:'案件证据板',achievements:'成就与奖杯',field_guide:'野生动物图鉴',controls_guide:'键鼠操作说明',restart_mission:'重新开始任务',quit_to_menu:'返回章节选择',audio_status:'声音：',camera_view:'视野：',survival_difficulty:'难度：',touch_controls:'触屏控制：',language_select:'语言：',difficulty_tactical:'🛡️ 战术模式',difficulty_hardcore:'⚔️ 噩梦模式（1.55 倍）',audio_on:'开启',audio_muted:'静音',cam_normal:'标准（1.0 倍）',cam_wide:'广角（0.75 倍）',controls_joystick:'模拟摇杆',controls_dpad:'方向按键',
  expedition_dossier:'辛哈拉贾雨林探险档案',tagline_main:'雨林生存与失踪谜案调查',select_chapter:'选择探险章节',locked_desc:'完成之前的章节并收集证据后解锁。',launch_expedition:'开始探险',completed_badge:'已完成',evidence_found:'已发现证据：',game_over_dead_title:'生命耗尽',game_over_dead_msg:'你没能抵御雨林中的危险。记得及时治疗，并留意周围环境。',game_over_insane_title:'迷失于黑暗',game_over_insane_msg:'黑暗中的恐惧击溃了你的精神。保持照明，靠近营火恢复状态。',victory_title:'区域探险完成',victory_hero_msg:'全部证据已核实！你揭开了雨林深处的秘密。',victory_survivor_msg:'你成功生还！再次挑战，找齐三份证据。',play_again:'重玩本章',next_chapter:'前往下一章',
};
const words = new Map();
let partialPattern;
export function addTranslation(source,target) { if(source){words.set(source.replace(/\s+/g,' ').trim(),target);partialPattern=null;} }
export function registerDictionary(locales) {
  for(const key of Object.keys(zh))for(const locale of ['en','si'])addTranslation(locales[locale][key],zh[key]);
}
const pairs = {
  'READY':'可出发','CLASSIFIED':'未解锁','✓ COMPLETED':'✓ 已完成','KEYBOARD & MOUSE CONTROLS':'键鼠操作说明','Pause Menu':'暂停菜单','EN ⟷ සිංහල':'中文 / English / සිංහල','සිංහල ⟷ EN':'中文 / English / සිංහල',
  'The Kudawa Trailhead':'库达瓦林间小径','The Mist Gorge & Cascades':'迷雾峡谷与瀑布','The Subterranean Caverns':'地下洞窟','The Forgotten Facility':'被遗忘的研究所','The Colossus Canopy & Final Truth':'巨树冠层与最终真相',
  'කුඩව අඳුරු මාවත':'库达瓦林间小径','මීදුම් නිම්නය සහ මහා දියඇලි':'迷雾峡谷与瀑布','යක්ෂ ගිරි භූගත අගාධය':'地下洞窟','නටබුන් වූ රහස් පර්යේෂණාගාරය':'被遗忘的研究所','මහා නාවෘක්ෂය සහ අවසාන සත්‍යය':'巨树冠层与最终真相',
  'අතුරුදහන් වූ ගවේෂකයන්ගේ ආරම්භක හෝඩුවාවන් සෙවීම':'追寻失踪探险队留下的最初线索','අධික ශීතල, ඝන මීදුම සහ කැඩුණු කේබල් කරත්තයේ අභිරහස':'严寒、浓雾与损坏缆车的谜团','පොළොව යට සැඟවුණු ප්‍රාග් ඓතිහාසික ලෙන් සංකීර්ණය':'探索隐于地下的史前洞窟','අතහැර දැමූ 1987 රසායනාගාරය සහ අමුතු සංඥා':'废弃的 1987 年实验室与神秘信号','වලාකුළු මට්ටමේ මහා ගස් වියන සහ අවසාන හෙළිදරව්ව':'攀上云间巨树，揭开最后的秘密',
  'කූඩැල්ලන් පිරි මඩ වගුර සහ ගංගා නිම්නය තරණය කර අතහැර දැමූ මුරපොළේ දිනපොත සහ භූගත ලෙනේ සාම්පල සොයාගෙන හෙලිපෑඩ් වෙත ළඟා වන්න.':'穿越遍布水蛭的泥沼与河谷，寻找废弃哨所的日记和洞窟中的样本，再前往直升机坪。',
  'ශීතලෙන් මිදී (Body Warmth) උණ බම්බු පහුර සහ කේබල් කරත්තය (Cable Trolley) අලුත්වැඩියා කර, පැරණි භූවිද්‍යා කඳවුරේ සිතියම, හඬපටය සහ නිල් ස්ඵටිකය සොයාගෙන සංඥා කුලුන දල්වන්න.':'保持体温，修复竹筏与缆车，找到地质营地的地图、录音带和蓝色水晶，启动信号塔。',
  'භූගත අන්ධකාරයේ වෙසෙන අද්භූත සතුන් සහ පැරණි ශිලා ලේඛන මැදින් භූගත ගංගාව තරණය කර 1987 රහස් ලෙන සොයා යන්න.':'穿越地下河，调查黑暗中的奇异生物和古老碑文，寻找 1987 年的秘密洞窟。',
  'ගස් මුල්වලින් වැසුණු රහස් පර්යේෂණ කඳවුරේ ජෙනරේටර් පණගන්වා, අගුළු දැමූ විද්‍යාගාරයේ රහස් ලිපිගොනු සහ DNA සාම්පල සොයාගන්න.':'启动被树根吞没的研究营地发电机，在上锁的实验室寻找机密档案与 DNA 样本。',
  'අඩි 150ක් උසින් පිහිටි යෝධ නාවෘක්ෂ වියන් පාලම (Canopy Walkway) මතින් නැගී, 1987 අතුරුදහන් වීමේ සම්පූර්ණ සත්‍යය හෙළිකර අවසාන ගලවාගැනීමේ යානය අමතන්න.':'登上约 150 英尺高的巨树冠层步道，查明 1987 年失踪事件的真相，呼叫最后的救援飞机。',
  'STORM // MIDNIGHT PROTOCOL':'暴风雨 · 午夜行动','HEAVY MIST // CRYOGENIC GORGE':'浓雾 · 冰冷峡谷','SUBTERRANEAN // BIOLUMINESCENT':'地下 · 生物荧光','COMPLEX 87 // INDUSTRIAL BLACKOUT':'87 号设施 · 全面断电','STRATOSPHERE // GOLDEN CANOPY':'高空 · 金色树冠',
  'මෙහෙයුම් ඉලක්ක හා සාක්ෂි:':'任务目标与证据：','ලෙයින් පෙඟුණු දිනපොත':'染血的日记','පුරාණ පිත්තල යතුර':'古老黄铜钥匙','පර්යේෂණ සාම්පලය':'研究样本','භූවිද්‍යා සිතියම':'地质地图','පටිගත කළ හඬපටය':'录音带','නිල් ස්ඵටික සාම්පලය':'蓝色水晶样本','ශිලා ලේඛන පිටපත':'碑文拓本','පුරාණ තෙල් පහන':'古老油灯','ප්‍රතිදීප්ත පාෂාණය':'荧光矿石','රහස් ලිපිගොනුව':'机密档案','ප්‍රවේශ කාඩ්පත':'门禁卡','විකෘති DNA සාම්පලය':'变异 DNA 样本','ගවේෂණ කළු පෙට්ටිය':'探险黑匣子','අවසාන සංඥා උපකරණය':'最终信标','මහාචාර්ය ඩග්ලස්ගේ සටහන':'道格拉斯教授的记录',
  'Chapter 01 අවසන් කර සාක්ෂි එකතු කිරීමෙන් පසු විවෘත වේ.':'完成第一章并收集证据后解锁。','Chapter 02 සාර්ථකව නිම කරන්න.':'完成第二章后解锁。','Chapter 03 සාර්ථකව නිම කරන්න.':'完成第三章后解锁。','සියලු පරිච්ඡේදවල සාක්ෂි එකතු කිරීමෙන් පසු විවෘත වේ.':'集齐之前章节的证据后解锁。',
  'ELAPSED TIME':'探险用时','EVIDENCE RECOVERED':'已收集证据','WILDLIFE PHOTOS':'动物照片','BLUE MAGPIE FEATHERS':'蓝鹊羽毛','HEALTH REMAINING':'剩余生命','MENTAL SANITY':'精神状态','EVIDENCE BOARD':'证据板','REPLAY CHAPTER 01':'重玩第一章','CHAPTER SELECT':'章节选择','PROCEED TO CHAPTER 02 ▶':'前往第二章 ▶','ITEM ACQUIRED:':'获得物品：','CONTINUE [SPACE / ESC]':'继续 [空格 / Esc]',
  'Douglas Field Journal':'道格拉斯的野外日记','Antique Brass Key':'古老黄铜钥匙','Ancient Monolith Cave & Sample':'巨石洞窟与研究样本','Extraction Helipad':'撤离直升机坪','Kudawa Outpost Door':'库达瓦哨所的门','Tactical Radio Dispatch (1987)':'战术无线电（1987）','Prof. Douglas Voice Reel (1987)':'道格拉斯教授的录音（1987）','Herbal Leech Repellent Balm':'草药驱蛭膏','Professor Douglas Field Journal (Evidence 01)':'道格拉斯教授的日记（证据一）','Tactical UV Night Filter Lens':'紫外夜视镜片','Hot Ceylon Ginger Tea Mug':'热锡兰姜茶','Emergency Salt Pouch':'应急盐袋','Veteran Ranger Gunadasa':'资深护林员古纳达萨','Antique Brass Monolith Key (Evidence 02)':'巨石门黄铜钥匙（证据二）','Ancient Monolith Cave Portal':'古老巨石洞窟入口','Bioluminescent Flora Sample (Evidence 03)':'荧光植物样本（证据三）','Extraction Helipad Distress Flare Launcher':'撤离点求救信号弹','Sri Lankan Green Pit Viper':'斯里兰卡绿蝮蛇','Ceylon Blue Magpie Feather':'锡兰蓝鹊羽毛',
  'W A S D / ඊතල':'W A S D / 方向键','ඇවිදීම (Move Explorer)':'移动','වේගයෙන් දිවීම (Sprint)':'冲刺','කූඩැල්ලන්ට ලුණු දැමීම (Throw Salt)':'撒盐驱赶水蛭','ඖෂධ භාවිතය / විෂ නාශනය (Heal & Antivenom)':'治疗 / 解毒','හෑන්ඩ්-ක්‍රෑන්ක් ඩයිනමෝවෙන් ආරෝපණය (Recharge Battery)':'手摇发电，补充电量','කූඩැලි ආලේපනය (Leech Balm 90s Buff)':'涂抹驱蛭膏（90 秒）','ගිනිමැලය අසල ඔසුපැන් පෙරීම (Brew Tea)':'在营火旁冲泡草药茶','ඉඟුරු තේ පානය (Ginger Tea / Warmth +40%)':'饮用姜茶，恢复体温','ක්ෂේත්‍ර කැමරාව (Wildlife Camera Snapshot)':'拍摄野生动物','පාරජම්බුල කිරණ (UV Blacklight Mode)':'紫外照明','දුරදක්න කැමරාව (Binoculars Zoom)':'望远镜缩放','විදුලි පන්දම (Flashlight On/Off)':'开关手电','පරීක්ෂාව / ඇරීම (Interact)':'检查 / 打开','සිතියම (Tactical Map)':'战术地图','බඩු මල්ල (Inventory Backpack)':'背包','පරීක්ෂා කරන්න (INTERACT)':'按 E 交互','ක්‍රියාත්මක කරන්න [E]':'按 E 交互',
  'Ancient Monolith Rune Dial Lock':'巨石门符文转盘','Align the 3 secret runes noted in Douglas\'s journal:':'按道格拉斯日记的提示排列三个符文：','“At dawn as the Sun rises... across the River... enter the Lion\'s sanctuary...”':'“黎明，太阳升起……渡过河流……进入雄狮的圣所……”',
};
for(const [source,target]of Object.entries(pairs))addTranslation(source,target);

const missionText = {
  'EXPEDITION HQ':'探险总部','CHAPTER 01: කුඩව අඳුරු මාවත':'第一章：库达瓦林间小径',
  'ඔබේ ප්‍රධාන ඉලක්කය: අතුරුදහන් වූ ගවේෂකයන්ගේ සාක්ෂි 3ම (දිනපොත, පිත්තල යතුර, පර්යේෂණ සාම්පලය) සොයාගෙන කඳු මුදුනේ ඇති හෙලිපෑඩ් වෙත ළඟා වන්න!':'主要目标：找到失踪探险队的三份证据（日记、黄铜钥匙、研究样本），再前往山顶直升机坪！',
  'ACTIVE OP':'当前任务','සාක්ෂි ප්‍රගතිය:':'证据进度：','මුරපොළේ දිනපොත කියවන්න':'阅读哨所的日记','පුරාණ පිත්තල යතුර සොයාගන්න':'寻找古老黄铜钥匙','පර්යේෂණ සාම්පලය අහුලාගන්න':'收集研究样本','හෙලිකොප්ටර් කලාපයට යන්න':'前往直升机坪','ගවේෂක උපදෙස් (FIELD INTEL)':'野外行动提示','WASD / ඊතල':'WASD / 方向键','හෝ තිරය මත':'或在屏幕上','ක්ලික් කර':'点击','ඇවිදින්න.':'移动。','ගිනිමැලය අසල':'在营火旁按','ඔබා ඔසුපැන් පෙරන්න |':'冲泡草药茶；按','ඔබා Zoom කරන්න | මඟ පෙන්වුම් පුවරු අනුගමනය කරන්න!':'缩放视角，并沿路标前进！','මුරපොළ කුටිය: වැස්සෙන් ආරක්ෂිතයි (Sanity & Battery ආරෝපණය වේ)':'哨所小屋：可避雨，恢复精神与电量',
  'MAP [M]':'地图 [M]','SNAP':'拍照','WIDE':'广角','HUD':'界面','HIGH':'高画质','MEDIUM':'中画质','LOW':'低画质','FULL':'全屏','MAP':'地图','CRANK (':'手摇充电（','2.5D VIEW':'等距视角','1ST PERSON':'第一人称','VIT':'生命','PSY':'精神','ZH':'中文',
  'භාෂාව මාරු කරන්න / Switch Language':'切换语言：中文 / English / සිංහල','ශබ්ද පාලනය':'声音开关','ක්ලික් කර සම්පූර්ණ සිතියම බලන්න [M]':'按 M 查看完整地图','කැමරාවෙන් ඡායාරූපයක් ගන්න [C]':'按 C 拍照','දුරදක්නය / Zoom [Z]':'按 Z 缩放','HUD දර්ශනය පාලනය කරන්න [V]':'按 V 切换界面','සිතියම [M]':'地图 [M]','කූඩැලි විකර්ෂක ආලේපනය [B]':'驱蛭药膏 [B]','ගිනිමැලය අසල ඔසුපැන් පෙරන්න':'在营火旁冲泡草药茶','ක්ෂේත්‍ර කැමරාවෙන් ඡායාරූපයක් ගන්න [C]':'使用相机拍照 [C]','හෑන්ඩ්-ක්‍රෑන්ක් ඩයිනමෝවෙන් ආරෝපණය කරන්න [R]':'手摇发电机充电 [R]',
  '[E] Open / Close Door':'[E] 开门 / 关门','[E] Listen to Transmission':'[E] 收听无线电','[E] Play Audio Reel':'[E] 播放录音','[E] Pick Up (+2 Leech Balm)':'[E] 拾取驱蛭膏 ×2','[E] Read / Secure Evidence 01':'[E] 阅读并收集证据一','[E] Pick Up Tactical UV Lens':'[E] 拾取紫外镜片','[E] Drink Tea (Sanity +30%)':'[E] 喝茶（精神 +30%）','[E] Pick Up (+4 Salt)':'[E] 拾取盐 ×4','[E] Talk to Gunadasa':'[E] 与古纳达萨交谈','[E] Pick Up Key':'[E] 拾取钥匙','[E] Unlock Rune Portal':'[E] 解开符文门','[E] Collect Research Sample':'[E] 收集研究样本','[E] Fire Extraction Signal Flare':'[E] 发射求救信号弹','[E] Repel with Torch Beam':'[E] 用手电光束驱赶','[E] Pick Up Feather (+25% Speed)':'[E] 拾取羽毛（速度 +25%）',
  'November 14, 1987 Ranger Dispatch':'1987 年 11 月 14 日护林员通报','1987 RANGER DISPATCH':'1987 年护林员通报','Professor Douglas Voice Reel (1987)':'道格拉斯教授的录音（1987）','PROF. DOUGLAS (1987)':'道格拉斯教授（1987）','OLD RANGER GUNADASA':'老护林员古纳达萨','Field Journal Secrets (Evidence 01)':'日记中的秘密（证据一）','Blood-Stained Field Journal (Evidence 01)':'染血的野外日记（证据一）','Sinharaja Expedition Field Journal':'辛哈拉贾探险日记','Antique Brass Key (Evidence 02)':'古老黄铜钥匙（证据二）','Monolith Cave Portal Unsealed!':'巨石洞窟入口已开启！','Expedition Secrets Secured! (Evidence 03)':'探险秘密已查明！（证据三）','Sinharaja Bioluminescent Flora Sample':'辛哈拉贾荧光植物样本','Green Pit Viper Repelled':'已驱赶绿蝮蛇',
  "'(Static crackle... Heavy thunderclap...) HQ... This is Kudawa Outpost 01... Flash flood conditions along the valley river. Professor Douglas has departed toward the monolith cave portal. He has not returned... (Transmission lost)'":'“（电流声……雷鸣……）总部，这里是库达瓦 01 号哨所。河谷发生山洪，道格拉斯教授已前往巨石洞窟入口，至今未归……（信号中断）”',
  "'This is Professor Douglas... The subterranean monolith cipher is [SUN, RIVER, LION]. The river is rising fast; we must secure the bioluminescent flora sample and rendezvous at the summit helipad before flash flooding traps us...'":'“我是道格拉斯教授。地下巨石门的密码是【太阳、河流、雄狮】。河水正迅速上涨！必须带上荧光植物样本，在山洪封路前赶到山顶直升机坪会合……”',
  "Field Journal logged! Douglas's team crossed toward the monolith cave portal. Locate the antique brass key resting on the river boulder. Beware of leeches in the damp mud!":'已记录野外日记！道格拉斯一行前往巨石洞窟。请寻找河中巨石上的黄铜钥匙，小心泥地中的水蛭！',
  "'November 14, 1987: They moved into the subterranean sanctuary. Three ancient dials lock the portal: [SUN, RIVER, LION]. The portal gate mechanism requires the heavy brass key left on the river boulder!'":'“1987 年 11 月 14 日：他们进入了地下圣所。石门由三只古老转盘锁住，密码是【太阳、河流、雄狮】。启动石门还需要留在河中巨石上的黄铜钥匙！”',
  "'Greetings officer! I am Gunadasa, 40 years guarding Sinharaja forest. Back in the torrential tempest of 1987, Professor Douglas set out from this outpost toward the monolith cave portal. Take this salt pouch, herbal balm, and wild medicinal herbs. Beware the leeches in the muddy hollows!'":'“你好！我是古纳达萨，在这片森林守护了四十年。1987 年那场暴风雨中，道格拉斯教授从这里出发，前往巨石洞窟。带上这些盐、药膏和草药，小心泥洼里的水蛭！”',
  'Emergency weather warning! Torrential flash flooding along the riverbed. Cross via the massive fallen log bridge and breach the monolith cave gate!':'紧急天气预警：河道突发山洪！请通过倒木桥过河，打开巨石洞窟的大门！',
  'You recovered the antique brass key required to breach the monolith cave entrance! Simultaneously, a torrential tropical gale has struck the valley. Cross safely over the fallen timber bridge!':'你找到了开启巨石洞窟的黄铜钥匙！热带暴风雨正席卷河谷，请沿倒木桥安全过河。',
  'Monolith portal breached! Enter the subterranean cavern and extract the bioluminescent research vial!':'石门已开启！进入地下洞窟，取回荧光植物研究样本！',
  'The heavy stone monolith groaned open in response to the ancient cipher. An eerie cyan bioluminescent glow radiates from within the cavern sanctuary!':'输入古老密码后，沉重的巨石门轰然开启。洞窟深处透出神秘的青色荧光。',
  'All 3 critical expedition clues recovered! Proceed immediately to the ridge extraction helipad at [545, 855]. Chopper-01 standing by!':'三份关键证据已收齐！立即前往山脊撤离点 [545, 855]，01 号直升机正在待命！',
  "You secured Professor Douglas's rare bioluminescent Sinharaja flora vial! All Chapter 1 evidence is accounted for. Climb to the summit extraction helipad to signal the rescue chopper!":'你找到了道格拉斯教授采集的稀有荧光植物样本！第一章证据已收齐。登上山顶直升机坪，向救援直升机发信号！',
  "Red flare sighted through the storm! Descending on Kudawa ridge now... All of Douglas's expedition evidence secured! Outstanding mission, officer!":'已在暴风雨中发现红色信号弹！正在降落库达瓦山脊……道格拉斯探险队的证据全部找回，任务完成！',
  'Blinded by the intense beam of your tactical flashlight, the venomous viper slithered back into the high canopy! The jungle trail is clear.':'强烈的手电光束驱走了毒蛇，它退回高处树冠。林间小路现在安全了。',
};
for(const [source,target]of Object.entries(missionText))addTranslation(source,target);
const notices={
  'පැවැත්මේ බඩු මල්ල (SURVIVAL BACKPACK)':'野外生存背包','✕ CLOSE [I]':'✕ 关闭 [I]','✕ CLOSE [M]':'✕ 关闭 [M]','පිරිසිදු ලුණු පැකට් (Salt Pouches)':'盐袋','කූඩැල්ලන් ශරීරයට එල්ලී ලේ උරා බොද්දී ඔවුන් විනාශ කිරීමට භාවිතා කරයි.':'用于去除附着在身体上吸血的水蛭。','විසි කරන්න [1]':'撒盐 [1]','සුවදායක වැසි වනාන්තර ඖෂධ (Medicinal Herbs)':'雨林治疗草药','තුවාල සුවපත් කර +30 Health ලබාදෙන දුර්ලභ සිංහරාජ වනජීවී පැළෑටියකි.':'稀有雨林草药，可治疗伤口并恢复 30 点生命。','කූඩැලි විකර්ෂක ආලේපනය (Leech Repellent Balm)':'驱蛭药膏','කූඩැල්ලන් විකර්ෂණය කරන දේශීය තෙලකි. තත්පර 90ක් යනතුරු කූඩැල්ලන් පළා යයි.':'当地草药制成的药膏，使用后驱赶水蛭 90 秒。','ක්ෂේත්‍ර කැමරාව (Expedition Field Camera)':'野外探险相机','ඡායාරූප ගෙන ඇත:':'已拍摄照片：','සිංහරාජයේ ආවේණික සතුන් (කැහිබෙල්ලා, කළු වඳුරා, පොළඟා, කලාමැදිරියන්) සමීපයේදී ඡායාරූප ගන්න.':'靠近蓝鹊、猴子、毒蛇和萤火虫等雨林动物拍照。','ක්‍ෂේත්‍ර විදුලි පන්දම (Heavy Halogen Torch)':'强光手电','බැටරි:':'电量：','% | තත්ත්වය:':'% · 状态：','ඝන අන්ධකාරය දුරු කර Sanity ආරක්ෂා කරගැනීමට අවශ්‍ය වේ.':'照亮黑暗，保护精神状态。',
  'MAP LEGEND & ADVISORY':'地图图例与提示','ඔබගේ ස්ථානය:':'当前位置：','තත්‍ය කාලීන GPS සංඥාව':'实时定位信号','වත්මන් ඉලක්කය:':'当前目标：','ප්‍රමුඛ හෝඩුවාව':'优先调查线索','ගිනිමැල කලාප:':'营火区域：','Health / Sanity සුවපත් කරයි & ඔසුපැන්':'恢复生命与精神，可冲泡草药茶','අන්තරායකර කලාප:':'危险区域：','කූඩැල්ලන් සහ ගැඹුරු දියපාරවල්':'水蛭与深水河流','YOU (EXPLORER)':'你（探险者）','[ENTRY] KUDAWA ENTRY (කඳවුර)':'[入口] 库达瓦营地','[OUTPOST] RANGER OUTPOST (මුරපොළ)':'[哨所] 护林员哨所','[CROSSING] RIVER CROSSING (ඔරු තොට)':'[渡口] 过河点','[HAZARD] LEECH SWAMP (කූඩැලි වගුර)':'[危险] 水蛭沼泽','[CAVE] RUNIC CAVE (පුරාණ ලෙන)':'[洞窟] 古老符文洞窟','[EXTRACT] EXTRACTION HELIPAD (හෙලිපෑඩ්)':'[撤离] 直升机坪','මුරපොළේ ගිනිමැලය':'哨所营火','ලෙන් දොරටුවේ ගිනිමැලය':'洞口营火',
  'සිංහරාජ වනජීවී සටහන් සහ ඇල්බමය':'辛哈拉贾野生动物图鉴与相册','වනජීවී සටහන් (FIELD GUIDE)':'野生动物图鉴','ඡායාරූප ඇල්බමය (':'照片相册（','FIELD PHOTO':'野外照片','UNLOCKED [VERIFIED]':'已解锁 · 已核实','CLASSIFIED [LOCKED]':'未解锁',
  'හෑන්ඩ්-ක්‍රෑන්ක් ඩයිනමෝවෙන් ආරෝපණය (Crank Dynamo +14% Battery)':'手摇发电机充电（电量 +14%）',
  'KUDAWA TRAIL // MIDNIGHT PROTOCOL':'库达瓦小径 · 午夜行动','LAT 6.40°N | LON 80.45°E | RAIN':'北纬 6.40° · 东经 80.45° · 雨天','ධ්වනි සංවේදකය (Acoustic Sensor) - ධාවනය හා ක්‍රෑන්ක් කිරීම මඟින් ශබ්දය වැඩි වේ':'声音传感器：奔跑和手摇充电会增加噪声','ග්‍රැෆික් මට්ටම / Graphics Quality [O] (High / Medium / Low)':'按 O 切换画质：高 / 中 / 低','දසුන වෙනස් කරන්න (1st Person IGI / 2.5D Isometric) [V]':'切换第一人称 / 等距视角 [V]',
  '🌿 Picked up Herbal Leech Repellent Balm! Apply with [B] for 90s protection.':'🌿 已拾取驱蛭药膏！按 B 使用，保护 90 秒。',
  "📖 Secured Professor Douglas's Field Journal! (Evidence 01/03)":'📖 已收集道格拉斯教授的日记！（证据 1/3）',
  '🟣 Acquired Tactical UV Filter! Press [U] to toggle UV Blacklight for hidden runes.':'🟣 已拾取紫外镜片！按 U 查看隐藏符文。',
  '☕ Drank Hot Ceylon Ginger Tea! Sanity +30% & hypothermia cured.':'☕ 已饮用热姜茶！精神 +30%，解除失温。',
  '🧂 Picked up Salt Pouch! (+4 Salt) Press [1] or Space to purge attached leeches.':'🧂 拾取盐袋（盐 +4）！按 1 或空格去除水蛭。',
  "🧙‍♂️ Ranger Gunadasa: 'Officer, study Douglas's tape reel on the workbench, take the supplies, and head for the river!'":'🧙‍♂️ 古纳达萨：听听工作台上的道格拉斯录音，带上补给，前往河边！',
  '🔑 Secured Antique Brass Key! (Evidence 02/03)':'🔑 已收集古老黄铜钥匙！（证据 2/3）','⛩️ Monolith cave portal is already unsealed.':'⛩️ 巨石洞窟的门已经打开。','⚠️ The monolith gate is locked! Find the antique brass key resting atop the river boulder.':'⚠️ 石门已上锁！寻找河中巨石上的黄铜钥匙。',
  '🧪 Secured Bioluminescent Flora Sample! (Evidence 03/03 - All Evidence Recovered!)':'🧪 已收集荧光植物样本！（证据 3/3，已全部收齐）','⚠️ Must collect all 3 evidence items (Journal, Key, Specimen) before calling extraction chopper!':'⚠️ 呼叫救援前须集齐日记、钥匙与样本三份证据！','🚀 Distress rocket fired high into the storm! Chopper-01 extraction inbound!':'🚀 求救信号弹已发射！01 号救援直升机正在赶来！',
  '🚪 Opened Kudawa Outpost door. Rain echoes outside.':'🚪 哨所的门已打开，外面传来雨声。','🚪 Closed Kudawa Outpost door.':'🚪 哨所的门已关闭。','💡 Tactical Flashlight ON':'💡 手电已开启','🌑 Tactical Flashlight OFF':'🌑 手电已关闭','⚠️ No Ginger Tea available!':'⚠️ 没有姜茶！','☕ Drank Hot Ceylon Ginger Tea! Body warmed, sanity +30%!':'☕ 已饮用热姜茶！恢复体温，精神 +30%！','⚠️ Need at least 2 medicinal herbs to brew herbal tea!':'⚠️ 冲泡草药茶至少需要两份草药！','🍵 Brewed herbal remedy tea! Added 1 Herbal Tea to supplies.':'🍵 已冲泡草药茶，补给 +1。','📸 Tactical photo captured and logged to expedition dossier!':'📸 已拍照并存入探险档案！','⚠️ Out of Salt! Search the Kudawa Outpost.':'⚠️ 盐用完了！去库达瓦哨所寻找。','🧂 Sprinkled salt: Leeches detached and dropped off!':'🧂 已撒盐，水蛭脱落！','🧂 Dispersed defensive salt perimeter on muddy ground.':'🧂 已在泥地周围撒盐防护。','⚠️ No medicinal herbs remaining!':'⚠️ 草药已用完！','⚠️ Out of Leech Repellent Balm!':'⚠️ 驱蛭膏已用完！','🛡️ Applied Herbal Leech Repellent Balm! (Protected for 90s)':'🛡️ 已涂抹驱蛭膏，保护 90 秒！','🔋 Flashlight battery fully charged (100%).':'🔋 手电电量已充满（100%）。',
  'සිංහරාජ රහස් සාක්ෂි පුවරුව (EVIDENCE CASE BOARD)':'辛哈拉贾案件证据板','සමස්ත සාක්ෂි ප්‍රගතිය:':'总证据进度：','සාක්ෂි හමුවී ඇත (':'份证据已发现（','MISSING':'尚未发现','✓ EVIDENCE VERIFIED':'✓ 证据已核实','තවමත් හමුවී නැත':'尚未发现','තොගය:':'数量：','ක්':'份','ක්‍රියාත්මකයි (ON)':'开启','අක්‍රියයි (OFF)':'关闭','නිවන්න (OFF)':'关闭','දල්වන්න (ON)':'开启','තවරන්න [B]':'涂抹 [B]','සුවපත් වන්න (+30 HP) [2]':'治疗（生命 +30）[2]','SNAP [C]':'拍照 [C]','අසන්න (LISTEN)':'收听',
  'ස්වභාවික පැන්':'山泉饮水','සුවදායක ඔසුපැන්':'草药专家','පළා පොළඟා මෙල්ලකරු':'驯蛇者','කැහිබෙලි පිහාටුව':'蓝鹊寻踪','පහුරු නාවිකයා':'竹筏领航员','කුඩව පුරාවෘත්තය':'库达瓦英雄','දියඇලි ජයග්‍රාහකයා':'瀑布征服者','Pure Spring':'山泉饮水','Herbalist':'草药专家','Snake Charmer':'驯蛇者','Magpie Seeker':'蓝鹊寻踪','Raft Navigator':'竹筏领航员','Hero of Kudawa':'库达瓦英雄','Cascades Conqueror':'瀑布征服者',
};
for(const [source,target]of Object.entries(notices))addTranslation(source,target);
for(const [source,target]of Object.entries(extraTranslations))addTranslation(source,target);
for(const [source,target]of Object.entries(englishTranslations))addTranslation(source,target);

export function translateText(value,lang='zh') {
  if(lang!=='zh'||typeof value!=='string')return value;
  const key=value.replace(/\s+/g,' ').trim();
  const exact=words.get(key);if(exact)return exact;
  let match=key.match(/^CHAPTER (\d+)$/);if(match)return Number(match[1])?'第 '+Number(match[1])+' 章':'章节 ';
  match=key.match(/^(DEPLOY|REPLAY) CHAPTER (\d+) ▶$/);if(match)return (match[1]==='DEPLOY'?'开始':'重玩')+'第 '+Number(match[2])+' 章 ▶';
  match=key.match(/^🔒 LOCKED \(COMPLETE CH (\d+)\)$/);if(match)return '🔒 完成第 '+Number(match[1])+' 章后解锁';
  // Dynamic toasts append counts/timers to static phrases. Match complete phrases first,
  // then translate only bounded text fragments, preserving numbers and keyboard symbols.
  if(!partialPattern){const keys=[...words.keys()].filter(k=>k.length>=4&&!['🇱🇰 සිංහල','🇬🇧 ENGLISH'].includes(k)).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));partialPattern=new RegExp('(?<![A-Za-z])(?:'+keys.join('|')+')(?![A-Za-z])','gu');}
  return value.replace(partialPattern,match=>words.get(match)||match);
}
function LocalizedHost({tag,attributes,content}) {
  const {lang}=useContext(LanguageContext);
  const attrs={...attributes};
  for(const name of ['title','aria-label','placeholder'])if(typeof attrs[name]==='string')attrs[name]=translateText(attrs[name],lang);
  const translate=child=>Array.isArray(child)?child.map(translate):translateText(child,lang);
  return React.createElement(tag,attrs,...content.map(translate));
}
// Only visible text and accessible labels are localized; IDs, event handlers, game state and saves stay intact.
export function localizedElement(type,props,...children) {
  if(typeof type!=='string')return React.createElement(type,props,...children);
  return React.createElement(LocalizedHost,{key:props?.key,tag:type,attributes:props,content:children});
}
