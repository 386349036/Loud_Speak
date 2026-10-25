import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies,enemyFacing,enemyActive} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {AnimationPlayer,enemyClip} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const actor=(kind,extra={})=>({id:0,kind,x:160,y:194,w:14,h:14,vx:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,...extra});
function scene(kind,extra={}){const g=new Game();Object.assign(g.level,{platforms:[{x:0,y:208,w:600,h:32}],water:[],hazards:[],exit:580,checkpoint:570,width:600});g.enemies=[actor(kind,extra)];g.items=[];g.blocks=[];g.movers=[];g.boss=null;g.turrets=[];g.gates=[];g.p.x=32;return g;}
const watch=(g,seconds)=>{for(let n=0;n<Math.round(seconds/STEP);n++)updateEnemies(g,STEP,0);};

test('flying enemies face their real direction after turning without retaining their spawn velocity',()=>{
 for(const kind of ['fish','jelly','winged','cloud']){
  const g=scene(kind,{y:140}),e=g.enemies[0];g.p.x=340;
  const before=e.x;watch(g,.2);assert.ok(e.x>before);assert.equal(enemyFacing(e),1);
  if(kind==='cloud'){g.p.x=40;watch(g,.2);}else watch(g,2.4);
  assert.equal(enemyFacing(e),-1,kind);
 }
});

test('every configured fish and jelly stays within its water and above overlapping terrain',()=>{
 for(const l of LEVELS)for(const source of l.enemies.filter(e=>['fish','jelly'].includes(e.kind))){
  const g=new Game(l);g.enemies=[structuredClone(source)];g.p.x=source.x-100;g.damage=()=>{};
  const e=g.enemies[0],water=l.water.find(w=>source.x+source.w>w.x&&source.x<w.x+w.w);assert.ok(water,l.id);
  for(let n=0;n<120*6;n++){updateEnemies(g,STEP,0);assert.ok(e.x>=water.x&&e.x+e.w<=water.x+water.w,l.id);assert.ok(e.y>=water.y&&e.y+e.h<=water.y+water.h,l.id);assert.ok(!g.solids().some(s=>overlap(e,s)),`${l.id}/${source.kind} overlaps terrain`);}
 }
});

test('low-altitude winged cabbage patrol no longer sinks into the ground',()=>{
 const g=scene('winged'),e=g.enemies[0];for(let n=0;n<120*8;n++){updateEnemies(g,STEP,0);assert.ok(e.y+e.h<=208);}
});

test('trap waits beside a player in all forms, then provides emergence time before becoming dangerous',()=>{
 for(const form of [0,1,2]){
  const g=scene('trap',{phase:.7,vx:0}),e=g.enemies[0];g.p.form=form;g.resizePlayer();g.p.x=160;g.p.y=208-g.p.h;
  for(let n=0;n<120*5;n++){updateEnemies(g,STEP,208);assert.equal(enemyActive(e),false);assert.equal(g.mode,'playing');assert.equal(enemyClip(e),'hidden');}
  g.p.x=90;let visible=0;
  for(let n=0;n<120&&!e.active;n++){updateEnemies(g,STEP,208);if(enemyClip(e)==='emerge')visible+=STEP;}
  assert.ok(visible>=.38);assert.equal(e.active,true);assert.equal(enemyClip(e),'idle');
 }
});

test('corn faces and locks its warned throw direction even if the player crosses behind it',()=>{
 const g=scene('corn',{vx:12,cooldown:.61}),e=g.enemies[0];g.damage=()=>{};g.p.x=40;watch(g,.05);
 assert.equal(e.warning,true);assert.equal(enemyFacing(e),-1);
 g.p.x=280;watch(g,.6);assert.equal(g.dangers.length,3);assert.ok(g.dangers.every(d=>d.vx<0));assert.equal(enemyFacing(e),-1);
 assert.equal(enemyClip(e),'throw');
});

test('cloud follows within a bounded area and postpones a drop that would overlap the player',()=>{
 const g=scene('cloud',{y:80,vx:0,cooldown:0}),e=g.enemies[0];g.p.x=160;g.p.y=90;watch(g,.01);
 assert.equal(g.enemies.length,1);assert.ok(e.cooldown>0);
 g.p.y=194;g.p.x=32;watch(g,12);assert.ok(e.x>=e.homeX-64&&e.x<=e.homeX+64);
 assert.ok(g.enemies.filter(a=>!a.dead&&a.parent===e.id).length<=3);
});

