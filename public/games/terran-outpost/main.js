/* 主程序：渲染管线、天空与光照、相机、交互与主循环 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { TAU, clamp, lerp, createMaterials, createTextures, textDecal, bakeStatic } from './js/core.js';
import { buildBase } from './js/base.js';
import { buildBuildings } from './js/buildings.js';
import { createActors } from './js/actors.js';
import { createSentries } from './js/sentries.js';
import { createMissions } from './js/missions.js';
import { createVictory } from './js/victory.js';
import { getLevel } from './js/levels.js';
import { createCampaign, mountLevelPicker } from './js/campaign.js';
import { createConstruction } from './js/construction.js';
import { createDoctrine } from './js/doctrine.js';
import { createTech, techKeyOf, TECH_DEFS } from './js/tech.js';
import { createEvents } from './js/events.js';
import { createFx } from './js/fx.js';
import { createProduction } from './js/production.js';
import { createResources } from './js/resources.js';
import { createSupply } from './js/supply.js';
import { createEnemies, buildZergling, buildRoach } from './js/enemies.js';
import { createHive } from './js/hive.js';
import { createCombat } from './js/combat.js';
import { createAirforce } from './js/aircraft.js';
import { createAudio } from './js/audio.js';
import { createCommands } from './js/commands.js';
import { createSave } from './js/save.js';
import { initHud } from './js/hud.js';
import { createSettings } from './js/settings.js';

/* ------------------------------------------------------------ 基础 --- */
const canvas = document.getElementById('scene');
/* ?lite=1：低配/安全模式（关阴影、关泛光、像素比 1），用于驱动不稳的机器排错 */
const QS = new URLSearchParams(location.search);
const TEST = QS.get('test') === '1';
const FREE = QS.has('free') && !TEST;
/* ?lite=1：低配/安全模式（关阴影、关泛光、像素比 1），用于驱动不稳的机器排错 */
const LITE = QS.has('lite');
const LEVEL = getLevel(QS.get('level'));
/* 页面唯一状态：home 选关 / gate 入场 / doctrine 教条 / game 可操作 / ended 结算 */
const PAGE = {
  mode: 'home',
  ready: false,
  level: LEVEL ? LEVEL.id : ((TEST || FREE) ? 'free' : null),
  test: TEST
};
window.__PAGE__ = PAGE;
function inputBlocked(){
  return PAGE.mode !== 'game' || !!window.__PAUSED__;
}
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(LITE ? 1 : Math.min(devicePixelRatio, 1.4));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !LITE;
renderer.shadowMap.type = THREE.PCFShadowMap;
/* 静态场景阴影不必每帧重画：半速更新，动态单位仍有影子 */
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;

/* 显卡驱动抽风时不要让页面白屏：拦下上下文丢失并给出提示 */
let ctxLostAt = 0;
canvas.addEventListener('webglcontextlost', ev => {
  ev.preventDefault();
  ctxLostAt = performance.now();
  const tip = document.getElementById('ctxlost');
  if (tip) tip.classList.add('on');
}, false);
canvas.addEventListener('webglcontextrestored', () => {
  const tip = document.getElementById('ctxlost');
  if (tip) tip.classList.remove('on');
  if (performance.now() - ctxLostAt > 1500) location.reload();
}, false);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x18242c, 0.0035);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 2000);
camera.position.set(106, 58, 124);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 12, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 30;
controls.maxDistance = 480;
controls.maxPolarAngle = Math.PI * 0.485;
controls.minPolarAngle = 0.12;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.9;
/* 左键留给框选：旋转改用中键（RTS 习惯） */
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: null };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
let commands = null;

const world = new THREE.Group();
scene.add(world);

/* ------------------------------------------------------------- 天空 --- */
const skyUniforms = {
  uTop:     { value: new THREE.Color(0x0b1a26) },
  uBottom:  { value: new THREE.Color(0x6b5f52) },
  uSunCol:  { value: new THREE.Color(0xffb070) },
  uSunDir:  { value: new THREE.Vector3(-0.55, 0.28, 0.62).normalize() },
  uGlow:    { value: 1.0 }
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(900, 32, 20),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSunCol;
      uniform vec3 uSunDir; uniform float uGlow;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float y = clamp(d.y, -1.0, 1.0);
        /* 主渐变：地平线暖色 → 天顶冷色 */
        float t = pow(clamp(y, 0.0, 1.0), 0.85);
        vec3 col = mix(uBottom, uTop, t);
        /* 地平线薄雾带 */
        float band = exp(-pow(clamp(y, 0.0, 1.0) * 6.5, 1.25));
        col = mix(col, uBottom * 1.12, band * 0.32);
        /* 太阳方位上的暖光晕 + 日盘 */
        float sun = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunCol * pow(sun, 5.0) * 0.42 * uGlow;
        col += uSunCol * pow(sun, 90.0) * 1.6 * uGlow;
        col += uSunCol * pow(sun, 900.0) * 6.0 * uGlow;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
);
sky.frustumCulled = false;
scene.add(sky);

/* ------------------------------------------------------------- 光照 --- */
const hemi = new THREE.HemisphereLight(0x9dc3de, 0x2b2f33, 1.4);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x3b4a58, 0.52);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffc08a, 2.35);
sun.position.set(-120, 90, 110);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 360;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.35;
scene.add(sun);
scene.add(sun.target);

const rim = new THREE.DirectionalLight(0x6fa8dd, 0.85);
rim.position.set(120, 60, -140);
scene.add(rim);

/* 基地四角的暖色泛光灯：只照亮地面与建筑立面，不投影，控制开销 */
for (const [x, z, col] of [[-62, -58, 0xffa86a], [62, -58, 0xffc27a], [-62, 62, 0xffa86a], [62, 62, 0xffc27a]]){
  const l = new THREE.PointLight(col, 13, 42, 2);
  l.position.set(x, 4.2, z);
  scene.add(l);
}

/* --------------------------------------------------------- 后期管线 --- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
/* 泛光按 0.6 分辨率算，肉眼几乎看不出差别，但省掉大半填充率 */
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5), 0.5, 0.7, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
bloom.setSize(innerWidth * 0.5, innerHeight * 0.5);

/* 动态分辨率：帧率掉下去就降采样，缓过来再升回去，保证手感优先 */
const DPR_CAP = 1.25;
let baseDpr = LITE ? 1 : Math.min(devicePixelRatio, DPR_CAP);
let renderScale = 1, perfAcc = 0, perfFrames = 0, frameNo = 0;
let quality = LITE ? 'low' : (localStorage.getItem('dsh-quality') || 'high');
function applyRenderScale(){
  if (LITE) return;
  const pr = baseDpr * renderScale;
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth * 0.5, innerHeight * 0.5);
}

