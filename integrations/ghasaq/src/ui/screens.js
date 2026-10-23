import * as THREE from 'three';
import { arNum, clamp, damp, fmtClock, fmtNum, randi } from '../core/utils.js';
import { scene, camera, keyLight } from '../core/renderer.js';
import { applyTOD, tod } from '../core/sky.js';
import { game } from '../core/state.js';
import { settings, saveSettings, resetSettings, SETTINGS_SCHEMA, SETTINGS_TABS, isTouch } from '../config/settings.js';
import { WEAPONS, PRIMARIES, DIFFICULTY, MODES, SKINS, MEDALS, RANKS, MAPS } from '../config/balance.js';
import { loadMap, MAP_INFO, SNIPER_SPOTS, PLAYER_START } from '../world/map.js';
import { initAudio, audio } from '../audio/engine.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { buildSoldier, animateSoldier } from '../entities/soldier-model.js';
import { lockPointer, unlockPointer, releaseAll } from '../input/input.js';
import { profile, saveProfile, rankProgress, rankIndex, weaponUnlocked, skinUnlocked, modeUnlocked } from '../systems/progression.js';
import { startRun, endRun, clearBattlefield } from '../systems/waves.js';
import { setFocus, focus } from '../systems/focus.js';
import { dailyChallenges, resetsIn } from '../systems/challenges.js';
import { showHUD } from './hud.js';
import { WEAPON_ICONS, rankInsignia, medalIcon } from './icons.js';
import { setMenuFx } from './menufx.js';
import { armoryShow, armoryHide, armoryUpdate } from './armory.js';
import { shots, missingShots, renderMissingShots } from './mapshots.js';
import { $, $$, el, esc } from './dom.js';

/* Menus and their navigation (mouse, touch, keyboard arrows and gamepad). */

const SCREENS = ['boot', 'splash', 'main', 'brief', 'record', 'settings', 'controls', 'pause', 'aar'];
const FX_MODE = { boot: 'title', splash: 'title', main: 'menu', brief: 'page', record: 'page', settings: 'page', controls: 'page', aar: 'page' };
let current = 'boot', settingsReturn = 'main', controlsReturn = 'main';
export function showScreen(id) {
  current = id;
  for (const s of SCREENS) $(s).hidden = s !== id;
  document.body.dataset.screen = id || '';
  setMenuFx(FX_MODE[id] || 'off');
  if (id !== 'brief') armoryHide();
  if (!id) resetMenuCamera();
  const menu = id && $(id).querySelector('.menu');
  if (menu && menu.firstMenuItem) menu.placeBar(menu.firstMenuItem());
  const first = id && $(id).querySelector('[data-autofocus]') || (id && $(id).querySelector('.nav:not([disabled])'));
  if (first && !isTouch) first.focus({ preventScroll: true });
}
export const currentScreen = () => current;

/* ---------- menu background: three raiders on the current map, filmed by a calm camera ---------- */
const showcase = [];
export function buildShowcase() {
  clearShowcase();
  for (const [kind, role, x, z, yaw] of MAP_INFO.showcase.soldiers) {
    const ch = buildSoldier(kind, randi(1e6), role);
    ch.root.position.set(x, 0, z);
    ch.root.rotation.y = yaw;
    ch.lookT = Math.random() * 5;
    scene.add(ch.root);
    showcase.push(ch);
  }
}
export function clearShowcase() { for (const ch of showcase) scene.remove(ch.root); showcase.length = 0; }

/*
 * The menu camera eases between three shots:
 *   show   - the establishing shot of the raiders (splash, main menu, pages), wide and calm
 *   aerial - a slow orbit high over the map, framed inside the briefing viewport
 *   armory - high up, looking away from the sun into the dusk sky, behind the 3D weapon
 * A view offset slides the subject into the free part of the screen instead of its centre.
 */
const V3 = THREE.Vector3;
const cam = { pos: new V3(), look: new V3(), off: 0, offY: 0, fov: 46, init: false };
const tgt = { pos: new V3(), look: new V3(), off: 0, offY: 0, fov: 46 };
const _v = new V3(), _d = new V3();
let orbitA = 0.7, fogK = 1, fogBase = null, shadowSaved = null, readT = 0;

function wideShadows(on) {
  const sc = keyLight.shadow.camera;
  if (on && !shadowSaved) {
    shadowSaved = { l: sc.left, r: sc.right, t: sc.top, b: sc.bottom };
    sc.left = -96; sc.right = 96; sc.top = 96; sc.bottom = -96; sc.updateProjectionMatrix();
  } else if (!on && shadowSaved) {
    sc.left = shadowSaved.l; sc.right = shadowSaved.r; sc.top = shadowSaved.t; sc.bottom = shadowSaved.b; sc.updateProjectionMatrix();
    shadowSaved = null;
  }
}
/** Back to a plain gameplay camera: no view offset, normal shadows and fog. */
function resetMenuCamera() {
  camera.clearViewOffset();
  wideShadows(false);
  if (fogK !== 1 && fogBase != null) scene.fog.density = fogBase;
  fogK = 1; fogBase = null;
  cam.init = false;
}
const rectOf = (id) => { const n = $(id); return n && !n.hidden && n.offsetParent !== null ? n.getBoundingClientRect() : null; };

