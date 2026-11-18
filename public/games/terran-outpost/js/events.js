/* 波间随机事件：补给空投 / 虫群侧袭 / 陨石雨 / 虫巢禁卫 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const SIDES = [
  { a: 0, name: '东侧' },
  { a: Math.PI / 2, name: '南侧' },
  { a: Math.PI, name: '西侧' },
  { a: -Math.PI / 2, name: '北侧' }
];
const rnd = (a = 1) => Math.random() * a;
const rand = (a, b) => a + Math.random() * (b - a);

function dist2(ax, az, bx, bz){
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}

export function createEvents({ enemies, world, actors, resources, buildings, combat, fx, audio, toast }){
  let active = null;
  let elite = null;
  let cooldown = 14;
  const tmp = new THREE.Vector3();

  function canStart(){
    return !active && enemies.wave >= 1 && enemies.wave < 10 &&
      enemies.aliveCount() === 0 && enemies.nextWaveIn > 7;
  }

  function pickType(){
    const r = Math.random();
    if (r < 0.38) return 'supply';
    if (r < 0.68) return 'raid';
    if (r < 0.90) return 'meteor';
    return 'elite';
  }

  function addMinerals(n){
    resources.wallet.minerals += n;
    if (audio && audio.deposit) audio.deposit(resources.depotPoint);
    const el = document.getElementById('res-minerals');
    if (el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function removeObj(obj){
    if (!obj) return;
    world.remove(obj);
    obj.traverse(o => {
      if (o.geometry && !o.userData.shared) o.geometry.dispose();
      if (o.material && o.material.dispose && o.userData.ownMat) o.material.dispose();
    });
  }

  function groundRing(x, z, color, r0 = 3.4, r1 = 4.1){
    const geo = new THREE.RingGeometry(r0, r1, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.08, z);
    m.userData.ownMat = true;
    world.add(m);
    return m;
  }

  function beacon(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color: 0x39464e, metalness: 0.55, roughness: 0.5 });
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 1.2, 8), mat);
    pod.position.y = 0.6; g.add(pod);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0x63d6ff }));
    top.position.y = 1.35; g.add(top);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.0, 14, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x63d6ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 8; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x63d6ff, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; g.add(ring);
    g.userData.beam = beam; g.userData.ring = ring; g.userData.top = top;
    world.add(g);
    return g;
  }

  function startSupply(){
    let x = 0, z = 0;
    for (let tries = 0; tries < 14; tries++){
      const a = rnd(TAU), r = rand(92, 128);
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      let bad = false;
      for (const b of buildings){
        const rr = (b.radius || 10) + 5;
        if (dist2(x, z, b.center.x, b.center.z) < rr * rr){ bad = true; break; }
      }
      if (!bad && enemies.nests){
        for (const n of enemies.nests){
          if (n.dead) continue;
          if (dist2(x, z, n.g.position.x, n.g.position.z) < 16 * 16){ bad = true; break; }
        }
      }
      if (!bad) break;
    }
    const obj = beacon(x, z);
    active = { type: 'supply', t: 0, x, z, obj, hold: 0, ready: false, markers: [{ x, z, type: 'supply' }] };
    toast('补给舱信标已锁定 · 8 秒后落地，派单位靠近领取');
    if (audio && audio.alarm) audio.alarm(new THREE.Vector3(x, 0, z));
  }

  function updateSupply(dt){
    const a = active;
    a.t += dt;
    if (a.obj){
      a.obj.userData.ring.scale.setScalar(1 + Math.sin(a.t * 3) * 0.08);
      a.obj.userData.beam.material.opacity = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(a.t * 2));
    }
    if (!a.ready && a.t >= 8){
      a.ready = true;
      toast('补给舱已落地 · 45 秒内靠近 3 米领取');
    }
    if (!a.ready) return;
    let near = false;
    for (const p of actors.people){
      if (p.state === 'hidden' || p.state === 'dead') continue;
      if (dist2(p.g.position.x, p.g.position.z, a.x, a.z) < 3.2 * 3.2){ near = true; break; }
    }
    if (!near){
      for (const v of actors.tanks){
        if (v.state === 'dead') continue;
        if (dist2(v.g.position.x, v.g.position.z, a.x, a.z) < 3.2 * 3.2){ near = true; break; }
      }
    }
    a.hold = near ? a.hold + dt : 0;
    if (a.hold >= 1.6){
      addMinerals(80);
      if (fx) fx.sparkAt(new THREE.Vector3(a.x, 1.2, a.z), 18, 0x7dffd0);
      toast('补给已回收 · +80 矿');
      finish(18);
      return;
    }
    if (a.t > 8 + 45){
      toast('补给舱已失效');
      finish(16);
    }
  }

  function finish(cd = 20){
    if (active){
      if (active.obj) removeObj(active.obj);
      if (active.ring) removeObj(active.ring);
      if (active.rings) for (const r of active.rings) removeObj(r);
      if (active.pts) for (const p of active.pts) if (p.ring) removeObj(p.ring);
    }
    active = null;
    cooldown = cd;
  }

  function startRaid(){
    const side = SIDES[Math.floor(rnd(SIDES.length))];
    const a = side.a + rand(-0.25, 0.25);
    const r = rand(118, 134);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const ring = groundRing(x, z, 0xff6a4a, 4.4, 5.2);
    active = { type: 'raid', t: 0, side, a, r, x, z, count: Math.min(8, 3 + Math.floor(enemies.wave / 2)), ring,
      markers: [{ x, z, type: 'raid' }] };
    toast('警报：侧翼虫群将从' + side.name + '来袭 · 6 秒');
    if (audio && audio.alarm) audio.alarm(new THREE.Vector3(x, 0, z));
  }

  function updateRaid(dt){
    const a = active;
    a.t += dt;
    if (a.ring) a.ring.material.opacity = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(a.t * 6));
    if (a.t < 6) return;
    const list = [];
    for (let i = 0; i < a.count; i++){
      list.push(enemies.spawn('zergling', a.a + rand(-0.28, 0.28), a.r + rand(-3, 3)));
    }
    if (fx) for (const e of list) fx.sparkAt(e.g.position.clone().setY(0.8), 5, 0x9a6aff);
    toast('侧翼虫群已出现 · ' + a.count + ' 只');
    if (audio && audio.alarm) audio.alarm(new THREE.Vector3(a.x, 0, a.z));
    finish(18);
  }

  function startMeteor(){
    const pts = [];
    for (let i = 0; i < 4; i++){
      let x = 0, z = 0;
      for (let tries = 0; tries < 10; tries++){
        const ang = rnd(TAU), rr = rand(34, 112);
        x = Math.cos(ang) * rr; z = Math.sin(ang) * rr;
        if (dist2(x, z, 0, 0) > 26 * 26) break;
      }
      const ring = groundRing(x, z, 0xff8a3a, 2.2, 3.1);
      pts.push({ x, z, ring });
    }
    active = { type: 'meteor', t: 0, pts, markers: pts.map(p => ({ x: p.x, z: p.z, type: 'meteor' })) };
    toast('警报：陨石雨即将落下 · 7 秒，离开红圈');
    if (audio && audio.alarm) audio.alarm(new THREE.Vector3(0, 6, 0));
  }

  function updateMeteor(dt){
    const a = active;
    a.t += dt;
    for (const p of a.pts){
      if (p.ring){
        p.ring.material.opacity = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(a.t * 5 + p.x));
        p.ring.scale.setScalar(1 + Math.sin(a.t * 3 + p.z) * 0.08);
      }
    }
    if (a.t < 7) return;
    let hits = 0;
    for (const p of a.pts){
      if (fx) fx.sparkAt(new THREE.Vector3(p.x, 1.0, p.z), 26, 0xffb454);
      if (audio && audio.explode) audio.explode(new THREE.Vector3(p.x, 0, p.z));
      for (const u of actors.people){
        if (u.state === 'hidden' || u.state === 'dead') continue;
        if (dist2(u.g.position.x, u.g.position.z, p.x, p.z) < 4.2 * 4.2) combat.damage(u, 45, 'normal');
      }
      for (const v of actors.tanks){
        if (v.state === 'dead') continue;
        if (dist2(v.g.position.x, v.g.position.z, p.x, p.z) < 4.2 * 4.2) combat.damage(v, 45, 'normal');
      }
      for (const b of buildings){
        if (b.key === 'command') continue;          /* 不让随机事件直接判负 */
        const rr = (b.radius || 10) * 0.7;
        if (dist2(b.center.x, b.center.z, p.x, p.z) < rr * rr) combat.damage(b, 45, 'normal');
      }
      for (const e of enemies.list){
        if (e.dead || e.isNest || e.air) continue;
        if (dist2(e.g.position.x, e.g.position.z, p.x, p.z) < 4.2 * 4.2){ combat.damage(e, 45, 'normal'); hits++; }
      }
    }
    addMinerals(30 * a.pts.length);
    toast('陨石雨结束 · 回收 ' + (30 * a.pts.length) + ' 矿');
    finish(20);
  }

  function startElite(){
    const side = SIDES[Math.floor(rnd(SIDES.length))];
    const kind = Math.random() < 0.55 ? 'roach' : 'viper';
    const alt = kind === 'viper' ? 19 : undefined;
    const e = enemies.spawn(kind, side.a + rand(-0.2, 0.2), rand(116, 132), alt);
    e.hp *= 3;
    e.maxHp *= 3;
    e.dmg = Math.round(e.dmg * 1.5);
    e.speed *= 0.78;
    e.isElite = true;
    e.g.scale.setScalar(1.35);
    elite = e;
    active = { type: 'elite', t: 0, markers: [{ x: e.g.position.x, z: e.g.position.z, type: 'elite' }] };
    toast('虫巢禁卫出现 · 击杀可回收 100 矿');
    if (audio && audio.alarm) audio.alarm(e.g.position);
    finish(24);
  }

  function rewardElite(){
    if (!elite || !elite.dead || elite.rewarded) return;
    elite.rewarded = true;
    addMinerals(100);
    for (const v of actors.tanks){
      if (v.state === 'dead') continue;
      const r = combat.recFor(v, 'unit');
      if (r) r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.2);
    }
    if (fx) fx.sparkAt(elite.g.position.clone().setY(1.5), 24, 0xffd36a);
    toast('禁卫已击杀 · +100 矿，载具修复 20%');
    elite = null;
  }

  function update(dt){
    if (elite) rewardElite();
    if (!active){
      cooldown -= dt;
      if (cooldown <= 0 && canStart()) trigger(pickType());
      return;
    }
    if (active.type === 'supply') updateSupply(dt);
    else if (active.type === 'raid') updateRaid(dt);
    else if (active.type === 'meteor') updateMeteor(dt);
    else if (active.type === 'elite') active.t += dt;
  }

  function trigger(type){
    if (active) finish(10);
    if (type === 'supply') startSupply();
    else if (type === 'raid') startRaid();
    else if (type === 'meteor') startMeteor();
    else if (type === 'elite') startElite();
    return active && { type: active.type, markers: active.markers };
  }

  return {
    update, trigger,
    get active(){ return active && { type: active.type, t: active.t }; },
    get markers(){
      const out = active && active.markers ? active.markers.slice() : [];
      if (elite && !elite.dead) out.push({ x: elite.g.position.x, z: elite.g.position.z, type: 'elite' });
      return out;
    },
    get elite(){ return elite; }
  };
}
