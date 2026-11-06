const assert=require('node:assert/strict'),http=require('node:http'),{WebSocket}=require('ws');
const server=http.createServer();require('./transformers-bubble-server.cjs')(server);
const clients=[];
async function connect(){
 const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/games/transformers-bubble/ws`,{origin:`http://127.0.0.1:${server.address().port}`});clients.push(ws);
 const inbox=[];ws.on('message',raw=>inbox.push(JSON.parse(raw)));
 ws.wait=type=>new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{const i=inbox.findIndex(m=>m.type===type);if(i>=0){clearInterval(timer);resolve(inbox.splice(i,1)[0])}else if(Date.now()-start>4000){clearInterval(timer);reject(Error('timeout '+type))}},10)});
 await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});return ws;
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const host=await connect();host.send(JSON.stringify({type:'create',char:0,name:'房主',mode:'multi'}));const created=await host.wait('created');assert.equal(created.hand.length,3);
 const guest=await connect();guest.send(JSON.stringify({type:'join',code:created.code,char:1,name:'客机'}));const joined=await guest.wait('joined');assert.equal(joined.roster.length,2);
 guest.send(JSON.stringify({type:'start'}));assert.match((await guest.wait('error')).msg,/房主/);
 host.send(JSON.stringify({type:'start'}));const start=await host.wait('start');assert.equal(start.players.length,4);await guest.wait('start');
 const snap=await guest.wait('state');assert.ok(snap.snap.players.length===4);
 guest.send(JSON.stringify({type:'input',right:true,bomb:true}));await host.wait('state');
 console.log('PASS create/join, character hands, host-only start, AI filling, authoritative game snapshots and input');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const ws of clients)ws.terminate();server.close()});