function menuShot() {
  if (current === 'brief') return briefTab === 'gear' ? 'armory' : 'aerial';
  return 'show';
}
/** Called every menu frame from the main loop. Returns the lens (vertical FOV) to use. */
export function updateMenuScene(dt) {
  const t = performance.now() * 0.001, S = MAP_INFO.showcase, W = innerWidth, H = innerHeight;
  const shot = menuShot();
  let mapRect = null, stageRect = null;
  if (shot === 'show') {
    const [cx, cy, cz] = S.cam, [lx, ly, lz] = S.look;
    const back = current === 'splash' || current === 'boot' ? 1.38 : 1.14;
    const dx = (cx - lx) * back, dz = (cz - lz) * back, r = Math.hypot(dx, dz), a = Math.atan2(dx, dz) + Math.sin(t * 0.05) * 0.12;
    tgt.pos.set(lx + Math.sin(a) * r, cy + (back - 1) * 2.2 + Math.sin(t * 0.08) * 0.15, lz + Math.cos(a) * r);
    tgt.look.set(lx, ly + (back - 1) * 0.6, lz);
    tgt.fov = 46; tgt.offY = 0;
    // main menu: the raiders sit left of the menu column; wide screens only
    tgt.off = current === 'main' && W > 700 ? 0.07 : 0;
  } else if (shot === 'aerial') {
    mapRect = rectOf('briefMapWrap');
    orbitA += dt * 0.035;
    const R = 70, Hh = 60;
    tgt.pos.set(Math.sin(orbitA) * R, Hh, Math.cos(orbitA) * R);
    tgt.look.set(0, -3, 0);
    tgt.fov = 40;
    if (mapRect) { tgt.off = 0.5 - (mapRect.left + mapRect.width / 2) / W; tgt.offY = 0.5 - (mapRect.top + mapRect.height / 2) / H; }
  } else {
    stageRect = rectOf('armStage');
    const R = 62, Hh = 34;
    tgt.pos.set(Math.sin(orbitA) * R, Hh, Math.cos(orbitA) * R);
    // look away from the sun: the weapon is lit from behind the camera against the darker sky
    _d.set(-tod.sunDir.x, 0, -tod.sunDir.z);
    if (_d.lengthSq() < 1e-4) _d.set(0, 0, -1);
    _d.normalize();
    tgt.look.copy(tgt.pos).addScaledVector(_d, 30); tgt.look.y += 4.5 + Math.sin(t * 0.1) * 0.4;
    tgt.fov = 40; tgt.off = 0; tgt.offY = 0;
  }
  if (!cam.init) {
    cam.pos.copy(tgt.pos); cam.look.copy(tgt.look); cam.off = tgt.off; cam.offY = tgt.offY; cam.fov = tgt.fov; cam.init = true;
  } else {
    const k = damp(2.1, dt), ky = damp(tgt.pos.y > cam.pos.y + 4 ? 3.2 : 2.1, dt);
    cam.pos.x += (tgt.pos.x - cam.pos.x) * k; cam.pos.z += (tgt.pos.z - cam.pos.z) * k; cam.pos.y += (tgt.pos.y - cam.pos.y) * ky;
    cam.look.lerp(tgt.look, damp(2.6, dt));
    cam.off += (tgt.off - cam.off) * damp(4, dt);
    cam.offY += (tgt.offY - cam.offY) * damp(4, dt);
    cam.fov += (tgt.fov - cam.fov) * damp(3, dt);
  }
  camera.position.copy(cam.pos);
  camera.lookAt(cam.look);
  if (Math.abs(camera.fov - cam.fov) > 0.01) camera.fov = cam.fov;
  if (Math.abs(cam.off) > 0.001 || Math.abs(cam.offY) > 0.001) camera.setViewOffset(W, H, cam.off * W, cam.offY * H, W, H);
  else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  // high shots: thinner fog and a shadow frustum big enough to cover the map from the air
  const high = shot !== 'show';
  wideShadows(high || cam.pos.y > 12);
  if (fogK === 1 && !high) fogBase = scene.fog.density;
  else {
    if (fogBase == null) fogBase = scene.fog.density;
    fogK += ((high ? 0.45 : 1) - fogK) * damp(2.5, dt);
    if (!high && Math.abs(fogK - 1) < 0.01) fogK = 1;
    scene.fog.density = fogBase * fogK;
  }

  if (mapRect) updateMarks(mapRect, dt);
  armoryUpdate(dt, stageRect);
  for (const ch of showcase) {
    ch.lookT += dt;
    animateSoldier(ch, dt, { speed: 0, pitch: -0.12, look: Math.sin(ch.lookT * 0.5) * 0.5, twist: Math.sin(ch.lookT * 0.3) * 0.15 });
  }
  return cam.fov;
}

/* tactical markers projected from the 3D map into the briefing viewport */
const marks = [];
let marksVer = -1;
function buildMarks() {
  marksVer = MAP_INFO.version;
  const box = $('briefMarks');
  box.innerHTML = '';
  marks.length = 0;
  const add = (cls, x, y, z, text) => {
    const e = el('span', 'mk ' + cls, `<i></i>${text ? `<span>${esc(text)}</span>` : ''}`);
    box.appendChild(e);
    marks.push({ e, v: new V3(x, y, z) });
  };
  for (const l of MAP_INFO.labels) add('foe', l.x, 1.5, l.z, l.t);
  for (const s of SNIPER_SPOTS) add('sniper', s.x, s.y + 1.2, s.z);
  add('you', PLAYER_START.x, 1, PLAYER_START.z, '你的位置');
}
function updateMarks(rect, dt) {
  if (marksVer !== MAP_INFO.version) buildMarks();
  const W = innerWidth, H = innerHeight;
  for (const m of marks) {
    _v.copy(m.v).project(camera);
    const x = ((_v.x + 1) / 2) * W - rect.left, y = ((1 - _v.y) / 2) * H - rect.top;
    const vis = _v.z < 1 && x > 10 && y > 34 && x < rect.width - 10 && y < rect.height - 10;
    m.e.style.opacity = vis ? '1' : '0';
    m.e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  }
  readT -= dt;
  if (readT <= 0) {
    readT = 0.25;
    const hd = Math.round(((Math.atan2(-(cam.look.x - cam.pos.x), cam.look.z - cam.pos.z) * 180) / Math.PI + 360) % 360);
    $('vfRead').innerHTML = `高度<b>${Math.round(cam.pos.y)}</b>米 · 方向<b>${hd}</b>°`;
  }
}