/* 三档画质：高（阴影+泛光+1.4x）/ 中（1.0x + 1024 阴影）/ 低（关阴影关泛光） */
function applyQuality(q){
  quality = q;
  localStorage.setItem('dsh-quality', q);
  const isLow = q === 'low', isMid = q === 'mid';
  renderer.shadowMap.enabled = !isLow && !LITE;
  const want = isMid ? 896 : 1024;
  if (sun.shadow.mapSize.x !== want){
    sun.shadow.mapSize.set(want, want);
    if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  bloom.enabled = !isLow && !LITE;
  baseDpr = LITE ? 1 : (isLow ? 1 : (isMid ? Math.min(devicePixelRatio, 1.0) : Math.min(devicePixelRatio, DPR_CAP)));
  renderScale = 1;
  applyRenderScale();
  scene.traverse(o => {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(x => { x.needsUpdate = true; });
    else m.needsUpdate = true;
  });
  const btn = document.getElementById('b-quality');
  if (btn){
    btn.textContent = isLow ? '低' : (isMid ? '中' : '高');
    btn.classList.toggle('low', isLow);
  }
}

/* 影视模式装配：锁定分辨率、切到外部逐帧驱动，并把相机控制交给镜头脚本 */
window.__CINE_SETUP__ = (opts = {}) => {
  window.__LOCK_RES__ = true;
  renderScale = 1;
  baseDpr = opts.dpr || 1;
  applyRenderScale();
  /* 镜头脚本会贴地、贴环线飞，OrbitControls 的 minDistance/maxPolarAngle 会把它拽回去，
     所以整段拍摄期间把控制器关掉，相机完全交给 __CINE_CAM__ */
  controls.enabled = false;
  controls.update = () => {};
  /* 入场相机补间和运输舰跟随也会每帧改 camera，拍摄期间一并关掉 */
  camTween.active = false;
  followShip = false;
  window.__MANUAL__ = true;
  window.__FIXED_DT__ = opts.fps ? 1 / opts.fps : 1 / 30;
  window.__VT__ = 0;
  return { quality, dpr: baseDpr, scale: renderScale, fixedDt: window.__FIXED_DT__ };
};

/* ------------------------------------------------------------- 场景 --- */const tex = createTextures(renderer);
const M = createMaterials(tex);
const base = buildBase({ M, tex, world });
const buildings = buildBuildings({ M, tex, world, addSmoke: base.addSmoke });
const actors = createActors({ M, world, buildings });
const fx = createFx({ scene, world, tex });
const doctrine = createDoctrine();
window.__DOCTRINE__ = doctrine;

/* --------------------------------------------------------- 生产系统 --- */
const resources = createResources({ M, world, buildings, tex, fx,
  getRateMult: () => doctrine.harvestMult(),
  onRetire(h){
    toast(`一台 SCV 报废（累计采掘 ${Math.round(h.mined)} 矿，服役 ${Math.round(h.age)} 秒）· 请在指挥中心补造`);
    if (commands) commands.forget(h);
  },
  onWear(){
    toast('一台 SCV 磨损严重，即将报废 · 记得补造');
  }
});
let prodTarget = null;
let sentries = null;                  /* 栈桥哨兵：combat 建好后创建并注入 */
let victory = null;                   /* 终局目标：守住 10 波 / 指挥中心失守 */
let campaign = null;                  /* 战役关卡：目标与解锁 */
let construction = null;              /* 自由建造：指挥中心面板入口 */
let audio = createAudio();
if (audio) audio.attachCamera(camera);
const production = createProduction({
  buildings, actors, fx, wallet: resources.wallet,
  /* 上限按「已有 + 队列中」算：哨兵 8、SCV 9、坦克 3、秃鹰 6 */
  limitOf(item, b){
    if (!item) return 0;
    if (item.id === 'sentry') return sentries ? sentries.count() : 0;
    if (item.id === 'scv') return resources.harvesters.length;
    if (item.id === 'tank' || item.id === 'vulture'){
      return actors.tanks.filter(v => v.kind === item.id && v.state !== 'dead').length;
    }
    if (item.id === 'ammo'){
      return b ? (b.turretLevel || 0) : 0;
    }
    if (item.id === 'crate'){
      return Math.max(0, Math.round((supply.cap - supply.START) / 8));
    }
    return 0;
  },
  priceOf: item => doctrine.itemCost(item, item.cost || 0),
  timeOf: item => doctrine.itemTime(item, item.time),
  onChange(st, ev){
    if (prodTarget && st.key === prodTarget.key) renderProd(prodTarget);
    let made = null;
    if (ev && ev.done && actors.onProduced) made = actors.onProduced(ev);
    const btype = (st.b && st.b.type) || (ev && ev.key);
    /* 工厂载具：数组满员时退矿，避免白扣 */
    if (ev && ev.done && btype === 'factory' && !made){
      resources.wallet.minerals += ev.item.cost || 0;
      if (audio) audio.error();
    }
    /* 栈桥哨兵：从指挥中心门口走到岗位；万一满员则退回矿 */
    if (ev && ev.done && ev.item.id === 'sentry'){
      if (!sentries || !sentries.spawn()){
        resources.wallet.minerals += ev.item.cost || 0;
        if (audio) audio.error();
      }
    }
    /* SCV：真的往采矿车数组里加一辆，满 9 辆则退矿 */
    if (ev && ev.done && ev.item.id === 'scv'){
      if (!resources.addHarvester()){
        resources.wallet.minerals += ev.item.cost || 0;
        if (audio) audio.error();
      }
    }
    /* 补给箱：提高补给上限；满 44 则退矿 */
    if (ev && ev.done && ev.item.supplyCap){
      if (!supply.addCap(ev.item.supplyCap)){
        resources.wallet.minerals += ev.item.cost || 0;
        if (audio) audio.error();
      } else {
        toast(`补给上限 +${ev.item.supplyCap} · 当前 ${supply.cap}/${supply.MAX}`);
        if (audio) audio.complete(new THREE.Vector3(0, 6, 0));
      }
    }
    /* 导弹塔三级递减：Lv1 18/.83/55 → Lv2 19/.81/57 → Lv3 20/.79/59，每级 80 矿/16 秒 */
    if (ev && ev.done && ev.item.id === 'ammo'){
      const t = (st.b && st.b.type === 'turret') ? st.b
        : buildings.find(b => b.key === 'turret' || b.type === 'turret');
      if (!t || (t.turretLevel || 0) >= 3){
        resources.wallet.minerals += ev.item.cost || 0;
        if (audio) audio.error();
      } else {
        t.turretLevel = (t.turretLevel || 0) + 1;
        if (t.levelLights){
          t.levelLights.forEach((m, i) => m.color.setHex(i < t.turretLevel ? 0xffb454 : 0x22343f));
        }
        toast(`导弹塔弹药升级 · Lv.${t.turretLevel}`);
        if (audio) audio.complete(t.center);
      }
    }
    /* 维修平台「装甲维修」：所有地面载具立即恢复 25% 最大耐久 */
    if (ev && ev.done && ev.item.id === 'patch'){
      let n = 0;
      for (const v of actors.tanks){
        if (v.state === 'dead') continue;
        const r = combat.recFor(v, 'unit');
        if (r.hp >= r.maxHp) continue;
        r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.25);
        n++;
        fx.sparkAt(v.g.position.clone().setY(v.g.position.y + 2.2), 8, 0x7dff9a);
      }
      toast(n ? `战场维修 · ${n} 台载具恢复 25% 耐久` : '没有需要维修的载具');
    }
    /* 地堡改为驻军：不再生产增援班，兵营仍是唯一步兵来源 */
    if (ev && ev.done && airforce && (ev.item.id === 'dropship' || ev.item.id === 'viking')){
      const made = airforce.spawn(ev.item.id);
      if (made) console.log('[airforce] new', ev.item.id, 'pads left', airforce.freePads());
    }
    /* 战列巡航舰：全场唯一，造好直接升空停在指挥中心上空 */
    if (ev && ev.done && airforce && ev.item.id === 'battlecruiser'){
      if (!airforce.spawn('battlecruiser')) audio.error();
    }
    if (!audio) return;
    const b = buildings.find(x => x.key === st.key);
    const pos = b ? b.center : null;
    if (ev && ev.done){
      audio.complete(pos);
      audio.door(pos, false);
      audio.stopBuild();
      audio.setTankActivity(true);
    } else if (ev && ev.started){
      audio.startBuild();
      audio.door(pos, true);
    } else if (ev && ev.cancelled){
      audio.error(pos);
    }
  }
});

/* 被动科技：与生产队列独立，只作用于伤害 */
const tech = createTech({
  wallet: resources.wallet,
  toast,
  onChange(key){
    if (selected && techKeyOf(selected) === key) renderTech(selected);
    if (prodTarget) renderProd(prodTarget);
  }
});

base.searchlights.forEach(sl => { sl.spot.intensity = 260; sl.coneMat.uniforms.uOpacity.value = 0.014; });

/* ---------------------------------------------------------- 敌军 --- */
const enemies = createEnemies({
  world, fx,
  onWarning(info){
    const fin = info.wave >= 10;
    toast((fin ? '终局攻势：虫群将从' : '警报：虫群将从') + info.sides.join('、') + (fin ? '倾巢而出' : '来袭'));
    if (audio) audio.alarm(new THREE.Vector3(0, 6, 0));
  }
});

/* ------------------------------------------------------ 虫巢主基地 --- */
const hiveSys = createHive({
  world, enemies, fx,
  onAwake(){
    toast('第 6 波 · 虫巢主基地苏醒：先拔除 3 座子巢');
    if (audio) audio.alarm(new THREE.Vector3(132, 8, 0));
  },
  onShieldDown(){
    toast('三座子巢已毁 · 主巢护盾消失，全力进攻！');
    if (audio) audio.complete(null);
  }
});
const hive = hiveSys.hive;

/* --------------------------------------------------------- 空中力量 --- */
const airforce = createAirforce({ world, buildings, actors, audio, fx });
/* 出生自带一艘战列巡航舰（全场唯一），悬停在指挥中心上空 */
airforce.spawn('battlecruiser');

/* 补给/人口：开局 20，补给箱 +8，上限 44 */
const supply = createSupply({ actors, resources, airforce });
production.setSupply(supply);

/* ------------------------------------------------- 战斗反馈：浮动数字 --- */
const dmgLayer = document.getElementById('dmg-layer');
const dmgItems = [];
const MAX_DMG_ITEMS = 32;

function spawnDamage(ev){
  if (!dmgLayer || !ev || !ev.pos || dmgItems.length >= MAX_DMG_ITEMS) return;
  const el = document.createElement('div');
  el.className = 'dmg ' + (ev.kind === 'unit' ? 'player' : ev.kind === 'building' ? 'enemy' : 'enemy');
  el.textContent = ev.text || ('-' + Math.max(1, Math.round(ev.amount || 0)));
  if (ev.kind === 'kill') el.className = 'dmg kill';
  dmgLayer.appendChild(el);
  dmgItems.push({
    el,
    wp: ev.pos.clone(),
    age: 0,
    life: ev.kind === 'kill' ? 1.0 : 0.78,
    dx: (Math.random() - 0.5) * 22
  });
}

function updateDamageNumbers(dt){
  for (let i = dmgItems.length - 1; i >= 0; i--){
    const it = dmgItems[i];
    it.age += dt;
    const k = it.age / it.life;
    if (k >= 1){ it.el.remove(); dmgItems.splice(i, 1); continue; }
    const v = it.wp.clone().project(camera);
    if (v.z < -1 || v.z > 1){ it.el.style.opacity = '0'; continue; }
    const x = (v.x * 0.5 + 0.5) * innerWidth + it.dx * k;
    const y = (-v.y * 0.5 + 0.5) * innerHeight - k * 28;
    it.el.style.left = x.toFixed(1) + 'px';
    it.el.style.top = y.toFixed(1) + 'px';
    it.el.style.opacity = String(Math.max(0, 1 - k * k));
    it.el.style.transform = `translate(-50%,-50%) scale(${(1 + (1 - k) * 0.18).toFixed(2)})`;
  }
}

function updateLowHealth(){
  const el = document.getElementById('lowhp');
  const txt = document.getElementById('lowhp-text');
  if (!el) return;
  if (window.__PAUSED__ || (victory && victory.state !== 'playing')){ el.classList.remove('on'); return; }
  let low = 0;
  const add = (ent) => {
    if (!ent || !ent.g || !ent.g.visible || ent.state === 'dead' || ent.state === 'hidden' || ent.state === 'garrison') return;
    const r = combat.recFor(ent, 'unit');
    if (r && r.hp > 0 && r.hp / r.maxHp < 0.3) low++;
  };
  for (const p of actors.people) add(p);
  for (const v of actors.tanks || []) add(v);
  if (sentries) for (const s of sentries.list) add(s);
  if (airforce) for (const a of airforce.list) add(a);
  let cmdLow = false;
  const cmd = buildings.find(b => b.key === 'command');
  if (cmd){
    const r = combat.recFor(cmd, 'building');
    cmdLow = r && r.hp > 0 && r.hp / r.maxHp < 0.3;
  }
  if (low || cmdLow){
    el.classList.add('on');
    txt.textContent = cmdLow ? '⚠ 指挥中心耐久过低' : `⚠ ${low} 个单位生命值过低`;
  } else el.classList.remove('on');
}

/* --------------------------------------------------------- 战斗 --- */
const combat = createCombat({
  scene, world, camera, actors, buildings, enemies, airforce, fx, audio,
  onEvent(ev){
    if (ev.type === 'hit'){
      spawnDamage(ev);
    } else if (ev.type === 'shield'){
      spawnDamage({ pos: ev.pos, text: '护盾', kind: 'enemy' });
    } else if (ev.type === 'kill'){
      spawnDamage({ pos: ev.ent.g.position.clone().setY(ev.ent.g.position.y + 2.2), text: '击杀 +1', kind: 'kill' });
      if (audio && audio.hit) audio.hit(ev.ent.g.position);
    } else if (ev.type === 'unitDown'){
      if (audio && audio.alarm) audio.alarm(ev.ent.g.position);
    } else if (ev.type === 'vehicleDown'){
      if (commands) commands.forget(ev.ent);
      if (audio && audio.explode) audio.explode(ev.ent.g.position);
    } else if (ev.type === 'buildingHit'){
      if (audio && audio.alarm) audio.alarm(ev.ent.center);
    } else if (ev.type === 'buildingDestroyed'){
      if (selected === ev.ent) setSelected(null);
      if (production && production.forget) production.forget(ev.ent);
      if (audio && audio.explode) audio.explode(ev.ent.center);
      toast(`${ev.ent.name || '建筑'}被摧毁`);
    } else if (ev.type === 'defeat'){
      if (victory) victory.fail();
    }
  }
});

