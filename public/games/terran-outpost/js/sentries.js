/* 栈桥哨兵：环形栈桥四侧的固定守卫
   —— 不可选中、不可操控、不占人口，敌人靠近时自动沿环线补位并开火。
   响应规则：本侧 2 人先动，相邻两侧各出 1 人支援（全场最多 4 人离岗，对侧不动），
   威胁消失 3 秒后归位。阵亡后由指挥中心「栈桥哨兵」条目手动补充（8 秒 / 50 矿 / 上限 8）。 */
import * as THREE from 'three';
import { clamp, TAU, glowMat, box } from './core.js';
import { UNIT_TYPES, buildUnit, animateUnitTrait } from './units.js';

const SPEC = UNIT_TYPES.sentry;
const RING_R = 26;             /* 与 actors.js 的 walkers / base.js 的栈桥同半径 */
const RING_Y = 6.74;           /* 桥面站立高度 */
const POST_OFF = 0.115;        /* 同侧两人的站位夹角，约 3 米 */
const ALERT_R = 31;            /* 威胁进入本侧站位 31 米内才响应 */
const RETURN_DELAY = 3.0;      /* 威胁消失后原地警戒 3 秒再归位 */
const MAX_SLOTS = 8;
const MAX_RESPONDERS = 4;
const WALK_SPEED = 4.2;        /* 与 UNIT_TYPES.sentry.speed 一致 */
const DEPLOY_SPEED = 3.4;      /* 从指挥中心门口走到岗位的速度 */
const MAX_LEAVE = 1.05;        /* 离岗最大弧度，约 27 米，保证不会跑到对侧 */

const SIDES = [
  { a: 0, name: '东' },
  { a: Math.PI / 2, name: '南' },
  { a: Math.PI, name: '西' },
  { a: -Math.PI / 2, name: '北' }
];

const SENTRY_HULL = 0x3d5566;
const SENTRY_HULL_L = 0x63879b;

/* 把角度差折到 (-π, π] */
function wrapAngle(d){
  d = (d + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}

/* 哨兵专用涂装：冷钢蓝 + 青色肩灯，和作战陆战队区分开 */
function makeModel(){
  const g = buildUnit('marine');
  g.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    const hex = o.material.color.getHex();
    if (hex === 0x5c6b78) o.material.color.setHex(SENTRY_HULL);
    else if (hex === 0x8e9ca8) o.material.color.setHex(SENTRY_HULL_L);
  });

  const lamp = glowMat(0x63d6ff, 2.0);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lamp);
  beacon.position.set(-0.98, 3.12, 0.06);
  g.add(beacon);

  /* 胸前执勤条 */
  box(g, 0.5, 0.12, 0.06, 0, 2.5, 0.44, lamp);

  /* 背包短天线 + 顶端信号灯 */
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2830, metalness: 0.4, roughness: 0.65 });
  box(g, 0.05, 0.72, 0.05, 0.3, 4.14, -0.4, dark);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), lamp);
  tip.position.set(0.3, 4.52, -0.4);
  g.add(tip);

  g.userData.sentryLamp = lamp;
  return g;
}