/* ---------- splash → main ---------- */
export function enterMenu() {
  if (initAudio()) { sfx.initAmbience(); music.init(); }
  music.setState('menu');
  sfx.select();
  openMain();
}
const TIPS = ['狙击手开火前会出现瞄准镜闪光. 看到后立即寻找掩体.', '子弹可以穿透木箱. 不要长期躲在木箱后面.', '预热手榴弹会缩短引信时间: 按住一秒后再投出.', '直升机悬停时可集中火力将其击落.', '空袭不分敌我. 不要标记离自己太近的目标.', '沙尘暴同样会遮挡敌人视线. 趁机推进.', '队友会跟随你并掩护两翼. 不要挡在队友和敌人之间.', '按 Q 在专注蓄满时减缓时间.', '补给箱带有额外武器: 靠近并按 E 拾取.'];
export function openMain() {
  game.state = 'menu';
  const rp = rankProgress();
  const pc = $('profileCard');
  pc.className = 'profile brk';
  pc.innerHTML = `${rankInsignia(rp.idx, 56)}
    <div class="pc-body"><span class="pc-k">你的军衔</span>
    <div class="pc-row"><b>${rp.rank.name}</b><span class="pc-lv">${arNum(rp.idx + 1)} / ${arNum(RANKS.length)}</span></div>
    <span class="xpbar"><i style="transform:scaleX(${rp.frac.toFixed(3)})"></i></span>
    <span class="pc-x">${fmtNum(profile.xp)} 经验${rp.next ? ` · 下一级: ${rp.next.name} 达到 ${fmtNum(rp.next.xp)}` : ' · 最高军衔'}</span></div>`;
  $('mainEyebrow').textContent = `${MAP_INFO.name} · 坚守至午夜`;
  $('mainTip').textContent = TIPS[randi(TIPS.length)];
  const dc = $('dailyCard');
  dc.className = 'orders brk';
  dc.innerHTML = dailyHTML(true);
  showScreen('main');
}
function dailyHTML(withHead) {
  const list = dailyChallenges();
  return (withHead ? `<div class="ord-head"><b>每日指令<span class="ord-stamp">紧急</span></b><span>刷新倒计时 ${resetsIn()}</span></div>` : '<h3>每日指令</h3>') +
    list.map((c) => `<div class="dc${c.done ? ' done' : ''}"><i class="dc-box"></i><span class="dc-t">${c.text}</span><span class="dc-x">${plus(c.xp)} 经验</span>
      <span class="xpbar"><i style="transform:scaleX(${clamp(c.progress / c.target, 0, 1).toFixed(3)})"></i></span><span class="dc-p">${c.done ? '已完成' : `${c.progress}/${c.target}`}</span></div>`).join('');
}

/** A menu list with a selection bar that slides to the focused item; the description line follows. */
function wireMenu(nav, desc) {
  const bar = nav.querySelector('.msel');
  const items = () => $$('.mitem', nav);
  nav.placeBar = (b) => {
    if (!b) return;
    for (const i of items()) i.classList.toggle('cur', i === b);
    bar.style.transform = `translateY(${b.offsetTop}px)`;
    bar.style.height = b.offsetHeight + 'px';
    nav.classList.add('has-sel');
    if (desc && b.dataset.desc && desc.textContent !== b.dataset.desc) {
      desc.textContent = b.dataset.desc;
      desc.classList.remove('swap'); void desc.offsetWidth; desc.classList.add('swap');
    }
  };
  nav.firstMenuItem = () => (nav.contains(document.activeElement) && document.activeElement.classList.contains('mitem') ? document.activeElement : items()[0]);
  nav.addEventListener('focusin', (e) => { const b = e.target.closest('.mitem'); if (b) nav.placeBar(b); });
  addEventListener('resize', () => { const c = nav.querySelector('.mitem.cur'); if (c) nav.placeBar(c); });
}

/* ---------- guide: how to play + controls ---------- */
const HOW = [
  ['目标', '从 <b>16:00</b> 直到 <b>午夜</b>. 每小时一波敌人，夜色越深，敌人数量和战斗能力越强. 在 «直到黎明» 敌人将无尽来袭.'],
  ['战斗', '精确瞄准 (鼠标右键) 可收紧弹道，蹲下 <kbd>C</kbd> 可稳定瞄准. 爆头伤害远高于普通命中. 子弹能穿木材，不能穿石墙.'],
  ['敌人', '敌人的战斗方式接近玩家: 会在掩体间奔跑、探头射击后躲回去，也会趁同伴牵制时包抄. 他们能听到脚步和枪声，会向长时间躲藏的目标投掷手榴弹；无线电中可听到他们的部分计划. 在 «老兵» 和«传奇» 难度下，敌人速度和精度显著提高.'],
  ['移动与攀爬', '按 <kbd>Space</kbd> 同时朝箱子或边缘前进 (约 1.5 米以内) 即可攀爬，也可以翻越矮墙. 部分房屋有通往屋顶的外部楼梯.'],
  ['支援点数', '每次击杀都能获得支援点，按 <kbd>3</kbd> 至 <kbd>6</kbd>: 侦察标记敌人，补给空投箱子，队友空降作战，空袭轰炸望远镜指定位置.'],
  ['补给箱', '总会落在围墙内可到达的位置，有绿色烟雾和闪光指示. 靠近可补充弹药、护甲和手榴弹，按 <kbd>E</kbd> 拾取箱子上的武器.'],
  ['携带多把武器', '可以携带两把主武器和一把手枪. 通过 <kbd>1</kbd> 和<kbd>2</kbd> 或鼠标滚轮切换，右下角会显示武器.'],
  ['专注 · 按键 Q', '专注条 (位于右下角武器上方) 通过击杀和爆头积累. 按 <kbd>Q</kbd> 超过 30% 时: 世界会减速数秒，而你依然行动迅速. 每次行动开始时都拥有一次使用所需的专注值.'],
  ['队友', '最多呼叫两名队友，第二名费用更高. 他们会跟随、交战，并通过无线电交流. 不要向队友开火: 子弹会使他们受伤流血.'],
  ['匕首', '按 <kbd>V</kbd> 用于近战刺杀. 背刺始终一击致命.'],
  ['危险', '狙击手开火前会有瞄准镜闪光: 立即寻找掩体. 直升机会索降小队，也可以被击落. 附近手榴弹会显示红色箭头. 沙尘暴会遮挡所有人的视线.'],
];
const CONTROLS = [
  ['键盘与鼠标', [['W A S D', '移动'], ['Shift', '冲刺 · 使用瞄准镜时屏息'], ['C', '蹲下'], ['Space', '跳跃 · 攀爬边缘'], ['鼠标左键', '开火'], ['鼠标右键', '精确瞄准'], ['R', '换弹'], ['1 / 2 / 滚轮', '切换武器'], ['E', '拾取补给武器'], ['G 长按', '预热手榴弹后投掷'], ['V', '匕首'], ['Q', '专注 (减缓时间)'], ['F', '手电'], ['3 4 5 6', '侦察 · 补给 · 队友 · 空袭'], ['Tab', '战术地图'], ['Esc / P', '暂停']]],
  ['手柄', [['左摇杆', '移动'], ['右摇杆', '观察'], ['RT / LT', '开火 / 瞄准'], ['A', '跳跃'], ['B', '蹲下'], ['X', '换弹'], ['Y', '拾取武器 · 切换武器'], ['LB 长按', '手榴弹'], ['RB', '专注'], ['R3', '匕首'], ['L3', '冲刺'], ['方向键', '空中支援'], ['Back', '地图'], ['Start', '暂停']]],
  ['触屏', [['屏幕左侧', '触摸处出现移动摇杆，大幅向前推动可冲刺'], ['屏幕右侧', '滑动观察'], ['开火', '按住并拖动，射击同时瞄准'], ['瞄准 / 蹲下', '切换按钮'], ['手榴弹', '长按可预热手榴弹'], ['匕首', '近距离刺杀，背刺致命'], ['拾取', '靠近补给箱时出现'], ['专注', '减缓时间'], ['支援', '空中支援菜单'], ['地图 / II', '地图与暂停']]],
];
let guideTab = 'how';
function renderGuide() {
  for (const b of $$('#guideTabs button')) b.setAttribute('aria-pressed', String(b.dataset.gtab === guideTab));
  $('howGrid').hidden = guideTab !== 'how';
  $('ctlGrid').hidden = guideTab !== 'keys';
}
export function openControls(from, tab = 'how') {
  controlsReturn = from;
  guideTab = tab;
  $('howGrid').innerHTML = HOW.map(([t, p], i) => `<div class="how" style="--i:${i}"><span class="how-n">${String(i + 1).padStart(2, '0')}</span><b>${t}</b><p>${p}</p></div>`).join('');
  // touch players see the touch column first
  const cols = isTouch ? [CONTROLS[2], CONTROLS[0], CONTROLS[1]] : CONTROLS;
  $('ctlGrid').innerHTML = cols.map(([title, rows]) => `<div class="ctl-col"><h3>${title}</h3>${rows.map(([k, v]) => `<div class="ctl-row"><kbd>${k}</kbd><span>${v}</span></div>`).join('')}</div>`).join('');
  renderGuide();
  showScreen('controls');
  $('controls').querySelector('.page-body').scrollTop = 0;
}

