/* 载具模型：重装运输舰 / 攻城坦克 / 秃鹰摩托 / 工兵机甲 */
import * as THREE from 'three';
import { box, cyl, strip , bakeStatic} from './core.js';

const STEEL   = () => new THREE.MeshStandardMaterial({ color: 0x87929d, metalness: 0.5, roughness: 0.44 });
const STEEL_D = () => new THREE.MeshStandardMaterial({ color: 0x424c56, metalness: 0.45, roughness: 0.58 });
const STEEL_L = () => new THREE.MeshStandardMaterial({ color: 0x9aa5b0, metalness: 0.45, roughness: 0.36 });
const TRIM    = () => new THREE.MeshStandardMaterial({ color: 0x1f272e, metalness: 0.3, roughness: 0.72 });
const GLASS   = () => new THREE.MeshStandardMaterial({
  color: 0x0a1a24, metalness: 0.85, roughness: 0.14,
  emissive: 0x1d6b8c, emissiveIntensity: 1.0
});
const GLOW_C  = () => new THREE.MeshStandardMaterial({ color: 0x061016, emissive: 0x4fd6ff, emissiveIntensity: 2.4 });
const GLOW_A  = () => new THREE.MeshStandardMaterial({ color: 0x160d05, emissive: 0xff9b3c, emissiveIntensity: 2.0 });
const RUST    = () => new THREE.MeshStandardMaterial({ color: 0x5a4a3c, metalness: 0.3, roughness: 0.85 });

