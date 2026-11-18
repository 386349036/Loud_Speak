/* 补给/人口：战斗单位与 SCV 占用补给，补给站空投补给箱提高上限。 */
export const SUPPLY_COST = {
  marine: 1, firebat: 1, medic: 1, scv: 1,
  tank: 2, vulture: 1,
  dropship: 2, viking: 2, battlecruiser: 4,
  sentry: 0
};

export function createSupply({ actors, resources, airforce }){
  const START = 20;
  const MAX = 44;
  let cap = START;

  function used(){
    let n = 0;
    for (const p of actors.people){
      if (p.state === 'hidden' || p.state === 'dead') continue;
      n += SUPPLY_COST[p.kind] ?? 1;
    }
    n += resources.harvesters.length;
    for (const v of actors.tanks){
      if (v.state === 'dead') continue;
      n += SUPPLY_COST[v.kind] ?? 1;
    }
    if (airforce){
      for (const a of airforce.list){
        if (a.dead || a.state === 'dead' || a.state === 'crash') continue;
        n += SUPPLY_COST[a.kind] ?? 2;
      }
    }
    return n;
  }

  function free(){ return Math.max(0, cap - used()); }

  function addCap(n){
    const before = cap;
    cap = Math.min(MAX, cap + n);
    return cap - before;
  }

  function setCap(n){
    cap = Math.max(START, Math.min(MAX, Math.round(n || START)));
  }

  return {
    START, MAX,
    get cap(){ return cap; },
    used, free, addCap, setCap
  };
}
