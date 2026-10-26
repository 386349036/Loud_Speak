import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {playerAttack} from '../../public/games/veggie-adventure/js/core/player-attacks.mjs';
import {hurtEnemy} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {hurtBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';

function flat(form=0,attackBonus=0){
 const l=structuredClone(LEVELS[0]);Object.assign(l,{width:512,exit:480,spawn:{x:80,y:194},platforms:[{x:0,y:208,w:512,h:32}],blocks:[],enemies:[],items:[],movers:[],water:[],hazards:[],turrets:[],gates:[],boss:null});return new Game(l,{form,attackBonus});
}

test('one upgrade chain yields carrot, chili, three attack upgrades, then score without another item',()=>{
 const g=flat();
 for(let n=0;n<6;n++){
  const b={x:80,y:144,w:16,h:16,kind:'brick',breakable:true,item:n%2?'carrot':'chili'};g.blocks=[b];
  const count=g.items.length,score=g.score;g.hitBlock(b);g.hitBlock(b);
  if(n===5){assert.equal(g.items.length,count);assert.equal(g.score,score+1050);assert.match(g.rewardNotice.text,/1000/);}
  else {assert.equal(g.items.length,count+1);const item=g.items.at(-1);assert.equal(item.kind,n===0?'carrot':'chili');Object.assign(item,{x:g.p.x,y:g.p.y,vx:0,vy:0});g.step(STEP);assert.ok(item.collected);}
  assert.equal(g.p.form,Math.min(n+1,2));assert.equal(g.p.attackBonus,Math.min(3,Math.max(0,n-1)));
 }
 assert.equal(playerAttack(g.p).kind,'lightning');assert.equal(playerAttack(g.p).damage,4);
});

test('every upgrade block gives chili below the attack cap and only score at the cap, without changing other rewards',()=>{
 for(const l of LEVELS)for(const bonus of [0,1,2,3]){
  const g=new Game(l,{form:2,attackBonus:bonus});for(const b of g.blocks.filter(b=>['carrot','chili'].includes(b.item))){
   const count=g.items.length,score=g.score;g.hitBlock(b);g.hitBlock(b);
   if(bonus===3){assert.equal(g.items.length,count);assert.equal(g.score-score,1000+(b.breakable?50:0));}
   else {assert.equal(g.items.length,count+1);assert.equal(g.items.at(-1).kind,'chili');}
   assert.equal(g.p.attackBonus,bonus);
  }
 }
 for(const kind of ['seed','star']){const g=flat(2,3),b={x:80,y:144,w:16,h:16,kind:'reward',item:kind};g.hitBlock(b);assert.equal(g.items[0].kind,kind);assert.equal(g.p.attackBonus,3);}
});

test('actual fired projectiles snapshot their damage and size in both directions and keep the two-shot limit',()=>{
 for(const bonus of [0,1,2,3])for(const dir of [-1,1]){
  const g=flat(2,bonus);g.p.facing=dir;g.shoot();const shot=g.shots[0],profile=playerAttack(g.p);assert.equal(shot.damage,bonus+1);assert.equal(shot.kind,profile.kind);assert.equal(shot.w,profile.w);assert.equal(shot.vx,dir*150);assert.equal(shot.asset,profile.asset);
  g.shoot();assert.equal(g.shots.length,1);g.p.shotCooldown=0;g.shoot();g.p.shotCooldown=0;g.shoot();assert.equal(g.shots.length,2);
  g.collect('chili');assert.equal(shot.damage,bonus+1,'already fired projectiles keep their power');
 }
 for(const form of [0,1]){const g=flat(form);g.shoot();assert.equal(g.shots.length,0);}
});

test('powered shots deal their actual bonus damage to enemies while stomps stay at one and shells stay protected',()=>{
 for(const bonus of [0,1,2,3]){
  const g=flat(2,bonus);g.shoot();const shot=g.shots[0];
  const e={id:0,kind:'winged',x:shot.x,y:shot.y,w:14,h:14,homeX:shot.x,homeY:shot.y,vx:0,vy:0,hp:3,maxHp:3,phase:0,timer:0,grace:0,state:'walk',dead:false};g.enemies=[e];g.step(STEP);assert.equal(e.hp,Math.max(0,3-(bonus+1)));assert.equal(g.shots.length,0);
  const shell={...e,kind:'cabbage',hp:2,maxHp:2,dead:false,state:'shell'};assert.equal(hurtEnemy(g,shell,'stomp',4),false);assert.equal(shell.hp,2);
  shell.state='walk';hurtEnemy(g,shell,'stomp',4);assert.equal(shell.hp,1);
 }
});

test('all eight bosses take powered damage only in the weakness phase and clamp overkill to zero HP',()=>{
 for(const level of LEVELS.filter(l=>l.boss))for(const bonus of [1,2,3])for(const phase of ['idle','windup','attack','recover','expose']){
  const g=new Game(level,{form:2,attackBonus:bonus}),b=g.boss;Object.assign(b,{active:true,phase,timer:0});const hp=b.hp;
  assert.equal(hurtBoss(g,'fire',bonus+1),phase==='expose');assert.equal(b.hp,hp-(phase==='expose'?bonus+1:0));
 }
 const g=new Game(levelById('1-4'));Object.assign(g.boss,{active:true,phase:'expose',timer:0,hp:1});hurtBoss(g,'fire',4);assert.equal(g.boss.hp,0);assert.ok(g.boss.dead);
});

test('campaign advance, save, restore and legacy migration retain valid attack upgrades, while death and damage reset them',()=>{
 for(const bonus of [0,1,2,3]){
  const c=new Campaign();c.select('1-1',{form:2,attackBonus:bonus});c.game.mode='won';assert.ok(c.advance());assert.equal(c.game.p.attackBonus,bonus);assert.equal(c.game.entryAttackBonus,bonus);
  const saved=decodeSave(encodeSave(c.game,['1-1']));assert.ok(saved);const restored=new Campaign();restored.restore(saved);assert.equal(restored.game.p.attackBonus,bonus);
  c.game.mode='won';const won=new Campaign();won.restore(decodeSave(encodeSave(c.game,['1-1'])));assert.equal(won.game.p.attackBonus,bonus);
  c.game.mode='playing';c.game.damage();assert.equal(c.game.p.attackBonus,0);assert.equal(c.game.p.form,0);
  restored.game.kill();restored.game.step(.7);assert.equal(restored.game.p.form,0);assert.equal(restored.game.p.attackBonus,0);
 }
 const legacy=JSON.parse(encodeSave(new Game(levelById('1-1'),{form:2})));delete legacy.run.entryAttackBonus;delete legacy.result.attackBonus;delete legacy.checkpoint.p.attackBonus;const decoded=decodeSave(JSON.stringify(legacy));assert.ok(decoded);assert.equal(decoded.checkpoint.p.attackBonus,0);assert.equal(decoded.run.entryAttackBonus,0);
 for(const key of ['player','run','result'])for(const value of [-1,4,.5,'3',null]){const d=structuredClone(legacy);if(key==='player')d.checkpoint.p.attackBonus=value;else if(key==='run')d.run.entryAttackBonus=value;else d.result.attackBonus=value;assert.equal(decodeSave(JSON.stringify(d)),null);}
 const invalid=JSON.parse(encodeSave(new Game()));invalid.checkpoint.p.attackBonus=1;assert.equal(decodeSave(JSON.stringify(invalid)),null);
});

test('three generated projectile PNGs decode with transparent margins and render using their own visual assets',async()=>{
 const m=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
 for(const bonus of [1,2,3]){
  const g=flat(2,bonus);g.shoot();const shot=g.shots[0],asset=m.assets.find(a=>a.id===shot.asset);assert.ok(asset);assert.equal(asset.stage,'player-attacks-v1');
  const {data,info}=await sharp('public/games/veggie-adventure/assets/'+asset.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,96);assert.equal(info.height,96);let visible=0,clear=0;for(let i=3;i<data.length;i+=4){if(data[i]>40)visible++;if(data[i]===0)clear++;}assert.ok(visible>300&&clear>300);
  const draws=[],ctx=new Proxy({drawImage:(img,...args)=>draws.push({id:img.id,args})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  createRenderer({width:768,getContext:()=>ctx},new Map([[asset.id,{id:asset.id}]]),null)(g);assert.ok(draws.some(d=>d.id===asset.id&&d.args[2]===shot.size&&d.args[3]===shot.size));
 }
});