function shadowAll(g){
  g.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ------------------------------------------------------ 运输舰 --- */
export function buildDropship(){
  const g = new THREE.Group();
  const hull = STEEL(), dark = STEEL_D(), light = STEEL_L();
  const trim = TRIM(), glass = GLASS(), glow = GLOW_C(), amber = GLOW_A();

  /* 机身：中段最宽，向前后收窄 */
  box(g, 6.4, 3.2, 4.6, 0, 0, 0.4, hull);              // 中段
  box(g, 5.4, 2.8, 5.2, 0, 0.05, 4.6, hull);           // 前段
  box(g, 4.0, 2.2, 3.0, 0, 0.1, 7.9, hull);            // 机鼻基座
  box(g, 3.0, 1.5, 1.8, 0, 0.0, 9.6, light);           // 机鼻

  box(g, 5.2, 2.2, 6.0, 0, 0.1, -3.8, hull);           // 尾段
  box(g, 4.3, 1.4, 2.6, 0, 0.25, -7.1, dark);          // 尾舱

  /* 腹部与侧裙装甲 */
  box(g, 4.8, 1.3, 9.0, 0, -1.55, 1.4, dark);
  for (const s of [-1, 1]){
    const skirt = box(g, 0.5, 1.2, 8.0, s * 3.2, -1.1, 1.2, light);
    skirt.rotation.z = s * 0.06;
  }

  /* 驾驶舱 */
  const canopy = box(g, 3.2, 1.1, 2.4, 0, 1.45, 6.9, glass);
  canopy.rotation.x = -0.2;
  box(g, 3.6, 0.35, 2.8, 0, 2.05, 6.6, dark);
  box(g, 0.3, 0.5, 2.6, 0, 1.5, 7.0, trim);
  /* 机鼻传感器与探照灯 */
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), trim);
  dome.position.set(0, -1.0, 9.2); g.add(dome);
  strip(g, 0.9, 0.14, 0.14, 0, -1.45, 9.0, glow);

  /* 主翼 */
  for (const s of [-1, 1]){
    box(g, 4.6, 0.65, 4.4, s * 5.0, 0.15, 0.2, hull);
    const outer = box(g, 3.8, 0.5, 3.4, s * 8.6, 0.2, -0.4, hull);
    outer.rotation.y = s * 0.1;
    box(g, 0.6, 0.45, 3.4, s * 10.4, 0.2, -0.5, light);       // 翼尖
    strip(g, 3.4, 0.12, 0.12, s * 8.6, 0.46, 1.1, glow);      // 翼面灯带
    /* 翼下挂架 */
    box(g, 0.45, 0.55, 2.6, s * 5.6, -0.65, 0.4, trim);
    box(g, 0.9, 0.4, 1.4, s * 5.6, -0.95, -0.2, dark);

    /* 引擎舱 */
    const nac = cyl(g, 1.35, 1.5, 5.8, 16, s * 6.6, -0.15, -3.0, dark);
    nac.rotation.x = Math.PI / 2;
    cyl(g, 1.62, 1.62, 0.5, 16, s * 6.6, -0.15, -0.3, light).rotation.x = Math.PI / 2;
    cyl(g, 1.55, 1.35, 0.6, 16, s * 6.6, -0.15, -5.9, trim).rotation.x = Math.PI / 2;
    const core = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x8fe4ff, transparent: true, opacity: 0.55 }));
    core.position.set(s * 6.6, -0.15, -6.2);
    core.rotation.y = Math.PI;
    g.add(core);
  }

  /* 尾部：垂尾与平尾 */
  const fin = box(g, 0.36, 3.4, 3.0, 0, 2.55, -5.4, hull);
  fin.rotation.x = 0.3;
  strip(g, 0.1, 0.12, 2.0, 0, 4.05, -5.9, amber);
  for (const s of [-1, 1]){
    const stab = box(g, 3.0, 0.28, 1.9, s * 2.5, 1.55, -5.9, hull);
    stab.rotation.y = s * 0.16;
    strip(g, 1.6, 0.08, 0.08, s * 2.6, 1.72, -6.5, amber);
  }

  /* 尾部坡道与舱灯 */
  const ramp = box(g, 4.2, 0.32, 4.8, 0, -0.85, -8.4, light);
  ramp.rotation.x = 0.14;
  for (let i = 0; i < 4; i++) strip(g, 3.6, 0.07, 0.09, 0, -0.66, -6.8 - i * 1.05, glow);

  /* 起落架 */
  const gear = [];
  for (const [x, z] of [[-2.3, 5.2], [2.3, 5.2], [-2.5, -5.0], [2.5, -5.0]]){
    const grp = new THREE.Group();
    grp.position.set(x, -1.85, z);
    cyl(grp, 0.2, 0.24, 1.5, 8, 0, -0.7, 0, trim);
    box(grp, 1.25, 0.22, 1.0, 0, -1.45, 0, dark);
    box(grp, 0.5, 0.2, 0.5, 0, -1.55, 0, trim);
    g.add(grp);
    gear.push(grp);
  }

  /* 背部结构与灯光 */
  box(g, 2.6, 0.7, 4.2, 0, 1.95, -0.8, dark);
  for (let i = 0; i < 5; i++) strip(g, 1.8, 0.06, 0.36, 0, 2.32, 1.6 - i * 0.7, trim);
  for (const s of [-1, 1]){
    strip(g, 0.12, 0.1, 5.6, s * 3.24, 0.55, 1.0, glow);      // 舷侧灯带
    strip(g, 1.5, 0.13, 0.13, s * 2.0, 0.75, 4.2, amber);     // 舷侧警示
  }

  /* 引擎焰：用发光盘 + 点光源代替锥体，避免透视下变成大片三角面 */
  const flames = [];
  for (const s of [-1, 1]){
    const core = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20),
      new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.34,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    core.position.set(s * 6.6, -0.15, -6.25);
    core.rotation.y = Math.PI;
    g.add(core);
    flames.push(core);

    const light = new THREE.PointLight(0x4fd6ff, 26, 42, 2);
    light.position.set(s * 6.6, -0.15, -7.4);
    g.add(light);
    g.userData[s > 0 ? 'lightR' : 'lightL'] = light;
  }

  g.userData.flames = flames;
  g.userData.gear = gear;
  bakeStatic(g);
  return shadowAll(g);
}

