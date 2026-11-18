/* 场地：平台、钢板地面、环形道路、高架栈桥、管线电缆、探照灯、烟雾与尘埃 */
import * as THREE from 'three';
import { TAU, rand, rnd, box, cyl, strip, ring, textDecal, glowMat, warnMat, bakeStatic } from './core.js';

export function buildBase({ M, tex, world }){
  const searchlights = [];
  const smokeSystems = [];
  const platformR = 150;

  /* ---- 地面远景（基地外的荒地） ---- */
  const terrain = new THREE.Mesh(
    new THREE.CircleGeometry(4200, 84),
    new THREE.MeshStandardMaterial({ color: 0x33352f, roughness: 0.98, metalness: 0.02 })
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -8.5;
  terrain.receiveShadow = true;
  world.add(terrain);

  /* ---- 平台主体 ---- */
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(platformR, platformR + 2.5, 7, 72, 1),
    new THREE.MeshStandardMaterial({ color: 0x3d454d, metalness: 0.45, roughness: 0.62 })
  );
  platform.position.y = -3.6;
  platform.castShadow = true;
  platform.receiveShadow = true;
  world.add(platform);

  /* ---- 平台钢板地面 ---- */
  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(platformR - 0.4, 96),
    new THREE.MeshStandardMaterial({ map: tex.ground, color: 0xdfe8ef, metalness: 0.32, roughness: 0.72 })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.03;
  deck.receiveShadow = true;
  world.add(deck);

  /* ---- 边缘警示带 ---- */
  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(platformR - 1.2, 0.55, 8, 128),
    new THREE.MeshStandardMaterial({ map: tex.hazard, color: 0xb8c4ce, metalness: 0.3, roughness: 0.7 })
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.55;
  world.add(edge);

  /* ---- 支撑桩（内圈 + 外环） ---- */
  for (let i = 0; i < 20; i++){
    const a = i / 20 * TAU;
    const p = cyl(world, 1.5, 2.0, 9, 8, Math.cos(a) * 68, -8, Math.sin(a) * 68, M.hullDark);
    p.castShadow = true;
  }
  for (let i = 0; i < 24; i++){
    const a = i / 24 * TAU;
    const p = cyl(world, 1.9, 2.5, 9, 8, Math.cos(a) * 137, -8, Math.sin(a) * 137, M.hullDark);
    p.castShadow = true;
  }

  /* ---- 环形主干道 ---- */
  const road = new THREE.Mesh(
    new THREE.RingGeometry(23, 30.5, 128, 1),
    new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.92, metalness: 0.2,
      polygonOffset: true, polygonOffsetFactor: -1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.07;
  road.receiveShadow = true;
  world.add(road);

  /* 道路中心虚线 */
  {
    const N = 110;
    const inst = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.7, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xd6c07a, emissive: 0x3a2f16, emissiveIntensity: 0.6, roughness: 0.6 }),
      N
    );
    const d = new THREE.Object3D();
    for (let i = 0; i < N; i++){
      const a = i / N * TAU;
      d.position.set(Math.cos(a) * 26.7, 0.09, Math.sin(a) * 26.7);
      d.rotation.set(-Math.PI / 2, 0, -a);
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    world.add(inst);
  }

  /* ---- 地面编号 ---- */
  const decals = [
    ['C-01', 0, 33, 0], ['B-02', 34, 10, -0.5], ['B-03', -36, 8, 0.4],
    ['F-04', -20, -34, 1.2], ['S-05', 20, -34, -1.1], ['K-06', 6, 44, 0],
    ['T-07', 50, 6, 0], ['D-08', -48, -8, 0], ['R-09', 48, -16, 0]
  ];
  for (const [t, x, z, rot] of decals){
    const d = textDecal(t, 128);
    d.position.set(x, 0.1, z);
    d.rotation.z = rot;
    world.add(d);
  }

  /* ---- 通往两座前进矿点的后勤公路 ---- */
  {
    const linkMat = new THREE.MeshStandardMaterial({ color: 0x2b333a, roughness: 0.94, metalness: 0.16,
      polygonOffset: true, polygonOffsetFactor: -1 });
    for (const [tx, tz] of [[104, 74], [-108, -52]]){
      const len = Math.hypot(tx, tz);
      const dx = tx / len, dz = tz / len;
      const start = 32, end = len - 10;
      const road = box(world, 4.6, 0.07, end - start,
        dx * (start + end) / 2, 0.075, dz * (start + end) / 2, linkMat);
      road.rotation.y = Math.atan2(dx, dz);
      road.receiveShadow = true;
    }
  }

  /* ---- 高架环形栈桥 ---- */
  buildCatwalk(world, M);

  /* ---- 地面管线 ---- */
  const pipeRuns = [
    [[0, 12], [8, 34], 0.3], [[0, 12], [-14, 36], 0.26],
    [[12, -8], [30, -26], 0.28], [[-12, -10], [-30, -28], 0.3],
    [[34, 8], [48, -12], 0.24], [[-34, 6], [-46, -6], 0.24],
    [[20, 18], [30, 34], 0.22]
  ];
  for (const [a, b, r] of pipeRuns) groundPipe(world, M, a, b, r);

  /* ---- 悬空电缆 ---- */
  const cableRuns = [
    [[0, 10, 14], [34, 10, 10], 3.2],
    [[0, 12, 10], [-34, 11, 8], 3.6],
    [[0, 13, 6], [22, 12, -28], 4.2],
    [[0, 13, 6], [-22, 12, -28], 4.0],
    [[12, 9, 38], [50, 12, 8], 4.5]
  ];
  for (const [a, b, sag] of cableRuns) cable(world, M, a, b, sag);

  /* ---- 探照灯 ---- */
  searchlights.push(makeSearchlight(world, M, -46, 30, 5.6, 0.0));
  searchlights.push(makeSearchlight(world, M, 44, 26, 5.6, 2.1));
  searchlights.push(makeSearchlight(world, M, 8, -44, 5.6, 4.3));

  /* ---- 漂浮尘埃 ---- */
  const dust = makeDust(world);

  /* ---- 贴地薄雾（远景层次） ---- */
  const haze = makeHaze(world, tex.smoke);

  /* ---- 杂项道具与边界指示灯 ---- */
  makeProps(world, M, tex);
  makePerimeterLights(world, platformR);


  /* ---- 烟雾（供建筑调用） ---- */
  const addSmoke = (origin, count = 44, spread = 0.8) => {
    const s = makeSmoke(world, tex.smoke, origin, count, spread);
    smokeSystems.push(s);
    return s;
  };

  return { searchlights, smokeSystems, dust, haze, addSmoke, platformR };
}

