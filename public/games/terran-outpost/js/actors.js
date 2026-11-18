/* 动态元素：官兵往返、运输舰进离场、工兵施工、载具 */
import * as THREE from 'three';
import { TAU, rand, rnd, pick, box, cyl, strip } from './core.js';
import { buildDropship, buildTank, buildVulture, buildSCV } from './vehicles.js';
import { buildUnit, animateUnitTrait, UNIT_TYPES } from './units.js';
import { createGroundNav } from './nav.js';

const ROAD_R = 26.7;

export function createActors({ M, world, buildings }){
  const people = [];
  const nav = createGroundNav(buildings);
  const transits = { count: 0 };

  /* ------------------------------------------------------- 人物 --- */
  function makePerson(kind = 'marine'){ return buildUnit(kind); }

  function spawnPerson(from, kind = 'marine'){
    const g = makePerson(kind);
    const spec = UNIT_TYPES[kind] || UNIT_TYPES.marine;
    const s = rand(spec.scale[0], spec.scale[1]);
    g.scale.setScalar(s);
    world.add(g);
    const p = {
      g, s, kind, spec, phase: rand(0, 10),
      speed: spec.speed * rand(0.96, 1.05),
      route: null, t: 0, state: 'idle', wait: 0
    };
    g.userData.unit = { unit: p, kind };
    assignRoute(p, from);
    people.push(p);
    return p;
  }

  function nearestRoadPoint(x, z){
    const a = Math.atan2(z, x);
    return { a, pos: new THREE.Vector3(Math.cos(a) * ROAD_R, 0, Math.sin(a) * ROAD_R) };
  }

  function assignRoute(p, forceA){
    const a = forceA || pick(buildings);
    let b = pick(buildings);
    let guard = 0;
    while ((b === a || a.doors.length === 0 || b.doors.length === 0) && guard++ < 20) b = pick(buildings);
    if (a.doors.length === 0 || b.doors.length === 0){ p.state = 'hidden'; p.g.visible = false; return; }

    const dA = a.doors[0].pos;
    const dB = b.doors[0].pos;
    const rA = nearestRoadPoint(dA.x, dA.z);
    const rB = nearestRoadPoint(dB.x, dB.z);

    /* 从 A 门出来，绕环路到 B 门 */
    let da = rB.a - rA.a;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;

    const pts = [
      dA.clone(),
      new THREE.Vector3(dA.x + (rA.pos.x - dA.x) * 0.45, 0, dA.z + (rA.pos.z - dA.z) * 0.45),
      rA.pos.clone(),
      rB.pos.clone(),
      new THREE.Vector3(dB.x + (rB.pos.x - dB.x) * 0.5, 0, dB.z + (rB.pos.z - dB.z) * 0.5),
      dB.clone()
    ];

    /* 把环形段细分 */
    const path = [];
    for (let i = 0; i < pts.length - 1; i++){
      const A = pts[i], B = pts[i + 1];
      const isRing = (i === 1 || i === 2);
      if (isRing){
        const steps = 16;
        for (let k = 0; k < steps; k++){
          const a0 = rA.a + da * (k / steps);
          path.push(new THREE.Vector3(Math.cos(a0) * ROAD_R, 0, Math.sin(a0) * ROAD_R));
        }
      } else {
        path.push(A.clone());
      }
    }
    path.push(dB.clone());

    p.route = path;
    p.seg = 0;
    p.t = 0;
    p.state = 'walk';
    p.g.visible = true;
    p.g.position.copy(path[0]);
    p.g.scale.setScalar(p.s);
    p.from = a; p.to = b;
  }

  /* 开局不再部署地面士兵：只保留大和、8 名栈桥哨兵与 3 名采矿 SCV。
     地面部队改由兵营/工厂生产后经 spawnFrom 补入 people。 */

  /* --------------------------------------------- 栈桥巡逻兵 --- */
  /* 原来的 7 名绕环线散步的巡逻兵已退役：栈桥守卫改为 js/sentries.js 的 8 名固定哨兵。
     保留空数组与 updateWalkers，避免旧引用（小地图等）报错。 */
  const walkers = [];

  /* ------------------------------------------------ 旧演出运输舰 --- */
  /* 原来那架反复起降的大运输舰已移除（空中力量改由 js/aircraft.js 接管，
     基地旗舰换成出生自带的战列巡航舰）。这里保留一个不可见的占位对象，
     让 main.js 里的 minimap / 跟随 / HUD 逻辑继续安全引用。 */
  const ship = new THREE.Group();
  ship.visible = false;
  const sstate = { phase: 'wait', t: 0, pos: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3() };
  const shipTimeline = [{ phase: 'wait', dur: 1e9 }];
  let ti = 0;

  function setShipPhase(i){ ti = i; sstate.phase = shipTimeline[i].phase; sstate.t = 0; }

  /* ----------------------------------------------------- 更新 --- */
  function updatePeople(dt, t){
    for (const p of people){
      if (p.state === 'garrison') continue;
      if (p.state === 'hidden'){
        p.wait -= dt;
        if (p.wait <= 0) { p.g.visible = true; assignRoute(p); }
        continue;
      }
      if (p.state === 'walk'){
        if (p.engage) continue;              /* 交战中：由 combat 接管移动 */
        const A = p.route[p.seg];
        const B = p.route[p.seg + 1];
        if (!A || !B){ p.state = 'done'; p.wait = rand(2, 5); continue; }
        const dir = B.clone().sub(A);
        const len = dir.length();
        p.t += (p.speed * dt) / Math.max(0.001, len);
        if (p.t >= 1){
          p.t = 0;
          p.seg++;
          if (p.seg >= p.route.length - 1){
            if (p.guard){
              p.state = 'guard';
              p.wait = 1e9;
              p.g.position.copy(B);
              nav.resolve(p.g.position, 0.7);
              continue;
            }
            p.state = 'done';
            p.wait = rand(2.0, 5.5);
            transits.count++;
            p.g.position.copy(B);
            nav.resolve(p.g.position, 0.7);
            continue;
          }
        } else {
          p.g.position.lerpVectors(A, B, p.t);
          nav.resolve(p.g.position, 0.7);
        }
        p.g.rotation.y = Math.atan2(dir.x, dir.z);
        /* 步行摆动（叠加兵种持械基准角度） */
        const w = t * 9 + p.phase;
        const amp = 0.55;
        const base = p.g.userData.armBase || [0, 0];
        const lock = p.g.userData.lockArm1;
        p.g.userData.legs[0].rotation.x = Math.sin(w) * amp;
        p.g.userData.legs[1].rotation.x = -Math.sin(w) * amp;
        p.g.userData.arms[0].rotation.x = base[0] - Math.sin(w) * amp * 0.55;
        p.g.userData.arms[1].rotation.x = lock
          ? base[1] + Math.sin(w * 0.5) * 0.035
          : base[1] + Math.sin(w) * amp * 0.55;
        animateUnitTrait(p.g, t + p.phase, true);
      } else if (p.state === 'guard'){
        p.wait -= dt;
        /* 站岗：轻微左右张望 */
        p.g.rotation.y += Math.sin(t * 0.7 + p.phase) * 0.004;
        p.g.userData.legs[0].rotation.x *= 0.9;
        p.g.userData.legs[1].rotation.x *= 0.9;
        const gb = p.g.userData.armBase || [0, 0];
        p.g.userData.arms[0].rotation.x += (gb[0] - p.g.userData.arms[0].rotation.x) * 0.1;
        p.g.userData.arms[1].rotation.x += (gb[1] - p.g.userData.arms[1].rotation.x) * 0.1;
        animateUnitTrait(p.g, t + p.phase, false);
        if (p.wait <= 0){
          p.guard = false;
          p.g.visible = false;
          p.state = 'hidden';
          p.wait = rand(2, 6);
        }
      } else if (p.state === 'done'){
        p.wait -= dt;
        /* 缩进门口 */
        const k = Math.max(0, Math.min(1, p.wait / 1.2));
        p.g.scale.setScalar(p.s * Math.max(0.001, Math.min(1, k)));
        if (p.wait <= 0){
          p.state = 'hidden';
          p.wait = rand(1.5, 6);
          p.g.visible = false;
        }
      }
    }
  }

  /* 旧演出运输舰已停用：保留空更新，避免上层调用报错 */
  function updateShip(dt, t){}
  function updateWalkers(dt, t){
    const R = 26;
    for (const w of walkers){
      w.a += w.speed * dt;
      w.g.position.set(Math.cos(w.a) * R, 6.74, Math.sin(w.a) * R);
      const sg = Math.sign(w.speed);
      w.g.rotation.y = Math.atan2(-Math.sin(w.a) * sg, Math.cos(w.a) * sg);
      const sw = t * 7.5 + w.phase;
      w.g.userData.legs[0].rotation.x = Math.sin(sw) * 0.42;
      w.g.userData.legs[1].rotation.x = -Math.sin(sw) * 0.42;
      w.g.userData.arms[0].rotation.x = -Math.sin(sw) * 0.3;
      w.g.userData.arms[1].rotation.x = Math.sin(sw) * 0.3;
    }
  }

  /* ------------------------------------------------ 工兵施工 --- */
  const workers = [];
  const tanks = [];

  function spawnWorker(b){
    const g = buildSCV();
    g.scale.setScalar(rand(1.02, 1.16));
    world.add(g);
    const door = b.doors[0] ? b.doors[0].pos.clone() : b.center.clone();
    const wp = (b.workPoint ? b.workPoint : b.center).clone();
    g.position.copy(door);
    const crate = box(g, 1.05, 0.85, 1.05, 0, 2.15, 1.0, M.plate);
    const w = { g, b, state: 'toWork', from: door.clone(), to: wp.clone(),
                t: 0, speed: rand(3.4, 4.4), phase: rand(0, 10), crate, fade: 1, bob: rand(0, TAU) };
    workers.push(w);
    return w;
  }

  function setWorkers(b, n){
    for (const w of workers) if (w.b === b && w.state !== 'leave') w.state = 'leave';
    for (let i = 0; i < n; i++) setTimeout(() => {
      if (!b.doorCtl || b.doorCtl.openAmount > 0.2) spawnWorker(b);
      else spawnWorker(b);
    }, i * 380);
  }

  function clearWorkers(b){
    for (const w of workers) if (w.b === b) w.state = 'leave';
  }

  function updateWorkers(dt, t){
    for (let i = workers.length - 1; i >= 0; i--){
      const w = workers[i];
      const g = w.g;

      if (w.state === 'toWork' || w.state === 'leave'){
        const dist = Math.max(0.001, w.from.distanceTo(w.to));
        w.t += (w.speed * dt) / dist;
        if (w.t >= 1){
          if (w.state === 'toWork'){
            w.state = 'work';
            w.t = 0;
            g.position.copy(w.to);
            g.rotation.y = Math.atan2(w.b.center.x - w.to.x, w.b.center.z - w.to.z);
          } else {
            world.remove(g);
            g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
            workers.splice(i, 1);
            continue;
          }
        } else {
          const from = w.state === 'toWork' ? w.from : w.to;
          const to = w.state === 'toWork' ? w.to : w.from;
          g.position.lerpVectors(from, to, w.t);
          const d = to.clone().sub(from);
          g.rotation.y = Math.atan2(d.x, d.z);
        }
        /* 行走姿态 */
        const sw = t * 6.4 + w.phase;
        const aL = g.userData.armL, aR = g.userData.armR;
        const lL = g.userData.legL, lR = g.userData.legR;
        if (lL){
          lL.rotation.x = Math.sin(sw) * 0.45;
          lR.rotation.x = -Math.sin(sw) * 0.45;
          aL.rotation.x = -Math.sin(sw) * 0.3 - 0.5;
          aR.rotation.x = Math.sin(sw) * 0.3 - 0.5;
        }
      } else if (w.state === 'work'){
        /* 施工：手臂上下作业 + 轻微起伏 */
        const sw = t * 5.2 + w.phase;
        if (g.userData.armL){
          g.userData.armL.rotation.x = -0.9 + Math.sin(sw) * 0.55;
          g.userData.armR.rotation.x = -0.9 + Math.sin(sw + 1.6) * 0.55;
          g.userData.legL.rotation.x = Math.sin(sw * 0.5) * 0.08;
          g.userData.legR.rotation.x = -Math.sin(sw * 0.5) * 0.08;
        }
        g.position.y = Math.sin(sw * 0.8) * 0.05;
      }
    }
  }

  /* ------------------------------------------------ 出厂载具 --- */
  const VEH_CAP = { tank: 3, vulture: 6 };

  function disposeObj(g){
    g.traverse(o => {
      if (!o.isMesh) return;
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m && m.dispose) m.dispose();
    });
    if (g.parent) g.parent.remove(g);
  }

  function spawnVehicle(kind, b, opts = {}){
    const spec = UNIT_TYPES[kind];
    if (!spec) return null;
    const alive = tanks.filter(v => v.kind === kind && v.state !== 'dead').length;
    if (alive >= (VEH_CAP[kind] || 3)) return null;
    const g = kind === 'vulture' ? buildVulture() : buildTank();
    world.add(g);
    const v = {
      g, kind, isVehicle: true, a: rand(0, TAU), wheel: 0,
      muzzle: g.userData.muzzle,
      state: opts.state || 'patrol', goal: null,
      siege: !!opts.siege, siegeT: 0, deploy: opts.siege ? 1 : 0,
      cdT: 0, recoil: 0, aimYaw: undefined, attackTarget: null, attackMove: false,
      mineCharges: opts.mines !== undefined ? opts.mines : (spec.mines || 0),
      speed: (rnd() > 0.5 ? 1 : -1) * rand(0.045, 0.07),
      moveSpeed: spec.speed
    };
    if (opts.pos){
      const p = opts.pos;
      const px = Array.isArray(p) ? p[0] : p.x;
      const py = Array.isArray(p) ? p[1] : p.y;
      const pz = Array.isArray(p) ? p[2] : p.z;
      g.position.set(px, py !== undefined ? py : (kind === 'vulture' ? 0.55 : 0.02), pz);
      v.state = opts.state || 'park';
    } else if (b && b.vehicleExit){
      /* 工厂重载具走背面后勤门：先从出场坪驶出，再前往集结点 */
      g.position.copy(b.vehicleExit.pos);
      /* 同批出厂的载具横向错开，避免互相判阻 */
      const slot = tanks.filter(x => x.state !== 'dead').length;
      const rx = Math.cos(b.vehicleExit.yaw), rz = -Math.sin(b.vehicleExit.yaw);
      /* 第一辆正对后门，之后左右交替排开，单辆出场不会偏到厂房角落 */
      const lane = slot === 0 ? 0 : Math.ceil(slot / 2) * (slot % 2 ? 1 : -1);
      const off = lane * 4.0;
      g.position.x += rx * off;
      g.position.z += rz * off;
      g.position.y = kind === 'vulture' ? 0.55 : 0.02;
      g.rotation.y = b.vehicleExit.yaw;
      v.state = 'drive';
      v.goal = b.rally
        ? b.rally.clone()
        : b.vehicleExit.staging.clone().add(new THREE.Vector3(rx * off * 1.4, 0, rz * off * 1.4));
      if (b.exitDoorCtl) b.exitDoorCtl.open(2.8);
    } else if (b && b.rally){
      v.state = 'drive';
      v.goal = b.rally.clone();
      const start = b.workPoint ? b.workPoint.clone() : b.center.clone();
      start.y = kind === 'vulture' ? 0.55 : 0.02;
      g.position.copy(start);
    } else if (b){
      g.position.copy(b.workPoint ? b.workPoint : b.center);
      g.position.y = kind === 'vulture' ? 0.55 : 0.02;
    }
    if (opts.yaw !== undefined) g.rotation.y = opts.yaw;
    tanks.push(v);
    return v;
  }

  function spawnTank(b){ return spawnVehicle('tank', b); }

  function clearVehicles(){
    for (const v of tanks) disposeObj(v.g);
    tanks.length = 0;
  }

  function restoreVehicles(list, combat){
    clearVehicles();
    for (const it of list || []){
      if (!it || (it.kind !== 'tank' && it.kind !== 'vulture')) continue;
      const v = spawnVehicle(it.kind, null, {
        pos: it.pos, yaw: it.yaw, state: it.state === 'drive' ? 'park' : (it.state === 'dead' ? 'park' : (it.state || 'park')),
        siege: !!it.siege, mines: it.mines
      });
      if (!v) continue;
      if (combat && it.hp !== undefined){
        const r = combat.recFor(v, 'unit');
        r.hp = Math.max(1, Math.min(r.maxHp, it.hp));
      }
      if (v.siege){ v.deploy = 1; v.siegeT = 0; }
    }
  }

  /* 载具简单避障：圆形建筑 + 其他载具 + 步兵。不做寻路网格，只做转向试探，
     保证不会直接穿过指挥中心/工厂等大件，也不会叠着别的车走。 */
  const VEH_R = 3.2;
  function blockedAt(x, z, self){
    for (const b of buildings){
      const r = (b.radius || 10) + 3.0;
      const dx = x - b.center.x, dz = z - b.center.z;
      if (dx * dx + dz * dz >= r * r) continue;
      /* 出生/读档时若已经在建筑包围圈里，允许先往外走，避免一生成就卡死 */
      if (self){
        const ox = self.g.position.x - b.center.x, oz = self.g.position.z - b.center.z;
        if (ox * ox + oz * oz < r * r && dx * dx + dz * dz > ox * ox + oz * oz) continue;
      }
      return true;
    }
    for (const v of tanks){
      if (v === self || v.state === 'dead') continue;
      const dx = x - v.g.position.x, dz = z - v.g.position.z;
      if (dx * dx + dz * dz < VEH_R * VEH_R) return true;
    }
    for (const p of people){
      if (p.state === 'hidden' || p.state === 'dead' || !p.g.visible) continue;
      const dx = x - p.g.position.x, dz = z - p.g.position.z;
      if (dx * dx + dz * dz < 1.1 * 1.1) return true;
    }
    return false;
  }

  function steerVehicle(tk, step){
    const dx = tk.goal.x - tk.g.position.x;
    const dz = tk.goal.z - tk.g.position.z;
    const base = Math.atan2(dx, dz);
    const probe = Math.max(step, 1.3);
    let best = null, bestScore = Infinity;
    for (const a of [0, 0.34, -0.34, 0.68, -0.68, 1.02, -1.02, 1.36, -1.36, 1.7, -1.7, 2.05, -2.05]){
      const yaw = base + a;
      const sx = Math.sin(yaw), sz = Math.cos(yaw);
      const nx = tk.g.position.x + sx * step;
      const nz = tk.g.position.z + sz * step;
      if (blockedAt(nx + sx * (probe - step), nz + sz * (probe - step), tk)) continue;
      const remain = Math.hypot(tk.goal.x - nx, tk.goal.z - nz);
      let hd = yaw - tk.g.rotation.y;
      while (hd > Math.PI) hd -= TAU;
      while (hd < -Math.PI) hd += TAU;
      /* 带一点朝向惯性，绕过圆形建筑时不会在切线两侧来回抖 */
      const score = remain + Math.abs(a) * 1.1 + Math.abs(hd) * 0.9;
      if (score < bestScore){ bestScore = score; best = { nx, nz, yaw }; }
    }
    if (!best) return false;
    tk.g.position.x = best.nx;
    tk.g.position.z = best.nz;
    nav.resolve(tk.g.position, 1.2);
    tk.g.rotation.y = best.yaw;
    return true;
  }

  function updateTanks(dt, t){
    const R = 34.4;
    for (const tk of tanks){
      const ud = tk.g.userData;
      if (tk.state === 'dead'){
        tk.deadT = (tk.deadT || 0) + dt;
        tk.g.rotation.z = Math.min(0.42, tk.deadT * 0.3);
        tk.g.position.y = Math.max(-0.6, (tk.kind === 'vulture' ? 0.55 : 0.02) - tk.deadT * 0.22);
        if (ud.turret) ud.turret.rotation.y += dt * 0.8;
        continue;
      }
      if (tk.kind === 'vulture'){
        tk.g.position.y = 0.55 + Math.sin(t * 4 + tk.a) * 0.07;
        if (ud.hover) ud.hover.rotation.z += dt * 1.4;
      }
      /* 炮管后坐复位 */
      if (ud.barrel) ud.barrel.position.z = -(tk.recoil || 0) * 0.55;
      tk.recoil = Math.max(0, (tk.recoil || 0) - dt * 4.5);
      /* 炮塔/车头瞄准 */
      if (tk.aimYaw !== undefined){
        if (ud.turret){
          let want = tk.aimYaw - tk.g.rotation.y;
          while (want > Math.PI) want -= TAU;
          while (want < -Math.PI) want += TAU;
          ud.turret.rotation.y += (want - ud.turret.rotation.y) * Math.min(1, dt * 7);
          ud.barrel.rotation.x = -0.05;
        } else if (ud.gun){
          let want = tk.aimYaw - tk.g.rotation.y;
          while (want > Math.PI) want -= TAU;
          while (want < -Math.PI) want += TAU;
          ud.gun.rotation.y += (want - ud.gun.rotation.y) * Math.min(1, dt * 9);
        }
      }
      /* 攻城支撑腿展开/收起 */
      const wantDeploy = tk.siege ? 1 : 0;
      const step = dt / 1.7;
      tk.deploy = tk.deploy < wantDeploy ? Math.min(wantDeploy, tk.deploy + step) : Math.max(wantDeploy, tk.deploy - step);
      if (ud.supports){
        for (const sup of ud.supports){
          sup.g.rotation.z = sup.side * 0.85 * tk.deploy;
          sup.g.position.y = 0.95 - 0.55 * tk.deploy;
        }
      }
      if (tk.siegeT > 0) tk.siegeT -= dt;

      if (tk.state === 'drive' && !tk.siege && tk.siegeT <= 0){
        if (!tk.goal){ tk.state = 'park'; continue; }
        const dx = tk.goal.x - tk.g.position.x;
        const dz = tk.goal.z - tk.g.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.9){
          tk.state = 'park';
          tk.goal = null;
        } else {
          const step = Math.min(d, (tk.moveSpeed || 3.2) * dt);
          if (steerVehicle(tk, step)){
            tk.blockT = 0;
            tk.wheel += dt * 9;
            if (tk.kind === 'vulture') tk.g.rotation.z = Math.sin(t * 3) * 0.03;
          } else {
            tk.blockT = (tk.blockT || 0) + dt;
            if (tk.blockT > 0.9){
              tk.state = 'park';
              tk.goal = null;
              tk.blockT = 0;
            }
          }
        }
        continue;
      }
      if (tk.state === 'park' || tk.siege || tk.siegeT > 0){
        if (tk.aimYaw === undefined && ud.turret && !tk.siege){
          ud.turret.rotation.y = Math.sin(t * 0.3 + tk.a) * 0.9;
        }
        continue;
      }
      /* 未接战且没有集结点：沿环线巡逻 */
      tk.a += tk.speed * dt;
      tk.wheel += dt * Math.abs(tk.speed) * 22;
      tk.g.position.set(Math.cos(tk.a) * R, tk.kind === 'vulture' ? 0.55 : 0.02, Math.sin(tk.a) * R);
      const sg = Math.sign(tk.speed);
      tk.g.rotation.y = Math.atan2(-Math.sin(tk.a) * sg, Math.cos(tk.a) * sg);
      if (ud.turret){
        ud.turret.rotation.y = Math.sin(t * 0.4 + tk.a) * 0.35;
        ud.barrel.rotation.x = -0.04 + Math.sin(t * 0.7 + tk.a) * 0.03;
      }
    }
    /* 残骸 6 秒后清场 */
    for (let i = tanks.length - 1; i >= 0; i--){
      const v = tanks[i];
      if (v.state === 'dead' && (v.deadT || 0) > 6){
        disposeObj(v.g);
        tanks.splice(i, 1);
      }
    }
  }

  /* ---------------------------------------------- 完工出厂 --- */
  function spawnFrom(b, n, kind = 'marine'){
    const spec = UNIT_TYPES[kind] || UNIT_TYPES.marine;
    for (let i = 0; i < n; i++){
      let p = people.find(pp => pp.state === 'hidden' && pp.kind === kind);
      if (!p && people.length < 48) p = spawnPerson(b, kind);
      if (!p) continue;
      const pp = p;
      pp.state = 'walk';
      pp.g.visible = true;
      /* 生产出来的战斗单位走到集结点后就地驻守，不再像旧版背景人群那样消失 */
      pp.guard = true;
      pp.wait = 1e9;
      pp.s = rand(spec.scale[0], spec.scale[1]);
      pp.speed = spec.speed * rand(0.96, 1.05);
      pp.g.scale.setScalar(pp.s);
      if (b.rally && b.workPoint){
        pp.route = [b.workPoint.clone(), b.rally.clone()];
        pp.seg = 0; pp.t = 0; pp.guard = true;
        pp.g.position.copy(pp.route[0]);
      } else {
        pp.g.position.copy(b.workPoint ? b.workPoint : b.center);
        pp.seg = 0; pp.t = 0;
        assignRoute(pp, b);
        if (pp.route && pp.route.length){
          pp.g.position.copy(pp.route[0]);
          pp.seg = 0; pp.t = 0;
        }
      }
    }
  }

  /* ---------------------------------------------------- 地堡驻军 --- */
  const BUNKER_CAP = 4;
  function bunkerLoad(b, units){
    if (!b || (b.key !== 'bunker' && b.type !== 'bunker')) return [];
    b.garrison = b.garrison || [];
    const out = [];
    for (const u of units || []){
      if (b.garrison.length >= BUNKER_CAP) break;
      if (!u || !['marine', 'firebat', 'medic'].includes(u.kind)) continue;
      if (u.state === 'dead' || u.state === 'hidden' || u.state === 'garrison') continue;
      b.garrison.push(u);
      u.state = 'garrison';
      u.bunker = b;
      u.engage = false;
      u.g.visible = false;
      u.cmdPath = null;
      u.cmdGoal = null;
      u.wait = 0;
      out.push(u);
    }
    if (b.garrison.length && b.crew !== undefined) b.crew = 4;
    return out;
  }

  function bunkerUnload(b){
    if (!b || !b.garrison || !b.garrison.length) return [];
    const out = b.garrison.slice();
    const n = out.length;
    for (let i = 0; i < n; i++){
      const u = out[i];
      const a = Math.PI / 2 + (i / n) * Math.PI * 2;
      const rr = (b.radius || 10) + 2.2;
      u.state = 'guard';
      u.guard = true;
      u.wait = 1e9;
      u.bunker = null;
      u.engage = false;
      u.cmdPath = null;
      u.cmdGoal = null;
      u.g.visible = true;
      u.g.position.set(b.center.x + Math.cos(a) * rr, 0.02, b.center.z + Math.sin(a) * rr);
      u.g.rotation.y = Math.atan2(b.center.x - u.g.position.x, b.center.z - u.g.position.z);
    }
    b.garrison = [];
    return out;
  }

  function onProduced(ev){
    const b = buildings.find(x => x.key === ev.key);
    if (!b) return;
    const id = ev.item && ev.item.id;
    const type = b.type || ev.key;
    if (type.indexOf('barracks') === 0){
      if (id && UNIT_TYPES[id]) spawnFrom(b, id === 'firebat' ? 1 : 2, id);
      else spawnFrom(b, 2, 'marine');
    } else if (type === 'factory' || ev.key.indexOf('factory') === 0){
      return spawnVehicle(id === 'vulture' ? 'vulture' : 'tank', b);
    }
  }

  return {
    people, walkers, workers, tanks, ship, transits,
    update(dt, t){
      updatePeople(dt, t); updateWalkers(dt, t);
      updateWorkers(dt, t); updateTanks(dt, t);
      updateShip(dt, t);
    },
    setWorkers, clearWorkers, onProduced, spawnTank, spawnVehicle,
    clearVehicles, restoreVehicles, spawnFrom,
    bunkerLoad, bunkerUnload, BUNKER_CAP,
    shipPhase(){ return shipTimeline[ti].phase; }
  };
}
