import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {hurtBoss,exposeDuration,bossVulnerable} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {hurtEnemy,updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {prepareEnemyHealth} from '../../public/games/veggie-adventure/js/core/enemy-health.mjs';
import {enemyClip,AnimationPlayer} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';

function flat(form=0){const g=new Game(undefined,{form});Object.assign(g.level,{platforms:[{x:0,y:208,w:4096,h:32}],water:[],hazards:[],width:4096,exit:4000});for(const key of ['enemies','blocks','movers','turrets','items','gates'])g[key]=[];g.boss=null;return g;}
function shell(kind,state='shell'){return {id:0,kind,x:120,y:194,w:14,h:14,vx:state==='rolling'?150:0,vy:0,state,timer:2,grace:0,dead:false,grounded:true,hp:1,maxHp:2};}
function stomp(g,e){Object.assign(g.p,{x:e.x+(e.w-g.p.w)/2,y:e.y-g.p.h+.2,vy:40});updateEnemies(g,STEP,e.y);}

test('all eight boss guards reject both attacks without awarding score, clearing danger or consuming cooldowns',()=>{
 for(let world=1;world<=8;world++)for(const method of ['stomp','fire']){
  const g=new Game(levelById(`${world}-4`)),b=g.boss;b.active=true;
  const danger={x:0,y:0,w:4,h:4};g.dangers=[danger];const cooldowns=JSON.stringify(b.skillCooldowns);
  for(const phase of ['idle','windup','attack','recover']){
   Object.assign(b,{phase,timer:0});const score=g.score;assert.equal(hurtBoss(g,method),false);
   assert.equal(b.hp,b.maxHp);assert.equal(g.score,score);assert.equal(g.dangers[0],danger);assert.equal(JSON.stringify(b.skillCooldowns),cooldowns);
   assert.equal(g.animationEvents.at(-1).type,'boss-block');assert.ok(b.blockFlash>0);
  }
  b.phase='expose';for(const timer of [-1,exposeDuration(b),exposeDuration(b)+STEP]){b.timer=timer;assert.equal(bossVulnerable(b),false);assert.equal(hurtBoss(g,method),false);}
  b.timer=exposeDuration(b)-1e-6;assert.equal(bossVulnerable(b),true);assert.equal(hurtBoss(g,method),true);assert.equal(b.hp,b.maxHp-1);assert.equal(g.dangers.length,0);
  assert.equal(b.phase,'recover');assert.equal(hurtBoss(g,method),false);assert.equal(b.hp,b.maxHp-1);
  Object.assign(b,{phase:'expose',timer:0,active:false});assert.equal(hurtBoss(g,method),false);
 }
});

test('actual fireball collision respects closed, open and newly recovering boss armor in every world',()=>{
 for(let world=1;world<=8;world++){
  const g=flat(2),b=new Game(levelById(`${world}-4`)).boss;g.boss=b;b.active=true;Object.assign(g.p,{x:b.left+4,y:180});
  for(const phase of ['idle','expose','recover']){
   Object.assign(b,{phase,timer:0,recoverX:b.x,recoverTo:b.x});const hp=b.hp;
   g.shots=[{x:b.x+8,y:b.y+12,w:4,h:4,vx:0,vy:0,life:1}];g.step(STEP);
   assert.equal(b.hp,hp-(phase==='expose'?1:0),`B0${world}/${phase}`);assert.equal(g.shots.length,0);assert.equal(g.mode,'playing');
  }
 }
});

test('repeated top stomps on stationary or moving shells are harmless in every form, including star protection',()=>{
 for(const kind of ['cabbage','walnut','spike'])for(const state of ['shell','rolling'])for(const form of [0,1,2])for(const star of [0,10]){
  const g=flat(form),e=shell(kind,state);g.enemies=[e];g.p.star=star;const score=g.score,rebirths=g.rebirths;
  for(let n=0;n<90;n++){
   stomp(g,e);assert.equal(e.hp,1,`${kind}/${state}/${form}/${star}`);assert.ok(!e.dead);assert.equal(e.state,'shell');assert.equal(e.vx,0);
   assert.equal(g.mode,'playing');assert.equal(g.p.form,form);assert.equal(g.p.hurt,0);assert.equal(g.rebirths,rebirths);assert.equal(g.score,score);assert.ok(g.p.vy<0);
  }
  // Top bounces must not keep extending the nine-second shell timer.
  assert.ok(e.timer>=.7);if(state==='shell')assert.ok(e.timer>2.7);
  g.p.x=20;e.timer=9-STEP/2;updateEnemies(g,STEP,0);assert.equal(e.state,'walk');assert.equal(e.hp,1);
  g.p.star=0;stomp(g,e);assert.ok(e.dead);assert.equal(e.hp,0);assert.equal(g.score,score+100);
 }
});

test('a spike takes two exposed hits, its shell still takes fire damage, and old shell saves do not refill HP',()=>{
 const g=flat(),e=shell('spike','walk');delete e.hp;delete e.maxHp;prepareEnemyHealth(e);assert.equal(e.hp,2);g.enemies=[e];
 stomp(g,e);assert.equal(e.hp,1);assert.equal(e.state,'shell');assert.equal(hurtEnemy(g,e,'stomp'),false);
 assert.equal(hurtEnemy(g,e,'fire'),true);assert.equal(e.hp,0);assert.ok(e.dead);const score=g.score;assert.equal(hurtEnemy(g,e,'fire'),false);assert.equal(g.score,score);
 for(const state of ['shell','rolling']){const old={kind:'spike',state,hp:1,maxHp:1,dead:false};prepareEnemyHealth(old);assert.equal(old.hp,1);assert.equal(old.maxHp,2);old.state='walk';prepareEnemyHealth(old);assert.equal(old.hp,1);}
 const dead={kind:'spike',state:'walk',hp:0,maxHp:1,dead:true};prepareEnemyHealth(dead);assert.equal(dead.hp,0);assert.ok(dead.dead);
 const old={kind:'spike',state:'walk',hp:1,maxHp:1,dead:false};prepareEnemyHealth(old);assert.equal(old.hp,2);old.hp=1;prepareEnemyHealth(old);assert.equal(old.hp,1);
});

test('spike shell and wake use available clips, while blocked hits emit sparks without damage feedback',()=>{
 const actors=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')).animations.actors;
 const g=flat(),e=shell('spike');g.enemies=[e];const animation=new AnimationPlayer();animation.update(g,0);
 for(const timer of [0,7.9,8,8.99]){e.timer=timer;const clip=enemyClip(e);assert.ok(actors.E04.clips[clip]);assert.equal(clip,timer>=8?'wake':'shell-idle');}
 e.timer=2;assert.equal(hurtEnemy(g,e,'stomp'),false);animation.update(g,STEP);assert.equal(e.hitFlash||0,0);assert.ok(animation.effects.some(f=>f.kind==='spark'));assert.ok(!animation.effects.some(f=>f.kind==='hit'));
});
