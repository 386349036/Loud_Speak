/* 生产系统：队列 / 进度 / 完工事件（纯逻辑，DOM 由 main.js 负责） */
import * as THREE from 'three';

export const CATALOG = {
  command: [
    { id: 'scv',    name: 'SCV 工程机甲', en: 'SCV',     time: 18, cost: 50, max: 15, supply: 1 },
    { id: 'sentry', name: '栈桥哨兵',    en: 'SENTRY',  time: 8,  cost: 50, max: 8, supply: 0 },
    { id: 'uplink', name: '轨道通讯升级', en: 'UPLINK',  time: 22, cost: 100, supply: 0 }
  ],
  barracks_a: [
    { id: 'marine',  name: '陆战队员', en: 'MARINE',  time: 12, cost: 50, supply: 1 },
    { id: 'medic',   name: '医疗兵',   en: 'MEDIC',   time: 15, cost: 75, supply: 1 },
    { id: 'firebat', name: '火焰兵',   en: 'FIREBAT', time: 17, cost: 100, supply: 1 }
  ],
  barracks_b: [
    { id: 'marine',  name: '陆战队员', en: 'MARINE',  time: 12, cost: 50, supply: 1 },
    { id: 'medic',   name: '医疗兵',   en: 'MEDIC',   time: 15, cost: 75, supply: 1 },
    { id: 'firebat', name: '火焰兵',   en: 'FIREBAT', time: 17, cost: 100, supply: 1 }
  ],
  factory: [
    { id: 'tank',    name: '攻城坦克', en: 'SIEGE TANK', time: 26, cost: 150, max: 3, supply: 2 },
    { id: 'vulture', name: '秃鹰摩托', en: 'VULTURE',    time: 16, cost: 75, max: 6, supply: 1 }
  ],
  starport: [
    { id: 'dropship', name: '运输舰',   en: 'DROPSHIP', time: 34, cost: 200, supply: 2 },
    { id: 'viking',   name: '维京战机', en: 'VIKING',   time: 30, cost: 150, supply: 2 },
    { id: 'battlecruiser', name: '战列巡航舰', en: 'BATTLECRUISER', time: 62, cost: 400, unique: 'battlecruiser', supply: 4 }
  ],
  supply: [{ id: 'crate', name: '补给箱', en: 'SUPPLY', time: 8, cost: 25, supply: 0, supplyCap: 8, max: 3 }],
  turret: [{ id: 'ammo',  name: '弹药装填', en: 'RELOAD', time: 16, cost: 80, supply: 0, max: 3 }],
  bunker: [],
  repair: [{ id: 'patch', name: '装甲维修', en: 'PATCH',  time: 20, cost: 40, supply: 0 }]
};

const MAX_QUEUE = 4;
const MAX_CONCURRENT = 2;

