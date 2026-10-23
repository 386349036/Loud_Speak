import * as THREE from 'three';
import { arNum, clamp, fmtClock, lerp, pick, rand, randi, smooth } from '../core/utils.js';
import { game, run, enemies, refs, allies, resetRun } from '../core/state.js';
import { applyTOD, tod } from '../core/sky.js';
import { settings } from '../config/settings.js';
import { DIFFICULTY, SCORE, FOCUS, GRENADE, waveDef, waveSkill } from '../config/balance.js';
import { SPAWNS, SNIPER_SPOTS, loadMap } from '../world/map.js';
import { resetProps } from '../world/props.js';
import { clearRagdolls } from '../entities/ragdoll.js';
import { fx } from '../fx/particles.js';
import { clearDecals } from '../fx/decals.js';
import { clearTransientFx } from '../fx/tracers.js';
import { setStorm } from '../fx/weather.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { radio, clearRadio } from '../audio/radio.js';
import { spawnEnemy, clearEnemies, waveCfg, aiCfg } from '../entities/enemy.js';
import { player, resetPlayer } from '../entities/player.js';
import { resetArsenal, inv, refillAmmo } from '../weapons/arsenal.js';
import { applySkin } from '../weapons/viewmodels.js';
import { resetGrenades } from '../weapons/grenades.js';
import { spawnHelicopter, clearHelicopter } from '../vehicles/helicopter.js';
import { clearAircraft } from '../vehicles/flights.js';
import { clearParachutes } from '../vehicles/parachute.js';
import { lockPointer, unlockPointer, releaseAll } from '../input/input.js';
import { focus, resetFocus, setFocus, addFocus, focusKill } from './focus.js';
import { spawnPickup, clearPickups } from './pickups.js';
import { resetSupport } from './support.js';
import { profile, saveProfile, award, unlockMedal, finalizeRun } from './progression.js';
import { challengeEvent } from './challenges.js';
import { updateTension, tensionEvent, resetTension } from './tension.js';
import { squadTalk } from '../entities/ally.js';
import { banner, showMsg, popText, killFeed, showHUD, hint, clearFeed, updateAmmoHUD } from '../ui/hud.js';
import { openAAR } from '../ui/screens.js';

/* Run lifecycle: start, waves and their events, kill rewards, intermissions and the end of the run. */

export function startRun(opts) {
  game.mode = opts.mode; game.diff = opts.diff;
  profile.mode = opts.mode; profile.diff = opts.diff; profile.loadout = opts.primary; profile.skin = opts.skin;
  if (opts.map) profile.map = opts.map;
  saveProfile();
  resetRun();
  clearBattlefield();
  loadMap(profile.map);
  resetPlayer();
  resetArsenal(opts.primary);
  applySkin(opts.skin);
  resetFocus();
  resetGrenades();
  resetSupport();
  resetTension();
  clearFeed();
  game.hour = 16;
  applyTOD(16);
  game.stormWave = Math.random() < 0.75 ? pick([1, 5]) : -1;
  game.torchAuto = false;
  game.storm = 0; setStorm(false);
  showHUD(true);
  game.state = 'playing';
  music.setState('combat');
  music.setIntensity(0.2);
  startWave(0);
  lockPointer();
  if (settings.hints && profile.firstRun) scheduleHints();
}

export function clearBattlefield() {
  clearEnemies();
  clearRagdolls();
  resetGrenades();
  resetProps();
  clearDecals();
  clearPickups();
  clearParachutes();
  clearAircraft();
  clearHelicopter();
  for (const a of allies.slice()) a.dispose();
  fx.clear();
  clearTransientFx();
  clearRadio();
}

function scheduleHints() {
  const touch = document.body.classList.contains('touch');
  const lines = touch
    ? [[4, '左手拖动行走，右手滑动观察'], [11, '按住开火按钮并拖动，可边瞄准边射击'], [20, '积累支援点，打开支援菜单呼叫增援']]
    : [[4, '在掩体间移动: 站着不动会让敌人更容易击中你'], [11, '鼠标右键精确瞄准，按Shift 奔跑'], [20, '击杀敌人获得支援点. 按键 3 至 6 呼叫空中支援'], [30, '爆头可积累专注. 按 Q 减缓时间']];
  for (const [t, text] of lines) setTimeout(() => { if (game.state === 'playing' && game.wave === 0) hint(text); }, t * 1000);
}

