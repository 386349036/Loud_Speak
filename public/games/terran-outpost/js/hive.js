/* 虫巢主基地：三座子巢是护盾，全部摧毁后主巢暴露；第 6 波苏醒。 */
import * as THREE from 'three';
import { buildNest } from './enemies.js';
import { TAU } from './core.js';
import { addExtraObstacle } from './nav.js';

export const HIVE_POS = { x: 130, z: 0 };
export const HIVE_RADIUS = 20;
export const HIVE_HP = 3200;

function buildHiveModel(){
  const g = new THREE.Group();

  /* 以虫巢为底座放大，保留原有的生物光与脉动 */
  const base = buildNest();
  base.scale.setScalar(2.9);
  base.traverse(o => { if (o.isLight) o.visible = false; });   // 避免再增加全场点光
  g.add(base);

  const membrane = new THREE.MeshStandardMaterial({
    color: 0x3a1430, emissive: 0x9b3cff, emissiveIntensity: 0.7,
    roughness: 0.55, metalness: 0.05, flatShading: true
  });
  const bone = new THREE.MeshStandardMaterial({
    color: 0x6b4b52, roughness: 0.72, metalness: 0.08, flatShading: true
  });

  /* 外圈四根喷孢子塔，给主巢一个明确的轮廓 */
  for (let i = 0; i < 4; i++){
    const a = i / 4 * TAU + Math.PI / 4;
    const tower = new THREE.Group();
    const x = Math.cos(a) * 19.5, z = Math.sin(a) * 19.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.0, 7.2, 6), bone);
    stem.position.y = 3.4; stem.castShadow = true; tower.add(stem);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.6, 6), membrane);
    cap.position.y = 7.7; cap.castShadow = true; tower.add(cap);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xd78cff }));
    tip.position.y = 9.2; tower.add(tip);
    tower.position.set(x, 0, z);
    g.add(tower);
  }

  /* 主巢口的环形膜与几根外露触须 */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.28, 6, 36), membrane);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 14.2;
  g.add(ring);
  for (let i = 0; i < 6; i++){
    const a = i / 6 * TAU;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.55, 5.2, 5), bone);
    t.position.set(Math.cos(a) * 8.4, 12.4, Math.sin(a) * 8.4);
    t.rotation.z = Math.cos(a) * 0.7;
    t.rotation.x = -Math.sin(a) * 0.7;
    t.castShadow = true;
    g.add(t);
  }

  g.userData.pulse = base.userData.pulse;
  g.userData.ring = ring;
  return g;
}

export function createHive({ world, enemies, fx, onAwake, onShieldDown, onDestroyed }){
  const g = buildHiveModel();
  g.position.set(HIVE_POS.x, 0, HIVE_POS.z);
  world.add(g);
  addExtraObstacle({ center: g.position.clone(), radius: HIVE_RADIUS });

  const hive = {
    kind: 'hive', name: '虫巢主基地',
    isHive: true, isNest: true,
    spec: { hp: HIVE_HP, armor: 'armored', dmg: 0, dmgType: 'normal', cd: 1, range: 0, speed: 0, radius: HIVE_RADIUS, scale: [1, 1], name: '虫巢主基地' },
    g, hp: HIVE_HP, maxHp: HIVE_HP, armor: 'armored', radius: HIVE_RADIUS,
    air: false, alt: 0, baseAlt: 0, state: 'idle',
    dead: false, deadT: 0, target: null, cdT: 0, bob: 0, aggro: 0,
    awake: false, shielded: true
  };
  g.userData.enemy = hive;
  enemies.list.push(hive);
  enemies.hive = hive;

  let announced = false, shieldAnnounced = false;
  let guardsSpawned = false;

  /* 第 6 波苏醒时，从主巢边缘放出第一批守卫 */
  function spawnGuards(){
    if (guardsSpawned) return;
    guardsSpawned = true;
    /* 从主巢朝向基地的一侧放出，避免生成在平台外或巢体内部 */
    const defs = [
      ['zergling', -24, -12], ['zergling', -22, 12],
      ['zergling', -31, 0], ['zergling', -18, -18],
      ['roach', -18, 18], ['roach', -34, 0]
    ];
    for (const [kind, dx, dz] of defs){
      const x = HIVE_POS.x + dx, z = HIVE_POS.z + dz;
      const a = Math.atan2(z, x), r = Math.hypot(x, z);
      const e = enemies.spawn(kind, a + (Math.random() - 0.5) * 0.04, r);
      if (e) e.hiveGuard = true;
    }
    if (fx) fx.sparkAt(new THREE.Vector3(HIVE_POS.x, 8, HIVE_POS.z), 26, 0xb45cff);
  }

  function update(dt, t){
    if (hive.dead){
      if (!announced){
        announced = true;
        if (onDestroyed) onDestroyed(hive);
      }
      return;
    }

    if (!hive.awake && enemies.wave >= 6){
      hive.awake = true;
      spawnGuards();
      if (onAwake) onAwake(hive);
    }

    if (hive.shielded && enemies.nests.every(n => n.dead)){
      hive.shielded = false;
      if (onShieldDown) onShieldDown(hive);
    }

    /* 主巢呼吸与护盾脉冲（灯塔/粒子不参与，避免额外开销） */
    const p = g.userData.pulse;
    if (p){
      const k = 0.5 + 0.5 * Math.sin(t * 1.6);
      p.mat.emissiveIntensity = hive.shielded ? 1.9 + k * 1.1 : 1.0 + k * 0.6;
      p.ring.scale.setScalar(0.94 + k * 0.15);
      p.ring.material.opacity = 0.32 + k * 0.28;
    }
    if (hive.shielded){
      const ring = g.userData.ring;
      if (ring) ring.rotation.z += dt * 0.25;
    }
  }

  return { hive, update, spawnGuards, get guardsSpawned(){ return guardsSpawned; } };
}
