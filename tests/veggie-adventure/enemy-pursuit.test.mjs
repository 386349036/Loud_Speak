import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import sharp from 'sharp';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies,hurtEnemy} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {AnimationPlayer,enemyClip} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {trapStage} from '../../public/games/veggie-adventure/js/core/trap-profile.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const base='public/games/veggie-adventure/assets/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json'));
function scene(kind,form=0,dir=1){const g=new Game(undefined,{form});Object.assign(g.level,{width:900,exit:880,platforms:[{x:0,y:208,w:900,h:32}],hazards:[],water:[]});g.blocks=[];g.items=[];g.movers=[];g.turrets=[];g.gates=[];g.boss=null;const e={id:0,kind,x:400,y:194,w:14,h:14,vx:-dir*20,vy:0,state:'walk',timer:0,phase:0,dead:false,grounded:true,grace:0,homeX:400,homeY:194,patrolLeft:388,patrolRight:426};g.enemies=[e];g.p.x=e.x+dir*96;g.p.y=208-g.p.h;return {g,e};}
const tick=g=>{g.time+=STEP;updateEnemies(g,STEP,g.p.y+g.p.h);};

test('all four ground fighters really close a long gap beyond their idle patrol and contact every hero form',()=>{
 for(const kind of ['mushroom','cabbage','walnut','spike'])for(const form of [0,1,2])for(const dir of [-1,1]){
  const {g,e}=scene(kind,form,dir);let contacts=0,sawWarning=false;g.damage=()=>{if(overlap(g.p,e))contacts++;};
  for(let n=0;n<600&&!contacts;n++){g.step(STEP);if(e.aiWarning){sawWarning=true;assert.ok(e.vx*dir>0,kind+' warned without approaching');}}
  assert.ok(sawWarning,kind+'/'+form+'/'+dir);assert.ok(contacts>0,kind+'/'+form+'/'+dir+' never reached the hero');
  assert.ok(dir>0?e.x>e.patrolRight:e.x<e.patrolLeft,'idle bounds still blocked combat');assert.equal(e.dead,false);
 }
});

test('the actual 1-1 mushrooms and cabbage reach and injure all hero forms on both sides of their original banks',()=>{
 for(const source of LEVELS[0].enemies)for(const form of [0,1,2])for(const dir of [-1,1]){
  const g=new Game(LEVELS[0],{form}),e=g.enemies.find(e=>e.id===source.id);g.enemies=[e];g.items=[];g.p.x=e.x+dir*40;g.p.y=208-g.p.h;
  for(let n=0;n<600&&g.mode==='playing'&&g.p.form===form;n++)g.step(STEP);
  assert.equal(form?g.p.form:g.mode,form?0:'dead',`${e.kind}/${e.id}/${form}/${dir} failed to injure`);assert.equal(e.dead,false);
 }
});

test('pursuers turn toward a crossing hero, resume after an obstacle clears, and keep real pit landing buffers',()=>{
 for(const kind of ['mushroom','cabbage','walnut','spike']){
  const {g,e}=scene(kind);g.damage=()=>{};for(let n=0;n<84;n++)tick(g);g.p.x=e.x-64;
  for(let n=0;n<60;n++)tick(g);assert.ok(e.vx<0,kind+' never corrected its direction');
  const wall={x:e.x-22,y:176,w:16,h:32,kind:'brick'};g.blocks=[wall];for(let n=0;n<60;n++){tick(g);assert.ok(!overlap(e,wall));}
  assert.equal(e.vx,0);g.blocks=[];tick(g);assert.ok(e.vx<0,kind+' stuck in a rest state after clearing the route');
  const {g:pit,e:guard}=scene(kind);pit.damage=()=>{};pit.level.platforms=[{x:0,y:208,w:600,h:32},{x:648,y:208,w:252,h:32}];pit.p.x=488;
  for(let n=0;n<1200;n++){tick(pit);assert.ok(guard.x+guard.w<=472);assert.equal(guard.dead,false);}
 }
});

test('a stunned shell wakes at its current chased position without snapping to an old patrol',()=>{
 for(const kind of ['cabbage','walnut','spike']){const {g,e}=scene(kind);g.damage=()=>{};for(let n=0;n<120;n++)tick(g);assert.ok(e.x>e.patrolRight);hurtEnemy(g,e,'stomp');const x=e.x;g.p.x=800;
  for(let n=0;n<1082;n++){const before=e.x;tick(g);assert.ok(Math.abs(e.x-before)<=150*STEP+1e-6,kind+' teleported on waking');}
  assert.equal(e.state,'walk');assert.ok(Math.abs(e.x-x)<2);assert.equal(e.hp,1);
 }
});

