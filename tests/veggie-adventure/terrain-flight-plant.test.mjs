import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {updateEnemies,hurtEnemy} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
const manifest=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
function scene(form=0){const l=structuredClone(LEVELS[0]);Object.assign(l,{width:600,exit:580,platforms:[{x:0,y:208,w:600,h:32}],water:[],hazards:[],blocks:[],items:[],enemies:[],movers:[],turrets:[],gates:[],boss:null,spawn:{x:220,y:194}});const g=new Game(l,{form});g.p.y=208-g.p.h;g.p.grounded=true;return g;}
function flyer(g){const e={id:0,kind:'winged',x:160,y:112,w:14,h:14,vx:0,vy:0,state:'walk',timer:0,grace:0,dead:false,phase:0,homeX:160,homeY:112};g.enemies=[e];return e;}

test('all sixteen terrain tiles are opaque and join exactly across repeats and soil-to-stone boundaries',async()=>{
 for(let world=1;world<=8;world++){
  const data=[];for(let cell=0;cell<2;cell++){
   const a=manifest.assets.find(a=>a.id===`W${String(world).padStart(2,'0')}-kit-${cell}`),raw=await sharp('public/games/veggie-adventure/assets/'+a.path).ensureAlpha().raw().toBuffer();data.push(raw);assert.equal(raw.length,48*48*4);
   for(let i=3;i<raw.length;i+=4)assert.equal(raw[i],255);
   for(let y=0;y<48;y++)assert.deepEqual(raw.subarray(y*48*4,y*48*4+4),raw.subarray((y*48+47)*4,(y*48+48)*4));
   if(cell)assert.deepEqual(raw.subarray(0,48*4),raw.subarray(47*48*4));
  }assert.deepEqual(data[0].subarray(47*48*4),data[1].subarray(0,48*4));
 }
});

