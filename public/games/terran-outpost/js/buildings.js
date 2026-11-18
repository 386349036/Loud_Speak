/* 九栋建筑：指挥中心、两座兵营、工厂、星港、补给站、导弹塔、地堡、维修平台 */
import * as THREE from 'three';
import { TAU, rand, rnd, box, cyl, strip, ring, glowMat, warnMat, textDecal, bakeStatic } from './core.js';

export function buildBuildings({ M, tex, world, addSmoke }){
  const list = [];

  const register = (b) => {
    if (!b.group.parent) world.add(b.group);
    b.group.updateMatrixWorld(true);
    b.accents = b.accents || [];
    b.beacons = b.beacons || [];
    b.doors = b.doors || [];
    addWindows(world, b);
    bakeStatic(b.group);          /* 静态部件按材质合并，压 draw call（会动的子组原样保留） */

    /* 门控与工作位：doorCtl 供生产/工人调用，workPoint 是门外 2.8 米的工作站 */
    let ctl = null;
    b.group.traverse(o => { if (!ctl && o.userData && o.userData.doorCtl) ctl = o.userData.doorCtl; });
    b.doorCtl = ctl;
    const d0 = b.doors[0];
    if (d0){
      b.workPoint = new THREE.Vector3(
        d0.pos.x + Math.sin(d0.yaw) * 2.8, 0,
        d0.pos.z + Math.cos(d0.yaw) * 2.8
      );
      b.doorFacing = new THREE.Vector3(Math.sin(d0.yaw), 0, Math.cos(d0.yaw));
    }
    list.push(b);
    return b;
  };

  /* 依据局部包围盒在立面补小窗格，让夜景有生活气 */
  function addWindows(world, b){
    const g = b.group;
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const bb = new THREE.Box3();
    const tmp = new THREE.Matrix4();
    const box = new THREE.Box3();
    g.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox);
      tmp.multiplyMatrices(inv, o.matrixWorld);
      box.applyMatrix4(tmp);
      bb.union(box);
    });
    if (bb.isEmpty()) return;
    if (!['barracks_a','barracks_b','factory','supply','bunker'].includes(b.key)) return;
    const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
    if (sy < 5 || sx < 5 || sz < 5 || sx > 34 || sz > 34) return;
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const bodyH = Math.min(sy, 12);

    const winMat = new THREE.MeshStandardMaterial({
      color: 0x14100a, emissive: 0xffc27a, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.1
    });
    b.accents.push(winMat);

    const step = 5.0, wsize = 1.6;
    const rows = bodyH > 9 ? [0.46, 0.72] : [0.62];
    for (const f of rows){
      const y = bb.min.y + bodyH * f;
      for (const s of [-1, 1]){
        const n = Math.floor((sx * 0.62) / step);
        for (let i = 0; i < n; i++){
          const x = cx - (n - 1) * step / 2 + i * step;
          const m = new THREE.Mesh(new THREE.BoxGeometry(wsize, 0.32, 0.07), winMat);
          m.position.set(x, y, s > 0 ? bb.max.z + 0.05 : bb.min.z - 0.05);
          g.add(m);
        }
        const n2 = Math.floor((sz * 0.62) / step);
        for (let i = 0; i < n2; i++){
          const z = cz - (n2 - 1) * step / 2 + i * step;
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, wsize), winMat);
          m.position.set(s > 0 ? bb.max.x + 0.05 : bb.min.x - 0.05, y, z);
          g.add(m);
        }
      }
    }
  }

  /* 门口：内凹门洞 + 双扇滑门 + 顶部警示灯 */
  function doorway(g, x, y, z, rotY, w = 3.4, h = 3.2, color = 0x4fd6ff){
    const d = new THREE.Group();
    d.position.set(x, y, z);
    d.rotation.y = rotY;
    box(d, w + 1.2, 0.5, 1.4, 0, h + 0.3, 0, M.hullDark);
    /* 门框内凹背板 */
    box(d, w + 0.4, h + 0.2, 0.2, 0, (h + 0.2) / 2, 0.02, M.grate);

    /* 双扇滑门 */
    const gate = new THREE.Group();
    gate.position.set(0, h / 2, 0.22);
    const half = w * 0.5;
    const left = box(gate, half - 0.06, h, 0.26, -half * 0.5, 0, 0, M.hullDark);
    const right = box(gate, half - 0.06, h, 0.26, half * 0.5, 0, 0, M.hullDark);
    for (const s of [-1, 1]){
      strip(gate, 0.14, h * 0.86, 0.1, s * (half - 0.22), 0, 0.1, warnMat(color, 1.1));
    }
    d.add(gate);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.22, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: color, emissiveIntensity: 2.2 }));
    lamp.position.set(0, h + 0.62, 0.1);
    d.add(lamp);

    /* 门控：open()/close() 只是设定目标，update(dt) 平滑滑开 */
    const ctl = {
      openAmount: 0, target: 0, hold: 0,
      open(hold = 1.8){ this.target = 1; this.hold = hold; },
      close(){ this.target = 0; },
      update(dt){
        this.openAmount += (this.target - this.openAmount) * Math.min(1, dt * 6.5);
        if (this.openAmount < 0.002) this.openAmount = this.target;
        const k = this.openAmount * (half * 0.92);
        left.position.x = -half * 0.5 - k;
        right.position.x = half * 0.5 + k;
        lamp.material.emissiveIntensity = 1.6 + this.openAmount * 2.4;
      }
    };
    d.userData.doorCtl = ctl;
    g.add(d);
    return { group: d, lampMat: lamp.material, ctl, left, right };
  }

  /* ---------------------------------------------------- 指挥中心 --- */
  {
    const g = new THREE.Group();
    const glow = glowMat(0x4fd0ff, 1.7);
    const cyan = glowMat(0x63d6ff, 1.1);
    const warn = warnMat(0xff8a2a, 1.5);
    const accents = [glow, cyan];
    const beacons = [warn];

    /* 八边形装甲基座：外圈停机/检修带 + 三座落地扶壁 */
    cyl(g, 15.5, 16.1, 1.5, 8, 0, 0.75, 0, M.plate);
    cyl(g, 14.2, 15.5, 2.5, 8, 0, 2.7, 0, M.hull);
    ring(g, 15.05, 0.13, 0, 3.95, 0, glow);
    for (const a of [0, Math.PI, -Math.PI / 2]){
      const x = Math.cos(a) * 13.5, z = Math.sin(a) * 13.5;
      box(g, 2.8, 2.3, 4.0, x, 1.5, z, M.hullDark);
      strip(g, 2.8, 0.09, 0.1, x, 2.64, z + (a === -Math.PI / 2 ? -2.0 : 2.0), warn);
    }

    /* 第一层：作战环廊，外侧挂八块可拆装甲板 */
    cyl(g, 12.6, 14.2, 5.2, 8, 0, 6.6, 0, M.hull);
    ring(g, 13.4, 0.16, 0, 9.1, 0, glow);
    ring(g, 14.32, 0.12, 0, 4.55, 0, M.pipe);
    for (let i = 0; i < 8; i++){
      const a = i / 8 * TAU;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.34) continue;
      const plate = box(g, 5.1, 2.7, 0.55, Math.cos(a) * 13.6, 7.0, Math.sin(a) * 13.6, M.plate);
      plate.rotation.y = -a + Math.PI / 2;
      const bolt = strip(g, 0.5, 0.08, 0.08, Math.cos(a) * 13.9, 8.1, Math.sin(a) * 13.9, warn);
      bolt.rotation.y = -a;
    }

    /* 两侧机库门：暗色舱门 + 橙色警示框 + 内部青色地灯 */
    for (const s of [-1, 1]){
      const hx = s * 13.55;
      box(g, 3.8, 2.5, 0.7, hx, 6.3, -2.0, M.hullDark);
      strip(g, 3.8, 0.11, 0.12, hx, 7.58, -2.0, warn);
      strip(g, 0.1, 2.5, 0.12, s * 13.95, 6.3, -2.0, cyan);
      box(g, 3.2, 0.08, 0.45, s * 13.3, 5.08, -1.55, cyan);
    }

    /* 第二层：指挥舰桥，正面悬挑观察窗，四角斜撑 */
    cyl(g, 10.0, 11.4, 4.6, 8, 0, 11.4, 0, M.hullLight);
    ring(g, 10.8, 0.14, 0, 13.75, 0, glow);
    box(g, 8.2, 2.15, 4.2, 0, 12.05, 9.6, M.hullLight);
    strip(g, 8.2, 0.12, 0.12, 0, 13.08, 11.7, glow);
    for (let i = 0; i < 5; i++) box(g, 1.05, 0.52, 0.08, -2.9 + i * 1.45, 12.2, 11.72, M.glass);
    for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]){
      const x = Math.cos(a) * 10.7, z = Math.sin(a) * 10.7;
      const sup = box(g, 0.75, 4.4, 0.75, x, 10.2, z, M.hullDark);
      sup.rotation.z = Math.cos(a) * 0.18;
      sup.rotation.x = -Math.sin(a) * 0.18;
    }

    /* 第三层：开放式装甲王冠，中心裸露反应堆 */
    cyl(g, 6.8, 8.0, 2.1, 8, 0, 15.05, 0, M.hull);
    ring(g, 7.35, 0.15, 0, 16.15, 0, glow);
    for (let i = 0; i < 8; i++){
      const a = i / 8 * TAU;
      const rib = box(g, 0.55, 1.7, 0.5, Math.cos(a) * 7.1, 16.0, Math.sin(a) * 7.1, M.hullDark);
      rib.rotation.y = -a;
    }

    const core = new THREE.Group();
    core.position.set(0, 17.9, 0);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(2.55, 26, 16), glowMat(0x2fc8ff, 1.55));
    core.add(orb);
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.13, 6, 44), cyan);
    coreRing.rotation.x = Math.PI / 2;
    core.add(coreRing);
    for (let i = 0; i < 4; i++){
      const a = i / 4 * TAU;
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 5), M.pipe);
      cage.position.set(Math.cos(a) * 3.15, 0.2, Math.sin(a) * 3.15);
      core.add(cage);
    }
    g.add(core);

    /* 六片可微开的装甲花瓣，包围但露出反应堆 */
    const petals = [];
    for (let i = 0; i < 6; i++){
      const a = i / 6 * TAU;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * 3.0, 16.45, Math.sin(a) * 3.0);
      pivot.rotation.y = -a;
      const blade = box(pivot, 2.1, 0.3, 3.8, 0, 0, 2.05, M.plate);
      blade.rotation.x = -0.36;
      strip(pivot, 1.9, 0.06, 0.08, 0, 0.18, 3.9, cyan);
      g.add(pivot);
      petals.push(pivot);
    }

    /* 非对称：左侧雷达、右侧高桅杆、前方传感器悬臂 */
    const radar = new THREE.Group();
    radar.position.set(-7.0, 16.8, -2.2);
    cyl(radar, 0.48, 0.62, 2.3, 8, 0, 1.15, 0, M.pipe);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(2.7, 24, 10, 0, TAU, 0, Math.PI / 2.45),
      new THREE.MeshStandardMaterial({ color: 0xa8b4be, metalness: 0.38, roughness: 0.48, side: THREE.DoubleSide }));
    dish.rotation.x = -1.08;
    dish.position.set(0, 2.85, 0.3);
    dish.castShadow = true;
    radar.add(dish);
    cyl(radar, 0.13, 0.13, 2.2, 6, 0, 3.6, 1.4, M.pipe);
    const radarTipMat = warnMat(0xff3a2a, 2.2);
    beacons.push(radarTipMat);
    const radarTip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), radarTipMat);
    radarTip.position.set(0, 4.75, 1.4);
    radar.add(radarTip);
    g.add(radar);

    cyl(g, 0.12, 0.2, 8.6, 6, 7.4, 20.0, -2.0, M.pipe);
    for (const y of [18.4, 20.4, 22.2]) box(g, 3.2, 0.12, 0.12, 7.4, y, -2.0, M.hullDark);
    const mastTipMat = warnMat(0xff3a2a, 2.0);
    beacons.push(mastTipMat);
    const mastTip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mastTipMat);
    mastTip.position.set(7.4, 24.3, -2.0);
    g.add(mastTip);

    box(g, 7.2, 0.3, 0.3, -9.0, 13.9, 4.4, M.pipe);
    const boomDish = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 8, 0, TAU, 0, Math.PI / 2.5), M.hullDark);
    boomDish.rotation.x = -1.2;
    boomDish.position.set(-12.4, 14.3, 4.4);
    g.add(boomDish);

    /* 悬浮全息环，缓慢反向旋转 */
    const holo = new THREE.Group();
    holo.position.y = 21.1;
    const holoMat = new THREE.MeshBasicMaterial({ color: 0x63d6ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    for (const r of [4.5, 3.6]){
      const hr = new THREE.Mesh(new THREE.TorusGeometry(r, 0.055, 5, 64), holoMat);
      hr.rotation.x = Math.PI / 2;
      holo.add(hr);
    }
    g.add(holo);

    /* 正面门厅与台阶 */
    const door = doorway(g, 0, 0, 13.9, 0, 4.6, 4.2, 0x4fd6ff);
    accents.push(door.lampMat);
    for (let i = 0; i < 3; i++){
      box(g, 9 - i, 0.4, 1.2, 0, 0.2 + i * 0.4, 15.4 + i * 1.1, M.plate);
      strip(g, 8.6 - i, 0.06, 0.08, 0, 0.42 + i * 0.4, 16.0 + i * 1.1, warn);
    }

    register({
      key: 'command', name: '指挥中心', en: 'COMMAND CENTER',
      desc: '基地的神经中枢。整合雷达阵列、战术指挥与轨道通讯，统筹全部设施的电力与生产调度。',
      group: g, center: new THREE.Vector3(0, 6, 0), radius: 16,
      status: '运转中', crew: 12, power: '92%',
      accents, beacons,
      doors: [{ pos: new THREE.Vector3(0, 0, 16.2), yaw: 0 }],
      update(dt, t){
        radar.rotation.y = t * 0.55;
        holo.rotation.y = -t * 0.32;
        core.scale.setScalar(1 + Math.sin(t * 1.7) * 0.035);
        for (let i = 0; i < petals.length; i++){
          petals[i].rotation.x = -0.32 + Math.sin(t * 0.7 + i) * 0.055;
        }
      }
    });
  }

  /* ------------------------------------------------- 兵营（通用） --- */
  function barracks(x, z, rot, key, name, tone){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    const glow = glowMat(0x4fd0ff, 1.5);
    const warn = warnMat(0xff9a2a, 1.4);

    box(g, 16, 5.4, 11, 0, 2.7, 0, M.hull);
    box(g, 16.4, 0.5, 11.4, 0, 5.6, 0, M.hullLight);
    /* 坡屋顶 */
    const roof = box(g, 13, 2.6, 8, 0, 7, 0, M.hullDark);
    roof.rotation.z = 0;
    /* 侧翼低体量 */
    box(g, 5.5, 3.4, 7, -9, 1.7, 2, M.hullLight);
    box(g, 5.5, 3.4, 7, 9, 1.7, 2, M.hullLight);

    /* 窗与灯带 */
    for (let i = 0; i < 5; i++){
      strip(g, 1.5, 0.7, 0.14, -6 + i * 3, 3.6, 5.56, glow);
      strip(g, 1.5, 0.7, 0.14, -6 + i * 3, 3.6, -5.56, glow);
    }
    strip(g, 16.2, 0.16, 0.16, 0, 5.9, 5.6, glow);
    /* 通风口 */
    for (const s of [-1, 1]) box(g, 1.4, 1.4, 1.2, s * 5.5, 6.4, -2.5, M.grate);

    const door = doorway(g, 0, 0, 5.6, 0, 4, 3.6, 0x4fd6ff);

    /* 旗帜 */
    cyl(g, 0.12, 0.12, 8, 6, 7.5, 4, 6.6, M.pipe);
    const flag = box(g, 2.2, 1.2, 0.08, 8.6, 7.2, 6.6, new THREE.MeshStandardMaterial({ color: tone, metalness: 0.2, roughness: 0.8 }));
    flag.userData.flag = true;

    /* 门外沙袋与补给箱 */
    for (let i = 0; i < 4; i++)
      box(g, 1.8, 0.9, 1.4, -4 + i * 1.9, 0.45, 8.4, i % 2 ? M.rust : M.grate);

    register({
      key, name, en: 'BARRACKS',
      desc: '前沿驻军的生活与集结区。班组在此换装、补给后经栈桥进入各自的防御位。',
      group: g, center: new THREE.Vector3(x, 3, z), radius: 12,
      status: '驻守', crew: key === 'barracks_a' ? 18 : 14, power: '34%',
      accents: [glow, door.lampMat], beacons: [warn],
      doors: [{ pos: new THREE.Vector3(x, 0, z).add(new THREE.Vector3(0, 0, 5.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)), yaw: rot }],
      update(dt, t){ flag.rotation.y = Math.sin(t * 1.6) * 0.08; }
    });
  }
  barracks(31, 23, -0.66, 'barracks_a', '兵营', 0xb8562a);
  barracks(-33, 21, 0.86, 'barracks_b', '兵营·B连', 0x2a6bb8);

  /* ----------------------------------------------------- 工厂 --- */
  {
    const g = new THREE.Group();
    g.position.set(-30, 0, -29);
    g.rotation.y = 0.78;
    const glow = glowMat(0x4fd0ff, 1.6);
    const warn = warnMat(0xff8a2a, 1.6);

    box(g, 22, 8, 15, 0, 4, 0, M.hull);
    box(g, 22.6, 0.6, 15.6, 0, 8.3, 0, M.hullLight);
    /* 拱形车间屋顶 */
    const vault = new THREE.Mesh(
      new THREE.CylinderGeometry(7.6, 7.6, 21.6, 24, 1, false, 0, Math.PI), M.hullDark);
    vault.rotation.z = Math.PI / 2;
    vault.rotation.y = Math.PI / 2;
    vault.position.y = 8.3;
    vault.castShadow = true;
    g.add(vault);

    /* 大门 */
    box(g, 8, 6, 0.5, 0, 3, 7.6, M.hullDark);
    strip(g, 8, 0.18, 0.2, 0, 6.2, 7.9, warn);
    for (let i = 0; i < 6; i++) strip(g, 0.28, 6, 0.16, -3.6 + i * 1.44, 3, 7.85, M.grate);

    /* 双烟囱 */
    const chimneys = [];
    for (const s of [-1, 1]){
      cyl(g, 1.5, 1.9, 19, 12, s * 7.2, 9.5, -4.2, M.hullDark);
      ring(g, 1.9, 0.22, s * 7.2, 19, -4.2, warn);
      const cap = cyl(g, 1.8, 1.6, 1.6, 12, s * 7.2, 19.8, -4.2, M.grate);
      chimneys.push(s);
      addSmoke(new THREE.Vector3(
        -30 + Math.cos(0.78) * (s * 7.2) + Math.sin(0.78) * (-4.2),
        19.5,
        -29 - Math.sin(0.78) * (s * 7.2) + Math.cos(0.78) * (-4.2)), 50, 0.9);
    }

    /* 侧面输送管道与储罐 */
    for (const s of [-1, 1]){
      cyl(g, 2.2, 2.4, 6, 12, s * 13, 3, 1, M.pipe);
      const t = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 6, 16), M.hullDark);
      t.rotation.x = Math.PI / 2; t.position.set(s * 13, 6, 1); g.add(t);
    }
    strip(g, 0.5, 0.5, 15, -11.5, 5.6, 0, M.pipe);

    /* 顶部吊车 */
    box(g, 0.7, 0.7, 16, 3, 13, 0, M.pipe);
    box(g, 3, 1.2, 2.4, 3, 12.4, 7, warn);

    const door = doorway(g, 0, 0, 8.2, 0, 6, 5, 0xffa63a);
    /* 背面后勤出口：重载具从这一侧出厂，避免在靠基地的前门被厂房卡住 */
    const rear = doorway(g, 0, 0, -7.8, Math.PI, 7, 5, 0xffa63a);
    box(g, 9.2, 0.35, 3.4, 0, 0.18, -9.5, M.grate);
    strip(g, 9.2, 0.1, 0.18, 0, 0.38, -11.2, warn);
    const fac = register({
      key: 'factory', name: '工厂', en: 'FACTORY',
      desc: '重装备生产线。两条总装线可同时输出装甲单位，烟囱与冷却塔在夜间最为醒目。',
      group: g, center: new THREE.Vector3(-30, 5, -29), radius: 18,
      status: '生产中', crew: 24, power: '76%',
      accents: [glow, door.lampMat, rear.lampMat], beacons: [warn],
      doors: [
        { pos: new THREE.Vector3(-30, 0, -29).add(new THREE.Vector3(0, 0, 9).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.78)), yaw: 0.78 },
        { pos: new THREE.Vector3(-30, 0, -29).add(new THREE.Vector3(0, 0, -7.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.78)), yaw: 0.78 + Math.PI }
      ],
      update(dt, t){
        warn.emissiveIntensity = 1.2 + Math.sin(t * 3.4) * 0.5;
      }
    });
    /* 载具从后门外的出场坪出发，再驶向集结点/后方待命点 */
    const exitLocal = new THREE.Vector3(0, 0, -9.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.78);
    const stageLocal = new THREE.Vector3(0, 0, -22).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.78);
    fac.vehicleExit = {
      pos: new THREE.Vector3(-30, 0, -29).add(exitLocal),
      staging: new THREE.Vector3(-30, 0, -29).add(stageLocal),
      yaw: 0.78 + Math.PI
    };
    fac.exitDoorCtl = rear.ctl;
  }

  /* ----------------------------------------------------- 星港 --- */
  {
    const g = new THREE.Group();
    g.position.set(30, 0, -29);
    const glow = glowMat(0x4fd0ff, 1.6);
    const warn = warnMat(0xff8a2a, 1.5);

    /* 降落坪 */
    const padMat = new THREE.MeshStandardMaterial({
      map: tex.pad, color: 0xb9c6d0, metalness: 0.3, roughness: 0.7,
      polygonOffset: true, polygonOffsetFactor: -1
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(11.5, 64), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.12;
    pad.receiveShadow = true;
    g.add(pad);

    /* 坪边灯 */
    const padLights = [];
    for (let i = 0; i < 12; i++){
      const a = i / 12 * TAU;
      const lm = new THREE.MeshStandardMaterial({ color: 0x081014, emissive: 0x36c8ff, emissiveIntensity: 1.6 });
      const b = box(g, 0.5, 0.3, 0.9, Math.cos(a) * 11, 0.2, Math.sin(a) * 11, lm);
      b.rotation.y = -a;
      padLights.push(lm);
    }

    /* 塔台 */
    const tower = new THREE.Group();
    tower.position.set(-13, 0, -2);
    cyl(tower, 3.4, 4.4, 16, 8, 0, 8, 0, M.hull);
    cyl(tower, 5.4, 4.6, 4.4, 8, 0, 18, 0, M.hullLight);
    const glassBand = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 2.6, 8, 1, true), M.glass);
    glassBand.position.y = 18.2;
    tower.add(glassBand);
    cyl(tower, 4.2, 4.8, 1.2, 8, 0, 20.8, 0, M.hullDark);
    ring(tower, 5.3, 0.16, 0, 21.2, 0, glow);
    cyl(tower, 0.1, 0.12, 9, 5, 2.2, 25.6, 0, M.pipe);
    const tBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), warnMat(0xff3a2a, 2.4));
    tBeacon.position.set(2.2, 30, 0);
    tower.add(tBeacon);
    g.add(tower);

    /* 龙门架 */
    for (const s of [-1, 1]){
      box(g, 1.2, 14, 1.2, s * 10.5, 7, 6, M.hullDark);
    }
    box(g, 22, 1.4, 1.4, 0, 14, 6, M.hullDark);
    strip(g, 20, 0.2, 0.2, 0, 13.2, 6, warn);
    /* 吊挂的燃料管 */
    for (let i = 0; i < 4; i++){
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 9, 6), M.cable);
      c.position.set(-4 + i * 2.6, 9, 6);
      g.add(c);
    }
    /* 机库 */
    box(g, 9, 5.4, 7, 12, 2.7, -8, M.hullLight);
    strip(g, 8, 0.16, 0.16, 12, 5.5, -4.4, glow);

    const door = doorway(g, -3, 0, 12, 0, 3.6, 3.4, 0x4fd6ff);
    register({
      key: 'starport', name: '星港', en: 'STARPORT',
      desc: '轨道运输的接驳点。运输舰按固定航线进近，卸下补给与增援后即刻离场。',
      group: g, center: new THREE.Vector3(30, 4, -29), radius: 20,
      status: '待命', crew: 9, power: '48%',
      accents: [glow, door.lampMat], beacons: [warn, tBeacon.material],
      padLights, padWorld: new THREE.Vector3(30, 0.4, -29),
      doors: [{ pos: new THREE.Vector3(30, 0, -29).add(new THREE.Vector3(-3, 0, 12)), yaw: 0 }],
      update(dt, t){ tBeacon.material.emissiveIntensity = 1.2 + (Math.sin(t * 4) > 0 ? 1.6 : 0); }
    });
  }

  /* --------------------------------------------------- 补给站 --- */
  {
    const g = new THREE.Group();
    g.position.set(12, 0, 40);
    g.rotation.y = -0.4;
    const glow = glowMat(0x4fd0ff, 1.4);
    const warn = warnMat(0xffa63a, 1.6);

    box(g, 10, 4, 8, 0, 2, 0, M.hullLight);
    box(g, 10.2, 0.4, 8.2, 0, 4.2, 0, M.hullDark);
    /* 集装箱堆 */
    const cols = [0x8a5a2c, 0x39566b, 0x6b6f3a, 0x7a3f3a];
    for (let i = 0; i < 7; i++){
      const w = 3.2, h = 2.2, d = 2.4;
      const x = rand(-6, 6), z = rand(5, 12), lvl = rnd() > 0.55 ? 2 : 1;
      for (let k = 0; k < lvl; k++){
        const m = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], metalness: 0.35, roughness: 0.75 });
        const b = box(g, w, h, d, x, h / 2 + k * h, z, m);
        b.rotation.y = rand(-0.2, 0.2);
      }
    }
    /* 龙门吊标志 */
    strip(g, 10, 0.16, 0.16, 0, 4.6, 4.1, glow);
    cyl(g, 0.1, 0.1, 3, 5, 4.6, 5.8, 3.6, M.pipe);

    /* 自动叉车：在门前货场往返搬运，车头朝行进方向 */
    const forklift = new THREE.Group();
    forklift.name = 'supply-forklift';
    forklift.position.set(-4, 0, 14.5);
    box(forklift, 2.4, 1.1, 3.2, 0, 0.9, 0, M.rust);
    box(forklift, 1.8, 1.1, 1.4, 0, 1.65, -0.7, M.hullDark);
    box(forklift, 0.18, 2.3, 0.18, 1.0, 1.55, 1.4, M.pipe);
    box(forklift, 0.18, 2.3, 0.18, -1.0, 1.55, 1.4, M.pipe);
    box(forklift, 2.2, 0.14, 0.9, 0, 0.3, 2.05, M.pipe);
    for (const s of [-1, 1]){
      const w = cyl(forklift, 0.52, 0.52, 0.7, 10, s * 1.2, 0.55, 0.9, M.rubber);
      w.rotation.z = Math.PI / 2;
      const w2 = cyl(forklift, 0.52, 0.52, 0.7, 10, s * 1.2, 0.55, -0.9, M.rubber);
      w2.rotation.z = Math.PI / 2;
    }
    const forkLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), warn);
    forkLamp.position.set(0, 2.35, -0.7);
    forklift.add(forkLamp);
    g.add(forklift);

    /* 传送带：货箱从站内运到货场 */
    const conveyor = new THREE.Group();
    conveyor.position.set(6.2, 1.0, 2.6);
    box(conveyor, 1.5, 0.16, 7.6, 0, 0.9, 3.4, M.grate);
    for (let i = 0; i < 6; i++){
      const roller = cyl(conveyor, 0.16, 0.16, 1.5, 8, 0, 0.95, 0.4 + i * 1.3, M.pipe);
      roller.rotation.z = Math.PI / 2;
    }
    for (const s of [-1, 1]){
      box(conveyor, 0.12, 0.5, 7.6, s * 0.72, 0.7, 3.4, M.hullDark);
      for (let i = 0; i < 3; i++) box(conveyor, 0.12, 1.0, 0.12, s * 0.72, 0.2, 0.4 + i * 3.1, M.pipe);
    }
    strip(conveyor, 0.1, 0.1, 7.2, 0, 1.0, 3.4, glow);
    const packages = [];
    for (let i = 0; i < 4; i++){
      const pkg = new THREE.Group();
      box(pkg, 0.9, 0.9, 0.9, 0, 1.42, 0, i % 2 ? M.rust : M.grate);
      strip(pkg, 0.9, 0.08, 0.08, 0, 1.9, 0, warn);
      conveyor.add(pkg);
      pkg.position.z = i * 1.9;
      packages.push(pkg);
    }
    g.add(conveyor);

    let forkT = 0, convT = 0;
    const door = doorway(g, -3.5, 0, 4.1, 0, 3.2, 3, 0x4fd6ff);
    register({
      key: 'supply', name: '补给站', en: 'SUPPLY DEPOT',
      desc: '弹药、燃料与零件的集散地。货柜按编号分区堆放，由自动叉车昼夜转运。',
      group: g, center: new THREE.Vector3(12, 2, 40), radius: 11,
      status: '补给中', crew: 6, power: '21%',
      accents: [glow, door.lampMat], beacons: [warn],
      doors: [{ pos: new THREE.Vector3(12, 0, 40).add(new THREE.Vector3(-3.5, 0, 4.4).applyAxisAngle(new THREE.Vector3(0,1,0), -0.4)), yaw: -0.4 }],
      update(dt, t){
        forkT += dt;
        const k = forkT * 0.55;
        forklift.position.x = -4 + Math.sin(k) * 3.4;
        forklift.position.z = 14.5 + Math.cos(k * 0.8) * 1.1;
        forklift.rotation.y = Math.PI / 2 + Math.sin(k * 0.8) * 0.35;
        convT += dt * 1.15;
        for (let i = 0; i < packages.length; i++){
          packages[i].position.z = (convT + i * 1.9) % 7.2;
        }
      }
    });
  }

  /* ------------------------------------- 前进矿点（外环两座） --- */
  function buildOutpost(x, z, key, name){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const glow = glowMat(0x4fd0ff, 1.15);
    const warn = warnMat(0xff3a2a, 1.8);

    cyl(g, 7.2, 8.2, 0.7, 10, 0, 0.35, 0, M.plate);
    cyl(g, 2.7, 3.2, 5.4, 8, 0, 3.2, 0, M.hull);
    cyl(g, 4.6, 5.2, 0.5, 8, 0, 6.1, 0, M.hullLight);

    const pod = new THREE.Group();
    pod.name = 'turret-pod';
    pod.position.y = 6.9;
    cyl(pod, 2.1, 2.3, 1.3, 8, 0, 0.65, 0, M.hullDark);
    for (const s of [-1, 1]){
      box(pod, 1.15, 0.55, 2.4, s * 1.1, 1.05, 0.7, M.hullLight);
      cyl(pod, 0.16, 0.16, 1.9, 6, s * 1.1, 1.55, 1.9, M.pipe);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), warn);
    lamp.position.set(0, 1.7, -0.7);
    pod.add(lamp);
    g.add(pod);

    /* 小前哨的地面识别条与补给箱 */
    strip(g, 7.0, 0.08, 0.3, 0, 0.12, 6.4, glow);
    box(g, 1.8, 1.2, 1.8, -5.2, 0.6, 3.2, M.grate);
    box(g, 1.4, 1.0, 1.4, 5.2, 0.5, 2.4, M.rust);

    const b = register({
      key, name, en: 'RELAY OUTPOST',
      desc: '外环前进矿点。小型自动炮塔负责警戒，矿脉由最近的 SCV 就地往返。',
      group: g, center: new THREE.Vector3(x, 4, z), radius: 9,
      status: '自动警戒', crew: 0, power: '9%',
      accents: [glow], beacons: [warn],
      update(dt, t){ pod.rotation.y = Math.sin(t * 0.4 + x * 0.02) * 0.8; }
    });
    b.turret = pod;
    b.isOutpost = true;
    b.turretLevel = 0;
    return b;
  }
  buildOutpost(104, 74, 'outpost_a', '东北前进矿点');
  buildOutpost(-108, -52, 'outpost_b', '西南前进矿点');


  {
    const g = new THREE.Group();
    g.position.set(44, 0, 5);
    const glow = glowMat(0x4fd0ff, 1.3);
    const warn = warnMat(0xff3a2a, 2);

    cyl(g, 4.2, 5.2, 2.6, 8, 0, 1.3, 0, M.plate);
    cyl(g, 3.2, 3.6, 5, 8, 0, 5, 0, M.hull);

    const turret = new THREE.Group();
    turret.position.y = 7.6;
    const base = cyl(turret, 2.6, 2.8, 2.2, 8, 0, 1.1, 0, M.hullLight);
    const pods = [];
    for (const s of [-1, 1]){
      const pod = new THREE.Group();
      pod.position.set(s * 1.9, 0.6, 0.4);
      box(pod, 1.6, 3.2, 2.2, 0, 1.2, 0, M.hullDark);
      for (let i = 0; i < 2; i++){
        for (let k = 0; k < 2; k++){
          const tube = cyl(pod, 0.34, 0.34, 2.4, 8, -0.4 + k * 0.8, 2.2, 0.6 + i * 0.7, M.pipe);
        }
      }
      strip(pod, 1.5, 0.12, 0.12, 0, 2.6, -0.7, glow);
      turret.add(pod);
      pods.push(pod);
    }
    turret.add(base);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), warn);
    beacon.position.set(0, 3.2, -1.4);
    turret.add(beacon);
    /* 弹药等级指示灯：升级后逐颗亮起 */
    const levelLights = [];
    for (let i = 0; i < 3; i++){
      const mat = new THREE.MeshBasicMaterial({ color: 0x22343f });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat);
      dot.position.set(-0.7 + i * 0.7, 2.55, -1.0);
      turret.add(dot);
      levelLights.push(mat);
    }
    g.add(turret);

    /* 弹箱与沙袋 */
    box(g, 2.2, 1.2, 1.6, 4.6, 0.6, 3, M.grate);
    box(g, 2.2, 1.2, 1.6, 4.6, 0.6, 5.2, M.rust);

    const tb = register({
      key: 'turret', name: '导弹塔', en: 'MISSILE TURRET',
      desc: '防空节点。双联装发射巢覆盖整个进场走廊，与雷达数据链共享目标。',
      group: g, center: new THREE.Vector3(44, 5, 5), radius: 8,
      status: '警戒', crew: 4, power: '17%',
      accents: [glow], beacons: [warn],
      doors: [{ pos: new THREE.Vector3(44, 0, 9.5), yaw: 0 }],
      update(dt, t){ turret.rotation.y = Math.sin(t * 0.33) * 1.1; }
    });
    tb.levelLights = levelLights;
  }

  /* ----------------------------------------------------- 地堡 --- */
  {
    const g = new THREE.Group();
    g.position.set(-45, 0, -5);
    const glow = glowMat(0x4fd0ff, 1.2);
    const warn = warnMat(0xff8a2a, 1.7);

    cyl(g, 6.5, 7.4, 3.2, 10, 0, 1.6, 0, M.plate);
    cyl(g, 5.8, 6.2, 3, 10, 0, 4.6, 0, M.hull);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(5.8, 24, 10, 0, TAU, 0, Math.PI / 2.6), M.hullDark);
    cap.position.y = 6;
    cap.castShadow = true;
    g.add(cap);

    /* 射击孔 */
    for (let i = 0; i < 6; i++){
      const a = i / 6 * TAU + 0.3;
      strip(g, 2.2, 0.5, 0.4, Math.cos(a) * 5.85, 4.4, Math.sin(a) * 5.85, M.grate).rotation.y = -a;
    }
    ring(g, 5.9, 0.14, 0, 5.9, 0, glow);

    /* 入口与沙袋环：入口方向留缺口 */
    box(g, 3.4, 2.8, 3, 0, 1.4, 7.2, M.hullDark);
    const door = doorway(g, 0, 0, 8.4, 0, 2.6, 2.4, 0x4fd6ff);
    for (let i = 0; i < 18; i++){
      const a = i / 18 * TAU;
      const gap = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
      if (Math.abs(gap) < 0.34) continue;
      const x = Math.cos(a) * 9.4, z = Math.sin(a) * 9.4;
      box(g, 1.9, 0.8, 1.15, x, 0.42, z, M.sand).rotation.y = -a;
      if (i % 2 === 0){
        box(g, 1.7, 0.7, 1.05, x * 0.99, 1.12, z * 0.99, M.sand).rotation.y = -a + 0.08;
      }
    }

    /* 顶部可开合装甲舱盖：缓慢开合，露出内部灯 */
    const hatchPivot = new THREE.Group();
    hatchPivot.position.set(0, 11.55, -3.4);
    const lid = cyl(hatchPivot, 2.15, 2.35, 0.32, 12, 0, 0, 1.9, M.hullLight);
    ring(hatchPivot, 2.28, 0.07, 0, 0.18, 1.9, M.pipe);
    const hatchLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), warn);
    hatchLamp.position.set(0, 0.32, 1.9);
    hatchPivot.add(hatchLamp);
    g.add(hatchPivot);

    register({
      key: 'bunker', name: '地堡', en: 'BUNKER',
      desc: '加固防御工事。低矮的穹顶与射击孔为守军提供交叉火力，入口处堆有沙袋。',
      group: g, center: new THREE.Vector3(-45, 3, -5), radius: 10,
      status: '驻守', crew: 8, power: '9%',
      accents: [glow, door.lampMat], beacons: [warn],
      doors: [{ pos: new THREE.Vector3(-45, 0, 4), yaw: 0 }],
      update(dt, t){
        const open = 0.5 - 0.5 * Math.cos(t * 0.45);
        hatchPivot.rotation.x = -1.05 * open;
      }
    });
  }

  /* ------------------------------------------------- 维修平台 --- */
  {
    const g = new THREE.Group();
    g.position.set(46, 0, -14);
    g.rotation.y = -0.5;
    const glow = glowMat(0x4fd0ff, 1.4);
    const warn = warnMat(0xffa63a, 2.2);

    /* 平台与架体 */
    cyl(g, 8, 8.6, 0.9, 16, 0, 0.45, 0, M.plate);
    ring(g, 9.2, 0.18, 0, 0.9, 0, warn);
    for (const s of [-1, 1]){
      box(g, 0.9, 9, 0.9, s * 7.2, 4.5, 0, M.hullDark);
      box(g, 0.9, 9, 0.9, s * 7.2, 4.5, -6, M.hullDark);
    }
    box(g, 15, 1.1, 1.1, 0, 9, 0, M.hullDark);
    box(g, 15, 1.1, 1.1, 0, 9, -6, M.hullDark);
    box(g, 1.1, 1.1, 6, -7.2, 9, -3, M.hullDark);
    box(g, 1.1, 1.1, 6, 7.2, 9, -3, M.hullDark);
    strip(g, 14, 0.16, 0.16, 0, 9.6, 0, glow);

    /* 待修车辆 */
    const tank = new THREE.Group();
    tank.position.set(0, 1, -1);
    box(tank, 4.2, 1.6, 6.4, 0, 1.3, 0, M.hull);
    box(tank, 3, 1.1, 3, 0, 2.4, -0.6, M.hullLight);
    cyl(tank, 0.3, 0.3, 4, 8, 0, 2.4, 2.4, M.pipe).rotation.x = Math.PI / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){
      const w = cyl(tank, 1.1, 1.1, 0.7, 12, sx * 2.2, 1, sz * 2.2, M.rubber);
      w.rotation.z = Math.PI / 2;
    }
    g.add(tank);

    /* 可移动的龙门吊小车与吊钩：在横梁上往返，吊钩轻摆 */
    const crane = new THREE.Group();
    crane.position.set(0, 9.35, 0);
    box(crane, 1.7, 0.9, 1.6, 0, 0.15, 0, M.rust);
    strip(crane, 1.5, 0.08, 0.08, 0, 0.65, 0, warn);
    box(crane, 2.0, 0.25, 0.55, 0, 0.72, 0, M.pipe);
    cyl(crane, 0.08, 0.08, 4.6, 6, 0, -2.35, 0, warn);
    box(crane, 1.5, 0.35, 0.4, 0, -4.66, 0, M.rust);
    const hookLamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), warn);
    hookLamp.position.set(0, -4.88, 0);
    crane.add(hookLamp);
    g.add(crane);

    /* 焊接火花 */
    const spark = new THREE.PointLight(0xffb257, 0, 22, 2);
    spark.position.set(2.4, 3, 1.5);
    g.add(spark);
    const sparkMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    sparkMesh.position.copy(spark.position);
    g.add(sparkMesh);

    /* 工具架与气瓶 */
    box(g, 4, 2.6, 1.2, -5.5, 1.3, 5, M.grate);
    for (let i = 0; i < 3; i++) cyl(g, 0.45, 0.45, 2, 8, 5.4 + i * 1.1, 1, 5.4, M.pipe);

    const door = doorway(g, -6.5, 0, 6, 0, 3, 2.8, 0xffa63a);
    register({
      key: 'repair', name: '维修平台', en: 'REPAIR BAY',
      desc: '装甲车辆的检修位。龙门吊与焊接臂可整备受损单位，火花在夜间格外显眼。',
      group: g, center: new THREE.Vector3(46, 3, -14), radius: 11,
      status: '检修中', crew: 7, power: '26%',
      accents: [glow, door.lampMat], beacons: [warn],
      doors: [{ pos: new THREE.Vector3(46, 0, -14).add(new THREE.Vector3(-6.5, 0, 7).applyAxisAngle(new THREE.Vector3(0,1,0), -0.5)), yaw: -0.5 }],
      update(dt, t){
        crane.position.x = Math.sin(t * 0.42) * 4.8;
        crane.rotation.z = Math.sin(t * 1.15) * 0.055;
        const k = (Math.sin(t * 7.3) + Math.sin(t * 3.1)) * 0.5;
        spark.intensity = k > 0.55 ? 26 : 0;
        sparkMesh.visible = k > 0.55;
      }
    });
  }

  return list;
}
