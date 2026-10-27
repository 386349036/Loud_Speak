import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {updateBoss,hurtBoss,exposeDuration} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {BOSS_SKILLS,bossExposeLimit} from '../../public/games/veggie-adventure/js/core/boss-balance.mjs';
import {bossCue} from '../../public/games/veggie-adventure/js/core/boss-cues.mjs';
const originals=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-rework-layouts.json',import.meta.url)));
const beforeLayered=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-layered-1-3.json',import.meta.url)));

test('later stages retain their mechanics and long routes, with boss approaches shortened independently',()=>{
 for(const old of originals){const l=levelById(old.id);if(l.id.startsWith('1-')){if(l.bossRouteVersion){assert.equal(l.width,l.bossRouteReduction.priorWidth-l.bossRouteReduction.removed+(l.bossArenaExpansion?.added||0));assert.equal(l.boss.right-l.boss.left,(old.boss.right-old.boss.left)*1.5);continue;}const current=structuredClone(l.layeredRouteVersion?beforeLayered:l);if(current.rebirthRewardVersion){current.blocks=current.blocks.filter(b=>b.item!=='rebirth');for(const key of ['layoutVersion','priorLayouts','rebirthRewardVersion']){if(old[key]===undefined)delete current[key];else current[key]=old[key];}}assert.deepEqual(current,old);continue;}
  if(l.bossRouteVersion)assert.equal(l.width,l.bossRouteReduction.priorWidth-l.bossRouteReduction.removed+(l.bossArenaExpansion?.added||0));else assert.ok(l.width>old.width*3,l.id);assert.equal(l.reworkVersion,1);assert.ok(l.layoutVersion>=2);assert.ok(l.timeLimit>old.timeLimit);assert.equal(l.spawn.x,old.spawn.x);
  if(!l.boss){assert.ok(l.enemies.length>old.enemies.length);assert.ok(l.items.length>old.items.length);assert.ok(l.blocks.length>=old.blocks.length);
  for(const key of ['water','hazards','turrets','gates'])assert.ok(l[key].length>=old[key].length,l.id+'/'+key);
  for(const m of old.movers)assert.ok(l.movers.some(v=>v.id===m.id&&v.kind===m.kind),l.id+' lost original '+m.id);}
  let end=0;for(const s of l.sections){assert.equal(s.from,end);assert.ok(s.to>s.from);end=s.to;}assert.equal(end,l.width);
  for(const key of ['blocks','enemies','items','movers','turrets','gates'])assert.ok(l[key].length<200,l.id+' save capacity');
  const g=new Game(l);assert.ok(!g.solids().some(s=>overlap(g.p,s)));assert.ok(decodeSave(encodeSave(g)),l.id);
  if(l.boss){assert.equal(l.boss.right-l.boss.left,432);assert.equal(l.movers.filter(m=>m.arena).length,3);assert.ok(!l.blocks.some(b=>b.x+b.w>l.boss.left-32));assert.ok(!l.hazards.some(h=>h.x>=l.boss.left));}
 }
});

test('old campaign saves migrate all 28 layouts without changing run progression, score, form or consumed rebirths',()=>{
 for(const old of originals.filter(l=>l.world>=2))for(const status of ['playing','dead','gameover','won']){
  const g=new Game(old,{score:20000,form:2,rebirths:1});g.score=20500;g.saveCheckpoint();
  g.mode=status;g.pendingRebirth=status==='dead';if(status==='gameover')g.rebirths=0;
  const text=encodeSave(g,['1-1','1-2','1-3','1-4']),saved=decodeSave(text);assert.ok(saved,old.id+'/'+status);assert.equal(saved.layoutMigrated,true);
  const campaign=new Campaign();campaign.restore(saved);const fresh=campaign.game;
  assert.equal(fresh.level.width,levelById(old.id).width);assert.equal(fresh.p.x+fresh.p.w/2,old.spawn.x+6);assert.equal(fresh.rebirths,g.rebirths);assert.ok(campaign.completed.has('1-4'));
  assert.equal(fresh.mode,status==='dead'?'playing':status);assert.equal(fresh.score,['won','gameover'].includes(status)?20500:20000);assert.ok(decodeSave(encodeSave(fresh,[...campaign.completed])));
  const bad=JSON.parse(text);bad.checkpoint.blocks.pop();assert.equal(decodeSave(JSON.stringify(bad)),null,old.id+' malformed old layout');
  const tooWide=JSON.parse(text);tooWide.checkpoint.enemies[0].x=old.width+32;assert.equal(decodeSave(JSON.stringify(tooWide)),null);
 }
});

