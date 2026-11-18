/* 单位指挥层：框选、单选、编队、右键移动、集结点联动 */
import * as THREE from 'three';
import { clamp, rand } from './core.js';
import { UNIT_TYPES } from './units.js';
import { createGroundNav } from './nav.js';

const UNIT_COLORS = {
  marine: 0x63d6ff,
  firebat: 0xff9a4a,
  medic: 0x7fe0c6,
  scv: 0x8fe0a8,
  tank: 0xffb454,
  vulture: 0xffd36a,
  dropship: 0x9fd8ff,
  viking: 0xa8b8ff
};
const INFANTRY = new Set(['marine', 'firebat', 'medic']);
const AIR = new Set(['dropship', 'viking', 'battlecruiser']);

export function createCommands({
  camera, renderer, world, buildings, actors, resources, enemies, airforce, combat, audio, onState, onAbility
}){
  const dom = renderer.domElement;
  const nav = createGroundNav(buildings);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.05);

  let selected = [];          // [{ unit, kind }]
  const groups = new Map();   // 1..9 -> [{unit,kind}]
  let marquee = null;         // {x0,y0,x1,y1}
  let consumed = false;
  let attackArmed = false;

  function setAttackArmed(on){
    attackArmed = !!on;
    dom.style.cursor = attackArmed ? 'crosshair' : '';
    document.body.classList.toggle('attack-armed', attackArmed);
    if (attackArmed && audio) audio.click();
  }

  /* ------------------------------------------------ 选中圈 --- */
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8ce8ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false
  });
  const ringGeo = new THREE.RingGeometry(1.5, 1.85, 28);
  const rings = [];
  function ringAt(i){
    if (!rings[i]){
      const m = new THREE.Mesh(ringGeo, ringMat.clone());
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 3;
      world.add(m);
      rings[i] = m;
    }
    return rings[i];
  }

  /* --------------------------------------------- 移动标记 --- */
  const markGeo = new THREE.RingGeometry(1.0, 1.35, 32);
  const marks = [];
  function spawnMark(p, color = 0x6fe0ff){
    let m = marks.find(x => x.life <= 0);
    if (!m){
      const mesh = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false
      }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 4;
      world.add(mesh);
      m = { mesh, life: 0, max: 1 };
      marks.push(m);
    }
    m.mesh.position.set(p.x, 0.09, p.z);
    m.mesh.material.color.setHex(color);
    m.life = 1.0;
    m.max = 1.0;
    m.mesh.visible = true;
  }

  /* ------------------------------------------------ 单位注册 --- */
  function registerUnits(){
    for (const p of actors.people){
      const kind = p.kind || 'marine';
      const ud = p.g.userData.unit;
      if (!ud) p.g.userData.unit = { unit: p, kind };
      else if (!ud.unit){ ud.unit = p; ud.kind = kind; }
      else ud.kind = kind;
    }
    for (const tk of actors.tanks){
      const kind = tk.kind || 'tank';
      if (!tk.g.userData.unit) tk.g.userData.unit = { unit: tk, kind };
      else { tk.g.userData.unit.unit = tk; tk.g.userData.unit.kind = kind; }
    }
    for (const h of resources.harvesters){
      if (!h.g.userData.unit) h.g.userData.unit = { unit: h, kind: 'scv' };
    }
    if (airforce){
      for (const a of airforce.list){
        const kind = a.kind === 'viking' ? 'viking'
          : a.kind === 'battlecruiser' ? 'battlecruiser' : 'dropship';
        if (!a.g.userData.unit) a.g.userData.unit = { unit: a, kind };
      }
    }
  }
  registerUnits();

  function pickables(){
    registerUnits();
    const arr = [];
    for (const p of actors.people) if (p.g.visible) arr.push(p.g);
    for (const tk of actors.tanks) if (tk.state !== 'dead' && tk.g.visible) arr.push(tk.g);
    /* SCV 完全交给自己的采集逻辑：不参与框选，也不参与单击选中 */
    if (airforce) for (const a of airforce.list) arr.push(a.g);
    return arr;
  }

  function unitOf(obj){
    let o = obj;
    while (o){
      if (o.userData && o.userData.unit) return o.userData.unit;
      o = o.parent;
    }
    return null;
  }

  function screenOf(g){
    const v = new THREE.Vector3();
    g.getWorldPosition(v);
    v.y += kindHeight(g);
    v.project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * dom.clientWidth,
      y: (-v.y * 0.5 + 0.5) * dom.clientHeight,
      z: v.z
    };
  }
  function kindHeight(g){
    const u = g.userData.unit;
    if (!u) return 1.6;
    return u.kind === 'tank' ? 1.6 : u.kind === 'vulture' ? 1.5 : u.kind === 'scv' ? 1.9 : 1.9;
  }

  /* ------------------------------------------------ 选择逻辑 --- */
  function setSelection(list){
    selected = list;
    for (let i = 0; i < rings.length; i++) rings[i].visible = false;
    list.forEach((s, i) => {
      const r = ringAt(i);
      r.visible = true;
      r.material.color.setHex(UNIT_COLORS[s.kind] || 0x8ce8ff);
      const k = s.kind === 'tank' ? 2.6 : s.kind === 'vulture' ? 1.8 : s.kind === 'scv' ? 1.25 : 1;
      r.scale.setScalar(k);
    });
    if (onState) onState(describe());
    if (audio && list.length) audio.click();
  }

  function describe(){
    if (!selected.length) return { count: 0, chips: [] };
    const by = new Map();
    for (const s of selected){
      const k = s.kind;
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(s);
    }
    const chips = [...by.entries()].map(([kind, arr]) => ({
      kind,
      label: UNIT_TYPES[kind] ? UNIT_TYPES[kind].name
        : kind === 'scv' ? 'SCV 工兵'
        : kind === 'tank' ? '攻城坦克'
        : kind === 'dropship' ? '运输舰'
        : kind === 'viking' ? '维京战机' : '单位',
      count: arr.length
    }));
    return { count: selected.length, chips };
  }

  function clearSelection(){ setSelection([]); }

  /* 单位消失（如 SCV 报废）时，把它从当前选中和编队里清掉 */
  function forget(unit){
    if (!unit) return;
    const next = selected.filter(s => s.unit !== unit);
    if (next.length !== selected.length) setSelection(next);
    for (const [n, arr] of groups){
      const left = arr.filter(s => s.unit !== unit);
      if (left.length) groups.set(n, left);
      else groups.delete(n);
    }
  }

  function selectUnitAt(ev){
    const rect = dom.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables(), true);
    for (const h of hits){
      const u = unitOf(h.object);
      if (u) return u;
    }
    /* 细长模型容易点空：用屏幕距离兜底 */
    let best = null, bestD = 28;
    for (const g of pickables()){
      const s = screenOf(g);
      const d = Math.hypot(s.x - ev.clientX, s.y - ev.clientY);
      if (d < bestD){ bestD = d; best = g.userData.unit; }
    }
    return best || null;
  }

  /* ------------------------------------------------ 编队 --- */
  function assignGroup(n){
    if (!selected.length) return;
    groups.set(n, selected.slice());
    if (audio) audio.ack();
    if (onState) onState(describe());
  }

  function recallGroup(n){
    const g = groups.get(n);
    if (!g || !g.length) return false;
    setSelection(g.filter(s => s.unit && s.unit.g && s.unit.g.visible !== false).slice());
    if (audio) audio.ack();
    return true;
  }

  /* ------------------------------------------------ 移动 --- */
  const groundPoint = (ev) => {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, p)) return null;
    if (Math.hypot(p.x, p.z) > 146) return null;
    p.y = 0;
    return p;
  };

  function formation(target, n, list){
    /* 按兵种分层：火焰兵在前（rank 0）、陆战居中（1）、医疗在后（2） */
    const slots = [];
    const offset = new THREE.Vector3();
    camera.getWorldDirection(offset);
    offset.y = 0;
    if (offset.lengthSq() < 1e-4) offset.set(0, 0, 1);
    offset.normalize();                     /* 相机朝向 = “前方” */
    const right = new THREE.Vector3(-offset.z, 0, offset.x);

    const groups = new Map();
    for (const s of list){
      const type = UNIT_TYPES[s.kind];
      const rank = type ? type.rank : 1;
      const gap = type ? type.gap : 3.9;
      if (!groups.has(rank)) groups.set(rank, { gap, items: [] });
      groups.get(rank).items.push(s);
    }
    const ranks = [...groups.keys()].sort((a, b) => a - b);
    let depth = 0;
    for (const rank of ranks){
      const { gap, items } = groups.get(rank);
      const perRow = Math.max(1, Math.ceil(Math.sqrt(items.length)));
      const rows = Math.ceil(items.length / perRow);
      for (let i = 0; i < items.length; i++){
        const r = Math.floor(i / perRow);
        const c = i % perRow;
        const rowCount = Math.min(perRow, items.length - r * perRow);
        const ox = (c - (rowCount - 1) / 2) * gap;
        const oz = depth + r * gap;         /* 后排离目标更远 */
        const p = new THREE.Vector3(target.x, 0, target.z)
          .addScaledVector(offset, -oz)
          .addScaledVector(right, ox);
        slots.push({ pos: p, s: items[i] });
      }
      depth += rows * gap + gap * 0.35;
    }
    return slots;
  }

  function moveSelection(target, opts){
    if (!selected.length || !target) return;
    const attack = !!(opts && opts.attack);
    /* 普通移动会清掉攻击移动状态 */
    for (const s of selected){
      s.unit.attackMove = attack;
      s.unit.attackTarget = null;
    }
    const slots = formation(target, selected.length, selected);
    /* 同兵种内部就近分配，避免抢占其它兵种的位置（分层才不会乱） */
    const byKind = new Map();
    for (const slot of slots){
      const k = slot.s.kind;
      if (!byKind.has(k)) byKind.set(k, []);
      byKind.get(k).push(slot.pos);
    }
    for (const s of selected){
      let free = byKind.get(s.kind) || [];
      if (!free.length){
        for (const arr of byKind.values()) if (arr.length){ free = arr; break; }
      }
      if (!free.length) continue;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < free.length; i++){
        const d = s.unit.g.position.distanceToSquared(free[i]);
        if (d < bestD){ bestD = d; best = i; }
      }
      const slot = free.splice(best, 1)[0];
      commandOne(s, slot);
    }
    spawnMark(target, attack ? 0xff8a4a : 0x6fe0ff);
    if (audio) audio.ack(target);
  }

  /* 指定某个敌人：全军压上去打它 */
  function focusAttack(enemy){
    if (!selected.length || !enemy) return;
    let i = 0;
    for (const s of selected){
      const u = s.unit;
      u.attackTarget = enemy;
      u.attackMove = true;
      if (INFANTRY.has(s.kind)){
        const a = (i / Math.max(1, selected.length)) * Math.PI * 2;
        const stand = enemy.isHive ? (enemy.radius || 16) + 3
          : enemy.isNest ? (enemy.radius || 5.4) + 2.5 : 2.6;
        const slot = enemy.g.position.clone().add(
          new THREE.Vector3(Math.cos(a) * stand, 0, Math.sin(a) * stand));
        u.state = 'cmd';
        u.cmdPath = [u.g.position.clone(), slot];
        u.cmdSeg = 0;
        u.cmdT = 0;
        u.guard = false;
        u.g.visible = true;
        u.g.scale.setScalar(u.s || 1);
      } else if (s.kind === 'tank' || s.kind === 'vulture'){
        if (s.kind === 'tank' && u.siege && combat) combat.toggleSiege(u);
        u.state = 'drive';
        u.goal = enemy.g.position.clone();
        u.attackTarget = enemy;
        u.attackMove = true;
        u.autoDrive = false;
      } else if (AIR.has(s.kind) && airforce){
        u.attackTarget = enemy;
        u.attackMove = true;
        u.target.set(enemy.g.position.x, 0, enemy.g.position.z);
        u.mode = 'goto';
        if (u.state === 'parked' || u.state === 'climb') airforce.takeOff(u);
      }
      i++;
    }
    spawnMark(enemy.g.position, 0xff6a3a);
    if (audio) audio.ack(enemy.g.position);
  }

  function enemyUnder(ev){
    if (!enemies || !enemies.list) return null;
    const rect = dom.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const live = enemies.list.filter(e => !e.dead && e.g.visible);
    const hits = raycaster.intersectObjects(live.map(e => e.g), true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o){
      const e = live.find(x => x.g === o);
      if (e) return e;
      o = o.parent;
    }
    return null;
  }

  function commandOne(s, slot){
    const u = s.unit;
    if (AIR.has(s.kind) && airforce){
      airforce.orderFly(u, slot);
    } else if (INFANTRY.has(s.kind)){
      u.state = 'cmd';
      u.cmdPath = [u.g.position.clone(), slot.clone()];
      u.cmdSeg = 0;
      u.cmdT = 0;
      u.guard = false;
      u.g.visible = true;
      u.g.scale.setScalar(u.s || 1);
    } else if (s.kind === 'tank' || s.kind === 'vulture'){
      if (s.kind === 'tank' && u.siege && combat) combat.toggleSiege(u);  /* 先收腿，2 秒后再走 */
      u.state = 'drive';
      u.goal = slot.clone();
      u.autoDrive = false;
    } else if (s.kind === 'scv'){
      u.mode = 'manual';
      u.cmdGoal = slot.clone();
      u.state = 'manual';
      u.pos.copy(u.g.position);
      u.pos.y = 0.55;
    }
  }

  function stopSelection(){
    for (const s of selected){
      const u = s.unit;
      if (INFANTRY.has(s.kind)){
        if (u.state === 'cmd'){
          u.state = 'guard';
          u.wait = rand(18, 30);
        }
      } else if (s.kind === 'tank' || s.kind === 'vulture'){
        if (u.state === 'drive') u.state = 'park';
        u.goal = null;
        u.attackTarget = null;
        u.attackMove = false;
        u.autoDrive = false;
      } else if (s.kind === 'scv'){
        if (u.mode === 'manual') u.mode = 'auto';
      }
    }
    if (audio) audio.click();
  }

  /* ------------------------------------------------ 框选 --- */
  let downPos = null;
  let boxing = false;

  function onDown(ev){
    if (window.__PAGE__ && (window.__PAGE__.mode !== 'game' || window.__PAUSED__)) return;
    if (ev.button === 2) return;
    consumed = false;
    if (ev.button !== 0) return;
    /* 建筑集结点待确认：这一次左键交给 main.js 落点，不要再选单位/框选 */
    if (window.__RALLY_ARMED__ && ev.target === dom) return;
    /* 只处理画布上的按下：HUD 面板 / 滑杆 / 按钮上的拖拽不能触发框选 */
    if (ev.target !== dom) return;

    /* A 键攻击移动：下一次左键 = 攻击移动目标（点敌人＝指定目标） */
    if (attackArmed){
      if (!selected.length){ setAttackArmed(false); return; }
      const foe = enemyUnder(ev);
      if (foe) focusAttack(foe);
      else {
        const p = groundPoint(ev);
        if (p) moveSelection(p, { attack: true });
      }
      setAttackArmed(false);
      consumed = true;
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    downPos = { x: ev.clientX, y: ev.clientY };
    boxing = false;
    /* 点在建筑上：交给 main.js 处理建筑选择 */
    const rect = dom.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const bHits = raycaster.intersectObjects(buildings.map(b => b.group), true);
    const u = selectUnitAt(ev);
    if (u){
      setSelection([u]);
      consumed = true;
      ev.stopPropagation();
      return;
    }
    if (bHits.length) return;            // 点中建筑
    /* 空地：开始框选 */
    marquee = { x0: ev.clientX, y0: ev.clientY, x1: ev.clientX, y1: ev.clientY };
    ev.stopPropagation();
    ev.preventDefault();
  }

  function onMove(ev){
    if (!marquee) return;
    marquee.x1 = ev.clientX;
    marquee.y1 = ev.clientY;
    const dx = marquee.x1 - marquee.x0;
    const dy = marquee.y1 - marquee.y0;
    if (!boxing && dx * dx + dy * dy > 64) boxing = true;
    if (boxing){
      const el = document.getElementById('marquee');
      if (el){
        el.style.display = 'block';
        el.style.left = Math.min(marquee.x0, marquee.x1) + 'px';
        el.style.top = Math.min(marquee.y0, marquee.y1) + 'px';
        el.style.width = Math.abs(dx) + 'px';
        el.style.height = Math.abs(dy) + 'px';
      }
    }
    ev.stopPropagation();
  }

  function onUp(ev){
    if (!marquee) return;
    const m = marquee;
    marquee = null;
    const el = document.getElementById('marquee');
    if (el) el.style.display = 'none';
    const dx = m.x1 - m.x0, dy = m.y1 - m.y0;
    const dist = Math.hypot(dx, dy);
    const rect = (x0, y0, x1, y1) => ({
      l: Math.min(x0, x1), r: Math.max(x0, x1),
      t: Math.min(y0, y1), b: Math.max(y0, y1)
    });
    const box = rect(m.x0, m.y0, m.x1, m.y1);

    if (dist > 8){
      registerUnits();
      const picked = [];
      const groupsSeen = new Set();
      const cands = [
        ...actors.people.filter(p => p.g.visible).map(p => ({ g: p.g, kind: p.kind || 'marine' })),
        ...actors.tanks.filter(t => t.state !== 'dead' && t.g.visible)
          .map(t => ({ g: t.g, kind: t.kind || 'tank' })),
        ...(airforce ? airforce.list
          .filter(a => !a.dead && a.state !== 'dead' && a.g && a.g.visible)
          .map(a => ({ g: a.g })) : [])
      ];
      for (const c of cands){
        const s = screenOf(c.g);
        if (s.x < box.l || s.x > box.r || s.y < box.t || s.y > box.b) continue;
        const key = c.g.uuid;
        if (groupsSeen.has(key)) continue;
        groupsSeen.add(key);
        const d = c.g.userData.unit;
        if (d) picked.push(d);
      }
      setSelection(picked);
      consumed = true;
      ev.stopPropagation();
      return;
    }

    /* 单击：单位优先，否则清空（建筑由 main.js 处理） */
    const u = selectUnitAt(ev);
    if (u){
      setSelection([u]);
      consumed = true;
      ev.stopPropagation();
      return;
    }
    if (selected.length){
      setSelection([]);
      consumed = true;
      ev.stopPropagation();
    }
  }

  function onContext(ev){
    if (window.__PAGE__ && (window.__PAGE__.mode !== 'game' || window.__PAUSED__)) return;
    if (!selected.length) return;      // 没有单位：交给建筑/集结点逻辑

    /* 右键自己的地堡：最多进驻 4 名步兵（含玩家新建地堡） */
    const bunkers = buildings.filter(b => b.key === 'bunker' || b.type === 'bunker');
    if (bunkers.length && actors.bunkerLoad && selected.some(s => INFANTRY.has(s.kind))){
      const rect = dom.getBoundingClientRect();
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      for (const bunker of bunkers){
        const hits = raycaster.intersectObject(bunker.group, true);
        if (!hits.length) continue;
        const troops = selected.filter(s => INFANTRY.has(s.kind)).map(s => s.unit);
        const loaded = actors.bunkerLoad(bunker, troops);
        for (const u of loaded) forget(u);
        if (loaded.length && onAbility) onAbility(`步兵进驻地堡 · ${bunker.garrison.length}/4`);
        else if (onAbility) onAbility('地堡驻军已满（4/4） · 按 U 卸载');
        spawnMark(bunker.center, 0x63d6ff);
        if (audio) (loaded.length ? audio.ack(bunker.center) : audio.error());
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
    }

    const p = groundPoint(ev);

    /* 右键点自己的运输舰：选中步兵登机 */
    if (airforce){
      const rect = dom.getBoundingClientRect();
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const ships = airforce.list.filter(a => a.kind === 'dropship' && !a.dead);
      const hits = ships.length ? raycaster.intersectObjects(ships.map(a => a.g), true) : [];
      if (hits.length){
        let o = hits[0].object, ship = null;
        while (o){ ship = ships.find(a => a.g === o) || ship; o = o.parent; }
        const troops = selected.filter(s => INFANTRY.has(s.kind)).map(s => s.unit);
        if (ship && troops.length){
          ev.preventDefault();
          ev.stopPropagation();
          airforce.board(troops, ship);
          spawnMark(ship.pos, 0x8ce8ff);
          return;
        }
        if (ship && selected.some(s => s.unit === ship)){
          ev.preventDefault();
          ev.stopPropagation();
          airforce.orderLand(ship);      // 右键点自己：降落
          return;
        }
      }
    }

    /* 右键点敌人 = 集火；点主巢/子巢时直接压上去拆 */
    const foe = enemyUnder(ev);
    if (!p && !foe) return;
    if (foe){
      ev.preventDefault();
      ev.stopPropagation();
      focusAttack(foe);
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    /* 右键 = 飞行/移动；带人的运输舰默认也只是飞过去滞空，投送要显式下指令（T 或 Ctrl+右键） */
    const airs = selected.filter(s => AIR.has(s.kind));
    let dropped = 0;
    for (const s of airs){
      const a = s.unit;
      if (ev.ctrlKey && s.kind === 'dropship' && a.cargo && a.cargo.length){
        if (airforce.orderUnloadAt(a, p)) dropped++;
      } else {
        airforce.orderFly(a, p);
      }
    }
    const rest = selected.filter(s => !AIR.has(s.kind));
    if (rest.length) moveSelection(p);
    else if (airs.length) spawnMark(p, dropped ? 0xff8a4a : 0x9fd8ff);
  }

  function onKey(ev){
    if (window.__PAGE__ && (window.__PAGE__.mode !== 'game' || window.__PAUSED__)) return;
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const n = Number(ev.key);
    if (ev.ctrlKey && n >= 1 && n <= 9){
      ev.preventDefault(); ev.stopImmediatePropagation();
      assignGroup(n);
      return;
    }
    if (!ev.ctrlKey && n >= 1 && n <= 9){
      if (recallGroup(n)){ ev.preventDefault(); ev.stopImmediatePropagation(); }
      return;
    }
    if (ev.key === 'a' || ev.key === 'A'){
      if (selected.length && !ev.ctrlKey && !ev.metaKey){
        ev.preventDefault(); ev.stopImmediatePropagation();
        setAttackArmed(true);
      }
      return;
    }
    if (ev.key === 'g' || ev.key === 'G'){
      const ships = selected.filter(s => s.kind === 'dropship');
      if (ships.length && airforce){
        ev.stopImmediatePropagation();
        let n = 0;
        for (const s of ships) n += airforce.load(s.unit);
        if (!n && audio) audio.error();
      }
      return;
    }
    if (ev.key === 't' || ev.key === 'T'){
      const ships = selected.filter(s => s.kind === 'dropship');
      if (ships.length && airforce){
        ev.stopImmediatePropagation();
        let n = 0;
        for (const s of ships){
          const a = s.unit;
          if (!a.cargo || !a.cargo.length) continue;
          /* 在当前位置下降投送（降到 5 米再放人），保持滞空能力 */
          if (airforce.orderUnloadAt(a, a.pos)) n += a.cargo.length;
        }
        if (!n && audio) audio.error();
      }
      return;
    }
    if (ev.key === 'e' || ev.key === 'E'){
      const tanks = selected.filter(s => s.kind === 'tank');
      if (tanks.length && combat){
        ev.stopImmediatePropagation();
        let n = 0;
        for (const s of tanks) if (combat.toggleSiege(s.unit) !== null) n++;
        if (n){ if (audio) audio.ack(tanks[0].unit.g.position); if (onAbility) onAbility(tanks[0].unit.siege ? '攻城模式展开' : '攻城模式收起'); }
        else if (audio) audio.error();
      }
      return;
    }
    if (ev.key === 'm' || ev.key === 'M'){
      const vults = selected.filter(s => s.kind === 'vulture');
      if (vults.length && combat){
        ev.stopImmediatePropagation();
        let n = 0;
        for (const s of vults) if (combat.layMine(s.unit)) n++;
        if (n){ if (audio) audio.ack(vults[0].unit.g.position); if (onAbility) onAbility('蜘蛛雷已布设 · 剩余 ' + vults[0].unit.mineCharges); }
        else if (audio) audio.error();
      }
      return;
    }
    if (ev.key === 'h' || ev.key === 'H'){
      const airs = selected.filter(s => AIR.has(s.kind));
      if (airs.length && airforce){
        ev.stopImmediatePropagation();
        let ok = 0;
        for (const s of airs) if (airforce.orderLand(s.unit)) ok++;
        if (!ok && audio) audio.error();
      }
      return;
    }
    if (ev.key === 'p' || ev.key === 'P'){
      const bc = selected.filter(s => s.kind === 'battlecruiser');
      if (bc.length && airforce){
        ev.stopImmediatePropagation();
        for (const s of bc) airforce.setPatrol(s.unit, !s.unit.patrol);
        if (audio) audio.ack(bc[0].unit.pos);
      }
      return;
    }
    if (ev.key === 's' || ev.key === 'S'){
      if (selected.length){ ev.stopImmediatePropagation(); stopSelection(); }
    }
    if (ev.key === 'Escape'){
      if (attackArmed){ ev.stopImmediatePropagation(); setAttackArmed(false); return; }
      if (selected.length){ ev.stopImmediatePropagation(); clearSelection(); }
    }
  }

  addEventListener('pointerdown', onDown, true);
  addEventListener('pointermove', onMove, true);
  addEventListener('pointerup', onUp, true);
  addEventListener('contextmenu', onContext, true);
  addEventListener('keydown', onKey, true);

  /* ------------------------------------------------ 每帧 --- */
  const tmpV = new THREE.Vector3();

  function update(dt, t){
    /* 选中圈跟随 */
    let i = 0;
    for (const s of selected){
      const r = rings[i++];
      if (!r) continue;
      const g = s.unit.g;
      if (!g || !g.visible){ r.visible = false; continue; }
      g.getWorldPosition(tmpV);
      r.position.set(tmpV.x, 0.08, tmpV.z);
      const base = s.kind === 'tank' ? 2.3 : s.kind === 'scv' ? 1.1 : 0.95;
      const pulse = 1 + Math.sin(t * 3 + i) * 0.04;
      r.scale.setScalar(base * pulse);
      r.visible = true;
      r.material.opacity = 0.62 + Math.sin(t * 3 + i) * 0.12;
    }

    /* 移动标记扩散 */
    for (const m of marks){
      if (m.life <= 0){ m.mesh.visible = false; continue; }
      m.life -= dt;
      const k = 1 - m.life / m.max;
      m.mesh.scale.setScalar(1 + k * 2.4);
      m.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
    }

    /* 受指挥的士兵 */
    for (const p of actors.people){
      if (p.state !== 'cmd' || !p.cmdPath) continue;
      const A = p.cmdPath[p.cmdSeg];
      const B = p.cmdPath[p.cmdSeg + 1];
      if (!B){
        p.state = 'guard';
        p.wait = 1e9;
        p.cmdPath = null;
        continue;
      }
      const dx = B.x - p.g.position.x, dz = B.z - p.g.position.z;
      const dist = Math.hypot(dx, dz);
      const step = p.speed * dt;
      if (dist <= Math.max(0.45, step)){
        p.g.position.copy(B);
        nav.resolve(p.g.position, 0.7);
        p.cmdT = 0;
        p.cmdSeg++;
        if (!p.cmdPath[p.cmdSeg + 1]){
          p.state = 'guard';
          p.wait = 1e9;
          p.cmdPath = null;
        }
      } else {
        nav.step(p.g.position, (dx / dist) * step, (dz / dist) * step, 0.7);
      }
      p.g.rotation.y = Math.atan2(dx, dz);
      const w = t * 9 + p.phase;
      p.g.userData.legs[0].rotation.x = Math.sin(w) * 0.55;
      p.g.userData.legs[1].rotation.x = -Math.sin(w) * 0.55;
      p.g.userData.arms[0].rotation.x = -Math.sin(w) * 0.38;
      p.g.userData.arms[1].rotation.x = Math.sin(w) * 0.38;
    }
  }

  return {
    update, setSelection, clearSelection, forget, moveSelection, stopSelection,
    assignGroup, recallGroup, spawnMark, focusAttack, setAttackArmed, enemyUnder,
    get selected(){ return selected; },
    get groups(){ return groups; },
    get consumed(){ return consumed; },
    get attackArmed(){ return attackArmed; },
    describe
  };
}
