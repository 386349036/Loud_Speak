/*
 * Game balance in one place. Tweak numbers here; no other file needs to change.
 * Distances are metres, times are seconds, damage is hit points (enemies have 100, heavies 260).
 */

export const PLAYER = {
  hp: 100, armor: 50,
  walk: 4.6, sprint: 7.1, crouch: 2.1, adsMove: 0.65,
  jump: 6.0, gravity: 18,   // a 1 m hop; crates and low walls up to 1.6 m are climbed or vaulted (jump + forward)
  stamina: 100, staminaDrain: 24, staminaRegen: 16, staminaDelay: 0.9,
  regenDelay: 5, regenRate: 9, regenStep: 25,   // heals back to the next 25-point segment
  armorAbsorb: 0.5,
};

/*
 * Weapons. Each one owns a niche: the rifle is the all-rounder, the SMG shreds up close and while
 * moving, the shotgun one-shots inside a room, the DMR drops a raider with two body shots (one to the
 * head) at any range and ignores armour, and the pistol is a fast, accurate sidearm (3 body shots).
 * zoom = FOV multiplier when aiming, bloom = spread added per round of sustained fire,
 * adsSpeed = how quickly the sight comes up, ap = full damage against armour plates.
 */
export const WEAPONS = {
  rifle: {
    name: '游隼', full: '游隼突击步枪', cls: '突击步枪', slot: 'primary', rank: 0, mode: '全自动',
    auto: true, rpm: 640, dmg: 34, mag: 30, reserve: 120, reserveMax: 180, reload: 2.1, reloadEmpty: 2.6,
    spread: 0.009, moveSpread: 0.045, jumpSpread: 0.12, adsSpread: 0.0012, recoilV: 0.016, recoilH: 0.006, bloom: 0.0022,
    zoom: 0.6, adsSpeed: 14, impulse: 75, falloff: [40, 100, 0.7], pen: 0.5, mobility: 1, sight: 'dot',
  },
  smg: {
    name: '旋风', full: '旋风轻型冲锋枪', cls: '轻型冲锋枪', slot: 'primary', rank: 2, mode: '全自动',
    auto: true, rpm: 880, dmg: 29, mag: 32, reserve: 160, reserveMax: 224, reload: 1.7, reloadEmpty: 2.05,
    spread: 0.006, moveSpread: 0.012, jumpSpread: 0.06, adsSpread: 0.0024, recoilV: 0.0085, recoilH: 0.0055, bloom: 0.0012,
    zoom: 0.72, adsSpeed: 19, impulse: 60, falloff: [22, 55, 0.6], pen: 0.35, mobility: 1.12, sight: 'dot',
  },
  shotgun: {
    name: '猎鹰', full: '猎鹰霰弹枪', cls: '霰弹枪', slot: 'primary', rank: 3, mode: '泵动式',
    auto: false, pump: 0.5, rpm: 85, dmg: 21, pellets: 9, mag: 7, reserve: 35, reserveMax: 49, shellTime: 0.44,
    spread: 0.042, moveSpread: 0.012, jumpSpread: 0.04, adsSpread: 0.029, recoilV: 0.05, recoilH: 0.012, bloom: 0,
    zoom: 0.8, adsSpeed: 15, impulse: 70, falloff: [11, 32, 0.3], pen: 0, mobility: 0.97, sight: 'iron',
  },
  dmr: {
    name: '弩箭', full: '弩箭狙击步枪', cls: '狙击步枪', slot: 'primary', rank: 5, mode: '半自动',
    auto: false, rpm: 230, dmg: 92, mag: 12, reserve: 48, reserveMax: 72, reload: 2.2, reloadEmpty: 2.7,
    spread: 0.016, moveSpread: 0.055, jumpSpread: 0.15, adsSpread: 0.0002, recoilV: 0.036, recoilH: 0.008, bloom: 0,
    zoom: 0.22, adsSpeed: 11, impulse: 140, falloff: null, pen: 0.75, ap: true, mobility: 0.92, sight: 'scope',
  },
  pistol: {
    name: '猛虎', full: '猛虎手枪', cls: '手枪', slot: 'secondary', rank: 0, mode: '半自动',
    auto: false, rpm: 450, dmg: 38, mag: 15, reserve: 60, reserveMax: 105, reload: 1.3, reloadEmpty: 1.6,
    spread: 0.007, moveSpread: 0.022, jumpSpread: 0.07, adsSpread: 0.0025, recoilV: 0.024, recoilH: 0.008, bloom: 0.003,
    zoom: 0.8, adsSpeed: 19, impulse: 60, falloff: [25, 55, 0.65], pen: 0.2, mobility: 1.1, sight: 'iron',
  },
};
export const PRIMARIES = ['rifle', 'smg', 'shotgun', 'dmr'];

