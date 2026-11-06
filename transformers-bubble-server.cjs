'use strict';
const {WebSocketServer}=require('ws');
const {GameRoom,CHARS,MAP_TYPES,DEATHMATCH_TYPES,MAZE_TYPES,ARENA_SIZE,DIFFICULTIES}=require('./public/games/transformers-bubble/game-core.js');
module.exports=function attachTransformersBubble(server){
const TICK_HZ=30,TOTAL=4,HAND_SIZE=3;
const wss=new WebSocketServer({noServer:true,maxPayload:64*1024,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 if(new URL(req.url,'http://localhost').pathname!=='/games/transformers-bubble/ws')return;
 try{if(new URL(req.headers.origin).host!==req.headers.host)throw Error()}catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
});
const rooms = new Map(); // code -> Room

function genCode() {
  let code;
  do { code = Math.random().toString(36).slice(2, 6).toUpperCase(); } while (rooms.has(code));
  return code;
}

// 开局发牌：把全部 12 个角色洗成一副牌（打乱顺序），按加入顺序给每位玩家发 HAND_SIZE 张。
// 牌堆全局不重复——别人拿走的角色你手上不会再有；若某人想要的牌还在堆里，就优先发给他。
function shuffleDeck(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}
const newDeck = () => shuffleDeck(CHARS.map((_, i) => i));

class Room {
  constructor(code) {
    this.code = code;
    this.state = "waiting";            // waiting | playing | over
    this.mode = "multi";               // multi 对抗 | campaign 冒险（房主创建时选定）
    this.members = [];                 // [{ ws, char, name, gameId, input }]
    this.entryByWs = new Map();
    this.host = null;
    this.game = null;
    this.timer = null;
    this.size = undefined;      // 房主选择的地图大小
    this.mapType = undefined;   // 房主选择的地图类型
    this.difficulty = "easy";   // 电脑难度：easy 简单 / hard 困难
    this.deck = newDeck();      // 本局角色牌堆（洗乱），每人发 HAND_SIZE 张、发完为止
  }
  // 从牌堆发一手牌：wish（客户端先选的目标）还在堆里就优先给他，否则随机补满。
  // 返回 { hand, taken } —— taken=false 表示愿望角色已被别人拿走，只能按发的牌选。
  dealOne(wish) {
    if (this.deck.length < HAND_SIZE) this.deck = newDeck();
    const hand = [];
    let taken = false;
    if (wish != null && wish >= 0 && wish < CHARS.length) {
      const at = this.deck.indexOf(wish);
      if (at >= 0) { hand.push(this.deck.splice(at, 1)[0]); taken = true; }
    }
    while (hand.length < HAND_SIZE && this.deck.length) {
      const j = Math.floor(Math.random() * this.deck.length);
      hand.push(this.deck.splice(j, 1)[0]);
    }
    shuffleDeck(hand);
    return { hand, taken };
  }
  broadcast(obj) {
    const s = JSON.stringify(obj);
    for (const m of this.members) if (m.ws.readyState === 1) m.ws.send(s);
  }
  roster() {
    return this.members.map((m, i) => ({
      id: i, name: m.name, char: m.char,
      faction: CHARS[m.char].faction, color: CHARS[m.char].color, isHuman: true,
    }));
  }
  addMember(ws, char, name) {
    if (this.state === "playing") return { error: "对战进行中，无法加入（请等本局结束）" };
    if (this.members.length >= TOTAL) return { error: "房间已满（最多 4 人）" };
    const idx = this.members.length;
    // 发牌：从本局公共牌堆里给这个座位发 HAND_SIZE 张，所选角色必须在手牌里
    const { hand, taken } = this.dealOne(char);
    if (!hand.includes(char)) char = hand[0];
    const m = { ws, char, name: name || ("玩家" + (this.members.length + 1)), gameId: null, input: null, hand };
    this.members.push(m);
    this.entryByWs.set(ws, m);
    if (!this.host) this.host = ws;
    this.broadcast({ type: "roster", players: this.roster(), hostId: this.members.indexOf(this.host), code: this.code, state: this.state });
    return { ok: true, you: idx, code: this.code, hand, char, taken };
  }
  removeMember(ws) {
    const m = this.entryByWs.get(ws);
    if (!m) return;
    this.entryByWs.delete(ws);
    const idx = this.members.indexOf(m);
    if (idx >= 0) this.members.splice(idx, 1);
    if (this.host === ws) this.host = this.members[0] ? this.members[0].ws : null;
    if (this.state === "playing" && m.gameId != null) {
      const p = this.game.players[m.gameId];
      if (p && p.alive) { p.alive = false; p.out = true; }   // 中途离场：直接出局，不触发重生
    }
    if (this.members.length === 0) { this.destroy(); return; }
    this.broadcast({ type: "roster", players: this.roster(), hostId: this.members.indexOf(this.host), code: this.code, state: this.state });
  }
  start(mode, opts) {
    mode = mode || "multi";
    opts = opts || {};
    if (this.state === "playing") return { error: "对战已开始" };
    if (this.members.length < 1) return { error: "至少需要 1 名玩家" };
    const slots = this.members.map(m => ({ char: m.char, isHuman: true, name: m.name }));
    const need = mode === "campaign" ? 4 : TOTAL; // 闯关：1 人类 + 3 电脑
    while (slots.length < need) {
      // 电脑同样从公共牌堆取牌（不与真人重复）；牌堆用完再随机
      let ai = -1;
      if (this.deck.length) ai = this.deck.splice(Math.floor(Math.random() * this.deck.length), 1)[0];
      else ai = Math.floor(Math.random() * CHARS.length);
      slots.push({ char: ai, isHuman: false, name: CHARS[ai].name, difficulty: this.difficulty });
    }
    const size = (opts.size && opts.size >= 15 && opts.size <= 75) ? opts.size : undefined;
    let mapType = (opts.mapType && MAP_TYPES.includes(opts.mapType)) ? opts.mapType : undefined;
    if (!mapType) {   // 未指定时按模式随机：对抗=19×19 竞技图，冒险=迷宫大图
      const pool = (mode === "campaign")
        ? MAZE_TYPES
        : DEATHMATCH_TYPES;
      mapType = pool[Math.floor(Math.random() * pool.length)];
    }
    // 竞技图固定 19×19；迷宫图固定大尺寸（至少 50×50）
    const fixedSize = DEATHMATCH_TYPES.includes(mapType) ? ARENA_SIZE
                    : (MAZE_TYPES.includes(mapType) ? Math.max(size || 50, 50) : size);
    const difficulty = (opts.difficulty === "hard") ? "hard" : "easy";
    this.game = new GameRoom({ mode, slots, cols: fixedSize, rows: fixedSize, mapType, difficulty });
    this.members.forEach((m, i) => {
      m.gameId = i;
      m.input = { left: false, right: false, up: false, down: false, bomb: false };
    });
    this.state = "playing";
    this.broadcast({
      type: "start",
      mode,
      players: this.game.players.map(p => ({ id: p.id, name: p.name, faction: p.faction, char: p.char, color: p.accent, isHuman: p.isHuman })),
      grid: this.game.grid, items: this.game.items, brickItems: this.game.brickItems,
    });
    this.broadcast({ type: "state", snap: this.game.snapshot() });
    this.timer = setInterval(() => this.tick(), 1000 / TICK_HZ);
    return { ok: true };
  }
  tick() {
    if (this.state !== "playing") return;
    const inputs = {};
    for (const m of this.members) {
      if (m.ws.readyState === 1 && m.input && m.gameId != null) inputs[m.gameId] = m.input;
    }
    this.game.step(1 / TICK_HZ, inputs);
    this.broadcast({ type: "state", snap: this.game.snapshot() });
    if (this.game.state === "win") {
      clearInterval(this.timer); this.timer = null;
      this.state = "over";
      const ranking = this.game.players.slice().sort((a, b) => (a.out ? 1 : 0) - (b.out ? 1 : 0) || (b.alive ? 1 : 0) - (a.alive ? 1 : 0) || b.kills - a.kills);
      this.broadcast({
        type: "over",
        winnerId: this.game.winner ? this.game.winner.id : null,
        pveWin: this.game.boss ? !!this.game.boss.dead : undefined,
        ranking: ranking.map(p => ({ id: p.id, name: p.name, char: p.char, faction: p.faction, kills: p.kills, alive: p.alive, isHuman: p.isHuman })),
      });
    }
  }
  setInput(ws, input) {
    const m = this.entryByWs.get(ws);
    if (m && m.input) m.input = input;
  }
  // 双击炸弹键：手动引爆自己的炸弹
  detonate(ws) {
    const m = this.entryByWs.get(ws);
    if (!m || !this.game || this.state !== "playing" || m.gameId == null) return;
    const p = this.game.players.find(x => x.id === m.gameId);
    if (!p) return;
    if (this.game.detonateBombs(p) > 0) {
      // 立即补发一帧，让 "detonate" 事件/浮字能到客户端（下一 tick 开头 events 会被清空）
      this.broadcast({ type: "state", snap: this.game.snapshot() });
    }
  }
  destroy() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    rooms.delete(this.code);
  }
}