/* 空中力量与战斗互相需要：建好后把 combat 注入，用于同步血量与击落 */
airforce.bindCombat(combat);

/* ----------------------------------------------------- 栈桥哨兵 --- */
/* 开局满编 8 人直接驻防（带 0.2 秒淡入），之后阵亡只能从指挥中心补造，新兵从大门走到岗位 */
sentries = createSentries({ world, combat, buildings, enemies });
combat.bindSentries(sentries);
combat.bindTech(tech);
sentries.fill(8);

/* ------------------------------------------------------- 任务提示 --- */
const missions = createMissions({
  resources, actors, enemies, airforce,
  onComplete(step){
    toast('任务完成 · ' + step.title);
    if (audio) audio.complete(null);
  },
  onAllComplete(){ toast('前哨站已站稳 · 自由发展'); }
});

/* ------------------------------------------------------- 终局目标 --- */
victory = createVictory({
  enemies, combat,
  onVictory(data){ showEnd('victory', data); },
  onDefeat(data){ showEnd('defeat', data); }
});

/* 战役关卡：在场景建好后应用初始条件，再关掉默认终局判定 */
if (LEVEL){
  campaign = createCampaign({
    level: LEVEL, wallet: resources.wallet, enemies, hive, buildings, victory, toast
  });
  campaign.apply();
}

/* ------------------------------------------------------- 随机事件 --- */
const events = createEvents({
  enemies, world, actors, resources, buildings, combat, fx, audio, toast
});

commands = createCommands({
  camera, renderer, world, buildings, actors, resources, enemies, airforce, combat, audio,
  onAbility: (msg) => toast(msg),
  onState(st){
    const bar = document.getElementById('selbar');
    const chips = document.getElementById('sel-chips');
    document.getElementById('sel-count').textContent = st.count;
    if (!st.count){ bar.classList.remove('on'); chips.innerHTML = ''; return; }
    bar.classList.add('on');
    if (selected) setSelected(null);      /* 选中单位时收起建筑面板 */
    chips.innerHTML = st.chips.map(c =>
      `<span class="chip ${c.kind}"><i></i>${c.label} × ${c.count}</span>`).join('');
    const keys = document.querySelector('#selbar .keys');
    if (keys){
      const hasVeh = st.chips.some(c => c.kind === 'tank' || c.kind === 'vulture');
      let k = hasVeh
        ? '<b>S</b> 停止 · <b>A</b> 攻击移动 · 右键移动'
        : '<b>S</b> 停止 · <b>A</b> 攻击移动 · 右键运输舰 登机 · <b>G</b> 装载 · <b>T</b> 投送 · <b>H</b> 降落 · <b>P</b> 巡逻';
      if (st.chips.some(c => c.kind === 'tank')) k += ' · <b>E</b> 攻城模式';
      if (st.chips.some(c => c.kind === 'vulture')) k += ' · <b>M</b> 布雷';
      keys.innerHTML = k;
    }
  }
});

/* ------------------------------------------------------- 基地重排 --- */
/* 扩图后把主要建筑挪到 50–90 米环带，指挥中心/补给站/星港停靠区保持原位。
   只平移 Group 与元数据，不重建模型；所有门/工作位/载具出口同步偏移。 */
function shiftBuilding(b, nx, nz){
  if (!b || !b.center || !b.group) return;
  const dx = nx - b.center.x, dz = nz - b.center.z;
  b.group.position.x += dx;
  b.group.position.z += dz;
  b.center.x = nx;
  b.center.z = nz;
  for (const d of b.doors || []){
    if (!d.pos) continue;
    d.pos.x += dx;
    d.pos.z += dz;
  }
  if (b.workPoint){ b.workPoint.x += dx; b.workPoint.z += dz; }
  if (b.rally){ b.rally.x += dx; b.rally.z += dz; }
  if (b.vehicleExit){
    b.vehicleExit.pos.x += dx; b.vehicleExit.pos.z += dz;
    b.vehicleExit.staging.x += dx; b.vehicleExit.staging.z += dz;
  }
}
for (const [key, x, z] of [
  ['barracks_a', 54, 34], ['barracks_b', -54, 34],
  ['factory', -66, -40], ['repair', 64, 56],
  ['turret', 84, 4], ['bunker', -84, 6],
  ['starport', 70, -60]
]){
  const b = buildings.find(v => v.key === key);
  if (b) shiftBuilding(b, x, z);
}

/* ------------------------------------------------------- 自由建造 --- */
construction = createConstruction({
  buildings, world, wallet: resources.wallet, resources, production, actors, fx, audio, toast,
  camera, dom: renderer.domElement, hive,
  priceOf: (type, cost) => doctrine.buildCost(type, cost),
  timeOf: (type, time) => doctrine.buildTime(type, time)
});

/* 场地装饰（管道、栈桥、箱桶、标线等）也按材质合批：它们都是静态直挂 world 的网格 */
bakeStatic(world);

/* ------------------------------------------------------------ 存档 --- */
const saveSys = createSave({
  wallet: resources && resources.wallet,
  production, buildings, actors, airforce, combat, sentries, resources, supply, construction, doctrine, tech, camera, controls, audio,
  applyTime: (k) => k,
  getTimeK: () => timeTarget,
  setTimeK: (k) => { timeTarget = k; applyTime(k); }
});
/* 战役不使用自由模式存档，避免两边互相覆盖 */
if (LEVEL){
  const noSave = () => ({ ok: false, msg: '战役关卡自动记录进度，不使用自由模式存档' });
  saveSys.save = noSave;
  saveSys.clear = noSave;
}
window.__SAVE__ = saveSys;
window.__HUD__ = initHud();

/* ESC：设置界面（打开即暂停，关闭恢复） */
/* 返回主界面：自由模式先保存；战役二次确认，未完成关卡进度不保留 */
function exitToMenu(opts = {}){
  const campaignOn = !!window.__CAMPAIGN_ACTIVE__;
  if (campaignOn){
    const ok = window.confirm('返回主界面？本关未完成的进度不会保留；已通关的战役进度不受影响。');
    if (!ok) return { ok: false, reason: 'cancelled' };
    if (opts.dryRun) return { ok: true, action: 'campaign' };
  } else {
    const r = saveSys && saveSys.save ? saveSys.save() : { ok: false, error: 'no-save' };
    if (!r || r.ok === false){
      if (!opts.dryRun) window.alert('保存失败：' + ((r && r.error) || '未知错误') + '\n可以按 F5 手动返回主界面。');
      return { ok: false, reason: 'save-failed', error: (r && r.error) || 'unknown' };
    }
    if (opts.dryRun) return { ok: true, action: 'free', saved: true };
  }
  PAGE.mode = 'home';
  PAGE.ready = false;
  window.__PAUSED__ = true;
  location.href = location.pathname;
  return { ok: true, action: campaignOn ? 'campaign' : 'free' };
}
window.__EXIT_TO_MENU__ = exitToMenu;

const settingsUI = createSettings({ audio, applyQuality, saveSys, onExit: () => exitToMenu() });
window.__SETTINGS__ = settingsUI;
window.addEventListener('keydown', ev => {
  if (ev.key === 'Escape'){
    if (settingsUI.isOpen()){
      ev.preventDefault();
      settingsUI.toggle();
      return;
    }
    if (inputBlocked()) return;
    if (rallyArmed){
      ev.preventDefault();
      cancelRally(true);
      return;
    }
    ev.preventDefault();
    settingsUI.toggle();
  }
});

window.__SCENE__ = { scene, world, camera, renderer, controls, buildings, actors, fx, production, resources, supply, audio, commands, enemies, hive, hiveSys, combat, airforce, sentries, missions, victory, campaign, events, construction, THREE, setSelected, focusOn, saveSys, get selected(){ return selected; } };

/* --------------------------------------------------------- 选中特效 --- */
const selRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.06, 6, 72),
  new THREE.MeshBasicMaterial({ color: 0x5fe0ff, transparent: true, opacity: 0.9, depthWrite: false })
);
selRing.rotation.x = -Math.PI / 2;
selRing.visible = false;
world.add(selRing);

let selected = null;
let hovered = null;

function setSelected(b){
  if (b && b.destroyed) return;
  if (selected && selected !== b){
    for (const m of selected.accents) m.emissiveIntensity = m.userData.base ?? 1.5;
  }
  selected = b;
  prodTarget = b;
  if (b && commands) commands.clearSelection();
  if (!b){
    selRing.visible = false;
    if (rallyRange) rallyRange.visible = false;
    rallyArmed = false;
    window.__RALLY_ARMED__ = false;
    document.getElementById('info').classList.remove('show');
    document.querySelectorAll('#index-list li').forEach(li => li.classList.remove('active'));
    return;
  }
  for (const m of b.accents){
    if (m.userData.base === undefined) m.userData.base = m.emissiveIntensity;
    m.emissiveIntensity = m.userData.base * 2.2;
  }
  selRing.visible = true;
  selRing.position.set(b.center.x, 0.25, b.center.z);
  selRing.scale.setScalar(b.radius);
  rallyArmed = canSetRally(b);
  window.__RALLY_ARMED__ = rallyArmed;
  if (rallyRange){
    rallyRange.visible = rallyArmed;
    if (rallyArmed) rallyRange.position.set(b.center.x, 0.12, b.center.z);
  }
  if (audio) audio.select(b.center);

  document.getElementById('i-name').textContent = b.name;
  document.getElementById('i-en').textContent = b.en;
  document.getElementById('i-desc').textContent = b.desc;
  document.getElementById('i-status').textContent = b.status;
  if (canSetRally(b)) document.getElementById('i-status').textContent = '点击地面设置集结点 · 范围 26';
  document.getElementById('i-crew').textContent = b.crew + ' 人';
  if (b.key === 'bunker' || b.type === 'bunker'){
    const g = (b.garrison || []).length;
    document.getElementById('i-status').textContent = g ? `驻军 ${g}/4 · 自动射击 · U 卸载` : '驻军 0/4 · 右键步兵进驻';
    document.getElementById('i-crew').textContent = `${g}/4 人`;
  }
  document.getElementById('i-power').textContent = b.power;
  document.getElementById('info').classList.add('show');

  document.querySelectorAll('#index-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.key === b.key);
  });

  renderProd(b);
}

/* 建筑 0 血后先播放 0.9 秒爆炸，再从场景与碰撞列表中移除 */
function cleanupDestroyedBuildings(){
  const now = performance.now();
  for (let i = buildings.length - 1; i >= 0; i--){
    const b = buildings[i];
    if (!b.destroyed || b.key === 'command' || !b.removeAt || now < b.removeAt) continue;
    if (selected === b) setSelected(null);
    if (production && production.forget) production.forget(b);
    world.remove(b.group);
    buildings.splice(i, 1);
    if (combat && combat.forget) combat.forget(b);
  }
}

