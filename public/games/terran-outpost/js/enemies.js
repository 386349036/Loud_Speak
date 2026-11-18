/* 敌军：虫群（跳虫 / 蟑螂）+ 波次调度 */
import * as THREE from 'three';
import { bakeStatic, rand, rnd, TAU } from './core.js';

const MAT = () => ({
  shell: new THREE.MeshStandardMaterial({ color: 0x4a3a52, metalness: 0.15, roughness: 0.72 }),
  shellL: new THREE.MeshStandardMaterial({ color: 0x6d5478, metalness: 0.12, roughness: 0.64 }),
  flesh: new THREE.MeshStandardMaterial({ color: 0x2a1e2c, metalness: 0.05, roughness: 0.9 }),
  claw: new THREE.MeshStandardMaterial({ color: 0xbfae9a, metalness: 0.2, roughness: 0.5 }),
  eye: new THREE.MeshStandardMaterial({
    color: 0x2a0f00, emissive: 0xff7a22, emissiveIntensity: 2.4, roughness: 0.4
  })
});

const box = (p, w, h, d, x, y, z, m) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  p.add(mesh);
  return mesh;
};
const sph = (p, r, x, y, z, m, sy = 1, sx = 1) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, 1);
  mesh.castShadow = true;
  p.add(mesh);
  return mesh;
};

/* 跳虫：低伏的四足虫，背甲带尖刺 */
export function buildZergling(){
  const g = new THREE.Group();
  const m = MAT();
  const body = sph(g, 0.62, 0, 1.05, 0, m.shell, 0.78, 1.15);
  body.rotation.x = -0.12;
  sph(g, 0.4, 0, 1.28, 0.62, m.shellL, 0.7, 1.1);          // 头
  box(g, 0.46, 0.16, 0.5, 0, 1.0, 0.86, m.flesh);            // 口器基座
  for (const s of [-1, 1]){
    const mand = box(g, 0.1, 0.1, 0.52, s * 0.17, 0.99, 1.12, m.claw);
    mand.rotation.y = s * 0.34;
    box(g, 0.1, 0.1, 0.34, s * 0.3, 1.02, 1.02, m.claw).rotation.y = s * 0.7;
    sph(g, 0.075, s * 0.22, 1.19, 0.92, m.eye);
    /* 背刺 */
    for (let i = 0; i < 3; i++){
      const sp = box(g, 0.08, 0.42 - i * 0.08, 0.08, s * (0.18 + i * 0.03), 1.52 - i * 0.06, -0.1 - i * 0.28, m.claw);
      sp.rotation.x = 0.35;
    }
    /* 四肢：前后各一对，用细长盒 + 关节 */
    for (const [zz, off] of [[0.42, 0.1], [-0.34, -0.05]]){
      const hip = new THREE.Group();
      hip.position.set(s * 0.42, 0.92, zz);
      const upper = box(hip, 0.11, 0.6, 0.11, s * 0.16, -0.24, 0, m.flesh);
      upper.rotation.z = s * 0.5;
      const low = box(hip, 0.09, 0.62, 0.09, s * 0.42, -0.62, off, m.shell);
      low.rotation.z = -s * 0.25;
      g.add(hip);
      g.userData['leg' + s + zz] = hip;
    }
  }
  bakeStatic(g);
  return g;
}