/* ---------- briefing: operation, difficulty, loadout ---------- */
function weaponStats(W) {
  const acc = clamp(1 - W.spread / 0.06, 0, 1) * 0.6 + clamp(1 - W.adsSpread / 0.045, 0, 1) * 0.4;
  return [
    ['伤害', (W.dmg * (W.pellets || 1)) / 153, W.pellets ? `<bdi dir="ltr">${W.dmg}×${W.pellets}</bdi>` : W.dmg],
    ['射速', W.rpm / 900, W.rpm],
    ['精度', acc, Math.round(acc * 100)],
    ['射程', W.falloff ? W.falloff[0] / 60 : 1, `${W.falloff ? W.falloff[0] : '+100'}<small>米</small>`],
    ['移动', (W.mobility - 0.85) / 0.3, Math.round(W.mobility * 100)],
  ];
}
/** A signed number that keeps its sign on the left inside Arabic text. */
const plus = (n) => `<span dir="ltr">+${fmtNum(n)}</span>`;
const cellsN = (v) => Math.max(1, Math.round(clamp(v, 0.04, 1) * 10));
let briefTab = 'mission', previewW = null, previewSkin = null, previewT = 0;
export function openBriefing(focusLoadout = false) {
  if (!modeUnlocked(profile.mode)) profile.mode = 'dusk';
  if (!weaponUnlocked(profile.loadout)) profile.loadout = 'rifle';
  if (!skinUnlocked(profile.skin)) profile.skin = 'std';
  if (!MAPS[profile.map]) profile.map = 'citadel';
  previewW = previewSkin = null;
  const missing = missingShots().length;
  buildBriefing();
  setBriefTab(focusLoadout ? 'gear' : 'mission');
  showScreen('brief');
  if (focusLoadout && !isTouch) $('weaponList').querySelector('.sel, .nav')?.focus({ preventScroll: true });
  if (missing) setTimeout(ensureShots, 60);
  // the world may still be on another map (the backdrop follows profile.map)
  else if (MAP_INFO.id !== profile.map) selectMap(profile.map);
}
function setBriefTab(tab) {
  briefTab = tab;
  $('brief').dataset.tab = tab;
  for (const b of $$('#briefTabs button')) b.setAttribute('aria-pressed', String(b.dataset.btab === tab));
  $('bMission').hidden = tab !== 'mission';
  $('bGear').hidden = tab !== 'gear';
  $('briefMapWrap').hidden = tab !== 'mission';
  $('armoryView').hidden = tab !== 'gear';
  $('brief').querySelector('.brief-main').scrollTop = 0;
  if (tab === 'gear') renderHero(); else armoryHide();
}
const lockNote = (rank) => `解锁所需军衔 ${RANKS[rank].name}`;
function mapThumb(id) { return shots[id] ? `<img src="${shots[id]}" alt="" draggable="false">` : '<span class="mc-ph"></span>'; }
function buildBriefing() {
  const rk = rankIndex();
  $('mapList').innerHTML = Object.entries(MAPS).map(([id, m], i) => `<button type="button" class="map-card nav" data-map="${id}" style="--i:${i}">
      ${mapThumb(id)}<span class="sel-tag">已选择</span><span class="mc-tag">${m.traits[0]}</span><b>${m.name}</b></button>`).join('');
  $('opsList').innerHTML = Object.entries(MODES).map(([id, m]) => {
    const locked = rk < m.rank;
    const stars = id === 'dusk' ? `<span class="stars">${[1, 2, 3].map((s) => `<i class="${(profile.stars[profile.diff] || 0) >= s ? 'on' : ''}"></i>`).join('')}</span>` : `<span class="best">最佳得分 ${fmtNum((profile.best.dawn[0] || {}).score || 0)}</span>`;
    return `<button type="button" class="op-card nav${locked ? ' locked' : ''}" data-mode="${id}"${locked ? ' aria-disabled="true"' : ''}>
      <span class="op-sky ${id}"></span><span class="sel-tag">已选择</span><span class="op-tag">${m.tag}</span><b>${m.name}</b>
      ${locked ? `<span class="lock">${lockNote(m.rank)}</span>` : stars}</button>`;
  }).join('');
  $('diffList').innerHTML = Object.entries(DIFFICULTY).map(([id, d], i) => `<button type="button" class="diff nav" data-diff="${id}">
      <b>${d.name}</b><span class="pips">${[0, 1, 2].map((k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</span></button>`).join('');
  $('weaponList').innerHTML = PRIMARIES.map((id) => {
    const W = WEAPONS[id], locked = rk < W.rank;
    return `<button type="button" class="wcard nav${locked ? ' locked' : ''}" data-weapon="${id}"${locked ? ' aria-disabled="true"' : ''}>
      <span class="w-ico">${WEAPON_ICONS[id]}</span><span class="w-t"><span class="w-cls">${W.cls}</span><b>${W.full}</b></span>
      <span class="w-state">${locked ? `<span class="lock">${RANKS[W.rank].name}</span>` : ''}</span></button>`;
  }).join('');
  $('skinList').innerHTML = SKINS.map((s) => {
    const locked = rk < s.rank;
    return `<button type="button" class="skin nav ${s.id}${locked ? ' locked' : ''}" data-skin="${s.id}"${locked ? ' aria-disabled="true"' : ''}><i></i>
      ${locked ? '<span class="lk"></span>' : ''}<span class="sk-t">${s.name}<small>${locked ? RANKS[s.rank].name : '可用'}</small></span></button>`;
  }).join('');
  $('sideList').innerHTML = [['pistol', '手枪 «猛虎»'], ['nade', '两枚手榴弹'], ['knife', '匕首']].map(([k, t]) => `<span>${WEAPON_ICONS[k]}${t}</span>`).join('');
  refreshBriefing();
}
function refreshBriefing() {
  const sel = (sel, key, val) => { for (const b of $$(sel)) b.classList.toggle('sel', b.dataset[key] === val); };
  sel('#mapList .map-card', 'map', profile.map);
  sel('#opsList .op-card', 'mode', profile.mode);
  sel('#diffList .diff', 'diff', profile.diff);
  sel('#weaponList .wcard', 'weapon', profile.loadout);
  sel('#skinList .skin', 'skin', profile.skin);
  for (const b of $$('#weaponList .wcard:not(.locked)')) b.querySelector('.w-state').textContent = b.dataset.weapon === profile.loadout ? '已装备' : '';
  for (const b of $$('#skinList .skin:not(.locked)')) b.querySelector('small').textContent = b.dataset.skin === profile.skin ? '已选择' : '可用';
  const D = DIFFICULTY[profile.diff];
  $('diffNote').innerHTML = `${D.desc}<em>经验 ×${D.xpMul}</em>`;
  const M = MAPS[profile.map], cap = $('briefMapWrap').querySelector('.view-cap');
  if ($('mapTitle').textContent !== M.name) { cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap'); }
  $('mapTitle').textContent = M.name;
  $('mapNote').textContent = M.desc;
  $('mapIntel').textContent = M.note;
  $('mapChips').innerHTML = M.traits.map((t) => `<i>${t}</i>`).join('');
  $('briefSummary').innerHTML = [['地图', M.name], ['任务', MODES[profile.mode].name], ['难度', D.name], ['武器', WEAPONS[profile.loadout].name]]
    .map(([k, v]) => `<span class="sum-i"><em>${k}</em><b>${v}</b></span>`).join('');
  if (briefTab === 'gear') renderHero();
}
function renderHero() {
  const key = previewW || profile.loadout, W = WEAPONS[key], W0 = WEAPONS[profile.loadout];
  const locked = rankIndex() < W.rank;
  const cap = $('armoryView').querySelector('.arm-cap');
  if ($('armName').textContent !== W.full) { cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap'); }
  $('armCls').textContent = W.cls;
  $('armName').textContent = W.full;
  const st = $('armState');
  st.className = 'arm-state' + (locked ? ' lockd' : key === profile.loadout ? ' on' : '');
  st.textContent = locked ? lockNote(W.rank) : key === profile.loadout ? '已装备' : '预览 · 选择即可装备';
  $('armSpecs').innerHTML = [['弹匣', W.mag], ['备弹', W.reserve], ['射击模式', W.mode], ['射速', `${W.rpm}<small>发/分钟</small>`]]
    .map(([k, v]) => `<span class="spec"><em>${k}</em><b>${v}</b></span>`).join('');
  const base = weaponStats(W0);
  $('armStats').innerHTML = weaponStats(W).map(([k, v, raw], i) => {
    const n = cellsN(v), n0 = key === profile.loadout ? n : cellsN(base[i][1]);
    return `<span class="st"><span>${k}</span><b>${raw}</b><span class="cells">${Array.from({ length: 10 }, (_, c) => `<i class="${c < Math.min(n, n0) ? 'on' : c < n ? 'hi' : ''}"></i>`).join('')}</span></span>`;
  }).join('');
  armoryShow(key, previewSkin || profile.skin);
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
let mapBusy = false;
function busy(on) {
  mapBusy = on;
  $('briefStart').classList.toggle('busy', on);
  $('briefMapWrap').classList.toggle('loading', on);
  $('menuVeil').classList.toggle('on', on);
}
/** Rebuild the world for map `id` and put the menu backdrop on it. */
export function switchMap(id) {
  clearShowcase();
  loadMap(id);
  buildShowcase();
  if (current === 'main') $('mainEyebrow').textContent = `${MAP_INFO.name} · 坚守至午夜`;
}
/** Switching maps rebuilds the world right away, so the aerial view and the backdrop show it. */
export async function selectMap(id) {
  if (mapBusy || id === MAP_INFO.id) return;
  busy(true);
  await nextFrame(); await nextFrame();
  switchMap(id);
  await nextFrame();
  busy(false);
}
/** First visit: render a picture of every map for the tiles (cached afterwards). */
async function ensureShots() {
  if (mapBusy || current !== 'brief') return;
  busy(true);
  await nextFrame(); await nextFrame();
  try {
    await renderMissingShots(clearShowcase, buildShowcase);
  } catch (err) { console.warn('map thumbnails', err); }
  if (MAP_INFO.id !== profile.map) switchMap(profile.map);
  for (const b of $$('#mapList .map-card')) {
    const ph = b.querySelector('.mc-ph');
    if (ph && shots[b.dataset.map]) ph.outerHTML = mapThumb(b.dataset.map);
  }
  await nextFrame();
  busy(false);
}
function deny(b) { sfx.dry(); b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); }
function bindBriefing() {
  $('briefTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.btab === briefTab) return;
    sfx.tick();
    previewW = previewSkin = null;
    setBriefTab(b.dataset.btab);
  });
  $('brief').addEventListener('click', (e) => {
    const b = e.target.closest('.page-body button');
    if (!b) return;
    if (b.classList.contains('locked')) { deny(b); return; }
    let changed = true;
    if (b.dataset.map) { if (profile.map !== b.dataset.map) { profile.map = b.dataset.map; selectMap(b.dataset.map); } }
    else if (b.dataset.mode) profile.mode = b.dataset.mode;
    else if (b.dataset.diff) profile.diff = b.dataset.diff;
    else if (b.dataset.weapon) { profile.loadout = b.dataset.weapon; previewW = null; }
    else if (b.dataset.skin) { profile.skin = b.dataset.skin; previewSkin = null; }
    else changed = false;
    if (changed) {
      sfx.select();
      saveProfile();
      if (b.dataset.diff) buildBriefing(); // stars on the mode tile depend on the difficulty
      else refreshBriefing();
      if (b.dataset.diff) $('diffList').querySelector(`[data-diff="${profile.diff}"]`)?.focus({ preventScroll: true });
    }
  });
  // hovering or focusing a weapon or finish previews it on the turntable
  const bGear = $('bGear');
  bGear.addEventListener('focusin', (e) => {
    const w = e.target.closest('.wcard'), s = e.target.closest('.skin');
    clearTimeout(previewT);
    const nw = w ? w.dataset.weapon : previewW, ns = s && !s.classList.contains('locked') ? s.dataset.skin : previewSkin;
    if (nw !== previewW || ns !== previewSkin) { previewW = nw; previewSkin = ns; if (briefTab === 'gear') renderHero(); }
  });
  bGear.addEventListener('focusout', () => {
    clearTimeout(previewT);
    previewT = setTimeout(() => {
      if (bGear.contains(document.activeElement)) return;
      previewW = previewSkin = null;
      if (briefTab === 'gear' && current === 'brief') renderHero();
    }, 80);
  });
  $('briefStart').addEventListener('click', () => {
    if (mapBusy) return;
    sfx.select();
    armoryHide();
    clearShowcase();
    resetMenuCamera();
    startRun({ map: profile.map, mode: profile.mode, diff: profile.diff, primary: profile.loadout, skin: profile.skin });
    showScreen(null);
  });
  $('briefBack').addEventListener('click', () => { if (mapBusy) return; sfx.back(); openMain(); });
}

/* ---------- service record ---------- */
const GRADE_AR = { S: '优秀', A: '出色', B: '很好', C: '良好', D: '合格' };
export function openRecord(tab = 'dusk') {
  const rp = rankProgress(), T = profile.totals;
  const rr = $('recRank');
  rr.className = 'rec-rank brk';
  rr.innerHTML = `${rankInsignia(rp.idx, 104)}<div><span class="pc-k">当前军衔 · ${arNum(rp.idx + 1)} 从 ${arNum(RANKS.length)}</span><b class="big">${rp.rank.name}</b>
    <span class="xpbar"><i style="transform:scaleX(${rp.frac.toFixed(3)})"></i></span>
    <span class="pc-x">${fmtNum(profile.xp)} 经验${rp.next ? ` · ${fmtNum(rp.next.xp - profile.xp)} 晋升至 ${rp.next.name}` : ' · 最高军衔'}</span></div>`;
  const acc = T.shots ? Math.round((T.hits / T.shots) * 100) : 0;
  const h = Math.floor(T.playTime / 3600), m = Math.floor((T.playTime % 3600) / 60);
  $('recStats').innerHTML = [['行动次数', T.runs], ['胜利次数', T.wins], ['击杀人数', fmtNum(T.kills)], ['爆头次数', fmtNum(T.hs)], ['精度', acc + '%'], ['击落直升机', T.heliDowns], ['油桶击杀', T.barrelKills], ['队友击杀', T.allyKills], ['最晚坚守时间', T.bestHour ? fmtClock(T.bestHour) : '—'], ['战斗时长', `${h}:${String(m).padStart(2, '0')}`]]
    .map(([k, v], i) => `<div class="rs" style="--i:${i}"><span>${k}</span><b>${v}</b></div>`).join('');
  $('recStats').classList.add('stagger');
  let got = 0;
  $('recMedals').innerHTML = MEDALS.map((M, i) => {
    const on = !!profile.medals[M.id];
    if (on) got++;
    return `<div class="medal${on ? ' got brk' : ''}" style="--i:${i}">${medalIcon(M.id, on)}<b>${M.name}</b><span>${M.desc}</span><em>${plus(M.xp)} 经验</em></div>`;
  }).join('');
  $('recMedals').classList.add('stagger');
  $('medalCount').textContent = `${arNum(got)} 从 ${arNum(MEDALS.length)}`;
  renderBoard(tab);
  showScreen('record');
  $('record').querySelector('.page-body').scrollTop = 0;
}
function renderBoard(tab) {
  for (const b of $$('#boardTabs button')) b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
  const list = profile.best[tab] || [];
  $('recBoard').innerHTML = list.length
    ? list.map((e, i) => `<div class="lb"><span class="lb-i">${i + 1}</span><b>${fmtNum(e.score)}</b><span>${fmtClock(e.hour)}</span><span>${e.kills} 击杀</span><span class="grade g${e.grade}">${GRADE_AR[e.grade] || e.grade}</span><span class="lb-d">${DIFFICULTY[e.diff] ? DIFFICULTY[e.diff].name : ''}</span></div>`).join('')
    : '<p class="empty">暂无战绩. 完成一次行动后会在这里显示.</p>';
}

/* ---------- settings ---------- */
const SET_INFO = {
  quality: '控制阴影、泛光和渲染精度. 选择 «低» 或 «中» 适合手机和性能较弱的设备，«极高» 适合性能较强的电脑.',
  dynRes: '场景负载升高时暂时降低分辨率，随后恢复，以保持大规模战斗流畅.',
  fov: '战斗中可观察的视野范围. 较大值: 视野更广、两侧可见更多，但物体显得更小、更远. 较小值: 画面更近、更大，两侧视野更少. 只影响战斗画面；菜单使用固定镜头，可从暂停菜单尝试调整. 默认 80.',
  grain: '画面上叠加细微动态颗粒，营造电影质感. 如需更清晰画面，可关闭此项.',
  fps: '在屏幕角落显示每秒帧数.',
  sens: '鼠标移动时视角转动的速度.',
  adsSens: '精确瞄准时相对普通观察的灵敏度比例.',
  invertY: '鼠标向上移动时视角向下，类似部分飞行游戏.',
  touchSens: '在屏幕右侧拖动手指时的视角速度.',
  aimAssist: '准星经过敌人时略微减速，帮助触屏和手柄跟踪目标.',
  autoFire: '手机上: 准星稳定指向敌人时自动开火.',
  hudScale: '战斗界面各元素的大小.',
  muted: '关闭全部音乐与音效，直到你重新开启.',
  master: '整个游戏的总音量.',
  music: '菜单和战斗中的音乐音量.',
  sfx: '枪声、爆炸、脚步及其他音效的音量.',
  vocals: '你受伤时发出的声音: 轻伤呻吟、重伤呼喊，生命较低时急促喘息.',
  blood: '显示血液与伤痕.',
  crosshair: '屏幕中央准星的外观.',
  hints: '首次行动中提供简短指导.',
};
function setInfo(key) {
  const f = SETTINGS_SCHEMA.find((x) => x.key === key) || SETTINGS_SCHEMA.find((x) => x.tab === settingsTab);
  if (!f) return;
  $('setInfoTab').textContent = (SETTINGS_TABS.find((t) => t.id === f.tab) || {}).label || '';
  $('setInfoName').textContent = f.label.replace(/\s*\(.*\)\s*$/, '');
  $('setInfoText').textContent = SET_INFO[f.key] || f.hint || '';
}
let settingsTab = 'gfx';
export function openSettings(from) {
  settingsReturn = from;
  renderSettings();
  showScreen('settings');
}
const rangePct = (f, v) => (((v - f.min) / (f.max - f.min)) * 100).toFixed(1) + '%';
function renderSettings() {
  $('setTabs').innerHTML = SETTINGS_TABS.map((t) => `<button type="button" class="tab nav" data-tab="${t.id}" aria-pressed="${t.id === settingsTab}">${t.label}</button>`).join('');
  $('setFields').innerHTML = SETTINGS_SCHEMA.filter((f) => f.tab === settingsTab).map((f) => {
    const v = settings[f.key];
    if (f.type === 'range') return `<div class="field"><label for="s_${f.key}">${f.label}</label><output id="o_${f.key}">${f.fmt(v)}</output>
      <input class="nav" id="s_${f.key}" data-key="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}" style="--p:${rangePct(f, v)}"></div>`;
    if (f.type === 'toggle') return `<div class="field"><span>${f.label}</span><button type="button" class="toggle nav" data-key="${f.key}" aria-pressed="${!!v}"><span class="on">开启</span><span class="off">关闭</span></button></div>`;
    return `<div class="field"><span>${f.label}${f.hint ? `<small>${f.hint}</small>` : ''}</span><span class="seg">${f.opts.map(([k, l]) => `<button type="button" class="nav" data-key="${f.key}" data-val="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</span></div>`;
  }).join('');
  setInfo();
}
function bindSettings() {
  $('setFields').addEventListener('focusin', (e) => { const k = e.target.dataset && e.target.dataset.key; if (k) setInfo(k); });
  $('setTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; settingsTab = b.dataset.tab; sfx.tick(); renderSettings(); $('setTabs').querySelector(`[data-tab="${settingsTab}"]`).focus(); });
  $('setFields').addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset.key) return;
    const f = SETTINGS_SCHEMA.find((x) => x.key === t.dataset.key);
    settings[f.key] = Number(t.value);
    $('o_' + f.key).textContent = f.fmt(settings[f.key]);
    t.style.setProperty('--p', rangePct(f, settings[f.key]));
    saveSettings(f.key);
  });
  $('setFields').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const key = b.dataset.key;
    settings[key] = b.classList.contains('toggle') ? !settings[key] : b.dataset.val;
    saveSettings(key);
    sfx.tick();
    renderSettings();
    $('setFields').querySelector(`[data-key="${key}"]${b.dataset.val ? `[data-val="${b.dataset.val}"]` : ''}`)?.focus();
  });
  $('setBack').addEventListener('click', () => { sfx.back(); closeSettings(); });
  $('setReset').addEventListener('click', () => { resetSettings(); sfx.back(); renderSettings(); });
}
function closeSettings() { if (settingsReturn === 'pause') showScreen('pause'); else openMain(); }
function closeControls() { if (controlsReturn === 'pause') showScreen('pause'); else openMain(); }

