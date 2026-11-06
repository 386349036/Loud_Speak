const assert=require('node:assert/strict'),http=require('node:http'),{WebSocket}=require('ws');
const server=http.createServer();require('./pixel-battle-relay.cjs')(server);
const clients=[];
function receive(ws){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('message timeout')),3000);ws.once('message',raw=>{clearTimeout(timer);resolve(JSON.parse(raw))})})}
async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/games/pixel-battle/ws`,{origin:`http://127.0.0.1:${server.address().port}`});clients.push(ws);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});return ws}
(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const host=await connect();let p=receive(host);host.send(JSON.stringify({t:'create',room:'测试房间'}));assert.equal((await p).t,'created');
const guests=[];
for(let slot=1;slot<=3;slot++){const g=await connect();guests.push(g);const joined=receive(host);p=receive(g);g.send(JSON.stringify({t:'join',room:'测试房间'}));assert.equal((await p).slot,slot);assert.equal((await joined).slot,slot)}
const extra=await connect();p=receive(extra);extra.send(JSON.stringify({t:'join',room:'测试房间'}));assert.equal((await p).t,'err');
p=receive(host);guests[1].send(JSON.stringify({t:'input',slot:99,left:true}));assert.equal((await p).slot,2);
const broadcasts=guests.map(receive);host.send(JSON.stringify({t:'state',frame:10}));for(const msg of await Promise.all(broadcasts))assert.equal(msg.frame,10);
p=receive(host);guests[0].close();assert.equal((await p).t,'guestleft');
const replacement=await connect();const joined=receive(host);p=receive(replacement);replacement.send(JSON.stringify({t:'join',room:'测试房间'}));assert.equal((await p).slot,1);await joined;
const closed=[guests[1],guests[2],replacement].map(receive);host.close();for(const msg of await Promise.all(closed))assert.equal(msg.t,'peerleft');
console.log('PASS four-player rooms, capacity, input slot attribution, broadcast, slot reuse and host disconnect');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const ws of clients)ws.terminate();server.close()});