/* 蟑螂：更厚、带酸液腺与重甲 */
export function buildRoach(){
  const g = new THREE.Group();
  const m = MAT();
  sph(g, 0.92, 0, 1.42, 0, m.shell, 0.72, 1.0);
  sph(g, 0.6, 0, 1.5, 0.86, m.shellL, 0.7, 1.05);
  box(g, 0.9, 0.22, 0.4, 0, 1.28, 1.12, m.flesh);
  for (const s of [-1, 1]){
    sph(g, 0.11, s * 0.34, 1.62, 1.1, m.eye);
    /* 背甲板 */
    for (let i = 0; i < 3; i++){
      const plate = box(g, 1.5 - i * 0.16, 0.16, 0.46, 0, 1.95 - i * 0.05, 0.2 - i * 0.42, m.shellL);
      plate.rotation.x = 0.06;
    }
    for (const zz of [0.5, -0.2, -0.8]){
      const leg = new THREE.Group();
      leg.position.set(s * 0.62, 1.18, zz);
      box(leg, 0.14, 0.72, 0.14, s * 0.2, -0.3, 0, m.flesh).rotation.z = s * 0.55;
      box(leg, 0.11, 0.7, 0.11, s * 0.5, -0.78, 0, m.shell).rotation.z = -s * 0.2;
      g.add(leg);
    }
  }
  /* 尾部酸腺 */
  sph(g, 0.36, 0, 1.5, -1.05, m.flesh, 0.9, 1.0);
  const glow = box(g, 0.3, 0.14, 0.3, 0, 1.66, -1.2, m.eye);
  glow.material = new THREE.MeshStandardMaterial({
    color: 0x301000, emissive: 0x9cff5a, emissiveIntensity: 1.8, roughness: 0.4
  });
  bakeStatic(g);
  return g;
}

/* 飞龙：细长身躯 + 两对膜翼 + 尾刺，空中骚扰单位 */
export function buildMutalisk(){
  const g = new THREE.Group();
  const m = MAT();
  const body = new THREE.Group();
  body.position.y = 0;
  g.add(body);
  sph(body, 0.5, 0, 0, 0, m.flesh, 0.85, 1.5);
  sph(body, 0.34, 0, 0.08, 0.72, m.shellL, 0.9, 1.1);
  box(body, 0.34, 0.22, 0.34, 0, -0.02, 1.02, m.flesh);
  for (const s of [-1, 1]){
    sph(body, 0.1, s * 0.16, 0.12, 1.12, m.eye);
    /* 两对膜翼 */
    for (const [dz, sx, sz] of [[0.34, 1.5, 0.9], [0.02, 1.15, 1.15]]){
      const w = new THREE.Group();
      w.position.set(s * 0.34, 0.2, dz);
      const wing = box(w, sx, 0.06, sz, s * sx * 0.5, 0, 0, m.wing);
      wing.rotation.z = s * -0.28;
      wing.rotation.x = 0.12;
      w.userData.phase = s * (dz + 0.4);
      body.add(w);
      if (!g.userData.wings) g.userData.wings = [];
      g.userData.wings.push(w);
    }
  }
  /* 尾刺 */
  const tail = box(body, 0.12, 0.12, 1.1, 0, 0.02, -1.0, m.shell);
  tail.rotation.x = 0.18;
  sph(body, 0.16, 0, 0.1, -1.55, m.eye);
  bakeStatic(body);
  return g;
}

/* 飞蛇：粗壮蛇形躯体 + 酸囊 + 短翼，远程吐酸 */
export function buildViper(){
  const g = new THREE.Group();
  const m = MAT();
  sph(g, 0.62, 0, 0, 0.2, m.shell, 0.9, 1.6);
  sph(g, 0.5, 0, 0.06, 1.15, m.shellL, 0.85, 1.2);
  box(g, 0.5, 0.3, 0.5, 0, 0.0, 1.55, m.flesh);
  for (const s of [-1, 1]){
    sph(g, 0.12, s * 0.2, 0.14, 1.66, m.eye);
    const w = box(g, 1.7, 0.08, 0.8, s * 0.85, 0.22, 0.35, m.wing);
    w.rotation.z = s * -0.22;
    /* 侧爪 */
    box(g, 0.14, 0.5, 0.14, s * 0.42, -0.5, 0.6, m.flesh).rotation.z = s * 0.4;
  }
  /* 尾部酸囊（发光） */
  const sac = sph(g, 0.44, 0, -0.12, -1.05, m.flesh, 0.9, 1.2);
  sac.material = new THREE.MeshStandardMaterial({
    color: 0x2a1200, emissive: 0xa8ff52, emissiveIntensity: 1.5, roughness: 0.45, metalness: 0.1
  });
  box(g, 0.2, 0.14, 0.2, 0, 0.28, -1.35, m.eye);
  bakeStatic(g);
  return g;
}