test('water leaper warns, jumps on a fixed arc, splashes and hides before another warning',()=>{
 const g=scene('leaper',{x:160,y:200,vx:-20}),e=g.enemies[0];g.level.water=[{x:96,y:176,w:192,h:48}];
 const stages=new Set();let warning=0,air=0;
 for(let n=0;n<120*3;n++){
  updateEnemies(g,STEP,0);stages.add(e.leapPhase);
  if(e.leapPhase==='wait'){warning+=STEP;assert.equal(enemyActive(e),false);assert.equal(enemyClip(e),'hidden');}
  if(['rise','fall'].includes(e.leapPhase)){air++;assert.equal(enemyActive(e),true);assert.notEqual(enemyClip(e),'splash');}
  if(e.leapPhase==='splash'){assert.equal(enemyActive(e),false);assert.equal(enemyClip(e),'splash');}
  if(n===80)g.p.x=250;
 }
 assert.ok(warning>.9);assert.ok(air>80);assert.deepEqual([...stages].sort(),['fall','rise','splash','wait']);assert.equal(e.leapVX,-20);
});

test('ground leaper landing animation finishes before its next ascent begins',()=>{
 const g=scene('leaper',{vx:0}),a=new AnimationPlayer();a.update(g,0);let grounded=0;
 for(let n=0;n<59;n++){updateEnemies(g,STEP,0);a.update(g,STEP);if(g.enemies[0].grounded)grounded++;assert.equal(g.enemies[0].vy,0);}
 assert.ok(grounded>=58);watch(g,.03);a.update(g,.03);assert.ok(g.enemies[0].vy<0);assert.equal(a.get(g.enemies[0]).clip,'leap');
});

test('shell wake cue lasts about one second before walking resumes',()=>{
 for(const kind of ['cabbage','walnut']){
  const g=scene(kind,{state:'shell',timer:7.95,vx:0}),e=g.enemies[0];let warned=0;
  for(let n=0;n<140&&e.state==='shell';n++){updateEnemies(g,STEP,0);if(enemyClip(e)==='wake')warned+=STEP;}
  assert.equal(e.state,'walk');assert.ok(warned>=.98);
 }
});

test('defeat interrupts landing transitions and mushroom fire hits do not play stomp flattening',()=>{
 const g=scene('leaper',{vx:0}),e=g.enemies[0],a=new AnimationPlayer();a.update(g,0);updateEnemies(g,STEP,0);a.update(g,STEP);assert.equal(a.get(e).clip,'splash');
 e.dead=true;a.update(g,STEP);assert.equal(a.get(e).clip,'hit');assert.equal(a.ghosts[0].clip,'hit');
 assert.equal(enemyClip({kind:'mushroom',dead:true,defeatedBy:'stomp'}),'flatten');
 assert.equal(enemyClip({kind:'mushroom',dead:true,defeatedBy:'hit'}),'hit');
});

test('a cloud with three live children stops empty throws and warns again when a slot opens',()=>{
 const g=scene('cloud',{y:80,vx:0,cooldown:.3}),e=g.enemies[0];
 for(let i=0;i<3;i++)g.enemies.push(actor('spike',{id:'child-'+i,parent:0,x:250+i*20,vx:0}));
 watch(g,4);assert.equal(e.warning,false);assert.equal(enemyClip(e),'float');assert.equal(g.enemies.length,4);
 g.enemies[1].dead=true;watch(g,.2);assert.equal(e.warning,true);assert.equal(enemyClip(e),'windup');
 watch(g,.6);assert.equal(g.enemies.filter(a=>!a.dead&&a.parent===0).length,3);assert.equal(enemyClip(e),'drop');
});

test('jelly pulse animation accompanies upward motion and float accompanies the slow return',()=>{
 const g=scene('jelly',{y:168}),e=g.enemies[0];g.level.water=[{x:96,y:144,w:192,h:80}];
 watch(g,.25);assert.equal(enemyClip(e),'pulse');assert.ok(e.vy<0);assert.ok(e.y<160);
 watch(g,.5);assert.equal(enemyClip(e),'float');assert.ok(e.vy>0&&e.vy<=17);assert.ok(e.y<168);
});