/* 地堡驻军：U 卸载全部步兵到堡外 */
window.addEventListener('keydown', (ev) => {
  if (ev.key !== 'u' && ev.key !== 'U') return;
  if (inputBlocked()) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (!selected || selected.key !== 'bunker') return;
  const tag = (ev.target && ev.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const out = actors.bunkerUnload(selected);
  if (!out.length){ toast('地堡没有驻军'); return; }
  ev.preventDefault();
  toast(`步兵离开地堡 · ${out.length} 人`);
  if (audio) audio.ack(selected.center);
  setSelected(selected);
});

/* --------------------------------------------------------- 生产面板 --- */
function renderProd(b){
  const wrap = document.getElementById('prod');
  if (!wrap) return;
  const st = production.stateOf(b);
  if (!st || !st.items.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  const items = document.getElementById('prod-items');
  items.innerHTML = '';
  st.items.forEach((it, i) => {
    const btn = document.createElement('button');
    const showCost = production.priceOf(it);
    const showTime = production.timeOf(it);
    btn.className = 'prod-item';
    btn.innerHTML = `<b>${it.name}</b><span class="cost">${showCost}</span><span>${showTime}s</span>`;
    /* 唯一单位（战列巡航舰）：已有一艘就锁住；哨兵按存活数 + 排队数卡上限 8 */
    const uniqueBusy = it.unique === 'battlecruiser' && airforce.hasBattlecruiser();
    const chk = production.canEnqueue(b, i);
    btn.disabled = uniqueBusy || !chk.ok;
    btn.title = uniqueBusy ? '已有一艘战列巡航舰（全场唯一）'
      : chk.reason === 'queue' ? '队列已满'
      : chk.reason === 'limit' ? (it.id === 'scv'
          ? `SCV 已达上限（${chk.have}/${chk.max}，含排队）`
          : it.id === 'tank' ? `攻城坦克已达上限（${chk.have}/${chk.max}，含排队）`
          : it.id === 'vulture' ? `秃鹰摩托已达上限（${chk.have}/${chk.max}，含排队）`
          : it.id === 'ammo' ? `导弹塔弹药已满级（${chk.have}/${chk.max}）`
          : `栈桥哨兵已达上限（${chk.have}/${chk.max}，含排队）`)
      : chk.reason === 'supply' ? `补给不足（需要 ${chk.need}，当前 ${chk.have}/${chk.cap}）`
      : chk.reason === 'minerals' ? `矿物不足（需要 ${showCost}）`
      : `生产 ${it.name} · ${showCost} 矿 · ${showTime} 秒`;
    btn.addEventListener('click', () => {
      const ok = production.enqueue(b, i);
      if (audio) ok ? audio.servo(b.center) : audio.error(b.center);
      renderProd(b);
    });
    items.appendChild(btn);
  });
  if (b.key === 'command' && construction){
    const bb = document.createElement('button');
    bb.className = 'prod-item';
    bb.innerHTML = '<b>建造建筑</b><span class="cost">BUILD</span><span>选址</span>';
    bb.style.borderColor = 'rgba(99,214,255,.55)';
    bb.addEventListener('click', () => construction.openMenu());
    items.appendChild(bb);
  }

  const q = document.getElementById('prod-queue');
  q.innerHTML = '';
  if (!st.queue.length){
    const d = document.createElement('span');
    d.style.cssText = 'font:400 10.5px/1 Consolas,monospace;color:#5d7284;letter-spacing:.06em;padding:4px 0';
    d.textContent = '队列空闲 · 选择单位开始生产';
    q.appendChild(d);
  } else {
    st.queue.forEach((item, i) => {
      const c = document.createElement('span');
      c.className = 'chip' + (i === 0 && st.active ? ' cur' : '');
      c.innerHTML = `${item.name}<u>×</u>`;
      c.title = i === 0 && st.active ? '中止当前生产' : '移出队列';
      c.addEventListener('click', ev => { ev.stopPropagation(); production.cancel(b, i); if (audio) audio.click(); });
      q.appendChild(c);
    });
  }

  const pct = st.active ? st.progress : 0;
  document.getElementById('prod-fill').style.width = (pct * 100).toFixed(1) + '%';
  document.getElementById('prod-pct').textContent = Math.round(pct * 100) + '%';
  document.getElementById('prod-status').textContent = st.active
    ? '生产中 · ' + st.queue[0].name
    : (st.queue.length ? '排队中（生产线占用）' : '待命');
  document.getElementById('prod-produced').textContent = String(st.produced).padStart(2, '0');
  renderTech(b);
}

/* --------------------------------------------------------- 科技面板 --- */
function renderTech(b){
  const wrap = document.getElementById('tech-panel');
  if (!wrap) return;
  const key = techKeyOf(b);
  if (!key){ wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = '';
  const s = tech.stateOf(key);
  if (!s){ wrap.style.display = 'none'; return; }
  const pips = Array.from({ length: s.max }, (_, i) => `<i class="${i < s.level ? 'on' : ''}"></i>`).join('');
  let action, disabled = false;
  if (s.level >= s.max){ action = '<span class="tp-done">已满级</span>'; disabled = true; }
  else if (s.busy){ action = `<span class="tp-busy">研究 ${Math.round(s.pct * 100)}%</span>`; disabled = true; }
  else {
    disabled = resources.wallet.minerals < s.next.cost;
    action = `<button data-tech="${key}" title="研究 ${s.def.name}：${s.next.cost} 矿 / ${s.next.time} 秒" ${disabled ? 'disabled' : ''}>研究 ${s.next.cost}</button>`;
  }
  wrap.innerHTML = `<div class="tp-head"><span>被动科技</span><em>TECH</em></div>
    <div class="tp-row" title="${s.def.desc}">
      <div class="tp-name">${s.def.name} <span>Lv.${s.level}/${s.max}</span><em>${s.def.desc}</em></div>
      <div class="tp-pips">${pips}</div>
      ${action}
    </div>`;
  const btn = wrap.querySelector('button[data-tech]');
  if (btn) btn.addEventListener('click', () => {
    if (tech.start(key)){ if (audio) audio.servo(b.center); renderTech(b); }
    else if (audio) audio.error(b.center);
  });
}

/* 相机补间 */
const camTween = { active: false, t: 0, dur: 1.15, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), toTgt: new THREE.Vector3() };
function focusOn(b){
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  const dist = Math.max(48, b.radius * 3.4);
  camTween.fromPos.copy(camera.position);
  camTween.fromTgt.copy(controls.target);
  camTween.toTgt.copy(b.center).setY(Math.max(2, b.center.y * 0.4));
  camTween.toPos.copy(camTween.toTgt).add(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, dist * 0.45, 0));
  camTween.active = true;
  camTween.t = 0;
}

/* ------------------------------------------------------------ 交互 --- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tip = document.getElementById('tip');
const tooltipName = document.getElementById('tip-name');

function buildingOf(obj){
  let o = obj;
  while (o){
    if (o.userData && o.userData.building) return o.userData.building.destroyed ? null : o.userData.building;
    if (o.userData && o.userData.buildingKey){
      const b = buildings.find(x => x.key === o.userData.buildingKey && !x.destroyed);
      if (b) return b;
    }
    o = o.parent;
  }
  return null;
}
buildings.forEach(b => { b.group.userData.buildingKey = b.key; });

function pointerNdc(ev){
  return pointer.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
}

function pick(ev){
  pointerNdc(ev);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(world.children, true);
  for (const h of hits){
    if (h.object.isPoints || h.object.isSprite) continue;
    const b = buildingOf(h.object);
    if (b) return b;
  }
  return null;
}

renderer.domElement.addEventListener('pointermove', ev => {
  if (inputBlocked()){
    setHovered(null);
    tip.classList.remove('show');
    renderer.domElement.style.cursor = 'default';
    return;
  }
  const b = pick(ev);
  setHovered(b);
  renderer.domElement.style.cursor = b ? 'pointer' : 'grab';
  if (b){
    tip.classList.add('show');
    tip.style.transform = `translate(${ev.clientX + 16}px, ${ev.clientY + 14}px)`;
    document.getElementById('tip-name').textContent = b.name + ' · ' + b.en;
  } else {
    tip.classList.remove('show');
  }
});

/* 悬停高亮：仅提升该建筑的发光条 */
function setHovered(b){
  if (hovered === b) return;
  if (hovered && hovered !== selected){
    for (const m of hovered.accents) m.emissiveIntensity = m.userData.base ?? 1.5;
  }
  hovered = b;
  if (b && b !== selected){
    for (const m of b.accents){
      if (m.userData.base === undefined) m.userData.base = m.emissiveIntensity;
      m.emissiveIntensity = m.userData.base * 1.5;
    }
  }
}

/* 点击：建筑则选中并推近；空白处则取消选中（拖拽不算） */
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', ev => {
  if (inputBlocked()) return;
  downX = ev.clientX; downY = ev.clientY;
});
renderer.domElement.addEventListener('pointerup', ev => {
  if (inputBlocked()) return;
  if (commands && commands.consumed) return;
  if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return;
  const b = pick(ev);
  if (b){ setSelected(b); followShip = false; syncFollowButton(); }
  else if (selected && rallyArmed && trySetRally(ev)){
    /* 第二次左键：在范围内确定集结点 */
  }
  else { setSelected(null); }
});