test('shell states always select the new unconscious sprites, including a fresh restored shell and spike landing',()=>{
 for(const kind of ['cabbage','walnut','spike']){const {g,e}=scene(kind),a=new AnimationPlayer(),actor=manifest.animations.actors[{cabbage:'E02',walnut:'E03',spike:'E04'}[kind]];
  a.update(g,0);hurtEnemy(g,e,'stomp');a.update(g,STEP);assert.equal(a.get(e).clip,'retract');
  a.update(g,.4);a.update(g,STEP);assert.equal(a.get(e).clip,'shell-idle');
  e.state='rolling';a.reset();a.update(g,0);assert.equal(a.get(e).clip,'shell-slide');
  e.state='shell';e.timer=8;a.reset();a.update(g,0);assert.equal(a.get(e).clip,'wake');
  e.timer=2;a.reset();a.update(g,0);assert.equal(a.get(e).clip,'shell-idle');
  e.grounded=false;a.update(g,STEP);e.grounded=true;a.update(g,STEP);assert.equal(a.get(e).clip,'shell-idle','landing must not play an awake unfold');
  for(const state of ['shell','rolling'])assert.ok(actor.clips[enemyClip({...e,state})]);
 }
});

test('new stunned atlases retain every normal walking/falling pixel and contain distinct alpha animation cells',async()=>{
 for(const [id,oldPath,states] of [['E02','animations/v2-scene01/E02.png',['walk','hit']],['E03','animations/E03.png',['walk','deflect','hit']],['E04','animations/E04.png',['walk','fall','unfold','hit']]]){
  const a=manifest.animations.actors[id],v=manifest.assets.find(v=>v.id===a.asset);assert.equal(v.revision,'stunned-v1');const old=await sharp(base+oldPath).ensureAlpha().raw().toBuffer(),{data,info}=await sharp(base+v.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(const state of states){const row=a.clips[state].row,offset=row*a.frameHeight*info.width*4;assert.ok(data.subarray(offset,offset+a.frameHeight*info.width*4).equals(old.subarray(offset,offset+a.frameHeight*info.width*4)),id+"/"+state+" changed");}
  assert.equal(data[3],0);assert.equal(a.clips.wake.fps,4);
 }
});

test('a plant acquiring the hero at the very end of exposure must fire before retracting in every form and direction',()=>{
 for(const form of [0,1,2])for(const dir of [-1,1]){
  const {g,e}=scene('trap',form,dir);e.phase=3.18;g.damage=()=>{};tick(g);assert.equal(e.intent,'spit-cue');assert.equal(g.dangers.length,0);
  for(let n=0;n<120&&g.dangers.length===0;n++){tick(g);assert.equal(trapStage(e).name,'idle','warning was swallowed by retraction');}
  assert.equal(g.dangers.length,1);assert.equal(g.dangers[0].vx,dir*96);assert.equal(e.intent,'spit');
  for(let n=0;n<30;n++){tick(g);assert.equal(trapStage(e).name,'idle','no visible attack follow-through');}
  for(let n=0;n<120;n++)tick(g);assert.equal(g.dangers.length,1,'one shot per committed exposure');assert.notEqual(trapStage(e).name,'idle');
 }
});

test('the plant remembers a hero seen during emergence and completes its shot, even if that hero changes side',()=>{
 const {g,e}=scene('trap');g.damage=()=>{};e.phase=1.6;tick(g);assert.ok(e.spitPending);assert.equal(e.facing,1);g.p.x=e.x-120;
 for(let n=0;n<120&&!g.dangers.length;n++)tick(g);assert.equal(g.dangers.length,1);assert.equal(g.dangers[0].vx,96);
});

test('fish pursue through the water column and physically damage a moving target rather than swimming at an old waypoint',()=>{
 for(const form of [0,1,2]){const {g,e}=scene('fish',form);g.level.platforms=[{x:0,y:240,w:900,h:16}];g.level.water=[{x:300,y:128,w:400,h:112}];e.y=150;e.homeY=150;g.p.y=215-g.p.h;let contacts=0;g.damage=()=>{if(overlap(g.p,e))contacts++;};
  for(let n=0;n<720&&!contacts;n++)tick(g);assert.ok(contacts>0,'fish failed for form '+form);assert.ok(e.y>180);assert.equal(e.dead,false);
 }
});
