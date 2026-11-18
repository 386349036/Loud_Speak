/* 兵种：陆战队员 / 火焰兵 / 医疗兵 —— 模型与参数表 */
import * as THREE from 'three';
import { box, cyl, strip, glowMat, bakeStatic } from './core.js';

/* ------------------------------------------------------------ 参数表 --- */
export const UNIT_TYPES = {
  marine: {
    name: '陆战队员', en: 'MARINE', speed: 4.6, range: 12, gap: 3.2,
    ring: 0x63d6ff, scale: [0.98, 1.08], rank: 1,
    hp: 45, armor: 'light', dmg: 6, dmgType: 'normal', cd: 0.62, atkRange: 7.0, proj: 'bullet',
    canHitAir: true
  },
  firebat: {
    name: '火焰兵', en: 'FIREBAT', speed: 3.9, range: 5.0, gap: 4.4,
    ring: 0xff9a4a, scale: [1.04, 1.12], rank: 0,
    hp: 55, armor: 'light', dmg: 7, dmgType: 'fire', cd: 0.9, atkRange: 4.2, proj: 'flame'
  },
  medic: {
    name: '医疗兵', en: 'MEDIC', speed: 5.0, range: 8, gap: 2.6,
    ring: 0x7fe0c6, scale: [0.94, 1.02], rank: 2,
    hp: 40, armor: 'light', dmg: 0, dmgType: 'heal', cd: 0.5, atkRange: 6.0, heal: 5, proj: 'heal'
  },
  /* 栈桥哨兵（js/sentries.js）：固定站位、不可操控、不占人口，只借用参数表与射击逻辑 */
  sentry: {
    name: '栈桥哨兵', en: 'SENTRY', speed: 4.2, range: 15, gap: 3,
    ring: 0x63d6ff, scale: 1, rank: 1,
    hp: 55, armor: 'light', dmg: 7, dmgType: 'normal', cd: 0.7, atkRange: 15, proj: 'bullet',
    canHitAir: true
  },
  /* 工厂载具（js/actors.js + js/vehicles.js 使用） */
  tank: {
    name: '攻城坦克', en: 'SIEGE TANK', speed: 3.2, range: 9, gap: 6.0,
    ring: 0xffb454, scale: 1, rank: 2,
    hp: 150, armor: 'armored', dmg: 12, dmgType: 'normal', cd: 0.9, atkRange: 7.5, proj: 'bullet',
    bonusArmored: 8, canHitAir: false,
    siege: { dmg: 32, bonusArmored: 20, cd: 2.2, atkRange: 13, transform: 2.0,
             splash: [1.25, 1.75, 2.25], frac: [1, 0.5, 0.25] }
  },
  vulture: {
    name: '秃鹰摩托', en: 'VULTURE', speed: 6.5, range: 6, gap: 4.0,
    ring: 0xffd36a, scale: 1, rank: 1,
    hp: 80, armor: 'light', dmg: 18, dmgType: 'normal', cd: 1.4, atkRange: 6.5, proj: 'bullet',
    canHitAir: false, mines: 3
  },
  /* 空中单位（由 js/aircraft.js 使用） */
  viking: {
    name: '维京战机', en: 'VIKING', speed: 26, range: 16, gap: 8,
    ring: 0xa8b8ff, scale: 1, rank: 3,
    hp: 120, armor: 'armored', dmg: 9, dmgType: 'normal', cd: 0.55, atkRange: 17, proj: 'bullet'
  },
  dropship: {
    name: '运输舰', en: 'DROPSHIP', speed: 22, range: 8, gap: 10,
    ring: 0x9fd8ff, scale: 1, rank: 3,
    hp: 160, armor: 'armored', dmg: 0, dmgType: 'none', cd: 1, atkRange: 0, proj: 'none'
  },
  battlecruiser: {
    name: '战列巡航舰', en: 'BATTLECRUISER', speed: 10, range: 30, gap: 14,
    ring: 0xffb469, scale: 1, rank: 3,
    hp: 900, armor: 'armored', dmg: 6, dmgType: 'normal', cd: 0.42, atkRange: 30, proj: 'bullet'
  }
};

const SPEC = {
  marine: { hull: 0x5c6b78, hullL: 0x8e9ca8, dark: 0x232c33, trim: 0xd8e4ea, light: 0x63d6ff },
  firebat: { hull: 0x3c4247, hullL: 0x6a655c, dark: 0x1d2226, trim: 0xff8a3a, light: 0xff7a2a },
  medic: { hull: 0xa9bcc4, hullL: 0xdce8ec, dark: 0x2b343a, trim: 0x63e2c4, light: 0x7ff0d4 }
};

function mats(kind){
  const s = SPEC[kind];
  return {
    hull: new THREE.MeshStandardMaterial({ color: s.hull, metalness: 0.45, roughness: 0.55 }),
    hullL: new THREE.MeshStandardMaterial({ color: s.hullL, metalness: 0.4, roughness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: s.dark, metalness: 0.3, roughness: 0.8 }),
    trim: new THREE.MeshStandardMaterial({ color: s.trim, metalness: 0.3, roughness: 0.6 }),
    visor: glowMat(s.light, 1.5),
    lamp: glowMat(s.light, 2.2)
  };
}