/* 右键：给选中的生产建筑设置集结点 */
const RALLY_KEYS = ['barracks_a', 'barracks_b', 'factory', 'starport'];
const RALLY_TYPES = ['barracks', 'factory', 'starport'];
function canSetRally(b){
  return !!b && (RALLY_KEYS.indexOf(b.key) >= 0 || RALLY_TYPES.indexOf(b.type) >= 0);
}
const rallyMarkers = {};
function rallyMarkerFor(key){
  if (rallyMarkers[key]) return rallyMarkers[key];
  const g = new THREE.Group();
  const ringM = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.05, 48),
    new THREE.MeshBasicMaterial({ color: 0x64e2ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ringM.rotation.x = -Math.PI / 2;
  ringM.position.y = 0.1;
  g.add(ringM);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2b3742, metalness: 0.5, roughness: 0.5 }));
  pole.position.y = 1.7;
  pole.castShadow = true;
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.95),
    new THREE.MeshBasicMaterial({ color: 0x4fd0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  flag.position.set(0.82, 2.9, 0);
  g.add(flag);
  const light = new THREE.PointLight(0x64e2ff, 12, 16, 2);
  light.position.y = 2.2;
  g.add(light);
  g.visible = false;
  world.add(g);
  rallyMarkers[key] = { g, ring: ringM, flag, light };
  return rallyMarkers[key];
}

const RALLY_RADIUS = 26;
let rallyArmed = false;
const rallyRange = new THREE.Mesh(
  new THREE.RingGeometry(RALLY_RADIUS - 0.3, RALLY_RADIUS, 96),
  new THREE.MeshBasicMaterial({ color: 0x64e2ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
);
rallyRange.rotation.x = -Math.PI / 2;
rallyRange.position.y = 0.12;
rallyRange.visible = false;
world.add(rallyRange);
if (window.__SCENE__){ window.__SCENE__.rallyRange = rallyRange; window.__SCENE__.trySetRally = trySetRally; }

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);

function trySetRally(ev){
  if (!selected || !canSetRally(selected)) return false;
  pointerNdc(ev);
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return false;
  const d = Math.hypot(hit.x - selected.center.x, hit.z - selected.center.z);
  if (d > RALLY_RADIUS){
    if (toast) toast('集结点超出范围');
    return false;
  }
  hit.y = 0.02;
  selected.rally = hit.clone();
  const m = rallyMarkerFor(selected.key);
  m.g.position.copy(hit);
  m.g.visible = true;
  fx.sparkAt(new THREE.Vector3(hit.x, 1.2, hit.z), 10, 0x64e2ff);
  if (audio) audio.ack(hit);
  rallyArmed = false;
  window.__RALLY_ARMED__ = false;
  rallyRange.visible = false;
  if (document.getElementById('i-status')) document.getElementById('i-status').textContent = '集结点已设';
  return true;
}

renderer.domElement.addEventListener('contextmenu', ev => {
  ev.preventDefault();
  if (inputBlocked()) return;
  /* 右键只退出集结点模式，不落点：落点统一用左键确认 */
  if (rallyArmed) cancelRally(true);
});

/* 退出集结点模式：右键 / Esc。保留建筑选中，左键再点建筑可重新进入。 */
function cancelRally(showToast){
  if (!rallyArmed) return;
  rallyArmed = false;
  window.__RALLY_ARMED__ = false;
  rallyRange.visible = false;
  const st = document.getElementById('i-status');
  if (st && selected) st.textContent = '集结点未设置 · 左键点建筑重设';
  if (showToast && toast) toast('已退出集结点设置');
}

/* ------------------------------------------------------------ 教条 --- */
function setDoctrineTag(){
  const el = document.getElementById('res-doctrine');
  if (!el) return;
  const d = doctrine.data;
  el.textContent = d ? `${d.name} · ${d.tag}` : '未选择';
  el.style.color = d ? d.accent : '#6a8994';
}

function showDoctrine(){
  if (doctrine.chosen) return;
  const el = document.getElementById('doctrine');
  if (!el) return;
  PAGE.mode = 'doctrine';
  PAGE.ready = false;
  el.classList.add('on');
  window.__PAUSED__ = true;
}

function chooseDoctrine(id, silent){
  if (!doctrine.choose(id)) return false;
  setDoctrineTag();
  const el = document.getElementById('doctrine');
  if (el) el.classList.remove('on');
  enterGame();
  if (!silent && doctrine.data){
    toast(`开局教条 · ${doctrine.data.name}：${doctrine.data.desc}`);
    if (audio) audio.complete(new THREE.Vector3(0, 6, 0));
  }
  return true;
}
window.__DOCTRINE_UI__ = { show: showDoctrine, choose: chooseDoctrine };

/* 唯一入场函数：关闭所有覆盖层，进入可操作状态 */
function enterGame(){
  const gate = document.getElementById('gate');
  if (gate) gate.classList.add('done');
  const picker = document.getElementById('campaign-pick');
  if (picker) picker.remove();
  const doc = document.getElementById('doctrine');
  if (doc) doc.classList.remove('on');
  PAGE.mode = 'game';
  PAGE.ready = true;
  window.__PAUSED__ = false;
}

document.querySelectorAll('#doctrine [data-doc]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (audio) audio.click();
    chooseDoctrine(btn.dataset.doc);
  });
});

/* ------------------------------------------------------------ 音频闸门 --- */
const gateEl = document.getElementById('gate');
const gateBtn = document.getElementById('gate-btn');
function enterBase(){
  if (audio){
    audio.resume();
    audio.startMusic();
    audio.click();
  }
  if (gateEl) gateEl.classList.add('done');
  let fresh = false;
  try {
    fresh = sessionStorage.getItem('dsh-new-game') === '1';
    if (fresh) sessionStorage.removeItem('dsh-new-game');
  } catch (e) {}
  if (fresh) setTimeout(() => toast('新档已开始 · 大和 1 艘 / 哨兵 8 名 / SCV 3 名'), 500);
  if (!doctrine.chosen){
    PAGE.mode = 'doctrine';
    PAGE.ready = false;
    setTimeout(showDoctrine, 320);
  } else {
    enterGame();
  }
}
if (gateBtn) gateBtn.addEventListener('click', enterBase);
if (gateEl) gateEl.addEventListener('click', ev => { if (ev.target === gateEl) enterBase(); });
/* 选关页只在没有 level/free 且不是测试入口时出现；选完写 URL 重载 */
if (TEST){
  if (gateEl) gateEl.classList.add('done');
  if (!doctrine.chosen) doctrine.restore('fortress');
  setDoctrineTag();
  enterGame();
  PAGE.test = true;
  if (toast) setTimeout(() => toast('测试模式 · 自由模式 · 要塞教条'), 400);
} else {
  if (!LEVEL && !FREE) mountLevelPicker();
  PAGE.mode = (LEVEL || FREE) ? 'gate' : 'home';
  if (LEVEL || FREE) window.__PAUSED__ = true;
}

const audioBtn = document.getElementById('b-audio');
if (audioBtn && audio){
  audioBtn.addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    audioBtn.textContent = audio.muted ? '音频 关' : '音频 开';
    audioBtn.classList.toggle('off', audio.muted);
    if (!audio.muted) audio.click();
  });
}
const volMusic = document.getElementById('vol-music');
const volSfx = document.getElementById('vol-sfx');
const pctMusic = document.getElementById('pct-music');
const pctSfx = document.getElementById('pct-sfx');

function applyVol(kind, raw){
  const v = Math.max(0, Math.min(100, Math.round(raw)));
  if (kind === 'music'){
    if (volMusic) volMusic.value = String(v);
    if (pctMusic) pctMusic.textContent = v + '%';
    audio.setMusicVolume(v / 100);
  } else {
    if (volSfx) volSfx.value = String(v);
    if (pctSfx) pctSfx.textContent = v + '%';
    audio.setSfxVolume(v / 100);
  }
  return v;
}
const cur = kind => Number((kind === 'music' ? volMusic : volSfx)?.value || 0);

if (volMusic) volMusic.addEventListener('input', () => applyVol('music', Number(volMusic.value)));
if (volSfx) volSfx.addEventListener('input', () => applyVol('sfx', Number(volSfx.value)));

