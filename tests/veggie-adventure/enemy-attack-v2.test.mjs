import test from 'node:test';import assert from 'node:assert/strict';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies,hurtEnemy} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';
function scene(kind,dir=1){const g=new Game();Object.assign(g.level,{width:600,exit:580,platforms:[{x:0,y:208,w:600,h:32}],water:[],hazards:[]});g.blocks=[];g.items=[];g.movers=[];g.gates=[];g.turrets=[];g.boss=null;g.enemies=[{id:0,kind,x:240,y:194,w:14,h:14,vx:0,vy:0,state:'walk',timer:0,phase:0,grace:0,homeX:240,homeY:194,grounded:true,patrolLeft:160,patrolRight:336}];g.p.x=240+dir*72;g.p.y=194;g.damage=()=>{};return g;}
const tick=g=>{g.time+=STEP;updateEnemies(g,STEP,0);};

test('cabbage and walnut dash exactly two tiles in the locked direction at the first exclamation',()=>{
 for(const kind of ['cabbage','walnut'])for(const dir of [-1,1]){const g=scene(kind,dir),e=g.enemies[0];let start;
  for(let n=0;n<120&&!e.aiWarning;n++){start=e.x;tick(g);}assert.ok(e.aiWarning);assert.equal(e.intent,'dash');assert.ok(e.vx*dir>0);assert.ok(Math.abs(e.x-start)>0);
  g.p.x=e.x-dir*40;for(let n=0;n<120&&e.brain.mode==='dash';n++)tick(g);
  assert.ok(Math.abs(e.x-start-dir*32)<1e-5,kind+'/'+dir+' distance '+(e.x-start));assert.equal(e.brain.mode,'pursue');assert.ok(e.vx*dir>0);
  tick(g);assert.ok(e.vx*dir<0,'after the committed dash, pursue the hero on its new side without resting');
 }
});

test('dash still stops at walls and safe landing buffers',()=>{
 for(const kind of ['cabbage','walnut']){const g=scene(kind),e=g.enemies[0];e.patrolRight=270;g.blocks=[{x:280,y:176,w:16,h:32,kind:'brick'}];
  for(let n=0;n<360;n++){tick(g);assert.ok(e.x+e.w<=270);assert.ok(!g.blocks.some(b=>overlap(e,b)));assert.ok(e.y+e.h<=208);}
 }
});

test('spike-shell fires only one three-thorn fan per exclamation, mirrored toward the hero',()=>{
 for(const dir of [-1,1]){const g=scene('spike',dir),e=g.enemies[0];for(let n=0;n<120&&!e.aiWarning;n++)tick(g);
  assert.equal(e.intent,'spine-volley');assert.equal(g.dangers.length,3);const [forward,up,diagonal]=g.dangers;assert.equal(forward.vx,dir*96);assert.equal(forward.vy,0);assert.equal(up.vx,0);assert.equal(up.vy,-96);assert.ok(Math.abs(diagonal.vx/diagonal.vy+dir)<1e-8);
  for(let n=0;n<200;n++)tick(g);assert.equal(g.dangers.length,3);assert.equal(e.hp,2);assert.ok(e.brain.attackCooldown>0);
  hurtEnemy(g,e,'stomp');assert.equal(e.hp,1);assert.equal(e.state,'shell');for(let n=0;n<120;n++)tick(g);assert.equal(g.dangers.length,3);
 }
});

test('carnivorous trap warns, locks its firing side, and sends a real damaging pea only while exposed',()=>{
 for(const dir of [-1,1]){const g=scene('trap',dir),e=g.enemies[0];e.phase=1.8;g.damage=()=>{};
  for(let n=0;n<100&&e.intent!=='spit-cue';n++)tick(g);assert.equal(e.active,true);assert.equal(e.intent,'spit-cue');const aim=e.spitDirection;assert.equal(aim,dir);
  g.p.x=e.x-dir*72;for(let n=0;n<100&&g.dangers.length===0;n++)tick(g);assert.equal(g.dangers.length,1);assert.equal(g.dangers[0].kind,'plant-seed');assert.equal(g.dangers[0].vx,dir*96);
  const d=g.dangers[0];g.p.x=d.x;g.p.y=d.y;let hits=0;g.damage=()=>hits++;updateDangers(g,STEP);assert.equal(hits,1);
  g.dangers=[];e.phase=0;for(let n=0;n<80;n++)tick(g);assert.equal(g.dangers.length,0);
 }
});

test('new attacks physically reach a stationary hero, while a dash interrupted by a new wall stays safe',()=>{
 for(const kind of ['cabbage','walnut','spike','trap'])for(const dir of [-1,1]){
  const g=scene(kind,dir),e=g.enemies[0];let hits=0;g.damage=()=>hits++;
  if(['cabbage','walnut'].includes(kind))g.p.x=e.x+dir*40;
  if(kind==='trap')e.phase=1.8;
  for(let n=0;n<240&&!hits;n++)g.step(STEP);assert.ok(hits>0,kind+'/'+dir+' never hit the standing hero');
 }
 const g=scene('cabbage'),e=g.enemies[0];for(let n=0;n<100&&!e.aiWarning;n++)tick(g);assert.equal(e.intent,'dash');
 const wall={x:e.x+e.w+6,y:176,w:16,h:32,kind:'brick'};g.blocks.push(wall);for(let n=0;n<60;n++){tick(g);assert.ok(!overlap(e,wall));}assert.notEqual(e.intent,'dash');
});
