const assert=require('node:assert/strict'),http=require('node:http'),{once}=require('node:events'),{WebSocket}=require('ws'),{Server}=require('socket.io'),{io}=require('socket.io-client');
const attach=require('./smallscope-relay.cjs');
(async()=>{
const server=http.createServer((_,res)=>res.end('ok')),socketIO=new Server(server),relay=attach(server);server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`,url=base.replace('http','ws')+relay.endpoint,sockets=[];
async function connect(query){const socket=new WebSocket(url+'?'+query,{origin:base});sockets.push(socket);socket.queue=[];socket.on('message',(data,binary)=>socket.queue.push(binary?Buffer.from(data):JSON.parse(data)));await once(socket,'open');return socket}
async function receive(socket,predicate){const deadline=Date.now()+4000;while(Date.now()<deadline){const index=socket.queue.findIndex(predicate);if(index>=0)return socket.queue.splice(index,1)[0];await new Promise(r=>setTimeout(r,10))}throw Error('Timed out waiting for relay message')}
let clientIO;
try{
const host=await connect('role=host'),hello=await receive(host,m=>m.t==='relay'),code=hello.room;assert.match(code,/^[A-Z]{4}$/);
const list=await connect('role=list');await receive(list,m=>m.t==='rooms');host.send(JSON.stringify({t:'room',data:{name:'测试队伍',seed:123,patch:'test'}}));assert.equal((await receive(list,m=>m.t==='rooms'&&m.rooms.some(r=>r.data.name==='测试队伍'))).rooms[0].room,code);
const client=await connect('role=client&room='+code),joined=await receive(client,m=>m.t==='relay');assert.equal((await receive(host,m=>m.t==='peer')).peer,joined.id);
client.send(JSON.stringify({t:'hello',name:'中文玩家'}));const greeting=await receive(host,m=>m.t==='hello');assert.equal(greeting.peer,joined.id);assert.equal(greeting.name,'中文玩家');
host.send(JSON.stringify({t:'welcome',to:joined.id,slot:1}));assert.equal((await receive(client,m=>m.t==='welcome')).slot,1);
host.send(JSON.stringify({t:'roster',to:'*',ready:true}));assert.equal((await receive(client,m=>m.t==='roster')).ready,true);
const payload=Buffer.alloc(2*1024*1024,37),header=Buffer.alloc(4);header.writeUInt32BE(joined.id);host.send(Buffer.concat([header,payload]));assert.deepEqual(await receive(client,Buffer.isBuffer),payload);
client.send(Buffer.from([1,2,3]));const upstream=await receive(host,Buffer.isBuffer);assert.equal(upstream.readUInt32BE(0),joined.id);assert.deepEqual([...upstream.subarray(4)],[1,2,3]);
clientIO=io(base,{transports:['websocket']});await once(clientIO,'connect');await new Promise(r=>setTimeout(r,1200));assert.equal(clientIO.connected,true);assert.equal(host.readyState,WebSocket.OPEN);
console.log('PASS: rooms, joins, Unicode messages, targeted/broadcast routing, 2MB binary snapshots and Socket.IO coexistence');
const bad=new WebSocket(url+'?role=list',{origin:'http://unrelated.invalid'});const [,response]=await once(bad,'unexpected-response');assert.equal(response.statusCode,403);bad.on('error',()=>{});bad.terminate();
const missing=await connect('role=client&room=DOESNOTEXIST');assert.equal((await receive(missing,m=>m.t==='refuse')).why,'NOROOM');
client.close();assert.equal((await receive(host,m=>m.t==='gone')).peer,joined.id);host.close();await new Promise(r=>setTimeout(r,40));assert.equal(relay.roomList().length,0);
console.log('PASS: foreign-origin rejection, unknown rooms, disconnect notification and cleanup');
}finally{clientIO?.close();for(const socket of sockets)socket.terminate();await new Promise(resolve=>socketIO.close(resolve));if(server.listening)await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