test('every later boss permits a stomp above a flush arena ledge in all forms, with a harmless smooth retreat',()=>{
 for(let world=2;world<=8;world++)for(const form of [0,1,2]){
  const g=new Game(levelById(`${world}-4`),{form}),b=g.boss,ledge=g.movers.find(m=>m.arena);g.enemies=[];g.items=[];
  Object.assign(b,{active:true,x:ledge.x+8,y:176,phase:'expose',timer:0});Object.assign(g.p,{x:b.x+4,y:168-g.p.h,vy:100,grounded:false});
  for(let n=0;n<20&&b.hp===b.maxHp;n++)g.step(STEP);
  assert.equal(b.hp,b.maxHp-1,`B0${world}/${form} ledge intercepted stomp`);assert.equal(g.mode,'playing');assert.equal(g.p.form,form);
  const hitX=b.x;assert.equal(hurtBoss(g,'fire'),false);assert.equal(b.x,hitX);let damage=0;g.damage=()=>damage++;g.p.hurt=0;
  for(let n=0;n<40;n++){g.p.x=b.x;g.p.y=b.y;updateBoss(g,STEP,208);}
  assert.equal(damage,0);assert.ok(Math.abs(b.x-hitX)<=40);assert.equal(b.hp,b.maxHp-1);
 }
});

test('all later bosses allow an actual ground approach and jump to the far weak point in every form',()=>{
 for(let world=2;world<=8;world++)for(const form of [0,1,2]){
  const g=new Game(levelById(`${world}-4`),{form}),b=g.boss;g.enemies=[];g.items=[];
  Object.assign(b,{active:true,x:b.right-b.w-8,y:176,phase:'attack',pattern:world===2?'charge':world===3?'dash':world===4?'fan-leap':world===5?'thorn-roll':world===6?'crossfire':world===7?'left-sweep':'slam',timer:3,startX:b.right-b.w-8,startY:176,direction:1});
  // Observe the real attack-end transition, then use its resulting weak point.
  Object.assign(g.p,{x:world===4?b.right+4:b.left+8,y:208-g.p.h,vx:0,vy:0,grounded:true});updateBoss(g,0,208);assert.equal(b.phase,'expose');
  const window=exposeDuration(b),initial=b.hp;assert.ok(window>=1.6&&window<=bossExposeLimit(b));let jumped=false;
  for(let n=0;n<Math.ceil(window/STEP)&&b.hp===initial&&g.mode==='playing';n++){
   const target=b.x+b.w/2-g.p.w/2,dx=target-g.p.x;
   const approachingWave=g.dangers.some(d=>d.kind==='wave'&&!(d.delay>0)&&Math.abs(d.x-g.p.x)<72&&Math.sign(d.vx)===Math.sign(g.p.x-d.x));
   const press=g.p.grounded&&(Math.abs(dx)<64||approachingWave);
   if(press)jumped=true;const projected=g.p.x+g.p.vx*.25;
   g.step(STEP,{right:projected<target-1,left:projected>target+1,jump:jumped||g.p.inWater,jumpPressed:press});
  }
  assert.equal(b.hp,initial-1,`B0${world}/${form} unreachable in ${window}s at x=${g.p.x}`);assert.equal(g.mode,'playing');assert.equal(g.p.form,form);
 }
});

test('every boss skill has a concrete instruction and an existing PNG cue',()=>{
 const ids=new Set(JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')).assets.map(a=>a.id));
 for(const [kind,skills] of Object.entries(BOSS_SKILLS))for(const pattern of Object.keys(skills)){const cue=bossCue({kind:+kind,pattern});assert.ok(ids.has(cue.asset));assert.ok(cue.hint.length>8);assert.ok(!cue.hint.includes('观察预警'));}
});
