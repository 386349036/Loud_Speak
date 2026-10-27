import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {seesPlayer} from '../../public/games/veggie-adventure/js/core/enemy-tactics.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
const actor=(kind,extra={})=>({id:0,kind,x:160,y:194,w:14,h:14,vx:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,...extra});
function scene(kind,extra={}){const g=new Game();Object.assign(g.level,{platforms:[{x:0,y:208,w:600,h:32}],water:[],hazards:[],exit:580,checkpoint:570,width:600});g.enemies=[actor(kind,extra)];g.items=[];g.blocks=[];g.movers=[];g.boss=null;g.turrets=[];g.gates=[];Object.assign(g.p,{x:220,y:194,vx:0,vy:0});return g;}
const watch=(g,seconds)=>{for(let n=0;n<Math.round(seconds/STEP);n++)updateEnemies(g,STEP,0);};

test('ordinary mushrooms move on discovery and pursue continuously, steering when the hero crosses them',()=>{
 for(const kind of ['mushroom']){
  const g=scene(kind),e=g.enemies[0];g.damage=()=>{};watch(g,.1);assert.equal(e.brain.mode,'patrol');assert.ok(e.vx<0);
  watch(g,.15);assert.equal(e.brain.mode,'pursue');assert.equal(e.aiWarning,true);assert.ok(e.vx>0);
  const start=e.x;watch(g,.6);assert.equal(e.intent,'pursue');assert.ok(e.x>start+32);
  g.p.x=e.x-32;watch(g,.15);assert.ok(e.vx<0,'follow the current visible hero instead of an obsolete direction');
  watch(g,.65);assert.equal(e.intent,'pursue');assert.notEqual(e.vx,0);
 }
});

test('ground enemies cannot see through a wall or react to an unrelated high platform',()=>{
 const g=scene('cabbage'),e=g.enemies[0];g.blocks=[{x:184,y:176,w:16,h:32}];assert.equal(seesPlayer(g,e),false);watch(g,1);assert.equal(e.brain.mode,'patrol');
 g.blocks=[];g.p.y=100;assert.equal(seesPlayer(g,e),false);watch(g,.5);assert.equal(e.aiWarning,false);
});

test('ground pursuit respects a gap and the configured landing buffers for every body form',()=>{
 for(const kind of ['mushroom','cabbage','walnut','spike'])for(const form of [0,1,2]){
  const g=scene(kind,{x:208,patrolLeft:176,patrolRight:280}),e=g.enemies[0];g.level.platforms=[{x:0,y:208,w:128,h:32},{x:176,y:208,w:144,h:32}];
  g.p.form=form;g.resizePlayer();g.p.x=108;g.p.y=208-g.p.h;
  for(let n=0;n<120*8;n++){updateEnemies(g,STEP,0);assert.ok(e.x>=176&&e.x+e.w<=280);assert.ok(e.y+e.h<=208);assert.equal(e.dead,false);assert.notEqual(e.brain.mode,'notice','do not repeatedly wind up at an unreachable target');}
 }
});

test('visible star protection prompts retreat, while shell and rolling states keep their original control',()=>{
 const g=scene('walnut'),e=g.enemies[0];g.p.star=5;watch(g,.6);assert.equal(e.intent,'retreat');assert.ok(e.vx<0);
 Object.assign(e,{state:'rolling',vx:150,grace:1});watch(g,.1);assert.equal(e.vx,150);assert.equal(e.state,'rolling');
 Object.assign(e,{state:'shell',vx:0,timer:0});watch(g,.2);assert.equal(e.vx,0);assert.equal(e.state,'shell');
});

test('fish and winged cabbage move during discovery and keep tracking a nearby moving hero',()=>{
 for(const kind of ['fish','winged']){
  const g=scene(kind,{y:160}),e=g.enemies[0];g.level.water=[{x:96,y:144,w:240,h:80}];g.p.x=220;g.p.y=168;
  watch(g,.3);assert.equal(e.intent,'intercept');assert.equal(e.aiWarning,true);const target=e.brain.targetX;
  g.p.x=128;
  watch(g,.2);assert.ok(e.brain.targetX<target);assert.ok(e.vx<0);assert.equal(e.brain.mode,'pursue');
 }
});

