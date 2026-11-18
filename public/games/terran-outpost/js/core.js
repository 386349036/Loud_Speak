/* 泰伦前哨基地 · 公共工具：随机数、材质库、程序化贴图、几何体助手 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* 全局随机源（固定种子，保证每次生成同一座基地） */
export const rnd = mulberry32(20261110);
export const rand = (a, b) => a + (b - a) * rnd();
export const pick = arr => arr[Math.floor(rnd() * arr.length)];

/* ----------------------------------------------------------- 材质库 --- */
export function createMaterials(tex){
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const panel = tex ? tex.panel : null;
  const panelRx = tex ? tex.panel2 : null;
  return {
    hull:      std({ color:0x59636e, metalness:0.42, roughness:0.55, map: panel }),
    hullDark:  std({ color:0x333c45, metalness:0.46, roughness:0.5,  map: panel }),
    hullLight: std({ color:0x76828e, metalness:0.36, roughness:0.58, map: panel }),
    plate:     std({ color:0x424c56, metalness:0.52, roughness:0.42, map: panelRx }),
    rust:      std({ color:0x7a5334, metalness:0.3,  roughness:0.85 }),
    grate:     std({ color:0x252c32, metalness:0.35, roughness:0.8 }),
    rubber:    std({ color:0x1b1f23, metalness:0.1,  roughness:0.95 }),
    glass:     std({ color:0x0f2c38, metalness:0.25, roughness:0.12, emissive:0x0f5c78, emissiveIntensity:0.9 }),
    pipe:      std({ color:0x5d6872, metalness:0.55, roughness:0.35 }),
    cable:     std({ color:0x191d20, metalness:0.2,  roughness:0.9 }),
    sand:      std({ color:0x6d6a62, metalness:0.05, roughness:0.98 })
  };
}

/* 发光材质：每个建筑单独一份，便于昼夜统一调节 */
export function glowMat(color = 0x3fc8ff, intensity = 1.15){
  return new THREE.MeshStandardMaterial({
    color: 0x07131a, emissive: color, emissiveIntensity: intensity,
    metalness: 0.2, roughness: 0.35
  });
}
export function warnMat(color = 0xff8a2a, intensity = 1.5){
  return new THREE.MeshStandardMaterial({
    color: 0x180f07, emissive: color, emissiveIntensity: intensity,
    metalness: 0.2, roughness: 0.5
  });
}