/* ----------------------------------------------------- 贴地薄雾 ---- */
function makeHaze(world, tex){
  const group = new THREE.Group();
  world.add(group);
  const sprites = [];
  const N = 14;
  for (let i = 0; i < N; i++){
    const a = i / N * TAU + rand(-0.12, 0.12);
    const r = rand(96, 150);
    const s = rand(46, 72);
    const mat = new THREE.SpriteMaterial({
      map: tex, color: 0x93aab8, transparent: true, opacity: rand(0.02, 0.045),
      depthWrite: false, blending: THREE.NormalBlending, fog: true
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(Math.cos(a) * r, rand(0.8, 3.2), Math.sin(a) * r);
    sp.scale.set(s, s * 0.32, 1);
    sp.userData = { r, a, speed: rand(0.004, 0.011) * (i % 2 ? 1 : -1), baseY: sp.position.y, phase: rand(0, TAU) };
    group.add(sp);
    sprites.push(sp);
  }
  return {
    group, sprites,
    update(dt, t){
      for (const sp of sprites){
        const u = sp.userData;
        u.a += u.speed * dt;
        sp.position.set(Math.cos(u.a) * u.r, u.baseY + Math.sin(t * 0.25 + u.phase) * 0.5, Math.sin(u.a) * u.r);
      }
    }
  };
}

/* ------------------------------------------- 杂项道具（货箱油桶） ---- */
function makeProps(world, M, tex){
  const spots = [
    [16, 26, 0.4], [-18, 28, -0.3], [38, 14, 1.1], [-38, -16, 0.2],
    [24, -16, -0.7], [-6, -40, 0.9], [42, 34, 0.3], [-28, 34, 1.4],
    [52, -4, -0.5], [-52, 10, 0.8]
  ];
  const crateMat = new THREE.MeshStandardMaterial({ map: tex.hazard, color: 0x9aa6ae, metalness: 0.35, roughness: 0.7 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x7a5a34, metalness: 0.5, roughness: 0.55 });

  for (const [x, z, rot] of spots){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;

    /* 两三个货箱叠放 */
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++){
      const w = rand(2.0, 2.8), h = rand(1.4, 2.0), d = rand(1.6, 2.4);
      const b = box(g, w, h, d, rand(-0.6, 0.6), h / 2 + (i > 1 ? h : 0), rand(-0.5, 0.5), crateMat);
      b.castShadow = true; b.receiveShadow = true;
      b.rotation.y = rand(-0.25, 0.25);
    }
    /* 油桶 */
    const m = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < m; i++){
      const c = cyl(g, 0.55, 0.55, 1.5, 10, 2.2 + (i % 3) * 1.3, 0.75, -1.4 + Math.floor(i / 3) * 1.3, barrelMat);
      c.castShadow = true;
    }
    world.add(g);
  }
}