/* 双腿 / 双臂通用骨架 */
function rig(g, m, { hip = 0.32, legW = 0.42, legH = 1.5, armY = 2.85, armX = 0.72 } = {}){
  const legs = [], arms = [];
  for (const s of [-1, 1]){
    const leg = new THREE.Group();
    leg.position.set(s * hip, 1.5, 0);
    box(leg, legW, legH, legW * 1.15, 0, -legH / 2, 0, m.dark);
    box(leg, legW * 1.15, 0.26, legW * 1.55, 0, -legH - 0.08, 0.1, m.hull);
    g.add(leg);
    legs.push(leg);

    const arm = new THREE.Group();
    arm.position.set(s * armX, armY, 0);
    box(arm, 0.32, 1.15, 0.34, 0, -0.55, 0, m.hull);
    box(arm, 0.36, 0.34, 0.4, 0, -1.2, 0.04, m.dark);
    g.add(arm);
    arms.push(arm);
  }
  return { legs, arms };
}

/* ------------------------------------------------------- 陆战队员 --- */
function buildMarine(){
  const g = new THREE.Group();
  const m = mats('marine');
  const { legs, arms } = rig(g, m, { hip: 0.33, legW: 0.44, legH: 1.5, armY: 2.86, armX: 0.76 });

  box(g, 1.06, 1.42, 0.74, 0, 2.3, 0, m.hull);              // 躯干
  box(g, 1.16, 0.46, 0.8, 0, 2.72, 0.02, m.hullL);          // 胸甲
  strip(g, 0.5, 0.1, 0.06, 0, 2.6, 0.4, m.trim);            // 胸条
  box(g, 0.62, 0.52, 0.62, 0, 3.44, 0.02, m.dark);          // 头盔
  const visor = strip(g, 0.5, 0.18, 0.06, 0, 3.46, 0.33, m.visor);
  strip(g, 0.16, 0.28, 0.66, 0, 3.72, -0.02, m.hullL);      // 头脊
  box(g, 0.58, 0.34, 0.7, 0, 3.14, -0.06, m.hull);          // 颈环

  /* 肩甲：明显外扩，SC2 陆战的宽肩轮廓 */
  for (const s of [-1, 1]){
    box(g, 0.5, 0.5, 0.78, s * 0.84, 2.9, 0, m.hullL);
    box(g, 0.14, 0.2, 0.5, s * 1.08, 3.02, 0, m.trim);
  }

  /* 背包 + 天线 */
  box(g, 0.72, 0.95, 0.44, 0, 2.4, -0.55, m.dark);
  strip(g, 0.5, 0.1, 0.04, 0, 2.72, -0.78, m.lamp);
  cyl(g, 0.05, 0.05, 0.9, 5, 0.28, 3.9, -0.4, m.dark);

  /* C-14 步枪：右臂端起，枪身向前 */
  const gun = new THREE.Group();
  gun.position.set(0, -1.1, 0.16);
  box(gun, 0.19, 0.22, 1.0, 0, 0, 0.28, m.dark);            // 机匣
  box(gun, 0.15, 0.3, 0.22, 0, -0.2, 0.1, m.dark);          // 弹匣
  box(gun, 0.13, 0.12, 0.5, 0, 0.17, 0.1, m.hull);          // 提把
  cyl(gun, 0.07, 0.07, 0.95, 8, 0, 0.02, 1.2, m.hullL);     // 枪管
  box(gun, 0.16, 0.16, 0.2, 0, 0.02, 0.8, m.hull);          // 护木
  const muzzle = strip(gun, 0.12, 0.12, 0.16, 0, 0.02, 1.72, m.lamp);
  box(gun, 0.12, 0.2, 0.34, 0, -0.05, -0.34, m.hull);       // 枪托
  arms[1].add(gun);

  bakeStatic(g);
  g.userData = {
    legs, arms, visor, kind: 'marine', gun, muzzle,
    armBase: [0, 0], lockArm1: true
  };
  return g;
}

