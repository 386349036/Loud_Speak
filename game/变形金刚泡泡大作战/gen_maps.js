// 生成各地图类型的预览 PNG：对抗图 19×19（六张）+ 冒险迷宫 50×50（三张），自带 PNG 编码器
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const G = require("./game-core.js");

// ---------- 纯 JS PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- 颜色 ----------
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

const FLOOR_A = [22, 16, 41], FLOOR_B = [27, 21, 53];
const WALL_TOP = [120, 240, 255], WALL_BOT = [30, 110, 185];

// 渲染：钢墙=青色骨架，砖块=橙色木箱；lair 为 BOSS 巢穴时额外画一个橙色虚框
function renderGrid(grid, N, drawBricks, lair) {
  const S = 640 / N;                       // 统一输出 640px 见方，16×16 的格子更大
  const W = Math.round(N * S), H = W;
  const buf = Buffer.alloc(W * H * 4);
  const put = (x, y, c, a) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, pa = buf[i + 3] / 255, na = a + pa * (1 - a);
    buf[i]     = Math.round((c[0] * a + buf[i]     * pa * (1 - a)) / (na || 1));
    buf[i + 1] = Math.round((c[1] * a + buf[i + 1] * pa * (1 - a)) / (na || 1));
    buf[i + 2] = Math.round((c[2] * a + buf[i + 2] * pa * (1 - a)) / (na || 1));
    buf[i + 3] = Math.round(na * 255);
  };
  const fillRect = (x0, y0, w, h, c, a = 1) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, c, a);
  };
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x0 = Math.round(c * S), y0 = Math.round(r * S);
    const w = Math.round((c + 1) * S) - x0, h = Math.round((r + 1) * S) - y0;
    const t = grid[r][c];
    fillRect(x0, y0, w, h, ((c + r) % 2) ? FLOOR_A : FLOOR_B);
    if (t === 1) {                                     // 钢墙
      const g = mix(WALL_BOT, WALL_TOP, (y0 + h / 2) / H);
      fillRect(x0, y0, w, h, g);
      fillRect(x0 + 1, y0 + 1, w - 2, Math.max(2, h * 0.4), mix(g, [255, 255, 255], 0.6), 0.7);
    } else if (t === 2 && drawBricks) {                // 可炸木箱
      fillRect(x0 + 2, y0 + 2, w - 4, h - 4, [180, 108, 46], 0.95);
      fillRect(x0 + 3, y0 + 3, w - 6, Math.max(2, h * 0.28), [255, 200, 140], 0.45);
    }
  }
  for (let c = 0; c <= N; c++) for (let y = 0; y < H; y++) put(Math.round(c * S), y, [125, 90, 210], 0.10);
  for (let r = 0; r <= N; r++) for (let x = 0; x < W; x++) put(x, Math.round(r * S), [125, 90, 210], 0.10);
  // BOSS 巢穴框 + 入口起点标记
  if (lair) {
    const bx0 = Math.round(lair.c0 * S), by0 = Math.round(lair.r0 * S);
    const bw = Math.round((lair.c1 - lair.c0 + 1) * S), bh = Math.round((lair.r1 - lair.r0 + 1) * S);
    for (let x = bx0; x < bx0 + bw; x += 2) { put(x, by0, [255, 160, 60]); put(x, by0 + bh - 1, [255, 160, 60]); }
    for (let y = by0; y < by0 + bh; y += 2) { put(bx0, y, [255, 160, 60]); put(bx0 + bw - 1, y, [255, 160, 60]); }
    fillRect(Math.round((lair.c0 + lair.c1) / 2 * S) - 3, Math.round((lair.r0 + lair.r1) / 2 * S) - 3, 7, 7, [255, 45, 120]);
  }
  fillRect(Math.round(1.5 * S) - 3, Math.round(1.5 * S) - 3, 7, 7, [57, 213, 255]);   // 出发口
  return { png: encodePNG(W, H, buf), size: W };
}

const MAPS = [
  ["duel",      "multi",    19, "竞技一 · 决斗台",   "中央石台 + 四角掩体，四角出生，绕柱走位"],
  ["pillars",   "multi",    19, "竞技二 · 石柱阵",   "等距方尖柱点阵，四条直通长枪线"],
  ["bridge",    "multi",    19, "竞技三 · 四门桥",   "十字墙把场地切四块，四门争夺"],
  ["cage",      "multi",    19, "竞技四 · 铁笼阵",   "中央空心铁笼四面开门，外围掩体"],
  ["crossfire", "multi",    19, "竞技五 · 交叉火力", "X 形斜墙，对角线射击与上下掩体"],
  ["wells",     "multi",    19, "竞技六 · 四合院",   "四角小室各开两门，中央十字柱"],
  ["maze1",     "campaign", 50, "迷宫一 · 回廊",     "标准迷宫，岔路多；走到另一端 BOSS 巢穴"],
  ["maze2",     "campaign", 50, "迷宫二 · 巢穴",     "环路迷宫（死路打通），跑图更顺畅"],
  ["maze3",     "campaign", 50, "迷宫三 · 深渊",     "大厅 + 长廊，空间开阔，BOSS 巢穴更大"],
];

