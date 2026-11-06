// 像素坦克大战 - 局域网对战服务器（最多4人）
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = 3000;
const GAME_FILE = path.join(__dirname, 'index.html');

function getLanIp(){
  const nets = require('os').networkInterfaces();
  const cands = [];
  for (const k in nets)
    for (const n of nets[k])
      if (n.family === 'IPv4' && !n.internal && n.address !== '127.0.0.1')
        cands.push(n.address);
  for (const ip of cands) if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return ip;
  return cands[0] || '127.0.0.1';
}
const LAN_IP = getLanIp();

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname === '/share') {
    const room = (u.searchParams.get('room') || 'GAME').slice(0, 20);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ url: `http://${LAN_IP}:${PORT}/?room=${encodeURIComponent(room)}`, lan: LAN_IP, port: PORT }));
    return;
  }
  fs.readFile(GAME_FILE, (err, data) => {
    if (err) { res.writeHead(500); res.end('error'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map(); // room -> {host, guests:[]}

wss.on('connection', (ws) => {
  ws.room = null; ws.slot = -1;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const r = ws.room ? rooms.get(ws.room) : null;
    if (m.t === 'create') {
      rooms.set(m.room, { host: ws, guests: [] });
      ws.room = m.room; ws.slot = 0;
      ws.send(JSON.stringify({ t: 'created', room: m.room, slot: 0 }));
      console.log(`[房间] ${m.room} 创建`);
    } else if (m.t === 'join') {
      const room = rooms.get(m.room);
      if (room && room.host && room.host.readyState === WebSocket.OPEN && room.guests.length < 3) {
        ws.room = m.room;
        ws.slot = room.guests.length + 1;
        room.guests.push(ws);
        ws.send(JSON.stringify({ t: 'peer', slot: ws.slot }));
        room.host.send(JSON.stringify({ t: 'guestjoined', slot: ws.slot }));
        console.log(`[房间] ${m.room} 玩家${ws.slot + 1}加入`);
      } else {
        ws.send(JSON.stringify({ t: 'err', msg: '房间不存在或人数已满(4人)' }));
      }
    } else if (r) {
      if (ws === r.host) {
        // 主机 → 广播给所有客机
        for (const g of r.guests) if (g.readyState === WebSocket.OPEN) g.send(raw.toString());
      } else {
        // 客机 → 转发给主机（带上 slot）
        if (r.host && r.host.readyState === WebSocket.OPEN) {
          const out = typeof raw === 'string' ? raw : raw.toString();
          let obj; try { obj = JSON.parse(out); } catch { return; }
          obj.slot = ws.slot;
          r.host.send(JSON.stringify(obj));
        }
      }
    }
  });
  ws.on('close', () => {
    if (!ws.room) return;
    const r = rooms.get(ws.room);
    if (!r) return;
    if (ws === r.host) {
      for (const g of r.guests) if (g.readyState === WebSocket.OPEN) g.send(JSON.stringify({ t: 'peerleft' }));
      rooms.delete(ws.room);
      console.log(`[房间] ${ws.room} 关闭(主机离开)`);
    } else {
      r.guests = r.guests.filter(g => g !== ws);
      if (r.host && r.host.readyState === WebSocket.OPEN)
        r.host.send(JSON.stringify({ t: 'guestleft', slot: ws.slot }));
      console.log(`[房间] ${ws.room} 玩家${ws.slot + 1}离开`);
    }
  });
});

function openBrowser(url){
  if (process.env.NO_BROWSER) return;   // 设 NO_BROWSER=1 可关闭自动开浏览器（便于测试/脚本化）
  try {
    const { spawn } = require('child_process');
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } catch {}
}

// 端口被占用（旧实例没关）时给清楚提示，而不是直接崩溃闪退
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('============================================================');
    console.log(`  端口 ${PORT} 已被占用：坦克大战服务很可能已经在运行了！`);
    console.log(`  直接用浏览器打开  http://localhost:${PORT}/?host=GAME  就能玩。`);
    console.log('  想重启服务：先关闭旧的坦克大战服务器窗口，再运行本脚本。');
    console.log('============================================================');
    openBrowser(`http://localhost:${PORT}/?host=GAME`);
    process.exit(0);
  }
  console.error('服务器启动失败:', err);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('游戏服务器已启动!');
  console.log(`创建房间:  http://${LAN_IP}:${PORT}/?host=房间名`);
  console.log(`好友加入:  http://${LAN_IP}:${PORT}/?room=房间名`);
  openBrowser(`http://${LAN_IP}:${PORT}/?host=GAME`);
});
