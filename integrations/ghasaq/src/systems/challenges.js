import { mulberry32 } from '../core/utils.js';
import { WEAPONS } from '../config/balance.js';
import { sfx } from '../audio/sfx.js';
import { profile, saveProfile, award, weaponUnlocked } from './progression.js';
import { medalToast } from '../ui/hud.js';

/*
 * Daily challenges: three tasks picked from a pool with a seed made from today's date, so every
 * player gets the same set each day. Progress carries across runs until midnight.
 */

const POOL = [
  { id: 'kills30', text: '击杀 30 名敌人', target: 30, xp: 1500, ev: 'kill' },
  { id: 'hs10', text: '完成 10 次爆头', target: 10, xp: 1500, ev: 'headshot' },
  { id: 'rifle20', text: '使用步枪击杀 20 人 KH-7', target: 20, xp: 1400, ev: 'kill', weapon: 'rifle' },
  { id: 'smg15', text: '使用冲锋枪击杀 15 人 «旋风»', target: 15, xp: 1800, ev: 'kill', weapon: 'smg' },
  { id: 'shotgun10', text: '使用霰弹枪击杀 10 人', target: 10, xp: 1800, ev: 'kill', weapon: 'shotgun' },
  { id: 'dmr8', text: '使用狙击步枪击杀 8 人', target: 8, xp: 2000, ev: 'kill', weapon: 'dmr' },
  { id: 'pistol5', text: '使用手枪击杀 5 人', target: 5, xp: 1600, ev: 'kill', weapon: 'pistol' },
  { id: 'knife3', text: '使用匕首完成 3 次致命刺杀', target: 3, xp: 2000, ev: 'kill', weapon: 'knife' },
  { id: 'nade5', text: '使用手榴弹击杀 5 人', target: 5, xp: 1700, ev: 'kill', weapon: 'nade' },
  { id: 'barrel3', text: '使用爆炸油桶击杀 3 人', target: 3, xp: 1500, ev: 'kill', weapon: 'barrel' },
  { id: 'sniper2', text: '击杀两名塔楼狙击手', target: 2, xp: 1800, ev: 'kill', role: 'sniper' },
  { id: 'strike1', text: '呼叫一次空袭', target: 1, xp: 1200, ev: 'support', support: 'strike' },
  { id: 'ally3', text: '队友击杀 3 名敌人', target: 3, xp: 1600, ev: 'allyKill' },
  { id: 'waves6', text: '坚持 6 波攻击', target: 6, xp: 1800, ev: 'wave' },
  { id: 'heli1', text: '击落敌方直升机', target: 1, xp: 2500, ev: 'heli' },
  { id: 'focus5', text: '专注期间击杀 5 人', target: 5, xp: 1600, ev: 'focusKill' },
];
const byId = Object.fromEntries(POOL.map((c) => [c.id, c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Today's three challenges, rolled once per calendar day. */
export function dailyChallenges() {
  const date = today();
  if (!profile.daily || profile.daily.date !== date) {
    let seed = 0;
    for (const ch of date) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const r = mulberry32(seed);
    const pool = POOL.filter((c) => !c.weapon || !WEAPONS[c.weapon] || weaponUnlocked(c.weapon));
    const picked = [];
    while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    profile.daily = { date, items: picked.map((c) => ({ id: c.id, progress: 0, done: false })) };
    saveProfile();
  }
  return profile.daily.items.map((it) => ({ ...byId[it.id], ...it }));
}

/** Feed a gameplay event: kill {weapon, role}, headshot, support {support}, allyKill, wave, heli, focusKill. */
export function challengeEvent(ev, info = {}) {
  if (!profile.daily) dailyChallenges();
  let changed = false;
  for (const it of profile.daily.items) {
    const c = byId[it.id];
    if (!c || it.done || c.ev !== ev) continue;
    if (c.weapon && c.weapon !== info.weapon) continue;
    if (c.role && c.role !== info.role) continue;
    if (c.support && c.support !== info.support) continue;
    it.progress = Math.min(c.target, it.progress + 1);
    changed = true;
    if (it.progress >= c.target) {
      it.done = true;
      award('每日挑战: ' + c.text, c.xp, { noSupport: true });
      medalToast({ id: 'daily', name: '完成每日挑战', desc: `${c.text} · +${c.xp} XP` });
      sfx.medal();
    }
  }
  if (changed) saveProfile();
}

/** Time left until the challenges reset, for the menu card. */
export function resetsIn() {
  const now = new Date(), next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const m = Math.round((next - now) / 60000);
  return `${Math.floor(m / 60)}小时 ${m % 60}分钟`;
}
