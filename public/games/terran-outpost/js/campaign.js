/* 战役：关卡选择、关卡加载与目标判定。自由模式不创建 campaign。 */
import { LEVELS, getLevel, nextLevel } from './levels.js';
import { removeExtraObstacle } from './nav.js';

const KEY = 'terran-campaign-v1';

export function loadCampaign(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { completed: [] };
    const v = JSON.parse(raw);
    return { completed: Array.isArray(v.completed) ? v.completed : [] };
  } catch (e){
    return { completed: [] };
  }
}

export function saveCampaign(p){
  try { localStorage.setItem(KEY, JSON.stringify({ completed: p.completed || [] })); } catch (e) {}
}

function unlocked(level, p){
  const i = LEVELS.indexOf(level);
  if (i <= 0) return true;
  return p.completed.includes(LEVELS[i - 1].id);
}

/* 全屏关卡选择：选完写 URL 并重载，避免在已建好的场景上做半套 reset。 */
export function mountLevelPicker(){
  const params = new URLSearchParams(location.search);
  if (params.get('level') || params.get('free')) return;
  if (document.getElementById('campaign-pick')) return;
  const progress = loadCampaign();
  const el = document.createElement('div');
  el.id = 'campaign-pick';
  el.innerHTML = `
    <style>
      #campaign-pick{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 50% 20%,rgba(20,52,68,.98),rgba(4,10,14,.99) 70%);
        color:#d8eef5;font-family:"Microsoft YaHei",sans-serif;overflow:auto}
      #campaign-pick .wrap{width:min(1060px,92vw);padding:32px 0}
      #campaign-pick .kicker{font:600 11px/1.4 Consolas,monospace;letter-spacing:.22em;color:#5fe0ff}
      #campaign-pick h1{font-size:32px;letter-spacing:.08em;margin:10px 0 4px;font-weight:600}
      #campaign-pick .sub{color:#7897a4;font-size:13px;margin-bottom:24px}
      #campaign-pick .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      #campaign-pick .card{border:1px solid rgba(95,224,255,.3);background:linear-gradient(160deg,rgba(18,42,54,.92),rgba(8,18,24,.95));
        padding:18px;text-align:left;color:inherit;cursor:pointer;position:relative;min-height:208px}
      #campaign-pick .card:hover:not(:disabled){border-color:#5fe0ff;box-shadow:0 0 0 1px rgba(95,224,255,.35),0 10px 30px rgba(0,0,0,.35)}
      #campaign-pick .card:disabled{opacity:.42;cursor:not-allowed}
      #campaign-pick .num{font:600 11px/1 Consolas,monospace;color:#ffa63a;letter-spacing:.18em}
      #campaign-pick .name{font-size:24px;margin:12px 0 2px}
      #campaign-pick .en{font:10px/1.4 Consolas,monospace;letter-spacing:.2em;color:#5fe0ff;margin-bottom:12px}
      #campaign-pick .desc{font-size:12px;line-height:1.8;color:#9db8c2;min-height:62px}
      #campaign-pick .goal{margin-top:14px;padding-top:10px;border-top:1px solid rgba(95,224,255,.16);
        font-size:11px;color:#ffc46b}
      #campaign-pick .lock{position:absolute;right:14px;top:16px;font-size:10px;color:#6d8993}
      #campaign-pick .free{margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;
        border-top:1px solid rgba(95,224,255,.14);padding-top:16px}
      #campaign-pick .free button{background:none;border:1px solid rgba(95,224,255,.4);color:#9fd8e6;
        padding:9px 16px;cursor:pointer;font-size:12px;letter-spacing:.08em}
      #campaign-pick .free button:hover{border-color:#5fe0ff;color:#fff}
      @media(max-width:760px){#campaign-pick .cards{grid-template-columns:1fr}#campaign-pick h1{font-size:24px}}
    </style>
    <div class="wrap">
      <div class="kicker">TERRAN OUTPOST // CAMPAIGN</div>
      <h1>泰伦前哨基地 · 战役</h1>
      <div class="sub">选择关卡。完成当前关卡后解锁下一关。</div>
      <div class="cards"></div>
      <div class="free"><span>只想自由发展？</span><button id="camp-free">进入自由模式</button></div>
    </div>`;
  document.body.appendChild(el);
  const cards = el.querySelector('.cards');
  for (const level of LEVELS){
    const ok = unlocked(level, progress);
    const done = progress.completed.includes(level.id);
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.disabled = !ok;
    btn.innerHTML = `<div class="num">MISSION ${String(level.index).padStart(2,'0')}</div>
      <div class="name">${level.name}</div><div class="en">${level.en}</div>
      <div class="desc">${level.brief}</div>
      <div class="goal">${done ? '已完成' : level.objectiveText}</div>
      ${ok ? '' : '<div class="lock">完成上一关解锁</div>'}`;
    btn.addEventListener('click', () => {
      const u = new URL(location.href);
      u.searchParams.set('level', level.id);
      u.searchParams.delete('free');
      location.href = u.href;
    });
    cards.appendChild(btn);
  }
  el.querySelector('#camp-free').addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.delete('level');
    u.searchParams.set('free', '1');
    location.href = u.href;
  });
  window.__PAUSED__ = true;
}