/* ------------------------------------------- 远景剪影（地平线） ---- */
function makeHorizon(world){
  const mat = new THREE.MeshStandardMaterial({ color: 0x161c21, roughness: 1.0, metalness: 0.0 });
  const g = new THREE.Group();
  world.add(g);
  const N = 16;
  for (let i = 0; i < N; i++){
    const a = i / N * TAU + rand(-0.09, 0.09);
    const r = rand(320, 520);
    const w = rand(40, 110), h = rand(10, 34), d = rand(24, 60);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(Math.cos(a) * r, -8.5 + h / 2, Math.sin(a) * r);
    m.rotation.y = -a + rand(-0.3, 0.3);
    g.add(m);
  }
  /* 几座更高的塔状残骸，做出层次 */
  for (let i = 0; i < 5; i++){
    const a = rand(0, TAU);
    const r = rand(360, 560);
    const h = rand(40, 78);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rand(6, 14), rand(10, 20), h, 6), mat);
    m.position.set(Math.cos(a) * r, -8.5 + h / 2, Math.sin(a) * r);
    g.add(m);
  }
}
function makePerimeterLights(world, R){
  const N = 36;
  const mat = new THREE.MeshStandardMaterial({ color: 0x201408, emissive: 0xff9430, emissiveIntensity: 1.6 });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), mat, N);
  const d = new THREE.Object3D();
  for (let i = 0; i < N; i++){
    const a = i / N * TAU;
    d.position.set(Math.cos(a) * (R - 4.5), 0.35, Math.sin(a) * (R - 4.5));
    d.rotation.set(0, -a, 0);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  world.add(inst);

  /* 沿环形道路内侧的地面灯带 */
  const N2 = 60;
  const mat2 = new THREE.MeshStandardMaterial({ color: 0x0d1a20, emissive: 0x2fb6e0, emissiveIntensity: 1.1 });
  const inst2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.12, 0.24), mat2, N2);
  for (let i = 0; i < N2; i++){
    const a = i / N2 * TAU;
    d.position.set(Math.cos(a) * 31.2, 0.16, Math.sin(a) * 31.2);
    d.rotation.set(0, -a, 0);
    d.updateMatrix();
    inst2.setMatrixAt(i, d.matrix);
  }
  inst2.instanceMatrix.needsUpdate = true;
  world.add(inst2);
}

