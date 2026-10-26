import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import sharp from 'sharp';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {createRenderer,cameraX} from '../../public/games/veggie-adventure/js/render.mjs';
import {hazardShapes,updateEnvironment,updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';
import {objectReviewPoints,reviewSpawn} from '../../public/games/veggie-adventure/js/object-review.mjs';
const manifest=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
function draw(g,width=256){const calls=[],fills=[],stack=[];let x=0,y=0;const ctx=new Proxy({save(){stack.push([x,y,this.fillStyle]);},restore(){[x,y,this.fillStyle]=stack.pop();},setTransform(){x=0;y=0;},translate(dx,dy){x+=dx;y+=dy;},drawImage(img,...args){calls.push({id:img.id,args,x:x+(args.length===4?args[0]:args[4]),y:y+(args.length===4?args[1]:args[5])});},fillRect(...args){fills.push({args,color:this.fillStyle});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});const before=g.snapshot();createRenderer({width:width*3,getContext:()=>ctx},new Map(manifest.assets.map(a=>[a.id,{id:a.id}])),null)(g);assert.deepEqual(g.snapshot(),before);return {calls,fills};}
function flat(form=0){const l=structuredClone(LEVELS[0]);Object.assign(l,{width:1000,exit:950,platforms:[{x:0,y:208,w:1000,h:32}],blocks:[],enemies:[],items:[],movers:[],hazards:[],turrets:[],gates:[],water:[],boss:null});return new Game(l,{form});}

test('all remaining trap, water, support and projectile objects draw PNGs even without animation tracks',()=>{
 const g=flat();g.level.hazards=[{x:120,y:164,w:8,h:8,kind:'chain',radius:24,period:5},{x:200,y:24,w:12,h:12,kind:'rock',period:4,on:1}];g.level.water=[{x:256,y:144,w:101,h:80}];g.gates=[{x:400,y:176,w:16,h:32,open:false}];g.movers=[{x:450,y:160,w:48,h:8,kind:'lift'},{x:520,y:160,w:48,h:8,kind:'crumble',timer:.4},{x:600,y:160,w:48,h:8,kind:'ledge',arena:true}];g.dangers=['rock','seed','wave','sweep','burst'].map((kind,i)=>({x:40+i*20,y:100,w:10,h:10,kind,exploded:kind==='burst',vx:0,vy:20,life:1}));g.shots=[{x:60,y:80,vx:20,life:2}];
 const {calls,fills}=draw(g),ids=new Set(calls.map(c=>c.id));for(const id of ['hazard-chain-ball','hazard-chain-link','hazard-chain-anchor','hazard-falling-rock','boss-cue-target','water-body','water-surface','shell-gate','platform-brace','platform-cracked-brace','platform-vine','fx-fallback-seed','fx-fallback-wave','fx-fallback-burst','fx-fallback-fire'])assert.ok(ids.has(id),id);assert.ok(fills.every(f=>f.color==='#152e2e'),'world objects must not fall back to colored rectangles');
 g.gates[0].open=true;assert.ok(!draw(g).calls.some(c=>c.id==='shell-gate'));
});

test('rotating PNG balls stay centered on their original damaging shapes throughout the orbit',()=>{
 for(const l of LEVELS.filter(l=>(l.hazards||[]).some(h=>h.kind==='chain')))for(const time of [.1,1.3,2.6,4.7]){const g=new Game(l);g.time=time;const shapes=hazardShapes(g).filter(h=>h.kind==='chain'),balls=draw(g).calls.filter(c=>c.id==='hazard-chain-ball'),camera=cameraX(g.level,g.p,g.boss,256);assert.equal(balls.length,shapes.length);for(const [i,h] of shapes.entries()){assert.ok(Math.abs(balls[i].x+4-(h.x+3-camera))<=.51);assert.ok(Math.abs(balls[i].y+4-(h.y+3))<=.51);}}
});

test('falling rock and rotating trap still inflict their original contact damage for every player form',()=>{
 for(const form of [0,1,2]){const g=flat(form);g.level.hazards=[{x:200,y:24,w:12,h:12,kind:'rock',period:4,on:1}];g.p.x=200;g.p.y=208-g.p.h;let hits=0;g.damage=()=>hits++;for(let n=0;n<300;n++){g.time+=STEP;updateEnvironment(g,STEP);updateDangers(g,STEP);}assert.ok(hits>0);
  const c=flat(form);c.level.hazards=[{x:200,y:180,w:8,h:8,kind:'chain',radius:20,period:5}];const h=hazardShapes(c)[0];c.p.x=h.x;c.p.y=h.y;let damage=0;c.damage=()=>damage++;updateDangers(c,STEP);assert.ok(damage>0);
 }
});

test('all 32 stages and every object category have safe inspectable points without a gameplay bypass',()=>{
 const points=objectReviewPoints(LEVELS);assert.equal(new Set(points.map(p=>p.id)).size,points.length);assert.equal(points.filter(p=>p.id.endsWith(':entry')).length,32);
 for(const point of points)for(const form of [0,1,2]){const g=new Game(levelById(point.level),{form});reviewSpawn(g,point.x,point.foot);assert.equal(g.p.form,form);assert.equal(g.p.star,0);assert.equal(g.p.hurt,0);assert.ok(!g.solids().filter(b=>!b.oneWay).some(b=>overlap(g.p,b)),point.id);assert.ok(g.p.x>=0&&g.p.x+g.p.w<=g.level.width);}
});

test('generated object PNGs and reused FX fallback frames have visible content and transparent alpha',async()=>{
 const assets=manifest.assets.filter(a=>a.stage==='object-polish-v1');assert.equal(assets.length,14);for(const asset of assets){const {data,info}=await sharp('public/games/veggie-adventure/assets/'+asset.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});let visible=0,clear=0;for(let i=3;i<data.length;i+=4){if(data[i]>40)visible++;if(data[i]===0)clear++;}assert.ok(visible>20,asset.id);if(!asset.id.startsWith('water-'))assert.ok(clear>20,asset.id);assert.equal(info.width,asset.width);assert.equal(info.height,asset.height);}
});

test('a single proportional background covers narrow and wide views throughout the level without repeated landmarks',()=>{
 for(const level of LEVELS.filter(l=>l.stage===1))for(const width of [192,426,650])for(const x of [32,level.width/2,level.width-64]){const g=new Game(level);g.p.x=x;const bg=draw(g,width).calls.filter(c=>c.id===level.background);assert.equal(bg.length,1);const b=bg[0];assert.ok(b.x<=0&&b.x+b.args[2]>=width);assert.ok(b.y<=0&&b.y+b.args[3]>=240);assert.ok(Math.abs(b.args[2]/b.args[3]-430/240)<.02);}
});