/* ---------- pause ---------- */
export function pause() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  releaseAll();
  if (focus.active) setFocus(false);
  unlockPointer();
  if (audio.ctx) audio.ctx.suspend();
  $('pauseMeta').textContent = `${MAP_INFO.name} · 时间 ${fmtClock(game.hour)} · 第几波 ${arNum((game.wave || 0) + 1)}`;
  showScreen('pause');
}
export function resume() {
  if (game.state !== 'paused') return;
  showScreen(null);
  if (audio.ctx) audio.ctx.resume();
  game.state = 'playing';
  lockPointer();
}

/* ---------- after-action report ---------- */
export function openAAR(r) {
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  $('aarEyebrow').textContent = r.won ? (r.mode === 'dusk' ? '胜利 · 午夜' : '行动结束') : '战后报告';
  $('aarTitle').textContent = r.won ? '你坚守到了午夜' : `你阵亡于 ${fmtClock(r.hour)}`;
  $('aarMeta').textContent = `${MAP_INFO.name} · ${MODES[r.mode].name} · ${DIFFICULTY[r.diff].name}${r.place >= 0 ? ` · 名次 ${arNum(r.place + 1)} 在你的记录中` : ''}`;
  $('aarGrade').textContent = GRADE_AR[r.grade] || r.grade;
  $('aarGrade').className = 'grade-stamp g' + r.grade;
  $('aarStars').innerHTML = r.mode === 'dusk' ? [1, 2, 3].map((s) => `<i class="${r.stars >= s ? 'on' : ''}"></i>`).join('') : '';
  const S = r.stats;
  $('aarStats').innerHTML = [['击杀人数', S.kills], ['头部', S.hs], ['精度', S.acc + '%'], ['最长连杀', S.streak], ['波次', S.waves], ['时长', `${Math.floor(S.time / 60)}:${String(Math.floor(S.time % 60)).padStart(2, '0')}`]]
    .map(([k, v], i) => `<div class="rs" style="--i:${i}"><span>${k}</span><b>${v}</b></div>`).join('');
  $('aarStats').classList.add('stagger');
  const lines = $('aarLines');
  lines.innerHTML = '';
  $('aarTotal').textContent = '0';
  $('aarUnlocks').innerHTML = '';
  $('aarMedals').innerHTML = r.medals.map((M) => `<div class="medal got small">${medalIcon(M.id, true)}<b>${M.name}</b></div>`).join('');
  $('aarDaily').innerHTML = dailyHTML(false);
  $('aarRank').classList.remove('promoted');
  showScreen('aar');
  // count the report up line by line
  let total = 0, i = 0;
  const step = () => {
    if (current !== 'aar') return;
    if (i < r.lines.length) {
      const l = r.lines[i++];
      total += l.pts;
      lines.appendChild(el('div', 'aar-line', `<span>${esc(l.label)}${l.count > 1 ? ` <em>×${l.count}</em>` : ''}</span><b>${plus(l.pts)}</b>`));
      lines.scrollTop = lines.scrollHeight;
      $('aarTotal').textContent = fmtNum(total);
      sfx.tick();
      setTimeout(step, 140);
    } else animateRank(r);
  };
  animateRank(r, true);
  setTimeout(step, 500);
}
function animateRank(r, initial) {
  const box = $('aarRank');
  box.className = 'rec-rank small brk';
  const xp = initial ? r.xpBefore : r.xpAfter;
  const rp = rankProgress(xp);
  box.innerHTML = `${rankInsignia(rp.idx, 64)}<div><b>${rp.rank.name}</b><span class="xpbar"><i style="transform:scaleX(${rp.frac.toFixed(3)})"></i></span><span class="pc-x">${fmtNum(xp)} 经验 · ${plus(r.xpAfter - r.xpBefore)} 本次行动</span></div>`;
  if (initial) return;
  if (r.rankAfter > r.rankBefore) {
    box.classList.add('promoted');
    box.insertAdjacentHTML('afterbegin', `<span class="promo">晋升!</span>`);
    music.stinger('rank');
  }
  $('aarUnlocks').innerHTML = r.unlocks.map((u) => `<div class="unlock"><em>${u.kind} 新解锁</em><b>${u.name}</b></div>`).join('');
}

