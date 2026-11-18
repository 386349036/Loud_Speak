/* 特效：全息蓝图 / 能量充能 / 机械施工 + 共享粒子池 */
import * as THREE from 'three';
import { TAU, rand, rnd } from './core.js';

const CYAN = 0x4fd0ff;
const AMBER = 0xffa63a;

export function createFx({ scene, world, tex }){
  let nightK = 0;
  const effects = [];      // 活动特效 [{update(dt,t)->bool}]
  const tmpV = new THREE.Vector3();

  /* ------------------------------------------------ 粒子池 --- */
  const POOL = 900;
  const pos = new Float32Array(POOL * 3);
  const col = new Float32Array(POOL * 3);
  const vel = new Float32Array(POOL * 3);
  const life = new Float32Array(POOL);
  const maxLife = new Float32Array(POOL);
  const grav = new Float32Array(POOL);
  let cursor = 0;

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.55, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  world.add(points);

  function spawnParticle(x, y, z, vx, vy, vz, r, g, b, ttl, g0 = -6){
    const i = cursor;
    cursor = (cursor + 1) % POOL;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    life[i] = ttl; maxLife[i] = ttl; grav[i] = g0;
  }

  function updateParticles(dt){
    let alive = false;
    for (let i = 0; i < POOL; i++){
      if (life[i] <= 0) continue;
      alive = true;
      life[i] -= dt;
      if (life[i] <= 0){ pos[i * 3 + 1] = -9999; continue; }
      vel[i * 3 + 1] += grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    if (alive){
      pGeo.attributes.position.needsUpdate = true;
    }
    pMat.opacity = 0.9 * (1 - nightK * 0.25);
  }

  /* --------------------------------------------- 共享着色器 --- */
  const arcUniforms = u => ({
    uColor: { value: new THREE.Color(u.color) },
    uProgress: { value: 0 },
    uOpacity: { value: u.opacity ?? 0.9 }
  });

  const ARC_VS = `
    varying vec3 vPos;
    void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `;
  const ARC_FS = `
    uniform vec3 uColor; uniform float uProgress; uniform float uOpacity;
    varying vec3 vPos;
    void main(){
      float a = atan(vPos.y, vPos.x);
      float t = (a + 3.14159265) / 6.2831853;
      if (t > uProgress) discard;
      gl_FragColor = vec4(uColor, uOpacity * (0.72 + 0.28 * sin(t * 42.0)));
    }
  `;

  function makeArcRing(radius, y, color = CYAN, opacity = 0.95, thickness = 1.6){
    const geo = new THREE.RingGeometry(radius, radius * (1 + 0.02 * thickness), 128, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: arcUniforms({ color, opacity }),
      vertexShader: ARC_VS, fragmentShader: ARC_FS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    return m;
  }

  /* 竖直光柱：两端渐隐 */
  const BEAM_FS = `
    uniform vec3 uColor; uniform float uOpacity;
    varying vec2 vUv;
    void main(){
      float a = pow(sin(clamp(vUv.y, 0.0, 1.0) * 3.14159265), 1.4) * uOpacity;
      gl_FragColor = vec4(uColor, a);
    }
  `;

  function makeBeam(radius, height, color = CYAN, opacity = 0.24){
    const geo = new THREE.CylinderGeometry(radius * 0.55, radius, height, 24, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
      vertexShader: ARC_VS, fragmentShader: BEAM_FS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = height / 2;
    return m;
  }

  /* ------------------------------------------------ 全息蓝图 --- */
  function makeBlueprint(b){
    const g = new THREE.Group();
    const R = Math.max(5, b.radius * 0.72);
    const H = Math.max(9, b.radius * 0.9);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x9fe8ff, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const addWire = (w, h, d, y) => {
      const box = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(box);
      const line = new THREE.LineSegments(edges, lineMat.clone());
      line.position.y = y;
      g.add(line);
      box.dispose();
    };
    /* 三段体量 + 顶部小塔，形成“蓝图剪影” */
    addWire(R * 1.5, H * 0.34, R * 1.1, H * 0.17);
    addWire(R * 1.1, H * 0.3, R * 0.85, H * 0.49);
    addWire(R * 0.6, H * 0.26, R * 0.5, H * 0.77);

    /* 扫描面（用柔和径向贴图，避免变成一块蓝色板子） */
    const scanGeo = new THREE.PlaneGeometry(R * 1.5, R * 1.2);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x63d8ff, transparent: true, opacity: 0.3,
      map: tex.smoke, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const scan = new THREE.Mesh(scanGeo, scanMat);
    scan.rotation.x = -Math.PI / 2;
    g.add(scan);

    /* 顶部进度环 */
    const ringMesh = makeArcRing(R * 0.45, H + 2.2, CYAN, 0.95, 2.2);
    g.add(ringMesh);

    /* 竖向细线（全息栅格） */
    const gridMat = new THREE.LineBasicMaterial({ color: 0x3fb8e0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    const gridPts = [];
    for (let i = 0; i < 12; i++){
      const a = i / 12 * TAU;
      const x = Math.cos(a) * R * 0.8, z = Math.sin(a) * R * 0.8;
      gridPts.push(x, 0, z, x, H, z);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    g.add(new THREE.LineSegments(gridGeo, gridMat));

    return { group: g, scan, scanMat, ringMesh, lineMat, gridMat, H, R };
  }

  /* ------------------------------------------------ 机械施工 --- */
  function makeCrane(b){
    const g = new THREE.Group();
    const p = b.workPoint || b.center;
    g.position.set(p.x, 0, p.z);
    const facing = b.doorFacing || new THREE.Vector3(0, 0, 1);
    g.rotation.y = Math.atan2(facing.x, facing.z);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 6.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b7780, metalness: 0.45, roughness: 0.55 }));
    mast.position.y = 3.2;
    mast.castShadow = true;
    g.add(mast);

    const arm = new THREE.Group();
    arm.position.y = 6.2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x8b2f18, metalness: 0.4, roughness: 0.6 }));
    beam.position.z = 2.1;
    beam.castShadow = true;
    arm.add(beam);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    tip.position.set(0, 0, 4.2);
    arm.add(tip);
    const cableLen = 2.4;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, cableLen, 4),
      new THREE.MeshStandardMaterial({ color: 0x20262b }));
    cable.position.set(0, -cableLen / 2, 4.2);
    arm.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xcaa04a, metalness: 0.6, roughness: 0.4 }));
    hook.position.set(0, -cableLen, 4.2);
    arm.add(hook);
    g.add(arm);

    return { group: g, arm, hook, tip };
  }

  /* ------------------------------------------------ 特效装配 --- */
  function hologramFx(b, dur){
    const bp = makeBlueprint(b);
    const holder = new THREE.Group();
    holder.position.set(b.center.x, b.center.y * 0.15 + 0.4, b.center.z);
    holder.add(bp.group);
    world.add(holder);

    const charge = makeArcRing(Math.max(4, b.radius * 0.92), 0.3, 0x4bb4dc, 0.34, 0.85);
    charge.position.set(b.center.x, 0.3, b.center.z);
    world.add(charge);

    let t = 0;
    let progress = 0;
    let done = false;
    let doneAt = 0;
    let fade = 1;
    const e = {
      update(dt, now){
        t += dt;
        if (done){
          fade = Math.max(0, 1 - (t - doneAt) / 0.6);
          holder.scale.setScalar(1 + (1 - fade) * 0.22);
          holder.traverse(o2 => {
            const m = o2.material;
            if (m && m.transparent && m.opacity !== undefined){
              if (m.userData.baseOp === undefined) m.userData.baseOp = m.opacity;
              m.opacity = m.userData.baseOp * fade;
            }
          });
          charge.material.uniforms.uOpacity.value = 0.4 * fade;
          return fade > 0.01;
        }
        const k = Math.min(1, progress);
        charge.material.uniforms.uProgress.value = k;
        bp.ringMesh.material.uniforms.uProgress.value = k;
        const scanY = bp.H * (0.04 + 0.92 * ((now * 0.35) % 1));
        bp.scan.position.y = scanY;
        bp.scanMat.opacity = (0.16 + 0.1 * Math.sin(now * 12)) * (1 - nightK * 0.3);
        const flick = 0.62 + 0.12 * Math.sin(now * 33) + 0.06 * Math.sin(now * 71);
        bp.group.traverse(o2 => {
          if (o2.material && o2.material.isLineBasicMaterial) o2.material.opacity = flick * (1 - nightK * 0.25);
        });
        /* 上升粒子 */
        if (rnd() < dt * 26 * Math.max(0.2, k)){
          const a = rand(0, TAU), r = rand(2, b.radius * 0.9);
          spawnParticle(b.center.x + Math.cos(a) * r, rand(0.4, 2.2), b.center.z + Math.sin(a) * r,
            rand(-0.3, 0.3), rand(2.4, 5.2), rand(-0.3, 0.3), 0.42, 0.82, 1.0, rand(0.8, 1.6), 1.6);
        }
        return true;
      },
      setProgress(p){ progress = p; },
      finish(){ done = true; doneAt = t; },
      abort(){ this.finish(); },
      dispose(){
        world.remove(holder, charge);
        holder.traverse(o2 => { if (o2.geometry) o2.geometry.dispose(); });
        charge.geometry.dispose(); charge.material.dispose();
      }
    };
    effects.push(e);
    return e;
  }

  function constructFx(b, dur){
    const crane = makeCrane(b);
    world.add(crane.group);
    const p = b.workPoint || b.center;
    let t = 0, progress = 0, done = false, doneAt = 0;
    const e = {
      update(dt, now){
        t += dt;
        if (done){
          const o = Math.max(0, 1 - (t - doneAt) / 0.9);
          crane.group.traverse(o2 => { if (o2.material) o2.material.opacity = o; });
          return o > 0.01;
        }
        const k = Math.min(1, progress);
        crane.arm.rotation.y = Math.sin(now * 0.9) * 0.55;
        crane.arm.rotation.x = -0.18 + Math.sin(now * 1.7) * 0.12;
        crane.hook.position.y = -2.4 - Math.sin(now * 1.7) * 0.35;
        crane.tip.material.color.setHex(Math.sin(now * 9) > 0 ? 0xfff2cf : 0xffb257);
        /* 焊花 */
        if (rnd() < dt * 34 * (0.35 + k * 0.65)){
          const a = rand(0, TAU), r = rand(1.2, 3.4);
          spawnParticle(p.x + Math.cos(a) * r, rand(1.6, 4.2), p.z + Math.sin(a) * r,
            rand(-2.2, 2.2), rand(1.5, 5.5), rand(-2.2, 2.2), 1.0, 0.72, 0.34, rand(0.35, 0.9), -9);
        }
        return true;
      },
      setProgress(p){ progress = p; },
      finish(){
        done = true; doneAt = t;
        steamAt(new THREE.Vector3(p.x, 2.4, p.z));
      },
      abort(){ this.finish(); },
      dispose(){
        world.remove(crane.group);
        crane.group.traverse(o2 => { if (o2.geometry) o2.geometry.dispose(); });
      }
    };
    effects.push(e);
    return e;
  }

  /* ------------------------------------------------ 一次性特效 --- */
  const steamPool = [];

  function steamAt(v){
    for (let i = 0; i < 3; i++){
      const mat = new THREE.SpriteMaterial({
        map: tex.smoke, color: 0xdfeaf2, transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.NormalBlending
      });
      const sp = new THREE.Sprite(mat);
      sp.position.copy(v).add(new THREE.Vector3(rand(-1.5, 1.5), rand(0, 1), rand(-1.5, 1.5)));
      sp.scale.setScalar(rand(2.5, 4));
      world.add(sp);
      steamPool.push({ sp, t: 0, life: rand(0.9, 1.5), vy: rand(0.6, 1.6), vs: rand(2.5, 5) });
    }
  }

  function sparkAt(v, n = 18, color = 0xffb85c){
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++){
      spawnParticle(v.x, v.y, v.z,
        rand(-3, 3), rand(1, 6), rand(-3, 3), c.r, c.g, c.b, rand(0.3, 0.8), -10);
    }
  }

  function updSteam(dt){
    for (let i = steamPool.length - 1; i >= 0; i--){
      const s = steamPool[i];
      s.t += dt;
      const k = s.t / s.life;
      if (k >= 1){
        world.remove(s.sp);
        s.sp.material.dispose();
        steamPool.splice(i, 1);
        continue;
      }
      s.sp.position.y += s.vy * dt;
      s.sp.scale.setScalar(s.vs * (0.4 + k * 1.5));
      s.sp.material.opacity = 0.5 * (1 - k);
    }
  }

  return {
    hologram: hologramFx,
    construct: constructFx,
    sparkAt,
    steamAt,
    update(dt, t){
      updateParticles(dt);
      updSteam(dt);
      for (let i = effects.length - 1; i >= 0; i--){
        const alive = effects[i].update(dt, t);
        if (alive === false){
          effects[i].dispose();
          effects.splice(i, 1);
        }
      }
    },
    setNight(k){ nightK = k; },
    get active(){ return effects.length; },
    clearAll(){
      for (const e of effects) e.dispose();
      effects.length = 0;
      for (const s of steamPool) world.remove(s.sp);
      steamPool.length = 0;
    }
  };
}
