/* 资源系统：晶体矿脉 + SCV 采集往返 + 矿物账本 */
import * as THREE from 'three';
import { TAU, rand, rnd, pick, box, cyl, ring } from './core.js';
import { buildSCV } from './vehicles.js';

const CRYSTAL = 0x63e2ff;
const TRAVEL = 11.5;

export function createResources({ M, world, buildings, tex, fx, onRetire, onWear, getRateMult }){
  /* ------------------------------------------------ 矿脉 --- */
  const fields = [];
  const spots = [
    /* 主基地三座向外挪，避开重排后的兵营/维修平台 */
    { x: 88, z: 44 },
    { x: -88, z: 44 },
    { x: -8, z: -96 },
    /* 两座前进矿点：就地卸矿，不把 120 米往返算进采集周期 */
    { x: 88, z: 60, depot: { x: 104, z: 74 } },
    { x: 122, z: 90, depot: { x: 104, z: 74 } },
    { x: -124, z: -36, depot: { x: -108, z: -52 } },
    { x: -92, z: -70, depot: { x: -108, z: -52 } }
  ];

  spots.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    world.add(g);

    /* 地面矿斑 */
    const patch = new THREE.Mesh(new THREE.CircleGeometry(6.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x2ea8c8, transparent: true, opacity: 0.16, depthWrite: false }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.y = 0.06;
    g.add(patch);

    ring(g, 6.6, 0.12, 0, 0.1, 0, new THREE.MeshBasicMaterial({ color: 0x59d8f4, transparent: true, opacity: 0.5 }), 64);

    const shards = [];
    const n = 9 + i * 2;
    for (let k = 0; k < n; k++){
      const h = rand(1.8, 4.6);
      const c = new THREE.Mesh(
        new THREE.ConeGeometry(rand(0.5, 1.0), h, 5, 1),
        new THREE.MeshStandardMaterial({
          color: 0x1d6f88, metalness: 0.15, roughness: 0.22,
          emissive: CRYSTAL, emissiveIntensity: rand(0.9, 1.6),
          transparent: true, opacity: 0.92
        })
      );
      const a = i * 2.1 + k * 2.4;
      const r = rand(0.6, 4.4);
      c.position.set(Math.cos(a) * r, h * 0.5 + 0.1, Math.sin(a) * r);
      c.rotation.set(rand(-0.28, 0.28), rand(0, TAU), rand(-0.28, 0.28));
      c.castShadow = true;
      g.add(c);
      shards.push({ mesh: c, h, base: c.position.y, phase: rand(0, TAU) });
    }
    const light = new THREE.PointLight(0x53d8ff, 26, 26, 2);
    light.position.set(0, 2.6, 0);
    g.add(light);

    fields.push({ group: g, shards, light, x: s.x, z: s.z, r: 5.4,
      depot: s.depot ? new THREE.Vector3(s.depot.x, 0.55, s.depot.z) : null });
  });

  /* ------------------------------------------------ 采集车 --- */
  const depot = buildings.find(b => b.key === 'supply') || buildings[0];
  const depotPoint = (depot.workPoint ? depot.workPoint.clone() : depot.center.clone());
  depotPoint.y = 0.55;
  for (const f of fields) if (!f.depot) f.depot = depotPoint.clone();

  const wallet = { minerals: 350, rate: 0, trips: 0 };
  const harvesters = [];
  const MAX_SCV = 15;             /* 7 座矿脉约 2 辆/座 */
  /* SCV 不会被打死，但会磨损报废：累计采掘 170~230 矿，或服役 380~460 秒 */
  const MINE_LIFE = [170, 230];
  const TIME_LIFE = [380, 460];

  function makeHarvester(fieldIndex){
    const g = buildSCV();
    g.scale.setScalar(0.92);
    world.add(g);
    const f = fields[fieldIndex % fields.length];
    const home = f.depot || depotPoint;
    const h = {
      g, field: f, state: 'toField', t: 0, carry: 0,
      pos: home.clone(), speed: rand(9.5, 12.5), phase: rand(0, 10),
      home: home.clone(), target: new THREE.Vector3(),
      mined: 0, age: 0, warned: false,
      mineLife: rand(MINE_LIFE[0], MINE_LIFE[1]),
      timeLife: rand(TIME_LIFE[0], TIME_LIFE[1])
    };
    /* 载货用的晶体（采集后才显示） */
    const cargo = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.3, 5, 1),
      new THREE.MeshStandardMaterial({
        color: 0x2b7f96, emissive: CRYSTAL, emissiveIntensity: 1.6,
        metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.95
      })
    );
    cargo.position.set(0, 2.05, 1.05);
    cargo.rotation.x = 0.2;
    cargo.visible = false;
    g.add(cargo);
    h.cargo = cargo;
    nextTarget(h);
    g.position.copy(h.pos);
    harvesters.push(h);
    return h;
  }

  /* 开局 3 名采矿 SCV：收入约 77 矿/分，后续可在指挥中心补造 */
  for (let i = 0; i < 3; i++) makeHarvester(i);

  /* 指挥中心造好的 SCV 从这里出场：优先补到人最少的矿脉 */
  function addHarvester(){
    if (harvesters.length >= MAX_SCV) return null;
    let best = 0, bestN = Infinity;
    fields.forEach((f, i) => {
      const n = harvesters.reduce((a, h) => a + (h.field === f ? 1 : 0), 0);
      if (n < bestN){ bestN = n; best = i; }
    });
    const h = makeHarvester(best);
    /* 新车从主基地补给站出场，再自己开往矿点（远程矿点不凭空出现在荒野） */
    h.pos.copy(depotPoint);
    h.g.position.copy(h.pos);
    const a = harvesters.length * 1.7;
    h.pos.x += Math.cos(a) * 1.8;
    h.pos.z += Math.sin(a) * 1.8;
    h.g.position.copy(h.pos);
    return h;
  }

  /* 存档：记录每辆 SCV 的矿脉与磨损，读档后不会退回开局 3 辆 */
  function scvState(){
    return harvesters.map(h => ({
      field: Math.max(0, fields.indexOf(h.field)),
      mined: +h.mined.toFixed(1),
      age: +h.age.toFixed(1),
      mineLife: +h.mineLife.toFixed(1),
      timeLife: +h.timeLife.toFixed(1)
    }));
  }

  function restoreScv(list){
    if (!Array.isArray(list)) return;
    const data = list.slice(0, MAX_SCV);
    while (harvesters.length > data.length) retireHarvester(harvesters[harvesters.length - 1], true);
    while (harvesters.length < data.length) makeHarvester(harvesters.length);
    data.forEach((s, i) => {
      const h = harvesters[i];
      if (!h) return;
      const e = s || {};
      const fi = Number.isFinite(e.field) ? Math.abs(Math.floor(e.field)) % fields.length : i % fields.length;
      const f = fields[fi];
      if (h.field !== f){ h.field = f; h.home = f.depot || depotPoint; h.pos.copy(h.home); h.g.position.copy(h.pos); nextTarget(h); }
      h.mined = Math.max(0, Number.isFinite(e.mined) ? e.mined : 0);
      h.age = Math.max(0, Number.isFinite(e.age) ? e.age : 0);
      h.mineLife = Math.max(1, Number.isFinite(e.mineLife) ? e.mineLife : rand(MINE_LIFE[0], MINE_LIFE[1]));
      h.timeLife = Math.max(1, Number.isFinite(e.timeLife) ? e.timeLife : rand(TIME_LIFE[0], TIME_LIFE[1]));
      h.warned = false;
      h.t = 0; h.carry = 0; h.cargo.visible = false;
      h.g.position.copy(h.pos);
    });
  }

  function nextTarget(h){
    const a = rand(0, TAU), r = rand(1.2, 3.6);
    h.target.set(h.field.x + Math.cos(a) * r, 0.55, h.field.z + Math.sin(a) * r);
  }

  /* ------------------------------------------------ 更新 --- */
  const tmp = new THREE.Vector3();

  function retireHarvester(h, silent){
    const i = harvesters.indexOf(h);
    if (i < 0) return;
    harvesters.splice(i, 1);
    if (fx) fx.sparkAt(tmp.set(h.pos.x, 1.5, h.pos.z), 12, 0xffb454);
    h.g.visible = false;
    h.g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    world.remove(h.g);
    if (!silent && onRetire) onRetire(h);
  }

  function updateHarvester(h, dt, t){
    h.age += dt;
    if (h.state === 'manual'){
      const goal = h.cmdGoal;
      if (!goal){
        h.state = 'toField';
      } else {
        tmp.copy(goal).sub(h.pos);
        tmp.y = 0;
        const d = tmp.length();
        if (d < 0.6){
          h.state = 'toField';
          h.mode = 'auto';
          nextTarget(h);
        } else {
          tmp.normalize().multiplyScalar(Math.min(d, h.speed * dt));
          h.pos.add(tmp);
          h.g.rotation.y = Math.atan2(tmp.x, tmp.z);
        }
      }
    } else if (h.state === 'toField' || h.state === 'toBase'){
      const goal = h.state === 'toField' ? h.target : h.home;
      tmp.copy(goal).sub(h.pos);
      tmp.y = 0;
      const d = tmp.length();
      if (d < 0.35){
        if (h.state === 'toField'){
          h.state = 'harvest';
          h.t = 0;
        } else {
          h.state = 'deposit';
          h.t = 0;
        }
      } else {
        tmp.normalize().multiplyScalar(Math.min(d, h.speed * dt));
        h.pos.add(tmp);
        h.g.rotation.y = Math.atan2(tmp.x, tmp.z);
      }
    } else if (h.state === 'harvest'){
      h.t += dt;
      h.sparkT = (h.sparkT || 0) - dt;
      if (fx && h.sparkT <= 0){
        h.sparkT = rand(0.28, 0.5);
        fx.sparkAt(tmp.set(h.pos.x, 1.5, h.pos.z), 3, 0x7fe6ff);
      }
      const sw = t * 6 + h.phase;
      h.g.userData.armL.rotation.x = -1.0 + Math.sin(sw) * 0.5;
      h.g.userData.armR.rotation.x = -1.0 + Math.sin(sw + 1.7) * 0.5;
      if (h.t > 1.9){
        h.state = 'toBase';
        h.carry = 6;
      }
    } else if (h.state === 'deposit'){
      h.t += dt;
      if (h.t > 0.55){
        const gain = Math.max(1, Math.round(h.carry * (getRateMult ? getRateMult() : 1)));
        wallet.minerals += gain;
        wallet.trips++;
        h.mined += gain;
        h.carry = 0;
        h.state = 'toField';
        nextTarget(h);
      }
    }

    /* 磨损：累计采掘量或服役时间任一到顶就报废，由玩家补造 */
    h.wear = Math.max(h.mined / h.mineLife, h.age / h.timeLife);
    if (!h.warned && h.wear >= 0.8){
      h.warned = true;
      if (onWear) onWear(h, h.wear);
    }
    if (h.wear >= 1){
      h.retired = true;
      return;
    }

    /* 悬浮姿态 */
    const bob = Math.sin(t * 3.4 + h.phase) * 0.07;
    h.g.position.set(h.pos.x, h.pos.y + 0.35 + bob, h.pos.z);
    if (h.state === 'toField' || h.state === 'toBase' || h.state === 'manual'){
      h.g.userData.legL.rotation.x = Math.sin(t * 5 + h.phase) * 0.3;
      h.g.userData.legR.rotation.x = -Math.sin(t * 5 + h.phase) * 0.3;
    } else {
      h.g.userData.legL.rotation.x = 0;
      h.g.userData.legR.rotation.x = 0;
    }
    /* 载货时亮起货舱灯 */
    if (h.cargo) h.cargo.visible = h.carry > 0;
    h.g.visible = true;
  }

  function update(dt, t){
    for (const f of fields){
      f.shards.forEach(s => {
        s.mesh.position.y = s.base + Math.sin(t * 1.6 + s.phase) * 0.06;
        s.mesh.material.emissiveIntensity = 1.1 + Math.sin(t * 2.2 + s.phase) * 0.32;
      });
      f.light.intensity = 22 + Math.sin(t * 1.9) * 6;
    }
    for (const h of harvesters.slice()){
      updateHarvester(h, dt, t);
      if (h.retired) retireHarvester(h);
    }

    /* 估算收入速率（每分钟） */
    const rm = getRateMult ? getRateMult() : 1;
    wallet.rate = harvesters.length > 0 ? Math.round(harvesters.length * 6 * (60 / 14) * rm) : 0;
  }

  function spend(n){
    if (wallet.minerals < n) return false;
    wallet.minerals -= n;
    return true;
  }

  return { wallet, fields, harvesters, MAX_SCV, addHarvester, scvState, restoreScv, update, spend, depotPoint };
}
