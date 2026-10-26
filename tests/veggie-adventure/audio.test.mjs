import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {MusicDirector,musicFor} from '../../public/games/veggie-adventure/js/audio.mjs';
import {Game} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {createServer} from '../../tools/veggie-adventure/serve.cjs';

const root='public/games/veggie-adventure/assets/audio',source='art-source/veggie-adventure/audio/drive-ost-20261025';
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
class Context{
 constructor(){this.currentTime=0;this.state='suspended';this.destination={};this.nodes=[];}
 resume(){this.state='running';return Promise.resolve();}
 suspend(){this.state='suspended';return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
 createGain(){const gain={value:1,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}};return {gain,connect(){},disconnect(){}};}
 createBufferSource(){const node={connect(){},disconnect(){this.disconnected=true;},start(time=0,offset=0){this.offset=offset;this.started=true;},stop(){this.stopped=true;this.onended?.();},finish(){this.onended?.();}};this.nodes.push(node);return node;}
 async decodeAudioData(bytes){const key=new TextDecoder().decode(bytes);return {id:key,duration:manifest.tracks[key].duration};}
}
function fixture(extra={}){
 const context=new Context(),requests=[],preferences=new Map(),writes=[];
 const storage={getItem:key=>preferences.get(key),setItem:(key,value)=>{preferences.set(key,value);writes.push(key);}};
 const fetcher=async url=>{const key=Object.keys(manifest.tracks).find(key=>url.endsWith(manifest.tracks[key].path));requests.push(key||'manifest');return {ok:true,json:async()=>manifest,arrayBuffer:async()=>new TextEncoder().encode(key).buffer};};
 const audio=new MusicDirector({contextFactory:()=>context,fetcher,storage,...extra});audio.configure(manifest);return {audio,context,requests,preferences,writes};
}

test('24 Drive originals retain exact bytes; 26 runtime tracks match checksums, sizes and expected durations',()=>{
 const index=JSON.parse(fs.readFileSync(source+'/index.json')),report=JSON.parse(fs.readFileSync(source+'/processing-report.json'));
 assert.equal(index.files.length,24);assert.equal(Object.keys(manifest.tracks).length,26);assert.equal(report.length,26);
 for(const item of index.files){const original=fs.readFileSync(source+'/originals/'+item.code+'.m4a'),record=report.find(r=>r.code===item.code);assert.equal(original.length,item.bytes);assert.equal(original.subarray(4,8).toString(),'ftyp');assert.equal(crypto.createHash('sha256').update(original).digest('hex'),record.sourceSha256);}
 for(const [key,t] of Object.entries(manifest.tracks)){const raw=fs.readFileSync(path.join(root,t.path));assert.equal(raw.length,t.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),t.sha256);assert.ok(raw.subarray(0,3).toString()==='ID3'||raw[0]===255);assert.ok(t.peakDb<0);assert.ok(t.duration>0);assert.equal(t.loopEnd,t.duration);if(t.loop)assert.ok(t.duration>8);}
 for(const [key,seconds] of Object.entries({J02:.65,J03:5,J04:7,J05:12}))assert.ok(Math.abs(manifest.tracks[key].duration-seconds)<.03,key);
 assert.equal(manifest.tracks.J01.enabled,false);assert.ok(manifest.tracks.J06.duration<5);assert.ok(manifest.tracks.J07.duration<2);assert.equal(manifest.tracks.M03.loop,false);
 for(const filename of ['J06_game_over_v1.wav','J07_rebirth_v1.wav'])assert.equal(fs.readFileSync('art-source/veggie-adventure/audio/generated-jingles-v1/'+filename).subarray(0,4).toString(),'RIFF');
});

test('all 32 stages select their world, activated boss, power-up override and ending correctly',()=>{
 for(const level of LEVELS){const g=new Game(level);const id=String(Number(level.id.split('-')[0])).padStart(2,'0');assert.equal(musicFor(g),'W'+id);assert.equal(musicFor(g,{title:true}),'M01');if(g.boss){g.boss.active=true;assert.equal(musicFor(g),'B'+id);}g.p.star=10;assert.equal(musicFor(g),'M02');g.p.star=0;if(g.boss)g.boss.dead=true;assert.equal(musicFor(g),'W'+id);g.mode='dead';assert.equal(musicFor(g),null);g.mode='gameover';assert.equal(musicFor(g),null);assert.equal(musicFor(g,{ending:true}),'M03');}
});

test('audio waits for a gesture, restores the previous music position, and suspends without restarting on pause or blur',async()=>{
 const {audio,context,requests}=fixture(),g=new Game();audio.update(g,{title:true});assert.equal(requests.length,0);await audio.unlock();await settle();assert.equal(audio.background.key,'M01');
 audio.update(g);await settle();assert.equal(audio.background.key,'W01');context.currentTime=15;g.p.star=10;audio.update(g);await settle();assert.equal(audio.background.key,'M02');context.currentTime=20;g.p.star=0;audio.update(g);await settle();assert.equal(audio.background.key,'W01');assert.equal(audio.background.offset,15);
 const node=audio.background.node;audio.update(g,{paused:true});assert.equal(context.state,'suspended');audio.update(g);assert.equal(context.state,'running');assert.equal(audio.background.node,node);audio.setHidden(true);assert.equal(context.state,'suspended');audio.setHidden(false);assert.equal(context.state,'running');assert.equal(audio.background.node,node);
 assert.ok(audio.cache.size<=2);audio.resetRun();assert.equal(audio.positions.size,0);audio.update(g);await settle();assert.equal(audio.background.offset,0);audio.dispose();assert.equal(context.state,'closed');
});