/* ------------------------------------------------------ 攻城坦克 --- */
export function buildTank(){
  const g = new THREE.Group();
  const hull = STEEL(), dark = STEEL_D(), light = STEEL_L(), trim = TRIM();
  const glow = GLOW_C(), amber = GLOW_A(), rust = RUST();

  box(g, 5.0, 1.5, 8.2, 0, 1.5, 0, hull);              // 车体
  box(g, 5.3, 0.55, 3.0, 0, 1.05, 2.5, light);         // 前装甲
  box(g, 4.2, 0.9, 2.4, 0, 2.4, -1.8, dark);           // 后舱
  box(g, 4.4, 0.4, 4.0, 0, 2.3, 0.4, light);           // 顶部装甲板

  /* 履带 */
  for (const s of [-1, 1]){
    box(g, 1.45, 1.3, 8.6, s * 2.85, 0.75, 0, trim);
    for (let i = 0; i < 7; i++){
      cyl(g, 0.5, 0.5, 1.6, 10, s * 2.85, 0.75, -3.4 + i * 1.13, dark).rotation.z = Math.PI / 2;
    }
    strip(g, 0.1, 0.1, 7.2, s * 3.55, 1.15, 0, glow);
    box(g, 1.1, 0.35, 2.6, s * 2.85, 1.5, 3.0, light);   // 挡泥板
  }

  /* 炮塔 */
  const turret = new THREE.Group();
  turret.position.set(0, 2.62, -0.2);
  box(turret, 3.7, 1.4, 4.2, 0, 0, 0, hull);
  box(turret, 3.0, 0.65, 2.0, 0, 0.85, -0.7, dark);
  box(turret, 0.9, 0.9, 1.4, 1.9, 0.2, -0.6, trim);      // 观瞄
  const barrel = new THREE.Group();
  cyl(barrel, 0.32, 0.38, 6.4, 12, 0, 0.26, 3.7, light).rotation.x = Math.PI / 2;
  cyl(barrel, 0.5, 0.5, 0.9, 12, 0, 0.26, 6.3, trim).rotation.x = Math.PI / 2;
  box(barrel, 0.85, 0.45, 1.2, 0, 0.26, 1.1, dark);
  turret.add(barrel);
  g.add(turret);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.26, 6.85);
  barrel.add(muzzle);

  cyl(g, 0.07, 0.07, 2.3, 5, -1.5, 2.9, -2.4, trim);     // 天线
  for (const s of [-1, 1]) cyl(g, 0.2, 0.24, 1.3, 8, s * 1.4, 2.3, -2.9, rust);
  strip(g, 2.0, 0.11, 0.11, 0, 2.05, 3.0, amber);

  /* 攻城模式的四根液压支撑腿 */
  const supports = [];
  for (const s of [-1, 1]){
    for (const z of [-2.7, 2.6]){
      const leg = new THREE.Group();
      leg.position.set(s * 2.55, 0.95, z);
      box(leg, 0.95, 0.34, 0.7, s * 0.42, -0.3, 0, dark);
      box(leg, 0.7, 0.28, 0.55, s * 1.0, -0.55, 0, trim);
      box(leg, 0.16, 0.7, 0.16, s * 1.25, -0.95, 0, light);
      g.add(leg);
      supports.push({ g: leg, side: s });
    }
  }

  g.userData.turret = turret;
  g.userData.barrel = barrel;
  g.userData.muzzle = muzzle;
  g.userData.supports = supports;
  bakeStatic(g);
  return shadowAll(g);
}

