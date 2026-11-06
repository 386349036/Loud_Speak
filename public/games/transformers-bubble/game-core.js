/* =====================================================================
 * 变形金刚泡泡大作战 —— 共享游戏核心（纯逻辑，无 DOM / 音频依赖）
 * 同时运行于：Node（权威服务器）与浏览器（渲染客户端）。
 * 人类玩家输入通过 step(dt, inputs) 的 inputs 参数传入。
 * 音效/震屏通过 this.events 事件数组交由客户端播放。
 * ===================================================================== */
(function (root) {
  "use strict";

  // ---------- 常量 ----------
  const TILE = 36, HUD = 66;
  const SPEED_BASE = 120, BUBBLE_FUSE = 2.0, EXPLODE_TIME = 0.5, INVINCIBLE = 1.4;
  const RESPAWN_DELAY = 1.0;   // 失去生命后，延迟 1 秒重生
  const RESPAWN_INV = 3.0;     // 重生后无敌时长（秒）
  const AIRDROP_INTERVAL = 30; // 每隔多少秒空投一次道具
  const AIRDROP_COUNT = 4;     // 每次空投的道具数量
  const PASS_WINDOW = 1.0;     // 自己刚放下的炸弹，在这段时间内不挡自己的路
  const SHIELD_CD = 10;        // 震荡波：护盾失守后每 10 秒自动充能一层
  const T = { EMPTY: 0, WALL: 1, BRICK: 2, BUBBLE: 3 };
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // 每位玩家槽位的炸弹/爆炸专属配色
  const PCOLOR = ["#39d5ff", "#ff5f8f", "#a8f56e", "#ffd23e"];
  const ITEM_POOL = ["bubble", "bubble", "power", "power", "speed", "life"];
  // 稀有道具（空投低概率出现，拾取后获得强力增益）
  const RARE_POOL = ["super", "turbo", "life2"];
  const RARE_CHANCE = 0.22;

  // ---------- 变形金刚人物库（12个，汽车人 / 霸天虎） ----------
  // 平衡：炸弹数×1.4 + 威力×1.3 + (速度-1)×3.5 ≈ 常量
  // 每个角色拥有唯一被动技能（不重复）。
  const CHARS = [
    { name: "擎天柱", faction: "autobot",    maxBubbles: 2, power: 2, speed: 1.00, color: "#e0393e",
      tag: "领袖·均衡", passive: "twolives", passiveName: "双生火种",
      passiveDesc: "额外拥有 2 条命（共 5 条），被炸出局后原地短暂无敌复活（最多复活 4 次）。" },
    { name: "大黄蜂", faction: "autobot",    maxBubbles: 1, power: 1, speed: 1.38, color: "#f2c200",
      tag: "高速侦察", passive: "radar", passiveName: "透视雷达",
      passiveDesc: "可透视藏在砖块中的道具位置，提前规划路线。" },
    { name: "铁皮",   faction: "autobot",    maxBubbles: 2, power: 3, speed: 0.86, color: "#7a8694",
      tag: "重装火力", passive: "throwbomb", passiveName: "迫击投弹",
      passiveDesc: "放弹改为投向身前 2 格（遇墙/障碍则落脚下），远程布雷更安全。" },
    { name: "救护车", faction: "autobot",    maxBubbles: 3, power: 1, speed: 1.00, color: "#d94f4f",
      tag: "炸弹大师", passive: "monsterImmune", passiveName: "纳米护盾",
      passiveDesc: "免疫怪物接触伤害（闯关模式实用），专注输出。" },
    { name: "爵士",   faction: "autobot",    maxBubbles: 2, power: 1, speed: 1.26, color: "#2bbf9b",
      tag: "敏捷突袭", passive: "phantom", passiveName: "光学迷彩",
      passiveDesc: "身体仅 20% 可见（几乎全透明），对手极难预判你的走位。" },
    { name: "通天晓", faction: "autobot",    maxBubbles: 3, power: 2, speed: 0.90, color: "#3a6fd9",
      tag: "多弹均衡", passive: "turbo", passiveName: "涡轮冲刺",
      passiveDesc: "每次放弹后获得 1 秒加速冲刺，更易脱身反打。" },
    { name: "威震天", faction: "decepticon", maxBubbles: 1, power: 3, speed: 1.00, color: "#9aa0ad",
      tag: "领袖·重炮", passive: "powerplus", passiveName: "聚变核心",
      passiveDesc: "所有炸弹十字威力额外 +2 格（原 +1），毁灭性火力压制全场。" },
    { name: "红蜘蛛", faction: "decepticon", maxBubbles: 1, power: 2, speed: 1.38, color: "#c0392b",
      tag: "高速空袭", passive: "cloak", passiveName: "隐形突袭",
      passiveDesc: "放弹后 1.5 秒完全隐身（对手看不见你），偷袭更强。" },
    { name: "声波",   faction: "decepticon", maxBubbles: 3, power: 2, speed: 0.90, color: "#6c2bbf",
      tag: "折射火力", passive: "corner", passiveName: "声波折射",
      passiveDesc: "炸弹火焰撞到障碍（墙/砖）会沿拐角折射，折射段长度 = 剩余威力 ÷ 4（至少 1 格，死路不折射），绕墙偷袭更刁钻。" },
    { name: "震荡波", faction: "decepticon", maxBubbles: 2, power: 3, speed: 0.86, color: "#b03a8a",
      tag: "重炮火力", passive: "tank", passiveName: "能量护盾",
      passiveDesc: "护盾被打掉后，每 10 秒自动充能一层护盾，抵挡一次伤害。护盾上限 1 层，与场上拾取的护盾道具不叠加。" },
    { name: "机器狗", faction: "decepticon", maxBubbles: 1, power: 2, speed: 1.28, color: "#2b2b33",
      tag: "敏捷猎杀", passive: "hunter", passiveName: "猎杀本能",
      passiveDesc: "炸弹对怪物/敌人伤害范围 +2 格、击杀得分翻倍（+100%），且每次击杀回复 1 条命（上限 9）。" },
    { name: "碎骨魔", faction: "decepticon", maxBubbles: 1, power: 2, speed: 1.05, color: "#8a6a3b",
      tag: "遥控雷管", passive: "remote", passiveName: "遥控雷管",
      passiveDesc: "炸弹固定 1 颗且不会自动爆炸；再次按炸弹键手动引爆。捡到「炸弹+1」道具转为「威力+1」。" },
    { name: "惊破天", faction: "decepticon", maxBubbles: 2, power: 2, speed: 1.05, color: "#8e44c8",
      tag: "穿甲重锤", passive: "pierce", passiveName: "穿甲弹头",
      passiveDesc: "炸弹火焰每方向可多穿透 1 层砖块（多破 1 格），快速打通地形、直捣对手。" },
  ];
  const FACTION = { autobot: { name: "汽车人", body: "#2b6fd9" }, decepticon: { name: "霸天虎", body: "#5b3a8f" } };

  // ---------- 工具 ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (n) => Math.floor(Math.random() * n);
  const key = (c, r) => c + "," + r;
  const manh = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

  // =====================================================================
  //  地图生成器（多张主题，最大 25×25，每次随机）
  //  每个生成器只布置“硬墙”，砖块由 genMap 后续统一撒上；
  //  最后统一做连通性兜底，保证任意图都可玩。
  // =====================================================================
  const MAP_TYPES = ["classic", "ring", "i", "plus", "spiral",
                     "duel", "pillars", "bridge", "cage", "crossfire", "wells",
                     "maze1", "maze2", "maze3"];
  // 对抗地图（PVP / 打电脑）：固定 19×19，六张，出生点四角、通道开阔、节奏极快
  const ARENA_SIZE = 19;
  const DEATHMATCH_TYPES = ["duel", "pillars", "bridge", "cage", "crossfire", "wells"];
  const DM_BRICK_FRACTION = 0.34;
  // 冒险地图（PVE）：大尺寸迷宫，从一端出发走到另一端打 BOSS
  const MAZE_TYPES = ["maze1", "maze2", "maze3"];
  const MAZE_BRICK_FRACTION = 0.16;
  const DIFFICULTIES = ["easy", "hard"];
  function pickSize() { return [50, 59, 65, 75][ri(4)]; }

  function genClassic(g, cols, rows) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g[r][c] = (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) ? T.WALL
              : (c % 2 === 0 && r % 2 === 0 ? T.WALL : T.EMPTY);
    }
  }
  function genRing(g, cols, rows) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g[r][c] = (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) ? T.WALL : T.EMPTY;
    }
    // 回字：在外框内再套一个空心方框，四边各留一个缺口保证连通
    const inset = Math.max(5, Math.round(Math.min(cols, rows) * 0.20));
    const x0 = inset, x1 = cols - 1 - inset, y0 = inset, y1 = rows - 1 - inset;
    for (let c = x0; c <= x1; c++) { g[y0][c] = T.WALL; g[y1][c] = T.WALL; }
    for (let r = y0; r <= y1; r++) { g[r][x0] = T.WALL; g[r][x1] = T.WALL; }
    const mx = Math.round((x0 + x1) / 2), my = Math.round((y0 + y1) / 2);
    g[y0][mx] = T.EMPTY; g[y1][mx] = T.EMPTY;   // 上、下缺口
    g[my][x0] = T.EMPTY; g[my][x1] = T.EMPTY;   // 左、右缺口
  }
  function genI(g, cols, rows) { // 工字 / H 形
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g[r][c] = (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) ? T.WALL : T.EMPTY;
    }
    const yA = Math.round(rows * 0.30), yB = Math.round(rows * 0.70);
    const xC = Math.round(cols * 0.50);
    for (let c = 2; c <= cols - 3; c++) { if (c !== xC) { g[yA][c] = T.WALL; g[yB][c] = T.WALL; } }
    for (let r = yA; r <= yB; r++) { if (r !== yA && r !== yB) g[r][xC] = T.WALL; }
    // 缺口：横杠两端与竖杠中点留口
    g[yA][2] = T.EMPTY; g[yA][cols - 3] = T.EMPTY;
    g[yB][2] = T.EMPTY; g[yB][cols - 3] = T.EMPTY;
    g[Math.round((yA + yB) / 2)][xC] = T.EMPTY;
  }
  function genPlus(g, cols, rows) { // 田字 / 十字分割
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g[r][c] = (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) ? T.WALL : T.EMPTY;
    }
    const xC = Math.round(cols * 0.50), yC = Math.round(rows * 0.50);
    for (let c = 1; c <= cols - 2; c++) if (c % 3 !== 0) g[yC][c] = T.WALL;
    for (let r = 1; r <= rows - 2; r++) if (r % 3 !== 0) g[r][xC] = T.WALL;
    g[yC][xC] = T.EMPTY;
    // 多开几个缺口
    g[yC][2] = T.EMPTY; g[yC][cols - 3] = T.EMPTY;
    g[2][xC] = T.EMPTY; g[rows - 3][xC] = T.EMPTY;
  }
  function genSpiral(g, cols, rows) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g[r][c] = (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) ? T.WALL : T.EMPTY;
    }
    let x0 = 2, y0 = 2, x1 = cols - 3, y1 = rows - 3, d = 0;
    while (x0 <= x1 && y0 <= y1) {
      if (d % 2 === 0) {
        for (let c = x0; c <= x1; c++) g[y0][c] = T.WALL;
        for (let c = x0; c <= x1; c++) g[y1][c] = T.WALL;
      } else {
        for (let r = y0; r <= y1; r++) g[r][x0] = T.WALL;
        for (let r = y0; r <= y1; r++) g[r][x1] = T.WALL;
      }
      x0 += 2; y0 += 2; x1 -= 2; y1 -= 2; d++;
      if (x0 >= x1 || y0 >= y1) break;
    }
    // 螺旋留缺口
    g[2][2] = T.EMPTY; g[2][cols - 3] = T.EMPTY; g[rows - 3][2] = T.EMPTY;
  }

  // =====================================================================
  //  死斗地图（Small Arena）—— 按 16×16 设计，四角出生、面对面开打
  //  三种主题：决斗台 / 石柱阵 / 四门桥
  // =====================================================================
  function arenaBase(g, cols, rows) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      g[r][c] = (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) ? T.WALL : T.EMPTY;
  }
  function block(g, c0, r0, w, h) {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++)
      if (r > 0 && c > 0 && r < g.length - 1 && c < g[0].length - 1) g[r][c] = T.WALL;
  }
  function genDuel(g, cols, rows) {       // 决斗台：中央石台 + 四方掩体
    arenaBase(g, cols, rows);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    block(g, cx - 1, cy - 1, 2, 2);                       // 中央 2×2 石台（绕柱走位）
    const q = Math.max(3, Math.round(Math.min(cols, rows) * 0.28));
    block(g, q, q, 2, 2);                                 // 左上掩体
    block(g, cols - q - 2, q, 2, 2);                      // 右上掩体
    block(g, q, rows - q - 2, 2, 2);                      // 左下掩体
    block(g, cols - q - 2, rows - q - 2, 2, 2);           // 右下掩体
  }
  function genPillars(g, cols, rows) {    // 石柱阵：等距方尖柱，四条直通长枪线
    arenaBase(g, cols, rows);
    for (let r = 2; r <= rows - 3; r += 3)
      for (let c = 2; c <= cols - 3; c += 3) g[r][c] = T.WALL;
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    block(g, cx - 1, cy - 1, 2, 2);                       // 中心小石台，供贴身绕后
  }
  function genBridge(g, cols, rows) {     // 四门桥：中央十字墙把场地切四块，各留 3 个缺口
    arenaBase(g, cols, rows);
    const xC = Math.floor(cols / 2), yC = Math.floor(rows / 2);
    for (let c = 2; c <= cols - 3; c++) if (c % 4 !== 0) g[yC][c] = T.WALL;
    for (let r = 2; r <= rows - 3; r++) if (r % 4 !== 0) g[r][xC] = T.WALL;
    g[yC][xC] = T.EMPTY;                                  // 中心路口（四门交汇）
  }
  function genCage(g, cols, rows) {       // 铁笼阵：中央空心铁笼（四向留门）+ 四边掩体
    arenaBase(g, cols, rows);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    for (let c = cx - 2; c <= cx + 2; c++) { g[cy - 2][c] = T.WALL; g[cy + 2][c] = T.WALL; }
    for (let r = cy - 2; r <= cy + 2; r++) { g[r][cx - 2] = T.WALL; g[r][cx + 2] = T.WALL; }
    g[cy][cx - 2] = T.EMPTY; g[cy][cx + 2] = T.EMPTY;     // 左右门
    g[cy - 2][cx] = T.EMPTY; g[cy + 2][cx] = T.EMPTY;     // 上下门
    const m = Math.max(3, Math.round(cols * 0.22));
    block(g, m, cy - 1, 2, 2);  block(g, cols - m - 2, cy - 1, 2, 2);
    block(g, cx - 1, m, 2, 2);  block(g, cx - 1, rows - m - 2, 2, 2);
  }
  function genCrossfire(g, cols, rows) {  // 交叉火力：X 形斜墙切出对角射击线 + 上下掩体
    arenaBase(g, cols, rows);
    const s = 3;
    for (let i = s; i <= cols - 1 - s; i += 2) {
      g[i][i] = T.WALL;
      g[i][cols - 1 - i] = T.WALL;
      g[i][rows - 1 - i] = T.WALL;
    }
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    g[cy][cx] = T.EMPTY;                                  // 中心留出交汇口，避免堵死
    block(g, cx - 3, 2, 1, 2);          block(g, cx + 2, 2, 1, 2);
    block(g, cx - 3, rows - 4, 1, 2);   block(g, cx + 2, rows - 4, 1, 2);
  }
  function genWells(g, cols, rows) {     // 四合院：四角小室（各留两门）+ 中央十字柱
    arenaBase(g, cols, rows);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    const off = Math.max(3, Math.round(cols * 0.26));
    const rooms = [[off, off], [cols - off - 3, off], [off, rows - off - 3], [cols - off - 3, rows - off - 3]];
    for (const [x0, y0] of rooms) {
      for (let c = x0; c < x0 + 3; c++) { g[y0][c] = T.WALL; g[y0 + 2][c] = T.WALL; }
      for (let r = y0; r < y0 + 3; r++) { g[r][x0] = T.WALL; g[r][x0 + 2] = T.WALL; }
      const dc = Math.sign(cx - (x0 + 1)), dr = Math.sign(cy - (y0 + 1));
      g[y0 + 1][x0 + 1 + dc] = T.EMPTY;                    // 朝中心一侧开门
      g[y0 + 1 + dr][x0 + 1] = T.EMPTY;                    // 侧面再开一门（避免死角）
    }
    for (let c = cx - 1; c <= cx + 1; c++) g[cy][c] = T.WALL;
    for (let r = cy - 1; r <= cy + 1; r++) g[r][cx] = T.WALL;
  }

  // =====================================================================
  //  冒险迷宫（PVE 大图）—— 从左上角入口出发，穿越迷宫到右下角 BOSS 巢穴
  //  maze1 回廊：标准完美迷宫（大量死路）
  //  maze2 巢穴：编织迷宫（打通部分死路形成环路）+ 沿途厅室
  //  maze3 深渊：完美迷宫 + 多处开阔大厅
  // =====================================================================
  function mazeInit(g, cols, rows) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g[r][c] = T.WALL;
  }
  function mazeCarve(g, cols, rows, reserved) {   // 递归回溯：从 (1,1) 出发，保证全图连通
    const inRes = (c, r) => reserved && c >= reserved.c0 - 1 && c <= reserved.c1 + 1 && r >= reserved.r0 - 1 && r <= reserved.r1 + 1;
    const stack = [[1, 1]]; g[1][1] = T.EMPTY;
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const dirs = D4.slice();
      for (let i = dirs.length - 1; i > 0; i--) { const j = ri(i + 1); const t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t; }
      let moved = false;
      for (const [dx, dy] of dirs) {
        const nc = c + dx * 2, nr = r + dy * 2;
        if (nc < 1 || nr < 1 || nc > cols - 2 || nr > rows - 2) continue;
        if (inRes(nc, nr) || inRes(c + dx, r + dy)) continue;   // 巢穴保留区不参与迷宫
        if (g[nr][nc] !== T.WALL) continue;
        g[r + dy][c + dx] = T.EMPTY; g[nr][nc] = T.EMPTY;
        stack.push([nc, nr]); moved = true; break;
      }
      if (!moved) stack.pop();
    }
  }
  function mazeDeadEnds(g, cols, rows) {
    const out = [];
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      if (g[r][c] !== T.EMPTY) continue;
      let n = 0;
      for (const [dx, dy] of D4) if (g[r + dy][c + dx] === T.EMPTY) n++;
      if (n === 1) out.push([c, r]);
    }
    return out;
  }
  function mazeBraid(g, cols, rows, ratio, reserved) {   // 打通部分死路 → 形成环路（更好跑图，也更难堵人）
    const inRes = (c, r) => reserved && c >= reserved.c0 - 1 && c <= reserved.c1 + 1 && r >= reserved.r0 - 1 && r <= reserved.r1 + 1;
    const ends = mazeDeadEnds(g, cols, rows);
    for (const [c, r] of ends) {
      if (Math.random() > ratio) continue;
      const opts = [];
      for (const [dx, dy] of D4) {
        const nc = c + dx, nr = r + dy;
        if (nc < 1 || nr < 1 || nc > cols - 2 || nr > rows - 2) continue;
        if (inRes(nc, nr)) continue;
        if (g[nr][nc] !== T.WALL) continue;
        const bc = c + dx * 2, br = r + dy * 2;
        if (bc < 1 || br < 1 || bc > cols - 2 || br > rows - 2) continue;
        if (g[br][bc] === T.EMPTY) opts.push([nc, nr]);
      }
      if (opts.length) { const [nc, nr] = opts[ri(opts.length)]; g[nr][nc] = T.EMPTY; }
    }
  }
  function mazeRooms(g, cols, rows, n, size, reserved) {  // 挖几处开阔大厅
    const inRes = (c, r) => reserved && c >= reserved.c0 - 2 && c <= reserved.c1 + 2 && r >= reserved.r0 - 2 && r <= reserved.r1 + 2;
    for (let i = 0; i < n; i++) {
      const w = size, h = size;
      const c0 = 3 + ri(Math.max(1, cols - 6 - w)), r0 = 3 + ri(Math.max(1, rows - 6 - h));
      for (let r = r0; r < Math.min(rows - 2, r0 + h); r++)
        for (let c = c0; c < Math.min(cols - 2, c0 + w); c++) {
          if (inRes(c, r)) continue;
          g[r][c] = T.EMPTY;
        }
    }
  }
  // BOSS 巢穴：先预留右下角区域（迷宫生成时绕开），再挖空内部、封边、顶部开门并接回迷宫主道
  function reserveLair(cols, rows, L) {
    L = Math.min(L, cols - 6, rows - 6);
    const c1 = cols - 2, r1 = rows - 2;
    return { c0: c1 - L, r0: r1 - L, c1, r1 };
  }
  function openLair(g, L) {
    const { c0, r0, c1, r1 } = L;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++)
      g[r][c] = (r === r0 || r === r1 || c === c0 || c === c1) ? T.WALL : T.EMPTY;
    const ec = Math.round((c0 + c1) / 2);
    g[r0][ec] = T.EMPTY;                     // 巢穴大门
    let r = r0 - 1;
    while (r > 1 && g[r][ec] !== T.EMPTY) { g[r][ec] = T.EMPTY; r--; }   // 向上接入迷宫主道
    L.entryC = ec; L.entryR = r0;
    return L;
  }
  function genMazeBase(g, cols, rows, L, braid, rooms, roomSize) {
    mazeInit(g, cols, rows);
    const res = reserveLair(cols, rows, L);
    mazeCarve(g, cols, rows, res);
    if (rooms) mazeRooms(g, cols, rows, rooms, roomSize, res);
    if (braid) mazeBraid(g, cols, rows, braid, res);
    return openLair(g, res);
  }
  function genMaze1(g, cols, rows) {
    return genMazeBase(g, cols, rows, Math.max(9, Math.round(Math.min(cols, rows) * 0.22)), 0, 0, 0);
  }
  function genMaze2(g, cols, rows) {
    return genMazeBase(g, cols, rows, Math.max(9, Math.round(Math.min(cols, rows) * 0.22)), 0.55, 2, 3);
  }
  function genMaze3(g, cols, rows) {
    return genMazeBase(g, cols, rows, Math.max(11, Math.round(Math.min(cols, rows) * 0.26)), 0.25, 5, 5);
  }

  // 连通性兜底：把任何与 (1,1) 不连通的空地，挖一条路连回去
  function ensureConnectivity(g, cols, rows) {
    const isEmpty = (c, r) => g[r][c] === T.EMPTY;
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
    const q = [[1, 1]]; seen[1][1] = true;
    while (q.length) {
      const [c, r] = q.pop();
      for (const [dx, dy] of D4) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (seen[nr][nc] || !isEmpty(nc, nr)) continue;
        seen[nr][nc] = true; q.push([nc, nr]);
      }
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!isEmpty(c, r) || seen[r][c]) continue;
      // BFS（可穿木箱、但绝不挖穿钢墙）找到最近的已连通空地，沿途挖空（仅把木箱/空地挖通）
      const prev = {}; const vis = Array.from({ length: rows }, () => Array(cols).fill(false));
      vis[r][c] = true; const qq = [[c, r]]; let found = null;
      while (qq.length) {
        const [cc, rr] = qq.shift();
        if (seen[rr][cc]) { found = [cc, rr]; break; }
        for (const [dx, dy] of D4) {
          const nc = cc + dx, nr = rr + dy;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          if (vis[nr][nc] || g[nr][nc] === T.WALL) continue;
          vis[nr][nc] = true; prev[nc + "," + nr] = [cc, rr]; qq.push([nc, nr]);
        }
      }
      if (found) {
        // 从已连通的 found 反向挖回起点：沿途把墙挖空
        let cur = found;
        while (prev[cur[0] + "," + cur[1]]) {
          const p = prev[cur[0] + "," + cur[1]];
          if (!seen[p[1]][p[0]]) g[p[1]][p[0]] = T.EMPTY;
          cur = p;
        }
      }
    }
  }

  // =====================================================================
  //  游戏房间（权威逻辑）
  //  opts: { mode:'multi'|'campaign', slots:[{char,isHuman,name}], cols, rows, mapType, level }
  // =====================================================================
  class GameRoom {
    constructor(opts) {
      opts = opts || {};
      this.mode = opts.mode || "multi";
      this.level = opts.level || 1;
      // 电脑难度：easy=稳健进攻（尽量不自爆），hard=熟练运用炸弹与技能
      this.difficulty = DIFFICULTIES.includes(opts.difficulty) ? opts.difficulty : "easy";
      this.cols = opts.cols || pickSize();
      this.rows = opts.rows || pickSize();
      // 冒险（闯关）模式只允许迷宫大图；对抗模式只允许 19×19 竞技图
      let mt = opts.mapType;
      if (this.mode === "campaign") {
        if (!MAZE_TYPES.includes(mt)) mt = MAZE_TYPES[ri(MAZE_TYPES.length)];
      } else if (MAZE_TYPES.includes(mt)) {
        mt = DEATHMATCH_TYPES[ri(DEATHMATCH_TYPES.length)];
      }
      // 未指定地图时按模式随机：对抗=竞技图，冒险=迷宫图
      if (!mt || !MAP_TYPES.includes(mt)) {
        const pool = this.mode === "campaign"
          ? MAZE_TYPES
          : MAP_TYPES.filter(t => !DEATHMATCH_TYPES.includes(t) && !MAZE_TYPES.includes(t));
        mt = pool[ri(pool.length)];
      }
      this.mapType = mt;
      this.deathmatch = DEATHMATCH_TYPES.includes(this.mapType);
      this.maze = MAZE_TYPES.includes(this.mapType);
      // 竞技图一律 19×19（服务端/客户端传错尺寸也强制纠正）
      if (this.deathmatch) { this.cols = ARENA_SIZE; this.rows = ARENA_SIZE; }
      this.brickFraction = (typeof opts.brickFraction === "number") ? opts.brickFraction
                         : (this.deathmatch ? DM_BRICK_FRACTION : (this.maze ? MAZE_BRICK_FRACTION : 0.40));
      // 冒险模式 = PVE 合作（玩家之间不互相伤害）；对抗模式 = PVP
      this.pvp = this.mode !== "campaign";
      this.grid = []; this.brickItems = {}; this.items = {}; this.bubbles = []; this.explosions = [];
      this.particles = []; this.floats = []; this.players = []; this.monsters = []; this.respawns = [];
      this.winner = null; this.matchTime = 0; this.dangerSet = new Set(); this.burnSet = new Set();
      this.state = "play"; this.events = []; this.bombHeld = {}; this.shakeT = 0;
      this.flyingItems = []; this.itemDropTimer = 0; this.thrown = [];
      this.genMap();
      const sp = this.spawnPoints();
      (opts.slots || []).forEach((s, i) => this.players.push(this.makePlayer(s, sp[i % sp.length], i)));
      this.spawnMonsters();                 // 所有模式都有野怪（会掉落道具，含稀有）
      if (this.maze && this.lair) this.setupBoss();
    }

    makePlayer(s, sp, idx) {
      const c = CHARS[s.char];
      const p = {
        id: idx, name: s.name || c.name, char: s.char, faction: c.faction,
        accent: c.color, body: FACTION[c.faction].body, tagColor: PCOLOR[idx % PCOLOR.length], bombColor: PCOLOR[idx % PCOLOR.length],
        c: sp[0], r: sp[1], x: (sp[0] + .5) * TILE, y: (sp[1] + .5) * TILE,
        maxBubbles: c.maxBubbles, power: c.power, speedMul: c.speed,
        alive: true, inv: INVINCIBLE, face: 1, walkT: 0, moving: false,
        faceDir: [1, 0], passBubble: null, kills: 0, isHuman: !!s.isHuman, isPlayer: true,
        diff: s.difficulty || null,          // 单个电脑的独立难度（未指定则用房间难度）
        aiTimer: rnd(0, .3), aiDir: [0, 0], bombCd: 0,
        passive: c.passive,
        lives: c.passive === "twolives" ? 5 : 3,
        shield: c.passive === "tank",   // 一次性护盾（抵挡一次伤害），上限 1 层
        shieldT: 0,                     // 护盾充能计时（仅震荡波自动充能使用）
        boostT: 0, cloakT: 0,
        out: false,
        spawnC: sp[0], spawnR: sp[1], spawnX: (sp[0] + .5) * TILE, spawnY: (sp[1] + .5) * TILE,
        // 拾取增益记录（死亡时按此掉落、并重置回角色基础属性）
        gained: { bubble: 0, power: 0, speed: 0, life: 0 },
      };
      return p;
    }

    // ---------- 地图生成 ----------
    genMap() {
      const g = Array.from({ length: this.rows }, () => Array(this.cols).fill(T.EMPTY));
      this.lair = null;
      if (this.mapType === "ring") genRing(g, this.cols, this.rows);
      else if (this.mapType === "i") genI(g, this.cols, this.rows);
      else if (this.mapType === "plus") genPlus(g, this.cols, this.rows);
      else if (this.mapType === "spiral") genSpiral(g, this.cols, this.rows);
      else if (this.mapType === "duel") genDuel(g, this.cols, this.rows);
      else if (this.mapType === "pillars") genPillars(g, this.cols, this.rows);
      else if (this.mapType === "bridge") genBridge(g, this.cols, this.rows);
      else if (this.mapType === "cage") genCage(g, this.cols, this.rows);
      else if (this.mapType === "crossfire") genCrossfire(g, this.cols, this.rows);
      else if (this.mapType === "wells") genWells(g, this.cols, this.rows);
      else if (this.mapType === "maze1") this.lair = genMaze1(g, this.cols, this.rows);
      else if (this.mapType === "maze2") this.lair = genMaze2(g, this.cols, this.rows);
      else if (this.mapType === "maze3") this.lair = genMaze3(g, this.cols, this.rows);
      else genClassic(g, this.cols, this.rows);
      this.grid = g;

      const spawns = this.spawnPoints();
      // 出生点周围 5×5 全清空（含对角），保证放炸弹后有安全逃生路线，不会一开局就把自己炸死
      const rad = Math.max(2, Math.min(3, Math.floor(Math.min(this.cols, this.rows) / 12)));
      const safe = (c, r) => spawns.some(([sc, sr]) => Math.abs(sc - c) <= rad && Math.abs(sr - r) <= rad);
      const clearSpawns = () => {
        for (const [c, r] of spawns)
          for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
            const nc = c + dc, nr = r + dr;
            if (nc > 0 && nr > 0 && nc < this.cols - 1 && nr < this.rows - 1) this.grid[nr][nc] = T.EMPTY;
          }
      };
      clearSpawns();
      ensureConnectivity(this.grid, this.cols, this.rows);

      // 撒砖块：目标约占整张地图 40%（可破坏障碍物），随机均匀分布
      const targetBricks = Math.round(this.cols * this.rows * this.brickFraction);
      const eligible = [];
      for (let r = 1; r < this.rows - 1; r++)
        for (let c = 1; c < this.cols - 1; c++)
          if (this.grid[r][c] === T.EMPTY && !safe(c, r)) eligible.push([c, r]);
      for (let i = eligible.length - 1; i > 0; i--) { const j = ri(i + 1); const tmp = eligible[i]; eligible[i] = eligible[j]; eligible[j] = tmp; }
      if (this.deathmatch) {
        // 死斗小图：砖块互不相邻（上下左右），且不允许把相邻空格封成 1 格死洞，
        // 保证场地永远是“敞开的战场”，只剩可绕后的掩体与死胡同
        const traps = (c, r) => {
          for (const [dx, dy] of D4) {
            const nc = c + dx, nr = r + dy;
            if (this.grid[nr][nc] !== T.EMPTY) continue;
            let free = 0;
            for (const [ex, ey] of D4) {
              if (ex === -dx && ey === -dy) continue;      // 正在放下的这颗砖
              if (this.grid[nr + ey][nc + ex] === T.EMPTY) free++;
            }
            if (free === 0) return true;
          }
          return false;
        };
        let placed = 0;
        for (const [c, r] of eligible) {
          if (placed >= targetBricks) break;
          if (this.grid[r][c] !== T.EMPTY) continue;
          // 砖块之间连斜角都不许相邻：否则会形成“斜线砖墙”，把 4 向移动的空地切成碎片
          let nearBrick = false;
          for (let dr = -1; dr <= 1 && !nearBrick; dr++)
            for (let dc = -1; dc <= 1; dc++) if (this.grid[r + dr][c + dc] === T.BRICK) { nearBrick = true; break; }
          if (nearBrick) continue;
          if (traps(c, r)) continue;
          this.grid[r][c] = T.BRICK; placed++;
        }
      } else if (this.maze) {
        // 迷宫图：先算出“入口 → BOSS 巢穴大门”的通关主路，主路一律不埋砖，
        // 保证一定能走到 BOSS；支路埋砖当掩体/宝箱（可炸开）
        const inLair = (c, r) => this.lair && c >= this.lair.c0 - 1 && c <= this.lair.c1 + 1 && r >= this.lair.r0 - 1 && r <= this.lair.r1 + 1;
        const pathSet = new Set();
        if (this.lair) {
          const s0 = spawns[0], gc = this.lair.entryC, gr = this.lair.entryR;
          const prev = {}, seen = new Set([key(s0[0], s0[1])]);
          const q = [[s0[0], s0[1]]]; let h = 0, goalK = null;
          while (h < q.length) {
            const [c, r] = q[h++];
            if (c === gc && r === gr) { goalK = key(c, r); break; }
            for (const [dx, dy] of D4) {
              const nc = c + dx, nr = r + dy, k = key(nc, nr);
              if (seen.has(k) || !this.passableMove(nc, nr)) continue;
              seen.add(k); prev[k] = key(c, r); q.push([nc, nr]);
            }
          }
          if (goalK) { let k = goalK; while (k) { pathSet.add(k); k = prev[k]; } }
        }
        const pool = eligible.filter(([c, r]) => !inLair(c, r) && !pathSet.has(key(c, r)));
        const placeN = Math.min(targetBricks, pool.length);
        for (let i = 0; i < placeN; i++) { const [c, r] = pool[i]; this.grid[r][c] = T.BRICK; }
      } else {
        const placeN = Math.min(targetBricks, eligible.length);
        for (let i = 0; i < placeN; i++) { const [c, r] = eligible[i]; this.grid[r][c] = T.BRICK; }
      }
      // 砖块本身可被炸开，无需再做连通性兜底（否则会大量挖掉砖块、达不到 40% 密度），
      // 只需保证出生点周围安全；被砖块围住的小空间可炸开进入。
      clearSpawns();

      // 把道具藏进部分砖块（平时不显示，炸开才显形）
      this.brickItems = {};
      const bricks = [];
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c] === T.BRICK) bricks.push([c, r]);
      const nItem = Math.min(bricks.length, this.deathmatch ? 10 : 10 + this.players.length * 3 + this.cols);
      for (let i = 0; i < nItem; i++) {
        if (!bricks.length) break;
        const idx = ri(bricks.length);
        const [c, r] = bricks.splice(idx, 1)[0];
        this.brickItems[key(c, r)] = ITEM_POOL[ri(ITEM_POOL.length)];
      }
      this.items = {};
    }
    spawnPoints() {
      const c = this.cols, r = this.rows;
      if (this.maze) {
        // 迷宫：全员从左上角入口附近出发，一路向另一端的 BOSS 巢穴推进
        const out = [[1, 1]];
        const q = [[1, 1]]; const seen = new Set(["1,1"]);
        for (let h = 0; h < q.length && out.length < 4; h++) {
          const [cc, rr] = q[h];
          for (const [dx, dy] of D4) {
            const nc = cc + dx, nr = rr + dy, k = nc + "," + nr;
            if (nc < 1 || nr < 1 || nc > c - 2 || nr > r - 2) continue;
            if (seen.has(k) || this.grid[nr][nc] !== T.EMPTY) continue;
            seen.add(k); q.push([nc, nr]);
            if (out.length < 4) out.push([nc, nr]);
          }
        }
        while (out.length < 4) out.push(out[out.length - 1] || [1, 1]);
        return out;
      }
      return [[1, 1], [c - 2, 1], [1, r - 2], [c - 2, r - 2]];
    }

    // ---------- 空投道具（每 30 秒，从地图外飞入，落地即可拾取） ----------
    spawnAirdrop() {
      const cells = [];
      for (let r = 1; r < this.rows - 1; r++)
        for (let c = 1; c < this.cols - 1; c++)
          if (this.grid[r][c] === T.EMPTY) cells.push([c, r]);
      if (!cells.length) return;
      const n = Math.min(AIRDROP_COUNT, cells.length);
      let rare = false;
      for (let i = 0; i < n; i++) {
        const [c, r] = cells[ri(cells.length)];
        const tx = (c + .5) * TILE, ty = (r + .5) * TILE;
        const side = ri(4);                       // 从地图四条边的外侧飞入
        let sx = tx, sy = ty; const off = (4 + ri(4)) * TILE;
        if (side === 0) sy = -off;
        else if (side === 1) sy = this.rows * TILE + off;
        else if (side === 2) sx = -off;
        else sx = this.cols * TILE + off;
        const isRare = Math.random() < RARE_CHANCE;
        if (isRare) rare = true;
        this.flyingItems.push({
          type: isRare ? RARE_POOL[ri(RARE_POOL.length)] : ITEM_POOL[ri(ITEM_POOL.length)],
          c, r, t: 0, dur: 1.1 + Math.random() * 0.5,
          sx, sy, tx, ty,
        });
      }
      this.events.push(rare ? "airdropRare" : "airdrop");
    }

    inMap(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
    bombAt(c, r) { return this.bubbles.find(x => !x.exploded && x.c === c && x.r === r) || null; }
    solidAt(c, r, ent) {
      if (!this.inMap(c, r)) return true;
      const t = this.grid[r][c];
      if (t === T.WALL || t === T.BRICK) return true;
      if (t === T.BUBBLE) {
        if (ent && ent.passBubble && ent.passBubble === key(c, r)) return false;
        // 防卡死优化：自己刚放下的炸弹在 1 秒内不挡自己的路（够时间从走廊里退出来），
        // 超过 1 秒恢复阻挡，逼玩家算好逃生路线。别人的炸弹任何时候都挡路。
        if (ent && ent.isPlayer) {
          const ob = this.bombAt(c, r);
          if (ob && ob.owner === ent && ob.anim < PASS_WINDOW) return false;
        }
        return true;
      }
      return false;
    }
    boxSolid(px, py, half, ent) {
      const c1 = Math.floor((px - half) / TILE), c2 = Math.floor((px + half - 0.01) / TILE);
      const r1 = Math.floor((py - half) / TILE), r2 = Math.floor((py + half - 0.01) / TILE);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++)
        if (this.solidAt(c, r, ent)) return true;
      return false;
    }
    moveEntity(ent, dx, dy, half) {
      if (dx !== 0) {
        const nx = ent.x + dx;
        if (!this.boxSolid(nx, ent.y, half, ent)) ent.x = nx;
        else {
          const rowC = (Math.floor(ent.y / TILE) + 0.5) * TILE;
          const nudge = Math.sign(rowC - ent.y) * Math.min(Math.abs(rowC - ent.y), Math.abs(dx));
          if (nudge !== 0 && !this.boxSolid(ent.x, ent.y + nudge, half, ent)) ent.y = ent.y + nudge;
        }
      }
      if (dy !== 0) {
        const ny = ent.y + dy;
        if (!this.boxSolid(ent.x, ny, half, ent)) ent.y = ny;
        else {
          const colC = (Math.floor(ent.x / TILE) + 0.5) * TILE;
          const nudge = Math.sign(colC - ent.x) * Math.min(Math.abs(colC - ent.x), Math.abs(dy));
          if (nudge !== 0 && !this.boxSolid(ent.x + nudge, ent.y, half, ent)) ent.x = ent.x + nudge;
        }
      }
      ent.c = Math.floor(ent.x / TILE);
      ent.r = Math.floor(ent.y / TILE);
    }

    // ---------- 泡泡 ----------
    placeBubble(p) {
      if (!p.alive) return;
      const mine = this.bubbles.filter(b => b.owner === p && !b.exploded);
      const flying = this.thrown.filter(t => t.owner === p);
      // 遥控雷管：已有雷则手动引爆，否则放 1 颗“不自动爆炸”的雷
      if (p.passive === "remote") {
        if (mine.length > 0) { mine[mine.length - 1].timer = 0; this.events.push("place"); return; }
      } else if (mine.length + flying.length >= p.maxBubbles) return;

      // 铁皮：投掷炸弹 —— 向前最多飞 3 格；遇墙/砖或他人炸弹停下；遇自身炸弹则继续飞
      if (p.passive === "throwbomb") {
        const [dx, dy] = p.faceDir;
        let tc = p.c, tr = p.r;
        for (let s = 1; s <= 3; s++) {
          const nc = p.c + dx * s, nr = p.r + dy * s;
          if (!this.inMap(nc, nr)) break;
          const t = this.grid[nr][nc];
          if (t === T.WALL || t === T.BRICK) break;                 // 障碍：停在上一格
          if (t === T.BUBBLE) {
            const ob = this.bubbles.find(x => x.c === nc && x.r === nr && !x.exploded);
            if (ob && ob.owner === p) { tc = nc; tr = nr; continue; } // 自身炸弹：越过继续飞
            break;                                                    // 他人炸弹：停在上一格
          }
          tc = nc; tr = nr;
        }
        const power = p.power + (p.passive === "powerplus" ? 2 : 0);
        this.thrown.push({
          owner: p, c: tc, r: tr,
          x: (p.c + .5) * TILE, y: (p.r + .5) * TILE,
          tx: (tc + .5) * TILE, ty: (tr + .5) * TILE,
          t: 0, dur: 0.3, power, color: p.bombColor,
        });
        if (p.passive === "turbo") p.boostT = 1.0;
        if (p.passive === "cloak") p.cloakT = 1.5;
        this.events.push("place");
        return;
      }

      const tc = p.c, tr = p.r;
      if (this.grid[tr][tc] === T.BUBBLE) return;
      this.grid[tr][tc] = T.BUBBLE;
      // 引信统一（遥控雷管除外）：普通炸弹一律 BUBBLE_FUSE，消除“有时快有时慢”
      const power = p.power + (p.passive === "powerplus" ? 2 : 0);
      let fuse = BUBBLE_FUSE;
      if (p.passive === "remote") fuse = p.isHuman ? 999 : 5;
      this.bubbles.push({ c: tc, r: tr, owner: p, timer: fuse, power, anim: 0, color: p.bombColor, hunter: p.passive === "hunter", remote: p.passive === "remote", pierce: p.passive === "pierce" });
      p.passBubble = key(tc, tr);
      if (p.passive === "turbo") p.boostT = 1.0;
      if (p.passive === "cloak") p.cloakT = 1.5;
      this.events.push("place");
    }
    // 手动引爆：双击炸弹键时，立刻引爆自己场上所有炸弹（遥控雷管同样适用）
    detonateBombs(owner) {
      if (!owner || !owner.alive) return 0;
      let n = 0;
      for (const b of this.bubbles) {
        if (b.exploded || b.owner !== owner) continue;
        if (b.timer > 0.05) b.timer = 0.05;   // 留一帧极短引信，爆炸动画更自然
        n++;
      }
      if (n > 0) {
        this.events.push("detonate");
        this.popText(owner.x, owner.y - 24, "手动引爆!", "#ffd76e");
      }
      return n;
    }

    // 铁皮投掷炸弹落地：落点为空则生成炸弹；落点已有自家炸弹（与障碍前炸弹重合）则不重复生成
    landThrown(t) {
      const c = t.c, r = t.r;
      if (!this.inMap(c, r) || this.grid[r][c] !== T.EMPTY) return;
      this.grid[r][c] = T.BUBBLE;
      this.bubbles.push({ c, r, owner: t.owner, timer: BUBBLE_FUSE, power: t.power, anim: 0, color: t.color, hunter: t.owner.passive === "hunter", remote: false, pierce: t.owner.passive === "pierce" });
      t.owner.passBubble = key(c, r);
    }
    blastCells(b) {
      // 【纯查询】只计算火焰覆盖格，绝不修改任何炸弹的引信！
      // 历史教训：旧版本在这里“顺手”把火焰线上同主人的炸弹引信砍到 0.05 秒，
      // 而 computeDanger() 每帧都会调用本函数 → 只要第二颗弹放在第一颗的火焰线上，
      // 下一帧就被暗中引爆（表现为“放弹太快会提前爆炸”）。连锁引爆只允许
      // 发生在 explodeBubble()（真实爆炸）里，见下。
      const cells = [];
      const seen = new Set();
      const add = (c, r) => { const k = c + "," + r; if (!seen.has(k)) { seen.add(k); cells.push({ c, r }); } };
      add(b.c, b.r);
      // 声波折射：火焰撞到障碍后，剩余威力会沿拐角折射（死路不折射）。整颗炸弹最多只拐一次。
      const corner = !!(b.owner && b.owner.passive === "corner");
      const pierce = !!b.pierce;          // 惊破天：每方向多穿 1 层砖
      let refracted = false;              // 只允许拐一次
      for (const [dx, dy] of D4) {
        let stopDist = 0; // 直射线最后一个被包含格到中心的距离
        let pierced = 0;  // 本方向已穿透的砖层数
        for (let i = 1; i <= b.power; i++) {
          const c = b.c + dx * i, r = b.r + dy * i;
          if (!this.inMap(c, r)) break;
          const t = this.grid[r][c];
          if (t === T.WALL) { stopDist = i - 1; break; }
          if (t === T.BUBBLE) { add(c, r); stopDist = i; break; }
          if (t === T.BRICK) {
            add(c, r);
            if (pierce && pierced === 0) { pierced = 1; continue; } // 穿甲：多破 1 格后继续
            stopDist = i; break;
          }
          add(c, r); stopDist = i;
        }
        if (!corner || stopDist <= 0 || refracted) continue;
        refracted = true;                 // 本炸弹已拐弯，后续方向不再折射
        // 障碍前的最后一个可通行格作为折射原点，向两个垂直方向折射
        const remaining = b.power - stopDist;            // 被障碍“浪费”的直行威力
        const len = Math.max(1, Math.floor(remaining / 4)); // 折射段长度 = 剩余威力 ÷ 4（至少 1 格）
        const oc = b.c + dx * stopDist, or = b.r + dy * stopDist;
        // 只向一侧拐一次：挑第一个不是墙的垂直方向，拐完即止
        for (const [px, py] of [[-dy, dx], [dy, -dx]]) {  // 与 (dx,dy) 垂直的两个方向
          const fc = oc + px, fr = or + py;               // 折射的第一格
          if (!this.inMap(fc, fr) || this.grid[fr][fc] === T.WALL) continue; // 死路（第一格就是墙）不拐
          for (let j = 1; j <= len; j++) {
            const cc = oc + px * j, cr = or + py * j;
            if (!this.inMap(cc, cr)) break;
            const tt = this.grid[cr][cc];
            if (tt === T.WALL) break;
            if (tt === T.BUBBLE) { add(cc, cr); break; }
            if (tt === T.BRICK) { add(cc, cr); break; }
            add(cc, cr);
          }
          break; // 只拐一次（另一侧不再折射）
        }
      }
      return cells;
    }
    explodeBubble(b) {
      if (b.exploded) return;
      b.exploded = true;
      this.grid[b.r][b.c] = T.EMPTY;
      if (b.owner && b.owner.passBubble === key(b.c, b.r)) b.owner.passBubble = null;
      const cells = this.blastCells(b);
      // 同主人连锁引爆：只有【真实爆炸】的火焰盖到的自家炸弹才缩短引信
      // （查询函数 blastCells/computeDanger 绝不改引信，否则放弹快会被暗中提前引爆）
      for (const { c, r } of cells) {
        const ob = this.bubbles.find(x => x.c === c && x.r === r && !x.exploded && x.owner === b.owner);
        if (ob) ob.timer = Math.min(ob.timer, 0.05);
      }
      this.explosions.push({ cells, timer: EXPLODE_TIME, max: EXPLODE_TIME, owner: b.owner, color: b.color || "#ffb347" });
      this.events.push("pop");
      this.shakeT = 0.16;
    }

    // ---------- 危险格（供AI逃跑） ----------
    computeDanger() {
      const s = new Set();
      for (const b of this.bubbles) {
        if (b.exploded) continue;
        for (const { c, r } of this.blastCells(b)) s.add(key(c, r));
      }
      // 正在燃烧的火焰：踩上去当场死，必须视为“不可踏入”（区别于未爆炸弹的火焰，那种还能穿过去逃）
      const burn = new Set();
      for (const ex of this.explosions) for (const { c, r } of ex.cells) burn.add(key(c, r));
      this.burnSet = burn;
      for (const k of burn) s.add(k);
      return s;
    }

    // ---------- AI ----------
    // owner 传入时：允许把“owner 自己刚放下 1 秒内的炸弹格”当过路格（与 solidAt 的
    // 防卡死规则完全一致；终点判定仍要求离开火焰，所以不会主动站在弹上）
    passableMove(c, r, owner) {
      if (!this.inMap(c, r)) return false;
      const t = this.grid[r][c];
      if (t === T.EMPTY) return true;
      if (t === T.BUBBLE && owner) {
        const ob = this.bombAt(c, r);
        if (ob && ob.owner === owner && ob.anim < PASS_WINDOW) return true;
      }
      return false;
    }
    bfsStep(sc, sr, goalFn, avoid) {
      const start = key(sc, sr);
      const q = [[sc, sr]]; let head = 0; const prev = {}; const seen = new Set([start]);
      let goalK = null;
      while (head < q.length) {
        const [c, r] = q[head++];
        if (!(c === sc && r === sr) && goalFn(c, r)) { goalK = key(c, r); break; }
        for (const [dx, dy] of D4) {
          const nc = c + dx, nr = r + dy, k = key(nc, nr);
          if (seen.has(k)) continue;
          if (!this.passableMove(nc, nr)) continue;
          if (avoid && avoid.has(k)) continue;
          seen.add(k); prev[k] = key(c, r); q.push([nc, nr]);
        }
      }
      if (!goalK) return null;
      let k = goalK;
      while (prev[k] && prev[k] !== start) k = prev[k];
      const [tc, tr] = k.split(",").map(Number);
      return [tc - sc, tr - sr];
    }
    hasBomb(p) { return this.bubbles.filter(b => b.owner === p && !b.exploded).length < p.maxBubbles; }
    alignedClear(p, q) {
      if (p.c === q.c) { const d = q.r - p.r; if (Math.abs(d) > p.power) return false; const s = Math.sign(d); for (let i = 1; i < Math.abs(d); i++) if (this.grid[p.r + s * i][p.c] !== T.EMPTY) return false; return true; }
      if (p.r === q.r) { const d = q.c - p.c; if (Math.abs(d) > p.power) return false; const s = Math.sign(d); for (let i = 1; i < Math.abs(d); i++) if (this.grid[p.r][p.c + s * i] !== T.EMPTY) return false; return true; }
      return false;
    }
    safeEscape(p, extraBlast, margin) {
      // dangerSet = 其它炸弹的火焰：必须避开（不可穿行、也不可停留）
      const danger = this.dangerSet;
      // 自身即将放置的炸弹火焰：尚未引爆，可临时穿行，但终点必须落在火焰之外
      const ownBlast = new Set();
      if (extraBlast) for (const { c, r } of this.blastCells({ c: p.c, r: p.r, power: p.power })) ownBlast.add(key(c, r));
      // 引信时间内靠移动可逃出的格数预算（避免误判远处为安全）；margin 为保守余量
      const budget = Math.max(2, Math.floor(BUBBLE_FUSE * SPEED_BASE / TILE) - (margin || 0));
      const start = key(p.c, p.r);
      const q = [[p.c, p.r, 0]]; let h = 0; const seen = new Set([start]);
      while (h < q.length) {
        const [c, r, d] = q[h++];
        if (d > 0 && !ownBlast.has(key(c, r)) && !danger.has(key(c, r))) return true;
        if (d >= budget) continue;
        for (const [dx, dy] of D4) {
          const nc = c + dx, nr = r + dy, k = key(nc, nr);
          if (seen.has(k)) continue;
          if (!this.passableMove(nc, nr, p)) continue;
          if (danger.has(k)) continue; // 其它炸弹火焰不可穿行
          seen.add(k); q.push([nc, nr, d + 1]);
        }
      }
      return false;
    }
    // 逃离危险格：返回朝最近“安全格”的第一步。
    // 关键：放完弹后 AI 本身就站在自己的火焰里，唯一出路就是“穿过火焰跑出去”，
    // 所以寻路时必须【允许穿越火焰格】（只要求终点在火焰之外），否则会永远找不到路 → 站着被自己炸死。
    fleeStep(p, maxBudget) {
      const danger = this.dangerSet;
      const start = key(p.c, p.r);
      // 还能走几格：由覆盖自身的炸弹中最短的剩余引信决定（赶在爆炸前离开）
      let minT = Infinity;
      for (const b of this.bubbles) {
        if (b.exploded) continue;
        if (this.blastCells(b).some(({ c, r }) => c === p.c && r === p.r)) minT = Math.min(minT, b.timer);
      }
      if (minT === Infinity) minT = BUBBLE_FUSE;
      const fuseBudget = Math.max(1, Math.floor(minT * SPEED_BASE / TILE));
      const budget = Math.min(maxBudget, fuseBudget);
      const q = [[p.c, p.r, 0]]; const prev = {}; const seen = new Set([start]);
      const burn = this.burnSet || new Set();
      let h = 0, goalK = null;
      while (h < q.length) {
        const [c, r, d] = q[h++];
        if (d > 0 && !danger.has(key(c, r))) { goalK = key(c, r); break; }
        if (d >= budget) continue;
        for (const [dx, dy] of D4) {
          const nc = c + dx, nr = r + dy, k = key(nc, nr);
          if (seen.has(k)) continue;
          if (burn.has(k)) continue;                                   // 正在燃烧：绝不能踏进去
          if (!this.passableMove(nc, nr, p)) continue;
          seen.add(k); prev[k] = key(c, r); q.push([nc, nr, d + 1]);   // 未爆炸弹的火焰可以穿过
        }
      }
      if (!goalK) return null;
      let k = goalK;
      while (prev[k] && prev[k] !== start) k = prev[k];
      const [tc, tr] = k.split(",").map(Number);
      return [tc - p.c, tr - p.r];
    }
    // 假想在脚下放一颗炸弹时，连同“会被连锁引爆的自家炸弹”一起算出的总火焰格
    unionBlast(p) {
      const set = new Set();
      const add = (cells) => { for (const { c, r } of cells) set.add(key(c, r)); };
      add(this.blastCells({ c: p.c, r: p.r, power: p.power, owner: p }));
      for (let pass = 0; pass < 3; pass++) {
        let grew = false;
        for (const b of this.bubbles) {
          if (b.exploded || b.owner !== p) continue;
          const cells = this.blastCells(b);
          if (!set.has(key(b.c, b.r)) && !cells.some(({ c, r }) => set.has(key(c, r)))) continue;
          const before = set.size; add(cells);
          if (set.size > before) grew = true;
        }
        if (!grew) break;
      }
      return set;
    }
    // 从当前位置出发（允许穿过火焰），能否在引信结束前跑到“总火焰之外”的安全格
    escapeFrom(p, blastSet, margin) {
      const danger = this.dangerSet;
      // 预算按“自家炸弹里最短的剩余引信”算：快炸的那颗才是真正的死线
      let minT = BUBBLE_FUSE;
      for (const b of this.bubbles) if (!b.exploded && b.owner === p) minT = Math.min(minT, b.timer);
      const budget = Math.max(1, Math.floor(minT * SPEED_BASE / TILE) - (margin || 0));
      const q = [[p.c, p.r, 0]]; const seen = new Set([key(p.c, p.r)]);
      const burn = this.burnSet || new Set();
      let h = 0;
      while (h < q.length) {
        const [c, r, d] = q[h++];
        const k = key(c, r);
        if (d > 0 && !blastSet.has(k) && !danger.has(k)) return true;
        if (d >= budget) continue;
        for (const [dx, dy] of D4) {
          const nc = c + dx, nr = r + dy, kk = key(nc, nr);
          if (seen.has(kk) || burn.has(kk) || !this.passableMove(nc, nr, p)) continue;
          seen.add(kk); q.push([nc, nr, d + 1]);
        }
      }
      return false;
    }
    aiDecide(p) {
      const hard = (p.diff || this.difficulty) === "hard";
      if (p.bombCd > 0) p.bombCd--;
      const myK = key(p.c, p.r);

      // 1) 站在危险格上：立刻撤离（困难 AI 逃得更远、更果断）
      if (this.dangerSet.has(myK)) {
        const step = this.fleeStep(p, hard ? 14 : 9);
        if (step) return { dx: step[0], dy: step[1], bomb: false };
        return { dx: 0, dy: 0, bomb: false };
      }

      // 2) 困难 AI：目标已踩进自己炸弹的火焰 → 提前引爆（遥控雷管则按键引爆）
      if (hard) {
        const mine = this.bubbles.filter(b => b.owner === p && !b.exploded);
        if (mine.length) {
          // 只引爆“不会把自己也卷进去”的那几颗（否则等于自杀）
          const safe = [], risky = [];
          for (const b of mine) {
            const cells = this.blastCells(b);
            const selfIn = cells.some(({ c, r }) => c === p.c && r === p.r);
            let hit = false;
            if (this.pvp) hit = this.players.some(q => q.alive && q !== p && cells.some(({ c, r }) => c === q.c && r === q.r));
            else hit = this.monsters.some(m => !m.dead && cells.some(({ c, r }) => c === m.c && r === m.r))
                    || (this.boss && !this.boss.dead && cells.some(({ c, r }) => c === this.boss.c && r === this.boss.r));
            if (!hit) continue;
            (selfIn ? risky : safe).push(b);
          }
          if (safe.length) {
            // 引爆会连锁引爆其它自家炸弹，若合起来的火焰会卷到自己就绝对不引爆
            if (mine.some(b => this.blastCells(b).some(({ c, r }) => c === p.c && r === p.r))) {
              const st = this.fleeStep(p, 12);
              if (st) return { dx: st[0], dy: st[1], bomb: false };
            }
            // 只在“目标躲不掉”或“已经贴脸”时才引爆，否则白白浪费一颗弹
            const worth = safe.some(b => {
              const tgtCell = this.players.find(q => q.alive && q !== p && this.blastCells(b).some(({ c, r }) => c === q.c && r === q.r));
              if (!tgtCell) return false;
              const adj = Math.abs(tgtCell.c - b.c) + Math.abs(tgtCell.r - b.r) <= 1;
              return adj || tgtCell.lives <= 1 || !this.safeEscape(tgtCell, false);
            });
            if (worth) {
              if (p.passive === "remote") return { dx: 0, dy: 0, bomb: true };
              for (const b of safe) b.timer = Math.min(b.timer, 0.05);
              this.events.push("detonate");
              this.popText(p.x, p.y - 24, "手动引爆!", "#ffd76e");
              return { dx: 0, dy: 0, bomb: false };
            }
          }
          // 目标踩在自己炸弹上、但自己也在火焰里：先撤出去再说
          if (risky.length && this.dangerSet.has(myK)) {
            const step = this.fleeStep(p, 12);
            if (step) return { dx: step[0], dy: step[1], bomb: false };
          }
        }
      }

      // 3) 选目标：PVE 优先野怪/BOSS，PVP 优先最近敌人，其次地面道具
      let goal = null, bd = 1e9;
      if (!this.pvp) {
        for (const m of this.monsters) {
          if (m.dead) continue;
          const d = manh(p, m); if (d < bd) { bd = d; goal = { c: m.c, r: m.r, obj: m, monster: true }; }
        }
        if (this.boss && !this.boss.dead && this.boss.awake) {
          const d = manh(p, this.boss); if (d < bd) { bd = d; goal = { c: this.boss.c, r: this.boss.r, obj: this.boss, boss: true }; }
        }
        // 附近没有野怪、BOSS 还在休眠：向巢穴入口推进（一起走完迷宫去打 BOSS）
        if ((!goal || bd > 10) && this.boss && !this.boss.dead && !this.boss.awake && this.lair) {
          goal = { c: this.lair.entryC, r: this.lair.entryR };
        }
      }
      if (!goal) {
        for (const q of this.players) {
          if (!q.alive || q === p) continue;
          const d = manh(p, q); if (d < bd) { bd = d; goal = { c: q.c, r: q.r, obj: q }; }
        }
      }
      if (!goal) {
        for (const k in this.items) {
          const [c, r] = k.split(",").map(Number);
          const d = Math.abs(c - p.c) + Math.abs(r - p.r);
          if (d < bd) { bd = d; goal = { c, r }; }
        }
      }

      // 3.5) 困难 AI 的“走位卡线”：目标不在火力范围内时，主动绕到与它同行/同列的位置再开火
      if (hard && goal && goal.obj) {
        const hyp = this.blastCells({ c: p.c, r: p.r, power: p.power, owner: p });
        const aimed = hyp.some(({ c, r }) => c === goal.obj.c && r === goal.obj.r);
        if (!aimed && manh(p, goal.obj) > 2) {
          let bestCell = null, bestD = 1e9;
          for (const [dx, dy] of D4) for (let i = 1; i <= Math.max(2, p.power); i++) {
            const nc = goal.obj.c + dx * i, nr = goal.obj.r + dy * i;
            if (!this.passableMove(nc, nr)) continue;
            if (this.dangerSet.has(key(nc, nr))) continue;
            const d = Math.abs(nc - p.c) + Math.abs(nr - p.r);
            if (d < bestD) { bestD = d; bestCell = [nc, nr]; }
          }
          if (bestCell) goal = { c: bestCell[0], r: bestCell[1], obj: goal.obj };
        }
      }

      // 4) 是否放弹
      let bomb = false;
      const mineCount = this.bubbles.filter(b => b.owner === p && !b.exploded).length;
      if (this.hasBomb(p) && p.bombCd <= 0 && goal) {
        // 简单 AI 更保守：留 1 格逃生余量、场上已有自己的弹时不再补第二颗（避免自爆）
        // 逃生判定会把“连锁引爆自家炸弹”的火焰一起算进去；简单档再留 1 格余量
        const escapeOk = this.escapeFrom(p, this.unionBlast(p), 1)
                       && (hard ? mineCount < 2 : mineCount === 0);
        if (escapeOk) {
          // 用“假想炸弹”的真实覆盖范围判断值不值得放，而不是拍脑袋的距离阈值
          const cells = this.blastCells({ c: p.c, r: p.r, power: p.power, owner: p });
          const tgt = goal.obj;
          if (tgt) {
            const inBlast = cells.some(({ c, r }) => c === tgt.c && r === tgt.r);
            const near = manh(p, tgt) <= 2;                                      // 贴身缠斗
            const lineUp = (p.c === tgt.c || p.r === tgt.r) && manh(p, tgt) <= p.power + 3;
            if (inBlast) bomb = true;
            else if (near) bomb = true;
            else if ((p.passive === "throwbomb" || p.passive === "pierce") && lineUp) bomb = true;   // 投掷/穿甲可远程
            else if (hard && lineUp && manh(p, tgt) <= p.power + 2) bomb = true;                     // 困难：同线压制
          }
          // 炸砖开路：朝目标方向的下一格是砖块
          if (!bomb) {
            const step = this.bfsStep(p.c, p.r, (c, r) => Math.abs(c - goal.c) + Math.abs(r - goal.r) <= 1, this.dangerSet);
            if (step) {
              const nc = p.c + step[0], nr = p.r + step[1];
              if (this.grid[nr] && this.grid[nr][nc] === T.BRICK) bomb = true;
            }
            if (!bomb) {
              const nearBrick = D4.some(([a, b]) => this.grid[p.r + b] && this.grid[p.r + b][p.c + a] === T.BRICK);
              if (nearBrick) bomb = true;
            }
          }
        }
      }
      if (bomb) p.bombCd = hard ? 40 : (this.pvp ? 55 : 34);

      // 5) 移动：朝目标寻路（避开危险格），无路可走则随机游走
      let dx = 0, dy = 0;
      if (goal) {
        const goalFn = (c, r) => (c === goal.c && r === goal.r) || Math.abs(c - goal.c) + Math.abs(r - goal.r) <= 1;
        // 始终绕开火焰格寻路；走不通就原地等（绝不“硬闯火焰”把自己送掉）
        const step = this.bfsStep(p.c, p.r, goalFn, this.dangerSet);
        if (step) { dx = step[0]; dy = step[1]; }
      }
      if (!dx && !dy) {
        p.aiTimer -= 1 / 60;
        if (p.aiTimer <= 0) {
          const opts = D4.filter(([a, b]) => this.passableMove(p.c + a, p.r + b) && !this.dangerSet.has(key(p.c + a, p.r + b)));
          p.aiDir = opts.length ? opts[ri(opts.length)] : [0, 0];
          p.aiTimer = rnd(0.3, 0.9);
        }
        dx = p.aiDir[0]; dy = p.aiDir[1];
      }
      return { dx, dy, bomb };
    }

    // ---------- 野怪（所有模式都有；被击杀会掉落道具，含稀有道具） ----------
    spawnMonsters() {
      const area = this.cols * this.rows;
      // 数量随地图大小与难度增长：19×19 竞技图少量点缀，大迷宫则成群
      let n = clamp(Math.round(area / 95), 3, 20);
      if (this.mode === "campaign") n += 3;
      if (this.difficulty === "hard") n += 2;
      n = Math.min(n, 24);
      const minDist = this.deathmatch ? 5 : 8;
      const spots = [];
      for (let r = 1; r < this.rows - 1; r++) for (let c = 1; c < this.cols - 1; c++) {
        if (this.grid[r][c] !== T.EMPTY) continue;
        if (this.players.some(p => Math.abs(p.c - c) + Math.abs(p.r - r) < minDist)) continue;
        // 巢穴留给 BOSS，不刷野怪
        if (this.lair && c >= this.lair.c0 && c <= this.lair.c1 && r >= this.lair.r0 && r <= this.lair.r1) continue;
        spots.push([c, r]);
      }
      for (let i = 0; i < n && spots.length; i++) {
        const idx = ri(spots.length);
        const [c, r] = spots.splice(idx, 1)[0];
        // 种类：游荡者 / 追猎者（视野远）/ 炸弹虫（会自己放炸弹）/ 精英（必掉稀有）
        const roll = Math.random();
        let kind = "walker";
        if (roll > 0.90) kind = "elite";
        else if (roll > 0.66) kind = "bomber";
        else if (roll > 0.36) kind = "chaser";
        const speed = kind === "chaser" ? 118 : (kind === "elite" ? 96 : (kind === "bomber" ? 72 : 84));
        this.monsters.push({
          c, r, x: (c + .5) * TILE, y: (r + .5) * TILE,
          dir: D4[ri(4)], speed: speed + this.level * 2, smart: kind === "chaser" || kind === "elite",
          kind, animT: rnd(0, 6), wiggle: 0, retarget: 0,
          bombCd: kind === "bomber" ? rnd(1.5, 3.5) : 0, power: 1,
        });
      }
    }
    // 野怪掉落：普通道具为主，精英必掉稀有，其余约 30% 概率出稀有
    monsterDrop(m, x, y) {
      const elite = m.kind === "elite";
      const chance = elite ? 1 : (m.kind === "chaser" ? 0.6 : 0.45);
      if (!elite && Math.random() > chance) return;
      const rare = elite || Math.random() < 0.3;
      const type = rare ? RARE_POOL[ri(RARE_POOL.length)] : ITEM_POOL[ri(ITEM_POOL.length)];
      // 掉在原地（若被占则飞向附近空格），带一个短飞行动画
      let tc = m.c, tr = m.r;
      if (this.grid[tr][tc] !== T.EMPTY || this.items[key(tc, tr)]) {
        const near = [];
        for (let d = 1; d <= 4 && !near.length; d++)
          for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
            const nc = m.c + dc, nr = m.r + dr;
            if (this.inMap(nc, nr) && this.grid[nr][nc] === T.EMPTY && !this.items[key(nc, nr)]) near.push([nc, nr]);
          }
        if (!near.length) return;
        const [nc, nr] = near[ri(near.length)]; tc = nc; tr = nr;
      }
      this.flyingItems.push({
        type, c: tc, r: tr, t: 0, dur: 0.45,
        sx: x, sy: y, tx: (tc + .5) * TILE, ty: (tr + .5) * TILE,
      });
      if (rare) this.events.push("rareDrop");
    }
    killMonster(m, x, y) {
      if (m.dead) return;
      m.dead = true;
      this.burst(x, y, "#ff8aa8", 14);
      this.monsterDrop(m, x, y);
    }
    updateMonsters(dt) {
      for (const m of this.monsters) {
        if (m.dead) continue;
        m.animT += dt;
        // 选最近存活玩家
        let target = null, bd = 1e9;
        for (const p of this.players) {
          if (!p.alive) continue;
          const d = manh(m, p);
          if (d < bd) { bd = d; target = p; }
        }
        let dx = 0, dy = 0;
        const aggroR = m.smart ? 999 : 9;
        if (target && bd <= aggroR) {
          m.retarget -= dt;
          if (m.retarget <= 0 || !m.step) {
            m.step = this.bfsStep(m.c, m.r, (c, r) => c === target.c && r === target.r, null);
            m.retarget = 0.25;
          }
          if (m.step) { dx = m.step[0]; dy = m.step[1]; }
        } else {
          m.retarget -= dt;
          if (m.retarget <= 0) { m.dir = D4[ri(4)]; m.retarget = rnd(0.4, 1.1); }
          dx = m.dir[0]; dy = m.dir[1];
        }
        if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
        const before = [m.c, m.r];
        this.moveEntity(m, dx * m.speed * dt, dy * m.speed * dt, 12);
        if (m.c === before[0] && m.r === before[1] && (dx || dy)) m.dir = D4[ri(4)]; // 撞墙就换方向
        // 炸弹虫：定期在自己脚下丢一颗短引信炸弹（会误伤玩家，也会炸到自己）
        if (m.kind === "bomber") {
          m.bombCd -= dt;
          if (m.bombCd <= 0) {
            m.bombCd = rnd(2.6, 4.2);
            if (this.grid[m.r][m.c] === T.EMPTY) {
              this.grid[m.r][m.c] = T.BUBBLE;
              this.bubbles.push({
                c: m.c, r: m.r, owner: m, timer: BUBBLE_FUSE * 0.9, power: 1, anim: 0,
                color: "#ff4fa0", hunter: false, remote: false, pierce: false,
              });
              this.events.push("place");
            }
          }
        }
        // 接触伤害
        for (const p of this.players) {
          if (!p.alive || p.inv > 0) continue;
          if (p.c === m.c && p.r === m.r) {
            if (p.passive === "monsterImmune") continue;
            if (!this.absorbHit(p)) this.killPlayer(p, null);
          }
        }
      }
      this.monsters = this.monsters.filter(m => !m.dead);
    }

    // ---------- BOSS（冒险迷宫终点，平时休眠，玩家进入领地后激活） ----------
    setupBoss() {
      const L = this.lair;
      const bc = Math.round((L.c0 + L.c1) / 2), br = Math.round((L.r0 + L.r1) / 2);
      const hp = 10 + this.level * 4 + (this.difficulty === "hard" ? 4 : 0);
      this.boss = {
        c: bc, r: br, x: (bc + .5) * TILE, y: (br + .5) * TILE,
        hp, maxHp: hp, awake: false, dead: false, animT: 0,
        atkCd: 1.8, hitCd: 0, speed: 96, power: 3,
        lastHit: null, wakeT: 0, dir: [0, 0], retarget: 0, step: null,
      };
    }
    updateBoss(dt) {
      const b = this.boss;
      if (!b || b.dead) return;
      b.animT += dt;
      if (b.hitCd > 0) b.hitCd -= dt;
      // 最近存活玩家
      let target = null, bd = 1e9;
      for (const p of this.players) {
        if (!p.alive) continue;
        const d = manh(b, p);
        if (d < bd) { bd = d; target = p; }
      }
      const L = this.lair;
      const inLair = !!target && target.c >= L.c0 && target.c <= L.c1 && target.r >= L.r0 && target.r <= L.r1;
      if (!b.awake) {
        // 平时休眠：玩家踏进巢穴（或逼近到 5 格内）才苏醒
        if (inLair || (target && bd <= 5)) {
          b.awake = true;
          this.events.push("bossWake");
          this.popText(b.x, b.y - 30, "BOSS 苏醒!", "#ff4fa0");
          this.burst(b.x, b.y, "#ff4fa0", 26);
          this.shakeT = Math.max(this.shakeT, 0.4);
        }
        return;
      }
      b.wakeT += dt;
      // 追踪玩家（BFS 寻路，定期重算）
      let dx = 0, dy = 0;
      if (target) {
        b.retarget -= dt;
        if (b.retarget <= 0 || !b.step) {
          b.step = this.bfsStep(b.c, b.r, (c, r) => Math.abs(c - target.c) + Math.abs(r - target.r) <= 1, null);
          b.retarget = 0.3;
        }
        if (b.step) { dx = b.step[0]; dy = b.step[1]; }
      }
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      this.moveEntity(b, dx * b.speed * dt, dy * b.speed * dt, 14);
      // 攻击：定期在脚下投放高威力炸弹
      b.atkCd -= dt;
      if (b.atkCd <= 0) {
        b.atkCd = this.difficulty === "hard" ? 1.6 : 2.4;
        if (this.grid[b.r][b.c] === T.EMPTY) {
          this.grid[b.r][b.c] = T.BUBBLE;
          this.bubbles.push({
            c: b.c, r: b.r, owner: b, timer: BUBBLE_FUSE * 0.85, power: b.power, anim: 0,
            color: "#ff4fa0", hunter: false, remote: false, pierce: false,
          });
          this.events.push("place");
        }
      }
      // 接触伤害
      for (const p of this.players) {
        if (!p.alive || p.inv > 0) continue;
        if (p.c === b.c && p.r === b.r) {
          if (!this.absorbHit(p)) this.killPlayer(p, null);
        }
      }
    }
    damageBoss(byPlayer) {
      const b = this.boss;
      if (!b || b.dead || b.hitCd > 0) return;
      b.hp--; b.hitCd = 0.35;
      if (byPlayer) b.lastHit = byPlayer;
      this.burst(b.x, b.y, "#ffd76e", 10);
      this.popText(b.x, b.y - 26, "BOSS -1", "#ffd76e");
      this.events.push("bossHit");
      if (b.hp <= 0) {
        b.dead = true;
        this.burst(b.x, b.y, "#ff4fa0", 34);
        this.shakeT = Math.max(this.shakeT, 0.5);
        this.events.push("bossDie");
      }
    }

    // ---------- 更新（推进一帧） ----------
    // inputs: { [playerId]: { left, right, up, down, bomb } }
    step(dt, inputs) {
      this.events = [];
      if (this.shakeT > 0) this.shakeT -= dt;
      this.dangerSet = this.computeDanger();

      // 计时（仅用于显示经过时间）
      this.matchTime += dt;

      // 每 30 秒从屏幕外空投一批道具（落地即可拾取）
      this.itemDropTimer += dt;
      if (this.itemDropTimer >= AIRDROP_INTERVAL) { this.itemDropTimer = 0; this.spawnAirdrop(); }

      for (const p of this.players) {
        if (!p.alive) continue;
        if (p.inv > 0) p.inv -= dt;
        if (p.boostT > 0) p.boostT -= dt;
        if (p.cloakT > 0) p.cloakT -= dt;
        let dx = 0, dy = 0, bomb = false;
        if (p.isHuman) {
          const inp = (inputs && inputs[p.id]) || { left: false, right: false, up: false, down: false, bomb: false };
          if (inp.left) dx = -1; else if (inp.right) dx = 1;
          if (inp.up) dy = -1; else if (inp.down) dy = 1;
          const held = this.bombHeld[p.id];
          if (inp.bomb && !held) bomb = true;
          this.bombHeld[p.id] = !!inp.bomb;
        } else {
          const d = this.aiDecide(p); dx = d.dx; dy = d.dy; bomb = d.bomb;
        }
        if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
        // 记录“面向”用于投掷炸弹
        if (dx || dy) {
          if (Math.abs(dx) >= Math.abs(dy)) p.faceDir = [Math.sign(dx) || p.faceDir[0], 0];
          else p.faceDir = [0, Math.sign(dy) || p.faceDir[1]];
        }
        p.moving = !!(dx || dy);
        if (p.moving) {
          p.walkT += dt * 10;
          p.face = dx > 0 ? 1 : (dx < 0 ? -1 : p.face);
          const spd = SPEED_BASE * p.speedMul * (p.boostT > 0 ? 1.35 : 1);
          this.moveEntity(p, dx * spd * dt, dy * spd * dt, 12);
        } else p.walkT = 0;
        if (p.passBubble) {
          const [bc, br] = p.passBubble.split(",").map(Number);
          const half = 12, bx0 = bc * TILE, by0 = br * TILE;
          const overlap = p.x + half > bx0 && p.x - half < bx0 + TILE && p.y + half > by0 && p.y - half < by0 + TILE;
          if (!overlap) p.passBubble = null;
        }
        if (bomb) this.placeBubble(p);
        // 震荡波：护盾被打掉后，每 10 秒自动充能一层（已有护盾时不叠加，计时归零）
        if (p.passive === "tank") {
          if (p.shield) p.shieldT = 0;
          else {
            p.shieldT += dt;
            if (p.shieldT >= SHIELD_CD) {
              p.shield = true; p.shieldT = 0;
              this.burst(p.x, p.y, "#9aa0ad", 12);
              this.popText(p.x, p.y - 18, "护盾充能!", "#9aa0ad");
              this.events.push("shield");
            }
          }
        }
        // 拾取地面道具（炸开后才出现）
        const it = this.items[key(p.c, p.r)];
        if (it) {
          delete this.items[key(p.c, p.r)]; this.events.push("item");
          if (it === "bubble") {
            if (p.passive === "remote") { p.power = Math.min(12, p.power + 1); p.gained.power++; this.popText(p.x, p.y - 16, "威力+1", "#ff9b6b"); }
            else { p.maxBubbles = Math.min(8, p.maxBubbles + 1); p.gained.bubble++; this.popText(p.x, p.y - 16, "炸弹+1", "#7ec8ff"); }
          }
          if (it === "power") { p.power = Math.min(12, p.power + 1); p.gained.power++; this.popText(p.x, p.y - 16, "威力+1", "#ff9b6b"); }
          if (it === "speed") { p.speedMul = Math.min(2.2, p.speedMul + 0.12); p.gained.speed++; this.popText(p.x, p.y - 16, "速度+", "#a8f56e"); }
          if (it === "life") {
            // 护盾道具（🛡️）：抵挡一次伤害。已有护盾则不叠加 → 转化为 +1 生命，绝不浪费
            if (!p.shield) { p.shield = true; p.shieldT = 0; this.popText(p.x, p.y - 16, "护盾!", "#7ec8ff"); }
            else { p.lives = Math.min(9, p.lives + 1); p.gained.life++; this.popText(p.x, p.y - 16, "护盾已满·生命+1", "#ff7ea8"); }
            p.inv = Math.max(p.inv, 1.2);
          }
          // 稀有道具
          if (it === "super") { p.maxBubbles = Math.min(8, p.maxBubbles + 1); p.power = Math.min(12, p.power + 1); p.gained.bubble++; p.gained.power++; this.popText(p.x, p.y - 16, "稀有·强化!", "#ffcf3e"); }
          if (it === "turbo") { p.speedMul = Math.min(2.2, p.speedMul + 0.24); p.gained.speed += 2; this.popText(p.x, p.y - 16, "稀有·极速!", "#42d6ff"); }
          if (it === "life2") { p.lives = Math.min(9, p.lives + 1); p.gained.life++; this.popText(p.x, p.y - 16, "稀有·额外命!", "#ff4fa0"); p.inv = Math.max(p.inv, 2.5); }
        }
      }

      // 泡泡
      for (const b of this.bubbles) {
        b.anim += dt;
        if (!b.exploded) { b.timer -= dt; if (b.timer <= 0) this.explodeBubble(b); }
      }
      this.bubbles = this.bubbles.filter(b => !b.exploded);

      // 空投道具：从屏幕外飞向目标格，落地后变成可拾取的地面临时道具
      for (const f of this.flyingItems) {
        f.t += dt / f.dur;
        if (f.t >= 1) this.items[key(f.c, f.r)] = f.type;   // 落地：直接变为可拾取道具
      }
      this.flyingItems = this.flyingItems.filter(f => f.t < 1);

      // 铁皮投掷炸弹：飞行推进，到达落点后生成炸弹（落点被自家炸弹占据则重合、不重复生成）
      for (const t of this.thrown) {
        t.t += dt / t.dur;
        if (t.t >= 1) this.landThrown(t);
      }
      this.thrown = this.thrown.filter(t => t.t < 1);

      // 重生倒计时
      this.updateRespawns(dt);

      // 爆炸
      for (const ex of this.explosions) {
        ex.timer -= dt;
        for (const { c, r } of ex.cells) {
          if (this.grid[r][c] === T.BRICK) {
            this.grid[r][c] = T.EMPTY; this.burst((c + .5) * TILE, (r + .5) * TILE, "#ffb35c", 8);
            // 藏在该砖里的道具显形
            const k = key(c, r);
            if (this.brickItems[k]) { this.items[k] = this.brickItems[k]; delete this.brickItems[k]; }
          }
          // PVE（冒险）模式下玩家之间不互相伤害；野怪 / BOSS 的炸弹照样伤人
          const ownerIsPlayer = !!(ex.owner && ex.owner.isPlayer);
          if (this.pvp || !ownerIsPlayer) {
            for (const p of this.players) {
              if (!p.alive || p.inv > 0) continue;
              if (p.c === c && p.r === r) this.killPlayer(p, ex.owner);
            }
          }
        }
        // 机器狗猎杀本能：炸弹对怪物/敌人额外 +1 格范围
        if (ex.owner && ex.owner.hunter) {
          const bc = ex.cells[0].c, br = ex.cells[0].r, pw = (ex.owner.power + (ex.owner.passive === "powerplus" ? 1 : 0)) + 1;
          for (const m of this.monsters) {
            if (m.dead) continue;
            const onCross = (m.c === bc || m.r === br) && Math.abs(m.c - bc) + Math.abs(m.r - br) <= pw;
            if (onCross) this.killMonster(m, m.x, m.y);
          }
        }
        // 普通范围清怪（掉落道具）
        for (const m of this.monsters) {
          if (m.dead) continue;
          if (ex.cells.some(({ c, r }) => c === m.c && r === m.r)) this.killMonster(m, m.x, m.y);
        }
        // BOSS 受击（自己的炸弹不伤自己）
        if (this.boss && !this.boss.dead && ex.owner !== this.boss) {
          if (ex.cells.some(({ c, r }) => c === this.boss.c && r === this.boss.r)) {
            const by = (ex.owner && ex.owner.isPlayer) ? ex.owner : null;
            this.damageBoss(by);
          }
        }
      }
      this.explosions = this.explosions.filter(ex => ex.timer > 0);

      // 野怪 / BOSS
      this.updateMonsters(dt);
      if (this.boss) this.updateBoss(dt);

      // 特效
      for (const pt of this.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 260 * dt; }
      this.particles = this.particles.filter(pt => pt.t < pt.life);
      for (const f of this.floats) f.t += dt;
      this.floats = this.floats.filter(f => f.t < 1);

      // 胜负判定
      if (this.state === "play") {
        if (this.boss) {
          // 冒险（PVE）：击杀 BOSS = 过关；全员出局 = 失败
          if (this.boss.dead) {
            this.state = "win";
            this.winner = this.boss.lastHit || this.players.find(p => !p.out) || null;
            this.events.push("win");
          } else if (this.players.every(p => p.out)) {
            this.state = "win"; this.winner = null; this.events.push("win");
          }
        } else {
          // 对抗（PVP）：场上剩余 ≤ 1 人时结束
          const inGame = this.players.filter(p => !p.out);
          if (inGame.length <= 1) {
            this.state = "win"; this.winner = inGame[0] || null;
            this.events.push("win");
          }
        }
      }
    }

    // 护盾抵挡一次伤害：有盾则消耗并免疫本次伤害，返回 true。
    // 护盾来源只有两种：震荡波的 10 秒自动充能、场上拾取的护盾道具（🛡️）；
    // 两者共用同一层护盾，上限 1 层，不叠加。
    absorbHit(p) {
      if (!p.shield) return false;
      p.shield = false; p.shieldT = 0; p.inv = INVINCIBLE;
      this.burst(p.x, p.y, "#9aa0ad", 16);
      this.popText(p.x, p.y - 18, "护盾抵消!", "#9aa0ad");
      this.events.push("shield");
      return true;
    }
    killPlayer(p, killer) {
      if (!p.alive || p.out) return;
      // 护盾抵消一次伤害（震荡波自动护盾 / 拾取的护盾道具）
      if (this.absorbHit(p)) return;
      // 死亡掉落：除基础属性外的所有道具随机飞散到地图各处（并重置回角色基础属性）
      this.dropOnDeath(p);
      // 还有命：延迟重生（擎天柱原地、其余回出生点），重生后 3 秒无敌
      if (p.lives > 1) {
        p.lives--;
        p.alive = false;
        // 擎天柱（twolives 被动）原地重生；其余回到出生点
        this.respawns.push({ p, timer: RESPAWN_DELAY, atSpawn: p.passive !== "twolives" });
        this.burst(p.x, p.y, "#ffd76e", 18);
        this.popText(p.x, p.y - 18, "复活中…", "#ffd76e"); this.events.push("revive");
        return;
      }
      // 命数耗尽：真正出局
      p.alive = false; p.out = true; this.events.push("die"); this.shakeT = Math.max(this.shakeT, 0.25);
      this.burst(p.x, p.y, "#ff8aa8", 22);
      if (killer && killer.isPlayer && killer !== p && killer.alive) {
        killer.kills += (killer.passive === "hunter" ? 2 : 1);
        this.popText(p.x, p.y - 18, killer.passive === "hunter" ? "+2击杀" : "+1击杀", "#ffd76e");
        // 机器狗猎杀本能：击杀回复 1 条命（上限 9）
        if (killer.passive === "hunter" && killer.lives < 9) {
          killer.lives++; this.popText(killer.x, killer.y - 30, "猎杀回血+1", "#ff8aa8");
        }
      }
    }

    // 死亡掉落：把拾取到的增益（除角色基础属性外）全部化为飞行道具，随机分散到地图各处
    dropOnDeath(p) {
      if (!p.gained) return;
      const c = CHARS[p.char];
      const g = p.gained;
      const drops = [];
      for (const k of ["bubble", "power", "speed", "life"]) for (let i = 0; i < (g[k] || 0); i++) drops.push(k);
      // 先重置为角色基础属性（基础属性不掉落）
      p.maxBubbles = c.maxBubbles; p.power = c.power; p.speedMul = c.speed;
      p.lives = Math.max(1, p.lives - (g.life || 0));
      p.gained = { bubble: 0, power: 0, speed: 0, life: 0 };
      if (!drops.length) return;
      const cells = [];
      for (let r = 1; r < this.rows - 1; r++) for (let cc = 1; cc < this.cols - 1; cc++)
        if (this.grid[r][cc] === T.EMPTY) cells.push([cc, r]);
      if (!cells.length) return;
      for (const type of drops) {
        const [cc, rr] = cells[ri(cells.length)];
        this.flyingItems.push({ type, c: cc, r: rr, t: 0, dur: 0.7 + Math.random() * 0.6, sx: p.x, sy: p.y, tx: (cc + .5) * TILE, ty: (rr + .5) * TILE });
      }
      this.events.push("drop");
    }

    // ---------- 重生处理：延迟后回到出生点 / 原地，并授予无敌 ----------
    updateRespawns(dt) {
      if (!this.respawns.length) return;
      const remain = [];
      for (const rs of this.respawns) {
        rs.timer -= dt;
        if (rs.timer > 0) { remain.push(rs); continue; }
        const p = rs.p;
        if (rs.atSpawn) { p.c = p.spawnC; p.r = p.spawnR; p.x = p.spawnX; p.y = p.spawnY; }
        // 原地重生则保留当前坐标
        p.alive = true; p.inv = RESPAWN_INV; p.moving = false; p.walkT = 0;
        p.shield = p.passive === "tank"; p.shieldT = 0;   // 护盾：震荡波重生自带一层，其余角色无
        this.bombHeld[p.id] = false;
        this.burst(p.x, p.y, "#9aa0ff", 16);
        this.popText(p.x, p.y - 18, "无敌!", "#9aa0ff"); this.events.push("revive");
      }
      this.respawns = remain;
    }

    // ---------- 特效（纯数据，客户端渲染） ----------
    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), s = rnd(40, 150);
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rnd(.3, .7), t: 0, color, size: rnd(2, 5) });
      }
    }
    popText(x, y, text, color) { this.floats.push({ x, y, text, color, t: 0 }); }

    // ---------- 状态快照（发送给客户端渲染） ----------
    snapshot() {
      return {
        mode: this.mode, grid: this.grid, items: this.items, brickItems: this.brickItems,
        bubbles: this.bubbles.map(b => ({ c: b.c, r: b.r, anim: b.anim, timer: b.timer, color: b.color, owner: b.owner ? b.owner.id : -1, remote: !!b.remote, phantom: !!(b.owner && b.owner.passive === "phantom") })),
        explosions: this.explosions.map(ex => ({ cells: ex.cells, k: ex.timer / ex.max, color: ex.color, phantom: !!(ex.owner && ex.owner.passive === "phantom") })),
        particles: this.particles, floats: this.floats,
        flyingItems: this.flyingItems.map(f => {
          const e = Math.min(1, f.t);
          return { type: f.type, x: f.sx + (f.tx - f.sx) * e, y: f.sy + (f.ty - f.sy) * e };
        }),
        thrown: this.thrown.map(t => {
          const e = Math.min(1, t.t);
          return { x: t.x + (t.tx - t.x) * e, y: t.y + (t.ty - t.y) * e - Math.sin(e * Math.PI) * 16, color: t.color, t: t.t };
        }),
        monsters: this.monsters.map(m => ({ x: m.x, y: m.y, c: m.c, r: m.r, smart: m.smart, animT: m.animT, kind: m.kind })),
        boss: this.boss ? {
          x: this.boss.x, y: this.boss.y, c: this.boss.c, r: this.boss.r,
          hp: this.boss.hp, maxHp: this.boss.maxHp, awake: this.boss.awake,
          dead: this.boss.dead, animT: this.boss.animT,
        } : null,
        lair: this.lair || null,
        difficulty: this.difficulty,
        pvp: this.pvp,
        players: this.players.map(p => ({
          id: p.id, name: p.name, faction: p.faction, accent: p.accent, body: p.body, tagColor: p.tagColor, bombColor: p.bombColor,
          x: p.x, y: p.y, c: p.c, r: p.r, alive: p.alive, inv: p.inv, face: p.face,
          walkT: p.walkT, moving: p.moving, maxBubbles: p.maxBubbles, power: p.power,
          kills: p.kills, isHuman: p.isHuman, passive: p.passive, lives: p.lives, shield: p.shield, out: p.out,
          phantom: p.passive === "phantom", cloak: p.cloakT > 0,
        })),
        matchTime: this.matchTime,
        winnerId: this.winner ? this.winner.id : null,
        state: this.state,
        events: this.events,
      };
    }
  }

  const API = {
    GameRoom, CHARS, FACTION, PCOLOR, TILE, HUD, T, SPEED_BASE, BUBBLE_FUSE, EXPLODE_TIME, INVINCIBLE,
    MAP_TYPES, DEATHMATCH_TYPES, MAZE_TYPES, ARENA_SIZE, DIFFICULTIES, COLS: 21, ROWS: 19,
    passiveDesc: (i) => CHARS[i] ? { name: CHARS[i].passiveName, desc: CHARS[i].passiveDesc, id: CHARS[i].passive } : null,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.GAME = API;
})(typeof window !== "undefined" ? window : globalThis);
