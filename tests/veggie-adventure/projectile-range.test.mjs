import test from 'node:test';
import assert from 'node:assert/strict';
import {limitProjectileRange,PROJECTILE_RANGE} from '../../public/games/veggie-adventure/js/core/projectile-range.mjs';
import {updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';
test('ten-tile flight limit counts leftward, diagonal, vertical and returning movement',()=>{
 assert.equal(PROJECTILE_RANGE,160);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[.6,-.8]]){
  const p={x:100,y:100,life:10};let expired=false;
  for(let n=0;n<17;n++){const x=p.x,y=p.y;p.x+=dx*10;p.y+=dy*10;expired=limitProjectileRange(p,x,y);if(expired)break;}
  assert.ok(expired);assert.equal(p.travelled,160);assert.equal(p.life,0);assert.ok(Math.abs(Math.hypot(p.x-100,p.y-100)-160)<1e-6);
 }
 const p={x:80,y:0,travelled:80,life:10};p.x=0;assert.ok(limitProjectileRange(p,80,0));assert.equal(p.life,0);
});
test('delayed enemy throws wait, expire at range and cannot hit a hero beyond ten tiles',()=>{
 const p={x:190,y:80,w:12,h:14};let hits=0;
 const g={p,level:{hazards:[]},time:0,dangers:[{x:0,y:80,w:5,h:5,vx:100,vy:0,life:20,delay:1,kind:'seed'}],solids:()=>[],damage:()=>hits++};
 for(let n=0;n<60;n++)updateDangers(g,1/120);assert.equal(g.dangers[0].x,0);assert.equal(g.dangers[0].travelled,undefined);
 for(let n=0;n<400;n++)updateDangers(g,1/120);assert.equal(g.dangers.length,0);assert.equal(hits,0);
});