export function createCampaign({ level, wallet, enemies, hive, buildings, victory, toast }){
  let finished = false;
  let hudT = 0;

  function countBarracks(){
    return buildings.filter(b => !b.destroyed && (
      b.type === 'barracks' || (b.key && b.key.startsWith('barracks'))
    )).length;
  }

  function nestsDead(){
    return enemies.nests.filter(n => n.dead).length;
  }

  function apply(){
    if (level.start && Number.isFinite(level.start.minerals)){
      wallet.minerals = level.start.minerals;
    }
    if (Number.isFinite(level.waves) && enemies.setWaveLimit){
      enemies.setWaveLimit(level.waves);
    }
    if (level.hive === false && hive){
      hive.dead = true;
      hive.shielded = true;
      if (hive.g){
        hive.g.visible = false;
        removeExtraObstacle(hive.g.position);
      }
    }
    if (level.hive === 'shielded' && hive){
      hive.shielded = true;
      hive.awake = false;
    }
    if (level.nests === false){
      for (const n of enemies.nests){
        n.dead = true;
        n.hp = 0;
        if (n.g) n.g.visible = false;
      }
    }
    victory.setAuto(false);
    window.__CAMPAIGN_ACTIVE__ = true;
    window.__CAMPAIGN_LEVEL__ = level.id;
    if (toast) toast('关卡 · ' + level.name + ' — ' + level.objectiveText);
    updateHud(true);
  }

  function updateHud(force){
    if (!force && hudT > 0) return;
    hudT = 0.2;
    const el = document.getElementById('obj-progress');
    if (!el) return;
    if (level.objective === 'surviveWaves'){
      const cleared = Math.min(level.surviveWaves, enemies.clearedWave);
      const bar = Math.min(level.barracks, countBarracks());
      el.textContent = `守住 ${level.surviveWaves} 波 · ${cleared}/${level.surviveWaves} · 兵营 ${bar}/${level.barracks}`;
    } else if (level.objective === 'nests'){
      el.textContent = `摧毁子巢 · ${Math.min(level.nestsNeeded, nestsDead())}/${level.nestsNeeded}`;
    } else {
      const hp = hive ? Math.max(0, Math.round(hive.hp / hive.maxHp * 100)) : 0;
      el.textContent = `摧毁主巢 · ${hp}%`;
    }
  }

  function complete(){
    if (finished) return;
    finished = true;
    const p = loadCampaign();
    if (!p.completed.includes(level.id)){
      p.completed.push(level.id);
      saveCampaign(p);
    }
    const next = nextLevel(level.id);
    window.__CAMPAIGN_NEXT__ = next ? next.id : null;
    const el = document.getElementById('obj-progress');
    if (el) el.textContent = '关卡完成 · ' + level.name;
    if (toast) toast('关卡完成 · ' + level.name);
    victory.win({
      kicker: 'MISSION COMPLETE',
      title: level.name + ' · 完成',
      subtitle: level.outro
    });
  }

  function update(dt){
    if (finished) return;
    hudT = Math.max(0, hudT - dt);
    updateHud(false);
    const ok = level.objective === 'surviveWaves'
      ? enemies.clearedWave >= level.surviveWaves && countBarracks() >= level.barracks
      : level.objective === 'nests'
        ? nestsDead() >= level.nestsNeeded
        : !!(hive && hive.dead);
    if (ok) complete();
  }

  return {
    level, apply, update,
    get finished(){ return finished; },
    get progress(){
      return { cleared: enemies.clearedWave, barracks: countBarracks(), nests: nestsDead(), hiveHp: hive ? hive.hp : 0 };
    }
  };
}