/* --------------------------------------------------------- 火焰兵 --- */
function buildFirebat(){
  const g = new THREE.Group();
  const m = mats('firebat');
  const { legs, arms } = rig(g, m, { hip: 0.42, legW: 0.5, legH: 1.34, armY: 2.82, armX: 0.86 });

  box(g, 1.3, 1.5, 0.92, 0, 2.22, 0, m.hull);               // 厚重躯干
  box(g, 1.42, 0.4, 0.98, 0, 2.86, 0, m.hullL);             // 肩带
  strip(g, 0.9, 0.12, 0.06, 0, 2.66, 0.48, m.trim);         // 橙色警示
  box(g, 0.66, 0.5, 0.6, 0, 3.3, 0.04, m.dark);             // 头盔
  const visor = strip(g, 0.56, 0.12, 0.06, 0, 3.32, 0.32, m.visor);
  box(g, 0.7, 0.3, 0.42, 0, 3.56, -0.08, m.hullL);          // 头罩

  /* 双燃料罐 */
  for (const s of [-1, 1]){
    cyl(g, 0.36, 0.36, 1.35, 10, s * 0.52, 2.5, -0.72, m.hullL);
    strip(g, 0.76, 0.1, 0.76, 0, 2.16, -0.72, m.trim);
    cyl(g, 0.12, 0.12, 0.2, 8, s * 0.52, 3.24, -0.72, m.dark);
  }
  /* 供燃软管 */
  for (const s of [-1, 1]){
    const hose = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.06, 5, 12, Math.PI * 0.9),
      m.dark
    );
    hose.position.set(s * 0.62, 2.62, -0.34);
    hose.rotation.set(0.3, s * 0.5, 0);
    g.add(hose);
  }

  /* 双臂喷管：粗短前伸 + 点火头 */
  const nozzles = [];
  for (let i = 0; i < 2; i++){
    const arm = arms[i];
    box(arm, 0.44, 0.5, 0.8, 0, -1.02, 0.34, m.hullL);      // 前臂外壳
    cyl(arm, 0.19, 0.22, 0.5, 10, 0, -1.06, 0.86, m.dark);  // 喷管
    const tip = strip(arm, 0.3, 0.16, 0.12, 0, -1.06, 1.12, m.lamp);
    nozzles.push(tip);
  }

  bakeStatic(g);
  g.userData = {
    legs, arms, visor, kind: 'firebat', nozzles, tanks: true,
    armBase: [0, 0], lockArm1: true
  };
  return g;
}

/* --------------------------------------------------------- 医疗兵 --- */
function buildMedic(){
  const g = new THREE.Group();
  const m = mats('medic');
  const { legs, arms } = rig(g, m, { hip: 0.28, legW: 0.34, legH: 1.52, armY: 2.84, armX: 0.62 });

  box(g, 0.82, 1.32, 0.62, 0, 2.28, 0, m.hull);             // 纤细躯干
  box(g, 0.9, 0.34, 0.68, 0, 2.74, 0.02, m.hullL);          // 护胸
  strip(g, 0.34, 0.1, 0.06, 0, 2.62, 0.34, m.trim);
  box(g, 0.54, 0.46, 0.54, 0, 3.38, 0.02, m.dark);          // 头盔
  const visor = strip(g, 0.46, 0.26, 0.06, 0, 3.4, 0.29, m.visor);
  cyl(g, 0.04, 0.04, 0.7, 5, 0.24, 3.86, -0.16, m.dark);    // 细天线

  for (const s of [-1, 1]){
    box(g, 0.3, 0.26, 0.56, s * 0.58, 2.92, 0, m.hullL);    // 轻肩甲
  }

  /* 医疗背包：白箱 + 十字 + 药剂罐 */
  box(g, 0.62, 0.86, 0.42, 0, 2.36, -0.5, m.hullL);
  strip(g, 0.34, 0.1, 0.04, 0, 2.46, -0.72, m.lamp);
  strip(g, 0.1, 0.34, 0.04, 0, 2.46, -0.72, m.lamp);
  const cans = [];
  for (const s of [-1, 1]){
    cyl(g, 0.1, 0.1, 0.5, 8, s * 0.2, 1.94, -0.5, m.trim);
    cans.push(strip(g, 0.12, 0.08, 0.12, s * 0.2, 1.7, -0.5, m.lamp));
  }

  /* 治疗枪：短管 + 发光注射头 */
  const gun = new THREE.Group();
  gun.position.set(0, -1.12, 0.2);
  box(gun, 0.14, 0.18, 0.44, 0, 0, 0.14, m.dark);
  cyl(gun, 0.05, 0.05, 0.5, 8, 0, 0, 0.5, m.hullL);
  strip(gun, 0.1, 0.1, 0.14, 0, 0, 0.76, m.lamp);
  arms[1].add(gun);

  bakeStatic(g);
  g.userData = {
    legs, arms, visor, kind: 'medic', gun, cans, cross: true,
    armBase: [0, 0], lockArm1: true
  };
  return g;
}

export function buildUnit(kind){
  if (kind === 'firebat') return buildFirebat();
  if (kind === 'medic') return buildMedic();
  return buildMarine();
}

/* 待机特征：枪口 / 喷口 / 药剂罐的呼吸与闪烁（不动骨骼，避免与步行动画打架） */
export function animateUnitTrait(g, t, moving){
  const u = g.userData;
  if (!u || !u.kind) return;
  if (u.kind === 'marine'){
    if (u.gun) u.gun.position.z = 0.28 + Math.sin(t * 1.1) * 0.02;
    if (u.muzzle) u.muzzle.material.emissiveIntensity = 1.5 + Math.sin(t * 2.6) * 0.35;
  } else if (u.kind === 'firebat'){
    const f = 0.8 + Math.abs(Math.sin(t * 3.1)) * 0.6;
    for (const n of u.nozzles || []) n.material.emissiveIntensity = f * 2.0;
  } else if (u.kind === 'medic'){
    const p = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.4));
    for (const c of u.cans || []) c.material.emissiveIntensity = 1.2 + p * 1.4;
  }
}
