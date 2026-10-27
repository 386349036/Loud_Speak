import {limitProjectileRange} from './projectile-range.mjs';
// Dedicated mechanics for worlds 2-8. Simulation is independent of PNG loading.
export const SIGNATURES={2:'root-quake',3:'husk-lance',4:'lotus-geyser',5:'durian-bounce',6:'kiln-pillars',7:'twin-pincer',8:'crown-split'};
export const isSignature=b=>SIGNATURES[b.kind]===b.pattern;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function danger(g,b,values){g.dangers.push({x:b.x+12,y:b.y+8,w:12,h:12,vx:0,vy:0,gravity:0,life:3,kind:'boss-theme',bossFx:b.kind,age:0,delay:0,frame:1,...values});}
export function signatureTargets(b){
 const x=clamp(b.targetX,b.left+36,b.right-48);
 if(b.kind===2)return [-48,0,48].map((dx,i)=>({x:clamp(x+dx,b.left+12,b.right-28),y:170,w:22,h:38,delay:.25+i*.32,life:.7,behavior:'pillar'}));
 if(b.kind===4)return [-42,42].map((dx,i)=>({x:clamp(x+dx,b.left+16,b.right-36),y:156,w:24,h:52,delay:.3+i*.65,life:.65,behavior:'pillar'}));
 if(b.kind===6)return [-48,48].map((dx,i)=>({x:clamp(x+dx,b.left+16,b.right-36),y:160,w:22,h:48,delay:.3+i*.55,life:.7,behavior:'pillar'}));
 return [];
}
export function releaseSignature(g,b){
 b.signatureDuration=3.1;
 const targets=signatureTargets(b);
 if(targets.length){for(const t of targets)danger(g,b,t);b.signatureDuration=2.25;}
 else if(b.kind===3){danger(g,b,{x:b.x+b.w/2-10,originX:b.x+b.w/2-10,y:184,w:24,h:12,vx:b.direction*145,life:2.8,behavior:'boomerang',direction:b.direction,turnAt:.95});}
 else if(b.kind===5){for(let i=0;i<2;i++)danger(g,b,{y:176,w:14,h:14,vx:b.direction*(88+i*20),vy:-135,gravity:320,delay:i*.4,life:2.8,behavior:'bounce',bounces:0});b.signatureDuration=3.5;}
 else if(b.kind===7){danger(g,b,{x:b.left+12,y:192,w:16,h:16,vx:108,life:3.6,behavior:'orb'});danger(g,b,{x:b.right-28,y:166,w:16,h:16,vx:-108,delay:.65,life:3.6,behavior:'orb'});b.signatureDuration=4.3;}
 else if(b.kind===8){danger(g,b,{x:clamp(b.targetX,b.left+48,b.right-64),y:116,w:18,h:18,life:1.1,behavior:'split',frame:0});b.signatureDuration=3.6;}
}
// Returns true for dedicated hazards; warning time never consumes active life.
export function updateSignatureDanger(g,d,dt){
 if(d.kind!=='boss-theme')return false;
 if(d.delay>0){d.delay=Math.max(0,d.delay-dt);return true;}
 d.age=(d.age||0)+dt;d.life-=dt;
 if(d.behavior==='split'){
  d.frame=Math.min(2,Math.floor(d.age*2.7));
  if(d.life<=0&&!d.split){d.split=true;for(const vx of [-100,-50,50,100])g.dangers.push({x:d.x+6,y:d.y+6,w:7,h:10,vx,vy:Math.abs(vx)===100?20:60,gravity:0,life:2,kind:'boss-theme',bossFx:8,age:0,frame:3,behavior:'shard',delay:.2});}
  return true; // charging core is a visible, harmless preparation.
 }
 if(d.behavior==='boomerang'&&!d.turned&&(d.age>=d.turnAt||d.x<g.boss.left+16||d.x+d.w>g.boss.right-16)){d.turned=true;d.vx=-d.vx;d.y=158;}
 const oldX=d.x,oldY=d.y;d.vy+=(d.gravity||0)*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
 if(limitProjectileRange(d,oldX,oldY))return true;
 if(d.behavior==='bounce'&&d.y+d.h>=208){d.y=208-d.h;d.vy=-Math.max(65,Math.abs(d.vy)*.62);if(++d.bounces>2)d.life=0;}
 if(d.behavior==='boomerang'&&d.turned&&(d.direction<0?d.x>=d.originX:d.x<=d.originX))d.life=0;
 if(d.behavior==='pillar')d.frame=d.age<.13?1:d.life<.15?3:2;
 else if(!['shard'].includes(d.behavior))d.frame=1+Math.floor(d.age*8)%2;
 // Geometry is smaller than the visible effect; no giant invisible hitboxes.
 if(d.life>0&&g.p.x<d.x+d.w&&g.p.x+g.p.w>d.x&&g.p.y<d.y+d.h&&g.p.y+g.p.h>d.y){g.damage();d.life=0;}
 if(d.behavior==='shard'&&d.y+d.h>=208)d.life=0;
 if(d.x<(g.boss?.left??0)-32||d.x>(g.boss?.right??g.level.width)+32)d.life=0;
 return true;
}
