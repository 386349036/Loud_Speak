import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {hurtEnemy} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {hurtBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {SoundDirector} from '../../public/games/veggie-adventure/js/sound-effects.mjs';
import {createServer} from '../../tools/veggie-adventure/serve.cjs';
const base='public/games/veggie-adventure/assets/audio/sfx/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json'));
class Context{
 constructor(){this.currentTime=0;this.state='running';this.destination={};this.nodes=[];}
 createGain(){return {gain:{value:1,setValueAtTime(v){this.value=v;}},connect(){},disconnect(){}};}
 createBufferSource(){const n={connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};this.nodes.push(n);return n;}
 async decodeAudioData(data){return {duration:(data.byteLength-44)/48000};}
}
function fixture(extra={}){const context=new Context(),writes=[],preferences=new Map(),audio=new SoundDirector({storage:{getItem:key=>preferences.get(key),setItem:(key,v)=>{preferences.set(key,v);writes.push(key);}},fetcher:async url=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>new Uint8Array(fs.readFileSync(base+url.split('/').at(-1))).buffer}),...extra});return {context,audio,writes,preferences};}

test('22 original short WAV effects have valid PCM samples, nonzero signal, no clipped peaks and distinct stomp voices',()=>{
 assert.equal(Object.keys(manifest.sounds).length,22);
 for(const [id,s] of Object.entries(manifest.sounds)){
  const raw=fs.readFileSync(base+s.path);assert.equal(raw.subarray(0,4).toString(),'RIFF');assert.equal(raw.subarray(8,12).toString(),'WAVE');assert.equal(raw.readUInt16LE(20),1);assert.equal(raw.readUInt16LE(22),1);assert.equal(raw.readUInt32LE(24),24000);assert.equal(raw.readUInt16LE(34),16);assert.equal(raw.length,s.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),s.sha256);
  let peak=0,total=0;for(let i=44;i<raw.length;i+=2){const v=raw.readInt16LE(i);peak=Math.max(peak,Math.abs(v));total+=v*v;}
  assert.ok(peak>1000&&peak<30000,id);assert.ok(total>1e7);assert.ok(s.duration>.06&&s.duration<.5);assert.equal(raw.readInt16LE(44),0);assert.equal(raw.readInt16LE(raw.length-2),0);
 }
 const stomp=['normal','flight','shell','boss','water'].map(k=>manifest.sounds['stomp-'+k].sha256);assert.equal(new Set(stomp).size,5);
});

test('real gameplay emits separate jump, brick, emergence, pickup and five enemy-family stomp events',()=>{
 const g=new Game();g.enemies=[];for(let n=0;n<30;n++)g.step(STEP);g.soundEvents=[];g.step(STEP,{jump:true,jumpPressed:true});for(let n=0;n<10;n++)g.step(STEP,{jump:true,jumpPressed:true});assert.equal(g.soundEvents.filter(e=>e.id==='jump').length,1);
 g.soundEvents=[];g.hitBlock(g.blocks.find(b=>b.item==='carrot'));assert.deepEqual(g.soundEvents.map(e=>e.id),['brick-break','reward-spawn']);g.collect('carrot');assert.equal(g.soundEvents.at(-1).id,'pickup-upgrade');g.collect('seed');assert.equal(g.soundEvents.at(-1).id,'pickup-seed');
 for(const [kind,sound] of [['mushroom','normal'],['winged','flight'],['cabbage','shell'],['fish','water']]){const e={kind,x:80,y:194,w:14,h:14,state:'walk',timer:0,dead:false};g.soundEvents=[];hurtEnemy(g,e,'stomp');assert.equal(g.soundEvents.at(-1).id,'stomp-'+sound);}
 const b=new Game(levelById('1-4'));b.boss.active=true;b.boss.phase='expose';b.soundEvents=[];hurtBoss(b,'stomp');assert.equal(b.soundEvents.at(-1).id,'stomp-boss');const hp=b.boss.hp;hurtBoss(b,'stomp');assert.equal(b.boss.hp,hp);assert.equal(b.soundEvents.at(-1).id,'boss-armor');
});

test('SFX waits for unlock, consumes events once, limits voices and stops on pause, blur, mute and disposal',async()=>{
 const {audio,context,writes}=fixture();await audio.loadManifest();assert.equal(audio.play('jump'),false);await audio.unlock(context);audio.setPaused(false);
 const g=new Game();g.emitSound('jump');audio.update(g);assert.equal(context.nodes.length,1);assert.equal(g.soundEvents.length,0);audio.update(g);assert.equal(context.nodes.length,1);assert.equal(audio.play('jump'),false);
 context.currentTime=.2;for(const id of Object.keys(manifest.sounds))audio.play(id);assert.ok(audio.voices.size<=6);assert.ok(context.nodes.some(n=>n.stopped));
 audio.setPaused(true);assert.equal(audio.voices.size,0);assert.equal(audio.play('jump'),false);audio.setPaused(false);assert.equal(audio.play('jump'),true);audio.setHidden(true);assert.equal(audio.voices.size,0);audio.setHidden(false);
 audio.setVolume(.2);assert.equal(audio.master.gain.value,.2);audio.toggleMute();assert.equal(audio.master.gain.value,0);assert.equal(audio.play('jump'),false);assert.ok(writes.every(k=>k==='veggie-adventure-sfx-v1'));audio.dispose();assert.equal(audio.voices.size,0);
 const review=fixture({persistPreferences:false});review.audio.setVolume(.2);review.audio.toggleMute();assert.equal(review.writes.length,0);
});

test('late sound loads cannot replay a paused action and missing audio does not break gameplay or retry every frame',async()=>{
 let release;const wait=new Promise(r=>release=r),f=fixture({fetcher:async()=>{await wait;return {ok:true,arrayBuffer:async()=>new Uint8Array(fs.readFileSync(base+'jump.wav')).buffer};}});f.audio.sounds={jump:manifest.sounds.jump};const unlock=f.audio.unlock(f.context);f.audio.setPaused(false);f.audio.play('jump');f.audio.setPaused(true);release();await unlock;await Promise.resolve();assert.equal(f.context.nodes.length,0);f.audio.setPaused(false);assert.equal(f.audio.play('jump'),true);
 let requests=0;const broken=fixture({fetcher:async()=>{requests++;return {ok:false};}});broken.audio.sounds={jump:manifest.sounds.jump};await broken.audio.unlock(broken.context);broken.audio.setPaused(false);for(let n=0;n<100;n++)assert.doesNotThrow(()=>broken.audio.play('jump'));await Promise.resolve();assert.equal(requests,1);
});

test('all 22 action WAVs are served over local HTTP with exact bytes and audio MIME types',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const s of Object.values(manifest.sounds)){const r=await fetch('http://127.0.0.1:'+server.address().port+'/assets/audio/sfx/'+s.path);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^audio\/wav/);assert.equal((await r.arrayBuffer()).byteLength,s.bytes);}}
 finally{await new Promise(r=>server.close(r));}
});
