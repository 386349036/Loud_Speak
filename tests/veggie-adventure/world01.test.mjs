import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateBoss,hurtBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import level from '../../public/games/veggie-adventure/levels/world-01/level-1-4.mjs';
import {cameraX} from '../../public/games/veggie-adventure/js/render.mjs';
const arenaX=x=>level.boss.left+x-1424;
import firstLevel from '../../public/games/veggie-adventure/levels/world-01/level-1-1.mjs';
import {chooseGardenAttack} from '../../public/games/veggie-adventure/js/core/garden-boss.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';

test('arena ledges allow upward passage, stable landing and deliberate drop for every form',()=>{
 for(const form of [0,1,2]){
  const l=structuredClone(level);l.boss=null;l.enemies=[];l.items=[];l.spawn={x:l.movers[0].x+8,y:194};
  const g=new Game(l,{form});for(let n=0;n<30;n++)g.step(STEP,{});
  let peak=208;for(let n=0;n<120;n++){g.step(STEP,{jump:true,jumpPressed:n===0});peak=Math.min(peak,g.p.y+g.p.h);}
  assert.ok(peak<160);assert.equal(g.p.y+g.p.h,176);assert.equal(g.p.h,14);
  for(let n=0;n<600;n++)g.step(STEP,{});assert.equal(g.p.y+g.p.h,176);assert.ok(g.movers.every(m=>!m.fallen));
  g.step(STEP,{down:true,jump:true,jumpPressed:true});for(let n=0;n<90;n++)g.step(STEP,{});
  assert.equal(g.p.y+g.p.h,208);assert.equal(g.mode,'playing');
 }
});

test('garden boss selects distance and elevation responses, avoids repeats, and locks telegraphs',()=>{
 const g=new Game(level),b=g.boss;b.cycle=1;b.hp=2;b.x=arenaX(1584);
 g.p.x=arenaX(1430);assert.equal(chooseGardenAttack(g,b),'hop');
 g.p.x=arenaX(1560);g.p.y=194;assert.equal(chooseGardenAttack(g,b),'dash');
 g.p.y=132;assert.equal(chooseGardenAttack(g,b),'seeds');
 b.lastPattern='seeds';assert.notEqual(chooseGardenAttack(g,b),'seeds');
 b.lastPattern=null;b.active=true;b.phase='idle';b.timer=.91;g.p.x=arenaX(1440);g.p.y=194;
 updateBoss(g,STEP,208);assert.equal(b.pattern,'hop');const target=b.targetX;
 g.p.x=arenaX(1690);for(let n=0;n<360&&b.phase!=='expose';n++){updateBoss(g,STEP,0);assert.equal(b.targetX,target);}
 assert.equal(b.phase,'expose');
});

test('garden hit recovery permits retreat without an immediate second body hit',()=>{
 const g=new Game(level),b=g.boss;Object.assign(b,{active:true,phase:'expose',timer:0});g.p.x=b.x;g.p.y=b.y;g.p.hurt=0;
 assert.ok(hurtBoss(g,'stomp'));g.p.hurt=0;let damage=0;g.damage=()=>damage++;
 for(let n=0;n<40;n++){g.p.x=b.x;updateBoss(g,STEP,208);}
 assert.equal(damage,0);assert.equal(b.hp,b.maxHp-1);
});

test('a ledge flush with the garden boss head does not intercept the exposed stomp',()=>{
 for(const form of [0,1,2]){
  const g=new Game(level,{form});g.enemies=[];g.items=[];const b=g.boss;
  Object.assign(b,{active:true,x:arenaX(1480),y:176,phase:'expose',timer:0,invulnerable:0});
  g.p.x=arenaX(1484);g.p.y=168-g.p.h;g.p.vy=100;g.p.grounded=false;
  for(let n=0;n<20&&b.hp===b.maxHp;n++)g.step(STEP,{jump:true});
  assert.equal(b.hp,b.maxHp-1,`form ${form}`);assert.equal(g.mode,'playing');
 }
});

test('later bosses lead a moving target and stationary casters reposition',()=>{
 for(const kind of [6,7]){
  const g=new Game(level);
  g.boss={...level.boss,kind,id:'B0'+kind,active:true,phase:'idle',x:arenaX(1600),timer:0};g.p.x=arenaX(1440);g.p.vx=112;
  const x=g.boss.x;updateBoss(g,.2,208);assert.ok(g.boss.x<x);
  g.boss.timer=.99;updateBoss(g,.02,208);assert.equal(g.boss.phase,'windup');assert.ok(g.boss.targetX>g.p.x);
 }
});

test('seeds can rise through an arena ledge, which catches them on descent',()=>{
 const g=new Game(level);g.p.x=arenaX(1400);g.dangers=[{x:g.movers[0].x+12,y:190,w:6,h:6,vx:0,vy:-120,gravity:0,life:3,kind:'seed'}];
 for(let n=0;n<40;n++)updateDangers(g,STEP);assert.equal(g.dangers.length,1);assert.ok(g.dangers[0].y<176);
 Object.assign(g.dangers[0],{y:160,vy:120});for(let n=0;n<30;n++)updateDangers(g,STEP);assert.equal(g.dangers.length,0);
});

test('garden seed aiming covers the player at the arena edge independently of leap limits',()=>{
 const g=new Game(level),b=g.boss;Object.assign(b,{active:true,x:arenaX(1636),cycle:2,lastPattern:'dash',hp:1,phase:'idle',timer:.71});g.p.x=arenaX(1716);g.p.y=194;g.p.vx=0;
 updateBoss(g,STEP,208);assert.equal(b.pattern,'seeds');assert.ok(b.x+16+b.seedVX*.85>arenaX(1710));
});

