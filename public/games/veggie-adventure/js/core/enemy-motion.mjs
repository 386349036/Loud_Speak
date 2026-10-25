const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
import {flyingTarget,jellyTarget} from './enemy-tactics.mjs';
export function moveFlyer(game,e,dt){
 const ox=e.x,oy=e.y;
 if(e.kind==='winged'&&!e.flightHomeSet){
  const floor=Math.min(208,...game.solids().filter(s=>s.y>=e.homeY&&e.x+e.w>s.x&&e.x<s.x+s.w).map(s=>s.y));
  e.homeY=Math.min(e.homeY,floor-e.h-16);e.flightHomeSet=true;
 }
 if(e.kind==='cloud'){
  const target=clamp(game.p.x+game.p.w/2+clamp(game.p.vx*.25,-20,20),e.homeX-64,e.homeX+64);
  e.intent=e.warning?'drop-cue':e.dropTimer>0?'drop':'follow';
  if(!e.warning&&!(e.dropTimer>0))e.x+=clamp(target-e.x,-18*dt,18*dt);
 }else {
  const patrol=e.homeX+Math.sin(e.phase*(e.kind==='fish'?1.2:.8))*24;
  const plan=e.kind==='jelly'?jellyTarget(game,e,dt,patrol):flyingTarget(game,e,dt,patrol);
  e.x+=clamp(plan.x-e.x,-plan.speed*dt,plan.speed*dt);
 }
 if(e.kind==='jelly'){
  const t=e.phase%2,lift=t<.5?24*Math.sin(t*Math.PI):24*(1-(t-.5)/1.5);
  e.y=e.homeY-lift; // Pulse upward for .5s, then drift down for 1.5s.
 }else e.y=e.homeY+Math.sin(e.phase*2)*12;
 if(e.kind==='winged')e.y=clamp(e.y,oy-80*dt,oy+80*dt);
 if(['fish','jelly'].includes(e.kind)){
  const water=game.level.water?.find(w=>e.homeX+e.w>w.x&&e.homeX<w.x+w.w);
  if(water){
   e.x=clamp(e.x,water.x+2,water.x+water.w-e.w-2);
   const floors=game.solids().filter(s=>s.y>water.y&&e.x+e.w>s.x&&e.x<s.x+s.w).map(s=>s.y);
   e.y=clamp(e.y,water.y+2,Math.min(water.y+water.h-2,...floors)-e.h);
   const solids=game.solids();
   const intersects=(x,y,s)=>x<s.x+s.w&&x+e.w>s.x&&y<s.y+s.h&&y+e.h>s.y;
   for(const s of solids)if(intersects(e.x,e.y,s)){
    const options=[{x:s.x-e.w,y:e.y},{x:s.x+s.w,y:e.y},{x:e.x,y:s.y-e.h},{x:e.x,y:s.y+s.h}]
     .filter(v=>v.x>=water.x&&v.x+e.w<=water.x+water.w&&v.y>=water.y&&v.y+e.h<=water.y+water.h&&!solids.some(s=>intersects(v.x,v.y,s)))
     .sort((a,b)=>Math.abs(a.x-e.x)+Math.abs(a.y-e.y)-Math.abs(b.x-e.x)-Math.abs(b.y-e.y));
    if(options.length){e.x=options[0].x;e.y=options[0].y;}
   }
  }
 }
 e.vx=(e.x-ox)/dt;e.vy=(e.y-oy)/dt;
 if(Math.abs(e.vx)>.1)e.facing=Math.sign(e.vx);
}
export function moveTrap(game,e,dt){
 const t=e.phase%3,near=Math.abs(game.p.x+game.p.w/2-(e.x+e.w/2))<24&&game.p.y+game.p.h>e.y-24;
 // Wait while hidden, never retract an already visible threat on proximity.
 if(t>=.8&&t<.8+dt*1.1&&near)e.phase-=t-.799;
 const phase=e.phase%3;e.active=phase>=1.2&&phase<2.6;e.warning=phase>=.8&&phase<1.2;e.vx=0;e.vy=0;
}
export function moveWaterLeaper(game,e,dt){
 const water=game.level.water?.find(w=>e.homeX>=w.x&&e.homeX+e.w<=w.x+w.w);
 if(!water)return false;
 e.leapVX??=e.vx||-24;
 e.leapPhase??='wait';e.leapTimer=(e.leapTimer||0)+dt;
 if(e.leapPhase==='wait'){
  e.active=false;e.warning=true;e.x=e.homeX;e.y=water.y-e.h+2;e.vx=0;e.vy=0;
  if(e.leapTimer>=.5){e.leapPhase='rise';e.leapTimer=0;e.warning=false;e.active=true;e.vx=e.leapVX;e.vy=-300;}
 }else if(e.leapPhase==='splash'){
  e.active=false;e.warning=false;e.vx=0;e.vy=0;
  if(e.leapTimer>=.3){e.leapPhase='wait';e.leapTimer=0;}
 }else{
  e.active=true;e.vy+=600*dt;e.x=clamp(e.x+e.vx*dt,water.x+2,water.x+water.w-e.w-2);e.y+=e.vy*dt;
  if(e.vy>=0)e.leapPhase='fall';
  if(e.leapPhase==='fall'&&e.y+e.h>=water.y+2){e.y=water.y-e.h+2;e.leapPhase='splash';e.leapTimer=0;e.active=false;e.vx=0;e.vy=0;}
 }
 e.grounded=false;return true;
}
