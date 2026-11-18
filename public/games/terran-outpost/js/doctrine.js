/* 开局教条（Doctrine）：三选一、整局锁定、纯被动加成。
   只修改造价/工期/采集/维修，不增加任何主动按键。 */

export const DOCTRINES = {
  fortress: {
    id: 'fortress', name: '要塞', en: 'FORTRESS', accent: '#7fd7ff',
    tag: '工事 · 维修', short: '防御工事更便宜，维修平台效率更高',
    desc: '地堡与导弹塔建造费 -20%；维修平台修复速度 +30%。',
    buildCost(type, cost){ return (type === 'bunker' || type === 'turret') ? Math.round(cost * 0.8) : cost; },
    repairMult: 1.3
  },
  mechanized: {
    id: 'mechanized', name: '机械化', en: 'MECHANIZED', accent: '#ffb454',
    tag: '载具 · 量产', short: '坦克与秃鹰更便宜、造得更快',
    desc: '工厂载具生产费 -15%、生产时间 -10%；维修平台修复速度 +15%。',
    itemCost(item, cost){ return item && (item.id === 'tank' || item.id === 'vulture') ? Math.round(cost * 0.85) : cost; },
    itemTime(item, time){ return item && (item.id === 'tank' || item.id === 'vulture') ? +(time * 0.9).toFixed(1) : time; },
    repairMult: 1.15
  },
  expedition: {
    id: 'expedition', name: '远征', en: 'EXPEDITION', accent: '#7dffb0',
    tag: '经济 · 扩张', short: '采集更快，建筑工期更短',
    desc: 'SCV 采集效率 +12%；所有建筑建造时间 -10%。',
    harvestMult: 1.12,
    buildTime(type, time){ return +(time * 0.9).toFixed(1); },
    repairMult: 1.0
  }
};

export function createDoctrine(){
  let id = null;

  const api = {
    get id(){ return id; },
    get data(){ return id ? DOCTRINES[id] : null; },
    get chosen(){ return !!id; },
    choose(next){
      if (!DOCTRINES[next] || id) return false;
      id = next;
      return true;
    },
    /* 读档用：允许覆盖，但仍只接受合法 id */
    restore(next){
      if (!next || !DOCTRINES[next]) return false;
      id = next;
      return true;
    },
    reset(){ id = null; },
    buildCost(type, cost){ return api.data && api.data.buildCost ? api.data.buildCost(type, cost) : cost; },
    buildTime(type, time){ return api.data && api.data.buildTime ? api.data.buildTime(type, time) : time; },
    itemCost(item, cost){ return api.data && api.data.itemCost ? api.data.itemCost(item, cost) : cost; },
    itemTime(item, time){ return api.data && api.data.itemTime ? api.data.itemTime(item, time) : time; },
    harvestMult(){ return api.data && api.data.harvestMult ? api.data.harvestMult : 1; },
    repairMult(){ return api.data && api.data.repairMult ? api.data.repairMult : 1; },
    dump(){ return id; }
  };
  return api;
}
