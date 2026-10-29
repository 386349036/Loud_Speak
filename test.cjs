const {spawn}=require('child_process'),assert=require('assert/strict'),fs=require('fs'),path=require('path'),Database=require('better-sqlite3'),{io}=require('socket.io-client');
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'loud-test-'));let child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:'3107',HOST:'127.0.0.1',DATA_DIR:dir},stdio:'pipe'});let cookie='',token='';
async function req(p,method='GET',body,admin=false){const headers={};if(token)headers.Authorization='Bearer '+token;if(admin)headers.Cookie=cookie;if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch('http://127.0.0.1:3107'+p,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});return r}
(async()=>{let ready=false;for(let i=0;i<60;i++){try{if((await req('/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready);assert.equal((await req('/api/admin/messages')).status,401);token=(await(await req('/api/session','POST')).json()).token;const second=(await(await req('/api/session','POST')).json()).token;assert.notEqual(token,second);
const OTPAuth=require('otpauth');
// Seed a legacy password to exercise a non-destructive migration.
const seed=new Database(path.join(dir,'chat.sqlite')),salt=require('crypto').randomBytes(16).toString('hex');
seed.prepare('INSERT OR REPLACE INTO config VALUES(?,?)').run('salt',salt);
seed.prepare('INSERT OR REPLACE INTO config VALUES(?,?)').run('password',require('crypto').scryptSync('test-only-strong-password',salt,64).toString('hex'));seed.close();
assert.equal((await req('/api/admin/enroll/start','POST',{password:'wrong'})).status,401);
let r=await req('/api/admin/login','POST',{password:'test-only-strong-password'});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
const enrolled=await(await req('/api/admin/enroll/start','POST',{},true)).json();assert(enrolled.qr.startsWith('data:image/png;base64,'));
const otp=new OTPAuth.TOTP({secret:OTPAuth.Secret.fromBase32(enrolled.secret),algorithm:'SHA1',digits:6,period:30});
assert.equal((await req('/api/admin/enroll/confirm','POST',{id:enrolled.id,code:'bad'},true)).status,401);
r=await req('/api/admin/enroll/confirm','POST',{id:enrolled.id,code:otp.generate()},true);assert.equal(r.status,200);const recovery=await r.json();cookie=r.headers.get('set-cookie').split(';')[0];
assert.equal(recovery.recoveryCodes.length,10);
assert.equal((await req('/api/admin/login','POST',{code:otp.generate()})).status,401);
r=await req('/api/admin/login','POST',{code:otp.generate({timestamp:Date.now()+30000})});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
assert.equal((await req('/api/admin/login','POST',{password:'test-only-strong-password'})).status,401);
r=await req('/api/admin/recovery','POST',{code:recovery.recoveryCodes[0]});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
assert.equal((await req('/api/admin/recovery','POST',{code:recovery.recoveryCodes[0]})).status,401);
const inspect=new Database(path.join(dir,'chat.sqlite'));assert(!inspect.prepare('SELECT value FROM config WHERE key=?').get('password'));assert(!inspect.prepare('SELECT value FROM config WHERE key=?').get('totp').value.includes(enrolled.secret));inspect.close();

const socket=io('http://127.0.0.1:3107',{auth:{token:second}});await new Promise((resolve,reject)=>{socket.on('connect',resolve);socket.on('connect_error',reject)});const seen=new Promise(resolve=>socket.once('message',resolve));const id='test-message-000001';function form(){const f=new FormData();f.append('id',id);f.append('text','<script>alert(1)</script>');f.append('file',new Blob(['test attachment'],{type:'text/plain'}),'test.txt');return f}assert.equal((await req('/api/messages','POST',form())).status,200);assert.equal((await seen).id,id);await req('/api/messages','POST',form());let list=await(await req('/api/messages')).json();assert.equal(list.length,1);assert.equal((await req('/api/files/'+id)).status,200);const db=new Database(path.join(dir,'chat.sqlite'));db.prepare('UPDATE messages SET created=?').run(Date.now()-7*3600000);assert.equal((await(await req('/api/messages')).json()).length,0);assert.equal((await req('/api/files/'+id)).status,403);assert.equal((await req('/api/files/'+id,'GET',null,true)).status,200);assert.equal((await(await req('/api/admin/messages','GET',null,true)).json()).total,1);r=await req('/api/admin/settings','POST',{visibleHours:1,retentionHours:2},true);assert.equal((await r.json()).needsConfirmation,true);assert.equal((await(await req('/api/admin/messages','GET',null,true)).json()).total,1);await req('/api/admin/settings','POST',{visibleHours:1,retentionHours:2,confirm:true},true);assert.equal((await(await req('/api/admin/messages','GET',null,true)).json()).total,0);assert.equal(fs.readdirSync(path.join(dir,'files')).length,0);
assert.equal((await req('/api/admin/clear-visible','POST')).status,401);
assert.equal((await req('/api/messages','POST',form())).status,200);
const clearedEvent=new Promise(resolve=>socket.once('settings',resolve));
r=await req('/api/admin/clear-visible','POST',null,true);assert.equal(r.status,200);const cleared=await r.json();assert.equal(cleared.count,1);assert(cleared.visibleSince>0);assert.equal((await clearedEvent).visibleSince,cleared.visibleSince);
assert.equal((await(await req('/api/messages')).json()).length,0);
assert.equal((await req('/api/files/'+id)).status,403);
assert.equal((await req('/api/files/'+id,'GET',null,true)).status,200);
assert.equal((await(await req('/api/admin/messages','GET',null,true)).json()).total,1);
assert.equal(Number(db.prepare('SELECT value FROM config WHERE key=?').get('visibleSince').value),cleared.visibleSince);
await req('/api/admin/settings','POST',{visibleHours:2,retentionHours:720},true);
assert.equal((await(await req('/api/messages')).json()).length,0);
const fresh=new FormData();fresh.append('id','fresh-message-000002');fresh.append('text','new after clear');assert.equal((await req('/api/messages','POST',fresh)).status,200);
const visible=await(await req('/api/messages')).json();assert.equal(visible.length,1);assert.equal(visible[0].id,'fresh-message-000002');

assert.equal((await req('/api/admin/chat-state','POST',{enabled:false})).status,401);
assert.equal((await req('/api/admin/chat-state','POST',{enabled:'false'},true)).status,400);
const closing=new Promise(resolve=>socket.once('settings',resolve));
r=await req('/api/admin/chat-state','POST',{enabled:false},true);assert.equal(r.status,200);assert.equal((await r.json()).chatEnabled,false);assert.equal((await closing).chatEnabled,false);
assert.equal((await(await req('/api/settings')).json()).chatEnabled,false);
assert.equal(db.prepare('SELECT value FROM config WHERE key=?').get('chatEnabled').value,'false');
const filesBefore=fs.readdirSync(path.join(dir,'files')).length;
assert.equal((await req('/api/messages')).status,403);
assert.equal((await req('/api/messages','POST',form())).status,403);
assert.equal(fs.readdirSync(path.join(dir,'files')).length,filesBefore);
assert.equal((await req('/api/files/'+id)).status,403);
assert.equal((await req('/api/files/'+id,'GET',null,true)).status,200);
assert.equal((await req('/api/admin/messages','GET',null,true)).status,200);
const reopening=new Promise(resolve=>socket.once('settings',resolve));
assert.equal((await req('/api/admin/chat-state','POST',{enabled:true},true)).status,200);assert.equal((await reopening).chatEnabled,true);
assert.equal((await(await req('/api/messages')).json()).length,1);
assert.equal((await req('/api/messages','POST',fresh)).status,200);

// Shared stickers: isolated uploads, realtime, validation, copies, deletion and lifetime.
const png=await require('sharp')({create:{width:12,height:12,channels:4,background:'#63a55c'}}).png().toBuffer();
function stickerForm(bytes=png,type='image/png'){const f=new FormData();f.append('file',new Blob([bytes],{type}),'shared.png');return f}
assert.equal((await fetch('http://127.0.0.1:3107/api/stickers')).status,401);
const changed=new Promise(resolve=>socket.once('stickers-changed',resolve));
r=await req('/api/stickers','POST',stickerForm());assert.equal(r.status,200);const sticker=await r.json();assert.equal((await changed).id,sticker.id);
assert.equal((await(await req('/api/stickers','POST',stickerForm())).json()).id,sticker.id);
assert.equal((await(await req('/api/stickers')).json()).length,1);
assert.equal((await req(sticker.url)).status,200);
assert.equal((await req('/api/stickers','POST',stickerForm(Buffer.from('<svg></svg>'),'image/png'))).status,400);
assert.equal((await req('/api/stickers','POST',stickerForm(png.subarray(0,40)))).status,400);
assert.equal((await req('/api/stickers','POST',stickerForm(Buffer.alloc(5*1024*1024+1)))).status,413);
assert.equal((await req('/api/stickers','POST',stickerForm())).status,429);
const stickerMessage=new FormData();stickerMessage.append('id','sticker-message-0001');stickerMessage.append('text','shared sticker');stickerMessage.append('stickerId',sticker.id);
r=await req('/api/messages','POST',stickerMessage);assert.equal(r.status,200);const sentSticker=await r.json();assert(sentSticker.attachment);
assert.equal((await req('/api/admin/stickers')).status,401);
assert.equal((await req('/api/admin/stickers/'+sticker.id,'DELETE')).status,401);
await req('/api/admin/clear-visible','POST',null,true);assert.equal((await(await req('/api/stickers')).json()).length,1);
await req('/api/admin/chat-state','POST',{enabled:false},true);assert.equal((await req('/api/stickers')).status,403);assert.equal((await req(sticker.url)).status,403);assert.equal((await req('/api/stickers','POST',stickerForm())).status,403);assert.equal((await req('/api/admin/stickers','GET',null,true)).status,200);
await req('/api/admin/chat-state','POST',{enabled:true},true);
const removedSticker=new Promise(resolve=>socket.once('stickers-changed',resolve));assert.equal((await req('/api/admin/stickers/'+sticker.id,'DELETE',null,true)).status,200);assert.equal((await removedSticker).removed,sticker.id);
assert.equal((await(await req('/api/stickers')).json()).length,0);assert.equal((await req(sticker.url)).status,404);assert.equal((await req(sentSticker.attachment.url,'GET',null,true)).status,200);
const gone=new FormData();gone.append('id','sticker-message-gone1');gone.append('stickerId',sticker.id);assert.equal((await req('/api/messages','POST',gone)).status,400);

const originalToken=token;token=second;
const wide=await require('sharp')({create:{width:2049,height:1,channels:4,background:'#aaa'}}).png().toBuffer();assert.equal((await req('/api/stickers','POST',stickerForm(wide))).status,400);
const gif=await require('sharp')({create:{width:12,height:12,channels:4,background:'#63a55c'}}).gif().toBuffer();r=await req('/api/stickers','POST',stickerForm(gif,'image/gif'));assert.equal(r.status,200);const lasting=await r.json();assert.equal(lasting.mime,'image/gif');
const third=(await(await req('/api/session','POST')).json()).token;token=third;assert((await(await req('/api/stickers')).json()).some(s=>s.id===lasting.id));
// Actual process restart must preserve the shared library and its image.
child.kill();await new Promise(resolve=>child.once('exit',resolve));
child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:'3107',HOST:'127.0.0.1',DATA_DIR:dir},stdio:'pipe'});
let restarted=false;for(let i=0;i<60;i++){try{if((await req('/api/health')).ok){restarted=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(restarted);assert((await(await req('/api/stickers')).json()).some(s=>s.id===lasting.id));assert.equal((await req(lasting.url)).status,200);token=originalToken;
console.log('PASS: shared sticker upload, deduplication, websocket sync, access control, corrupt/SVG/oversize rejection, rate limit, message copy, clear-visible independence, closed-chat blocking, admin deletion and historical attachment preservation.');
// Chat images are served as original bytes, also to another anonymous session.
const originalImage=await require('sharp')({create:{width:1200,height:700,channels:4,background:'#658c5b'}}).png().toBuffer();
const imageForm=new FormData();imageForm.append('id','original-image-download-test');imageForm.append('file',new Blob([originalImage],{type:'image/png'}),'原始尺寸图片.png');
const imageMessage=await(await req('/api/messages','POST',imageForm)).json();assert(imageMessage.attachment);
const peer=await fetch('http://127.0.0.1:3107'+imageMessage.attachment.url,{headers:{Authorization:'Bearer '+second}});assert.equal(peer.status,200);assert.match(peer.headers.get('content-disposition'),/filename\*=UTF-8/);
const originalDownload=Buffer.from(await peer.arrayBuffer());assert.deepEqual(originalDownload,originalImage);const imageMeta=await require('sharp')(originalDownload).metadata();assert.equal(imageMeta.width,1200);assert.equal(imageMeta.height,700);
assert.equal((await fetch('http://127.0.0.1:3107'+imageMessage.attachment.url)).status,403);db.prepare('UPDATE messages SET created=? WHERE id=?').run(Date.now()-7*3600000,imageMessage.id);assert.equal((await fetch('http://127.0.0.1:3107'+imageMessage.attachment.url,{headers:{Authorization:'Bearer '+second}})).status,403);
console.log('PASS: peer image download preserves original bytes, dimensions and filename metadata; anonymous and expired access denied.');
db.close();socket.close();console.log('PASS: anonymous identities, TOTP enrollment/migration/login/replay prevention/recovery, realtime delivery, upload/download, idempotency, visibility/attachment authorization, retention preview/cleanup, clear-visible broadcast/persistence/access control/new messages, chat close/open authorization/broadcast/persistence/upload blocking/admin access.');})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{child.kill();setTimeout(()=>fs.rmSync(dir,{recursive:true,force:true}),500)});