/* 巢穴：平台外的空中虫巢，持续放出飞龙/飞蛇，可被飞机清剿 */
export function buildNest(){
  const g = new THREE.Group();
  const m = MAT();
  const base = new THREE.Mesh(
    new THREE.IcosahedronGeometry(5.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x3a2b33, roughness: 0.9, metalness: 0.1, flatShading: true })
  );
  base.scale.set(1, 0.72, 1);
  base.position.y = 1.6;
  base.castShadow = true; base.receiveShadow = true;
  g.add(base);
  /* 外圈几丁质尖刺 */
  for (let i = 0; i < 9; i++){
    const a = i / 9 * TAU;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 5),
      new THREE.MeshStandardMaterial({ color: 0x54323d, roughness: 0.75, flatShading: true }));
    sp.position.set(Math.cos(a) * 4.6, 1.2 + (i % 3) * 0.5, Math.sin(a) * 4.6);
    sp.rotation.z = Math.cos(a) * 0.5;
    sp.rotation.x = -Math.sin(a) * 0.5;
    sp.castShadow = true;
    g.add(sp);
  }
  /* 顶端喷口 + 紫色生物光 */
  const maw = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.4, 2.6, 7, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2a1a22, roughness: 0.8, side: THREE.DoubleSide }));
  maw.position.y = 5.4;
  g.add(maw);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x3a1030, emissive: 0xb45cff, emissiveIntensity: 1.7, roughness: 0.5
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 9), glowMat);
  core.position.y = 5.2;
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.18, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xb45cff, transparent: true, opacity: 0.55 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 4.6;
  g.add(ring);
  g.userData.pulse = { mat: glowMat, ring, core };
  const light = new THREE.PointLight(0xb45cff, 34, 60, 2);
  light.position.y = 5.4;
  g.add(light);
  g.userData.light = light;
  bakeStatic(g);
  return g;
}

/* --------------------------------------------------------- 波次管理 --- */
const SPEC = {
  zergling: { hp: 35, armor: 'light', dmg: 5, dmgType: 'normal', cd: 0.72, range: 1.5, speed: 5.2, radius: 0.8, scale: [1, 1.1] },
  roach:    { hp: 145, armor: 'armored', dmg: 14, dmgType: 'explosive', cd: 1.5, range: 4.5, speed: 3.0, radius: 1.1, scale: [1, 1.05] },
  mutalisk: { hp: 72, armor: 'light', dmg: 6, dmgType: 'normal', cd: 0.85, range: 3.2, speed: 7.4, radius: 0.7,
    scale: [0.95, 1.05], air: true, alt: 15, name: '飞龙' },
  viper:    { hp: 165, armor: 'armored', dmg: 13, dmgType: 'explosive', cd: 1.7, range: 6.5, speed: 4.2, radius: 1.1,
    scale: [1, 1.05], air: true, alt: 19, name: '飞蛇' },
  nest:     { hp: 420, armor: 'armored', dmg: 0, dmgType: 'normal', cd: 1, range: 0, speed: 0, radius: 5.4,
    scale: [1, 1], air: false, name: '虫巢' }
};