test('pre-ledge 1-4 checkpoint migrates without losing score or completed levels',()=>{
 const g=new Game(level);g.score=1234;g.saveCheckpoint();const data=JSON.parse(encodeSave(g,['1-1','1-2','1-3']));data.checkpoint.movers=[];
 const restored=decodeSave(JSON.stringify(data));assert.ok(restored);assert.equal(restored.checkpoint.score,1234);assert.equal(restored.checkpoint.movers.length,3);assert.deepEqual(restored.completed,['1-1','1-2','1-3']);
});

test('1-1 late enemies cannot patrol into the required pit landing buffers',()=>{
 for(const source of firstLevel.enemies.filter(e=>e.patrolLeft!==undefined)){
  const l=structuredClone(firstLevel);l.enemies=[source];l.items=[];l.blocks=[];l.platforms=[{x:0,y:208,w:l.width,h:32}];l.spawn={x:source.patrolLeft-100,y:194};
  const g=new Game(l),directions=new Set();
  for(let n=0;n<120*12;n++){g.step(STEP,{});const e=g.enemies[0];assert.equal(g.mode,'playing');assert.ok(e.x>=source.patrolLeft&&e.x+e.w<=source.patrolRight);directions.add(Math.sign(e.vx));}
  assert.ok(directions.has(1)&&directions.has(-1));
 }
});

test('expanded 1-4 arena keeps the player visible at both edges and the hop landing',()=>{
 const b={...level.boss,active:true};
 for(let x=b.left;x<=b.right+4;x+=4){const camera=cameraX(level,{x},b);assert.ok(x-camera>=0&&x+12-camera<=256);}
 const camera=cameraX(level,{x:arenaX(1685)},b);assert.ok(arenaX(1664)-camera>=0&&arenaX(1664)+32-camera<=256);
});

test('the historical 1-4 experimental pits tolerate four takeoff timings in every standing form',()=>{
 const historic=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-boss-compact-layouts.json',import.meta.url))).find(l=>l.id==='1-4');
 for(const form of [0,1,2])for(const pit of [720,1056])for(const lead of [3,6,9,12]){
  const l=structuredClone(historic);l.enemies=[];l.items=[];l.boss=null;l.spawn={x:pit-96,y:194};
  const g=new Game(l,{form});let launched=false,landed=false;
  for(let n=0;n<300;n++){
   const press=!launched&&g.p.grounded&&g.p.x+g.p.w>=pit-lead;
   if(press)launched=true;
   g.step(STEP,{right:true,jump:launched,jumpPressed:press});
   assert.equal(g.mode,'playing',`${form}/${pit}/${lead}`);
   assert.equal(g.p.h,14);
   if(launched&&g.p.grounded&&g.p.x>=pit+48){landed=true;break;}
  }
  assert.ok(landed,`${form}/${pit}/${lead} did not land`);
 }
});

test('1-4 boss can be stomped with the shared full-speed jump in every form',()=>{
 for(const form of [0,1,2]){
  const l=structuredClone(level);l.enemies=[];l.items=[];
  l.spawn={x:l.boss.x-112,y:194};
  const g=new Game(l,{form});g.boss.active=true;g.boss.phase='expose';
  // Settle beside the boss; use real movement, collision and damage handling.
  for(let n=0;n<30;n++)g.step(STEP,{});
  for(let n=0;n<120;n++)g.step(STEP,{right:true});
  g.boss.timer=0;
  let launched=false;
  for(let n=0;n<120&&g.boss.hp===g.boss.maxHp&&g.mode==='playing';n++){
   const press=!launched&&g.p.grounded;if(press)launched=true;
   const target=g.boss.x+g.boss.w/2-g.p.w/2,projected=g.p.x+g.p.vx*.25;
   g.step(STEP,{right:projected<target-1,left:projected>target+1,jump:true,jumpPressed:press});
  }
  assert.equal(g.boss.hp,g.boss.maxHp-1,`form ${form} cannot reach the weak point`);
  assert.equal(g.p.form,form);
  assert.equal(g.mode,'playing');
 }
});

test('B01 cycles three attacks with locked hop target and timed exposure windows',()=>{
 const g=new Game(level),b=g.boss;g.p.x=b.left+10;g.p.y=180;g.damage=()=>{};
 const patterns=[],windows=[];let prior=b.phase,expose=0,locked;
 for(let i=0;i<120*25;i++){
  updateBoss(g,STEP,208);
  assert.ok(b.x>=b.left&&b.x+b.w<=b.right);
  if(b.phase==='windup'&&prior!=='windup'){locked=b.targetX;patterns.push(b.pattern);}
  if(b.phase==='attack'&&b.pattern==='hop'){g.p.x=b.right-16;assert.equal(b.targetX,locked);}
  if(b.phase==='expose'){expose+=STEP;assert.equal(b.y,176);}
  if(prior==='expose'&&b.phase!=='expose'){windows.push(expose);expose=0;}
  prior=b.phase;
 }
 assert.deepEqual(patterns.slice(0,3),['slam','hop','seeds']);
 assert.ok(windows.length>=3&&windows.every(t=>t>=2.49));
 assert.ok(g.dangers.some(d=>d.kind==='seed')&&g.dangers.some(d=>d.kind==='wave'));
 b.phase='expose';b.timer=0;b.invulnerable=0;b.hp=1;assert.equal(hurtBoss(g,'stomp'),true);assert.equal(b.dead,true);assert.equal(g.dangers.length,0);
});