test('jelly approaches only a player in the same water and decides once per pulse',()=>{
 const g=scene('jelly',{y:168}),e=g.enemies[0];g.level.water=[{x:96,y:144,w:240,h:80}];g.p.x=128;g.p.y=168;
 watch(g,.1);assert.equal(e.intent,'pulse-approach');assert.ok(e.vx<0);const target=e.brain.targetX;
 g.p.x=220;watch(g,.3);assert.equal(e.brain.targetX,target);assert.ok(e.vx<=0);
 watch(g,2.5);assert.ok(e.brain.targetX>e.homeX);
 g.p.x=32;watch(g,3);assert.equal(e.brain.targetX,null);
});

test('corn maintains throwing distance inside its leash and leads the visible movement only when winding up',()=>{
 for(const [x,sign] of [[140,1],[240,0],[270,1]]){
  const g=scene('corn',{cooldown:2.2,vx:0}),e=g.enemies[0];g.p.x=x;watch(g,.4);assert.equal(Math.sign(e.vx),sign);assert.ok(Math.abs(e.x-e.homeX)<=32);
 }
 const g=scene('corn',{cooldown:.61,vx:0}),e=g.enemies[0];g.p.x=240;g.p.vx=112;watch(g,.04);assert.ok(e.aimX>g.p.x);const target=e.aimX,speed=e.aimSpeed;
 g.p.x=40;g.p.vx=-112;watch(g,.6);assert.equal(e.aimX,target);assert.equal(e.aimSpeed,speed);assert.equal(g.dangers.length,3);assert.ok(g.dangers.every(d=>d.vx>0));
});

test('cloud holds its warned drop column when the player changes direction',()=>{
 const g=scene('cloud',{y:80,cooldown:.61,vx:0}),e=g.enemies[0];g.p.x=100;g.p.vx=112;watch(g,.04);assert.equal(e.warning,true);const drop=e.dropX,x=e.x;
 g.p.x=250;g.p.vx=-112;watch(g,.3);assert.equal(e.dropX,drop);assert.equal(e.x,x);
 while(g.enemies.length===1)updateEnemies(g,STEP,0);
 const child=g.enemies.find(a=>a.parent===0);assert.ok(Math.abs(child.x-drop)<.3);assert.equal(e.dropX,drop);
});

test('enemy decisions are saved and restored with checkpoints, and old checkpoints start with no memory',()=>{
 const g=new Game();g.p.x=g.enemies[0].x-64;g.p.y=194;g.damage=()=>{};watch(g,.6);assert.ok(g.enemies[0].brain);g.saveCheckpoint();
 const remembered=structuredClone(g.enemies[0].brain),saved=decodeSave(encodeSave(g));assert.ok(saved);assert.deepEqual(saved.checkpoint.enemies[0].brain,remembered);
 watch(g,.8);g.restore();assert.deepEqual(g.enemies[0].brain,remembered);
 const fresh=new Game();fresh.restore();assert.equal(fresh.enemies[0].brain,undefined);
});

test('a noticed pursuing mushroom remains stompable through actual movement in all three forms',()=>{
 for(const form of [0,1,2]){
  const g=scene('mushroom');g.p.form=form;g.resizePlayer();g.p.x=100;g.p.y=208-g.p.h;
  for(let n=0;n<20;n++)g.step(STEP,{});for(let n=0;n<24;n++)g.step(STEP,{right:true});
  assert.equal(g.enemies[0].brain.mode,'pursue');
  for(let n=0;n<120&&!g.enemies[0].dead&&g.mode==='playing';n++){
   const target=g.enemies[0].x+1,projected=g.p.x+g.p.vx*.22;
   g.step(STEP,{right:projected<target-1,left:projected>target+1,jump:true,jumpPressed:n===0});
  }
  assert.equal(g.enemies[0].dead,true,`form ${form}`);assert.equal(g.p.form,form);assert.equal(g.mode,'playing');
 }
});
