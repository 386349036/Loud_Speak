/* 任务提示：5 步 checklist，只做引导，不阻塞操作 */
const STEPS = [
  { id: 'scv',    title: '经济起步', desc: '把 SCV 补到 6 辆', need: 6 },
  { id: 'marine', title: '组建小队', desc: '训练 3 名陆战队员', need: 3 },
  { id: 'medic',  title: '战地医疗', desc: '训练 1 名医疗兵', need: 1 },
  { id: 'wave',   title: '守住前哨', desc: '击退第 1 波虫群', need: 1 },
  { id: 'viking', title: '制空权',   desc: '在星港生产 1 架维京', need: 1 }
];

export function createMissions({ resources, actors, enemies, airforce, onComplete, onAllComplete }){
  const listEl = document.getElementById('mis-list');
  const countEl = document.getElementById('mis-count');
  const footEl = document.getElementById('mis-foot');
  if (!listEl || !footEl) return { update() {}, steps: [], refresh() {} };

  const steps = STEPS.map(s => ({ ...s, done: false, value: 0 }));
  let acc = 0;
  let allDone = false;

  function countKind(kind){
    let n = 0;
    for (const p of actors.people){
      if (p.kind === kind && p.state !== 'hidden' && p.state !== 'dead') n++;
    }
    return n;
  }

  function valueOf(s){
    if (s.id === 'scv') return resources.harvesters.length;
    if (s.id === 'marine') return countKind('marine');
    if (s.id === 'medic') return countKind('medic');
    if (s.id === 'wave') return enemies.clearedWave >= 1 ? 1 : 0;
    if (s.id === 'viking') return airforce.list.some(a => a.kind === 'viking' && !a.dead) ? 1 : 0;
    return 0;
  }

  function paint(){
    const doneCount = steps.filter(s => s.done).length;
    const current = steps.find(s => !s.done);
    listEl.innerHTML = steps.map((s, i) => {
      const cls = s.done ? 'done' : (current === s ? 'cur' : '');
      const shown = Math.min(s.value, s.need);
      return `<li class="${cls}" title="${s.desc}">
        <span class="tick">${s.done ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <span class="tt">${s.title}</span>
        <span class="cnt">${shown}/${s.need}</span>
      </li>`;
    }).join('');
    if (countEl) countEl.textContent = doneCount + '/' + steps.length;
    footEl.textContent = allDone
      ? '前哨站已站稳 · 自由发展'
      : (current ? '当前：' + current.desc : '');
    footEl.classList.toggle('done', allDone);
  }

  function tick(){
    for (const s of steps){
      s.value = valueOf(s);
      if (!s.done && s.value >= s.need){
        s.done = true;
        if (onComplete) onComplete(s);
      }
    }
    const finished = steps.every(s => s.done);
    if (finished && !allDone){
      allDone = true;
      if (onAllComplete) onAllComplete();
    }
    paint();
  }

  function update(dt){
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    tick();
  }

  for (const s of steps) s.value = valueOf(s);
  paint();

  return { update, refresh: tick, steps, get allDone(){ return allDone; } };
}