/* --------------------------------------------------------- 程序化贴图 --- */
export function canvasTexture(renderer, w, h, draw, rx = 1, ry = 1){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

export function createTextures(renderer){
  /* 装甲板：分块钢板 + 焊缝 + 铆钉 + 锈迹流痕（近白色，靠材质 color 着色） */
  const panel = canvasTexture(renderer, 512, 512, (g, w, h) => {
    g.fillStyle = '#cfd6dd'; g.fillRect(0, 0, w, h);
    const cell = w / 4;
    for (let ix = 0; ix < 4; ix++){
      for (let iy = 0; iy < 4; iy++){
        const tone = 200 + Math.floor(rand(-16, 16));
        g.fillStyle = `rgb(${tone},${tone + 4},${tone + 8})`;
        g.fillRect(ix * cell + 1.5, iy * cell + 1.5, cell - 3, cell - 3);
        /* 板缝阴影 */
        g.strokeStyle = 'rgba(90,100,110,0.55)'; g.lineWidth = 2;
        g.strokeRect(ix * cell + 1.5, iy * cell + 1.5, cell - 3, cell - 3);
        /* 铆钉 */
        g.fillStyle = 'rgba(140,152,163,0.7)';
        for (let k = 0; k < 4; k++){
          g.beginPath();
          g.arc(ix * cell + 8 + k * (cell - 16) / 3, iy * cell + 8, 2.2, 0, TAU); g.fill();
          g.beginPath();
          g.arc(ix * cell + 8 + k * (cell - 16) / 3, iy * cell + cell - 8, 2.2, 0, TAU); g.fill();
        }
      }
    }
    /* 锈与油污流痕 */
    for (let i = 0; i < 60; i++){
      const x = rand(0, w), y = rand(0, h), len = rand(20, 120);
      const grd = g.createLinearGradient(x, y, x, y + len);
      grd.addColorStop(0, `rgba(${rand(120,160)|0},${rand(90,120)|0},${rand(60,80)|0},0.4)`);
      grd.addColorStop(1, 'rgba(120,100,80,0)');
      g.fillStyle = grd;
      g.fillRect(x, y, rand(1.5, 5), len);
    }
    /* 划痕 */
    g.strokeStyle = 'rgba(235,242,248,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++){
      const x = rand(0, w), y = rand(0, h);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-40, 40), y + rand(-30, 30)); g.stroke();
    }
  });
  panel.repeat.set(1, 1);

  const panel2 = panel.clone();
  panel2.needsUpdate = true;
  panel2.repeat.set(3, 3);

  /* 地面：钢板网格 + 油污 + 划痕 */
  const ground = canvasTexture(renderer, 1024, 1024, (g, w, h) => {
    g.fillStyle = '#6b7681'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++){
      const r = rand(3, 30);
      g.fillStyle = `rgba(${rand(60,110)|0},${rand(68,118)|0},${rand(76,128)|0},${rand(0.05,0.28).toFixed(2)})`;
      g.beginPath(); g.arc(rand(0, w), rand(0, h), r, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(186,206,222,0.28)'; g.lineWidth = 3;
    for (let x = 0; x <= w; x += 128){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 128){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(150,176,196,0.09)'; g.lineWidth = 1;
    for (let x = 0; x <= w; x += 32){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 32){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    /* 铆钉点阵 */
    g.fillStyle = 'rgba(190,208,222,0.13)';
    for (let x = 16; x < w; x += 128) for (let y = 16; y < h; y += 128) { g.beginPath(); g.arc(x, y, 2.1, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(8,10,12,0.5)';
    for (let i = 0; i < 10; i++){
      const x = rand(0, w), y = rand(0, h);
      for (let k = 0; k < 7; k++) g.fillRect(x, y + k * 7, rand(30, 90), 3);
    }
  }, 18, 18);

  /* 黄黑警示带 */
  const hazard = canvasTexture(renderer, 256, 64, (g, w, h) => {
    g.fillStyle = '#191d20'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d0801f';
    for (let x = -h; x < w + h; x += 34){
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 17, 0); g.lineTo(x + 17 + h, h); g.lineTo(x + h, h); g.closePath(); g.fill();
    }
  }, 4, 1);

  /* 星港降落坪 */
  const pad = canvasTexture(renderer, 512, 512, (g, w, h) => {
    g.fillStyle = '#2b333a'; g.fillRect(0, 0, w, h);
    const c = w / 2;
    g.strokeStyle = '#455360'; g.lineWidth = 3;
    for (let r = 40; r < c; r += 38){ g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    g.strokeStyle = '#d0801f'; g.lineWidth = 12;
    g.beginPath(); g.arc(c, c, c - 26, 0, TAU); g.stroke();
    g.strokeStyle = '#c9d8e2'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(c - 96, c - 76); g.lineTo(c, c + 44); g.lineTo(c + 96, c - 76); g.stroke();
    g.fillStyle = '#dbe8f2'; g.font = 'bold 52px Consolas, monospace'; g.textAlign = 'center';
    g.fillText('LZ-07', c, c - 140);
    for (let i = 0; i < 600; i++){
      g.fillStyle = `rgba(0,0,0,${rand(0.03,0.15).toFixed(2)})`;
      g.beginPath(); g.arc(rand(0, w), rand(0, h), rand(2, 22), 0, TAU); g.fill();
    }
  });

  /* 烟雾粒子 */
  const smoke = canvasTexture(renderer, 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w/2, h/2, 2, w/2, h/2, w/2);
    grd.addColorStop(0, 'rgba(210,220,228,0.85)');
    grd.addColorStop(0.45, 'rgba(150,163,175,0.35)');
    grd.addColorStop(1, 'rgba(120,132,145,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });

  return { ground, hazard, pad, smoke, panel, panel2 };
}

/* 地面文字贴片 */
export function textDecal(text, size = 128, color = '#8fa6b6'){
  const c = document.createElement('canvas');
  c.width = size; c.height = size / 2;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.font = `bold ${Math.round(size * 0.5)}px Consolas, monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, size / 2, size / 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size / 60, size / 120),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.5, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.08;
  return m;
}

/* ------------------------------------------------------- 几何体助手 --- */
export function box(parent, w, h, d, x, y, z, mat, shadow = true){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow;
  parent.add(m);
  return m;
}
export function cyl(parent, rt, rb, h, seg, x, y, z, mat, shadow = true){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow;
  parent.add(m);
  return m;
}
export function strip(parent, w, h, d, x, y, z, mat){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* 把一个组里「不会动」的直接子网格按材质烘成合并网格，用来压 draw call。
   会动的子组（腿/臂/turret 等）原样保留。 */
export function bakeStatic(g){
  const buckets = new Map();
  const victims = [];
  for (const child of [...g.children]){
    if (!child.isMesh || child.isInstancedMesh) continue;
    const mat = child.material;
    if (!mat || Array.isArray(mat) || mat.transparent) continue;
    if (!mat.isMeshStandardMaterial) continue;
    const geo = child.geometry;
    if (!geo || !geo.attributes || !geo.attributes.normal) continue;
    const key = mat.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat, list: [] });
    const clone = geo.clone();
    child.updateMatrix();
    clone.applyMatrix4(child.matrix);
    buckets.get(key).list.push(clone);
    victims.push(child);
  }
  for (const { mat, list } of buckets.values()){
    if (list.length < 2) continue;
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  /* 只移除真正被合并的那些（数量 ≥2 的材质桶里的） */
  const mergedMats = new Set([...buckets.entries()].filter(([, v]) => v.list.length >= 2).map(([k]) => k));
  for (const v of victims){
    if (mergedMats.has(v.material.uuid)) g.remove(v);
  }
  return g;
}
export function ring(parent, r, tube, x, y, z, mat, seg = 64){
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, seg), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