/* ------------------------------------------------------ 秃鹰摩托 --- */
export function buildVulture(){
  const g = new THREE.Group();
  const hull = STEEL(), dark = STEEL_D(), light = STEEL_L();
  const trim = TRIM(), glass = GLASS(), glow = GLOW_C(), amber = GLOW_A();

  /* 悬浮车体：前尖后宽的低矮楔形 */
  box(g, 1.8, 0.7, 3.8, 0, 0.85, 0, hull);
  box(g, 1.5, 0.5, 1.7, 0, 0.95, 1.9, light);
  box(g, 0.9, 0.3, 0.9, 0, 0.82, 2.9, dark);            // 车鼻
  box(g, 1.2, 0.45, 1.3, 0, 1.28, -0.9, trim);          // 座位
  box(g, 0.5, 0.55, 1.0, 0, 1.4, -2.0, dark);           // 尾部电池

  /* 侧悬浮舱 */
  for (const s of [-1, 1]){
    box(g, 0.5, 0.55, 2.8, s * 1.05, 0.75, -0.2, light);
    strip(g, 0.12, 0.1, 1.6, s * 1.3, 0.86, 0.4, glow);
    /* 尾部推进器 */
    const thr = cyl(g, 0.42, 0.5, 0.7, 12, s * 1.05, 0.9, -2.55, trim);
    thr.rotation.x = Math.PI / 2;
    const jet = cyl(g, 0.26, 0.1, 0.25, 12, s * 1.05, 0.9, -2.95, glow);
    jet.rotation.x = Math.PI / 2;
  }

  /* 前部双联激光 */
  const gun = new THREE.Group();
  gun.position.set(0, 1.05, 2.75);
  box(gun, 0.55, 0.34, 0.8, 0, 0, 0, dark);
  for (const s of [-1, 1]){
    const barrel = cyl(gun, 0.09, 0.11, 1.5, 8, s * 0.2, 0.02, 0.95, trim);
    barrel.rotation.x = Math.PI / 2;
    const tip = cyl(gun, 0.14, 0.14, 0.16, 8, s * 0.2, 0.02, 1.7, glow);
    tip.rotation.x = Math.PI / 2;
  }
  g.add(gun);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, 1.9);
  gun.add(muzzle);

  /* 骑手 */
  box(g, 0.72, 0.62, 0.62, 0, 1.82, -0.55, hull);
  box(g, 0.5, 0.5, 0.5, 0, 2.3, -0.45, dark);
  strip(g, 0.42, 0.14, 0.1, 0, 2.32, -0.18, glow);
  for (const s of [-1, 1]){
    box(g, 0.22, 0.75, 0.24, s * 0.46, 1.45, -1.15, dark);
    box(g, 0.2, 0.2, 0.5, s * 0.46, 1.08, -1.45, trim);
  }
  box(g, 0.08, 0.08, 1.2, 0, 1.3, 0.55, trim).rotation.x = -0.35;  // 车把

  /* 悬浮光环 */
  const hover = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.07, 6, 28),
    glow
  );
  hover.rotation.x = Math.PI / 2;
  hover.position.y = 0.18;
  g.add(hover);

  g.userData.gun = gun;
  g.userData.muzzle = muzzle;
  g.userData.hover = hover;
  bakeStatic(g);
  return shadowAll(g);
}