/* ---------- keyboard / gamepad navigation ---------- */
function focusables() { return $$('.nav:not([disabled])', $(current)).filter((n) => n.offsetParent !== null); }
export function moveFocus(dir) {
  const list = focusables();
  if (!list.length) return;
  let i = list.indexOf(document.activeElement);
  const step = dir === 'up' || dir === 'right' ? -1 : 1;
  i = i < 0 ? 0 : (i + step + list.length) % list.length;
  list[i].focus();
  list[i].scrollIntoView({ block: 'nearest' });
}
export function back() {
  if (current === 'brief' || current === 'record') { if (mapBusy) return; sfx.back(); openMain(); }
  else if (current === 'settings') { sfx.back(); closeSettings(); }
  else if (current === 'controls') { sfx.back(); closeControls(); }
  else if (current === 'pause') resume();
}
export function menuKey(e) {
  if (current === 'splash') { enterMenu(); return; }
  if (current === 'boot' || current === null) return;
  if (e.target instanceof HTMLInputElement && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); moveFocus({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.code]); }
  else if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); back(); }
}
export function menuNav(dir) {
  if (current === 'splash') { enterMenu(); return; }
  if (dir === 'ok') { const a = document.activeElement; if (a && a.click) a.click(); }
  else if (dir === 'back') back();
  else if (dir === 'start' && current === 'pause') resume();
  else moveFocus(dir);
}