/* −/+ 精确微调 5%，滚轮微调 1% */
document.querySelectorAll('#audio-ctl .nub').forEach(btn => {
  btn.addEventListener('click', () => {
    const kind = btn.dataset.step;
    applyVol(kind, cur(kind) + Number(btn.dataset.dir) * 5);
    audio.click();
  });
});
[['music', volMusic], ['sfx', volSfx]].forEach(([kind, el]) => {
  if (!el) return;
  el.addEventListener('wheel', ev => {
    ev.preventDefault();
    applyVol(kind, cur(kind) + (ev.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  /* 拖动时不要把事件传给画布，避免相机跟着转 */
  el.addEventListener('pointerdown', ev => ev.stopPropagation());
});

if (audioBtn) audioBtn.title = '静音 / 取消静音（M）';

/* 启动即同步到固定默认值（浏览器可能恢复上次的表单值） */
applyVol('music', 52);
applyVol('sfx', 90);

/* 设施索引 */
const indexList = document.getElementById('index-list');
if (window.__SCENE__) window.__SCENE__.rallyMarkers = rallyMarkers;
for (const b of buildings){
  const li = document.createElement('li');
  li.dataset.key = b.key;
  li.innerHTML = `<span class="idx">${String(buildings.indexOf(b) + 1).padStart(2, '0')}</span><span class="nm">${b.name}</span><span class="en">${b.en}</span>`;
  li.addEventListener('click', () => { setSelected(b); if (audio) audio.click(); });
  indexList.appendChild(li);
}

/* ------------------------------------------------------- 时间与昼夜 --- */
let nightK = 0;           // 0 = 黄昏, 1 = 深夜
let timeTarget = 0;
const clockEl = document.getElementById('clock');
const timeSlider = document.getElementById('time');

function applyTime(k){
  nightK = k;
  /* 太阳沿西北方向下沉；k=1 时落到地平线之下，只剩冷色环境光 */
  const sx = lerp(-190, -150, k);
  const sy = lerp(112, 16, k);
  const sz = lerp(118, 150, k);
  sun.position.set(sx, sy, sz);
  sun.intensity = lerp(3.45, 0.16, Math.pow(k, 0.6));
  sun.color.setRGB(
    lerp(1.0, 0.42, k),
    lerp(0.72, 0.60, k),
    lerp(0.46, 0.95, k)
  );
  sun.target.position.set(0, 0, 0);

  hemi.intensity = lerp(1.05, 0.52, k);
  hemi.color.setRGB(lerp(0.46, 0.30, k), lerp(0.60, 0.44, k), lerp(0.72, 0.78, k));
  hemi.groundColor.setRGB(0.16, 0.18, 0.20);

  ambient.intensity = lerp(0.34, 0.24, k);
  ambient.color.setRGB(lerp(0.20, 0.16, k), lerp(0.26, 0.22, k), lerp(0.32, 0.36, k));

  rim.intensity = lerp(0.55, 1.15, k);
  rim.color.setRGB(lerp(0.42, 0.36, k), lerp(0.62, 0.55, k), lerp(0.85, 0.95, k));

  skyUniforms.uTop.value.setRGB(lerp(0.035, 0.012, k), lerp(0.075, 0.022, k), lerp(0.105, 0.040, k));
  skyUniforms.uBottom.value.setRGB(lerp(0.34, 0.045, k), lerp(0.22, 0.062, k), lerp(0.15, 0.090, k));
  skyUniforms.uSunCol.value.setRGB(lerp(1.0, 0.35, k), lerp(0.62, 0.52, k), lerp(0.30, 0.85, k));
  skyUniforms.uGlow.value = lerp(1.0, 0.18, k);
  skyUniforms.uSunDir.value.copy(sun.position).normalize();

  scene.fog.color.setRGB(lerp(0.062, 0.028, k), lerp(0.080, 0.040, k), lerp(0.092, 0.056, k));
  scene.fog.density = lerp(0.0023, 0.0034, k);

  bloom.strength = lerp(0.42, 0.95, k);
  bloom.threshold = lerp(0.92, 0.70, k);
  renderer.toneMappingExposure = lerp(1.28, 1.34, k);
  if (typeof fx !== 'undefined' && fx) fx.setNight(k);

  for (const b of buildings) for (const m of b.accents) m.emissiveIntensity = (m.userData.base ?? 1.5) * lerp(0.6, 1.2, k);
  for (const b of buildings) for (const m of b.beacons) m.emissiveIntensity = lerp(1.2, 2.4, k);
  base.searchlights.forEach(sl => {
    sl.spot.intensity = lerp(60, 340, k);
    sl.coneMat.uniforms.uOpacity.value = lerp(0.012, 0.028, k);
  });

  /* 时钟文字：18:30 起，k 推进到 23:40 */
  const mins = 18 * 60 + 30 + k * 320;
  const hh = Math.floor(mins / 60) % 24;
  const mm = Math.floor(mins % 60);
  clockEl.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${k > 0.55 ? '深夜' : k > 0.25 ? '入夜' : '黄昏'}`;
  if (typeof audio !== 'undefined' && audio) audio.setMood(k);
}
timeSlider.addEventListener('input', () => {
  timeTarget = timeSlider.value / 100;
  applyTime(timeTarget);
  nightK = timeTarget;
});

/* 快捷键 */
const settings = { orbit: false, people: true, lights: true };
addEventListener('keydown', ev => {
  if (ev.code === 'Space'){
    ev.preventDefault();
    timeTarget = timeTarget > 0.5 ? 0 : 1;
    timeSlider.value = timeTarget * 100;
    applyTime(timeTarget);
    nightK = timeTarget;
  }
  if (ev.key >= '1' && ev.key <= '9'){
    const b = buildings[Number(ev.key) - 1];
    if (b){ setSelected(b); focusOn(b); }
  }
  if (ev.key === 'f' || ev.key === 'F'){ followShip = !followShip; syncFollowButton(); }
  if ((ev.key === 'q' || ev.key === 'Q') && selected){ production.enqueue(selected, 0); }
  if ((ev.key === 'x' || ev.key === 'X') && selected){
    const st = production.stateOf(selected);
    if (st && st.queue.length) production.cancel(selected, st.queue.length - 1);
  }
  if (ev.key === 'r' || ev.key === 'R'){
    camera.position.set(106, 58, 124);
    controls.target.set(0, 12, 0);
  }
  if (ev.key === 'm' || ev.key === 'M'){
    const on = document.getElementById('b-audio');
    if (on) on.click();
  }
});

/* 按钮 */
let followShip = false;
function syncFollowButton(){
  const btn = document.getElementById('b-follow');
  if (btn) btn.classList.toggle('on', followShip);
}
document.getElementById('b-follow')?.addEventListener('click', () => {
  followShip = !followShip;
  syncFollowButton();
});
/* 画质按钮：高 → 中 → 低 → 高 */
const qualityBtn = document.getElementById('b-quality');
if (qualityBtn){
  qualityBtn.addEventListener('click', () => {
    const next = quality === 'high' ? 'mid' : (quality === 'mid' ? 'low' : 'high');
    applyQuality(next);
  });
}

/* 软件渲染（驱动被禁用/黑名单）时自动降档，并把原因写在按钮上 */
(function detectSoftwareRenderer(){
  let name = '';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) { /* 拿不到就算了 */ }
  window.__gpuName = name;
  if (/swiftshader|basic render|software/i.test(name) && quality !== 'low'){
    applyQuality('low');
    if (qualityBtn) qualityBtn.title = '检测到软件渲染（' + name + '），已切到低画质';
  }
})();
applyQuality(quality);

document.getElementById('b-reset').addEventListener('click', () => {
  followShip = false; syncFollowButton();
  camera.position.set(106, 58, 124);
  controls.target.set(0, 12, 0);
});
document.getElementById('b-orbit').addEventListener('click', ev => {
  settings.orbit = !settings.orbit;
  controls.autoRotate = settings.orbit;
  controls.autoRotateSpeed = 0.55;
  ev.currentTarget.classList.toggle('on', settings.orbit);
});
document.getElementById('b-people').addEventListener('click', ev => {
  settings.people = !settings.people;
  actors.people.forEach(p => p.g && (p.g.visible = settings.people && p.state !== 'hidden'));
  if (sentries) sentries.setVisible(settings.people);
  ev.currentTarget.classList.toggle('on', settings.people);
});
document.getElementById('b-lights').addEventListener('click', ev => {
  settings.lights = !settings.lights;
  base.searchlights.forEach(sl => { sl.cone.visible = settings.lights; sl.spot.visible = settings.lights; });
  ev.currentTarget.classList.toggle('on', settings.lights);
});

/* ---------------------------------------------------- 存档按钮 + 读档 --- */
const saveBtn = document.getElementById('b-save');
const clearBtn = document.getElementById('b-clear');
function toast(msg){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* 终局结算：胜利 / 指挥中心失守 */
function showEnd(type, data){
  const el = document.getElementById('endgame');
  if (!el) return;
  PAGE.mode = 'ended';
  PAGE.ready = false;
  window.__PAUSED__ = true;
  window.__LAST_END_TYPE__ = type;
  const win = type === 'victory';
  const sec = Math.max(0, Math.round(data && data.seconds || 0));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const campaignOn = !!window.__CAMPAIGN_ACTIVE__;
  document.getElementById('end-kicker').textContent =
    (data && data.kicker) || (win ? 'HIVE DESTROYED' : 'OUTPOST LOST');
  document.getElementById('end-title').textContent =
    (data && data.title) || (win ? '虫巢已摧毁' : '指挥中心失守');
  document.getElementById('end-sub').textContent =
    (data && data.subtitle) || (win
      ? '三座子巢被拔除，主巢核心崩溃；虫群失去中枢，前哨站幸存。'
      : '指挥中心被虫群摧毁，前哨基地陷落。');
  const endNew = document.getElementById('end-new');
  const endFree = document.getElementById('end-free');
  if (endNew) endNew.textContent = campaignOn
    ? (window.__CAMPAIGN_NEXT__ ? '下一关' : (win ? '返回关卡' : '重试本关'))
    : '再来一局';
  if (endFree) endFree.textContent = campaignOn ? '关卡选择' : '自由模式';
  const waves = Math.max(1, (data && data.waves) || 0);
  document.getElementById('end-stats').innerHTML =
    `<div class="s"><span>WAVES</span><b>${waves}</b></div>` +
    `<div class="s"><span>KILLS</span><b>${(data && data.kills) || 0}</b></div>` +
    `<div class="s"><span>TIME</span><b>${mm}:${ss}</b></div>`;
  el.classList.add('on');
  if (audio) (win ? audio.complete(null) : audio.error());
  if (win) toast('虫巢已摧毁 · 虫群失去中枢');
}
const endNewBtn = document.getElementById('end-new');
if (endNewBtn) endNewBtn.addEventListener('click', () => {
  if (window.__CAMPAIGN_ACTIVE__){
    if (window.__CAMPAIGN_NEXT__){
      const u = new URL(location.href);
      u.searchParams.set('level', window.__CAMPAIGN_NEXT__);
      u.searchParams.delete('free');
      location.href = u.href;
      return;
    }
    if (window.__LAST_END_TYPE__ === 'victory'){
      location.href = location.pathname;
      return;
    }
    location.reload();
    return;
  }
  if (window.__NEW_GAME__) window.__NEW_GAME__();
});
const endFreeBtn = document.getElementById('end-free');
if (endFreeBtn) endFreeBtn.addEventListener('click', () => {
  if (window.__CAMPAIGN_ACTIVE__){
    location.href = location.pathname;
    return;
  }
  const el = document.getElementById('endgame');
  if (el) el.classList.remove('on');
  PAGE.mode = 'game';
  PAGE.ready = true;
  window.__PAUSED__ = false;
  toast('自由模式 · 基地不会结束');
});
if (saveBtn) saveBtn.addEventListener('click', () => {
  const r = saveSys.save();
  if (r.ok){
    const a = airforce.list.filter(x => !x.dead).length;
    toast('基地已保存 · 矿物 ' + Math.round(resources.wallet.minerals) + ' · 飞机 ' + a + ' 架');
  } else {
    toast('保存失败：' + r.error);
  }
});
if (clearBtn) clearBtn.addEventListener('click', () => {
  saveSys.clear();
  toast('存档已清除；点「新档」立即重置，或刷新页面');
});

/* 新档：清掉存档并重载页面，回到出厂状态（只保留开局那艘大和） */
function startNewGame(){
  saveSys.clear();
  try { sessionStorage.setItem('dsh-new-game', '1'); } catch (e) {}
  location.reload();
}
window.__NEW_GAME__ = startNewGame;

/* 启动时若有存档就自动恢复 */
if (!LEVEL && !TEST && saveSys.has()){
  const d = saveSys.restoreIfAny();
  if (d){
    setTimeout(() => toast('已读取上次存档 · ' + new Date(d.ts).toLocaleString('zh-CN')), 900);
  }
}
try {
  const wantDoc = new URLSearchParams(location.search).get('doctrine');
  if (wantDoc && !doctrine.chosen) doctrine.restore(wantDoc);
} catch (e) {}
setDoctrineTag();
window.__SCENE__.tech = tech;
window.__SCENE__.doctrine = doctrine;

/* ------------------------------------------------------------ 主循环 --- */
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, fpsTimer = 0;
const fpsEl = document.getElementById('stat-fps');
const crewEl = document.getElementById('stat-crew');
const unitsEl = document.getElementById('stat-units');
const transitEl = document.getElementById('stat-transit');
const shipEl = document.getElementById('stat-ship');
const killsEl = document.getElementById('stat-kills');
const shipName = { wait: '待命', inbound: '进近', descend: '下降', unload: '装卸', ascend: '爬升', depart: '离场' };

applyTime(0);
timeSlider.value = 0;
setSelected(buildings[0]);

/* 入场镜头 */
camera.position.set(230, 190, 268);
camTween.active = true;
camTween.t = 0;
camTween.dur = 3.0;
camTween.fromPos.copy(camera.position);
camTween.fromTgt.copy(controls.target);
camTween.toPos.set(106, 58, 124);
camTween.toTgt.set(0, 12, 0);

document.getElementById('loading').classList.add('done');
setTimeout(() => document.getElementById('loading').remove(), 900);

/* --------------------------------------------------------- 小地图 --- */
const mapCanvas = document.getElementById('map-canvas');
const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;
let mapTimer = 0;
const MAP_R = 155;

function drawMap(){
  if (!mapCtx) return;
  const w = mapCanvas.width, h = mapCanvas.height;
  const cx = w / 2, cy = h / 2;
  const s = (w / 2 - 6) / MAP_R;
  const X = x => cx + x * s;
  const Y = z => cy + z * s;

  mapCtx.clearRect(0, 0, w, h);

  /* 平台圆盘（与外环扩张后的半径一致） */
  mapCtx.beginPath();
  mapCtx.arc(cx, cy, 150 * s, 0, Math.PI * 2);
  mapCtx.fillStyle = 'rgba(30,44,56,.85)';
  mapCtx.fill();
  mapCtx.strokeStyle = 'rgba(96,168,208,.45)';
  mapCtx.lineWidth = 1;
  mapCtx.stroke();

  /* 环形道路 */
  mapCtx.beginPath();
  mapCtx.arc(cx, cy, 26.7 * s, 0, Math.PI * 2);
  mapCtx.strokeStyle = 'rgba(120,180,210,.22)';
  mapCtx.stroke();

  /* 来袭方向预警：最后 3 秒在对应方位画红色弧 */
  const inc = enemies.incoming();
  if (inc && inc.seconds <= 3){
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.012);
    mapCtx.lineCap = 'round';
    mapCtx.lineWidth = 3.2;
    mapCtx.strokeStyle = 'rgba(255,86,72,' + pulse.toFixed(2) + ')';
    for (const d of inc.dirs){
      const a = [0, Math.PI / 2, Math.PI, -Math.PI / 2][d];
      mapCtx.beginPath();
      mapCtx.arc(cx, cy, 74 * s, a - 0.16, a + 0.16);
      mapCtx.stroke();
    }
    mapCtx.lineCap = 'butt';
  }

  /* 建筑 */
  for (const b of buildings){
    const r = Math.max(5, Math.min(11, b.radius * 0.55 * s));
    mapCtx.save();
    mapCtx.translate(X(b.center.x), Y(b.center.z));
    mapCtx.fillStyle = b === selected ? 'rgba(79,208,255,.95)'
      : b === hovered ? 'rgba(79,208,255,.6)'
      : 'rgba(150,178,196,.55)';
    mapCtx.fillRect(-r / 2, -r / 2, r, r);
    if (b === selected){
      mapCtx.strokeStyle = 'rgba(79,208,255,.9)';
      mapCtx.lineWidth = 1.2;
      mapCtx.strokeRect(-r / 2 - 2, -r / 2 - 2, r + 4, r + 4);
    }
    mapCtx.restore();
  }

  /* 虫巢主基地与子巢 */
  if (enemies.hive){
    const hg = enemies.hive.g.position;
    mapCtx.beginPath();
    mapCtx.arc(X(hg.x), Y(hg.z), 7.5, 0, Math.PI * 2);
    mapCtx.fillStyle = enemies.hive.dead ? 'rgba(110,70,100,.6)' : 'rgba(190,92,255,.9)';
    mapCtx.fill();
    if (!enemies.hive.dead){
      mapCtx.beginPath();
      mapCtx.arc(X(hg.x), Y(hg.z), enemies.hive.shielded ? 12 : 9, 0, Math.PI * 2);
      mapCtx.strokeStyle = enemies.hive.shielded ? 'rgba(190,92,255,.85)' : 'rgba(255,120,90,.9)';
      mapCtx.lineWidth = 1.4;
      mapCtx.stroke();
    }
  }
  for (const n of enemies.nests){
    if (n.dead) continue;
    mapCtx.fillStyle = 'rgba(170,100,210,.8)';
    mapCtx.beginPath();
    mapCtx.arc(X(n.g.position.x), Y(n.g.position.z), 3.6, 0, Math.PI * 2);
    mapCtx.fill();
  }

  /* 人员 */
  mapCtx.fillStyle = 'rgba(120,220,255,.75)';
  for (const p of actors.people){
    if (!p.g.visible) continue;
    mapCtx.fillRect(X(p.g.position.x) - 0.8, Y(p.g.position.z) - 0.8, 1.6, 1.6);
  }
  mapCtx.fillStyle = 'rgba(150,235,255,.95)';
  if (sentries){
    for (const s of sentries.list){
      if (s.state === 'dead' || !s.g.visible) continue;
      mapCtx.fillRect(X(s.g.position.x) - 0.9, Y(s.g.position.z) - 0.9, 1.8, 1.8);
    }
  }

  /* 工厂载具：坦克橙、秃鹰黄 */
  for (const v of actors.tanks){
    if (v.state === 'dead' || !v.g.visible) continue;
    mapCtx.fillStyle = v.kind === 'vulture' ? 'rgba(255,211,106,.95)' : 'rgba(255,180,84,.95)';
    mapCtx.fillRect(X(v.g.position.x) - 1.1, Y(v.g.position.z) - 1.1, 2.2, 2.2);
  }

  /* 蜘蛛雷：红点 */
  if (combat && combat.mines){
    mapCtx.fillStyle = 'rgba(255,90,74,.95)';
    for (const m of combat.mines){
      mapCtx.fillRect(X(m.g.position.x) - 0.7, Y(m.g.position.z) - 0.7, 1.4, 1.4);
    }
  }

  /* 随机事件落点 */
  if (events && events.markers){
    const cols = { supply: 'rgba(99,214,255,.95)', raid: 'rgba(255,90,74,.95)', meteor: 'rgba(255,170,60,.95)', elite: 'rgba(190,110,255,.95)' };
    for (const m of events.markers){
      mapCtx.fillStyle = cols[m.type] || 'rgba(255,255,255,.9)';
      mapCtx.beginPath();
      mapCtx.arc(X(m.x), Y(m.z), 3.2, 0, Math.PI * 2);
      mapCtx.fill();
    }
  }

  /* 运输舰 */
  if (actors.ship.visible){
    mapCtx.save();
    mapCtx.translate(X(actors.ship.position.x), Y(actors.ship.position.z));
    mapCtx.rotate(-actors.ship.rotation.y);
    mapCtx.beginPath();
    mapCtx.moveTo(0, -5); mapCtx.lineTo(3, 3); mapCtx.lineTo(-3, 3);
    mapCtx.closePath();
    mapCtx.fillStyle = 'rgba(255,166,58,.95)';
    mapCtx.fill();
    mapCtx.restore();
  }

  /* 相机位置与朝向 */
  const dir = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
  mapCtx.beginPath();
  mapCtx.moveTo(X(camera.position.x), Y(camera.position.z));
  mapCtx.lineTo(X(camera.position.x + dir.x * 26), Y(camera.position.z + dir.z * 26));
  mapCtx.strokeStyle = 'rgba(255,255,255,.35)';
  mapCtx.lineWidth = 1;
  mapCtx.stroke();
  mapCtx.beginPath();
  mapCtx.arc(X(camera.position.x), Y(camera.position.z), 2.2, 0, Math.PI * 2);
  mapCtx.fillStyle = '#eaf7ff';
  mapCtx.fill();
}

/* 星港停靠修复：停在停机位上的维京/运输舰自动回血，8 hp/s、0.2 矿/血 */
let repairFxT = 0;
function updateRepairs(dt){
  for (const a of airforce.list){
    if (a.dead || a.state !== 'parked') continue;
    if (a.kind === 'battlecruiser') continue;       /* 大和不降落、不参与停靠修复 */
    const r = combat.recFor(a, 'unit');
    if (!r || r.hp >= r.maxHp) continue;
    const heal = Math.min(8 * dt, r.maxHp - r.hp);
    const cost = heal * 0.2;
    if (resources.wallet.minerals < cost) continue;
    resources.wallet.minerals -= cost;
    r.hp = Math.min(r.maxHp, r.hp + heal);
    repairFxT -= dt;
    if (repairFxT <= 0){
      repairFxT = 0.45;
      fx.sparkAt(a.g.position.clone().setY(a.g.position.y + 1.2), 4, 0x7dff9a);
    }
  }
  /* 维修平台：停在附近的地面载具自动修理（6 hp/s，0.2 矿/血） */
  for (const bay of buildings){
    if (bay.key !== 'repair' && bay.type !== 'repair') continue;
    for (const v of actors.tanks){
      if (v.state !== 'park' || !v.g.visible) continue;
      const d = Math.hypot(v.g.position.x - bay.center.x, v.g.position.z - bay.center.z);
      if (d > (bay.radius || 10) + 8) continue;
      const r = combat.recFor(v, 'unit');
      if (!r || r.hp >= r.maxHp) continue;
      const heal = Math.min(6 * doctrine.repairMult() * dt, r.maxHp - r.hp);
      const cost = heal * 0.2;
      if (resources.wallet.minerals < cost) continue;
      resources.wallet.minerals -= cost;
      r.hp = Math.min(r.maxHp, r.hp + heal);
      repairFxT -= dt;
      if (repairFxT <= 0){
        repairFxT = 0.45;
        fx.sparkAt(v.g.position.clone().setY(v.g.position.y + 2.4), 3, 0x7dff9a);
      }
    }
  }
}

/* 资源入账飘字 */
let lastTrips = 0;
function popIncome(amount){
  const host = document.getElementById('res');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'res-pop';
  el.textContent = '+' + amount;
  el.style.left = (168 + Math.random() * 26) + 'px';
  el.style.top = '26px';
  host.appendChild(el);
  setTimeout(() => el.remove(), 1200);
  const num = document.getElementById('res-minerals');
  num.classList.remove('bump');
  void num.offsetWidth;
  num.classList.add('bump');
  if (audio) audio.deposit(resources.depotPoint);
}

function animate(){
  /* 先排下一帧：任何一帧抛错都不能把渲染循环彻底停掉（否则画面冻结、但按钮还能点） */
  requestAnimationFrame(animate);
  /* 影视模式：交给外部 __STEP__ 逐帧驱动，RAF 只负责保活，不推进世界 */
  if (window.__MANUAL__) return;
  try {
    frame();
  } catch (err){
    noteError('frame', err);
  }
}

/* 影视模式入口：外部（cine/shoot.mjs）每渲染一帧调用一次 */
window.__STEP__ = () => {
  try { frame(); } catch (err){ noteError('frame', err); }
  return window.__FRAME__;
};

/* 镜头脚本：直接写相机位置 / 注视点 / 焦距，再逐帧 __STEP__ */
window.__CINE_CAM__ = (px, py, pz, tx, ty, tz, fov) => {
  camera.position.set(px, py, pz);
  if (fov && fov !== camera.fov){ camera.fov = fov; camera.updateProjectionMatrix(); }
  controls.target.set(tx, ty, tz);
  camera.lookAt(tx, ty, tz);
  return [px, py, pz];
};

/* 单帧内某个子系统出错：记一次，但继续往下渲染，画面不会停 */
function safe(label, fn){
  if (!window.__PERF_ON__){
    try { fn(); }
    catch (err){ noteError(label, err); }
    return;
  }
  const t0 = performance.now();
  try { fn(); }
  catch (err){ noteError(label, err); }
  const d = performance.now() - t0;
  const p = window.__PERF__ || (window.__PERF__ = { labels: {} });
  const s = p.labels[label] || (p.labels[label] = { n: 0, total: 0, max: 0, over: 0 });
  s.n++; s.total += d;
  if (d > s.max) s.max = d;
  if (d > 8) s.over++;
}

function noteError(label, err){
  window.__ERR__ = window.__ERR__ || { count: 0, last: '', stack: '', where: '' };
  window.__ERR__.count++;
  window.__ERR__.last = String(err && err.message || err);
  window.__ERR__.where = label;
  window.__ERR__.stack = String(err && err.stack || '').split('\n').slice(0, 4).join(' | ');
  if (window.__ERR__.count === 1) console.error('[' + label + ']', err);
  if (window.__ERR__.count === 8 && !document.getElementById('errbar')){
    const bar = document.createElement('div');
    bar.id = 'errbar';
    bar.textContent = '渲染出现异常，已自动跳过并继续运行（详情见控制台）';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;z-index:70;' +
      'padding:8px 14px;font:500 11px/1 "Microsoft YaHei",sans-serif;letter-spacing:.1em;' +
      'color:#ffd9c9;background:rgba(60,18,12,.86);border:1px solid rgba(255,120,90,.5);border-radius:2px';
    document.body.appendChild(bar);
    setTimeout(() => bar.remove(), 6000);
  }
}

function frame(){
  window.__FRAME__ = (window.__FRAME__ || 0) + 1;
  /* 影视模式：由外部逐帧驱动（__MANUAL__ + __FIXED_DT__），用固定步长代替真实时钟，
     保证同一份镜头脚本每次渲染出来的时间轴、动画相位完全一致。 */
  const dt = window.__FIXED_DT__ || Math.min(0.05, clock.getDelta());
  if (window.__FIXED_DT__) window.__VT__ = (window.__VT__ || 0) + dt;
  const t = window.__FIXED_DT__ ? window.__VT__ : clock.elapsedTime;

  /* 相机补间 */
  if (camTween.active){
    camTween.t += dt;
    let k = Math.min(1, camTween.t / camTween.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
    controls.target.lerpVectors(camTween.fromTgt, camTween.toTgt, e);
    if (k >= 1) camTween.active = false;
  }

  /* 跟随运输舰：镜头吊在舰尾斜上方 */
  if (followShip && !camTween.active){
    if (actors.ship.visible){
      const fwd = new THREE.Vector3();
      actors.ship.getWorldDirection(fwd);
      const want = actors.ship.position.clone()
        .addScaledVector(fwd, -52)
        .add(new THREE.Vector3(0, 30, 0));
      camera.position.lerp(want, 1 - Math.pow(0.00002, dt));
      controls.target.lerp(actors.ship.position, 1 - Math.pow(0.000001, dt));
    }
  }

  /* 建筑自更新 */
  for (const b of buildings) if (b.update) b.update(dt, t);
  for (const b of buildings){
    if (b.doorCtl) b.doorCtl.update(dt);
    if (b.exitDoorCtl) b.exitDoorCtl.update(dt);
  }

  /* 探照灯摆动 */
  for (const sl of base.searchlights){
    const a = t * sl.speed + sl.phase;
    const tx = Math.cos(a) * 46 + sl.x * 0.4;
    const tz = Math.sin(a * 0.8) * 46 + sl.z * 0.4;
    const ty = 2;
    sl.yoke.rotation.y = Math.atan2(tx - sl.x, tz - sl.z);
    const pitch = Math.atan2(ty - sl.baseY, Math.hypot(tx - sl.x, tz - sl.z));
    sl.yoke.rotation.x = -pitch;
    sl.conePivot.rotation.y = sl.yoke.rotation.y;
    sl.conePivot.rotation.x = -pitch + Math.PI / 2 - Math.PI / 2;
    /* 光锥朝向：本地 +Z 指向目标 */
    const dir = new THREE.Vector3(tx - sl.x, ty - sl.baseY, tz - sl.z).normalize();
    sl.conePivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    sl.spot.target.position.set(tx, ty, tz);
  }

  /* 烟雾上升 */
  for (const s of base.smokeSystems){
    const pos = s.pts.geometry.attributes.position;
    for (let i = 0; i < s.count; i++){
      let y = pos.getY(i) + s.vel[i].y * dt;
      let x = pos.getX(i) + s.vel[i].x * dt;
      let z = pos.getZ(i) + s.vel[i].z * dt;
      if (y > s.origin.y + 46){
        y = s.origin.y + Math.random() * 2;
        x = s.origin.x + (Math.random() - 0.5) * 1.6;
        z = s.origin.z + (Math.random() - 0.5) * 1.6;
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    s.pts.material.opacity = 0.3;
  }

  /* 尘埃缓慢旋转 */
  if (world.userData.dust) world.userData.dust.rotation.y += dt * 0.012;
  if (base.haze) base.haze.update(dt, t);

  /* 各子系统独立容错：某一个模块出错不应该拖停画面 */
  if (!window.__PAUSED__){
  safe('actors', () => actors.update(dt, t));
  safe('production', () => production.update(dt));
  safe('tech', () => tech.update(dt));
  safe('resources', () => resources.update(dt, t));
  safe('enemies', () => enemies.tick(dt, t));
  safe('hive', () => hiveSys.update(dt, t));
  safe('events', () => events.update(dt));
  safe('construction', () => construction && construction.update(dt));
  safe('missions', () => missions.update(dt));
  safe('sentries', () => sentries.update(dt, t));
  safe('combat', () => combat.update(dt));
  safe('cleanupBuildings', cleanupDestroyedBuildings);
  safe('victory', () => victory && victory.update(dt));
  safe('campaign', () => campaign && campaign.update(dt));
  safe('fx', () => fx.update(dt, t));
  safe('commands', () => commands.update(dt, t));
  safe('aircraft', () => airforce.update(dt, t));
  safe('repair', () => updateRepairs(dt));
  }

  /* 音频：引擎与氛围随状态变化 */
  safe('audio', () => {
    if (!audio) return;
    const ph = actors.shipPhase();
    const base = (ph === 'descend' || ph === 'ascend') ? 0.62
      : (ph === 'inbound' || ph === 'depart') ? 0.4
      : (ph === 'unload') ? 0.2 : 0;
    /* 按相机距离衰减：离得远就只当背景 */
    const d = actors.ship.position.distanceTo(camera.position);
    const near = clamp(110 / (110 + d), 0.28, 0.85);
    audio.setShip(base * (ph === 'wait' ? 0 : near));
    audio.setTankActivity(actors.tanks.some(tk => tk.state !== 'park'));
  });

  /* 小地图 */
  safe('map', () => {
    mapTimer += dt;
    if (mapTimer > 0.1){ mapTimer = 0; drawMap(); }
  });

  /* 选中环脉动 */
  if (selected){
    const p = 1 + Math.sin(t * 2.4) * 0.02;
    selRing.scale.setScalar(selected.radius * p);
    selRing.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
  }

  /* 状态栏 */
  fpsAcc += dt; fpsN++; fpsTimer += dt;
  if (fpsTimer > 0.4){
    fpsEl.textContent = Math.round(fpsN / fpsAcc);
    crewEl.textContent = String(actors.people.filter(p => p.g.visible).length + (sentries ? sentries.count() : 0)).padStart(2, '0');
    unitsEl.textContent = String(production.totals.produced).padStart(2, '0');
    transitEl.textContent = String(actors.transits.count).padStart(3, '0');
    shipEl.textContent = shipName[actors.shipPhase()] || '待命';
    const enEl = document.getElementById('stat-enemy');
    if (enEl) enEl.textContent = String(enemies.aliveCount()).padStart(2, '0');
    if (killsEl) killsEl.textContent = String(combat.kills).padStart(3, '0');
    updateLowHealth();
    const objEl = document.getElementById('obj-progress');
    if (objEl && victory && !campaign){
      if (enemies.hive){
        const h = enemies.hive;
        const aliveNests = enemies.nests.filter(n => !n.dead).length;
        objEl.textContent = h.dead ? '虫巢已摧毁'
          : !h.awake ? '虫巢主基地 · 第 6 波苏醒'
          : h.shielded ? `摧毁子巢 ${3 - aliveNests}/3 · 主巢护盾`
          : `主巢暴露 · ${Math.max(0, Math.round(h.hp / h.maxHp * 100))}%`;
      } else {
        const total = victory.TOTAL_WAVES;
        objEl.textContent = victory.state === 'victory' ? `已守住 ${total} 波`
          : victory.state === 'defeat' ? '指挥中心失守'
          : enemies.wave >= total ? '终局攻势 · 清空虫群'
          : `守住 ${total} 波 · ${Math.min(enemies.clearedWave, total)}/${total}`;
      }
    }
    const w = resources.wallet;
    document.getElementById('res-minerals').textContent = Math.round(w.minerals);
    document.getElementById('res-rate').textContent = '+' + w.rate;
    document.getElementById('res-trips').textContent = w.trips;
    document.getElementById('res-scv').textContent = resources.harvesters.length + ' / ' + resources.MAX_SCV;
    const worn = resources.harvesters.filter(h => h.wear >= 0.8).length;
    const scvEl = document.getElementById('res-scv');
    scvEl.style.color = worn ? '#ffb454' : '';
    scvEl.title = worn ? `${worn} 台 SCV 濒临报废，请在指挥中心补造` : 'SCV 数量 / 上限';
    const supEl = document.getElementById('res-supply');
    if (supEl){
      supEl.textContent = supply.used() + ' / ' + supply.cap;
      supEl.style.color = supply.free() <= 0 ? '#ff8a5a' : '';
      supEl.title = '补给：战斗单位、SCV 与飞机占用；补给站可提高上限';
    }
    if (w.trips !== lastTrips){
      const d = w.trips - lastTrips;
      lastTrips = w.trips;
      popIncome(d * 6);
    }
    if (prodTarget) renderProd(prodTarget);
    fpsAcc = 0; fpsN = 0; fpsTimer = 0;
  }

  controls.update();
  updateDamageNumbers(dt);
  sky.position.copy(camera.position);
  if (!LITE && quality !== 'low' && (frameNo++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
  safe('render', () => {
    if (LITE) renderer.render(scene, camera);
    else composer.render();
  });

  /* 每 2 秒评估一次帧率，动态调整渲染分辨率（手动选「低」时不干预） */
  if (!LITE && quality !== 'low' && !window.__LOCK_RES__){
    perfAcc += dt; perfFrames++;
    if (perfAcc > 2){
      const fps = perfFrames / perfAcc;
      perfAcc = 0; perfFrames = 0;
      if (fps < 48 && renderScale > 0.68){ renderScale = Math.max(0.68, renderScale - 0.09); applyRenderScale(); }
      else if (fps > 80 && renderScale < 1){ renderScale = Math.min(1, renderScale + 0.05); applyRenderScale(); }
    }
  }
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (LITE) return;
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth * 0.5, innerHeight * 0.5);
});
