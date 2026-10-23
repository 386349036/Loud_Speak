'use strict';
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
// Upstream wire protocol, isolated from Socket.IO and from chat/database state.
module.exports=function attachSmallScopeRelay(server){
  const endpoint='/games/smallscope/ws',rooms=new Map(),listeners=new Set();let nextPeer=1;
  const wss=new WebSocketServer({noServer:true,maxPayload:16*1024*1024,perMessageDeflate:false});
  function send(socket,data,binary=false){if(socket?.readyState!==WebSocket.OPEN)return;if(socket.bufferedAmount>32*1024*1024){socket.terminate();return}socket.send(binary?data:JSON.stringify(data),{binary})}
  function roomList(){return [...rooms].filter(([,r])=>r.host).map(([room,r])=>({room,n:r.clients.size+1,data:r.data}))}
  function publish(){const message={t:'rooms',rooms:roomList()};for(const socket of listeners)send(socket,message)}
  function makeCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ';for(let n=0;n<100;n++){let code='';for(let i=0;i<4;i++)code+=alphabet[crypto.randomInt(alphabet.length)];if(!rooms.has(code))return code}return null}
  function reject(socket,why){send(socket,{t:'refuse',why});socket.close(1008,why)}
  server.on('upgrade',(req,socket,head)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return}
    if(url.pathname!==endpoint)return;
    try{const origin=new URL(req.headers.origin);if(!['http:','https:'].includes(origin.protocol)||origin.host!==req.headers.host)throw Error('origin')}catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
    if(!['host','client','list'].includes(url.searchParams.get('role'))){socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');return}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,url));
  });
  wss.on('connection',(socket,url)=>{
    socket.alive=true;socket.on('pong',()=>socket.alive=true);socket.on('error',()=>{});
    const role=url.searchParams.get('role'),id=nextPeer++;let room=(url.searchParams.get('room')||'').toUpperCase();
    if(role==='list'){listeners.add(socket);send(socket,{t:'relay',id,role});send(socket,{t:'rooms',rooms:roomList()});socket.on('close',()=>listeners.delete(socket));return}
    if(room&&!/^[A-Z0-9_-]{1,32}$/.test(room))return reject(socket,'NOROOM');
    if(role==='host'&&!room)room=makeCode();
    if(!room)return reject(socket,'FULL');
    if(role==='client'&&!rooms.has(room))return reject(socket,'NOROOM');
    if(!rooms.has(room)&&rooms.size>=64)return reject(socket,'FULL');
    let r=rooms.get(room);if(!r){r={host:null,clients:new Map(),data:{}};rooms.set(room,r)}
    if(role==='client'&&r.clients.size>=9)return reject(socket,'FULL');
    if(role==='host'){const previous=r.host;r.host=socket;if(previous&&previous!==socket){send(previous,{t:'replaced'});previous.close(1000,'replaced')}for(const peer of r.clients.keys())send(socket,{t:'peer',peer})}
    else{r.clients.set(id,socket);send(r.host,{t:'peer',peer:id})}
    send(socket,{t:'relay',id,role,room});publish();
    socket.on('message',(data,binary)=>{
      if(role==='host'&&r.host!==socket)return;
      if(binary){
        if(role==='host'){if(data.length<4)return;const to=data.readUInt32BE(0),body=data.subarray(4);if(to===0xFFFFFFFF)for(const client of r.clients.values())send(client,body,true);else send(r.clients.get(to),body,true)}
        else{const prefix=Buffer.alloc(4);prefix.writeUInt32BE(id);send(r.host,Buffer.concat([prefix,data]),true)}
        return;
      }
      let message;try{message=JSON.parse(data.toString())}catch{return}if(!message||typeof message!=='object'||Array.isArray(message))return;
      if(role==='host'){
        if(message.t==='room'){if(message.data&&typeof message.data==='object'&&!Array.isArray(message.data)&&data.length<=65536){r.data=message.data;publish()}return}
        const to=message.to;delete message.to;if(to==='*')for(const client of r.clients.values())send(client,message);else send(r.clients.get(Number(to)),message);
      }else{message.peer=id;send(r.host,message)}
    });
    socket.on('close',()=>{if(role==='host'){if(r.host===socket){r.host=null;for(const client of r.clients.values())send(client,{t:'hostGone'})}}else{r.clients.delete(id);send(r.host,{t:'gone',peer:id})}if(!r.host&&!r.clients.size)rooms.delete(room);publish()});
  });
  const heartbeat=setInterval(()=>{for(const socket of wss.clients){if(!socket.alive){socket.terminate();continue}socket.alive=false;socket.ping()}},30000);heartbeat.unref();
  server.on('close',()=>{clearInterval(heartbeat);for(const socket of wss.clients)socket.terminate();wss.close()});
  function networkInfo(req){
    const protocol=req.socket.encrypted?'https:':'http:',host=req.headers.host,origin=protocol+'//'+host;
    const hostname=new URL(origin).hostname.replace(/[\[\]]/g,'');
    const bound=server.address(),wildcard=bound&&['0.0.0.0','::'].includes(bound.address);
    const addresses=wildcard?Object.values(require('node:os').networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)).map(n=>n.address).sort((a,b)=>Number(b.startsWith('192.168.'))-Number(a.startsWith('192.168.'))):[];
    const origins=[...new Set(addresses)].map(ip=>protocol+'//'+ip+':'+bound.port);
    return {origin:['localhost','127.0.0.1','::1'].includes(hostname)&&origins.length?origins[0]:origin,origins};
  }
  return {endpoint,roomList,networkInfo};
};