export const GRENADE = { fuse: 3.0, radius: 7.5, damage: 175, carry: 2, max: 3 };

/* Knife: a quick stab in a cone in front of the player. From behind it always kills. */
export const MELEE = { range: 2.2, cone: 0.75, dmg: 150, duration: 0.5, hitAt: 0.16 };

export const ENEMY = {
  raider: { hp: 100, speed: 3.9, dmg: 10, burst: [3, 5], rof: 0.13, headMul: 4 },
  heavy: { hp: 260, speed: 2.7, dmg: 8, burst: [5, 8], rof: 0.09, headMul: 2.2, torsoMul: 0.8 },
  sniper: { hp: 90, charge: 2.3, dmg: 46, cooldown: 3.6, range: 130 },
  grenadier: { cooldown: [10, 15], range: [8, 32] },
};

export const ALLY = { hp: 160, dmg: 25, regen: 4, burst: [3, 5], rof: 0.12, spread: 0.017 };

/*
 * Difficulty. dmg/spread/react scale the raiders' marksmanship; ai is their tactical profile:
 * fov (degrees they watch), notice (seconds to recognise a target in plain view at 20 m),
 * hear (metres at which gunfire carries), flank/flankers (chance to circle round, and how many at
 * once), nade (chance a rifleman carries a grenade) and nadeGap (seconds between squad grenades),
 * heal (field dressings per man), cover (how reliably they get out of the open), peek (seconds
 * exposed per peek), relocate (peeks before changing cover), settle (how fast their aim tightens),
 * runGun (fire while moving), preaim (watch the last known position), hop (dodge hops),
 * push (bound forward cover to cover), strafe, snipe (sniper charge-time factor), intel (seconds for
 * a sighting to reach the whole squad).
 */
export const DIFFICULTY = {
  recruit: {
    name: '新兵', desc: '敌人反应较慢、精度较低，较少包抄或投掷手榴弹. 适合学习操作.', xpMul: 0.75, dmg: 0.6, spread: 1.35, react: 1.3, count: 0.8, regen: true,
    ai: { fov: 130, notice: 0.95, hear: 26, flank: 0.12, flankers: 1, nade: 0.2, nadeGap: 16, heal: 0, cover: 0.55, peek: [1.8, 3.2], relocate: 4, settle: 0.8, runGun: false, preaim: 0.25, hop: 0, push: 0.3, strafe: 0.5, snipe: 1.2, intel: 3.5 },
  },
  veteran: {
    name: '老兵', desc: '智能敌人: 在掩体间转移，利用同伴火力掩护包抄，并向固守位置投掷手榴弹.', xpMul: 1, dmg: 1, spread: 0.9, react: 0.85, count: 1, regen: true,
    ai: { fov: 160, notice: 0.45, hear: 42, flank: 0.55, flankers: 2, nade: 0.75, nadeGap: 6, heal: 1, cover: 0.92, peek: [1.1, 2.2], relocate: 3, settle: 1.7, runGun: true, preaim: 0.85, hop: 0.2, push: 0.6, strafe: 0.9, snipe: 0.95, intel: 1.2 },
  },
  legend: {
    name: '传奇', desc: '敌人更多、更精准且配合紧密，时刻追踪你，并且你的生命不会自动恢复.', xpMul: 1.6, dmg: 1.4, spread: 0.75, react: 0.62, count: 1.25, regen: false,
    ai: { fov: 190, notice: 0.28, hear: 56, flank: 0.7, flankers: 3, nade: 0.95, nadeGap: 4, heal: 2, cover: 1, peek: [0.9, 1.8], relocate: 2, settle: 2.6, runGun: true, preaim: 1, hop: 0.35, push: 0.75, strafe: 1, snipe: 0.8, intel: 0.6 },
  },
};

export const MODES = {
  dusk: { name: '黄昏行动', tag: '8 小时 · 星级评价', desc: '从下午坚守至午夜. 共八波敌人，每波推进一小时.', rank: 0 },
  dawn: { name: '直到黎明', tag: '无尽生存', desc: '午夜之后敌人仍会不断来袭，直到黎明乃至更晚. 挑战最高得分.', rank: 1 },
};

