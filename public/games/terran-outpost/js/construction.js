/* 玩家建造：指挥中心面板选建筑 → 地面幽灵预览 → 扣矿/施工 → 完成注册。
   模型直接克隆现有九栋的 Group，保证新建筑和原建筑同风格；不重建建模代码。 */
import * as THREE from 'three';
import { CATALOG } from './production.js';
import { buildSCV } from './vehicles.js';

const SRC_KEY = {
  barracks: 'barracks_a',
  factory: 'factory',
  starport: 'starport',
  supply: 'supply',
  turret: 'turret',
  bunker: 'bunker',
  repair: 'repair'
};

export const BUILD_TYPES = {
  barracks: { name: '兵营', cost: 150, time: 20, radius: 12, max: 4 },
  factory:  { name: '工厂', cost: 200, time: 28, radius: 18, max: 2 },
  starport: { name: '星港', cost: 250, time: 32, radius: 20, max: 2 },
  supply:   { name: '补给站', cost: 100, time: 15, radius: 11, max: 5 },
  turret:   { name: '导弹塔', cost: 100, time: 16, radius: 8, max: 6 },
  bunker:   { name: '地堡', cost: 100, time: 18, radius: 10, max: 4 },
  repair:   { name: '维修平台', cost: 150, time: 20, radius: 11, max: 2 }
};

function typeOfKey(key){
  if (!key) return '';
  if (key.indexOf('barracks') === 0) return 'barracks';
  return key;
}

