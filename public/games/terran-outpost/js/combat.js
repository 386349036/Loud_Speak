/* 战斗系统：索敌、三种弹道（子弹 / 火舌 / 治疗束）、血量、死亡演出、伤害类型相克 */
import * as THREE from 'three';
import { clamp, lerp, rand, TAU } from './core.js';
import { UNIT_TYPES } from './units.js';
import { createGroundNav } from './nav.js';

/* 伤害类型 × 护甲类型 倍率（对齐 SC2 的直觉：爆炸克重甲、火焰克轻甲） */
const MULT = {
  normal:    { light: 1.0, armored: 1.0 },
  explosive: { light: 0.5, armored: 1.0 },
  fire:      { light: 1.0, armored: 0.7 }
};

const MAX_BARS = 80;
const MAX_BULLETS = 110;
const MAX_FLAMES = 8;
const MAX_BEAMS = 8;
const MAX_SCORCH = 20;

function scorchTexture(){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  rad.addColorStop(0, 'rgba(6,5,4,0.92)');
  rad.addColorStop(0.45, 'rgba(12,9,7,0.62)');
  rad.addColorStop(1, 'rgba(12,9,7,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCombat({ scene, world, camera, actors, buildings, enemies, airforce, fx, audio, onEvent }){
  const nav = createGroundNav(buildings);
  const records = new Map();          /* entity -> { hp, maxHp, armor, kind, hitAt } */
  const barSlots = [];                /* 需要画血条的实体 */
  const bullets = [];
  const flames = [];
  const beams = [];
  const scorch = [];
  let elapsed = 0;
  let kills = 0;
  let shots = 0, hits = 0, dmgDealt = 0;
  let sentries = null;                /* 栈桥哨兵（main.js 建好后注入），参与索敌/血条 */
  let tech = null;                    /* 被动科技：按兵种加伤害 */
  const mines = [];                   /* 秃鹰蜘蛛雷 */
  const flashes = new Map();          /* 受击闪白：entity -> {t, mats:[{m,c,i}]} */
  const MAX_MINES = 24;
  const mineGeo = new THREE.CylinderGeometry(0.62, 0.78, 0.24, 10);
  const mineMat = new THREE.MeshStandardMaterial({ color: 0x343b40, metalness: 0.55, roughness: 0.55 });
  const mineLamp = new THREE.MeshBasicMaterial({ color: 0xff5a4a });
  const mineRingGeo = new THREE.TorusGeometry(0.86, 0.045, 5, 18);

  /* ---------------------------------------------------- 血条实例化 --- */
  const barGeo = new THREE.PlaneGeometry(1, 1);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x0a1116, transparent: true, opacity: 0.72, depthTest: false, depthWrite: false
  });
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false
  });
  const barBg = new THREE.InstancedMesh(barGeo, bgMat, MAX_BARS);
  const barFill = new THREE.InstancedMesh(barGeo, fillMat, MAX_BARS);
  for (const m of [barBg, barFill]){
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.renderOrder = 20;
    m.count = MAX_BARS;
    scene.add(m);
  }
  barFill.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARS * 3), 3);
  const dummy = new THREE.Object3D();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  /* 复用临时对象：血条/弹道每帧要处理几十个实体，避免持续分配触发 GC 卡顿 */
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpDirZ = new THREE.Vector3(0, 0, 1);
  const tmpColor = new THREE.Color();
  const barPos = new THREE.Vector3();
  const barRight = new THREE.Vector3();
  const barEnts = [];
  const barRecs = [];
  for (let i = 0; i < MAX_BARS; i++){
    barBg.setMatrixAt(i, hidden);
    barFill.setMatrixAt(i, hidden);
  }

  /* ------------------------------------------------------ 子弹池 --- */
  const bulletMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.13, 0.13, 1.15),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0 }),
    MAX_BULLETS
  );
  bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bulletMesh.frustumCulled = false;
  bulletMesh.count = MAX_BULLETS;
  scene.add(bulletMesh);
  for (let i = 0; i < MAX_BULLETS; i++) bulletMesh.setMatrixAt(i, hidden);
  const bulletSlots = new Array(MAX_BULLETS).fill(null);

  /* -------------------------------------------------------- 火舌 --- */
  const flameGeo = new THREE.ConeGeometry(1.0, 1, 14, 1, true);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.5);
  for (let i = 0; i < MAX_FLAMES; i++){
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8a3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(flameGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    flames.push({ mesh, mat, t: 0, life: 0, from: new THREE.Vector3(), dir: new THREE.Vector3() });
  }

  /* ------------------------------------------------------ 治疗束 --- */
  const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6, 1, true);
  beamGeo.translate(0, 0.5, 0);
  for (let i = 0; i < MAX_BEAMS; i++){
    const mat = new THREE.MeshBasicMaterial({
      color: 0x7fffd0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(beamGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    beams.push({ mesh, mat, t: 0, life: 0 });
  }

  /* ------------------------------------------------------ 焦痕 --- */
  const scorchTex = scorchTexture();
  for (let i = 0; i < MAX_SCORCH; i++){
    const mat = new THREE.MeshBasicMaterial({
      map: scorchTex, transparent: true, opacity: 0, depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.04;
    mesh.visible = false;
    world.add(mesh);
    scorch.push({ mesh, mat, t: 0, life: 0 });
  }

  /* ------------------------------------------------ 目标注册表 --- */
  function recFor(ent, kind){
    let r = records.get(ent);
    if (r) return r;
    if (kind === 'unit'){
      const spec = UNIT_TYPES[ent.kind] || UNIT_TYPES.marine;
      r = { kind: 'unit', hp: spec.hp, maxHp: spec.hp, armor: spec.armor || 'light' };
    } else if (kind === 'enemy'){
      r = { kind: 'enemy', hp: ent.hp, maxHp: ent.maxHp, armor: ent.armor };
    } else {
      r = { kind: 'building', hp: 1400, maxHp: 1400, armor: 'armored' };
    }
    r.hitAt = -99;
    records.set(ent, r);
    return r;
  }

  function posOf(ent, r){
    if (r.kind === 'building') return new THREE.Vector3(ent.center.x, 9, ent.center.z);
    return ent.g.position;
  }

  function isAlive(ent, r){
    if (r.kind === 'enemy') return !ent.dead;
    if (r.kind === 'unit') return r.hp > 0 && ent.state !== 'hidden' && ent.state !== 'dead' && ent.state !== 'garrison' && ent.g.visible;
    return true;
  }

  /* 地堡掩护：附近步兵受到的伤害降低 20% */
  function bunkerCover(ent){
    if (!ent || !ent.g || !['marine', 'firebat', 'medic'].includes(ent.kind)) return 1;
    for (const b of buildings){
      if (b.key !== 'bunker' || b.destroyed) continue;
      const r = (b.radius || 10) + 4;
      const dx = ent.g.position.x - b.center.x;
      const dz = ent.g.position.z - b.center.z;
      if (dx * dx + dz * dz <= r * r) return 0.8;
    }
    return 1;
  }

  /* -------------------------------------------------------- 伤害 --- */
  /* 敌军受击时短暂白闪；敌人材质每个实体独立，不会串色 */
  function flashEnemy(ent){
    if (!ent || !ent.g || flashes.has(ent)) return;
    const mats = [];
    ent.g.traverse(o => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material;
      if (m.emissive && !mats.some(x => x.m === m)) mats.push(m);
    });
    if (!mats.length) return;
    const saved = mats.map(m => ({ m, c: m.emissive.getHex(), i: m.emissiveIntensity ?? 1 }));
    for (const m of mats){ m.emissive.setHex(0xffffff); m.emissiveIntensity = 0.85; }
    flashes.set(ent, { t: 0.12, mats: saved });
  }

  function updateFlashes(dt){
    for (const [ent, f] of flashes){
      f.t -= dt;
      if (f.t > 0) continue;
      for (const s of f.mats){ s.m.emissive.setHex(s.c); s.m.emissiveIntensity = s.i; }
      flashes.delete(ent);
    }
  }

  function damage(ent, amount, type, from){
    let r = records.get(ent);
    if (!r) r = recFor(ent, ent.center ? 'building' : (ent.spec ? 'enemy' : 'unit'));
    if (ent.destroyed) return;
    if (!isAlive(ent, r)) return;
    /* 主巢护盾：子巢未清空 / 第 6 波未到之前，攻击只溅出紫色火花 */
    if (ent.isHive && (ent.shielded || !ent.awake)){
      r.hitAt = elapsed;
      const hpPos = posOf(ent, r).clone().setY(8);
      fx.sparkAt(hpPos, 5, 0xb45cff);
      onEvent && onEvent({ type: 'shield', ent, pos: hpPos.clone() });
      return;
    }
    const mult = (MULT[type] || MULT.normal)[r.armor] ?? 1;
    const dmg = Math.max(1, Math.round(amount * mult * bunkerCover(ent)));
    r.hp -= dmg;
    if (ent.spec) ent.hp = r.hp;          /* 敌军对象上同步一份，方便外部读取 */
    dmgDealt += dmg;
    r.hitAt = elapsed;
    const p = posOf(ent, r).clone();
    p.y += r.kind === 'building' ? 2 : 1.1;
    fx.sparkAt(p, 5, type === 'fire' ? 0xff9a3a : 0xffd27a);
    if (r.kind === 'enemy') flashEnemy(ent);
    onEvent && onEvent({
      type: 'hit', ent, kind: r.kind, amount: dmg, dtype: type,
      pos: p.clone(), killed: r.hp <= 0
    });
    if (r.hp <= 0) kill(ent, r);
    else if (r.hp / r.maxHp > 0.3 && r.kind === 'building') { /* 结构耐久，暂不破坏 */ }

    /* 空中虫族被飞机咬了会反咬：记下攻击者并进入 aggro 状态 */
    if (r.kind === 'enemy' && ent.air && from && from.alt !== undefined && !ent.dead){
      ent.target = from;
      ent.aggro = 6;
    }
  }

  function kill(ent, r){
    const p = posOf(ent, r).clone();
    if (r.kind === 'enemy'){
      ent.dead = true;
      ent.deadT = 0;
      kills++;
      fx.sparkAt(p.clone().setY(p.y - 0.4), 16, 0x8fd4ff);
      dropScorch(ent.g.position);
      if (audio && audio.hit) audio.hit(ent.g.position);
      onEvent && onEvent({ type: 'kill', ent, r });
    } else if (r.kind === 'unit'){
      ent.state = 'dead';
      ent.deadT = 0;
      fx.sparkAt(p, 12, 0xff7a5a);
      dropScorch(ent.g.position);
      onEvent && onEvent({ type: 'unitDown', ent, r });
      if (ent.isVehicle) onEvent && onEvent({ type: 'vehicleDown', ent, r });
    } else {
      /* 指挥中心是终局目标：打到 0 血直接失守；其他建筑仍保持可修复 */
      if (ent.key === 'command'){
        r.hp = 0;
        ent.destroyed = true;
        fx.sparkAt(p, 46, 0xff5a3a);
        fx.sparkAt(p.clone().setY(p.y + 3), 30, 0xffb454);
        if (audio && audio.explode) audio.explode(p);
        onEvent && onEvent({ type: 'defeat', ent, r });
        return;
      }
      r.hp = 0;
      ent.destroyed = true;
      ent.removeAt = performance.now() + 900;
      if (ent.group) ent.group.visible = false;
      else if (ent.g) ent.g.visible = false;
      fx.sparkAt(p, 62, 0xff5a3a);
      fx.sparkAt(p.clone().setY(p.y + 3), 36, 0xffb454);
      fx.steamAt(p);
      if (audio && audio.explode) audio.explode(p);
      onEvent && onEvent({ type: 'buildingDestroyed', ent, r });
    }
    r.hp = Math.max(0, r.hp);
  }

  function dropScorch(v){
    const slot = scorch.find(s => s.life <= 0) || scorch[0];
    slot.mesh.position.set(v.x, 0.04, v.z);
    slot.mesh.rotation.z = rand(0, TAU);
    slot.mesh.scale.setScalar(rand(0.8, 1.5));
    slot.mesh.visible = true;
    slot.t = 0;
    slot.life = 26;
    slot.mat.opacity = 0.7;
  }

  /* ------------------------------------------------ 三种弹道发射 --- */
  /* ---------- 目标速度缓存 + 提前量解算 ---------- */
  const velCache = new Map();
  const ZERO_V = new THREE.Vector3();

  function updVel(ent, dt){
    if (!ent || !ent.g) return;
    const p = ent.g.position;
    let c = velCache.get(ent);
    if (!c){ velCache.set(ent, { p: p.clone(), v: new THREE.Vector3() }); return; }
    if (dt > 1e-4) c.v.copy(p).sub(c.p).divideScalar(dt);
    c.p.copy(p);
  }

  function velOf(ent){
    const c = velCache.get(ent);
    if (!c) return ZERO_V;
    /* 平滑一下，避免单帧抖动把提前量甩飞 */
    if (c.v.lengthSq() > 400) c.v.setLength(20);
    return c.v;
  }

  /* 迭代求交会点：aim = P + V*t，t = |aim - from| / speed */
  function leadAim(from, tp, vel, speed){
    const aim = tp.clone();
    const s = Math.max(8, speed);
    let t = from.distanceTo(tp) / s;
    for (let i = 0; i < 3; i++){
      aim.copy(tp).addScaledVector(vel, Math.min(t, 2.2));
      t = from.distanceTo(aim) / s;
    }
    return aim;
  }

  function muzzleOf(ent){
    if (ent.muzzle){
      return ent.muzzle.getWorldPosition(new THREE.Vector3());
    }
    const p = ent.g.position.clone();
    const isAir = ent.alt !== undefined;
    p.y += isAir ? 0 : 2.5;
    const f = new THREE.Vector3(Math.sin(ent.g.rotation.y), 0, Math.cos(ent.g.rotation.y));
    return p.add(f.multiplyScalar(0.9));
  }

  /* 从任意点开火（导弹塔等固定防御用） */
  function fireFromPoint(from, target, dmg, type, speed, big){
    const idx = bulletSlots.indexOf(null);
    if (idx < 0) return false;
    const r = recOf(target);
    const tp = posOf(target, r).clone();
    tp.y += 1.0;
    const speedV = speed || 80;
    const aim = leadAim(from, tp, velOf(target), speedV);
    const b = {
      pos: from.clone(), dir: aim.clone().sub(from).normalize(), speed: speedV,
      dmg, type: type || 'normal', big: !!big, target, trec: r, life: 0, idx
    };
    bullets.push(b);
    bulletSlots[idx] = b;
    shots++;
    fx.sparkAt(from, 3, 0xffd18a);
    return true;
  }

  function fireBullet(ent, target, r, spec, opts){
    const idx = bulletSlots.indexOf(null);
    if (idx < 0) return false;
    const from = muzzleOf(ent);
    const to = posOf(target, r).clone();
    to.y += r.kind === 'enemy' ? 0.9 : 1.2;
    const speed = (opts && opts.speed) || 62;
    /* 预判提前量：按目标当前速度算出交会点，移动目标不再必然落空 */
    const aim = leadAim(from, to, velOf(target), speed);
    const dir = aim.clone().sub(from).normalize();
    const b = {
      pos: from.clone(), dir, speed,
      dmg: ((opts && opts.dmg) || spec.dmg) + (tech && ent.kind ? tech.bonusFor(ent.kind) : 0), type: spec.dmgType,
      bonus: (opts && opts.bonus) || 0,
      splash: (opts && opts.splash) || null,
      big: !!(opts && opts.big), target, trec: r, life: 0, idx
    };
    bullets.push(b);
    bulletSlots[idx] = b;
    shots++;
    /* 枪口闪光 + 后坐 */
    fx.sparkAt(from, 3, 0xffd18a);
    return true;
  }

  function fireFlame(ent, spec){
    shots++;
    /* 扇形范围判定：朝向前方 3.6 米、±35° 内全部命中 */
    const dir = new THREE.Vector3(Math.sin(ent.g.rotation.y), 0, Math.cos(ent.g.rotation.y));
    const origin = ent.g.position.clone();
    let hit = 0;
    for (const e of enemies.list){
      if (e.dead) continue;
      if (e.air) continue;                 /* 火焰喷不到空中单位 */
      const d = e.g.position.clone().sub(origin);
      const dist = d.length();
      if (dist > spec.atkRange + 1.2) continue;
      d.y = 0;
      if (d.normalize().dot(dir) < 0.72) continue;
      const r = recFor(e, 'enemy');
      damage(e, spec.dmg + (tech && ent.kind ? tech.bonusFor(ent.kind) : 0), 'fire', ent);
      hits++;
      hit++;
    }
    /* 视觉：一个快速膨胀的橙色锥体 */
    const slot = flames.find(f => f.life <= 0) || flames[0];
    slot.mesh.position.copy(muzzleOf(ent));
    slot.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    slot.mesh.visible = true;
    slot.t = 0;
    slot.life = 0.3;
    slot.mat.opacity = 0.5;
    slot.dir.copy(dir);
    fx.sparkAt(muzzleOf(ent).addScaledVector(dir, 1.4), 7, 0xff7a2a);
    if (hit && audio && audio.hit) audio.hit(origin);
  }

  function fireHeal(ent, spec){
    let best = null, bestFrac = 0.999, bestOff = 1.6, bestHalf = false;
    const consider = (p, off, half) => {
      if (p === ent || p.state === 'hidden' || p.state === 'dead' || !p.g || !p.g.visible) return;
      const r = recFor(p, 'unit');
      if (r.hp >= r.maxHp) return;
      const dx = p.g.position.x - ent.g.position.x;
      const dz = p.g.position.z - ent.g.position.z;
      if (Math.hypot(dx, dz) > spec.atkRange + 1) return;
      const frac = r.hp / r.maxHp;
      if (frac < bestFrac){ bestFrac = frac; best = p; bestOff = off; bestHalf = half; }
    };
    for (const p of actors.people) consider(p, 1.6, false);
    if (sentries) for (const s of sentries.list) consider(s, 2.4, true);
    if (!best) return false;
    const r = recFor(best, 'unit');
    const amount = bestHalf ? spec.heal * 0.5 : spec.heal;
    r.hp = Math.min(r.maxHp, r.hp + amount);
    const slot = beams.find(b => b.life <= 0) || beams[0];
    const from = muzzleOf(ent);
    const to = best.g.position.clone();
    to.y += bestOff;
    const d = to.clone().sub(from);
    slot.mesh.position.copy(from);
    slot.mesh.scale.set(1, d.length(), 1);
    slot.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    slot.mesh.visible = true;
    slot.t = 0;
    slot.life = 0.28;
    slot.mat.opacity = 0.85;
    return true;
  }

  /* 空闲医疗兵自动寻找附近伤员；玩家下了移动/攻击指令时不动 */
  function woundedNear(ent, radius){
    let best = null, bd = Infinity;
    const consider = p => {
      if (p === ent || p.state === 'hidden' || p.state === 'dead' || !p.g || !p.g.visible) return;
      const r = recFor(p, 'unit');
      if (r.hp >= r.maxHp) return;
      const dx = p.g.position.x - ent.g.position.x;
      const dz = p.g.position.z - ent.g.position.z;
      const d = Math.hypot(dx, dz);
      if (d > radius || d >= bd) return;
      bd = d;
      best = p;
    };
    for (const p of actors.people) consider(p);
    if (sentries) for (const s of sentries.list) consider(s);
    return best;
  }

  function stepMedicTo(p, target, dt, spec){
    const dx = target.g.position.x - p.g.position.x;
    const dz = target.g.position.z - p.g.position.z;
    const d = Math.hypot(dx, dz);
    const stop = Math.max(2.5, spec.atkRange - 2);
    if (d < 0.001) return;
    p.g.rotation.y = Math.atan2(dx, dz);
    if (d <= stop) return;
    const step = Math.min(d - stop, spec.speed * dt);
    nav.step(p.g.position, dx / d * step, dz / d * step, 0.75);
    p.walkPhase = (p.walkPhase || 0) + dt * 9;
    const legs = p.g.userData && p.g.userData.legs;
    if (legs){
      legs[0].rotation.x = Math.sin(p.walkPhase) * 0.5;
      legs[1].rotation.x = -Math.sin(p.walkPhase) * 0.5;
    }
  }

  /* ------------------------------------------------------ 空中单位 --- */
  const YAMATO_CHARGE = 2.4;

  /* ---- 大和炮演出：蓄能光团 + 白色主炮光束 + 炮口闪光 ---- */
  const yamato = {
    orb: new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ),
    halo: new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 20, 14),
      new THREE.MeshBasicMaterial({
        color: 0x6fd9ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ),
    beam: new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.78, 1, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x86ccff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ),
    core: new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xd8f4ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ),
    flash: new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ),
    impact: new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xcfe9ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ),
    light: new THREE.PointLight(0xcfeaff, 0, 260, 2),
    chargeLight: new THREE.PointLight(0x9fe4ff, 0, 90, 2),
    active: 0,            /* 光束剩余时间 */
    dur: 0.52,
    fires: 0,
    chargeTarget: null
  };
  yamato.orb.add(yamato.halo);
  yamato.orb.visible = false;
  yamato.beam.visible = false;
  yamato.core.visible = false;
  yamato.flash.visible = false;
  yamato.light.visible = false;
  yamato.chargeLight.visible = false;
  scene.add(yamato.orb, yamato.beam, yamato.core, yamato.flash, yamato.impact, yamato.light, yamato.chargeLight);

  const _mz = new THREE.Vector3();
  const _aim = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  const _dir = new THREE.Vector3();

  function muzzleWorld(a, out){
    const m = a.g.userData.yamatoMuzzle;
    if (m){ m.getWorldPosition(out); return out; }
    return out.set(a.pos.x, a.alt - 2.6, a.pos.z);
  }

  function yamatoFire(a, target){
    muzzleWorld(a, _mz);
    _aim.copy(target.g.position); _aim.y += 1.2;
    _dir.copy(_aim).sub(_mz);
    const len = _dir.length();
    if (len < 0.001) return;
    _dir.normalize();

    const mid = _mz.clone().addScaledVector(_dir, len * 0.5);
    for (const m of [yamato.beam, yamato.core]){
      m.position.copy(mid);
      m.quaternion.setFromUnitVectors(_up, _dir);
      m.scale.set(1, len, 1);
      m.visible = true;
    }
    yamato.core.scale.set(1, len, 1);
    yamato.flash.position.copy(_mz);
    yamato.flash.visible = true;
    yamato.impact.position.copy(_aim);
    yamato.impact.visible = true;
    yamato.light.position.copy(_mz);
    yamato.light.visible = true;
    yamato.light.intensity = 900;
    yamato.active = yamato.dur;
    yamato.fires++;

    yamato.orb.visible = false;
    yamato.chargeTarget = null;

    /* 舰体后坐震动 + 炮口/弹着点粒子 */
    a.shake = 0.85;
    if (fx){
      fx.sparkAt(_mz.clone(), 26, 0xffd9a0);
      fx.sparkAt(_aim.clone(), 34, 0xbfe8ff);
    }
    if (audio) audio.yamatoFire(_mz);
  }

  function updateYamatoFx(dt){
    /* 蓄能光团跟随炮口 */
    const a = yamato.chargeTarget;
    if (a && a.chargeT > 0 && !a.dead){
      const k = 1 - a.chargeT / YAMATO_CHARGE;
      muzzleWorld(a, _mz);
      yamato.orb.visible = true;
      yamato.orb.position.copy(_mz);
      const pulse = 1 + Math.sin(a.chargeT * 26) * 0.1;
      yamato.orb.scale.setScalar((0.28 + k * 0.72) * pulse);
      yamato.orb.material.opacity = 0.16 + k * 0.34;
      yamato.halo.scale.setScalar(1.05 + Math.sin(a.chargeT * 18) * 0.12);
      yamato.halo.material.opacity = 0.03 + k * 0.1;
      yamato.chargeLight.visible = true;
      yamato.chargeLight.position.copy(_mz);
      yamato.chargeLight.intensity = 12 + k * 60 + Math.sin(a.chargeT * 26) * (4 + k * 10);
      a.shake = Math.max(a.shake || 0, 0.05 + k * 0.14);
    } else if (yamato.orb.visible){
      yamato.orb.visible = false;
      yamato.chargeLight.visible = false;
      yamato.chargeTarget = null;
    }

    /* 光束衰减 */
    if (yamato.active > 0){
      yamato.active -= dt;
      const k = Math.max(0, yamato.active / yamato.dur);
      yamato.beam.material.opacity = 0.78 * k * k;
      yamato.core.material.opacity = k;
      const w = 0.9 + (1 - k) * 2.0;
      yamato.beam.scale.x = w;
      yamato.beam.scale.z = w;
      yamato.flash.material.opacity = k * k * 0.65;
      yamato.impact.material.opacity = k * k * 0.9;
      yamato.impact.scale.setScalar(1.35 - (1 - k) * 0.9);
      yamato.flash.scale.setScalar(1.55 - (1 - k) * 1.0);
      yamato.light.intensity = 900 * k;
      if (yamato.active <= 0){
        yamato.beam.visible = false;
        yamato.core.visible = false;
        yamato.impact.visible = false;
        yamato.flash.visible = false;
        yamato.light.visible = false;
      }
    }
  }

  /* 空中单位索敌：只看水平距离（飞机在 30 米高空，用三维距离永远够不到地面目标）
     preferAir=true 时优先挑敌方空中单位，没有空中目标再退回任意目标 */
  function nearestEnemyFlat(a, range, preferAir){
    let best = null, bd = range * range;
    let airBest = null, airBd = range * range;
    for (const e of enemies.list){
      if (e.dead) continue;
      const dx = e.g.position.x - a.pos.x;
      const dz = e.g.position.z - a.pos.z;
      const d = dx * dx + dz * dz;
      if (d < bd){ bd = d; best = e; }
      if (e.air && d < airBd){ airBd = d; airBest = e; }
    }
    return (preferAir && airBest) ? airBest : best;
  }

  function updateAir(dt){
    if (!airforce) return;
    for (const a of airforce.list){
      if (a.dead || a.state === 'crash') continue;
      const spec = UNIT_TYPES[a.kind];
      if (!spec || spec.proj !== 'bullet') continue;      /* 运输舰不武装 */
      const rec = recFor(a, 'unit');
      if (rec.hp <= 0) continue;

      a.cdT = (a.cdT || 0) - dt;

      let target = a.attackTarget && !a.attackTarget.dead ? a.attackTarget : null;
      if (!target){
        a.attackTarget = null;
        target = nearestEnemyFlat(a, a.kind === 'battlecruiser' ? 72 : 46, a.kind === 'viking');
      }
      if (!target) continue;

      const tp = target.g.position;
      const flat = new THREE.Vector3(tp.x - a.pos.x, 0, tp.z - a.pos.z);
      const dist = flat.length();
      const want = Math.atan2(flat.x, flat.z);
      a.yaw += clamp(((want - a.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -dt * 1.6, dt * 1.6);

      /* 进入射程才开火，否则压上去（交给 aircraft 的飞行逻辑） */
      if (dist > spec.atkRange){
        a.target.set(tp.x, 0, tp.z);
        a.mode = 'goto';
        if (a.state === 'parked' || a.state === 'climb') airforce.takeOff(a);
        continue;
      }
      a.target.copy(a.pos);
      a.mode = 'hover';
      if (a.kind === 'battlecruiser'){
        /* 战列巡航舰：三座激光副炮 + 大和炮（蓄能后一发重击） */
        a.yamatoT = (a.yamatoT || 0) - dt;
        a.chargeT = a.chargeT || 0;
        if (a.chargeT > 0){
          a.chargeT -= dt;
          if (yamato.chargeTarget !== a) yamato.chargeTarget = a;
          const ring = a.g.userData.turrets && a.g.userData.turrets[2]?.userData.chargeRing;
          if (ring){
            ring.material.emissiveIntensity = 0.4 + (1 - a.chargeT / YAMATO_CHARGE) * 3.2;
            ring.scale.setScalar(1 + (1 - a.chargeT / YAMATO_CHARGE) * 0.35);
          }
          if (a.chargeT <= 0){
            if (ring){ ring.material.emissiveIntensity = 0.4; ring.scale.setScalar(1); }
            fireBullet(a, target, recFor(target, 'enemy'), spec, { dmg: 120, speed: 90, big: true });
            yamatoFire(a, target);
            if (audio) audio.explode(a.pos);
            a.yamatoT = 22;
          }
          continue;
        }
        if (a.yamatoT <= 0 && dist < 30){
          a.chargeT = YAMATO_CHARGE;
          yamato.chargeTarget = a;
          if (audio) audio.yamatoCharge(YAMATO_CHARGE, a.pos);
          continue;
        }
        if (a.cdT > 0) continue;
        a.cdT = 0.42;
        a.barrelI = ((a.barrelI || 0) + 1) % 3;
        fireBullet(a, target, recFor(target, 'enemy'), spec, { dmg: 6, speed: 88 });
        continue;
      }
      if (a.cdT > 0) continue;
      a.cdT = spec.cd;
      fireBullet(a, target, recFor(target, 'enemy'), spec);
    }
  }

  /* ------------------------------------------------------ 索敌 AI --- */
  function nearestEnemy(p, range, allowAir, includeStructures = false){
    let best = null, bd = range * range;
    for (const e of enemies.list){
      if (e.dead) continue;
      if (e.air && !allowAir) continue;
      if ((e.isNest || e.isHive) && !includeStructures) continue;
      const d = e.g.position.distanceToSquared(p.g.position);
      if (d < bd){ bd = d; best = e; }
    }
    return best;
  }

  /* ------------------------------------------------ 载具 / 地雷 --- */
  function splashAt(point, base, bonus, type, src, radii, fracs, skip){
    const rr = radii || [1.5, 1.5, 1.5];
    const ff = fracs || [1, 0, 0];
    for (const e of enemies.list){
      if (e.dead || e.isNest || e.air || e === skip) continue;
      const d = Math.hypot(e.g.position.x - point.x, e.g.position.z - point.z);
      let f = 0;
      if (d <= rr[0]) f = ff[0];
      else if (rr[1] !== undefined && d <= rr[1]) f = ff[1];
      else if (rr[2] !== undefined && d <= rr[2]) f = ff[2];
      if (f <= 0) continue;
      const r = recFor(e, 'enemy');
      let dmg = base * f;
      if (bonus && r.armor === 'armored') dmg += bonus * f;
      damage(e, dmg, type, src);
    }
  }

  function toggleSiege(v){
    if (!v || v.kind !== 'tank' || v.state === 'dead') return null;
    if (v.siegeT > 0) return null;                 /* 变形中 */
    const spec = UNIT_TYPES.tank;
    v.siege = !v.siege;
    v.siegeT = spec.siege.transform;
    v.goal = null;
    v.attackMove = false;
    v.attackTarget = null;
    if (v.state === 'drive') v.state = 'park';
    return v.siege;
  }

  function makeMine(x, z){
    const g = new THREE.Group();
    const disc = new THREE.Mesh(mineGeo, mineMat);
    disc.position.y = 0.12; disc.castShadow = true; g.add(disc);
    const ring = new THREE.Mesh(mineRingGeo, mineLamp);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mineLamp);
    lamp.position.y = 0.3; g.add(lamp);
    /* 细天线 + 顶端警示灯：夜里也能一眼看到雷区 */
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), mineLamp);
    mast.position.y = 0.78; g.add(mast);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mineLamp);
    tip.position.y = 1.26; g.add(tip);
    g.position.set(x, 0.02, z);
    world.add(g);
    return g;
  }

  function layMine(v){
    if (!v || v.kind !== 'vulture' || v.state === 'dead' || v.mineCharges <= 0) return false;
    if (mines.length >= MAX_MINES) return false;
    const yaw = v.g.rotation.y;
    const x = v.g.position.x - Math.sin(yaw) * 1.5;
    const z = v.g.position.z - Math.cos(yaw) * 1.5;
    /* 同一地点不重复埋雷，避免连按 M 浪费雷 */
    for (const m of mines){
      const dx = m.g.position.x - x, dz = m.g.position.z - z;
      if (dx * dx + dz * dz < 1.44) return false;
    }
    const g = makeMine(x, z);
    mines.push({ g, t: 0, armed: false });
    v.mineCharges--;
    if (fx) fx.sparkAt(new THREE.Vector3(x, 0.4, z), 8, 0xffb454);
    return true;
  }

  function explodeMine(m, i){
    const p = m.g.position.clone();
    splashAt(p, 80, 0, 'normal', null, [1.2, 1.9, 2.5], [1, 0.6, 0.3]);
    if (fx){
      fx.sparkAt(p.clone().setY(1.2), 26, 0xffb454);
      fx.sparkAt(p.clone().setY(0.6), 12, 0x8fd4ff);
      if (fx.steamAt) fx.steamAt(p.clone().setY(0.5));
    }
    if (audio && audio.explode) audio.explode(p);
    for (const ch of m.g.children){
      if (ch.geometry && ch.geometry !== mineGeo && ch.geometry !== mineRingGeo) ch.geometry.dispose();
    }
    world.remove(m.g);
    mines.splice(i, 1);
  }

  function updateMines(dt){
    for (let i = mines.length - 1; i >= 0; i--){
      const m = mines[i];
      m.t += dt;
      const ring = m.g.children[1];
      if (ring) ring.material = mineLamp;
      if (m.t < 3){
        m.g.children[2].scale.setScalar(0.7 + Math.sin(m.t * 9) * 0.25);
        continue;
      }
      if (!m.armed){
        m.armed = true;
        m.g.children[2].scale.setScalar(1);
      }
      let best = null, bd = 2.8 * 2.8;
      for (const e of enemies.list){
        if (e.dead || e.air || e.isNest) continue;
        const d = (e.g.position.x - m.g.position.x) ** 2 + (e.g.position.z - m.g.position.z) ** 2;
        if (d < bd){ bd = d; best = e; }
      }
      if (best) explodeMine(m, i);
    }
  }

  function mineState(){
    return mines.map(m => ({ pos: [m.g.position.x, m.g.position.z], t: m.t }));
  }

  function restoreMines(list){
    for (const m of mines){
      for (const ch of m.g.children){
        if (ch.geometry && ch.geometry !== mineGeo && ch.geometry !== mineRingGeo) ch.geometry.dispose();
      }
      world.remove(m.g);
    }
    mines.length = 0;
    for (const it of list || []){
      if (!it || !Array.isArray(it.pos)) continue;
      const g = makeMine(it.pos[0], it.pos[1]);
      mines.push({ g, t: it.t || 0, armed: (it.t || 0) >= 3 });
    }
  }

  function updateVehicles(dt){
    for (const v of actors.tanks || []){
      if (v.state === 'dead') continue;
      const spec = UNIT_TYPES[v.kind];
      if (!spec) continue;
      v.cdT = (v.cdT || 0) - dt;
      let target = null;
      if (v.attackTarget && !v.attackTarget.dead && isAlive(v.attackTarget, recOf(v.attackTarget))){
        target = v.attackTarget;
      } else {
        v.attackTarget = null;
        target = nearestEnemy(v, v.attackMove ? 34 : 26, false, true);
      }
      if (!target){
        v.aimYaw = undefined;
        v.attackMove = false;
        continue;
      }
      const tr = recOf(target);
      if (!isAlive(target, tr)){ v.attackTarget = null; continue; }
      const tp = posOf(target, tr);
      const dx = tp.x - v.g.position.x;
      const dz = tp.z - v.g.position.z;
      const dist = Math.hypot(dx, dz);
      v.aimYaw = Math.atan2(dx, dz);

      const siegeNow = v.siege && v.siegeT <= 0;
      const range = siegeNow ? spec.siege.atkRange : spec.atkRange;
      const pad = target.isHive ? (target.radius || 16) * 0.8
        : target.isNest ? (target.radius || 5.4) * 0.8 : 0;
      if (dist > range * 0.92 + pad){
        /* 秃鹰会自己贴上去；坦克只在攻击移动时慢慢逼近，攻城形态绝不移动 */
        if (!v.siege && v.siegeT <= 0 && v.state !== 'drive' && (v.kind === 'vulture' || v.attackMove)){
          v.goal = new THREE.Vector3(tp.x, 0, tp.z);
          v.state = 'drive';
          v.autoDrive = true;
        }
        continue;
      }
      if (v.siegeT > 0) continue;                  /* 变形期间不能开火 */
      if (v.state === 'drive' && (v.attackMove || v.autoDrive)){
        v.state = 'park';
        v.goal = null;
        v.autoDrive = false;
      }
      if (v.cdT > 0 || !isAlive(target, tr)) continue;
      const isS = siegeNow;
      const ok = fireBullet(v, target, tr, spec, {
        dmg: isS ? spec.siege.dmg : spec.dmg,
        bonus: isS ? spec.siege.bonusArmored : spec.bonusArmored,
        big: isS,
        splash: isS ? spec.siege.splash : null,
        speed: isS ? 58 : 72
      });
      if (ok){
        v.cdT = isS ? spec.siege.cd : spec.cd;
        v.recoil = 1;
        if (audio) (isS ? audio.explode(v.g.position) : audio.hit(v.g.position));
      }
    }
  }

  function updateUnits(dt){
    const AGGRO = 26;
    for (const p of actors.people){
      if (p.state === 'hidden' || p.state === 'garrison') continue;
      if (p.state === 'dead'){
        p.deadT = (p.deadT || 0) + dt;
        const k = Math.min(1, p.deadT / 0.7);
        p.g.rotation.x = -k * 1.45;
        p.g.position.y = -k * 0.2;
        if (p.deadT > 3.4){
          p.state = 'hidden';
          p.wait = rand(18, 30);
          p.g.visible = false;
          p.g.rotation.x = 0;
          p.g.position.y = 0;
          p.engage = false;
          const r = records.get(p);
          if (r) r.hp = r.maxHp;
        }
        continue;
      }
      const spec = UNIT_TYPES[p.kind];
      if (!spec) continue;
      const r = recFor(p, 'unit');
      if (r.hp <= 0) continue;

      p.cdT = (p.cdT || 0) - dt;

      if (spec.proj === 'heal'){
        p.engage = false;
        /* 空闲时自己去找附近伤员；玩家正在下达移动命令时不抢操作 */
        if ((p.state === 'guard' || p.state === 'idle') && !p.cmdPath && !p.attackTarget){
          const hurt = woundedNear(p, 26);
          if (hurt) stepMedicTo(p, hurt, dt, spec);
        }
        if (p.cdT <= 0 && fireHeal(p, spec)) p.cdT = spec.cd;
        continue;
      }

      /* A 键攻击移动 / 指定目标：优先打指定目标，其次按更大的搜索半径主动接敌 */
      let target = null;
      if (p.attackTarget && !p.attackTarget.dead && (!p.attackTarget.air || spec.canHitAir)) target = p.attackTarget;
      else {
        p.attackTarget = null;
        const range = p.attackMove ? 34 : AGGRO;
        target = nearestEnemy(p, range, !!spec.canHitAir, true);
        /* 普通待命/巡逻只打身边；攻击移动会一路打过去 */
        if (target && !p.attackMove){
          const dd = target.g.position.distanceTo(p.g.position);
          if (dd > AGGRO) target = null;
        }
      }
      if (!target){
        p.engage = false;
        continue;
      }
      /* 进入交战：停下手上的巡逻/行进，朝目标压上去 */
      p.engage = true;
      const d = tmpA.subVectors(target.g.position, p.g.position);
      d.y = 0;
      const dist = d.length();
      /* 巢穴/主巢按外缘算距离，避免步兵走进模型内部 */
      const pad = target.isHive ? (target.radius || 16) * 0.8
        : target.isNest ? (target.radius || 5.4) * 0.8 : 0;
      p.g.rotation.y = Math.atan2(d.x, d.z);
      if (dist > spec.atkRange * 0.88 + pad){
        const step = Math.min(spec.speed * 0.85 * dt, Math.max(0, dist - spec.atkRange * 0.82 - pad));
        if (step > 0) nav.step(p.g.position, (d.x / dist) * step, (d.z / dist) * step, 0.75);
        continue;
      }
      if (p.cdT > 0) continue;
      p.cdT = spec.cd;
      if (spec.proj === 'bullet') fireBullet(p, target, recFor(target, 'enemy'), spec);
      else fireFlame(p, spec);
    }
  }

  function recOf(ent){
    const r = records.get(ent);
    if (r) return r;
    return recFor(ent, ent.center ? 'building' : (ent.kind && ent.spec ? 'enemy' : 'unit'));
  }

  function updateEnemies(dt){
    for (const e of enemies.list){
      if (e.dead) continue;
      if (e.isNest) continue;                    /* 巢穴只产出，不移动不攻击 */
      const r = recFor(e, 'enemy');
      /* 被飞机打过：优先反击飞机（aggro 计时） */
      if (e.aggro > 0) e.aggro -= dt;
      if (!e.target || !isAlive(e.target, recOf(e.target)) ||
          (e.aggro <= 0 && e.target.alt !== undefined)){
        /* 优先打最近的活着的单位，没有就打建筑 */
        let best = null, bd = 55 * 55;
        for (const p of actors.people){
          if (p.state === 'hidden' || p.state === 'dead' || p.state === 'garrison') continue;
          const rr = recFor(p, 'unit');
          if (rr.hp <= 0) continue;
          const d = p.g.position.distanceToSquared(e.g.position);
          if (d < bd){ bd = d; best = p; }
        }
        /* 栈桥哨兵也是可被攻击的活单位：谁更近就打谁 */
        if (sentries){
          for (const s of sentries.list){
            if (s.state === 'dead' || !s.g.visible) continue;
            const rr = recFor(s, 'unit');
            if (rr.hp <= 0) continue;
            const d = s.g.position.distanceToSquared(e.g.position);
            if (d < bd){ bd = d; best = s; }
          }
        }
        if (actors.tanks){
          for (const v of actors.tanks){
            if (v.state === 'dead' || !v.g.visible) continue;
            const rr = recFor(v, 'unit');
            if (rr.hp <= 0) continue;
            const d = v.g.position.distanceToSquared(e.g.position);
            if (d < bd){ bd = d; best = v; }
          }
        }
        if (!best){
          /* 低空飞机也在射程内；空中虫族则能咬到高空飞机 */
          if (airforce){
            for (const a of airforce.list){
              if (a.dead || a.state === 'crash') continue;
              if (!e.air && a.alt > 17) continue;
              const rr = recFor(a, 'unit');
              if (rr.hp <= 0) continue;
              const d = a.g.position.distanceToSquared(e.g.position);
              if (d < 55 * 55){ best = a; break; }
            }
          }
        }
        /* 建筑和单位一起比距离：否则敌人会盯着 55 米外的哨兵，
           一路撞在更近的炮塔/维修平台上原地不动 */
        let bestB = null, bd2 = 90 * 90;
        for (const b of buildings){
          const d = b.center.distanceToSquared(e.g.position);
          if (d < bd2){ bd2 = d; bestB = b; }
        }
        if (bestB && (!best || bd2 < bd)) best = bestB;
        e.target = best;
      }
      if (!e.target) continue;
      const tr = recOf(e.target);
      const tp = posOf(e.target, tr);
      const d = tp.clone().sub(e.g.position);
      d.y = 0;
      const dist = d.length();
      /* 建筑按外缘算距离，否则硬碰撞后永远够不到建筑中心 */
      const surface = tr.kind === 'building' ? Math.max(0, dist - (e.target.radius || 0)) : dist;
      e.g.rotation.y = Math.atan2(d.x, d.z) + Math.PI;
      if (e.air){
        /* 空中单位保持高度、水平接近，攻击时向下吐酸 */
        e.baseAlt = e.baseAlt || e.alt;
        e.g.position.y += ((e.baseAlt + Math.sin(elapsed * 1.8 + e.bob) * 0.7) - e.g.position.y) * Math.min(1, dt * 4);
        const wings = e.g.userData.wings;
        if (wings) for (const w of wings) w.rotation.z = Math.sin(elapsed * 11 + w.userData.phase) * 0.42;
      }
      if (surface > e.range){
        const step = Math.min(e.speed * dt, surface - e.range * 0.85);
        if (step > 0){
          if (e.air) e.g.position.addScaledVector(d.clone().normalize(), step);
          else nav.step(e.g.position, (d.x / Math.max(0.001, dist)) * step, (d.z / Math.max(0.001, dist)) * step, 0.9);
        }
        if (!e.air) e.g.position.y = Math.abs(Math.sin(elapsed * 9 + e.bob)) * 0.12;
      } else {
        e.cdT -= dt;
        if (e.cdT <= 0){
          e.cdT = e.cd;
          damage(e.target, e.dmg, e.dmgType, e);
          if (fx && e.air) fx.sparkAt(tp.clone().setY(tp.y + 1.0), 7, 0x9cff5a);
          if (audio && audio.hit) audio.hit(e.g.position);
        }
      }
    }
  }

  /* ---------------------------------------------------- 血条刷新 --- */
  function updateBars(){
    let slot = 0;
    const q = camera.quaternion;
    const right = barRight.set(1, 0, 0).applyQuaternion(q);
    barEnts.length = 0;
    barRecs.length = 0;
    for (const p of actors.people){
      if (p.state === 'hidden' || p.state === 'dead' || p.state === 'garrison') continue;
      barEnts.push(p); barRecs.push(recFor(p, 'unit'));
    }
    if (sentries){
      for (const s of sentries.list){
        if (s.state === 'dead' || s.removed) continue;
        barEnts.push(s); barRecs.push(recFor(s, 'unit'));
      }
    }
    if (actors.tanks){
      for (const v of actors.tanks){
        if (v.state === 'dead' || !v.g || !v.g.visible) continue;
        barEnts.push(v); barRecs.push(recFor(v, 'unit'));
      }
    }
    /* 友方空中单位：维京 / 运输舰 / 战列巡航舰 */
    if (airforce){
      for (const a of airforce.list){
        if (a.dead || a.state === 'dead' || a.state === 'crash' || !a.g || !a.g.visible) continue;
        barEnts.push(a); barRecs.push(recFor(a, 'unit'));
      }
    }
    for (const e of enemies.list){
      if (!e.dead){ barEnts.push(e); barRecs.push(recFor(e, 'enemy')); }
    }
    for (const b of buildings){ if (b.destroyed) continue; barEnts.push(b); barRecs.push(recFor(b, 'building')); }

    for (let i = 0; i < barEnts.length; i++){
      const ent = barEnts[i], r = barRecs[i];
      const show = r.hp < r.maxHp && (elapsed - r.hitAt < 6 || r.hp / r.maxHp < 0.999);
      if (!show) continue;
      if (slot >= MAX_BARS) break;
      barPos.copy(posOf(ent, r));
      barPos.y += r.kind === 'building' ? 9
        : ent.isAircraft ? (ent.kind === 'battlecruiser' ? 5.8 : 2.9)
        : ent.isVehicle ? (ent.kind === 'tank' ? 3.7 : 2.9)
        : ent.air ? 2.6
        : ent.isHive ? 28
        : ent.isNest ? 9
        : ent.isSentry ? 4.95
        : 4.35;
      /* 随距离放大，保证远景下也能看清（RTS 惯例） */
      const scale = clamp(camera.position.distanceTo(barPos) / 52, 1, 4.6);
      const airW = ent.isAircraft
        ? (ent.kind === 'battlecruiser' ? 5.2 : (ent.kind === 'dropship' ? 3.0 : 2.6))
        : ent.isVehicle ? (ent.kind === 'tank' ? 3.8 : 2.6)
        : ent.isHive ? 13
        : ent.isNest ? 6
        : 2.1;
      const w = (r.kind === 'building' ? 7.2 : airW) * scale;
      const h = (r.kind === 'building' ? 0.5 : 0.22) * scale;
      dummy.position.copy(barPos);
      dummy.quaternion.copy(q);
      dummy.scale.set(w * 1.05, h * 1.65, 1);
      dummy.updateMatrix();
      barBg.setMatrixAt(slot, dummy.matrix);
      const pct = clamp(r.hp / r.maxHp, 0, 1);
      dummy.position.copy(barPos).addScaledVector(right, -w * (1 - pct) * 0.5);
      dummy.scale.set(Math.max(0.001, w * pct), h * 0.66, 1);
      dummy.updateMatrix();
      barFill.setMatrixAt(slot, dummy.matrix);
      tmpColor.setHex(pct > 0.55 ? 0x53ff9a : (pct > 0.28 ? 0xffc14a : 0xff5a4a));
      barFill.setColorAt(slot, tmpColor);
      slot++;
    }
    for (let i = slot; i < MAX_BARS; i++){
      barBg.setMatrixAt(i, hidden);
      barFill.setMatrixAt(i, hidden);
    }
    barBg.instanceMatrix.needsUpdate = true;
    barFill.instanceMatrix.needsUpdate = true;
    if (barFill.instanceColor) barFill.instanceColor.needsUpdate = true;
  }

  /* -------------------------------------------------- 弹道动画 -- */
  function updateProjectiles(dt){
    /* 子弹 */
    for (let i = bullets.length - 1; i >= 0; i--){
      const b = bullets[i];
      b.life += dt;
      b.pos.addScaledVector(b.dir, b.speed * dt);
      const tp = posOf(b.target, b.trec);
      tmpA.copy(tp);
      tmpA.y += b.trec.kind === 'enemy' ? 0.9 : 1.2;
      const hitDist = b.pos.distanceTo(tmpA);
      let done = false;
      if (hitDist < (b.big ? 2.4 : 1.3) && isAlive(b.target, b.trec)){
        hits++;
        let dmg = b.dmg;
        if (b.bonus && b.trec.armor === 'armored') dmg += b.bonus;
        const impact = tmpB.copy(tp);
        damage(b.target, dmg, b.type, b);
        if (b.splash){
          /* 攻城炮：主目标之外的 100/50/25% 三档溅射 */
          splashAt(impact, b.dmg, b.bonus || 0, b.type, b, b.splash, [1, 0.5, 0.25], b.target);
          tmpA.copy(impact);
          tmpA.y += 0.2;
          fx.sparkAt(tmpA, 16, 0xffb454);
        }
        done = true;
      } else if (b.life > 1.8 || b.pos.y < 0){
        done = true;
      }
      if (done){
        bulletMesh.setMatrixAt(b.idx, hidden);
        bulletSlots[b.idx] = null;
        bullets.splice(i, 1);
        continue;
      }
      dummy.position.copy(b.pos);
      dummy.quaternion.setFromUnitVectors(tmpDirZ, b.dir);
      dummy.scale.setScalar(b.big ? 2.8 : 1);
      dummy.updateMatrix();
      bulletMesh.setMatrixAt(b.idx, dummy.matrix);
    }
    bulletMesh.instanceMatrix.needsUpdate = true;

    /* 火舌 */
    for (const f of flames){
      if (f.life <= 0){ f.mesh.visible = false; continue; }
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1){ f.mesh.visible = false; f.life = 0; continue; }
      f.mesh.scale.set(0.5 + k * 0.9, 0.5 + k * 0.9, 1.5 + k * 1.4);
      f.mat.opacity = 0.5 * (1 - k) * (1 - k);
    }
    /* 治疗束 */
    for (const b of beams){
      if (b.life <= 0){ b.mesh.visible = false; continue; }
      b.t += dt;
      const k = b.t / b.life;
      if (k >= 1){ b.mesh.visible = false; b.life = 0; continue; }
      b.mat.opacity = 0.85 * (1 - k);
    }
    /* 焦痕淡出 */
    for (const s of scorch){
      if (s.life <= 0) continue;
      s.t += dt;
      if (s.t > s.life - 4) s.mat.opacity = Math.max(0, 0.7 * (s.life - s.t) / 4);
      if (s.t > s.life){ s.mesh.visible = false; s.life = 0; }
    }
  }

  /* 导弹塔自动防空/对地：优先空中目标 */
  const turretCd = new Map();
  const bunkerCd = new Map();
  /* 导弹塔三级递减：Lv1 18/.83/55，Lv2 19/.81/57，Lv3 20/.79/59 */
  const TURRET_DMG = [16, 18, 19, 20];
  const TURRET_CD = [0.85, 0.83, 0.81, 0.79];
  const TURRET_RANGE = [52, 55, 57, 59];
  function updateTurretDefense(dt){
    for (const b of buildings){
      if (b.key !== 'turret' && b.type !== 'turret' && !b.isOutpost) continue;
      const lv = Math.min(3, b.turretLevel || 0);
      const cd = (turretCd.get(b) || 0) - dt;
      if (cd > 0){ turretCd.set(b, cd); continue; }
      const from = new THREE.Vector3(b.center.x, 11.5, b.center.z);
      let best = null, bw = TURRET_RANGE[lv] * TURRET_RANGE[lv];
      for (const e of enemies.list){
        if (e.dead) continue;
        const d = e.g.position.distanceToSquared(from);
        const w = e.air ? d * 0.3 : d * (e.isNest ? 3 : 1);
        if (w < bw){ bw = w; best = e; }
      }
      if (!best) continue;
      if (fireFromPoint(from, best, TURRET_DMG[lv], 'normal', 96, true)){
        turretCd.set(b, TURRET_CD[lv]);
        if (b.turret){
          b.turret.rotation.y = Math.atan2(best.g.position.x - b.center.x, best.g.position.z - b.center.z);
        }
      }
    }
  }

  /* 驻军地堡：4 名步兵从射击孔开火，伤害为同堡步兵之和 */
  function updateBunkerDefense(dt){
    for (const b of buildings){
      if ((b.key !== 'bunker' && b.type !== 'bunker') || !b.garrison || !b.garrison.length) continue;
      const cd = (bunkerCd.get(b) || 0) - dt;
      if (cd > 0){ bunkerCd.set(b, cd); continue; }
      const shooters = b.garrison
        .map(u => ({ u, spec: UNIT_TYPES[u.kind] }))
        .filter(x => x.spec && (x.spec.dmg || 0) > 0);
      if (!shooters.length) continue;
      const canAir = shooters.some(x => x.spec.canHitAir);
      const from = new THREE.Vector3(b.center.x, 9.2, b.center.z);
      let best = null, bd = 9.5 * 9.5;
      for (const e of enemies.list){
        if (e.dead || (e.air && !canAir)) continue;
        const d = e.g.position.distanceToSquared(from);
        if (d < bd){ bd = d; best = e; }
      }
      if (!best) continue;
      const dmg = shooters.reduce((a, x) => a + (x.spec.dmg || 0) + (tech ? tech.bonusFor(x.u.kind) : 0), 0);
      if (fireFromPoint(from, best, dmg, 'normal', 90, false)){
        bunkerCd.set(b, 0.72);
        fx.sparkAt(from, 4, 0xffd27a);
      }
    }
  }

  /* ------------------------------------------------ 哨兵外部接口 --- */
  /* 让哨兵用与陆战队相同的子弹逻辑开火（是否命中仍由弹道判定） */
  function fireAt(ent, target){
    const spec = UNIT_TYPES[ent.kind];
    if (!spec || spec.proj !== 'bullet' || !target) return false;
    const r = recOf(target);
    if (!isAlive(target, r)) return false;
    if (bulletSlots.indexOf(null) < 0) return false;
    fireBullet(ent, target, r, spec);
    return true;
  }

  /* 哨兵尸体移除后清掉记录，避免 records / velCache 里留下永久引用 */
  function forget(ent){
    records.delete(ent);
    velCache.delete(ent);
  }

  function bindSentries(s){ sentries = s; }
  function bindTech(t){ tech = t; }

  /* ------------------------------------------------------ 外部 API --- */
  return {
    update(dt){
      elapsed += dt;
      /* 速度缓存：用于所有弹道的提前量解算 */
      for (const e of enemies.list) if (!e.dead) updVel(e, dt);
      for (const p of actors.people) if (p.state !== 'hidden') updVel(p, dt);
      for (const v of actors.tanks || []) if (v.state !== 'dead') updVel(v, dt);
      if (sentries) for (const s of sentries.list) if (s.state !== 'dead' && !s.removed) updVel(s, dt);
      if (airforce) for (const a of airforce.list) if (!a.dead && a.g) updVel(a, dt);
      updateUnits(dt);
      updateVehicles(dt);
      updateAir(dt);
      updateYamatoFx(dt);
      updateEnemies(dt);
      updateTurretDefense(dt);
      updateBunkerDefense(dt);
      updateProjectiles(dt);
      updateMines(dt);
      updateFlashes(dt);
      updateBars();
    },
    damage,
    recFor,
    fireAt,
    forget,
    bindSentries,
    bindTech,
    toggleSiege,
    layMine,
    mineState,
    restoreMines,
    get mines(){ return mines; },
    get kills(){ return kills; },
    get yamatoFx(){ return yamato; },
    stats(){
      let alive = 0, hpFrac = 0, n = 0;
      for (const e of enemies.list) if (!e.dead) alive++;
      for (const p of actors.people){
        if (p.state === 'hidden' || p.state === 'dead') continue;
        const r = recFor(p, 'unit');
        hpFrac += r.hp / r.maxHp; n++;
      }
      return { enemies: alive, avgHp: n ? hpFrac / n : 1, kills, shots, hits, dmgDealt };
    }
  };
}