/* --------------------------------------------------------- 栈桥 ---- */
function buildCatwalk(world, M){
  const IN = 23.8, OUT = 28.6, TOP = 6.62, DECK = 0.42;
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x4b565f, metalness: 0.52, roughness: 0.46, map: M.plate.map
  });
  const cyan = glowMat(0x63d6ff, 1.5);
  const amber = warnMat(0xffa63a, 1.35);

  /* 真正的环形桥面：内径 23.8、外径 28.6、厚 0.42 米 */
  const shape = new THREE.Shape();
  shape.absarc(0, 0, OUT, 0, TAU, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, IN, 0, TAU, true);
  shape.holes.push(hole);
  const deck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: DECK, bevelEnabled: false, curveSegments: 96 }),
    deckMat
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = TOP - DECK;
  deck.castShadow = true;
  deck.receiveShadow = true;
  world.add(deck);

  /* 桥面分块缝：径向钢板缝 */
  for (let i = 0; i < 24; i++){
    const a = i / 24 * TAU;
    const mid = (IN + OUT) / 2;
    const seam = box(world, 0.055, 0.035, OUT - IN, Math.cos(a) * mid, TOP + 0.02, Math.sin(a) * mid, M.grate);
    seam.rotation.y = Math.PI / 2 - a;
  }

  /* 内外边缘灯带 */
  ring(world, OUT - 0.12, 0.065, 0, TOP + 0.03, 0, cyan, 128);
  ring(world, IN + 0.12, 0.05, 0, TOP + 0.03, 0, cyan, 128);
  /* 桥面下的结构环 */
  ring(world, 25.6, 0.16, 0, TOP - DECK - 0.18, 0, M.hullDark, 96);

  /* 主环栏杆：外侧 3 道、内侧 2 道；四个楼梯口留常开缺口 */
  const RAIL_GAP = 0.17;
  const RAIL_ARCS = [
    [RAIL_GAP, Math.PI / 2 - RAIL_GAP],
    [Math.PI / 2 + RAIL_GAP, Math.PI - RAIL_GAP],
    [Math.PI + RAIL_GAP, Math.PI * 1.5 - RAIL_GAP],
    [Math.PI * 1.5 + RAIL_GAP, Math.PI * 2 - RAIL_GAP]
  ];
  function railArc(radius, tube, y, a0, a1){
    const span = a1 - a0;
    if (span <= 0) return;
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 6, Math.max(6, Math.round(span / (Math.PI * 2) * 96)), span),
      M.pipe
    );
    m.rotation.x = Math.PI / 2;
    m.rotation.y = -a0;
    m.position.y = y;
    m.castShadow = true;
    world.add(m);
  }
  for (const y of [6.98, 7.58, 8.18]) for (const [a0, a1] of RAIL_ARCS) railArc(OUT - 0.15, 0.055, y, a0, a1);
  for (const y of [6.98, 7.58]) for (const [a0, a1] of RAIL_ARCS) railArc(IN + 0.15, 0.05, y, a0, a1);

  /* 栏杆立柱：楼梯口两侧不立柱，形成可走缺口 */
  {
    const N = 84;
    const rails = [];
    for (let i = 0; i < N; i++){
      const a = i / N * Math.PI * 2;
      const near = [0, Math.PI / 2, Math.PI, -Math.PI / 2].some(s => {
        const d = Math.atan2(Math.sin(a - s), Math.cos(a - s));
        return Math.abs(d) < RAIL_GAP + 0.012;
      });
      if (!near) rails.push(a);
    }
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 1.55, 0.13), M.pipe, rails.length * 2);
    const d = new THREE.Object3D();
    for (let i = 0; i < rails.length; i++){
      const a = rails[i];
      for (let k = 0; k < 2; k++){
        const rr = k === 0 ? OUT - 0.15 : IN + 0.15;
        d.position.set(Math.cos(a) * rr, 7.4, Math.sin(a) * rr);
        d.rotation.set(0, 0, 0);
        d.updateMatrix();
        inst.setMatrixAt(i * 2 + k, d.matrix);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    world.add(inst);
  }

  /* 支撑柱与斜撑 */
  for (let i = 0; i < 20; i++){
    const a = i / 20 * TAU;
    const c = cyl(world, 0.42, 0.55, 6.3, 6, Math.cos(a) * 25.6, 3.1, Math.sin(a) * 25.6, M.hullDark);
    c.castShadow = true;
  }
  for (let i = 0; i < 16; i++){
    const a = i / 16 * TAU;
    const A = new THREE.Vector3(Math.cos(a) * 25.5, 3.6, Math.sin(a) * 25.5);
    const B = new THREE.Vector3(Math.cos(a) * 27.9, TOP - 0.55, Math.sin(a) * 27.9);
    const dir = B.clone().sub(A);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, dir.length(), 6), M.hullDark);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    world.add(m);
  }

  /* 四个引桥入口的橙色警示带 */
  for (const ang of [0, Math.PI / 2, Math.PI, -Math.PI / 2]){
    const hz = box(world, 3.4, 0.06, 0.8, Math.cos(ang) * 27.2, TOP + 0.04, Math.sin(ang) * 27.2, amber);
    hz.rotation.y = -ang;
  }

  /* 8 个哨兵岗位：小平台 + 向外矮盾 + 岗位灯 */
  const SIDES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  for (const side of SIDES){
    for (const off of [-0.115, 0.115]){
      const a = side + off;
      const pad = new THREE.Group();
      pad.position.set(Math.cos(a) * 26, TOP + 0.02, Math.sin(a) * 26);
      pad.rotation.y = Math.PI / 2 - a;
      box(pad, 2.5, 0.12, 1.6, 0, 0, 0, M.plate);
      /* 齐腰矮盾：不挡住哨兵上半身，从基地外也能一眼看到守卫 */
      box(pad, 2.35, 0.55, 0.16, 0, 0.28, 0.82, M.hull);
      box(pad, 0.62, 0.5, 0.45, -0.82, 0.28, 0.15, M.hullDark);
      strip(pad, 2.0, 0.07, 0.07, 0, 0.58, 0.78, cyan);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), cyan);
      lamp.position.set(0.85, 0.64, 0.72);
      pad.add(lamp);
      /* 脚下灯带，夜里勾出岗位轮廓 */
      strip(pad, 2.3, 0.04, 0.04, 0, 0.08, -0.72, warnMat(0xffa63a, 1.2));
      world.add(pad);
    }
  }

  /* 四条落地楼梯：从桥面外缘一级级下到地面，替换原先悬空的斜板 */
  const STAIR_N = 20;
  const STAIR_TOP = 6.62;
  const STAIR_IN = 28.45;
  const STAIR_RUN = 6.8;
  const STAIR_TREAD = STAIR_RUN / STAIR_N;
  const STAIR_RISE = STAIR_TOP / STAIR_N;
  const stairAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const stairHazard = warnMat(0xffa63a, 1.1);
  for (const ang of stairAngles){
    const g = new THREE.Group();
    g.position.set(Math.cos(ang) * STAIR_IN, 0, Math.sin(ang) * STAIR_IN);
    g.rotation.y = Math.PI / 2 - ang;      /* 本地 +Z 指向环外 */

    for (let i = 0; i < STAIR_N; i++){
      const y = STAIR_TOP - i * STAIR_RISE;
      const z = 0.17 + i * STAIR_TREAD;
      box(g, 3.2, 0.16, STAIR_TREAD + 0.02, 0, y - 0.08, z, deckMat);
      /* 每隔三级一条橙色防滑边 */
      if (i % 3 === 0){
        strip(g, 3.0, 0.035, 0.06, 0, y + 0.005, z + 0.14, stairHazard);
      }
      /* 支撑柱：楼梯下方落到地面 */
      if (i > 2 && i % 4 === 0){
        const h = Math.max(0.25, y - 0.2);
        box(g, 0.18, h, 0.18, -1.35, h / 2, z, M.pipe);
        box(g, 0.18, h, 0.18, 1.35, h / 2, z, M.pipe);
      }
    }

    /* 两侧斜梁与扶手，把台阶连成一个整体 */
    const slope = Math.atan2(STAIR_TOP, STAIR_RUN);
    const beamLen = Math.hypot(STAIR_RUN, STAIR_TOP);
    for (const s of [-1, 1]){
      const beam = box(g, 0.12, 0.42, beamLen, s * 1.68, STAIR_TOP / 2 - 0.26, STAIR_RUN / 2, M.pipe);
      beam.rotation.x = slope;
      const rail = box(g, 0.09, 0.09, beamLen, s * 1.78, STAIR_TOP / 2 + 1.02, STAIR_RUN / 2, M.pipe);
      rail.rotation.x = slope;
      for (let i = 0; i <= STAIR_N; i += 3){
        const y = STAIR_TOP - i * STAIR_RISE;
        const z = 0.17 + i * STAIR_TREAD;
        box(g, 0.09, 1.02, 0.09, s * 1.78, y + 0.51, z, M.pipe);
      }
    }

    /* 底部落客平台与门柱 */
    box(g, 4.4, 0.16, 3.0, 0, 0.08, STAIR_RUN + 1.5, deckMat);
    box(g, 4.4, 0.04, 0.08, 0, 0.17, STAIR_RUN + 2.95, warnMat(0xffa63a, 1.15));
    for (const s of [-1, 1]){
      box(g, 0.18, 1.45, 0.18, s * 2.22, 0.88, STAIR_RUN + 2.4, M.pipe);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), warnMat(0xffb454, 1.8));
      lamp.position.set(s * 2.22, 1.66, STAIR_RUN + 2.4);
      g.add(lamp);
    }

    /* 顶部两侧门柱，和桥面栏杆接上 */
    for (const s of [-1, 1]){
      box(g, 0.18, 1.25, 0.18, s * 1.8, STAIR_TOP + 0.62, -0.12, M.pipe);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glowMat(0x63d6ff, 1.4));
      lamp.position.set(s * 1.8, STAIR_TOP + 1.3, -0.12);
      g.add(lamp);
    }

    bakeStatic(g);       /* 每座楼梯合成少量网格，避免 4×80 个 draw call */
    world.add(g);
  }

  /* 桥下冷光：只留 4 盏主光，其余靠自发光灯带，减少前向渲染的点光开销 */
  for (let i = 0; i < 4; i++){
    const a = i / 4 * TAU + Math.PI / 4;
    const l = new THREE.PointLight(0x63d6ff, 7.5, 18, 2);
    l.position.set(Math.cos(a) * 25.8, 5.65, Math.sin(a) * 25.8);
    world.add(l);
  }
}

