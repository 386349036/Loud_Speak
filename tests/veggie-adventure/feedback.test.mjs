import test from 'node:test';
import assert from 'node:assert/strict';
import {jumpProfile} from '../../public/games/veggie-adventure/js/core/jump-profile.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {playerClip} from '../../public/games/veggie-adventure/js/core/animation.mjs';
test('ordinary movement uses running animation and no separate sprint speed',()=>{
 const l={...structuredClone(LEVELS[0]),platforms:[{x:0,y:208,w:1536,h:32}],blocks:[],enemies:[],items:[]};
 const a=new Game(l),b=new Game(l);for(let i=0;i<120;i++){a.step(STEP,{right:true});b.step(STEP,{right:true,run:true});}
 assert.equal(a.p.vx,112);assert.equal(a.p.x,b.p.x);assert.equal(playerClip(a),'run');
 a.p.vx=12;assert.equal(playerClip(a),'run');a.p.vx=0;assert.equal(playerClip(a),'idle');
});
test('all forms share the initial-form jump height, distance and release cutoff',()=>{
 for(const form of [0,1,2])for(const charge of [0,.5,1]){const j=jumpProfile(form,charge);assert.deepEqual(j,jumpProfile(0,charge));assert.ok(Math.abs(j.velocity*j.velocity/(2*j.gravity)-(64+16*charge))<1e-10);assert.ok(j.fallGravity>j.gravity);}
});

function chargeGame(form=0){
 const l={...structuredClone(LEVELS[0]),platforms:[{x:0,y:208,w:4096,h:32}],width:4096,exit:4000,checkpoint:3900,blocks:[],enemies:[],items:[],boss:null};
 const g=new Game(l,{form});for(let n=0;n<30;n++)g.step(STEP,{});return g;
}
test('air momentum persists without input and reversal brakes before changing direction',()=>{
 const g=chargeGame();for(let n=0;n<120;n++)g.step(STEP,{right:true});
 g.step(STEP,{jump:true,jumpPressed:true,right:true});
 const vx=g.p.vx;for(let n=0;n<20;n++)g.step(STEP,{jump:true});assert.equal(g.p.vx,vx);
 for(let n=0;n<12;n++)g.step(STEP,{left:true,jump:true});assert.ok(g.p.vx>0&&g.p.vx<vx);
 for(let n=0;n<60;n++)g.step(STEP,{left:true,jump:true});assert.ok(g.p.vx<0);
});
test('late edge jump and just-before-landing buffered jump work without an air double jump',()=>{
 const g=chargeGame();g.level.platforms=[{x:0,y:208,w:100,h:32}];g.p.x=90;g.p.vx=112;
 for(let n=0;n<14;n++)g.step(STEP,{right:true});assert.equal(g.p.grounded,false);
 g.step(STEP,{right:true,jump:true,jumpPressed:true});assert.ok(g.p.vy<0);
 const rising=g.p.vy;g.step(STEP,{jump:true,jumpPressed:true});assert.ok(g.p.vy>rising);
 const b=chargeGame();b.p.y=178;b.p.vy=180;b.p.grounded=false;
 b.step(STEP,{jump:true,jumpPressed:true});let bounced=false;
 for(let n=0;n<20;n++){b.step(STEP,{jump:true});if(b.p.vy<0){bounced=true;break;}}
 assert.ok(bounced);
});
test('ordinary ground movement accumulates half speed at half second and full speed at one second',()=>{
 const g=chargeGame();for(let n=0;n<60;n++)g.step(STEP,{right:true});
 assert.ok(Math.abs(g.p.vx-56)<1e-8);assert.ok(Math.abs(g.p.runCharge-.5)<1e-8);
 for(let n=0;n<60;n++)g.step(STEP,{right:true});assert.ok(Math.abs(g.p.vx-112)<1e-8);assert.equal(g.p.runCharge,1);
 for(let n=0;n<61;n++)g.step(STEP,{});assert.equal(g.p.vx,0);assert.equal(g.p.runCharge,0);
 g.blocks.push({x:g.p.x+g.p.w,y:176,w:16,h:32,kind:'brick'});
 for(let n=0;n<120;n++)g.step(STEP,{right:true});assert.equal(g.p.runCharge,0);
 g.restore();assert.equal(g.p.runCharge,0);assert.equal(g.p.jumpPhysics,null);
});
test('standing, partial and full run jumps increase height and distance equally for all body forms',()=>{
 const reference=[];
 for(const form of [0,1,2]){
  const measured=[];
  for(const frames of [0,60,120]){
   const g=chargeGame(form);for(let n=0;n<frames;n++)g.step(STEP,{right:true});
   const foot=g.p.y+g.p.h,start=g.p.x;let apex=foot,profile;
   for(let n=0;n<180;n++){
    g.step(STEP,{right:frames>0,jump:true,jumpPressed:n===0});
    if(n===0)profile=structuredClone(g.p.jumpPhysics);
    if(!g.p.grounded)assert.deepEqual(g.p.jumpPhysics,profile);
    apex=Math.min(apex,g.p.y+g.p.h);if(n>0&&g.p.grounded)break;
   }
   measured.push({height:foot-apex,distance:g.p.x-start});
  }
  assert.ok(measured[0].height<measured[1].height&&measured[1].height<measured[2].height);
  assert.ok(measured[0].distance<measured[1].distance&&measured[1].distance<measured[2].distance);
  if(!form)reference.push(...measured);else for(let n=0;n<3;n++){assert.ok(Math.abs(measured[n].height-reference[n].height)<1e-8);assert.ok(Math.abs(measured[n].distance-reference[n].distance)<1e-8);}
 }
});
test('all static above-ground blocks are breakable, clear of pits and collectible seeds',()=>{
 for(const l of LEVELS){assert.ok(l.platforms.every(p=>p.y>=208||p.waterBank),l.id);const ground=[...l.platforms].sort((a,b)=>a.x-b.x);let end=0;const gaps=[];for(const p of ground){if(p.x>end)gaps.push({x:end,w:p.x-end});end=Math.max(end,p.x+p.w);}
 for(const b of l.blocks){assert.equal(b.breakable,true,l.id);assert.ok(!gaps.some(g=>b.x<g.x+g.w+128&&b.x+b.w>g.x-128),l.id+' pit clearance');}
 for(const i of l.items.filter(i=>i.kind==='seed'))assert.ok(![...l.platforms,...l.blocks,...(l.gates||[])].some(s=>overlap(i,s)),l.id+' seed overlap');}
});
