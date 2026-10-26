import test from 'node:test';import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {hurtEnemy,updateEnemies,enemyShelled} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {AnimationPlayer} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
function scene(form=0){const g=new Game(undefined,{form});Object.assign(g.level,{width:600,exit:580,platforms:[{x:0,y:208,w:600,h:32}],water:[],hazards:[]});for(const k of ['blocks','items','movers','turrets','gates'])g[k]=[];g.boss=null;const e={id:0,kind:'winged',x:220,y:112,w:14,h:14,homeX:160,homeY:112,vx:80,vy:0,state:'walk',phase:0,timer:0,grace:0,dead:false,brain:{mode:'pursue',engaged:true,targetX:230,targetY:194}};g.enemies=[e];return {g,e};}
const tick=g=>{g.time+=STEP;updateEnemies(g,STEP,g.p.y+g.p.h);};

test('a real stomp in every hero form makes the flyer unconscious, preserves its species and starts the timer only on landing',()=>{
 for(const form of [0,1,2]){const {g,e}=scene(form),a=new AnimationPlayer();a.update(g,0);Object.assign(g.p,{x:e.x+(e.w-g.p.w)/2,y:e.y-g.p.h+.2,vy:40});g.step(STEP);a.update(g,STEP);
  assert.equal(e.kind,'winged');assert.equal(e.state,'stunned');assert.equal(e.hp,2);assert.equal(e.maxHp,3);assert.equal(e.vx,0);assert.equal(e.brain,undefined);assert.equal(g.mode,'playing');assert.equal(g.p.form,form);assert.equal(a.get(e).actor,'E02');assert.equal(a.get(e).clip,'retract');
  g.p.x=32;g.p.y=208-g.p.h;const x=e.x;let fell=false;
  for(let n=0;n<360&&!e.grounded;n++){const y=e.y;tick(g);a.update(g,STEP);assert.equal(e.x,x);assert.equal(e.state,'stunned');assert.equal(e.kind,'winged');assert.ok(e.y>=y);assert.ok(['retract','shell-idle'].includes(a.get(e).clip));if(!e.grounded)assert.equal(e.timer,0);fell||=e.y>112;}
  assert.ok(fell);assert.ok(e.grounded);assert.equal(e.y+e.h,208);assert.ok(e.timer<=STEP+1e-9);
 }
});

test('a stunned flyer cannot hurt or roll on side contact, remains stompable to zero HP, and uses flying stomp sounds',()=>{
 for(const form of [0,1,2]){const {g,e}=scene(form);hurtEnemy(g,e,'stomp');g.p.x=32;for(let n=0;n<240&&!e.grounded;n++)tick(g);
  g.p.x=e.x+e.w-2;g.p.y=208-g.p.h;tick(g);assert.equal(g.mode,'playing');assert.equal(g.p.form,form);assert.equal(e.state,'stunned');assert.equal(e.vx,0);assert.equal(enemyShelled(e),false);
  for(let hit=0;hit<2;hit++){Object.assign(g.p,{x:e.x+(e.w-g.p.w)/2,y:e.y-g.p.h+.2,vy:40});updateEnemies(g,STEP,e.y);assert.equal(e.hp,1-hit);assert.equal(g.p.form,form);assert.equal(g.mode,'playing');assert.equal(g.soundEvents.at(-1).id,'stomp-flight');}
  assert.equal(e.dead,true);assert.equal(e.kind,'winged');
 }
});

test('after nine grounded seconds the flyer wakes and resumes flight smoothly from the landing position',()=>{
 const {g,e}=scene(),a=new AnimationPlayer();hurtEnemy(g,e,'stomp');g.p.x=32;for(let n=0;n<240&&!e.grounded;n++)tick(g);const x=e.x;
 while(e.timer<8){tick(g);assert.equal(e.state,'stunned');assert.equal(e.x,x);assert.equal(e.vx,0);}
 a.update(g,0);assert.equal(a.get(e).clip,'wake');assert.equal(a.get(e).actor,'E02');
 while(e.state==='stunned')tick(g);assert.equal(e.kind,'winged');assert.equal(e.hp,2);assert.equal(e.intent,'recover-flight');const y=e.y;
 tick(g);a.update(g,STEP);assert.equal(a.get(e).actor,'E11');assert.equal(a.get(e).clip,'fly');assert.ok(e.y<y);assert.ok(Math.abs(e.y-y)<=80*STEP+1e-8);assert.ok(Math.abs(e.x-x)<=112*STEP+1e-8);
});

test('stunned flight state round-trips in real campaign checkpoints without changing the enemy species',()=>{
 const l=LEVELS.find(l=>l.enemies.some(e=>e.kind==='winged')),g=new Game(l),e=g.enemies.find(e=>e.kind==='winged');hurtEnemy(g,e,'stomp');g.saveCheckpoint();const saved=decodeSave(encodeSave(g));assert.ok(saved);assert.equal(saved.checkpoint.enemies.find(v=>v.id===e.id).state,'stunned');g.restore();const restored=g.enemies.find(v=>v.id===e.id);assert.equal(restored.kind,'winged');assert.equal(restored.state,'stunned');assert.equal(restored.hp,2);
 const invalid=JSON.parse(encodeSave(g));invalid.checkpoint.enemies.find(v=>v.id===e.id).kind='mushroom';assert.equal(decodeSave(JSON.stringify(invalid)),null);
});
