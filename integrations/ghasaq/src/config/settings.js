import { store } from '../core/utils.js';

/* Player-facing settings, quality presets and the schema the settings screen renders from. */

// '#touch' in the address forces the phone controls on a desktop (handy for testing the layout)
export const isTouch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || location.hash.includes('touch');
export const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const QUALITY = {
  low: { label: '低', pr: 0.75, shadow: 512, bloom: false, samples: 0, particles: 0.45 },
  medium: { label: '中', pr: 1, shadow: 1024, bloom: false, samples: 2, particles: 0.7 },
  high: { label: '高', pr: 1.5, shadow: 2048, bloom: true, samples: 4, particles: 1 },
  ultra: { label: '极高', pr: 2, shadow: 4096, bloom: true, samples: 4, particles: 1 },
};

const DEFAULTS = {
  // graphics
  quality: isTouch ? 'medium' : 'high',
  dynRes: true,
  fov: 80,
  grain: true,
  fps: false,
  // controls
  sens: 1,
  adsSens: 0.85,
  invertY: false,
  touchSens: 1,
  aimAssist: true,
  autoFire: false,
  hudScale: 1,
  // audio
  master: 0.85,
  music: 0.35,
  sfx: 1,
  muted: false,
  vocals: true,
  // gameplay
  blood: true,
  crosshair: 'cross',
  hints: true,
};

const KEY = 'ghasaq.settings.v2';
export const settings = Object.assign({}, DEFAULTS, store.get(KEY, {}));
if (!QUALITY[settings.quality]) settings.quality = DEFAULTS.quality;
// the first release shipped the music too loud: move anyone still on that default to the new one
if (!settings.mixV3) { if (settings.music === 0.55) settings.music = DEFAULTS.music; settings.mixV3 = true; store.set(KEY, settings); }

const listeners = [];
export function onSettingsChange(fn) { listeners.push(fn); }
export function saveSettings(changedKey) {
  store.set(KEY, settings);
  for (const fn of listeners) fn(changedKey, settings[changedKey]);
}
export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  saveSettings('*');
}

const pct = (v) => Math.round(v * 100) + '%';
export const SETTINGS_TABS = [
  { id: 'gfx', label: '画面' },
  { id: 'ctl', label: '操作' },
  { id: 'snd', label: '声音' },
  { id: 'play', label: '游戏' },
];
export const SETTINGS_SCHEMA = [
  { tab: 'gfx', key: 'quality', label: '画质', type: 'seg', opts: Object.entries(QUALITY).map(([k, q]) => [k, q.label]), hint: '阴影、泛光和渲染精度' },
  { tab: 'gfx', key: 'dynRes', label: '动态分辨率 (负载较高时略微降低分辨率，保持流畅)', type: 'toggle' },
  { tab: 'gfx', key: 'fov', label: '视野', type: 'range', min: 65, max: 100, step: 1, fmt: (v) => v + '°' },
  { tab: 'gfx', key: 'grain', label: '胶片颗粒', type: 'toggle' },
  { tab: 'gfx', key: 'fps', label: '帧率计数器', type: 'toggle' },
  { tab: 'ctl', key: 'sens', label: '鼠标灵敏度', type: 'range', min: 0.2, max: 3, step: 0.05, fmt: (v) => Number(v).toFixed(2) },
  { tab: 'ctl', key: 'adsSens', label: '瞄准灵敏度', type: 'range', min: 0.3, max: 1.5, step: 0.05, fmt: (v) => Number(v).toFixed(2) },
  { tab: 'ctl', key: 'invertY', label: '反转垂直视角', type: 'toggle' },
  { tab: 'ctl', key: 'touchSens', label: '触控灵敏度', type: 'range', min: 0.3, max: 2.5, step: 0.05, fmt: (v) => Number(v).toFixed(2) },
  { tab: 'ctl', key: 'aimAssist', label: '辅助瞄准 (触屏与手柄)', type: 'toggle' },
  { tab: 'ctl', key: 'autoFire', label: '瞄准敌人时自动开火 (触屏)', type: 'toggle' },
  { tab: 'ctl', key: 'hudScale', label: '界面缩放', type: 'range', min: 0.8, max: 1.3, step: 0.05, fmt: pct },
  { tab: 'snd', key: 'muted', label: '静音', type: 'toggle' },
  { tab: 'snd', key: 'master', label: '主音量', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { tab: 'snd', key: 'music', label: '音乐', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { tab: 'snd', key: 'sfx', label: '音效', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { tab: 'snd', key: 'vocals', label: '受伤语音', type: 'toggle' },
  { tab: 'play', key: 'blood', label: '血液与伤痕', type: 'toggle' },
  { tab: 'play', key: 'crosshair', label: '准星样式', type: 'seg', opts: [['cross', '十字'], ['dot', '圆点'], ['circle', '圆圈']] },
  { tab: 'play', key: 'hints', label: '新手提示', type: 'toggle' },
];
