import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {ENEMY_ART,updateEnemies,hurtEnemy} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {ENEMY_HP,prepareEnemyHealth} from '../../public/games/veggie-adventure/js/core/enemy-health.mjs';
import {updateBoss,hurtBoss,bossHitbox,bossWeakTop} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {playerSize} from '../../public/games/veggie-adventure/js/core/player-size.mjs';
import {spriteBox,playerBox,shieldBox} from '../../public/games/veggie-adventure/js/core/sprite-layout.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function flat(form=0){const g=new Game(undefined,{form});Object.assign(g.level,{platforms:[{x:0,y:208,w:4096,h:32}],water:[],hazards:[],width:4096,exit:4000,checkpoint:3900});g.enemies=[];g.blocks=[];g.movers=[];g.turrets=[];g.items=[];g.gates=[];g.boss=null;return g;}
function actor(kind){return {id:0,kind,x:120,y:150,w:14,h:14,vx:0,vy:0,state:'walk',timer:0,grace:0,dead:false,phase:2,active:true};}
function placeStomp(g,e){g.p.x=e.x+(e.w-g.p.w)/2;g.p.y=e.y-g.p.h+.2;g.p.vy=40;return e.y;}

test('all 12 exposed enemy types lose HP on a stomp in all forms, including underwater',()=>{
 for(const kind of Object.keys(ENEMY_ART))for(const form of [0,1,2])for(const water of [false,true]){
  const g=flat(form),e=actor(kind);g.enemies=[e];prepareEnemyHealth(e);g.p.inWater=water;updateEnemies(g,STEP,-Infinity);
  const hp=e.hp;
  for(let hit=1;hit<=hp;hit++){
   if(e.state==='shell'){e.state='walk';e.timer=0;}if(e.kind==='trap')e.phase=2;e.leapPhase='rise';e.leapTimer=0;e.active=true;
   updateEnemies(g,STEP,placeStomp(g,e));
   assert.equal(e.hp,hp-hit,`${kind}/${form}/water=${water}/hit=${hit}`);assert.equal(g.mode,'playing');assert.equal(g.p.form,form);assert.ok(g.p.vy<0);
   if(hit<hp){assert.ok(!e.dead);if(kind==='winged'&&hit===1)assert.equal(e.kind,'cabbage');else assert.equal(e.state,'shell');}
  }
  assert.ok(e.dead);assert.equal(e.hp,0);
 }
});

test('all 12 enemies take one damage per fireball without immunity or duplicate score',()=>{
 for(const kind of Object.keys(ENEMY_ART)){
  const g=flat(),e=actor(kind);g.enemies=[e];prepareEnemyHealth(e);const initial=e.hp;
  for(let hit=1;hit<=initial;hit++){assert.ok(hurtEnemy(g,e,'fire'));assert.equal(e.hp,initial-hit);}
  assert.ok(e.dead);const score=g.score;assert.equal(hurtEnemy(g,e,'fire'),false);assert.equal(g.score,score);
 }
});

test('base hero safely bounces on a shell without draining HP, then can hit after the enemy wakes',()=>{
 const g=flat(),e=actor('cabbage');Object.assign(e,{y:194,x:120});g.enemies=[e];placeStomp(g,e);
 let changes=0,previous=2;for(let i=0;i<360;i++){g.step(STEP,{jump:true});if(e.hp!==previous){changes++;previous=e.hp;}assert.equal(g.mode,'playing');}
 assert.equal(e.hp,1);assert.equal(changes,1);assert.ok(!e.dead);assert.equal(g.p.form,0);
 g.p.x=20;e.timer=8.999;updateEnemies(g,STEP,0);assert.equal(e.state,'walk');updateEnemies(g,STEP,placeStomp(g,e));assert.ok(e.dead);assert.equal(e.hp,0);
});

test('all eight bosses take stomp damage only in an open weak window in every player form',()=>{
 for(let world=1;world<=8;world++)for(const phase of ['idle','windup','attack','expose','recover'])for(const form of [0,1,2]){
  const g=new Game(levelById(`${world}-4`),{form}),b=g.boss;g.damage=()=>{};
  Object.assign(b,{active:true,phase,timer:0,invulnerable:99,pattern:'seeds',recoverX:b.x,recoverTo:b.x,direction:1,startX:b.x,startY:b.y,targetX:b.x,targetY:b.y});
  const top=bossWeakTop(g,b);g.p.x=b.x+(b.w-g.p.w)/2;g.p.y=top-g.p.h+.2;g.p.vy=40;g.p.inWater=true;
  updateBoss(g,0,top);assert.equal(b.hp,b.maxHp-(phase==='expose'?1:0),`${world}/${phase}/${form}`);
  assert.equal(hurtBoss(g,'fire'),false);const hp=b.hp;
  Object.assign(b,{phase:'expose',timer:0});assert.ok(hurtBoss(g,'stomp'));assert.equal(b.hp,hp-1);assert.equal(hurtBoss(g,'stomp'),false);
  while(!b.dead){Object.assign(b,{phase:'expose',timer:0});assert.ok(hurtBoss(g,'fire'));}assert.equal(b.hp,0);
  const score=g.score;assert.equal(hurtBoss(g,'stomp'),false);assert.equal(g.score,score);
 }
});

