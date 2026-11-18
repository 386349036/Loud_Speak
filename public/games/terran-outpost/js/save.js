import * as THREE from 'three';

/* 基地存档：仅手动保存，刷新后自动读档 */
export function createSave({ wallet, production, buildings, actors, airforce, combat, sentries, resources, supply, construction, doctrine, tech, camera, controls, audio, applyTime, getTimeK, setTimeK }){
  const KEY = 'terran-outpost-save-v1';

  function num(v, d){ return typeof v === 'number' && isFinite(v) ? v : d; }
  function safe(fn, d){ try { return fn(); } catch (e){ return d; } }

  function collect(){
    const data = {
      v: 1,
      ts: Date.now(),
      wallet: {
        minerals: Math.round(num(wallet && wallet.minerals, 350)),
        vespene: Math.round(num(wallet && wallet.vespene, 0))
      },
      camera: {
        pos: camera.position.toArray().map(n => +n.toFixed(2)),
        target: controls.target.toArray().map(n => +n.toFixed(2))
      },
      timeK: +num(getTimeK(), 0.0).toFixed(3),
      doctrine: safe(() => doctrine ? doctrine.dump() : null, null),
      tech: safe(() => tech ? tech.dump() : null, null),
      supply: safe(() => supply.cap, 20),
      production: safe(() => production.dump(), []),
      sentries: safe(() => sentries.dump(), []),
      construction: safe(() => construction ? construction.dump() : [], []),
      scv: safe(() => resources.scvState(), []),
      vehicles: safe(() => actors.tanks.filter(v => v.state !== 'dead').map(v => {
        const r = combat.recFor(v, 'unit');
        return {
          kind: v.kind,
          pos: [v.g.position.x, v.g.position.y, v.g.position.z].map(n => +n.toFixed(2)),
          yaw: +num(v.g.rotation.y, 0).toFixed(3),
          state: v.state, siege: !!v.siege,
          hp: Math.round(r.hp), mines: v.mineCharges | 0
        };
      }), []),
      mines: safe(() => combat.mineState(), []),
      aircraft: safe(() => airforce.list.filter(a => !a.dead).map(a => ({
        kind: a.kind,
        pos: [a.pos.x, a.pos.y !== undefined ? a.pos.y : 0, a.pos.z].map(n => +n.toFixed(2)),
        alt: +num(a.alt, 24).toFixed(2),
        state: a.state, yaw: +num(a.yaw, 0).toFixed(3),
        hp: Math.round(combat.recFor(a, 'unit').hp)
      })), []),
      stats: safe(() => { const s = combat.stats(); return { kills: s.kills, shots: s.shots, hits: s.hits }; }, null),
      audio: safe(() => audio.snapshot(), null)
    };
    return data;
  }

  function save(){
    const data = collect();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return { ok: true, data };
    } catch (e){
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  function has(){ return safe(() => !!localStorage.getItem(KEY), false); }
  function read(){
    return safe(() => {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }, null);
  }
  function clear(){ safe(() => localStorage.removeItem(KEY)); }

  function restore(data){
    if (!data) return false;
    /* 资源 */
    if (wallet && data.wallet){
      wallet.minerals = num(data.wallet.minerals, wallet.minerals);
      if (data.wallet.vespene !== undefined) wallet.vespene = num(data.wallet.vespene, wallet.vespene || 0);
    }
    /* 教条与被动科技：先恢复，后续生产/建造按新加成的价格开始 */
    if (doctrine) safe(() => doctrine.restore(data.doctrine));
    if (tech) safe(() => tech.restore(data.tech));
    /* 生产队列 */
    if (construction && Array.isArray(data.construction)) safe(() => construction.restore(data.construction));
    if (production && data.production) safe(() => production.restore(data.production));
    if (supply) safe(() => supply.setCap(num(data.supply, 20)));
    /* 栈桥哨兵：存活的站位 + 血量（老存档没有该字段时保留开局驻防） */
    if (sentries && Array.isArray(data.sentries)) safe(() => sentries.restore(data.sentries));
    /* SCV：数量 + 矿脉 + 磨损（老存档没有该字段时保留开局 3 辆） */
    if (resources && Array.isArray(data.scv)) safe(() => resources.restoreScv(data.scv));
    /* 工厂载具：数量、位置、朝向、血量、攻城状态、剩余地雷 */
    if (actors && Array.isArray(data.vehicles)) safe(() => actors.restoreVehicles(data.vehicles, combat));
    if (combat && Array.isArray(data.mines)) safe(() => combat.restoreMines(data.mines));
    /* 飞机 */
    if (airforce && Array.isArray(data.aircraft)){
      for (const a of data.aircraft){
        if (!a || !a.kind) continue;
        const already = a.kind === 'battlecruiser' && airforce.hasBattlecruiser();
        if (already) continue;
        const ac = safe(() => airforce.spawn(a.kind), null);
        if (!ac) continue;
        ac.pos.set(a.pos[0], 0, a.pos[2]);
        ac.g.position.copy(ac.pos).setY(num(a.pos[1], 0));
        ac.alt = num(a.alt, 24);
        ac.yaw = num(a.yaw, 0);
        ac.state = a.state || 'hover';
        ac.mode = 'hover';
        const rec = combat.recFor(ac, 'unit');
        rec.hp = Math.max(1, num(a.hp, rec.maxHp));
      }
    }
    /* 相机 / 光照 / 音频 */
    if (data.camera && data.camera.pos && data.camera.target){
      camera.position.fromArray(data.camera.pos);
      controls.target.fromArray(data.camera.target);
      safe(() => controls.update());
    }
    if (data.timeK !== undefined && setTimeK) safe(() => setTimeK(data.timeK));
    if (data.audio) safe(() => audio.restore(data.audio));
    return true;
  }

  function restoreIfAny(){
    const d = read();
    if (!d) return null;
    restore(d);
    return d;
  }

  return { save, restore, restoreIfAny, clear, has, read, KEY, collect };
}
