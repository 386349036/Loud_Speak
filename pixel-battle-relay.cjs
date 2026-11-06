'use strict';
const {WebSocketServer,WebSocket}=require('ws');
module.exports=function attachPixelBattle(server){
  const rooms=new Map(),endpoint='/games/pixel-battle/ws';
  const wss=new WebSocketServer({noServer:true,maxPayload:2*1024*1024,perMessageDeflate:false});
  const send=(ws,m)=>{if(ws?.readyState===WebSocket.OPEN){if(ws.bufferedAmount>8*1024*1024)return ws.terminate();ws.send(JSON.stringify(m))}};
  function leave(ws){
    const r=rooms.get(ws.room);if(!r)return;ws.room=null;
    if(r.host===ws){for(const g of r.guests.values())send(g,{t:'peerleft'});rooms.delete(r.code)}
    else{r.guests.delete(ws.slot);send(r.host,{t:'guestleft',slot:ws.slot})}
  }
  server.on('upgrade',(req,socket,head)=>{
    if(new URL(req.url,'http://localhost').pathname!==endpoint)return;
    try{if(new URL(req.headers.origin).host!==req.headers.host)throw Error()}catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  wss.on('connection',ws=>{
    ws.on('error',()=>{});
    ws.on('message',raw=>{
      let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object'||Array.isArray(m))return;
      if(m.t==='create'||m.t==='join'){
        if(ws.room)return;
        if(typeof m.room!=='string'||!m.room.trim()||m.room.length>32)return send(ws,{t:'err',msg:'房间名称无效'});
        const code=m.room;
        if(m.t==='create'){
          if(rooms.has(code)||rooms.size>=64)return send(ws,{t:'err',msg:'房间已存在或服务器已满'});
          rooms.set(code,{code,host:ws,guests:new Map()});ws.room=code;ws.slot=0;send(ws,{t:'created',room:code,slot:0});
        }else{
          const r=rooms.get(code);if(!r||r.host.readyState!==WebSocket.OPEN||r.guests.size>=3)return send(ws,{t:'err',msg:'房间不存在或人数已满(4人)'});
          const slot=[1,2,3].find(s=>!r.guests.has(s));ws.room=code;ws.slot=slot;r.guests.set(slot,ws);send(ws,{t:'peer',slot});send(r.host,{t:'guestjoined',slot});
        }
      }else{
        const r=rooms.get(ws.room);if(!r)return;
        if(r.host===ws)for(const g of r.guests.values())send(g,m);
        else send(r.host,{...m,slot:ws.slot});
      }
    });
    ws.on('close',()=>leave(ws));
  });
  return wss;
};