wss.on("connection", (ws) => {
  ws.room = null;
  ws.on("error", () => {});
  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) return;
    if ((msg.type === "create" || msg.type === "join") && ws.room) return;
    switch (msg.type) {
      case "create": {
        if (rooms.size >= 64) { ws.send(JSON.stringify({type:"error",msg:"房间已满"})); break; }
        const code = genCode();
        const room = new Room(code);
        rooms.set(code, room);
        room.mode = msg.mode === "campaign" ? "campaign" : "multi"; // 本房模式（创建时选定）
        room.size = msg.size;        // 房主初始地图设置（房间内可随时改）
        room.mapType = msg.mapType;
        if (DIFFICULTIES.indexOf(msg.difficulty) >= 0) room.difficulty = msg.difficulty;
        ws.room = room;
        const r = room.addMember(ws, msg.char, msg.name);
        ws.send(JSON.stringify({ type: "created", code, you: r.you, total: TOTAL, roster: room.roster(), hostId: 0, hand: r.hand, char: r.char, taken: r.taken }));
        break;
      }
      case "join": {
        const room = rooms.get(msg.code);
        if (!room) { ws.send(JSON.stringify({ type: "error", msg: "房间不存在或已结束" })); break; }
        const r = room.addMember(ws, msg.char, msg.name);
        if (r.error) { ws.send(JSON.stringify({ type: "error", msg: r.error })); break; }
        ws.room = room;
        ws.send(JSON.stringify({ type: "joined", code: msg.code, you: r.you, total: TOTAL, roster: room.roster(), hostId: room.members.indexOf(room.host), hand: r.hand, char: r.char, taken: r.taken }));
        break;
      }
      // 开赛前改选角色：只能从自己发到的手牌里选
      case "char": {
        if (!ws.room) break;
        const m = ws.room.entryByWs.get(ws);
        if (!m || ws.room.state === "playing") break;
        if (m.hand && m.hand.includes(msg.char)) { m.char = msg.char; m.name = CHARS[msg.char].name; }
        ws.room.broadcast({ type: "roster", players: ws.room.roster(), hostId: ws.room.members.indexOf(ws.room.host), code: ws.room.code, state: ws.room.state });
        break;
      }
      case "input":
        if (ws.room) ws.room.setInput(ws, { left: !!msg.left, right: !!msg.right, up: !!msg.up, down: !!msg.down, bomb: !!msg.bomb });
        break;
      case "detonate":
        if (ws.room) ws.room.detonate(ws);
        break;
      // 房主在房间里改地图 / 迷宫大小 / 难度（开局前随时可改）
      case "opts": {
        if (!ws.room || ws.room.host !== ws || ws.room.state === "playing") break;
        const room = ws.room;
        if (MAP_TYPES.includes(msg.mapType)) room.mapType = msg.mapType;
        if (DIFFICULTIES.indexOf(msg.difficulty) >= 0) room.difficulty = msg.difficulty;
        if (msg.size >= 15 && msg.size <= 75) room.size = msg.size;
        break;
      }
      case "start":
        if (ws.room) {
          if (ws.room.host !== ws) { ws.send(JSON.stringify({ type: "error", msg: "只有房主可以开始对战" })); break; }
          const r = ws.room.start(ws.room.mode || "multi", { size: ws.room.size, mapType: ws.room.mapType, difficulty: ws.room.difficulty });
          if (r.error) ws.send(JSON.stringify({ type: "error", msg: r.error }));
        }
        break;
      case "leave":
        if (ws.room) ws.room.removeMember(ws);
        break;
    }
  });
  ws.on("close", () => { if (ws.room) ws.room.removeMember(ws); });
});


return wss;
};
