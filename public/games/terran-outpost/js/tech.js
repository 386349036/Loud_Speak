/* 被动科技：每类生产建筑 2 级，逐级 +1 伤害，不增加主动操作。
   研究是独立的矿/时间计时，不占用生产队列。 */

export const TECH_DEFS = {
  barracks: {
    id: 'barracks', name: '步兵武器校准', en: 'INFANTRY WEAPONS',
    kinds: ['marine', 'firebat'], max: 2,
    desc: '陆战队员与火焰兵伤害 +1/级',
    levels: [
      { cost: 120, time: 18 },
      { cost: 180, time: 26 }
    ]
  },
  factory: {
    id: 'factory', name: '载具弹药强化', en: 'VEHICLE AMMO',
    kinds: ['tank', 'vulture'], max: 2,
    desc: '攻城坦克与秃鹰摩托伤害 +1/级',
    levels: [
      { cost: 130, time: 20 },
      { cost: 190, time: 28 }
    ]
  },
  starport: {
    id: 'starport', name: '空射火控升级', en: 'AIR FIRE CONTROL',
    kinds: ['viking', 'dropship', 'battlecruiser'], max: 2,
    desc: '维京/运输舰/战列巡航舰伤害 +1/级',
    levels: [
      { cost: 150, time: 24 },
      { cost: 220, time: 32 }
    ]
  }
};

/* 由建筑对象反查科技线（支持玩家新建的 barracks_p1 等动态建筑） */
export function techKeyOf(b){
  if (!b) return null;
  if (TECH_DEFS[b.type]) return b.type;
  const key = String(b.key || '');
  if (key.startsWith('barracks')) return 'barracks';
  if (key.startsWith('factory')) return 'factory';
  if (key.startsWith('starport')) return 'starport';
  return null;
}

export function createTech({ wallet, toast, onChange }){
  const levels = { barracks: 0, factory: 0, starport: 0 };
  let active = null;               /* {key, t, total} */

  function start(key){
    const def = TECH_DEFS[key];
    if (!def) return false;
    if (active){ toast && toast('已有科技正在研究'); return false; }
    const lv = levels[key] || 0;
    if (lv >= def.max){ toast && toast('该科技已满级'); return false; }
    const step = def.levels[lv];
    if (wallet && wallet.minerals < step.cost){ toast && toast('矿物不足'); return false; }
    if (wallet) wallet.minerals -= step.cost;
    active = { key, t: 0, total: step.time };
    toast && toast(`开始研究 ${def.name} · Lv.${lv + 1}`);
    if (onChange) onChange(key);
    return true;
  }

  function update(dt){
    if (!active) return;
    active.t += dt;
    if (active.t >= active.total){
      const key = active.key;
      levels[key] = Math.min(TECH_DEFS[key].max, (levels[key] || 0) + 1);
      active = null;
      toast && toast(`${TECH_DEFS[key].name} 研究完成 · Lv.${levels[key]}`);
      if (onChange) onChange(key);
    }
  }

  /* 该单位种类的伤害加成（只认定义里的 kinds） */
  function bonusFor(kind){
    if (!kind) return 0;
    for (const key in TECH_DEFS){
      if (TECH_DEFS[key].kinds.includes(kind)) return levels[key] || 0;
    }
    return 0;
  }

  function stateOf(bOrKey){
    const key = typeof bOrKey === 'string' ? bOrKey : techKeyOf(bOrKey);
    const def = TECH_DEFS[key];
    if (!def) return null;
    const lv = levels[key] || 0;
    const next = lv < def.max ? def.levels[lv] : null;
    return {
      key, def, level: lv, max: def.max, next,
      busy: !!(active && active.key === key),
      remaining: active && active.key === key ? Math.max(0, active.total - active.t) : 0,
      pct: active && active.key === key ? Math.min(1, active.t / active.total) : 0
    };
  }

  function dump(){ return { ...levels }; }
  function restore(data){
    if (!data) return;
    for (const key in levels){
      const v = data[key];
      levels[key] = Math.max(0, Math.min(TECH_DEFS[key].max, Number(v) || 0));
    }
    active = null;
  }

  return { start, update, bonusFor, stateOf, dump, restore, levels };
}
