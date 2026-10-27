import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {observeBoss,rememberBossAttack} from '../../public/games/veggie-adventure/js/core/boss-awareness.mjs';
import {gardenDecision} from '../../public/games/veggie-adventure/js/core/garden-boss.mjs';
import {updateBoss,hurtBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
const arenaX=x=>levelById('1-4').boss.left+x-1424;
const fixture=()=>{const g=new Game(levelById('1-4'));Object.assign(g.boss,{active:true,x:arenaX(1600),phase:'idle',cycle:1});Object.assign(g.p,{x:arenaX(1504),y:194,vx:0,vy:0});g.damage=()=>{};return g;};
const watch=(g,seconds)=>{for(let n=0;n<seconds/STEP;n++)observeBoss(g,STEP);};

test('garden boss observes camping before choosing a flank, and movement clears that habit',()=>{
 const g=fixture(),b=g.boss;watch(g,.5);assert.equal(gardenDecision(g,b).pattern,'seeds');
 watch(g,2.1);assert.deepEqual(gardenDecision(g,b),{pattern:'hop',intent:'flank'});
 b.timer=1;updateBoss(g,STEP,208);assert.equal(b.intent,'flank');assert.ok(b.targetX<g.p.x-24);
 g.p.x+=64;observeBoss(g,STEP);assert.equal(b.awareness.camp,0);
});

test('extended platform camping prompts a telegraphed landing that fits the platform and stays locked',()=>{
 const g=fixture(),b=g.boss;g.p.x=g.movers[1].x+8;g.p.y=g.movers[1].y-g.p.h;watch(g,2.6);
 assert.equal(gardenDecision(g,b).intent,'dislodge');
 // Even a recognized habit must not replace the teaching opener.
 b.cycle=0;assert.equal(gardenDecision(g,b).pattern,'slam');b.cycle=1;
 b.timer=1;updateBoss(g,STEP,160);assert.equal(b.targetFloor,160);
 assert.ok(b.targetX>=g.movers[1].x&&b.targetX+b.w<=g.movers[1].x+g.movers[1].w);
 const target=[b.targetX,b.targetY,b.seedVX,b.seedVY];g.p.x=arenaX(1700);g.p.y=194;
 for(let n=0;n<300&&b.phase!=='expose';n++){updateBoss(g,STEP,0);assert.deepEqual([b.targetX,b.targetY,b.seedVX,b.seedVY],target);}
 assert.equal(b.phase,'expose');assert.ok(b.exposeTime>=3.2);
});

test('fire pressure comes from visible firing, decays, and does not infer intent from a power-up',()=>{
 const g=fixture(),b=g.boss;g.p.form=2;watch(g,1);assert.equal(b.awareness.fire,0);
 for(let n=0;n<3;n++){g.p.shotCooldown=.25;observeBoss(g,STEP);g.p.shotCooldown=0;watch(g,.3);}
 assert.ok(b.awareness.fire>=1.5);assert.equal(gardenDecision(g,b).intent,'flank');
 b.lastPattern='hop';assert.equal(gardenDecision(g,b).intent,'suppress');
 g.p.x+=64;watch(g,7);assert.equal(b.awareness.fire,0);
});

test('adaptive responses have a turn cooldown and only retain three recent attacks',()=>{
 const g=fixture(),b=g.boss;watch(g,3);Object.assign(b,gardenDecision(g,b));rememberBossAttack(b);
 assert.equal(b.intent,'flank');b.lastPattern=b.pattern;b.cycle++;
 assert.ok(!['flank','dislodge','suppress'].includes(gardenDecision(g,b).intent));
 for(let n=0;n<20;n++)rememberBossAttack(b);assert.equal(b.awareness.recent.length,3);
 b.cycle=b.awareness.nextAdaptCycle;b.lastPattern='seeds';assert.equal(gardenDecision(g,b).intent,'flank');
});

test('casters react after a delay, seek space at an edge, and stop evading once a cue starts',()=>{
 for(const kind of [6,7]){
  const g=fixture(),b=g.boss;b.kind=kind;g.p.x=arenaX(1520);
  g.shots=[{x:arenaX(1540),y:190,w:4,h:4,vx:150,life:2}];
  const x=b.x;updateBoss(g,.1,0);assert.equal(b.x,x);
  updateBoss(g,.13,0);assert.ok(b.x>x);
  b.x=b.right-b.w-9;g.p.x=b.x-80;g.shots[0].x=b.x-60;
  const edge=b.x;updateBoss(g,.1,0);assert.ok(b.x<edge);
  b.timer=1;updateBoss(g,STEP,0);assert.equal(b.phase,'windup');
  const locked=[b.x,b.direction,b.targetX];g.p.x=b.x+12;
  for(let n=0;n<30;n++)updateBoss(g,STEP,0);
  assert.deepEqual([b.x,b.direction,b.targetX],locked);
 }
});

test('all eight exposed bosses keep their opening under sustained fire pressure',()=>{
 for(let world=1;world<=8;world++){
  const g=new Game(levelById(`${world}-4`)),b=g.boss;g.damage=()=>{};
  Object.assign(b,{active:true,phase:'expose',timer:0,invulnerable:0});g.p.x=b.left;g.p.y=194;
  const pose=[b.x,b.y];
  for(let n=0;n<100;n++){g.p.shotCooldown=n%20===0?.25:0;updateBoss(g,STEP,0);assert.equal(b.phase,'expose');assert.deepEqual([b.x,b.y],pose);}
  assert.equal(hurtBoss(g,'fire'),true);assert.equal(b.hp,b.maxHp-1);assert.equal(hurtBoss(g,'fire'),false);assert.equal(b.hp,b.maxHp-1);
  while(!b.dead){Object.assign(b,{phase:'expose',timer:0});assert.equal(hurtBoss(g,'fire'),true);}assert.equal(b.hp,0);assert.equal(hurtBoss(g,'fire'),false);
 }
});

test('boss observations round-trip through checkpoints and a retry restores the earlier memory',()=>{
 const g=fixture();watch(g,3);g.saveCheckpoint();const memory=structuredClone(g.boss.awareness);
 const save=decodeSave(encodeSave(g));assert.ok(save);assert.deepEqual(save.checkpoint.boss.awareness,memory);
 g.p.x+=70;observeBoss(g,STEP);assert.equal(g.boss.awareness.camp,0);
 g.restore();assert.deepEqual(g.boss.awareness,memory);
 const fresh=fixture();fresh.restore();assert.equal(fresh.boss.awareness,undefined);
});

test('final boss changes its follow-up against camping instead of repeating a single attack',()=>{
 const g=new Game(levelById('8-4')),b=g.boss;g.damage=()=>{};
 Object.assign(b,{active:true,phase:'idle',timer:1,cycle:1});g.p.x=b.left;g.p.y=194;watch(g,3);
 updateBoss(g,STEP,0);const first=b.pattern;
 Object.assign(b,{phase:'idle',timer:1,cycle:2});updateBoss(g,STEP,0);
 assert.notEqual(b.pattern,first);
});

test('every form has time to reach the raised right-platform weak point after returning to the middle ledge',()=>{
 for(const form of [0,1,2]){
  const g=new Game(levelById('1-4'),{form}),b=g.boss;g.enemies=[];g.items=[];
  Object.assign(b,{active:true,hp:1,phase:'attack',pattern:'hop',timer:1.1,startX:arenaX(1586),startY:176,targetX:arenaX(1664),targetY:144});
  Object.assign(g.p,{x:arenaX(1570),y:160-g.p.h,vx:0,vy:0,grounded:true});
  updateBoss(g,STEP,160);assert.equal(b.phase,'expose');assert.ok(b.exposeTime>=3.4);
  b.timer=1.47;
  for(let n=0;n<72;n++)g.step(STEP,{right:true});
  for(let n=0;n<96&&!b.dead;n++)g.step(STEP,{right:true,jump:true,jumpPressed:n===0});
  assert.equal(b.dead,true,`form ${form} missed the raised weak point`);assert.equal(g.p.form,form);assert.equal(g.mode,'playing');
 }
});