/* Campaign waves: hour, count, max alive, and the share of each enemy type. */
export const DUSK_WAVES = [
  { h: 16, n: 4, max: 3, heavy: 0, night: 0, gren: 0, snipers: 0, heli: false, title: '午后' },
  { h: 17, n: 6, max: 4, heavy: 0, night: 0, gren: 0, snipers: 0, heli: false, title: '日落之前' },
  { h: 18, n: 7, max: 4, heavy: 0.12, night: 0, gren: 0.1, snipers: 1, heli: false, title: '日落' },
  { h: 19, n: 8, max: 5, heavy: 0.15, night: 0.4, gren: 0.18, snipers: 0, heli: false, title: '黄昏' },
  { h: 20, n: 10, max: 5, heavy: 0.2, night: 0.7, gren: 0.2, snipers: 1, heli: true, title: '入夜' },
  { h: 21, n: 10, max: 6, heavy: 0.25, night: 0.9, gren: 0.22, snipers: 0, heli: false, title: '夜幕降临' },
  { h: 22, n: 11, max: 6, heavy: 0.3, night: 1, gren: 0.25, snipers: 2, heli: false, title: '寂静深夜' },
  { h: 23, n: 14, max: 7, heavy: 0.35, night: 1, gren: 0.25, snipers: 1, heli: true, title: '最后一小时' },
];
const HOUR_TITLES = {
  0: '午夜', 1: '深夜', 2: '深夜', 3: '后半夜', 4: '后半夜', 5: '黎明前夕',
  6: '黎明', 7: '日出', 8: '上午', 9: '上午', 10: '上午', 11: '正午之前', 12: '正午', 13: '正午',
  14: '下午', 15: '午后', 16: '午后', 17: '日落之前', 18: '日落', 19: '黄昏', 20: '入夜',
  21: '夜幕降临', 22: '寂静深夜', 23: '最后一小时',
};
/** Wave definition for index i (0-based). Past the campaign it keeps escalating. */
export function waveDef(i) {
  if (i < DUSK_WAVES.length) return { ...DUSK_WAVES[i], index: i };
  const k = i - DUSK_WAVES.length + 1;
  const h = 16 + i, hod = h % 24;
  const dark = hod >= 19 || hod < 6;
  return {
    index: i, h, n: Math.min(32, 14 + k * 2), max: Math.min(10, 7 + Math.floor(k / 2)),
    heavy: Math.min(0.45, 0.35 + k * 0.02), night: dark ? 1 : 0, gren: 0.28,
    snipers: 1 + (k % 3 === 0 ? 1 : 0), heli: k % 3 === 1, title: HOUR_TITLES[hod],
  };
}
/** Raider aim and pacing tighten with every wave. */
export const waveSkill = (i) => ({
  spread: Math.max(0.018, 0.036 - i * 0.0017),
  react: Math.max(0.55, 1.2 - i * 0.06),
  pause: Math.max(0.65, 1.2 - i * 0.05),
  dmg: Math.min(1.35, 0.85 + i * 0.045),
});

export const SUPPORTS = [
  { id: 'uav', name: '侦察机', short: '侦察', key: '3', cost: 350, cd: 45, dur: 35, desc: '在战场上空盘旋，标记敌人位置 35 秒.' },
  { id: 'supply', name: '空投补给', short: '补给', key: '4', cost: 450, cd: 60, desc: '运输机空投弹药、护甲和手榴弹补给箱，上面还有可拾取的额外武器，按 E.' },
  { id: 'ally', name: '呼叫队友', short: '队友', key: '5', cost: 800, cd: 90, desc: '一名士兵空降并与你并肩作战. 最多两名队友，第二名费用更高.' },
  { id: 'strike', name: '空袭', short: '空袭', key: '6', cost: 1100, cd: 100, desc: '使用激光望远镜指定目标，战机将投下五枚炸弹.' },
];

export const SCORE = {
  kill: 100, headshot: 50, longshot: 40, explosive: 50, barrel: 75, multi: 50, allyAssist: 50, melee: 100, backstab: 60,
  heli: 1000, waveBase: 300, wavePer: 100, flawless: 250, victory: 3000,
};