function kindPicker(def) {
  return () => {
    if (Math.random() < def.heavy) return ['heavy', 'rifle'];
    const kind = Math.random() < def.night ? 'night' : 'raider';
    return [kind, Math.random() < def.gren ? 'grenadier' : 'rifle'];
  };
}
let currentDef = null;
export function startWave(i) {
  const def = currentDef = waveDef(i);
  const skill = waveSkill(i), D = DIFFICULTY[game.diff];
  Object.assign(waveCfg, { spread: skill.spread * D.spread, react: skill.react * D.react, pause: skill.pause, dmg: skill.dmg * D.dmg });
  Object.assign(aiCfg, D.ai);
  game.wave = i;
  const total = Math.round(def.n * D.count);
  const heliTroops = def.heli ? 4 : 0;
  game.toSpawn = Math.max(1, total - heliTroops - def.snipers);
  game.heliDue = def.heli ? 16 : -1;
  game.snipersDue = Array.from({ length: def.snipers }, (_, k) => 7 + k * 22);
  game.maxAlive = def.max;
  game.spawnT = 2;
  game.inter = 0;
  game.waveTime = 0;
  run.waveDmg = 0;
  const storm = i === game.stormWave;
  setStorm(storm);
  const extra = [def.heli ? '敌方直升机' : '', def.snipers ? '塔楼上的狙击手' : '', storm ? '沙尘暴' : ''].filter(Boolean).join(' · ');
  banner(fmtClock(def.h), `第 ${arNum(i + 1)} 波 · ${def.title}`, `来袭敌人：${arNum(total)} 名${extra ? ' · ' + extra : ''}`);
  sfx.bell(Math.min(8, def.h % 12 || 12));
  music.stinger('wave');
  music.setState('combat');
  if (storm) setTimeout(() => radio('沙尘暴即将到来. 双方视野都会受限，靠近掩体.', 'hq', true), 2500);
  if (def.snipers) setTimeout(() => radio('注意: 一名狙击手占据了塔楼. 留意瞄准镜闪光.', 'hq'), 6500);
  if (def.h % 24 === 19) setTimeout(() => showMsg('天黑了 · 按 F 打开手电', 3200), 4000);
}

function spawnRegular() {
  const ranked = SPAWNS.map((p) => ({ p, d: p.distanceTo(player.pos) })).sort((a, b) => b.d - a.d);
  const base = ranked[randi(4)].p;
  const pos = base.clone().add(new THREE.Vector3(rand(-1.5, 1.5), 0, rand(-1.5, 1.5)));
  const [kind, role] = kindPicker(currentDef)();
  spawnEnemy(kind, role, pos);
}
function spawnSniper() {
  const taken = enemies.filter((e) => e.role === 'sniper').map((e) => e.pos);
  const free = SNIPER_SPOTS.filter((s) => !taken.some((t) => t.distanceTo(s) < 1));
  if (!free.length) return;
  const spot = free.sort((a, b) => b.distanceTo(player.pos) - a.distanceTo(player.pos))[randi(Math.min(2, free.length))];
  spawnEnemy(Math.random() < 0.5 ? 'night' : 'raider', 'sniper', spot);
}
const remaining = () => game.toSpawn + enemies.length + (game.heliDue >= 0 ? 4 : 0) + game.snipersDue.length + (refs.heli && refs.heli.troops > 0 && refs.heli.state === 'hover' ? refs.heli.troops : 0) + (refs.heli && refs.heli.state === 'approach' ? refs.heli.troops : 0);

export function updateWaves(dt) {
  if (game.inter > 0) {
    updateTension(dt, false);
    game.inter -= dt;
    const t = smooth(clamp(1 - game.inter / 10, 0, 1));
    game.hour = lerp(game.hourFrom, game.hourTo, t);
    applyTOD(game.hour);
    if (game.inter <= 0) startWave(game.wave + 1);
    return;
  }
  const def = currentDef;
  game.waveTime += dt;
  game.hour = Math.min(def.h + 0.9, game.hour + dt / 90);
  applyTOD(game.hour);
  // the flashlight switches itself on the first time it gets properly dark
  if (!game.torchAuto && tod.night > 0.6) {
    game.torchAuto = true;
    if (!player.torch) { player.torch = true; showMsg('手电已自动开启 · F 关闭手电', 2600); }
  }
  if (game.toSpawn > 0 && enemies.length < game.maxAlive) {
    game.spawnT -= dt;
    if (game.spawnT <= 0) { spawnRegular(); game.toSpawn--; game.spawnT = rand(0.8, 1.8); }
  }
  if (game.heliDue >= 0 && game.waveTime >= game.heliDue) { game.heliDue = -1; spawnHelicopter(4, kindPicker(def)); tensionEvent('assault'); }
  while (game.snipersDue.length && game.waveTime >= game.snipersDue[0]) { game.snipersDue.shift(); spawnSniper(); }

  // the score, stingers and the distant battle follow the fight
  updateTension(dt, true);

  if (remaining() === 0 && player.alive) waveCleared();
}

