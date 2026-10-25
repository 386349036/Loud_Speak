import {overlap} from './geometry.mjs';
import {predictedBossTarget,rememberBossAttack} from './boss-awareness.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const face=(b,p)=>p.x+p.w/2<b.x+b.w/2?-1:1;
const floorAt=(g,x,ceiling=208)=>Math.min(208,...g.movers.filter(m=>m.arena&&x+32>m.x&&x<m.x+m.w&&m.y>=ceiling-2).map(m=>m.y));
export function gardenWeakTop(g,b){return Math.min(b.y,...g.movers.filter(m=>m.arena&&b.x+b.w>m.x&&b.x<m.x+m.w&&Math.abs(m.y-b.y)<8).map(m=>m.y-6));}
export function gardenDecision(g,b){
 const p=g.p,dx=Math.abs(p.x-b.x),high=p.y+p.h<195;
 if(!b.cycle)return {pattern:'slam',intent:'teach'}; // Teach the first cue before reacting to the player.
 const a=b.awareness;
 if(a&&b.cycle>=a.nextAdaptCycle){
  if(a.ledgeTime>=2.4&&b.lastPattern!=='hop')return {pattern:'hop',intent:'dislodge'};
  if((a.fire>=1.5||a.camp>=2.5&&dx>64)&&b.lastPattern!=='hop')return {pattern:'hop',intent:'flank'};
  if(a.fire>=1.5&&b.lastPattern!=='seeds')return {pattern:'seeds',intent:'suppress'};
 }
 let next=high?(dx>88?'hop':'seeds'):dx>112?'hop':dx<72?(b.hp<3?'dash':'slam'):'seeds';
 if(next===b.lastPattern)next=high?(next==='hop'?'seeds':'hop'):next==='hop'?'seeds':next==='seeds'?'hop':b.hp<3?'dash':'hop';
 if(next===b.lastPattern)next='seeds';
 return {pattern:next,intent:next==='hop'?'pursue':next==='dash'?'spacing':'watch'};
}
export const chooseGardenAttack=(g,b)=>gardenDecision(g,b).pattern;
function enter(b,name){b.phase=name;b.timer=0;b.hits=0;}
function seed(g,b,vx,vy,options={}){g.dangers.push({x:b.x+b.w/2,y:b.y+12,w:6,h:6,vx,vy,gravity:0,life:3,kind:'seed',...options});}
export function gardenRecovery(g,b){
 b.recoverX=b.x;b.recoverTo=clamp(b.x-face(b,g.p)*40,b.left+8,b.right-b.w-8);
 enter(b,'recover');
}
function settle(g,b,dt){
 const bottom=b.y+b.h;b.vy=(b.vy||0)+625*dt;b.y+=b.vy*dt;
 const floor=floorAt(g,b.x,bottom);
 if(b.y+b.h>=floor){b.y=floor-b.h;b.vy=0;}
}
function telegraph(g,b){
 const p=g.p;Object.assign(b,gardenDecision(g,b));b.lastPattern=b.pattern;rememberBossAttack(b);
 b.direction=face(b,p);b.startX=b.x;b.startY=b.y;
 b.targetX=clamp(predictedBossTarget(g,b),b.left+16,b.right-b.w-16);
 b.targetFloor=208;
 if(b.pattern==='hop'){
  const ledge=g.movers.find(m=>m.arena&&p.x+p.w>m.x&&p.x<m.x+m.w&&Math.abs(p.y+p.h-m.y)<8);
  if(ledge){b.targetX=clamp(p.x,ledge.x,ledge.x+Math.max(0,ledge.w-b.w));b.targetFloor=ledge.y;}
  else if(b.intent==='flank')b.targetX=clamp(b.targetX+b.direction*42,b.left+16,b.right-b.w-16);
  else if(Math.abs(b.targetX-b.x)<48)b.targetX=b.x<(b.left+b.right-b.w)/2?b.right-b.w-16:b.left+16;
 }
 if(b.pattern==='dash'){b.targetX=clamp(b.x+b.direction*144,b.left+8,b.right-b.w-8);b.targetFloor=208;}
 b.targetY=b.targetFloor-b.h;
 const flight=.85,gravity=260;
 const aimX=clamp(p.x+p.w/2+clamp((b.awareness?.velocity??p.vx)*.22,-25,25),b.left+6,b.right+10);
 b.seedVX=clamp((aimX-(b.x+b.w/2))/flight,-160,160);
 b.seedVY=clamp((p.y+p.h-12-(b.y+12)-.5*gravity*flight*flight)/flight,-190,100);
 b.windupDuration=b.hp===1?1.05:1.25;
 b.tell=b.pattern==='hop'?'锁定落点':b.pattern==='dash'?'地面冲撞':b.pattern==='seeds'?'瞄准抛射':'落地震波';
 enter(b,'windup');
}
export function updateGardenBoss(g,dt,oldBottom,hurt){
 const b=g.boss,p=g.p;
 if(b.phase==='idle'){
  const distance=Math.abs(p.x-b.x),a=b.awareness;
  const incoming=g.shots.some(s=>s.life>0&&Math.abs(s.x-b.x)<100&&Math.sign(s.vx)===Math.sign(b.x-s.x));
  if(a)a.threatTime=incoming?Math.min(.5,(a.threatTime||0)+dt):Math.max(0,(a.threatTime||0)-dt);
  const awayRoom=face(b,p)<0?b.right-b.w-16-b.x:b.x-b.left-16;
  b.direction=a?.threatTime>=.22?(awayRoom>32?-face(b,p):face(b,p)):distance>112?face(b,p):b.direction||-1;
  b.x=clamp(b.x+b.direction*(b.hp===1?40:30)*dt,b.left+16,b.right-b.w-16);
  if(b.x===b.left+16||b.x===b.right-b.w-16)b.direction*=-1;
  settle(g,b,dt);
  if(b.timer>=(b.hp===1?.7:.9))telegraph(g,b);
 }else if(b.phase==='windup'){
  if(b.timer>=b.windupDuration){
   b.startX=b.x;b.startY=b.y;b.cycle++;enter(b,'attack');
   if(b.pattern==='seeds')for(let i=0;i<(b.hp===1?3:2);i++)seed(g,b,b.seedVX,b.seedVY-i*12,{gravity:260,delay:i*.28,life:2.6});
  }
 }else if(b.phase==='attack'){
  const duration=b.pattern==='dash'?.8:b.pattern==='seeds'?1.35:1.1,u=clamp(b.timer/duration,0,1);
  if(b.pattern==='hop'){b.x=b.startX+(b.targetX-b.startX)*u;b.y=b.startY+(b.targetY-b.startY)*u-Math.sin(u*Math.PI)*68;}
  else if(b.pattern==='slam')b.y=b.startY-Math.sin(u*Math.PI)*52;
  else if(b.pattern==='dash'){b.x=b.startX+(b.targetX-b.startX)*u;b.y=b.startY+(176-b.startY)*Math.min(1,u*3);}
  if(b.timer>=duration){
   if(b.pattern==='hop')b.y=b.targetY;else if(b.pattern==='dash')b.y=176;else b.y=b.startY;
   if(b.pattern==='slam')for(const d of [-1,1])seed(g,b,d*(b.hp===1?96:80),0,{y:200,w:16,h:8,kind:'wave',life:2});
   // Reaching a boss on a raised ledge requires a second jump after retreating.
   const climbAllowance=b.y+b.h<208?.6:0;
   b.exposeTime=Math.max((b.hp===1?2.8:3.2)+climbAllowance,Math.min(4,Math.abs(p.x-b.x)/112+1.6));
   enter(b,'expose');
  }
 }else if(b.phase==='expose'){
  if(b.timer>=(b.exposeTime||3.2))gardenRecovery(g,b);
 }else if(b.phase==='recover'){
  if(Number.isFinite(b.recoverX))b.x=b.recoverX+(b.recoverTo-b.recoverX)*Math.min(1,b.timer/.45);
  if(b.timer>=.9){b.vy=0;enter(b,'idle');}
 }
 const weakTop=gardenWeakTop(g,b);
 if(b.phase==='expose'&&b.invulnerable<=0&&!p.inWater&&p.vy>=0&&oldBottom<=weakTop+4&&p.y+p.h>=weakTop&&p.y<weakTop&&p.x+p.w>b.x&&p.x<b.x+b.w){p.y=weakTop-p.h;p.vy=-145;hurt(g,'stomp');return;}
 if(!overlap(p,b))return;
 // A successful hit earns a safe retreat instead of a second contact hit.
 if(b.phase==='recover')return;
 if(!p.inWater&&p.vy>=0&&oldBottom<=b.y+4&&b.phase==='expose'&&b.invulnerable<=0){p.y=b.y-p.h;p.vy=-145;hurt(g,'stomp');}
 else g.damage();
}