/* ------------------------------------------------------ 工兵机甲 --- */
export function buildSCV(){
  const g = new THREE.Group();
  const hull = STEEL(), dark = STEEL_D(), trim = TRIM();
  const glow = GLOW_C(), amber = GLOW_A();

  box(g, 2.0, 1.9, 1.6, 0, 2.3, 0, hull);       // 躯干
  box(g, 2.4, 0.5, 1.9, 0, 3.1, 0, dark);       // 肩甲
  box(g, 1.0, 0.7, 1.0, 0, 3.35, 0.15, trim);   // 头部
  strip(g, 0.8, 0.16, 0.1, 0, 3.35, 0.68, glow);
  strip(g, 1.5, 0.14, 0.1, 0, 2.55, 0.83, glow);      // 胸口灯条
  strip(g, 1.2, 0.1, 0.1, 0, 1.85, 0.83, amber);      // 腰线警示灯

  for (const s of [-1, 1]){
    const arm = new THREE.Group();
    arm.position.set(s * 1.35, 2.9, 0);
    box(arm, 0.55, 1.5, 0.6, 0, -0.7, 0, hull);
    box(arm, 0.42, 1.2, 0.5, s * 0.1, -1.9, 0.25, dark);
    box(arm, 0.3, 0.4, 0.9, s * 0.1, -2.5, 0.5, trim);
    g.add(arm);
    g.userData[s > 0 ? 'armR' : 'armL'] = arm;

    const leg = new THREE.Group();
    leg.position.set(s * 0.6, 1.3, 0);
    box(leg, 0.55, 1.3, 0.65, 0, -0.6, 0, dark);
    box(leg, 0.8, 0.3, 1.1, 0, -1.3, 0.15, trim);
    g.add(leg);
    g.userData[s > 0 ? 'legR' : 'legL'] = leg;
  }
  box(g, 1.1, 1.2, 0.7, 0, 2.4, -0.9, dark);
  strip(g, 0.7, 0.1, 0.1, 0, 3.05, -0.85, amber);

  bakeStatic(g);
  return shadowAll(g);
}

