import * as THREE from 'three';
import { TAU, clamp, lerp, rand } from './core.js';
import { buildDropship, buildBattlecruiser } from './vehicles.js';
import { bakeStatic } from './core.js';

/* ------------------------------------------------------------------
   空中力量：星港停机坪 + 可独立指挥的飞机
   - 三个停机位（P1..P3），造好一架就占一个位
   - 状态机：parked → taxi → climb → fly → descend → parked
   - 每架飞机独立：位置、目标点、状态、血量、指令
------------------------------------------------------------------- */

const CRUISE_ALT = 26;
const PATROL_R = 56;            // 战列巡航舰环线巡逻半径
const PATROL_ALT = 34;

/* 各机型参数：速度、转向速率、巡航高度、血量 */
const AIR_SPEC = {
  dropship:     { scale: 0.50, speed: 22,   turn: 1.6,  alt: CRUISE_ALT,  hp: 160, name: '运输舰' },
  viking:       { scale: 0.62, speed: 30,   turn: 1.6,  alt: CRUISE_ALT,  hp: 120, name: '维京战机' },
  battlecruiser:{ scale: 0.75, speed: 9.5,  turn: 0.45, alt: PATROL_ALT,  hp: 900, name: '战列巡航舰' }
};
const PAD_DEFS = [
  { ang: -0.22, r: 70 },
  { ang: -0.46, r: 66 },
  { ang: -0.70, r: 70 }
];