/* ------------------------------------------------------- 地面管线 ---- */
function groundPipe(world, M, a, b, radius){
  const A = new THREE.Vector3(a[0], 0.4, a[1]);
  const B = new THREE.Vector3(b[0], 0.4, b[1]);
  const dir = B.clone().sub(A);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 10);
  const m = new THREE.Mesh(geo, M.pipe);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.castShadow = true;
  world.add(m);

  /* 支架 */
  const n = Math.max(2, Math.round(len / 6));
  for (let i = 1; i < n; i++){
    const p = A.clone().lerp(B, i / n);
    const s = box(world, 0.16, 0.9, 0.9, p.x, 0.05, p.z, M.hullDark);
    s.rotation.y = Math.atan2(dir.x, dir.z);
  }

  /* 细的伴行线 */
  const geo2 = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, len, 8);
  const m2 = new THREE.Mesh(geo2, M.cable);
  const off = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(radius * 2.2);
  m2.position.copy(A).add(B).multiplyScalar(0.5).add(off);
  m2.quaternion.copy(m.quaternion);
  world.add(m2);
}

/* --------------------------------------------------------- 电缆 ---- */
function cable(world, M, a, b, sag){
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.075, 6, false), M.cable);
  world.add(tube);
}

/* ------------------------------------------------------- 探照灯 ---- */
function makeSearchlight(world, M, x, z, baseY, phase){
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  cyl(g, 1.1, 1.5, baseY, 8, 0, baseY / 2, 0, M.hullDark);
  const head = box(g, 1.9, 1.4, 2.2, 0, baseY + 0.9, 0, M.plate);

  const yoke = new THREE.Group();
  yoke.position.set(0, baseY + 0.9, 0);
  g.add(yoke);

  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20),
    new THREE.MeshStandardMaterial({ color: 0xdff2ff, emissive: 0xd8f2ff, emissiveIntensity: 2.4 }));
  lamp.position.z = 1.14;
  yoke.add(lamp);

  const spot = new THREE.SpotLight(0xcfeaff, 0, 200, 0.19, 0.55, 1.2);
  spot.position.set(0, 0, 1.2);
  yoke.add(spot);
  const spotTarget = new THREE.Object3D();
  world.add(spotTarget);
  spot.target = spotTarget;

  /* 可见光锥（自定义着色器，沿长度两端渐隐） */
  const coneGeo = new THREE.ConeGeometry(7.5, 92, 32, 1, true);
  coneGeo.rotateX(Math.PI / 2);
  coneGeo.translate(0, 0, 46);
  const coneMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x24455c) },
      uOpacity: { value: 0.0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity;
      varying vec2 vUv;
      void main(){
        float t = clamp(vUv.y, 0.0, 1.0);
        float a = pow(sin(t * 3.14159265), 1.5) * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  const conePivot = new THREE.Group();
  conePivot.position.set(0, baseY + 0.9, 0);
  conePivot.add(cone);
  g.add(conePivot);

  world.add(g);
  return { group: g, yoke, lamp, spot, cone, coneMat, conePivot, x, z, baseY: baseY + 0.9, phase, speed: 0.22 + rnd() * 0.12 };
}

/* --------------------------------------------------------- 烟雾 ---- */
function makeSmoke(world, tex, origin, count, spread){
  const pos = new Float32Array(count * 3);
  const vel = [];
  const life = new Float32Array(count);
  for (let i = 0; i < count; i++){
    pos[i*3] = origin.x + rand(-spread, spread);
    pos[i*3+1] = origin.y + rand(0, 2);
    pos[i*3+2] = origin.z + rand(-spread, spread);
    vel.push(new THREE.Vector3(rand(-0.5, 0.5), rand(1.2, 2.4), rand(-0.5, 0.5)));
    life[i] = rand(0, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: tex, size: 7.5, transparent: true, opacity: 0.34, depthWrite: false,
    color: 0x9fb0bc, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  world.add(pts);
  return { pts, origin: origin.clone(), count, vel, life, spread };
}

/* --------------------------------------------------------- 尘埃 ---- */
function makeDust(world){
  const N = 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++){
    const r = rand(0, 95);
    const a = rand(0, TAU);
    pos[i*3] = Math.cos(a) * r;
    pos[i*3+1] = rand(0.5, 40);
    pos[i*3+2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xbcd6e6, size: 0.28, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  world.add(pts);
  world.userData.dust = pts;
  return pts;
}
