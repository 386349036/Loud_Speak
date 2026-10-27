import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {updateBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function scene(kind){const l=structuredClone(levelById('4-1'));Object.assign(l,{width:800,exit:750,platforms:[{x:0,y:240,w:800,h:16}],water:[{x:64,y:96,w:640,h:144}],enemies:[],items:[],blocks:[],movers:[],gates:[],turrets:[],hazards:[],boss:null});const g=new Game(l);g.p.x=350;g.p.y=180;const e={id:0,kind,x:200,y:160,w:14,h:14,homeX:200,homeY:160,vx:-20,vy:0,state:'walk',timer:0,grace:0,phase:0,dead:false};g.enemies=[e];return {g,e};}
const watch=(g,seconds)=>{for(let n=0;n<Math.round(seconds/STEP);n++)updateEnemies(g,STEP,0);};

test('fish pursuit has exactly 70 percent horizontal and vertical speed while winged enemies retain theirs',()=>{
 for(const [kind,speedX,speedY] of [['fish',44.8,56],['winged',112,80]]){const {g,e}=scene(kind);e.brain={engaged:true,mode:'pursue',timer:0,seen:.3,direction:1};const x=e.x,y=e.y;updateEnemies(g,STEP,0);near(e.x-x,speedX*STEP);near(e.y-y,speedY*STEP);near(e.vx,speedX);near(e.vy,speedY);}
});

test('fish patrol and jelly vertical pulse traverse the same paths at 70 percent speed',()=>{
 const fish=scene('fish');fish.g.p.x=0;watch(fish.g,1);near(fish.e.x,200+24*Math.sin(.7*1.2));near(fish.e.phase,.7);
 const jelly=scene('jelly');jelly.g.p.x=0;watch(jelly.g,.5);near(jelly.e.y,160-24*Math.sin(.35*Math.PI));watch(jelly.g,.5);near(jelly.e.y,160-24*(1-(.7-.5)/1.5));near(jelly.e.vy,11.2);
});

test('jelly horizontal approach slows to 16.8 units per second without delaying recognition of a pulse target',()=>{
 const {g,e}=scene('jelly');g.p.x=220;const x=e.x;updateEnemies(g,STEP,0);near(e.vx,16.8);near(e.x-x,16.8*STEP);assert.equal(e.intent,'pulse-approach');
});

test('water leaper keeps its warning and arc size while launch speed and flight gravity give slower traversal',()=>{
 const {g,e}=scene('leaper');g.level.water[0].y=160;watch(g,.5);assert.equal(e.leapPhase,'rise');near(e.vx,-14);near(e.vy,-210);const startX=e.x,startY=e.y;let peak=startY,flight=0;
 while(e.leapPhase!=='splash'&&flight<3){watch(g,STEP);peak=Math.min(peak,e.y);flight+=STEP;}
 assert.equal(e.leapPhase,'splash');near(flight,1/.7,.025);near(startY-peak,75,2);near(startX-e.x,20,.6);assert.equal(e.leapVX,-20);
});

test('water boss leap uses a slower continuous path, retaining projectile speed and completing into a weak window',()=>{
 const g=new Game(levelById('4-4')),b=g.boss;Object.assign(b,{active:true,phase:'attack',pattern:'double-fan',timer:.5,startX:b.x,startY:192});g.p.x=b.left;g.p.y=194;const startX=b.x;updateBoss(g,0,208);near(b.x,startX+(b.left+8-startX)*(.5*.7/1.05));assert.equal(g.dangers.length,3);assert.ok(g.dangers.every(d=>Math.abs(d.vx)===85));
 b.timer=1.49;updateBoss(g,0,208);assert.equal(b.phase,'attack');b.timer=1.501;updateBoss(g,0,208);assert.equal(b.phase,'expose');near(b.x,b.left+8);near(b.y,176);
});