/* Rank ladder: name, XP needed, insignia [type, count]. */
export const RANKS = [
  ['列兵', 0, 'chev', 0], ['上等兵', 1200, 'chev', 1], ['下士', 3000, 'chev', 2], ['中士', 6000, 'chev', 3],
  ['上士', 10000, 'chev', 4], ['少尉', 15000, 'star', 1], ['中尉', 22000, 'star', 2], ['上尉', 30000, 'star', 3],
  ['少校', 40000, 'eagle', 0], ['中校', 55000, 'eagle', 1], ['上校', 75000, 'eagle', 2], ['准将', 100000, 'eagle', 3],
  ['少将', 140000, 'sword', 0],
].map(([name, xp, type, n]) => ({ name, xp, type, n }));

export const SKINS = [
  { id: 'std', name: '标准', rank: 0 },
  { id: 'tiger', name: '沙漠之虎', rank: 1 },
  { id: 'night', name: '夜间行动', rank: 3 },
  { id: 'gold', name: '黄金', rank: 6 },
];

/* Allies: at most two at once; each extra one costs more, so support never becomes an army. */
export const ALLY_ROSTER = ['萨利姆中士', '法赫德下士'];
export const ALLY_MAX = 2;
export const allyCost = (alive) => 800 + alive * 600;

export const MAPS = {
  citadel: {
    name: '沙漠堡垒', desc: '有三座城门和东墙缺口的堡垒，内有喷泉广场和带顶集市. 中距离战斗.', traits: ['中距离', '三座城门与一处缺口', '四座狙击塔'],
    note: '敌人在三座城门外和东侧缺口外的红旗下集结. 黄色圆圈标记四座塔楼的狙击点，北门岗楼屋顶可沿楼梯登上.',
  },
  village: {
    name: '废弃村庄', desc: '狭窄街巷、破败房屋、棕榈园和古老墓地. 近距离交战，转角处随时可能遇敌.', traits: ['近距离', '八处入口', '可登上的屋顶'],
    note: '敌人从四处入口和围墙缺口潜入. 狙击阵地: 宣礼塔、水塔、瞭望塔和农舍屋顶. 外部楼梯通往俯瞰东侧街道的屋顶.',
  },
  station: {
    name: '山谷车站', desc: '沙漠中的废弃火车站: 站台与货运车厢、可进入作战的仓库，以及俯瞰全场的钟楼.', traits: ['多种交战距离', '火车车厢', '封闭仓库'],
    note: '敌人从南北道路入口、东西铁路方向和两处围墙缺口进入. 狙击阵地: 钟楼、信号亭、水塔和仓库屋顶.',
  },
};

export const MEDALS = [
  { id: 'first', name: '首杀', desc: '击杀第一名敌人.', xp: 100 },
  { id: 'hs25', name: '鹰眼', desc: '单局完成 25 次爆头.', xp: 800 },
  { id: 'h20', name: '坚守者', desc: '坚持到 20:00.', xp: 500 },
  { id: 'win', name: '午夜守卫', desc: '坚守至午夜.', xp: 2000 },
  { id: 'legend', name: '黄昏传奇', desc: '在此难度获胜 «传奇».', xp: 5000 },
  { id: 'tri', name: '三重打击', desc: '用一次爆炸击杀三名敌人.', xp: 600 },
  { id: 'barrels', name: '油桶陷阱', desc: '累计利用爆炸油桶击杀十人 (累计).', xp: 700 },
  { id: 'longshot', name: '远距离射杀', desc: '从 60 米外击杀敌人.', xp: 500 },
  { id: 'heli', name: '直升机克星', desc: '击落敌方直升机.', xp: 1500 },
  { id: 'flawless', name: '毫发无伤', desc: '无伤完成一整波战斗.', xp: 400 },
  { id: 'commander', name: '支援指挥官', desc: '单局使用全部四种支援.', xp: 800 },
  { id: 'buddy', name: '忠诚伙伴', desc: '队友单局击杀五名敌人.', xp: 600 },
  { id: 'dawn', name: '直到黎明', desc: '坚持到 05:00 在此模式 «直到黎明».', xp: 4000 },
  { id: 'focus5', name: '猎鹰时刻', desc: '一次专注期间击杀五名敌人.', xp: 700 },
];

export const FOCUS = { min: 30, start: 35, drain: 17, timeScale: 0.32, playerScale: 0.8, killGain: 12, headGain: 28, explosiveGain: 6, multiGain: 10 };