export function createSentries({ world, combat, buildings, enemies }){
  const list = [];
  let visible = true;

  function count(){
    let n = 0;
    for (const s of list) if (s.state !== 'dead' && !s.removed) n++;
    return n;
  }

  function guardsOf(side){
    /* 还在从大门走上来的新兵不占响应名额 */
    return list.filter(s => s.side === side && s.state !== 'dead' && s.state !== 'deploy' && !s.removed);
  }

  function flatDist(s, foe){
    const dx = foe.g.position.x - s.g.position.x;
    const dz = foe.g.position.z - s.g.position.z;
    return Math.hypot(dx, dz);
  }

  function aimGap(s, foe){
    const want = Math.atan2(foe.g.position.x - s.g.position.x, foe.g.position.z - s.g.position.z);
    return Math.abs(wrapAngle(want - s.g.rotation.y));
  }

  function place(s){
    s.g.position.set(Math.cos(s.a) * RING_R, RING_Y, Math.sin(s.a) * RING_R);
  }

  function turnTo(s, yaw, dt, speed){
    s.g.rotation.y += clamp(wrapAngle(yaw - s.g.rotation.y), -speed * dt, speed * dt);
  }

  function faceTo(s, x, z, dt, speed){
    turnTo(s, Math.atan2(x - s.g.position.x, z - s.g.position.z), dt, speed);
  }

  /* 沿环线朝 targetA 走；maxDev 为允许离岗的最大弧度（null = 不限） */
  function moveRing(s, targetA, dt, maxDev){
    const d = wrapAngle(targetA - s.a);
    if (Math.abs(d) < 1e-4) return false;
    const maxStep = (WALK_SPEED / RING_R) * dt;
    let na = s.a + clamp(d, -maxStep, maxStep);
    if (maxDev !== null && maxDev !== undefined){
      na = s.postA + clamp(wrapAngle(na - s.postA), -maxDev, maxDev);
    }
    const moved = wrapAngle(na - s.a);
    if (Math.abs(moved) < 1e-5) return false;
    s.a = na;
    place(s);
    return true;
  }

  /* 指挥中心门口 → 南侧落地楼梯 → 栈桥；新生产的哨兵沿这条路走上岗位 */
  function deployPath(){
    const cmd = buildings.find(b => b.key === 'command');
    const door = (cmd && cmd.doors && cmd.doors[0] && cmd.doors[0].pos)
      ? cmd.doors[0].pos.clone()
      : new THREE.Vector3(0, 0, 16.2);
    door.y = 0.02;
    const gateA = Math.PI / 2;
    return [
      door,
      new THREE.Vector3(0, 0.02, 30.5),
      new THREE.Vector3(0, 0.17, 36.8),
      new THREE.Vector3(0, 1.2, 34.8),
      new THREE.Vector3(0, 2.6, 33.0),
      new THREE.Vector3(0, 4.0, 31.2),
      new THREE.Vector3(0, 5.4, 29.6),
      new THREE.Vector3(0, 6.3, 28.7),
      new THREE.Vector3(Math.cos(gateA) * RING_R, RING_Y, Math.sin(gateA) * RING_R)
    ];
  }

  function makeSentry(slot){
    const side = slot >> 1;
    const postA = SIDES[side].a + ((slot % 2) ? POST_OFF : -POST_OFF);
    const g = makeModel();
    g.position.set(Math.cos(postA) * RING_R, RING_Y, Math.sin(postA) * RING_R);
    g.rotation.y = Math.PI / 2 - postA;        /* 面朝环外 */
    g.visible = visible;
    world.add(g);

    const s = {
      g, kind: 'sentry', isSentry: true,
      slot, side, postA, a: postA,
      state: 'idle', cdT: Math.random() * 0.3, quietT: RETURN_DELAY, react: 0,
      target: null, path: null, pathI: 0, waitT: 0,
      deadT: 0, removed: false, growT: 1, recoil: 0,
      walkPhase: Math.random() * 10,
      lampMat: g.userData.sentryLamp
    };
    combat.recFor(s, 'unit');
    list.push(s);
    return s;
  }

  function freeSlot(){
    for (let i = 0; i < MAX_SLOTS; i++){
      if (!list.some(s => s.slot === i && s.state !== 'dead' && !s.removed)) return i;
    }
    return -1;
  }

  /* 生产完工时调用；opts.instant 直接站上岗位（开局驻防/读档），否则从大门走过来 */
  function spawn(opts){
    if (count() >= MAX_SLOTS) return null;
    const slot = freeSlot();
    if (slot < 0) return null;
    const s = makeSentry(slot);
    if (opts && opts.instant){
      s.growT = 0;
      return s;
    }
    s.state = 'deploy';
    s.path = deployPath();
    s.pathI = 0;
    s.g.position.copy(s.path[0]);
    s.a = Math.PI / 2;
    s.waitT = (opts && opts.delay) || 0;
    return s;
  }

  function fill(n = MAX_SLOTS){
    let made = 0;
    while (count() < n && spawn({ instant: true })) made++;
    return made;
  }

  /* 响应分配：威胁侧本侧 2 人 + 相邻侧各 1 人，全场最多 4 人；返回 Map(哨兵→敌人) 与反应延迟 */
  function chooseResponders(){
    const map = new Map();
    const delay = new Map();
    const threats = [];

    for (let i = 0; i < 4; i++){
      const ax = Math.cos(SIDES[i].a) * RING_R;
      const az = Math.sin(SIDES[i].a) * RING_R;
      let best = null, bd = ALERT_R * ALERT_R;
      for (const e of enemies.list){
        if (e.dead || e.isNest || !e.g) continue;
        const dx = e.g.position.x - ax;
        const dz = e.g.position.z - az;
        const d = dx * dx + dz * dz;
        if (d < bd){ bd = d; best = e; }
      }
      if (best) threats.push({ side: i, foe: best, dist: Math.sqrt(bd) });
    }
    if (!threats.length) return { map, delay };

    threats.sort((a, b) => a.dist - b.dist);
    const hot = new Set(threats.map(t => t.side));
    let quota = MAX_RESPONDERS;

    /* 第一轮：被威胁的本侧两人 */
    for (const th of threats){
      if (quota <= 0) break;
      for (const s of guardsOf(th.side)){
        if (quota <= 0) break;
        map.set(s, th.foe);
        delay.set(s, 0);
        quota--;
      }
    }

    /* 第二轮：相邻且自身没有威胁的侧，各抽离威胁最近的一人支援 */
    for (const th of threats){
      if (quota <= 0) break;
      for (const adj of [(th.side + 3) % 4, (th.side + 1) % 4]){
        if (quota <= 0) break;
        if (hot.has(adj)) continue;
        const cand = guardsOf(adj).sort((a, b) => flatDist(a, th.foe) - flatDist(b, th.foe))[0];
        if (!cand) continue;
        map.set(cand, th.foe);
        delay.set(cand, 0.45);
        quota--;
      }
    }
    return { map, delay };
  }

  function animateSentry(s, moving, dt){
    const u = s.g.userData;
    const legs = u.legs || [];
    const arms = u.arms || [];
    s.walkPhase += dt * (moving ? 9.5 : 2.0);
    const sw = Math.sin(s.walkPhase);
    const amp = moving ? 0.42 : 0;
    if (legs[0]) legs[0].rotation.x = sw * amp;
    if (legs[1]) legs[1].rotation.x = -sw * amp;
    const swing = moving ? -sw * 0.26 : 0;
    if (arms[0]) arms[0].rotation.x = swing;
    if (arms[1]) arms[1].rotation.x = -swing + s.recoil;
    if (s.lampMat){
      const pulse = s.state === 'fire' ? 2.9 : 1.6;
      s.lampMat.emissiveIntensity = pulse + Math.sin(s.walkPhase * 1.4 + s.slot) * 0.4;
    }
    animateUnitTrait(s.g, s.walkPhase, moving);
  }

  function updateDeploy(s, dt){
    if (s.waitT > 0){
      s.waitT -= dt;
      animateSentry(s, false, dt);
      return;
    }
    const q = s.path[s.pathI];
    if (!q){
      s.a = Math.PI / 2;
      place(s);
      s.state = 'return';
      s.quietT = RETURN_DELAY;
      return;
    }
    const p = s.g.position;
    const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
    const d = Math.hypot(dx, dy, dz);
    const step = DEPLOY_SPEED * dt;
    const moving = d > 1e-3;
    if (d <= step){
      p.copy(q);
      s.pathI++;
    } else {
      p.addScaledVector(new THREE.Vector3(dx, dy, dz).normalize(), step);
    }
    if (moving) turnTo(s, Math.atan2(dx, dz), dt, 10);
    animateSentry(s, moving, dt);
    if (s.pathI >= s.path.length){
      s.a = Math.PI / 2;
      s.state = 'return';
      s.quietT = RETURN_DELAY;
    }
  }

  function updateDeath(s, dt){
    if (s.removed) return;
    s.deadT += dt;
    const k = Math.min(1, s.deadT / 0.55);
    s.g.rotation.x = -1.35 * k;          /* 向后倒在桥面上 */
    s.g.position.y = RING_Y - 0.3 * k;
    if (s.lampMat) s.lampMat.emissiveIntensity = Math.max(0, 2.2 * (1 - s.deadT / 1.4));
    if (s.deadT > 2.6 && s.g.parent){    /* 尸体停留 2.6 秒后移除，岗位空出来 */
      s.removed = true;
      s.g.parent.remove(s.g);
      combat.forget(s);
    }
  }

  function update(dt, t){
    const resp = chooseResponders();

    for (const s of list){
      if (s.state === 'dead'){ updateDeath(s, dt); continue; }
      if (s.state === 'deploy'){ updateDeploy(s, dt); continue; }

      if (s.growT < 1){
        s.growT = Math.min(1, s.growT + dt * 4.5);
        s.g.scale.setScalar(0.55 + 0.45 * s.growT);
      }
      s.cdT = Math.max(0, s.cdT - dt);
      s.recoil = Math.max(0, s.recoil - dt);

      const foe = resp.map.get(s);
      let moving = false;

      if (foe && !foe.dead){
        s.quietT = 0;
        s.target = foe;
        if (s.state === 'idle' || s.state === 'return' || s.state === 'move' || s.state === 'fire'){
          if (s.state === 'idle' || s.state === 'return'){
            s.state = 'alert';
            s.react = resp.delay.get(s) || 0;
          }
        }
        if (s.react > 0){
          s.react -= dt;
        } else {
          s.state = 'fire';
          faceTo(s, foe.g.position.x, foe.g.position.z, dt, 8);

          const dist = flatDist(s, foe);
          const er = Math.hypot(foe.g.position.x, foe.g.position.z);
          /* 目标在环外且还没进射程：沿环线朝它转过去（但不出离岗上限） */
          if (dist > SPEC.atkRange * 0.95 && er > RING_R - 2){
            const ta = Math.atan2(foe.g.position.z, foe.g.position.x);
            moving = moveRing(s, ta, dt, MAX_LEAVE);
            if (moving) s.state = 'move';
          }
          if (dist <= SPEC.atkRange && aimGap(s, foe) < 0.4 && s.cdT <= 0){
            if (combat.fireAt(s, foe)){
              s.cdT = SPEC.cd;
              s.recoil = 0.12;
              s.state = 'fire';
            }
          }
        }
      } else {
        s.target = null;
        /* 失去目标：原地警戒，3 秒后才往回走 */
        if (s.quietT < RETURN_DELAY){
          s.quietT += dt;
          if (s.state === 'alert') s.state = 'idle';
        } else if (s.state === 'alert' || s.state === 'fire' || s.state === 'move'){
          s.state = 'return';
        }

        if (s.state === 'return'){
          moving = moveRing(s, s.postA, dt, null);
          if (!moving && Math.abs(wrapAngle(s.a - s.postA)) < 1e-3){
            s.a = s.postA;
            s.state = 'idle';
          }
        }
        if (s.state === 'idle' && !moving){
          /* 归位后面朝环外，缓慢扫视 */
          turnTo(s, Math.PI / 2 - s.a + Math.sin(t * 0.5 + s.walkPhase) * 0.22, dt, 2.2);
        }
      }
      animateSentry(s, moving, dt);
    }

    /* 尸体演出结束、记录已清理的条目从列表里摘掉，避免长局积累 */
    for (let i = list.length - 1; i >= 0; i--){
      if (list[i].removed) list.splice(i, 1);
    }
  }

  function setVisible(v){
    visible = !!v;
    for (const s of list){
      if (s.state === 'dead' || s.removed) continue;
      s.g.visible = visible;
    }
  }

  function dump(){
    return list
      .filter(s => s.state !== 'dead' && !s.removed)
      .map(s => ({ slot: s.slot, hp: Math.max(1, Math.round(combat.recFor(s, 'unit').hp)) }));
  }

  function clear(){
    for (const s of list){
      if (s.g.parent) s.g.parent.remove(s.g);
      combat.forget(s);
    }
    list.length = 0;
  }

  function restore(data){
    clear();
    if (!Array.isArray(data)) return;
    let n = 0;
    for (const it of data){
      if (!it || n >= MAX_SLOTS) continue;
      const slot = Number(it.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_SLOTS) continue;
      if (list.some(s => s.slot === slot)) continue;
      const s = makeSentry(slot);
      s.growT = 1;
      const r = combat.recFor(s, 'unit');
      r.hp = clamp(Number(it.hp) || r.maxHp, 1, r.maxHp);
      n++;
    }
  }

  function status(){
    let alert = 0;
    for (const s of list){
      if (s.state === 'alert' || s.state === 'move' || s.state === 'fire') alert++;
    }
    return { count: count(), alert };
  }

  return { list, update, spawn, fill, count, dump, restore, clear, setVisible, status, MAX: MAX_SLOTS };
}
