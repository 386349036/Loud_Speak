const { randomInt } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');

module.exports = function attachTidemarkLan(server) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });
  const send = (ws, data) => {
    if (ws?.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 1024 * 1024) return ws.terminate();
    ws.send(JSON.stringify(data));
  };
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/games/tidemark/ws') return;
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) throw Error();
    } catch {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', ws => {
    let room, seat;
    const broadcast = data => room.players.slice(1).forEach(player => send(player, data));
    const lobby = () => broadcast({ type: 'ready', count: room.players.length - 1, picks: room.picks });
    const error = message => send(ws, { type: 'error', message });
    ws.on('error', () => {});
    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (!msg || typeof msg !== 'object') return;
      if (!room && msg.type === 'create') {
        if (rooms.size >= 32) return error('房间已满');
        let code;
        do { code = String(randomInt(1000, 10000)); } while (rooms.has(code));
        room = { code, players: [null, ws], picks: [null, null], turn: 0 };
        rooms.set(code, room);
        seat = 1;
        return send(ws, { type: 'room', code, seat, count: 1 });
      }
      if (!room && msg.type === 'join') {
        const target = rooms.get(msg.code);
        if (!target) return error('房间不存在');
        if (target.turn !== 0) return error('对局已开始');
        if (target.players.length > 4) return error('房间已满（最多四人）');
        room = target;
        seat = room.players.length;
        room.players[seat] = ws;
        room.picks[seat] = null;
        const count = room.players.length - 1;
        send(ws, { type: 'room', code: room.code, seat, count });
        lobby();
        return;
      }
      if (room && room.turn === 0 && msg.type === 'pick') {
        if (!msg.ready) { room.picks[seat] = null; return lobby(); }
        if (![1, 2, 3, 4].includes(msg.color) || ![1, 2, 3, 4].includes(msg.team) ||
            ![1, 2, 3, 4, 5].includes(msg.faction) ||
            typeof msg.co !== 'string' || msg.co.length > 64) return error('阵营设置无效');
        if (room.picks.some((pick, i) => i !== seat && pick?.color === msg.color)) return error('该颜色已被选用');
        room.picks[seat] = { color: msg.color, faction: msg.faction, team: msg.team, co: msg.co };
        return lobby();
      }
      if (!room || !['start', 'turn'].includes(msg.type)) return;
      const start = msg.type === 'start';
      if (start ? seat !== 1 || room.turn !== 0 : room.actor !== seat) return;
      const state = msg.state;
      const count = room.players.length - 1;
      if (start) {
        const picks = room.picks.slice(1).filter(Boolean);
        const allAI = picks.length === 0;
        if (!allAI && (count < 2 || picks.length !== count)) return error('请等待所有玩家准备');
        if (![2, 3, 4].includes(state?.players) || (!allAI &&
            (state.players < count || (state.players > 2 && picks.some(pick => pick.color > state.players)) ||
            (state.players > count && msg.fill !== true)))) return error('地图席位与玩家设置不匹配');
      }
      const size = start ? state.players : room.size;
      if (!state || state.players !== size || !Array.isArray(state.units) ||
          !Array.isArray(state.map?.t) || state.map.t.length !== state.map.h ||
          !Number.isInteger(state.turn) || state.turn < 1 || state.turn > size ||
          (!start && !state.winner && state.turn === room.turn)) {
        return error('对局状态无效');
      }
      room.size = size;
      if (start && size === 2) {
        room.picks = room.picks.map((pick, index) => pick && { ...pick, color: index });
      }
      room.turn = state.winner ? -1 : state.turn;
      room.actor = state.winner ? 0 : room.picks.findIndex(pick => pick?.color === state.turn);
      const turnSeconds = room.actor > 0 ? 120 : 0;
      if (room.actor < 1 && !state.winner) room.actor = 1;
      broadcast({ type: 'state', state, picks: room.picks, actor: room.actor, turnSeconds });
    });
    ws.on('close', () => {
      if (!room || rooms.get(room.code) !== room) return;
      rooms.delete(room.code);
      for (const peer of room.players.slice(1)) {
        if (peer !== ws) peer.close();
      }
    });
  });
};