export function createConstruction({ buildings, world, wallet, resources, production, actors, fx, audio, toast, camera, dom, hive, priceOf, timeOf }){
  let menu = null, layer = null, mode = null, active = null, seq = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  const ringGeo = new THREE.RingGeometry(0.92, 1, 56);

  function countType(type){
    let n = 0;
    for (const b of buildings) if (typeOfKey(b.key) === type) n++;
    return n;
  }

  function sourceFor(type){
    const key = SRC_KEY[type];
    return buildings.find(b => b.key === key) || null;
  }

  function makeGhost(type){
    const src = sourceFor(type);
    if (!src) return null;
    const g = src.group.clone(true);
    const mats = [];
    g.traverse(o => {
      if (o.isLight){ o.visible = false; return; }
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = false;
      const one = m => {
        const c = m.clone();
        c.transparent = true; c.opacity = 0.38; c.depthWrite = false;
        if (c.color) c.color.setHex(0x63d6ff);
        mats.push(c);
        return c;
      };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    });
    g.position.set(0, -1000, 0);
    world.add(g);
    const mat = new THREE.MeshBasicMaterial({ color: 0x63d6ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.18;
    ring.scale.setScalar(BUILD_TYPES[type].radius);
    world.add(ring);
    return { g, ring, mat, mats };
  }

  function makeReal(type, x, z, rot){
    const src = sourceFor(type);
    if (!src) return null;
    const g = src.group.clone(true);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    world.add(g);
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const doors = (src.doors || []).map(d => {
      const dp = d.pos;
      const dx = dp.x - src.center.x, dz = dp.z - src.center.z;
      return {
        ...d,
        pos: new THREE.Vector3(x + dx * cos + dz * sin, 0, z - dx * sin + dz * cos),
        yaw: (d.yaw || 0) + rot
      };
    });
    const b = {
      key: type + '_p' + (++seq),
      type,
      name: BUILD_TYPES[type].name,
      group: g,
      center: new THREE.Vector3(x, 0, z),
      radius: src.radius || BUILD_TYPES[type].radius,
      doors,
      status: src.status || '运行中',
      crew: 0,
      power: src.power || '0%',
      desc: src.desc || '',
      accents: [], beacons: [],
      doorCtl: null,
      items: (CATALOG[src.key] || []).map(it => ({ ...it })),
      isPlayer: true
    };
    /* 克隆体会继承源建筑的 buildingKey；必须改写成新 key，否则点击新建筑会选中旧建筑 */
    g.userData = Object.assign({}, g.userData, { buildingKey: b.key, building: b });
    const pod = g.getObjectByName('turret-pod') ||
      (type === 'turret' ? g.children.find(o => o.isGroup && o.position.y > 5) : null);
    if (pod) b.turret = pod;
    if (doors[0]){
      b.workPoint = new THREE.Vector3(
        doors[0].pos.x + Math.sin(doors[0].yaw) * 2.8, 0,
        doors[0].pos.z + Math.cos(doors[0].yaw) * 2.8
      );
      b.doorFacing = new THREE.Vector3(Math.sin(doors[0].yaw), 0, Math.cos(doors[0].yaw));
    }
    buildings.push(b);
    return b;
  }

  function validAt(type, x, z){
    const t = BUILD_TYPES[type];
    if (Math.hypot(x, z) > 146 - t.radius) return false;
    for (const b of buildings){
      if (!b.center) continue;
      const rr = (b.radius || 10) + t.radius + 2;
      if (b.center.distanceToSquared(new THREE.Vector3(x, 0, z)) < rr * rr) return false;
    }
    for (const f of resources.fields || []){
      const fx = f.x ?? (f.pos ? f.pos.x : f.center ? f.center.x : 0);
      const fz = f.z ?? (f.pos ? f.pos.z : f.center ? f.center.z : 0);
      if (Math.hypot(fx - x, fz - z) < t.radius + 5) return false;
    }
    if (hive && !hive.dead){
      const h = hive.g.position;
      if (Math.hypot(h.x - x, h.z - z) < (hive.radius || 16) + t.radius + 3) return false;
    }
    return true;
  }

  function closeMenu(){ if (menu) menu.style.display = 'none'; }

  function openMenu(){
    if (active){ toast('已有建筑在施工中'); return; }
    if (!menu){
      menu = document.createElement('div');
      menu.id = 'build-menu';
      menu.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;display:none;' +
        'background:rgba(9,22,30,.96);border:1px solid #2d6a80;border-radius:4px;padding:12px 14px;min-width:420px;box-shadow:0 8px 30px #000a';
      document.body.appendChild(menu);
    }
    const rows = Object.entries(BUILD_TYPES).map(([type, t]) => {
      const full = countType(type) >= t.max;
      const cost = priceOf ? priceOf(type, t.cost) : t.cost;
      const time = timeOf ? timeOf(type, t.time) : t.time;
      const poor = wallet.minerals < cost;
      return `<button data-t="${type}" ${full || poor ? 'disabled' : ''} style="display:flex;justify-content:space-between;gap:18px;width:100%;margin:3px 0;padding:7px 10px;background:#122b36;border:1px solid #2a6070;color:${full ? '#5d6b70' : '#bfe8f4'};font:12px Consolas,monospace;cursor:${full || poor ? 'default' : 'pointer'}">` +
        `<span>${t.name}</span><span>${cost} 矿 · ${time}s · ${countType(type)}/${t.max}</span></button>`;
    }).join('');
    menu.innerHTML = `<div style="color:#63d6ff;font:600 13px Consolas,monospace;letter-spacing:.12em;margin-bottom:8px">建造 / CONSTRUCTION</div>${rows}` +
      `<div style="color:#6a8994;font:11px Consolas,monospace;margin-top:8px">右键 / Esc 取消 · R 旋转 90°</div>`;
    menu.style.display = 'block';
    menu.querySelectorAll('button[data-t]').forEach(btn => {
      btn.onclick = () => start(btn.dataset.t);
    });
  }

  function ensureLayer(){
    if (layer) return;
    layer = document.createElement('div');
    layer.id = 'build-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:17;display:none;cursor:crosshair;background:transparent';
    document.body.appendChild(layer);
    layer.addEventListener('pointermove', onMove);
    layer.addEventListener('pointerdown', e => {
      if (window.__PAGE__ && (window.__PAGE__.mode !== 'game' || window.__PAUSED__)) return;
      if (e.button === 2) return;
      e.preventDefault(); e.stopPropagation();
      place();
    });
    layer.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      /* 右键不取消，避免放置时误触；Esc 取消 */
    });
  }

  function onMove(e){
    if (!mode) return;
    ndc.x = (e.clientX / innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, point)) return;
    const snap = 2;
    mode.x = Math.round(point.x / snap) * snap;
    mode.z = Math.round(point.z / snap) * snap;
    mode.ghost.g.position.set(mode.x, 0, mode.z);
    mode.ghost.g.rotation.y = mode.rot;
    mode.ghost.ring.position.set(mode.x, 0.18, mode.z);
    const ok = validAt(mode.type, mode.x, mode.z);
    mode.ghost.mat.color.setHex(ok ? 0x63d6ff : 0xff4a3a);
    for (const m of mode.ghost.mats) if (m.color) m.color.setHex(ok ? 0x63d6ff : 0xff4a3a);
  }

  function start(type){
    if (window.__PAGE__ && (window.__PAGE__.mode !== 'game' || window.__PAUSED__)) return;
    if (!BUILD_TYPES[type]) return;
    if (active){ toast('已有建筑在施工中'); return; }
    if (countType(type) >= BUILD_TYPES[type].max){ toast('该建筑已达上限'); return; }
    const cost0 = priceOf ? priceOf(type, BUILD_TYPES[type].cost) : BUILD_TYPES[type].cost;
    if (wallet.minerals < cost0){ toast('矿物不足'); return; }
    closeMenu();
    const gh = makeGhost(type);
    if (!gh) { toast('缺少建造模板'); return; }
    ensureLayer();
    mode = { type, x: 0, z: 0, rot: 0, ghost: gh };
    layer.style.display = 'block';
    toast('选择建造位置 · 左键确认 · R 旋转 · Esc 取消');
  }

  function makeBuilder(site){
    const g = buildSCV();
    g.scale.setScalar(1.12);
    const t = BUILD_TYPES[site.type];
    const a = site.rot + Math.PI * 0.36;
    const r = Math.min(t.radius * 0.62, 9.5);
    const x = site.x + Math.cos(a) * r, z = site.z + Math.sin(a) * r;
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(site.x - x, site.z - z);
    world.add(g);
    return { g, t: 0, phase: Math.random() * 10, lastSpark: 0 };  }

  function removeBuilder(site){
    if (!site || !site.builder) return;
    const g = site.builder.g;
    if (g.parent) g.parent.remove(g);
    g.traverse(o => {
      if (!o.isMesh) return;
      if (o.geometry) o.geometry.dispose();
      const mm = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mm) if (m && m.dispose) m.dispose();
    });
    site.builder = null;
  }

  function animateBuilder(site, dt){
    const b = site.builder;
    if (!b) return;
    b.t += dt;
    const sw = b.t * 5.2 + b.phase;
    const ud = b.g.userData;
    if (ud.armL){
      ud.armL.rotation.x = -1.0 + Math.sin(sw) * 0.5;
      ud.armR.rotation.x = -1.0 + Math.sin(sw + 1.5) * 0.5;
      ud.armL.rotation.z = Math.sin(sw * 0.55) * 0.12;
      ud.armR.rotation.z = -Math.sin(sw * 0.55) * 0.12;
      ud.legL.rotation.x = Math.sin(sw * 0.4) * 0.05;
      ud.legR.rotation.x = -Math.sin(sw * 0.4) * 0.05;
    }
    b.g.position.y = Math.abs(Math.sin(sw * 0.5)) * 0.04;
    const grow = Math.min(1, b.t * 2.2);
    b.g.scale.setScalar(1.12 * (0.45 + 0.55 * grow));
    if (site.t - b.lastSpark > 0.48 && fx){
      b.lastSpark = site.t;
      const f = new THREE.Vector3(Math.sin(b.g.rotation.y), 0, Math.cos(b.g.rotation.y));
      const p = b.g.position.clone().addScaledVector(f, 1.7).setY(2.1);
      fx.sparkAt(p, 5, 0xffb35a);
    }
  }

  function place(){
    if (!mode) return;
    const t = BUILD_TYPES[mode.type];
    if (!validAt(mode.type, mode.x, mode.z)){
      toast('这里不能建造：与建筑/矿脉重叠或超出平台');
      if (audio) audio.error();
      return;
    }
    const cost = priceOf ? priceOf(mode.type, t.cost) : t.cost;
    const total = timeOf ? timeOf(mode.type, t.time) : t.time;
    if (wallet.minerals < cost){ toast('矿物不足'); return; }
    wallet.minerals -= cost;
    layer.style.display = 'none';
    active = { type: mode.type, x: mode.x, z: mode.z, rot: mode.rot, t: 0, total, cost, ghost: mode.ghost, builder: null };
    active.builder = makeBuilder(active);
    mode = null;
    if (audio) audio.startBuild();
    toast(`开始建造 ${t.name} · ${total} 秒`);
  }

  function cancel(){
    if (mode){
      world.remove(mode.ghost.g); world.remove(mode.ghost.ring);
      mode = null;
      if (layer) layer.style.display = 'none';
      toast('已取消建造');
      return;
    }
    if (active){
      resources.wallet.minerals += Math.round(active.cost * 0.75);
      removeBuilder(active);
      world.remove(active.ghost.g); world.remove(active.ghost.ring);
      active = null;
      if (layer) layer.style.display = 'none';
      toast('已取消施工 · 返还 75% 矿物');
    }
  }

  function update(dt){
    if (!active) return;
    active.t += dt;
    active.ghost.ring.material.opacity = 0.35 + Math.sin(active.t * 4) * 0.25;
    animateBuilder(active, dt);
    if (active.t >= active.total){
      removeBuilder(active);
      const b = makeReal(active.type, active.x, active.z, active.rot);
      world.remove(active.ghost.g); world.remove(active.ghost.ring);
      const name = active.type;
      active = null;
      if (b){
        if (audio) audio.complete(b.center);
        toast(`${BUILD_TYPES[name].name} 建造完成`);
        if (production) production.stateOf(b);
      }
    }
  }

  function dump(){
    return buildings.filter(b => b.isPlayer && !b.destroyed).map(b => ({ type: b.type, x: b.center.x, z: b.center.z, rot: b.group.rotation.y }));
  }

  function restore(list){
    for (const it of list || []){
      if (!it || !BUILD_TYPES[it.type]) continue;
      makeReal(it.type, it.x, it.z, it.rot || 0);
    }
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ if (mode || active) cancel(); }
    if ((e.key === 'r' || e.key === 'R') && mode){ mode.rot = (mode.rot + Math.PI / 2) % (Math.PI * 2); }
  });

  /* 建造 UI 打开时，Esc / 右键只关闭建造，不弹设置或浏览器菜单。
     用捕获阶段，避免 settings 等先注册的 window 监听器抢到 Esc。 */
  function buildUiOpen(){
    return !!mode || !!active || !!(menu && menu.style.display !== 'none');
  }
  document.addEventListener('keydown', e => {
    if (!buildUiOpen()) return;
    if (e.key === 'Escape'){
      e.preventDefault(); e.stopImmediatePropagation();
      if (mode || active) cancel(); else closeMenu();
    } else if ((e.key === 'r' || e.key === 'R') && mode){
      e.preventDefault(); e.stopImmediatePropagation();
      mode.rot = (mode.rot + Math.PI / 2) % (Math.PI * 2);
    }
  }, true);
  document.addEventListener('contextmenu', e => {
    if (!buildUiOpen()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    /* 建造中右键不再取消，避免误触；取消只走 Esc，菜单状态才用右键收起 */
    if (!mode && !active) closeMenu();
  }, true);

  return { openMenu, start, cancel, update, dump, restore, BUILD_TYPES, get active(){ return active; }, get mode(){ return mode; } };
}