test('boss victory and normal clear cues survive automatic stage transitions, without duplicate fanfares',async()=>{
 const {audio}=fixture(),g=new Game(levelById('1-4'));g.boss.active=true;audio.update(g);await audio.unlock();await settle();assert.equal(audio.background.key,'B01');
 g.boss.dead=true;audio.update(g);await settle();assert.equal(audio.cueNode.key,'J04');const cue=audio.cueNode.node;g.mode='won';audio.update(g);assert.equal(audio.cueNode.node,cue);
 const next=new Game(levelById('2-1'));audio.update(next);await settle();assert.equal(audio.cueNode.node,cue);cue.finish();await settle();assert.equal(audio.background.key,'W02');
 next.mode='won';audio.update(next);await settle();assert.equal(audio.cueNode.key,'J03');audio.update(next);const nextCue=audio.cueNode.node;audio.update(new Game(levelById('3-1')));nextCue.finish();await settle();assert.equal(audio.background.key,'W03');audio.dispose();
});

test('death, rebirth, exhaustion and final victory play the matching short cue before the correct next music',async()=>{
 const {audio}=fixture(),g=new Game();audio.update(g);await audio.unlock();await settle();g.kill();audio.update(g);await settle();assert.equal(audio.cueNode.key,'J02');g.step(.7);audio.update(g);await settle();assert.equal(audio.cueNode.key,'J07');audio.cueNode.node.finish();await settle();assert.equal(audio.background.key,'W01');
 g.rebirths=0;g.kill();audio.update(g);await settle();g.step(.7);audio.update(g);await settle();assert.equal(audio.cueNode.key,'J06');audio.cueNode.node.finish();await settle();assert.equal(audio.background,null);
 const final=new Game(levelById('8-4'));final.boss.active=true;audio.resetRun();audio.update(final);await settle();final.boss.dead=true;audio.update(final);await settle();assert.equal(audio.cueNode.key,'J05');final.mode='won';audio.update(final,{ending:true});audio.cueNode.node.finish();await settle();assert.equal(audio.background.key,'M03');assert.equal(audio.background.node.loop,false);
 audio.background.node.finish();audio.setHidden(true);audio.setHidden(false);await settle();assert.equal(audio.background,null,'ending must not loop after returning focus');audio.dispose();
});

test('late downloads cannot start the wrong world and failed or unavailable audio does not interrupt gameplay',async()=>{
 let release;const gate=new Promise(r=>release=r);const custom=fixture({fetcher:async url=>({ok:true,arrayBuffer:async()=>{const key=url.includes('W01')?'W01':'W02';if(key==='W01')await gate;return new TextEncoder().encode(key).buffer;}})}),a=custom.audio;
 a.update(new Game());await a.unlock();a.update(new Game(levelById('2-1')));release();await settle();await settle();assert.equal(a.background.key,'W02');assert.ok(custom.context.nodes.every(n=>!n.started||n.buffer.id==='W02'));a.dispose();
 const broken=fixture({fetcher:async()=>({ok:false})}).audio;const g=new Game();broken.update(g);await broken.unlock();await settle();assert.equal(broken.background,undefined);for(let i=0;i<100;i++){g.step(1/120);broken.update(g);}assert.equal(g.mode,'playing');assert.equal(broken.failed.size,1);broken.dispose();
 const unsupported=new MusicDirector({contextFactory:()=>{throw Error('no audio');}});assert.equal(await unsupported.unlock(),false);assert.doesNotThrow(()=>unsupported.update(g));
 const denied=fixture();denied.context.resume=async()=>{throw Error('gesture denied');};assert.equal(await denied.audio.unlock(),false);assert.equal(denied.audio.unlocked,false);denied.context.resume=Context.prototype.resume.bind(denied.context);assert.equal(await denied.audio.unlock(),true);denied.audio.dispose();
});

test('volume and mute work independently of gameplay and review mode keeps settings read-only',async()=>{
 const f=fixture();await f.audio.unlock();f.audio.setVolume(.3);f.audio.toggleMute();assert.equal(f.audio.master.gain.value,0);const prefs=JSON.parse(f.preferences.get('veggie-adventure-audio-v1'));assert.equal(prefs.volume,.3);assert.equal(prefs.muted,true);f.audio.toggleMute();assert.equal(f.audio.master.gain.value,.3);f.audio.dispose();
 const readOnly=fixture({persistPreferences:false});readOnly.audio.setVolume(.2);readOnly.audio.toggleMute();assert.equal(readOnly.writes.length,0);
});

test('local server serves all audio files with the expected bytes and music MIME type',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const base='http://127.0.0.1:'+server.address().port+'/assets/audio/';for(const t of Object.values(manifest.tracks)){const r=await fetch(base+t.path);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^audio\/mpeg/);assert.equal((await r.arrayBuffer()).byteLength,t.bytes);}}finally{await new Promise(r=>server.close(r));}
});