test('every actor frame registers its visible silhouette to the foot anchor without editing PNGs',async()=>{
 let frames=0;for(const [id,a] of Object.entries(manifest.animations.actors)){
  if(!/^(P01-|E\d|B\d|N\d)/.test(id))continue;
  const asset=manifest.assets.find(v=>v.id===a.asset),{data,info}=await sharp('public/games/veggie-adventure/assets/'+asset.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(const [name,clip] of Object.entries(a.clips))for(let f=0;f<4;f++){
   const pad=a.footOffsets[name][f],y=a.frameHeight-1-pad;assert.ok(Number.isInteger(pad)&&pad>=0&&pad<a.frameHeight);
   let ink=0;for(let x=0;x<a.frameWidth;x++)if(data[((clip.row*a.frameHeight+y)*info.width+f*a.frameWidth+x)*4+3]>40)ink++;assert.ok(ink>=2,id+'/'+name+'/'+f);frames++;
  }
 }assert.ok(frames>500);
});

test('winged enemies warn then actually dive to hit a standing hero in all three forms',()=>{
 for(const form of [0,1,2]){
  const g=scene(form),e=flyer(g);let warning=false,hit=false;
  for(let n=0;n<360;n++){
   g.step(STEP);if(e.aiWarning)warning=true;
   if(n<84){assert.equal(g.mode,'playing');assert.equal(g.p.form,form);}
   if(g.mode==='dead'||g.p.form!==form){hit=true;assert.equal(e.intent,'intercept');assert.ok(e.y>168);break;}
  }assert.ok(warning);assert.ok(hit,'no real attack for form '+form);
 }
});

test('the renderer rounds both sprite edges and places visible boots on the collision support line',()=>{
 const g=scene(),images=new Map(manifest.assets.map(a=>[a.id,{id:a.id}]));g.boss={id:'B07',kind:7,x:320,y:176,w:32,h:32,active:false,dead:false,phase:'idle',timer:0,hp:10};
 const draws=[],stack=[];let ty=0;const ctx=new Proxy({save(){stack.push(ty);},restore(){ty=stack.pop();},translate(x,y){ty+=y;},setTransform(){ty=0;},drawImage(img,...args){if(args.length===8)draws.push({id:img.id,y:ty+args[5],h:args[7]});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const animation={get:key=>key===g.p?{actor:'P01-0',clip:'idle',elapsed:0}:key==='boss'?{actor:'B07',clip:'idle',elapsed:0}:null};
 createRenderer({getContext:()=>ctx},images,animation,{actors:manifest.animations.actors})(g);
 for(const id of ['P01-0','B07']){const actor=manifest.animations.actors[id],draw=draws.find(d=>d.id===actor.asset),pad=actor.footOffsets.idle[0];assert.ok(draw);assert.ok(Number.isInteger(draw.y)&&Number.isInteger(draw.h));assert.ok(Math.abs(draw.y+draw.h*(1-pad/actor.frameHeight)-208)<=.6,id+' floating feet');}
});

test('a diving flyer follows a changed target continuously and returns smoothly after losing it',()=>{
 const g=scene(),e=flyer(g);let hits=0;g.damage=()=>hits++;
 for(let n=0;n<120&&!e.aiWarning;n++){g.time+=STEP;updateEnemies(g,STEP,0);}assert.ok(e.aiWarning);g.p.x=300;
 let prior={x:e.x,y:e.y};for(let n=0;n<360&&!hits;n++){
  updateEnemies(g,STEP,0);assert.ok(Math.abs(e.x-prior.x)<=112*STEP+1e-6);assert.ok(Math.abs(e.y-prior.y)<=80*STEP+1e-6);prior={x:e.x,y:e.y};
 }assert.ok(hits>0,'changing sides must not leave the flyer attacking an empty old position');
 g.p.x=580;for(let n=0;n<1200;n++)updateEnemies(g,STEP,0);
 assert.equal(e.brain.engaged,false);assert.ok(Math.abs(e.y-e.homeY)<=.1);assert.ok(Math.abs(e.x-e.homeX)<=24.1);
});

test('water-world plants root on the pool bed with open swimming space and remain stompable in every form',()=>{
 let count=0;for(const l of LEVELS.filter(l=>l.world===4)){
  const plants=l.enemies.filter(e=>e.kind==='anemone');assert.ok(plants.length>=5,l.id);count+=plants.length;
  for(const e of plants){const pool=l.water.find(w=>e.x>w.x&&e.x+e.w<w.x+w.w);assert.ok(pool);assert.ok(pool.h-e.h>=32);assert.ok(l.platforms.some(p=>e.x<p.x+p.w&&e.x+e.w>p.x&&e.y+e.h===p.y));assert.ok(![...l.platforms,...l.blocks].some(p=>overlap(e,p)));}
  assert.ok(decodeSave(encodeSave(new Game(l))));
 }
 assert.equal(count,54);
 for(const form of [0,1,2]){const g=scene(form),e={id:0,kind:'anemone',x:180,y:200,w:20,h:24,homeX:180,homeY:200,vx:0,vy:0,state:'walk',timer:0,grace:0,dead:false,cooldown:2};g.level.platforms=[{x:0,y:224,w:600,h:16}];g.level.water=[{x:96,y:144,w:240,h:80}];g.enemies=[e];Object.assign(g.p,{x:184,y:e.y-g.p.h+.2,vy:40});updateEnemies(g,STEP,e.y);assert.ok(e.dead);assert.equal(e.hp,0);assert.equal(g.p.form,form);assert.equal(g.mode,'playing');}
});

test('losing wings after a dive retains the current position rather than snapping to the old flight patrol',()=>{
 const g=scene(),e=flyer(g);Object.assign(e,{x:244,y:170,homeX:160,patrolLeft:140,patrolRight:200});
 assert.equal(hurtEnemy(g,e,'stomp'),true);assert.equal(e.kind,'cabbage');assert.equal(e.x,244);updateEnemies(g,STEP,0);assert.ok(Math.abs(e.x-244)<1);assert.equal(e.hp,2);
});

test('pre-plant version-two water-world saves retain run state when upgrading to the planted maps',()=>{
 for(const l of LEVELS.filter(l=>l.world===4)){
  const g=new Game(l,{score:18000,form:1,rebirths:1}),d=JSON.parse(encodeSave(g,['1-4','2-4','3-4']));d.layoutVersion=2;d.checkpoint.enemies=d.checkpoint.enemies.filter(e=>e.kind!=='anemone');d.checkpoint.blocks=d.checkpoint.blocks.filter(b=>b.item!=='rebirth');
  const saved=decodeSave(JSON.stringify(d));assert.ok(saved,l.id);assert.equal(saved.layoutVersion,l.layoutVersion);assert.ok(saved.layoutMigrated);assert.equal(saved.run.rebirths,1);assert.equal(saved.run.entryScore,18000);assert.equal(saved.run.entryForm,1);assert.ok(saved.checkpoint.enemies.some(e=>e.kind==='anemone'));
 }
});

test('rooted plants telegraph and lock a real damaging projectile, keep cooldowns, and do not attack outside water',()=>{
 const g=scene(),e={id:0,kind:'anemone',x:160,y:200,w:20,h:24,homeX:160,homeY:200,vx:0,vy:0,state:'walk',timer:0,grace:0,dead:false,cooldown:0};g.level.platforms=[{x:0,y:224,w:600,h:16}];g.level.water=[{x:96,y:144,w:240,h:80}];g.enemies=[e];g.p.y=200;
 updateEnemies(g,STEP,0);assert.equal(e.plantPhase,'windup');const aim=[e.aimX,e.aimY];let warning=0;
 for(let n=0;n<200&&g.dangers.length===0;n++){updateEnemies(g,STEP,0);if(e.warning)warning+=STEP;assert.deepEqual([e.aimX,e.aimY],aim);}assert.ok(warning>=.69);assert.equal(g.dangers.length,1);assert.equal(e.cooldown,3.4);
 let hit=false;g.damage=()=>{hit=true;};for(let n=0;n<240&&!hit;n++)updateDangers(g,STEP);assert.ok(hit,'spore must reach its locked target');
 const d={x:335,y:150,w:6,h:6,vx:64,vy:0,life:2,aquatic:true};g.dangers=[d];g.p.x=350;g.p.y=150;for(let n=0;n<60;n++)updateDangers(g,STEP);assert.equal(g.dangers.length,0);
 g.p.x=400;g.dangers=[];for(let n=0;n<120*8;n++)updateEnemies(g,STEP,0);assert.equal(g.dangers.length,0);assert.equal(e.x,160);assert.equal(e.y+e.h,224);
});