test('both halves of the twin boss are hittable and ascent or side contact does not count as a stomp',()=>{
 for(const head of [0,1])for(const half of [4,24]){
  const g=new Game(levelById('7-4')),b=g.boss;Object.assign(b,{active:true,phase:'expose',timer:0,head});
  assert.equal(bossHitbox(b).w,b.w);g.p.x=b.x+half-g.p.w/2;g.p.y=b.y-g.p.h+.2;g.p.vy=40;updateBoss(g,0,b.y);assert.equal(b.hp,b.maxHp-1);
 }
 for(const side of [false,true]){const g=flat(),e=actor('spike');g.enemies=[e];placeStomp(g,e);if(side)g.p.y=e.y;else g.p.vy=-40;updateEnemies(g,0,e.y);assert.equal(e.hp,2);assert.equal(g.mode,'dead');}
});

test('enemy HP survives checkpoints and legacy checkpoints initialize shell HP once',()=>{
 const g=new Game(),e=g.enemies.find(e=>e.kind==='cabbage');assert.ok(e);hurtEnemy(g,e,'stomp');assert.equal(e.hp,1);g.saveCheckpoint();
 let saved=decodeSave(encodeSave(g));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();let restored=g.enemies.find(v=>v.id===e.id);assert.equal(restored.hp,1);assert.equal(restored.maxHp,2);g.restore();assert.equal(g.enemies.find(v=>v.id===e.id).hp,1);
 const legacy=JSON.parse(encodeSave(g));for(const enemy of legacy.checkpoint.enemies){delete enemy.hp;delete enemy.maxHp;delete enemy.hitFlash;}
 saved=decodeSave(JSON.stringify(legacy));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();restored=g.enemies.find(v=>v.id===e.id);assert.equal(restored.hp,1);prepareEnemyHealth(restored);assert.equal(restored.hp,1);
 const malformed=JSON.parse(encodeSave(g));malformed.checkpoint.enemies[0].hp=99;assert.equal(decodeSave(JSON.stringify(malformed)),null);
});

test('evolved art, collision and shield shrink 20 percent, retaining foot centre without repeated shrink',()=>{
 const actors=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')).animations.actors;
 for(const form of [0,1,2]){
  const g=flat(form),p=g.p,foot=p.y+p.h,centre=p.x+p.w/2,actor=actors[`P01-${form}`],old=spriteBox(p,actor,16,32),box=playerBox(p,actor,16,32),scale=form?.8:1;
  near(box.w,old.w*scale);near(box.h,old.h*scale);near(box.y+box.h,foot);near(box.x+box.w/2,centre);assert.deepEqual({w:p.w,h:p.h},playerSize(form));
  for(let i=0;i<50;i++){g.resizePlayer(true);near(p.h,form?11.2:14);g.resizePlayer(false);near(p.y+p.h,foot);near(p.x+p.w/2,centre);}
  if(form){near(shieldBox(p).h,48*.8);g.damage();assert.equal(p.form,0);assert.equal(p.w,12);assert.equal(p.h,14);near(p.y+p.h,foot);near(p.x+p.w/2,centre);}
 }
});

test('old grown saves migrate at the same foot centre and all forms keep identical jump trajectories',()=>{
 for(const form of [1,2]){
  const g=new Game(undefined,{form}),d=JSON.parse(encodeSave(g)),p=d.checkpoint.p,foot=p.y+p.h,centre=p.x+p.w/2;
  Object.assign(p,{x:centre-6,y:foot-28,w:12,h:28});const saved=decodeSave(JSON.stringify(d));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();near(g.p.h,22.4);near(g.p.w,9.6);near(g.p.y+g.p.h,foot);near(g.p.x+g.p.w/2,centre);
  g.saveCheckpoint();assert.ok(decodeSave(encodeSave(g)));
 }
 const games=[0,1,2].map(form=>flat(form));for(const g of games){for(let n=0;n<150;n++)g.step(STEP,{right:true});}
 const origins=games.map(g=>({x:g.p.x,foot:g.p.y+g.p.h}));
 for(let n=0;n<150;n++){
  for(const g of games)g.step(STEP,{right:true,jump:true,jumpPressed:n===0});
  for(let i=1;i<3;i++){near(games[i].p.x-origins[i].x,games[0].p.x-origins[0].x);near(games[i].p.y+games[i].p.h-origins[i].foot,games[0].p.y+games[0].p.h-origins[0].foot);}
 }
});
