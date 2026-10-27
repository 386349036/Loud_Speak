const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
import {flyingTarget,jellyTarget} from './enemy-tactics.mjs';
import {prepareTrap,trapStage,TRAP_CYCLE} from './trap-profile.mjs';
import {seesPlayer} from './enemy-tactics.mjs';
import {AQUATIC_MOVE_SCALE,aquaticSwimmer} from './aquatic-speed.mjs';
export function moveFlyer(game,e,dt){
 const ox=e.x,oy=e.y,moveDt=dt*(aquaticSwimmer(e.kind)?AQUATIC_MOVE_SCALE:1);let flightY;
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
  e.x+=clamp(plan.x-e.x,-plan.speed*moveDt,plan.speed*moveDt);
  if(['winged','fish'].includes(e.kind)&&Number.isFinite(plan.y))flightY=e.y+clamp(plan.y-e.y,-80*moveDt,80*moveDt);
 }
 if(e.kind==='jelly'){
  const t=e.phase%2,lift=t<.5?24*Math.sin(t*Math.PI):24*(1-(t-.5)/1.5);
  e.y=e.homeY-lift; // Preserve the pulse arc, traversed at 70% speed.
 }else e.y=Number.isFinite(flightY)?flightY:e.homeY+Math.sin(e.phase*2)*12;
 if(e.kind==='winged')e.y=clamp(e.y,oy-80*dt,oy+80*dt);
 if(e.kind==='winged'){
  e.x=clamp(e.x,0,game.level.width-e.w);
  for(const s of game.solids().filter(s=>!s.oneWay))if(e.x<s.x+s.w&&e.x+e.w>s.x&&e.y<s.y+s.h&&e.y+e.h>s.y){
   if(oy+e.h<=s.y+.1)e.y=s.y-e.h;
   else if(oy>=s.y+s.h-.1)e.y=s.y+s.h;
   else {e.x=ox;e.y=oy;}
  }
 }
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
 e.vx=dt?(e.x-ox)/dt:0;e.vy=dt?(e.y-oy)/dt:0;
 if(Math.abs(e.vx)>.1)e.facing=Math.sign(e.vx);
}
export function moveTrap(game,e,dt){
 prepareTrap(e);
 // A committed warning owns the exposure clock until the shot and follow-through finish.
 // Otherwise the fixed burrow cycle can erase a late acquisition before it fires.
 if(e.spitTimer!=null||e.spitFlash>0)e.phase-=dt;
 const t=e.phase%TRAP_CYCLE,near=Math.abs(game.p.x+game.p.w/2-(e.x+e.w/2))<32&&game.p.y+game.p.h>e.y-24;
 // Wait while hidden, never retract an already visible threat on proximity.
 if(t>=.8&&t<.8+dt*1.1&&near)e.phase-=t-.799;
 const stage=trapStage(e);e.active=stage.name==='idle';e.warning=['rumble','emerge'].includes(stage.name);e.intent=stage.name==='hidden'?'buried':stage.name==='rumble'?'soil-rumble':stage.name==='emerge'?'emerging':stage.name==='idle'?'exposed':'burrowing';e.vx=0;e.vy=0;
 e.spitFlash=Math.max(0,(e.spitFlash||0)-dt);
 const cycle=Math.floor(e.phase/TRAP_CYCLE);
 if(stage.name==='emerge'&&!e.spitPending&&seesPlayer(game,e,144,80)){e.spitPending=true;e.spitDirection=game.p.x+game.p.w/2<e.x+e.w/2?-1:1;e.facing=e.spitDirection;}
 if(stage.name!=='idle'){e.spitTimer=null;if(stage.name!=='emerge'){e.spitDirection=null;e.spitPending=false;}return;}
 if(e.spitCycle!==cycle&&e.spitTimer==null&&(e.spitPending||seesPlayer(game,e,144,80))){
  e.spitTimer=0;e.spitDirection??=game.p.x+game.p.w/2<e.x+e.w/2?-1:1;e.spitPending=false;
 }
 if(e.spitTimer!=null&&e.spitCycle!==cycle){
  e.spitTimer+=dt;e.warning=true;e.intent='spit-cue';e.facing=e.spitDirection;
  if(e.spitTimer>=.35){
   const direction=e.spitDirection;game.dangers.push({x:e.x+e.w/2+direction*(e.w/2+4)-3,y:e.y+6,w:6,h:6,vx:direction*96,vy:0,gravity:0,life:2,kind:'plant-seed'});
   e.spitCycle=cycle;e.spitTimer=null;e.spitFlash=.3;e.warning=false;e.intent='spit';game.emitSound?.('plant-spit',e);
  }
 }else if(e.spitFlash>0)e.intent='spit';
}
export function moveWaterLeaper(game,e,dt){
 const water=game.level.water?.find(w=>e.homeX>=w.x&&e.homeX+e.w<=w.x+w.w);
 if(!water)return false;
 e.leapVX??=e.vx||-24;
 e.leapPhase??='wait';e.leapTimer=(e.leapTimer||0)+dt;
 if(e.leapPhase==='wait'){
  e.active=false;e.warning=true;e.x=e.homeX;e.y=water.y-e.h+2;e.vx=0;e.vy=0;
  if(e.leapTimer>=.5){e.leapPhase='rise';e.leapTimer=0;e.warning=false;e.active=true;e.vx=e.leapVX*AQUATIC_MOVE_SCALE;e.vy=-300*AQUATIC_MOVE_SCALE;}
 }else if(e.leapPhase==='splash'){
  e.active=false;e.warning=false;e.vx=0;e.vy=0;
  if(e.leapTimer>=.3){e.leapPhase='wait';e.leapTimer=0;}
 }else{
  e.active=true;e.vy+=600*AQUATIC_MOVE_SCALE**2*dt;e.x=clamp(e.x+e.vx*dt,water.x+2,water.x+water.w-e.w-2);e.y+=e.vy*dt;
  if(e.vy>=0)e.leapPhase='fall';
  if(e.leapPhase==='fall'&&e.y+e.h>=water.y+2){e.y=water.y-e.h+2;e.leapPhase='splash';e.leapTimer=0;e.active=false;e.vx=0;e.vy=0;}
 }
 e.grounded=false;return true;
}