export function createEnemies({ world, fx, onWarning }){
  const list = [];
  const nests = [];
  let wave = 0;
  let nextWave = 40;         /* 首波在第 40 秒：给极简开局留出建军队的时间 */
  let attackCooldownGlobal = 0;
  let lastDirs = [];
  let warned = false;
  let clearedWave = 0;
  let finalAssault = false;
  let waveUnits = [];
  let waveLimit = 10;

  /* 四个来向：东 0 / 南 π/2 / 西 π / 北 -π/2 */
  const SIDES = [
    { name: '东侧', a: 0 },
    { name: '南侧', a: Math.PI / 2 },
    { name: '西侧', a: Math.PI },
    { name: '北侧', a: -Math.PI / 2 }
  ];

  function shuffle(arr){
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* 只决定「从哪几个方向来」，总数仍由 startWave 的 count 控制 */
  function makePlan(n){
    if (n <= 1) return [2];                       /* 第 1 波：西侧 */
    if (n === 2) return [2, 1];                   /* 第 2 波：西 + 南 */
    const pool = shuffle([0, 1, 2, 3]);
    if (n <= 4) return pool.slice(0, 2);          /* 第 3–4 波：随机两侧 */
    return pool.slice(0, n >= 7 ? 3 : 2);         /* 第 5 波起 2 侧，第 7 波起 3 侧 */
  }

  let pending = { wave: 1, dirs: makePlan(1) };

  function spawn(kind, angle, r, altOverride){
    const spec = SPEC[kind];
    let g;
    if (kind === 'roach') g = buildRoach();
    else if (kind === 'mutalisk') g = buildMutalisk();
    else if (kind === 'viper') g = buildViper();
    else if (kind === 'nest') g = buildNest();
    else g = buildZergling();
    g.scale.setScalar(rand(spec.scale[0], spec.scale[1]));
    const alt = kind === 'nest' ? 0 : (spec.air ? (altOverride ?? spec.alt) : 0);
    g.position.set(Math.cos(angle) * r, alt - (kind === 'nest' ? 1.2 : 0), Math.sin(angle) * r);
    world.add(g);
    const e = {
      kind, g, spec,
      hp: spec.hp, maxHp: spec.hp, armor: spec.armor,
      dmg: spec.dmg, dmgType: spec.dmgType, cd: spec.cd, range: spec.range,
      speed: spec.speed, radius: spec.radius,
      air: !!spec.air, alt, baseAlt: alt,
      state: 'advance', t: 0, cdT: rand(0, 0.5), target: null,
      dead: false, deadT: 0, bob: rand(0, TAU), aggro: 0
    };
    g.userData.enemy = e;
    list.push(e);
    return e;
  }

  /* 三个固定巢穴，挂在平台外的空中/地面边缘 */
  function makeNests(){
    const defs = [
      { a: -2.35, r: 104, kind: 'mutalisk' },
      { a: -0.75, r: 112, kind: 'viper' },
      { a: 1.55, r: 108, kind: 'mutalisk' }
    ];
    for (const d of defs){
      const e = spawn('nest', d.a, d.r);
      e.hp = 700; e.maxHp = 700;
      e.isBrood = true;
      e.name = '虫族子巢';
      e.spawnKind = d.kind;
      e.spawnT = rand(30, 44);          /* 第一次放出的时间 */
      e.spawned = 0;
      e.isNest = true;
      e.state = 'idle';
      nests.push(e);
    }
  }
  makeNests();

  function startWave(n){
    if (n > waveLimit) return;
    wave = n;
    waveUnits = [];
    finalAssault = n >= 10;
    const count = Math.min(13, 3 + n);
    const dirs = (pending && pending.wave === n) ? pending.dirs.slice() : makePlan(n);
    lastDirs = dirs.slice();
    /* 刺蛇：第 3 波 1、第 6 波 2、第 9 波 3 */
    const roachCount = n >= 9 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0;

    /* 跳虫按方向均分，总数逐波增长到 13 */
    const groups = dirs.map(() => 0);
    for (let i = 0; i < count; i++) groups[i % dirs.length]++;
    for (let gi = 0; gi < dirs.length; gi++){
      const side = SIDES[dirs[gi]];
      for (let i = 0; i < groups[gi]; i++){
        waveUnits.push(spawn('zergling', side.a + rand(-0.5, 0.5), rand(118, 134)));
      }
    }

    /* 刺蛇也分到不同方向 */
    for (let i = 0; i < roachCount; i++){
      const side = SIDES[dirs[i % dirs.length]];
      waveUnits.push(spawn('roach', side.a + rand(-0.3, 0.3), rand(118, 134)));
    }

    /* 空军逐波混编：6 波 1 飞龙，8 波 2 飞龙，9 波加 1 飞蛇，10 波 2+2 */
    const airSpec = finalAssault
      ? [['mutalisk', 15], ['mutalisk', 15], ['viper', 19], ['viper', 19]]
      : n >= 9
        ? [['mutalisk', 15], ['mutalisk', 15], ['viper', 19]]
        : n >= 8
          ? [['mutalisk', 15], ['mutalisk', 15]]
          : n >= 6 ? [['mutalisk', 15]] : [];
    for (let i = 0; i < airSpec.length; i++){
      const side = SIDES[dirs[i % dirs.length]];
      waveUnits.push(spawn(airSpec[i][0], side.a + rand(-0.22, 0.22), rand(122, 138), airSpec[i][1]));
    }

    pending = { wave: n + 1, dirs: makePlan(n + 1) };
    warned = false;
  }

  function aliveCount(){
    let n = 0;
    for (const e of list) if (!e.dead && !e.isNest) n++;
    return n;
  }

  function remove(e){
    if (e.g.parent) world.remove(e.g);
    e.g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  }

  return {
    list, nests, startWave,
    setWaveLimit(n){ waveLimit = Math.max(0, n | 0); },
    get waveLimit(){ return waveLimit; },
    get wave(){ return wave; },
    get lastDirs(){ return lastDirs.slice(); },
    get clearedWave(){ return clearedWave; },
    get nextWaveIn(){ return Math.max(0, nextWave); },
    incoming(){
      return pending ? {
        wave: wave + 1,
        seconds: Math.max(0, nextWave),
        dirs: pending.dirs.slice(),
        sides: pending.dirs.map(i => SIDES[i].name)
      } : null;
    },
    aliveCount,
    spawn,
    remove,
    /* 供主循环调用：推进波次与死亡演出 */
    tick(dt, t){
      nextWave -= dt;
      if (!warned && nextWave > 0 && nextWave <= 3 && pending){
        warned = true;
        if (onWarning){
          onWarning({
            wave: wave + 1,
            seconds: Math.max(0, nextWave),
            dirs: pending.dirs.slice(),
            sides: pending.dirs.map(i => SIDES[i].name)
          });
        }
      }
      if (nextWave <= 0 && aliveCount() < 14 && wave < waveLimit){
        startWave(wave + 1);
        nextWave = Math.max(34, 58 - wave * 2);
      }

      /* 巢穴：周期放出飞龙/飞蛇 */
      for (const n of nests){
        if (n.dead) continue;
        n.spawnT -= dt;
        if (!finalAssault && n.spawnT <= 0 && aliveCount() < 22){
          const a = Math.atan2(n.g.position.z, n.g.position.x) + rand(-0.18, 0.18);
          const r = Math.hypot(n.g.position.x, n.g.position.z) - 10;
          spawn(n.spawnKind, a, r);
          n.spawned++;
          n.spawnT = rand(9, 15);
          if (fx) fx.sparkAt(n.g.position.clone().setY(n.g.position.y + 5.2), 10, 0xb45cff);
        }
        const p = n.g.userData.pulse;
        if (p){
          const k = 0.5 + 0.5 * Math.sin(t * 2.2 + n.bob);
          p.mat.emissiveIntensity = 1.1 + k * 1.5;
          p.ring.scale.setScalar(0.86 + k * 0.28);
          p.ring.material.opacity = 0.35 + k * 0.35;
          if (n.g.userData.light) n.g.userData.light.intensity = 22 + k * 26;
        }
      }

      for (let i = list.length - 1; i >= 0; i--){
        const e = list[i];
        if (e.dead){
          e.deadT += dt;
          if (e.air){
            /* 空中单位：螺旋坠落 */
            e.g.position.y -= (1.4 + e.deadT * 7.5) * dt;
            e.g.rotation.z += dt * 3.4;
            e.g.rotation.x += dt * 0.9;
            if (e.g.position.y < -3 || e.deadT > 3.4) remove(e);
            continue;
          }
          /* 倒地：绕 X 轴前倾 + 下沉 */
          const k = Math.min(1, e.deadT / 0.55);
          e.g.rotation.x = -k * 1.35;
          e.g.position.y = (e.g.userData.baseY || 0) - k * 0.25;
          e.g.traverse(o => {
            if (o.material && o.material.emissive) o.material.emissiveIntensity *= 0.985;
          });
          if (e.deadT > 3.2) remove(e);
        }
      }

      /* 当前波次的进攻单位全部阵亡 → 记为「已守住」 */
      if (waveUnits.length && waveUnits.every(e => e.dead)){
        clearedWave = Math.max(clearedWave, wave);
        waveUnits = [];
      }
    }
  };
}