function waveCleared() {
  const i = game.wave, def = currentDef;
  run.wavesCleared++;
  challengeEvent('wave');
  const nextHour = def.h + 1;
  award('坚守至 ' + fmtClock(nextHour), SCORE.waveBase + SCORE.wavePer * (i + 1));
  if (run.waveDmg === 0) { award('无伤完成一波', SCORE.flawless); unlockMedal('flawless'); }
  if (nextHour >= 20) unlockMedal('h20');
  if (game.mode === 'dawn' && nextHour >= 29) unlockMedal('dawn');
  setStorm(false);
  if (game.mode === 'dusk' && i === 7) {
    game.hour = 24; applyTOD(24);
    award('午夜胜利', SCORE.victory);
    unlockMedal('win');
    if (game.diff === 'legend') unlockMedal('legend');
    run.won = true;
    sfx.bell(12);
    music.stinger('victory');
    music.setState('silent');
    game.inter = 0;
    game.state = 'dying';
    setTimeout(() => endRun(true), 4500);
    return;
  }
  game.inter = 10;
  game.hourFrom = game.hour;
  game.hourTo = waveDef(i + 1).h;
  player.heal(25, 40);
  refillAmmo(0.35);
  inv.nades = Math.min(GRENADE.max, inv.nades + 1);
  updateAmmoHUD(true);
  banner(fmtClock(game.hourTo), '又坚持了一小时', '补给: 弹药、护甲、一枚手榴弹和 25 生命');
  music.stinger('clear');
  music.setState('calm');
  setTimeout(() => { if (game.state === 'playing') squadTalk('between', true); }, 3500);
}

/** Called by every raider death. info: { headshot, weapon, dist, explosive } */
export function onEnemyKilled(e, info) {
  run.kills++;
  const enemyCaused = info.weapon === 'enemyNade';
  if (!enemyCaused) {
    if (info.headshot) run.hs++;
    run.multi = run.time - run.lastKill < 2.6 ? run.multi + 1 : 1;
    run.lastKill = run.time;
    run.streak++;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    if (info.weapon === 'ally') {
      award('队友助攻', SCORE.allyAssist);
    } else {
      award(e.role === 'sniper' ? '击杀狙击手' : e.kind === 'heavy' ? '击杀重装兵' : '击杀', SCORE.kill + (e.kind === 'heavy' ? 60 : 0) + (e.role === 'sniper' ? 80 : 0));
      if (info.headshot) award('爆头', SCORE.headshot);
      if (!info.explosive && info.dist > 45) award('远距离射杀', SCORE.longshot);
      if (!info.explosive && info.dist >= 60) unlockMedal('longshot');
      if (info.weapon === 'barrel') { award('爆炸油桶', SCORE.barrel); run.barrelKills++; if (profile.totals.barrelKills + run.barrelKills >= 10) unlockMedal('barrels'); }
      else if (info.explosive) award('爆炸击杀', SCORE.explosive);
      if (run.multi >= 2) award('连续击杀', SCORE.multi * (run.multi - 1));
      if (info.weapon === 'knife') award(e.backstabbed ? '无声背刺' : '刺杀', SCORE.melee + (e.backstabbed ? SCORE.backstab : 0));
      challengeEvent('kill', { weapon: info.weapon, role: e.role });
      if (info.headshot) challengeEvent('headshot');
      if (focus.active) challengeEvent('focusKill');
    }
    focusKill();
    addFocus(info.headshot ? FOCUS.headGain : FOCUS.killGain + (info.explosive ? FOCUS.explosiveGain : 0));
    const labels = ['', '', '双杀', '三杀', '四杀', '大杀四方'];
    if (run.multi >= 2) { addFocus(FOCUS.multiGain); popText(labels[Math.min(run.multi, 5)]); }
    if (run.multi >= 3) tensionEvent('streak');
    if (run.multi >= 2 && Math.random() < 0.5) squadTalk('praise');
    else if (info.weapon === 'knife' && e.backstabbed) popText('无声刺杀');
    else if (info.headshot) popText('爆头');
    if (run.kills === 1) unlockMedal('first');
    if (run.hs >= 25) unlockMedal('hs25');
    if (info.weapon !== 'ally') sfx.killConfirm(run.multi);
  }
  killFeed(e, info);
  if (Math.random() < 0.3) spawnPickup(e.pos, Math.random() < 0.5 ? 'med' : 'ammo');
  if (game.state === 'playing' && remaining() === 0) game.slowmo = 1.3;
}

export function onPlayerDied() {
  game.state = 'dying';
  if (focus.active) setFocus(false);
  music.stinger('death');
  music.setState('silent');
  releaseAll();
  setTimeout(() => { if (game.state === 'dying') endRun(false); }, 2800);
}

export function endRun(won) {
  if (game.state === 'over') return;
  game.state = 'over';
  if (focus.active) setFocus(false);
  setStorm(false);
  unlockPointer();
  releaseAll();
  showHUD(false);
  const report = finalizeRun(won || run.won);
  openAAR(report);
  setTimeout(() => music.setState('menu'), 2500);
}