export function createProduction({ buildings, actors, fx, wallet, onChange, limitOf, supply, priceOf, timeOf }){
  const states = new Map();
  let activeCount = 0;

  function setSupply(s){ supply = s; }

  /* 所有建筑队列里已排队的补给成本（含正在生产的那件） */
  function queuedSupply(){
    let n = 0;
    for (const st of states.values()){
      for (const it of st.queue) n += it.supply || 0;
    }
    return n;
  }
  const totals = { produced: 0 };

  for (const b of buildings){
    states.set(b.key, {
      key: b.key, b,
      items: CATALOG[b.key] || [],
      queue: [], active: false, progress: 0, produced: 0,
      fxHolo: null, fxCrane: null, lastEmit: -1
    });
  }

  function stateFor(b){
    let st = states.get(b.key);
    if (!st){
      st = {
        key: b.key, b,
        items: b.items || CATALOG[b.key] || [],
        queue: [], active: false, progress: 0, produced: 0,
        fxHolo: null, fxCrane: null, lastEmit: -1
      };
      states.set(b.key, st);
    }
    return st;
  }

  function emit(st){
    if (onChange) onChange(st);
  }

  function canStart(st){
    return !st.active && st.queue.length > 0 && activeCount < MAX_CONCURRENT;
  }

  /* 全场同类条目（排队 + 生产中）的数量，用于「哨兵上限 8」这类限制 */
  function queuedCount(itemId){
    let n = 0;
    for (const st of states.values()){
      for (const it of st.queue) if (it.id === itemId) n++;
    }
    return n;
  }

  function canEnqueue(b, index){
    const st = stateFor(b);
    if (!st || !st.items.length) return { ok: false, reason: 'building' };
    if (st.queue.length >= MAX_QUEUE) return { ok: false, reason: 'queue' };
    const item = st.items[index];
    if (!item) return { ok: false, reason: 'item' };
    if (item.max){
      const have = limitOf ? (limitOf(item, b) || 0) : 0;
      if (have + queuedCount(item.id) >= item.max) return { ok: false, reason: 'limit', have, max: item.max };
    }
    if (supply && item.supply){
      const used = supply.used() + queuedSupply();
      if (used + item.supply > supply.cap){
        return { ok: false, reason: 'supply', have: used, need: item.supply, cap: supply.cap };
      }
    }
    if (wallet && item.cost){
      const price = priceOf ? priceOf(item) : item.cost;
      if (wallet.minerals < price) return { ok: false, reason: 'minerals' };
    }
    return { ok: true, item };
  }

  function start(st){
    const item = st.queue[0];
    if (!item) return;
    st.active = true;
    st.progress = st._resume ? Math.min(st._resume, item.time - 0.2) : 0;
    st._resume = 0;
    activeCount++;
    if (fx){
      st.fxHolo = fx.hologram(st.b, item.time);
      st.fxCrane = fx.construct(st.b, item.time);
    }
    if (st.b.doorCtl) st.b.doorCtl.open(item.time + 1.2);
    if (actors && actors.setWorkers) actors.setWorkers(st.b, 2);
    emit(st);
    if (onChange) onChange(st, { started: true, item, key: st.key });
  }

  function finish(st){
    const item = st.queue.shift();
    st.active = false;
    st.progress = 0;
    st.produced++;
    totals.produced++;
    activeCount = Math.max(0, activeCount - 1);

    if (st.fxHolo){ st.fxHolo.finish(); st.fxHolo = null; }
    if (st.fxCrane){ st.fxCrane.finish(); st.fxCrane = null; }
    if (st.b.doorCtl) setTimeout(() => st.b.doorCtl && st.b.doorCtl.close(), 1800);
    if (actors && actors.clearWorkers) actors.clearWorkers(st.b);

    if (fx && st.b.workPoint) fx.sparkAt(new THREE.Vector3(st.b.workPoint.x, 3.2, st.b.workPoint.z), 26);
    if (onChange) onChange(st, { done: true, item, key: st.key });
  }

  function enqueue(b, index){
    const chk = canEnqueue(b, index);
    if (!chk.ok) return false;
    const st = stateFor(b);
    const item = chk.item;
    const price = priceOf ? priceOf(item) : (item.cost || 0);
    const time = timeOf ? timeOf(item) : item.time;
    if (wallet && price) wallet.minerals -= price;
    st.queue.push({ ...item, cost: price, time, queuedAt: performance.now(), spent: price });
    if (canStart(st)) start(st);
    else emit(st);
    return true;
  }

  function cancel(b, index){
    const st = stateFor(b);
    if (!st || index < 0 || index >= st.queue.length) return false;
    if (index === 0 && st.active){
      if (st.fxHolo){ st.fxHolo.finish(); st.fxHolo = null; }
      if (st.fxCrane){ st.fxCrane.finish(); st.fxCrane = null; }
      if (actors && actors.clearWorkers) actors.clearWorkers(st.b);
      st.active = false;
      st.progress = 0;
      activeCount = Math.max(0, activeCount - 1);
    }
    const removed = st.queue.splice(index, 1)[0];
    if (removed && removed.spent && wallet) wallet.minerals += removed.spent;
    if (canStart(st)) start(st);
    else emit(st);
    if (onChange) onChange(st, { cancelled: true, item: removed, key: st.key });
    return true;
  }

  function update(dt){
    for (const st of states.values()){
      /* 空闲但队列里还有东西：自动接着开工（否则第二件要等下一次点击） */
      if (!st.active){
        if (st.queue.length && canStart(st)) start(st);
        continue;
      }
      const item = st.queue[0];
      if (!item) { st.active = false; continue; }
      st.progress = Math.min(1, st.progress + dt / item.time);
      if (st.fxHolo) st.fxHolo.setProgress(st.progress);
      if (st.fxCrane) st.fxCrane.setProgress(st.progress);
      if (st.progress >= 1) finish(st);
      else if (st.progress - st.lastEmit > 0.1){ st.lastEmit = st.progress; emit(st); }
    }
  }

  function stateOf(b){ return stateFor(b); }

  /* 建筑被摧毁时丢弃它的生产状态，避免 activeCount 永久占坑 */
  function forget(b){
    if (!b) return;
    const st = states.get(b.key);
    if (!st) return;
    if (st.active) activeCount = Math.max(0, activeCount - 1);
    if (st.fxHolo){ st.fxHolo.finish(); st.fxHolo = null; }
    if (st.fxCrane){ st.fxCrane.finish(); st.fxCrane = null; }
    if (actors && actors.clearWorkers) actors.clearWorkers(b);
    states.delete(b.key);
  }

  return {
    enqueue, canEnqueue, cancel, update, stateOf, forget, totals, activeCount: () => activeCount, setSupply, queuedSupply,
    priceOf: item => priceOf ? priceOf(item) : (item.cost || 0),
    timeOf: item => timeOf ? timeOf(item) : item.time,
    /* 存档：导出/恢复生产队列（进度按秒保留） */
    dump(){
      const out = [];
      for (const st of states.values()){
        if (!st.queue.length && !st.active) continue;
        out.push({
          key: st.key,
          progress: +st.progress.toFixed(2),
          active: !!st.active,
          queue: st.queue.map(it => it.id),
          produced: st.produced
        });
      }
      return out;
    },
    restore(data){
      if (!Array.isArray(data)) return;
      for (const entry of data){
        const st = states.get(entry.key);
        if (!st) continue;
        st.queue.length = 0;
        for (const id of entry.queue || []){
          const item = st.items.find(it => it.id === id);
          if (item){
            const lead = (st.queue.length === 0 ? (entry.progress || 0) : 0) * 1000;
            const price = priceOf ? priceOf(item) : (item.cost || 0);
            const time = timeOf ? timeOf(item) : item.time;
            st.queue.push({ ...item, cost: price, time, spent: 0, queuedAt: performance.now() - lead });
          }
        }
        st.produced = entry.produced || 0;
        if (st.queue.length){
          /* 让 update 立刻启动，并把存档里的进度接回去 */
          st._resume = Math.max(0, Math.min(entry.progress || 0, st.queue[0].time - 0.2));
        }
        emit(st);
      }
    }
  };
}