function glowDisk(r, color, opacity = 0.5){
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 40),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* 维京：细长机身 + 后掠翼 + 双垂尾 + 导弹挂架 */
export function buildViking(){
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8b96a2, metalness: 0.55, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3f4a55, metalness: 0.5, roughness: 0.6 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x212a32, metalness: 0.4, roughness: 0.7 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0x0b2b38, emissive: 0x53d8ff, emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.4
  });

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  /* 机身 */
  add(new THREE.BoxGeometry(2.0, 1.5, 9.4), steel, 0, 0, 0);
  add(new THREE.BoxGeometry(1.5, 1.0, 3.2), steel, 0, 0.15, 5.6);     // 机鼻
  add(new THREE.ConeGeometry(0.72, 2.2, 6), steel, 0, 0.15, 7.6, Math.PI / 2); // 雷达罩
  add(new THREE.BoxGeometry(2.2, 0.5, 3.4), dark, 0, 0.85, -1.2);      // 背脊
  /* 座舱 */
  add(new THREE.BoxGeometry(1.5, 0.7, 2.0), glow, 0, 0.75, 3.9);
  /* 后掠翼 */
  for (const s of [-1, 1]){
    add(new THREE.BoxGeometry(4.6, 0.32, 2.5), steel, s * 3.0, -0.1, 0.6, 0, s * 0.42, s * -0.12);
    add(new THREE.BoxGeometry(2.0, 0.26, 1.5), dark, s * 5.3, -0.05, 1.4, 0, s * 0.5, s * -0.1);
    /* 翼下导弹 */
    add(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 6), trim, s * 3.4, -0.5, 1.0, Math.PI / 2);
    add(new THREE.ConeGeometry(0.22, 0.6, 6), trim, s * 3.4, -0.5, 2.3, -Math.PI / 2);
    /* 双垂尾 */
    add(new THREE.BoxGeometry(0.16, 1.9, 1.6), dark, s * 1.5, 1.35, -3.2, 0, 0, s * 0.3);
    /* 尾喷口 */
    add(new THREE.CylinderGeometry(0.52, 0.62, 1.4, 10), trim, s * 1.15, 0, -4.9, Math.PI / 2);
    add(new THREE.CircleGeometry(0.42, 12), glow, s * 1.15, 0, -5.6, 0, Math.PI);
  }
  add(new THREE.BoxGeometry(4.2, 0.3, 1.1), dark, 0, 0.1, -4.6);       // 平尾
  add(new THREE.BoxGeometry(0.5, 0.4, 5.0), trim, 0, -0.95, 0.4);      // 腹部挂架

  const flames = [];
  for (const s of [-1, 1]){
    const f = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 14),
      new THREE.MeshBasicMaterial({
        color: 0x7fdcff, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    f.position.set(s * 1.15, 0, -5.6);
    f.rotation.y = Math.PI;
    g.add(f);
    flames.push(f);
  }
  const light = new THREE.PointLight(0x4fd6ff, 12, 26, 2);
  light.position.set(0, 0, -5.2);
  g.add(light);

  bakeStatic(g);
  g.userData.flames = flames;
  g.userData.light = light;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createAirforce({ world, buildings, actors, audio, fx }){
  const starport = buildings.find(b => b.key === 'starport');
  const pads = [];
  const list = [];
  let combat = null;

  /* 战斗系统建好后注入：用来同步血量与击落特效 */
  function bindCombat(c){ combat = c; }

  /* ---- 停机坪 ---- */
  for (let i = 0; i < PAD_DEFS.length; i++){
    const d = PAD_DEFS[i];
    const pos = new THREE.Vector3(Math.cos(d.ang) * d.r, 0.12, Math.sin(d.ang) * d.r);
    const grp = new THREE.Group();
    grp.position.copy(pos);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(7.2, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2c343c, metalness: 0.25, roughness: 0.8,
        polygonOffset: true, polygonOffsetFactor: -1
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.receiveShadow = true;
    grp.add(disc);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x081014, emissive: 0x36c8ff, emissiveIntensity: 0.9
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.9, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    grp.add(ring);

    /* 四个角灯 */
    const lamps = [];
    for (let k = 0; k < 4; k++){
      const a = k / 4 * TAU + Math.PI / 4;
      const lm = new THREE.MeshStandardMaterial({
        color: 0x100a02, emissive: 0xffa53c, emissiveIntensity: 1.2
      });
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), lm);
      l.position.set(Math.cos(a) * 6.1, 0.3, Math.sin(a) * 6.1);
      grp.add(l);
      lamps.push(lm);
    }
    world.add(grp);
    pads.push({ index: i, pos, grp, ringMat, lamps, aircraft: null });
  }

  /* ---- 飞机 ---- */
  function freePad(){ return pads.find(p => !p.aircraft) || null; }

  function makeAircraft(kind, pad){
    const spec = AIR_SPEC[kind] || AIR_SPEC.dropship;
    const g = kind === 'viking' ? buildViking()
            : kind === 'battlecruiser' ? buildBattlecruiser()
            : buildDropship();
    const airborne = kind === 'battlecruiser';
    g.scale.setScalar(spec.scale);
    g.visible = true;
    world.add(g);
    const a = {
      kind, g, pad,
      isAircraft: true,
      state: airborne ? 'fly' : 'parked',   // parked | climb | fly | descend
      pos: pad ? pad.pos.clone() : new THREE.Vector3(0, 0, -2),
      alt: airborne ? spec.alt : 0,
      yaw: -0.4, bank: 0, pitch: 0,
      target: pad ? pad.pos.clone() : new THREE.Vector3(0, 0, -2),
      mode: 'hover',          // idle | goto | land | patrol | dropoff | hover
      speed: spec.speed,
      turn: spec.turn,
      cruiseAlt: spec.alt,
      hp: spec.hp,
      cargo: [],
      selected: false,
      t: rand(0, 4)
    };
    g.position.set(a.pos.x, a.alt, a.pos.z);
    g.rotation.y = a.yaw;
    if (g.userData.flames) g.userData.flames.forEach(f => { f.material.opacity = 0.12; });
    if (g.userData.light) g.userData.light.intensity = 6;
    g.userData.unit = { unit: a, kind };
    if (pad) pad.aircraft = a;
    list.push(a);
    if (airborne) g_set(a);
    return a;
  }

  /* 停靠：把飞机放回停机位 */
  function park(a, pad){
    a.pad = pad;
    a.state = 'parked';
    a.mode = 'idle';
    a.alt = 0;
    a.pos.copy(pad.pos);
    a.target.copy(pad.pos);
    g_set(a);
    if (pad) pad.aircraft = a;
  }

  function g_set(a){
    a.g.position.set(a.pos.x, 0.06 + a.alt, a.pos.z);
    a.g.rotation.set(a.pitch, a.yaw, a.bank);
    /* 大和炮后坐/蓄能震动：只在渲染层抖，不影响真实航迹 */
    if (a.shake > 0.001){
      const s = a.shake;
      a.g.position.x += (Math.random() - 0.5) * s * 1.5;
      a.g.position.y += (Math.random() - 0.5) * s * 0.9;
      a.g.position.z += (Math.random() - 0.5) * s * 1.5;
      a.g.rotation.z += (Math.random() - 0.5) * s * 0.035;
    }
    const on = a.state === 'climb' || a.state === 'fly' || a.state === 'descend';
    if (a.g.userData.flames) a.g.userData.flames.forEach(f => {
      f.material.opacity = on ? 0.26 + 0.12 * Math.sin(a.t * 22) : 0.1;
    });
    if (a.g.userData.light) a.g.userData.light.intensity = on ? 16 : 5;
  }

  /* 起飞 */
  function takeOff(a){
    if (a.state !== 'parked') return;
    if (a.pad){ a.pad.aircraft = null; }
    a.state = 'climb';
    a.mode = 'goto';
    a.target.copy(a.pos);
    if (audio) audio.door(a.pos);
  }

  /* 指定飞行目标（地面坐标） */
  function orderFly(a, p){
    takeOff(a);
    a.mode = 'goto';
    a.patrol = false;
    a.target.set(p.x, 0, p.z);
    if (Math.hypot(p.x - a.pos.x, p.z - a.pos.z) < 1.5) a.mode = 'hover';
  }

  /* 环线巡逻：绕基地中心一圈（战列巡航舰的招牌动作） */
  function setPatrol(a, on){
    if (!a || a.dead) return false;
    if (!on){
      a.patrol = false;
      if (a.mode === 'patrol'){ a.mode = 'hover'; a.target.copy(a.pos); }
      return true;
    }
    takeOff(a);
    a.patrol = true;
    a.mode = 'patrol';
    a.patrolA = Math.atan2(a.pos.z, a.pos.x);
    return true;
  }

  /* 就近降落 */
  function orderLand(a){
    /* 战列巡航舰是常驻空中的旗舰，不占用也不使用停机位 */
    if (a.kind === 'battlecruiser'){
      if (audio) audio.error(a.pos);
      return false;
    }
    let best = null, bd = Infinity;
    for (const p of pads){
      if (p.aircraft && p.aircraft !== a) continue;
      const d = p.pos.distanceToSquared(a.pos);
      if (d < bd){ bd = d; best = p; }
    }
    if (!best){
      if (audio) audio.error(a.pos);
      return false;
    }
    a.mode = 'land';
    a.target.copy(best.pos);
    a.pad = best;
    return true;
  }

  /* 运输舰：装载附近的步兵 / 卸载 */
  function load(a){
    if (a.kind !== 'dropship') return 0;
    const cap = 8 - a.cargo.length;
    if (cap <= 0) return 0;
    const near = actors.people
      .filter(p => p.g.visible && p.state !== 'dead' && p.state !== 'hidden')
      .filter(p => p.g.position.distanceTo(a.pos) < 9)
      .slice(0, cap);
    for (const p of near){
      p.state = 'hidden';
      p.g.visible = false;
      p.engage = false;
      p.wait = 9e9;          /* 载员期间不要自动重生 */
      a.cargo.push(p);
    }
    if (near.length && audio) audio.ack(a.pos);
    return near.length;
  }

  function unload(a){
    if (a.kind !== 'dropship' || !a.cargo.length) return 0;
    const n = a.cargo.length;
    let i = 0;
    for (const p of a.cargo){
      const ang = (i / n) * TAU;
      const r = 2.4 + (i % 3) * 1.1;
      p.state = 'guard';
      p.wait = rand(18, 26);
      p.g.visible = true;
      p.g.scale.setScalar(p.s || 1);
      p.g.position.set(a.pos.x + Math.cos(ang) * r, 0.05, a.pos.z + Math.sin(ang) * r);
      p.g.rotation.x = 0;
      p.deadT = 0;
      p.engage = false;
      p.attackMove = false;
      i++;
    }
    a.cargo.length = 0;
    if (audio) audio.complete(a.pos);
    return n;
  }

  const boarders = [];        /* 正在走向运输舰准备登机的步兵 */

  /* 登机：步兵先走到船边，再收进货舱 */
  function board(units, ship){
    if (!ship || ship.kind !== 'dropship' || ship.dead) return 0;
    const queued = boarders.filter(u => u.boardShip === ship).length;
    let room = 8 - ship.cargo.length - queued;
    let n = 0;
    for (const u of units){
      if (!u || u.state === 'hidden' || u.state === 'dead' || u === ship) continue;
      if (room <= 0) break;
      u.state = 'board';
      u.boardShip = ship;
      u.g.visible = true;
      u.g.scale.setScalar(u.s || 1);
      boarders.push(u);
      room--; n++;
    }
    if (n && audio) audio.ack(ship.pos);
    return n;
  }

  /* 飞到某点并就地卸货 */
  function orderUnloadAt(a, p){
    if (!a || a.kind !== 'dropship') return false;
    takeOff(a);
    a.mode = 'dropoff';
    a.target.set(p.x, 0, p.z);
    return true;
  }

  /* ---- 每帧 ---- */
  function update(dt, t){
    /* 登机中的步兵 */
    for (let i = boarders.length - 1; i >= 0; i--){
      const u = boarders[i];
      const ship = u.boardShip;
      if (!ship || ship.dead || ship.state === 'crash'){
        u.state = 'guard'; u.wait = rand(8, 14); boarders.splice(i, 1); continue;
      }
      const tx = ship.pos.x, tz = ship.pos.z;
      const dx = tx - u.g.position.x, dz = tz - u.g.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 3.0){
        if (ship.cargo.length >= 8){
          /* 船满了：放弃登机，回到待命 */
          u.state = 'guard';
          u.wait = rand(10, 18);
          boarders.splice(i, 1);
          continue;
        }
        u.state = 'hidden';
        u.g.visible = false;
        u.engage = false;
        u.wait = 9e9;
        ship.cargo.push(u);
        boarders.splice(i, 1);
        if (audio) audio.deposit(ship.pos);
        continue;
      }
      if (d > 0.2){
        const step = Math.min(6.2 * dt, d);
        u.g.position.x += dx / d * step;
        u.g.position.z += dz / d * step;
        u.g.rotation.y = Math.atan2(dx, dz);
      }
      if (ship.state === 'fly' && ship.alt > 12) u.state = 'guard';   /* 船飞太高就放弃 */
    }

    for (let i = list.length - 1; i >= 0; i--){
      const a = list[i];
      a.t += dt;

      /* 被击落：翻滚坠落 → 落地爆炸 → 移除 */
      if (!a.dead && combat){
        const r = combat.recFor(a, 'unit');
        if (r && r.hp <= 0){
          a.dead = true;
          a.state = 'crash';
          a.mode = 'idle';
          if (a.pad){ a.pad.aircraft = null; a.pad = null; }
          if (audio) audio.explode(a.g.position);
        }
      }
      if (a.state === 'crash'){
        a.spin = (a.spin || 0) + dt * 5.5;
        a.g.rotation.set(a.pitch + dt * 1.4, a.yaw, a.spin);
        a.g.position.y = Math.max(0.35, a.g.position.y - dt * 16);
        if (a.g.position.y <= 0.4 && !a.hitGround){
          a.hitGround = true;
          if (fx){
            fx.sparkAt(a.g.position.clone().setY(0.6), 40);
            fx.steamAt(a.g.position.clone().setY(0.4));
          }
          if (audio) audio.explode(a.g.position);
        }
        if (a.hitGround){ a.fade = (a.fade || 1) - dt * 1.4; }
        if (a.fade !== undefined && a.fade <= 0){
          world.remove(a.g);
          list.splice(i, 1);
        }
        continue;
      }

      /* 巡逻：沿基地环线匀速绕圈 */
      if (a.mode === 'patrol'){
        a.patrolA = (a.patrolA || 0) + (a.speed / PATROL_R) * dt;
        a.target.set(Math.cos(a.patrolA) * PATROL_R, 0, Math.sin(a.patrolA) * PATROL_R);
      }

      const dx = a.target.x - a.pos.x;
      const dz = a.target.z - a.pos.z;
      const dist = Math.hypot(dx, dz);

      if (a.state === 'parked'){
        a.alt = 0;
        g_set(a);
        continue;
      }

      if (a.state === 'climb'){
        a.alt = Math.min(a.cruiseAlt, a.alt + dt * 11);
        a.pitch = lerp(a.pitch, -0.16, dt * 3);
        if (a.alt >= a.cruiseAlt - 0.01) a.state = 'fly';
      } else if (a.state === 'fly'){
        a.pitch = lerp(a.pitch, 0, dt * 3);
      } else if (a.state === 'descend'){
        a.alt = Math.max(0, a.alt - dt * 8);
        a.pitch = lerp(a.pitch, 0.1, dt * 3);
      }

      /* 水平移动（降落到最后 20 米时减速） */
      if (dist > 0.35){
        const slow = (a.state === 'descend' && dist < 22) ? clamp(dist / 22, 0.25, 1) : 1;
        const step = Math.min(a.speed * slow * dt, dist);
        a.pos.x += dx / dist * step;
        a.pos.z += dz / dist * step;
        const want = Math.atan2(dx, dz);
        let dy = want - a.yaw;
        while (dy > Math.PI) dy -= TAU;
        while (dy < -Math.PI) dy += TAU;
        a.yaw += clamp(dy, -dt * a.turn, dt * a.turn);
        /* 主力舰转弯带明显侧倾 */
        a.bank = lerp(a.bank, clamp(-dy * (a.kind === 'battlecruiser' ? 2.2 : 1.4), -0.5, 0.5), dt * 4);
      } else if (a.state === 'fly' && a.mode === 'goto'){
        a.mode = 'hover';
      }

      /* 降落判定 */
      if (a.mode === 'dropoff' && dist < 1.4 && a.state === 'fly'){
        a.state = 'dropdesc';
      }
      if (a.state === 'dropdesc'){
        a.alt = Math.max(5, a.alt - dt * 9);
        a.pitch = lerp(a.pitch, 0.08, dt * 3);
        if (a.alt <= 5.05 && a.mode === 'dropoff'){
          unload(a);
          a.mode = 'hover';
          a.state = 'climb';
          a.target.copy(a.pos);
        }
      }
      if (a.mode === 'land' && dist < 1.2 && a.state === 'fly'){
        a.state = 'descend';
        a.alt = Math.min(a.alt, CRUISE_ALT);
      }
      if (a.mode === 'land' && a.state === 'descend' && a.alt <= 0.05){
        const pad = a.pad;
        if (pad){
          pad.aircraft = a;
          a.pos.copy(pad.pos);
          a.target.copy(pad.pos);
        }
        a.state = 'parked';
        a.mode = 'idle';
        a.alt = 0;
        a.bank = 0;
        a.pitch = 0;
        if (audio) audio.door(a.pos);
      }

      /* 停在原地时轻微悬停抖动 */
      if (a.mode === 'hover' && a.state === 'fly'){
        a.alt = a.cruiseAlt + Math.sin(t * 1.4 + a.t) * 0.35;
      }
      /* 震动衰减（大和炮蓄能与后坐） */
      if (a.shake > 0) a.shake = Math.max(0, a.shake - dt * 2.2);
      g_set(a);
    }

    /* 停机位灯光呼吸 */
    for (const p of pads){
      const busy = !!p.aircraft;
      p.ringMat.emissiveIntensity = busy ? 0.5 : 1.1 + Math.sin(t * 2 + p.index) * 0.5;
      p.ringMat.emissive.setHex(busy ? 0x1d6a86 : 0x36c8ff);
      for (const l of p.lamps) l.emissiveIntensity = busy ? 0.6 : 1.2;
    }
  }

  return {
    list, pads,
    bindCombat,
    spawn(kind){
      /* 战列巡航舰：全场唯一，且不走停机位（悬停在指挥中心上空） */
      if (kind === 'battlecruiser'){
        if (list.some(a => a.kind === 'battlecruiser' && !a.dead)) return null;
        const a = makeAircraft('battlecruiser', null);
        if (audio) audio.complete(a.pos);
        return a;
      }
      const pad = freePad();
      if (!pad) return null;
      const a = makeAircraft(kind, pad);
      if (audio) audio.complete(pad.pos);
      return a;
    },
    setPatrol,
    hasBattlecruiser(){ return list.some(a => a.kind === 'battlecruiser' && !a.dead); },
    orderFly, orderLand, takeOff, load, unload, board, orderUnloadAt, boarders,
    padOf(a){ return a.pad; },
    freePads(){ return pads.filter(p => !p.aircraft).length; },
    update
  };
}