/* --------------------------------------------------- 战列巡航舰 --- */
/* 约 58 米长的主力舰：舰艏撞角 + 长舰体 + 舰桥塔 + 三座炮塔 + 四台引擎 */
export function buildBattlecruiser(){
  const g = new THREE.Group();
  const hull = STEEL(), dark = STEEL_D(), light = STEEL_L(), trim = TRIM();
  const glass = GLASS(), glow = GLOW_C(), amber = GLOW_A(), rust = RUST();

  /* 舰体：前窄后宽的楔形（用四段叠出轮廓） */
  box(g, 7.0, 3.0, 10.0, 0, 0, 21.0, hull);        // 舰艏撞角
  box(g, 9.4, 4.2, 12.0, 0, 0.2, 12.0, hull);      // 前段
  box(g, 12.0, 5.0, 20.0, 0, 0, -2.0, hull);       // 中段
  box(g, 10.6, 4.2, 12.0, 0, -0.1, -18.0, dark);   // 后段
  box(g, 8.0, 3.0, 5.0, 0, 0, -25.5, trim);        // 尾喷基座

  /* 舰艏装甲板与撞角 */
  box(g, 5.2, 0.7, 5.0, 0, 1.7, 25.0, light);
  box(g, 3.4, 0.5, 4.0, 0, 1.9, 22.0, rust);
  for (const s of [-1, 1]){
    box(g, 0.9, 0.9, 6.0, s * 3.9, 0.6, 20.0, trim);
  }

  /* 舰桥塔（中后部偏上） */
  box(g, 5.0, 2.6, 7.0, 0, 3.4, -8.0, light);
  box(g, 3.6, 2.0, 4.4, 0, 5.4, -9.0, hull);
  box(g, 2.4, 1.2, 2.6, 0, 6.9, -9.6, trim);
  strip(g, 3.0, 0.16, 0.12, 0, 5.5, -6.8, glow);        // 舰桥窗带
  strip(g, 2.2, 0.14, 0.12, 0, 5.5, -11.2, glow);
  box(g, 0.5, 3.2, 0.5, 0, 8.6, -11.0, trim);           // 主桅
  strip(g, 0.22, 0.22, 0.22, 0, 10.3, -11.0, amber);

  /* 三座炮塔：舰艏两座 + 舰腹一座（大和炮） */
  const turrets = [];
  const mkTurret = (x, y, z, big) => {
    const t = new THREE.Group();
    t.position.set(x, y, z);
    cyl(t, big ? 2.0 : 1.5, big ? 2.4 : 1.8, big ? 1.5 : 1.1, 10, 0, 0.4, 0, light);
    box(t, big ? 2.6 : 2.0, 0.9, big ? 5.2 : 3.8, 0, 0.5, big ? 2.6 : 2.0, hull);
    const barrelY = 0.75;
    for (const s of [-1, 0, 1]){
      if (big && s === 0) continue;
      box(t, 0.34, 0.34, big ? 6.4 : 4.6, s * (big ? 0.6 : 0.5), barrelY, big ? 6.0 : 4.4, trim);
    }
    if (big){
      /* 大和炮：粗主炮 + 蓄能环 */
      cyl(t, 0.62, 0.72, 7.6, 12, 0, 0.9, 6.4, dark, false);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.14, 6, 18),
        new THREE.MeshStandardMaterial({
          color: 0x2a0c04, emissive: 0xff7a2a, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.5
        })
      );
      ring.position.set(0, 0.9, 3.2);
      t.add(ring);
      t.userData.chargeRing = ring;
    }
    g.add(t);
    turrets.push(t);
    return t;
  };
  mkTurret(0, 2.4, 14.0, false);
  mkTurret(0, 2.4, 2.0, false);
  mkTurret(0, -2.6, 6.0, true);      // 舰腹大和炮

  /* 侧舷：装甲带、舷窗、散热片 */
  for (const s of [-1, 1]){
    box(g, 1.2, 0.8, 26.0, s * 6.4, 0.4, -2.0, light);
    strip(g, 0.12, 0.22, 16.0, s * 6.05, 1.5, -1.0, glow);
    strip(g, 0.1, 0.1, 8.0, s * 6.0, -1.2, -4.0, amber);
    for (let i = 0; i < 4; i++){
      box(g, 0.5, 1.4, 2.0, s * 6.2, 1.9, -14.0 + i * 3.4, trim);
    }
    /* 侧翼稳定翼 */
    box(g, 5.0, 0.35, 7.0, s * 8.4, -0.2, -20.0, hull);
    box(g, 2.2, 0.3, 3.0, s * 11.0, 0, -22.0, trim);
  }

  /* 引擎：四台主喷口 + 发光盘 */
  const flames = [];
  const engines = [[-3.4, 0], [3.4, 0], [-6.2, -1.0], [6.2, -1.0]];
  for (const [ex, ey] of engines){
    cyl(g, 1.5, 1.9, 4.4, 12, ex, ey, -26.5, dark);
    const f = new THREE.Mesh(
      new THREE.CircleGeometry(1.42, 22),
      new THREE.MeshBasicMaterial({
        color: 0x7fdcff, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    f.position.set(ex, ey, -28.8);
    f.rotation.y = Math.PI;
    g.add(f);
    flames.push(f);
  }
  const engLight = new THREE.PointLight(0x4fd6ff, 26, 60, 2);
  engLight.position.set(0, 0, -26);
  g.add(engLight);

  /* 舰体编号与警示条 */
  box(g, 6.0, 0.1, 0.5, 0, 2.55, 8.0, amber);
  box(g, 4.0, 0.1, 0.4, 0, 2.55, -14.0, amber);

  /* 舰腹机库：凹槽 + 暖光带 + 两条引导灯 */
  box(g, 7.6, 0.8, 12.0, 0, -2.6, 12.0, trim);
  strip(g, 6.2, 0.18, 0.14, 0, -2.95, 7.2, amber);
  strip(g, 6.2, 0.18, 0.14, 0, -2.95, 16.8, amber);
  for (const s of [-1, 1]){
    strip(g, 0.12, 0.12, 4.2, s * 3.0, -2.95, 12.0, glow);
  }
  /* 舰腹装甲肋条 */
  for (let i = 0; i < 5; i++){
    box(g, 8.4, 0.5, 0.7, 0, -2.55, -2.0 + i * 3.6, dark);
  }

  bakeStatic(g);
  /* 大和炮炮口标记（演出用，bakeStatic 只合网格，不动空物体） */
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -3.7, 14.2);
  g.add(muzzle);
  g.userData.yamatoMuzzle = muzzle;
  g.userData.flames = flames;
  g.userData.light = engLight;
  g.userData.turrets = turrets;
  return shadowAll(g);
}