const outDir = path.join(__dirname, "maps");
fs.mkdirSync(outDir, { recursive: true });

const big = [], dm = [];
for (const [type, mode, N, label, desc] of MAPS) {
  const room = new G.GameRoom({ mode, slots: [{ char: 0, isHuman: true, name: "x" }], cols: N, rows: N, mapType: type });
  const { png, size } = renderGrid(room.grid, N, N <= 24, room.lair || null);
  const fname = `map_${type}.png`;
  fs.writeFileSync(path.join(outDir, fname), png);
  const bricks = room.grid.flat().filter(v => v === 2).length;
  const item = { fname, label, desc, N, bricks, monsters: room.monsters.length };
  (N <= 24 ? dm : big).push(item);
  console.log("wrote", fname, `${size}x${size}`, `砖块=${bricks}`, `野怪=${room.monsters.length}`);
}

const card = f => `
  <div class="card${f.N <= 24 ? " dm" : ""}">
    <div class="cap">${f.label}<span class="tag">${f.N}×${f.N}</span></div>
    <img src="${f.fname}" alt="${f.label}">
    <div class="desc">${f.desc}<br><span class="meta">可炸木箱 ${f.bricks} 格 · 野怪 ${f.monsters} 只</span></div>
  </div>`;

const html = `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>地图预览 · 变形金刚泡泡大作战</title>
<style>
  body{margin:0;background:radial-gradient(circle at 50% 0%,#2c2150,#110a26 75%);color:#f3ecff;
    font-family:"Microsoft YaHei","PingFang SC","Segoe UI",sans-serif;padding:28px;}
  h1{text-align:center;font-size:24px;margin:6px 0 4px;}
  h2{font-size:17px;color:#ffb27a;margin:30px 4px 0;border-left:4px solid #ff7a45;padding-left:10px;}
  .sub{text-align:center;opacity:.72;margin-bottom:12px;font-size:13px;}
  .grid{display:flex;flex-wrap:wrap;gap:20px;justify-content:center;}
  .card{background:rgba(24,16,46,.72);border:1px solid rgba(255,255,255,.14);border-radius:16px;
    padding:14px;width:420px;box-shadow:0 16px 50px rgba(0,0,0,.5);}
  .card.dm{width:300px;border-color:rgba(255,122,69,.45);box-shadow:0 16px 50px rgba(255,90,40,.18);}
  .cap{font-weight:700;font-size:17px;color:#39d5ff;margin-bottom:10px;}
  .card.dm .cap{color:#ffb27a;}
  .tag{font-size:11px;font-weight:600;margin-left:8px;padding:1px 7px;border-radius:8px;
    background:rgba(255,255,255,.12);color:#d9cff5;}
  .card img{width:100%;border-radius:10px;display:block;border:1px solid rgba(255,255,255,.08);
    image-rendering:pixelated;background:#160f29;}
  .desc{margin-top:10px;opacity:.84;font-size:13px;line-height:1.5;}
  .meta{opacity:.72;font-size:12px;}
  .note{text-align:center;opacity:.6;font-size:12px;margin-top:26px;}
</style></head><body>
  <h1>变形金刚泡泡大作战 · 地图预览</h1>
  <div class="sub">青色=不可破坏钢墙　橙色小块=可炸木箱　深色棋盘=地板　🔵=出发口　🔴=BOSS 位置（橙框=BOSS 巢穴）</div>
  <h2>⚔️ 对抗地图（19×19 · PVP / 打电脑，一屏看完）</h2>
  <div class="grid">${dm.map(card).join("")}</div>
  <h2>🗺️ 冒险迷宫（50×50 · PVE，走到另一端打 BOSS）</h2>
  <div class="grid">${big.map(card).join("")}</div>
  <div class="note">提示：对抗图开局即交火；冒险迷宫从左上出发口走到右下 BOSS 巢穴，BOSS 平时休眠，踏进领地才苏醒</div>
</body></html>`;
fs.writeFileSync(path.join(outDir, "index.html"), html);
console.log("wrote maps/index.html (gallery)");
console.log("DONE");
