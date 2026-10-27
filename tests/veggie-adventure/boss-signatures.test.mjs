import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {updateBoss,hurtBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {SIGNATURES,releaseSignature,updateSignatureDanger,signatureTargets} from '../../public/games/veggie-adventure/js/core/boss-signatures.mjs';
import {bossVulnerable,BOSS_SKILLS} from '../../public/games/veggie-adventure/js/core/boss-balance.mjs';
import {bossCue} from '../../public/games/veggie-adventure/js/core/boss-cues.mjs';
import {updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';
import {createRenderer,cameraX} from '../../public/games/veggie-adventure/js/render.mjs';
const encounter=(world,form=0)=>{const g=new Game(levelById(`${world}-4`),{form}),b=g.boss;g.p.x=b.left+20;g.p.y=208-g.p.h;g.enemies=[];g.items=[];return g;};

test('each of seven bosses actually selects its theme attack during autonomous normal and rage rotations',()=>{
 for(let world=2;world<=8;world++)for(const rage of [false,true]){
  const g=encounter(world),b=g.boss;g.p.star=999;if(rage)b.hp=2;let last=0;const casts=[];
  for(let n=0;n<90/STEP;n++){g.step(STEP);if(b.cycle!==last){casts.push({key:b.pattern,time:g.time});if(b.pattern===SIGNATURES[world])assert.ok(b.windupDuration>=1);last=b.cycle;}}
  assert.ok(casts.some(c=>c.key===SIGNATURES[world]),`${world} theme move starved`);
  const recent=new Map();for(const c of casts){if(recent.has(c.key))assert.ok(c.time-recent.get(c.key)>=BOSS_SKILLS[world][c.key].cooldown-STEP-.001);recent.set(c.key,c.time);}
 }
});
test('theme attack always completes and gives every form a reachable, damageable weak phase',()=>{
 for(let world=2;world<=8;world++)for(const form of [0,1,2]){
  const g=encounter(world,form),b=g.boss;g.p.star=999;Object.assign(b,{active:true,phase:'windup',pattern:SIGNATURES[world],timer:.99,windupDuration:1,direction:-1,targetX:g.p.x});
  let released=false;for(let i=0;i<8/STEP&&!bossVulnerable(b);i++){g.step(STEP);released||=b.phase==='attack';}
  assert.ok(released);assert.ok(bossVulnerable(b),`${world} stuck`);assert.ok(!g.dangers.some(d=>d.kind==='boss-theme'));const hp=b.hp;
  // Place the character immediately above the real weak surface, then let physics land.
  g.p.x=b.x+8;g.p.y=b.y-g.p.h-2;g.p.vy=60;g.p.grounded=false;
  for(let i=0;i<30&&b.hp===hp;i++)g.step(STEP);
  assert.equal(b.hp,hp-1,`${world}/form${form} stomp weak point`);
 }
});
test('theme warnings never damage early and active areas have finite life, with no full-arena wall',()=>{
 for(const world of [2,4,6]){
  const g=encounter(world),b=g.boss;Object.assign(b,{targetX:g.p.x,pattern:SIGNATURES[world]});const targets=signatureTargets(b);assert.ok(targets.length>=2);assert.ok(targets.reduce((s,t)=>s+t.w,0)<(b.right-b.left)/3);
  releaseSignature(g,b);let hits=0;g.damage=()=>hits++;const d=g.dangers[0];g.p.x=d.x;g.p.y=194;
  updateSignatureDanger(g,d,d.delay-.001);assert.equal(hits,0);assert.equal(d.life,.7*(world!==4)+.65*(world===4));
  updateSignatureDanger(g,d,.01);assert.equal(hits,0);updateSignatureDanger(g,d,.01);assert.equal(hits,1);
  for(let n=0;n<600;n++)updateDangers(g,STEP);assert.equal(g.dangers.length,0);
 }
});
test('returning lance, bouncing pod, coordinated twins and splitting core are distinct moving hazards',()=>{
 const lance=encounter(3);Object.assign(lance.boss,{direction:-1,pattern:SIGNATURES[3],targetX:900});releaseSignature(lance,lance.boss);const l=lance.dangers[0];const initial=l.vx;for(let i=0;i<120;i++)updateSignatureDanger(lance,l,STEP);assert.equal(l.vx,-initial);assert.equal(l.y,158);
 const durian=encounter(5);Object.assign(durian.boss,{direction:-1});releaseSignature(durian,durian.boss);const pod=durian.dangers[0];for(let i=0;i<150;i++)updateSignatureDanger(durian,pod,STEP);assert.ok(pod.bounces>0);assert.ok(pod.bounces<=3);
 const twins=encounter(7);releaseSignature(twins,twins.boss);assert.equal(twins.dangers.length,2);assert.ok(twins.dangers[0].vx>0&&twins.dangers[1].vx<0);assert.notEqual(twins.dangers[0].y,twins.dangers[1].y);
 const king=encounter(8);king.boss.targetX=1000;releaseSignature(king,king.boss);let hits=0;king.damage=()=>hits++;king.p.x=1000;king.p.y=116;for(let i=0;i<140;i++)updateDangers(king,STEP);assert.equal(hits,0);assert.equal(king.dangers.length,4);assert.ok(king.dangers.every(d=>d.behavior==='shard'));for(let i=0;i<400;i++)updateDangers(king,STEP);assert.equal(king.dangers.length,0);
});
test('boss shots survive one-way platforms and lotus body never sinks into dry arena floor',()=>{
 const g=encounter(3);g.p.star=999;const m=g.movers.find(m=>m.arena);g.dangers=[{x:m.x+4,y:m.y-5,w:6,h:6,vx:0,vy:100,life:2,kind:'seed',ignoreOneWay:true}];updateDangers(g,.1);assert.equal(g.dangers.length,1);g.dangers[0].y=206;updateDangers(g,.1);assert.equal(g.dangers.length,0);
 const water=encounter(4);water.p.star=999;for(let i=0;i<10/STEP;i++){water.step(STEP);if(['idle','windup'].includes(water.boss.phase))assert.ok(water.boss.y+water.boss.h<=208);}
});
test('all seven generated effect sheets and warning icons decode with alpha and stage documentation',async()=>{
 const m=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
 for(let world=2;world<=8;world++){
  const b={kind:world,pattern:SIGNATURES[world]};assert.match(bossCue(b).hint,/：/);
  for(const [id,size] of [[`boss-fx-${world}`,256],[bossCue(b).asset,96]]){const a=m.assets.find(a=>a.id===id);assert.ok(a,id);const {data,info}=await sharp('public/games/veggie-adventure/assets/'+a.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,size);assert.equal(info.height,size);assert.ok(info.channels===4);let clear=0,solid=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>200)solid++;}assert.ok(clear>size*size*.1&&solid>100);}
 }
});
test('returning lance turns at arena edges, and offscreen theme projectiles retain PNG warnings in narrow views',()=>{
 const g=encounter(3);g.p.x=g.boss.left+200;Object.assign(g.boss,{x:g.boss.left+20,direction:-1});releaseSignature(g,g.boss);const d=g.dangers[0];for(let i=0;i<80&&d.life>0;i++)updateSignatureDanger(g,d,STEP);assert.ok(d.turned);assert.ok(d.life<=0,'returned lance must be caught');
 const a=encounter(7);Object.assign(a.boss,{active:true,phase:'attack',pattern:SIGNATURES[7]});releaseSignature(a,a.boss);const calls=[],m=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
 const ctx=new Proxy({drawImage(img,...args){calls.push({id:img.id,args});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const width=256,cam=cameraX(a.level,a.p,a.boss,width);assert.ok(a.dangers[1].x>cam+width);
 createRenderer({width:width*3,getContext:()=>ctx},new Map(m.assets.map(a=>[a.id,{id:a.id}])),null)(a);
 assert.ok(calls.some(c=>c.id==='boss-fx-7'&&c.args[6]===14));assert.ok(calls.some(c=>c.id==='boss-cue-dash'&&c.args[2]===14));
});