// the loading screen shows the percentage main.js writes into the bar
{
  if (/autotest/.test(location.hash)) document.documentElement.classList.add('autotest');
  const bar = $('bootBar'), pct = $('bootPct');
  if (bar && pct && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      const m = /scaleX\(([\d.]+)\)/.exec(bar.style.transform);
      if (m) pct.textContent = Math.round(Number(m[1]) * 100) + '%';
    }).observe(bar, { attributes: true, attributeFilter: ['style'] });
  }
  setMenuFx('title', true);
}

export function initScreens() {
  if (isTouch) $('pressLine').textContent = '触摸屏幕开始';
  $('splash').addEventListener('pointerdown', enterMenu);
  wireMenu($('mainMenu'), $('menuDesc'));
  wireMenu($('pauseMenu'));
  $('main').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    sfx.select();
    const act = b.dataset.act;
    if (act === 'play') openBriefing();
    else if (act === 'loadout') openBriefing(true);
    else if (act === 'record') openRecord();
    else if (act === 'settings') openSettings('main');
    else if (act === 'guide') openControls('main');
  });
  $('ctlBack').addEventListener('click', () => { sfx.back(); closeControls(); });
  $('guideTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; guideTab = b.dataset.gtab; sfx.tick(); renderGuide(); $('controls').querySelector('.page-body').scrollTop = 0; });
  $('pCtlBtn').addEventListener('click', () => { sfx.select(); openControls('pause'); });
  bindBriefing();
  bindSettings();
  $('boardTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { sfx.tick(); renderBoard(b.dataset.tab); } });
  $('recBack').addEventListener('click', () => { sfx.back(); openMain(); });
  $('resumeBtn').addEventListener('click', resume);
  $('pSetBtn').addEventListener('click', () => { sfx.select(); openSettings('pause'); });
  $('restartBtn').addEventListener('click', () => {
    if (audio.ctx) audio.ctx.resume();
    startRun({ map: profile.map, mode: profile.mode, diff: profile.diff, primary: profile.loadout, skin: profile.skin });
    showScreen(null);
  });
  $('quitBtn').addEventListener('click', () => { if (audio.ctx) audio.ctx.resume(); endRun(false); });
  $('aarAgain').addEventListener('click', () => { sfx.select(); buildShowcaseIfNeeded(); openBriefing(); });
  $('aarMenu').addEventListener('click', () => { sfx.back(); clearBattlefield(); showHUD(false); returnToMenuScene(); openMain(); });
  document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('nav') && !isTouch) sfx.hover(); });
  // game menus: pointing at an item selects it (same state as keyboard / gamepad focus)
  if (!isTouch) {
    document.addEventListener('pointerover', (e) => {
      const n = e.target.closest && e.target.closest('.nav');
      if (!n || n === document.activeElement || n.disabled || e.buttons) return;
      if (!n.closest('.screen:not([hidden])')) return;
      n.focus({ preventScroll: true });
    });
  }
}
function buildShowcaseIfNeeded() { if (!showcase.length) returnToMenuScene(); }
function returnToMenuScene() { clearBattlefield(); game.state = 'menu'; game.hour = 18.4; applyTOD(18.4); buildShowcase(); }
